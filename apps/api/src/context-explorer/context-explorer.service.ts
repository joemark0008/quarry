import { Injectable } from '@nestjs/common';
import { REPO_PROVIDERS, type RepoProvider } from '@quarry/shared/types';
import { z } from 'zod';

import { HandlerError } from '../common/errors/handler-error.js';
import { getGithubToken, getGitlabToken } from './context-explorer.queries.js';
import { ContextExplorerRepository, type ContextPullActivityRow } from './context-explorer.repository.js';
import type { ContextExplorerFileAccess } from './files/context-files.js';
import {
	getFileTree,
	MAX_CONTEXT_FILE_SIZE,
	readFileContent,
	searchFileContents,
	writeFileContent,
} from './files/context-files.js';
import {
	commitContextChanges,
	connectContextRepository,
	type ContextExplorerGitContext,
	createContextBranch,
	createContextBranchAndCommit,
	discardAllContextChanges,
	discardContextFileChange,
	disconnectContextRepository,
	getChangedContextFiles,
	getContextFileDiff,
	getContextRepositoryStatus,
	getHistoricalContextDiffActions,
	pullLiveContext,
	resolveContextExplorerGit,
	resolveContextExplorerGitSafely,
	sanitizeLiveContextError,
	suggestContextBranchName,
	switchContextBranch,
	updateContextWorktree,
} from './git/context-explorer-git.js';
import { pushContextExplorerBranch } from './git/context-explorer-pr.js';
import { getWorktreeProjectRoot } from './git/context-repo.js';
import {
	ContextProjectResolutionError,
	resolveContextRepository,
	resolveContextSourceGitToken,
} from './git/context-repo.js';
import { getRepoProviderDisplayName } from './git/review-request-provider.js';
import { logger, serializeError } from './logger.js';

export type ContextWriteTarget =
	{ mode: 'direct' | 'git'; root: string } | { mode: 'unavailable' | 'disabled'; message: string };

export interface ContextExplorerProject {
	id: string;
	path: string | null;
}

export interface ContextExplorerUser {
	id: string;
	name: string;
	email: string;
}

const branchSchema = z.string().trim().min(1).max(200);
const pathsSchema = z.array(z.string()).min(1).max(100);
const commitSchema = z.string().regex(/^[a-f0-9]{40,64}$/i);
const MAX_PULL_HISTORY_FILES = 1_000;
const fileDiffInputSchema = z
	.object({
		path: z.string(),
		from: commitSchema.optional(),
		to: commitSchema.optional(),
	})
	.refine((input) => Boolean(input.from) === Boolean(input.to), {
		message: 'Both historical commits are required.',
	});
const connectRepositoryInputSchema = z.object({
	provider: z.enum(REPO_PROVIDERS),
	repoFullName: z
		.string()
		.trim()
		.regex(/^[\w./-]+\/[\w.-]+$/, 'Expected a repository in "owner/name" format'),
});
const writeFileInputSchema = z.object({
	path: z.string(),
	content: z.string().max(MAX_CONTEXT_FILE_SIZE),
	expectedHash: z.string().regex(/^[a-f0-9]{64}$/),
});
const createBranchAndCommitInputSchema = z.object({
	branch: branchSchema.optional(),
	paths: pathsSchema,
	message: z.string().trim().min(1).max(500),
});
const commitChangesInputSchema = z.object({ paths: pathsSchema, message: z.string().trim().min(1).max(500) });
const pullFileSchema = z.object({
	path: z.string().max(2_000),
	additions: z.number().int().nonnegative().nullable(),
	deletions: z.number().int().nonnegative().nullable(),
});
const pullPayloadSchema = z.object({
	configuredBranch: z.string().max(200),
	changed: z.boolean(),
	oldCommit: z
		.string()
		.regex(/^[a-f0-9]{40,64}$/)
		.nullable(),
	newCommit: z.string().regex(/^[a-f0-9]{40,64}$/),
	fileCount: z.number().int().nonnegative().optional(),
	files: z.array(pullFileSchema).max(MAX_PULL_HISTORY_FILES),
});

/**
 * Port of upstream tRPC `contextExplorer.*` (`trpc/context-explorer.routes.ts`): the handlers build the Git context
 * for the signed-in user and call the copied module-level services (`files/`, `git/`). Inputs are checked with
 * upstream's zod schemas; results keep upstream's shapes.
 */
@Injectable()
export class ContextExplorerService {
	constructor(private readonly repository: ContextExplorerRepository) {}

	async getRepositoryStatus(project: ContextExplorerProject, user: ContextExplorerUser) {
		return getContextRepositoryStatus(await this.createGitContext(project, user));
	}

	async getLiveContextPullHistory(project: ContextExplorerProject, user: ContextExplorerUser) {
		const activities = await this.repository.listContextPullActivities(project.id);
		const entries = activities.map(toContextPullHistoryEntry);
		const actions = await getHistoricalContextDiffActions(
			await this.createGitContext(project, user),
			entries.map((entry) => ({ fromCommit: entry.oldCommit, toCommit: entry.newCommit })),
		);
		return entries.map((entry, index) => ({ ...entry, fileExplorerAction: actions[index] ?? 'update' }));
	}

	async pullLiveContext(project: ContextExplorerProject, user: ContextExplorerUser) {
		const activity = await this.repository.startContextPullActivity(project.id, user.id);
		let token: string | null | undefined;
		try {
			const gitContext = await this.createGitContext(project, user);
			token = gitContext.token;
			const result = await pullLiveContext(gitContext);
			try {
				await this.repository.completeActivity(activity.id, {
					configuredBranch: result.configuredBranch,
					changed: result.changed,
					oldCommit: result.oldCommit,
					newCommit: result.newCommit,
					fileCount: result.files.length,
					files: result.files.slice(0, MAX_PULL_HISTORY_FILES),
				});
			} catch (persistenceError) {
				logPullHistoryFailure(
					'Context pull completed, but its history could not be saved.',
					project.id,
					activity.id,
					persistenceError,
				);
			}
			return result;
		} catch (error) {
			const sanitizedError = sanitizeLiveContextError(error, token);
			try {
				await this.repository.failActivity(activity.id, sanitizedError.message);
			} catch (persistenceError) {
				logPullHistoryFailure(
					'Context pull failed, but its history could not be updated.',
					project.id,
					activity.id,
					persistenceError,
				);
			}
			if (error instanceof HandlerError) {
				throw new HandlerError(error.codeMessage, sanitizedError.message);
			}
			if (error instanceof ContextProjectResolutionError) {
				throw new HandlerError('BAD_REQUEST', sanitizedError.message);
			}
			throw new Error(sanitizedError.message);
		}
	}

	async connectRepository(project: ContextExplorerProject, user: ContextExplorerUser, rawInput: unknown) {
		const input = parseInput(connectRepositoryInputSchema, rawInput);
		const projectFolder = requireProjectPath(project.path);
		const context: ContextExplorerGitContext = {
			projectId: project.id,
			projectFolder,
			userId: user.id,
			user: { name: user.name, email: user.email },
			token: await getProviderToken(input.provider, user.id),
		};
		if (!context.token) {
			throw new HandlerError(
				'FORBIDDEN',
				`Connect your ${getRepoProviderDisplayName(input.provider)} account first.`,
			);
		}
		return connectContextRepository({ ...context, token: context.token, ...input });
	}

	disconnectRepository(project: ContextExplorerProject, user: ContextExplorerUser) {
		return disconnectContextRepository({
			projectId: project.id,
			projectFolder: requireProjectPath(project.path),
			userId: user.id,
		});
	}

	async getFileTree(project: ContextExplorerProject) {
		const entries = await getFileTree(requireProjectPath(project.path));
		return { entries };
	}

	async getRulesPreviewGroups(project: ContextExplorerProject) {
		const groups = await this.repository.listActiveUserGroups(project.id);
		return {
			enforced: true as const,
			groups: groups.map(({ id, name, isDefault }) => ({ id, name, isDefault })),
		};
	}

	async readFile(project: ContextExplorerProject, user: ContextExplorerUser, filePath: string) {
		const access = await this.createSafeFileAccess(project, user);
		return readFileContent(filePath, access);
	}

	async writeFile(project: ContextExplorerProject, user: ContextExplorerUser, rawInput: unknown) {
		const input = parseInput(writeFileInputSchema, rawInput);
		const access = await this.createStrictFileAccess(project, user);
		return writeFileContent(input.path, input.content, input.expectedHash, access);
	}

	searchContent(project: ContextExplorerProject, query: string) {
		const parsedQuery = parseInput(z.string().min(2).max(200), query);
		return searchFileContents(parsedQuery, requireProjectPath(project.path));
	}

	async getChangedFiles(project: ContextExplorerProject, user: ContextExplorerUser) {
		return getChangedContextFiles(await this.createGitContext(project, user));
	}

	async getFileDiff(project: ContextExplorerProject, user: ContextExplorerUser, rawInput: unknown) {
		const input = parseInput(fileDiffInputSchema, rawInput);
		return getContextFileDiff(
			await this.createGitContext(project, user),
			input.path,
			input.from && input.to ? { fromCommit: input.from, toCommit: input.to } : undefined,
		);
	}

	async getHistoricalDiffAction(project: ContextExplorerProject, user: ContextExplorerUser, rawInput: unknown) {
		const input = parseInput(z.object({ from: commitSchema, to: commitSchema }), rawInput);
		const actions = await getHistoricalContextDiffActions(await this.createGitContext(project, user), [
			{ fromCommit: input.from, toCommit: input.to },
		]);
		return actions[0] ?? 'update';
	}

	async updateWorktree(project: ContextExplorerProject, user: ContextExplorerUser, requiredCommits: unknown) {
		const commits = parseInput(z.array(commitSchema).max(2).default([]), requiredCommits ?? undefined);
		return updateContextWorktree(await this.createGitContext(project, user), commits);
	}

	async switchBranch(project: ContextExplorerProject, user: ContextExplorerUser, branch: string) {
		return switchContextBranch(await this.createGitContext(project, user), parseInput(branchSchema, branch));
	}

	async createBranch(project: ContextExplorerProject, user: ContextExplorerUser, branch: string) {
		return createContextBranch(await this.createGitContext(project, user), parseInput(branchSchema, branch));
	}

	async suggestBranchName(project: ContextExplorerProject, user: ContextExplorerUser) {
		return suggestContextBranchName(await this.createGitContext(project, user));
	}

	async createBranchAndCommit(project: ContextExplorerProject, user: ContextExplorerUser, rawInput: unknown) {
		const input = parseInput(createBranchAndCommitInputSchema, rawInput);
		return createContextBranchAndCommit(await this.createGitContext(project, user), input);
	}

	async commitChanges(project: ContextExplorerProject, user: ContextExplorerUser, rawInput: unknown) {
		const input = parseInput(commitChangesInputSchema, rawInput);
		return commitContextChanges(await this.createGitContext(project, user), input);
	}

	async discardLocalChange(project: ContextExplorerProject, user: ContextExplorerUser, filePath: string) {
		return discardContextFileChange(await this.createGitContext(project, user), filePath);
	}

	async discardAllChanges(project: ContextExplorerProject, user: ContextExplorerUser) {
		return discardAllContextChanges(await this.createGitContext(project, user));
	}

	async pushBranch(project: ContextExplorerProject, user: ContextExplorerUser) {
		return pushContextExplorerBranch(await this.createGitContext(project, user));
	}

	/**
	 * Where the app may write a new context file for this user: the live folder when the project has no context
	 * repository, the user's worktree when it has one. A repository that isn't usable blocks writing, since files
	 * in a live checkout would skip review and could conflict with the next pull.
	 */
	async resolveWriteTarget(project: ContextExplorerProject, user: ContextExplorerUser): Promise<ContextWriteTarget> {
		const { git, projectFolder } = await this.createSafeFileAccess(project, user);
		if (git.status === 'available') {
			return { mode: 'git', root: getWorktreeProjectRoot(git.repo) };
		}
		return git.reason === 'no-repo'
			? { mode: 'direct', root: projectFolder }
			: { mode: 'unavailable', message: git.message };
	}

	private async createSafeFileAccess(
		project: ContextExplorerProject,
		user: ContextExplorerUser,
	): Promise<ContextExplorerFileAccess> {
		const context = await this.createGitContext(project, user);
		return {
			projectFolder: context.projectFolder,
			git: await resolveContextExplorerGitSafely(context),
		};
	}

	private async createStrictFileAccess(
		project: ContextExplorerProject,
		user: ContextExplorerUser,
	): Promise<ContextExplorerFileAccess> {
		const context = await this.createGitContext(project, user);
		return {
			projectFolder: context.projectFolder,
			git: await resolveContextExplorerGit(context),
		};
	}

	private async createGitContext(
		project: ContextExplorerProject,
		user: ContextExplorerUser,
	): Promise<ContextExplorerGitContext> {
		const projectFolder = requireProjectPath(project.path);
		const repository = await resolveContextRepository(project.id);
		return {
			projectId: project.id,
			projectFolder,
			userId: user.id,
			user: { name: user.name, email: user.email },
			token:
				repository?.provider === 'generic'
					? resolveContextSourceGitToken()
					: await getProviderToken(repository?.provider ?? 'github', user.id),
		};
	}
}

export function toContextPullHistoryEntry(activity: ContextPullActivityRow) {
	const payload = parsePullPayload(activity.payload);
	return {
		id: activity.id,
		status: activity.status,
		startedAt: activity.startedAt,
		completedAt: activity.completedAt,
		configuredBranch: payload.success ? payload.data.configuredBranch : null,
		changed: payload.success ? payload.data.changed : null,
		oldCommit: payload.success ? payload.data.oldCommit : null,
		newCommit: payload.success ? payload.data.newCommit : null,
		fileCount: payload.success ? (payload.data.fileCount ?? payload.data.files.length) : 0,
		files: payload.success ? payload.data.files : [],
		errorMessage: activity.status === 'failed' ? (activity.errorMessage ?? 'Context pull failed.') : null,
	};
}

function parsePullPayload(payload: Record<string, unknown> | null) {
	if (!payload || !Array.isArray(payload.files)) {
		return pullPayloadSchema.safeParse(payload);
	}
	return pullPayloadSchema.safeParse({
		...payload,
		fileCount: payload.fileCount ?? payload.files.length,
		files: payload.files.slice(0, MAX_PULL_HISTORY_FILES),
	});
}

function logPullHistoryFailure(message: string, projectId: string, activityId: string, error: unknown): void {
	logger.warn(message, {
		source: 'system',
		context: { projectId, activityId, error: serializeError(error) },
	});
}

function getProviderToken(provider: RepoProvider, userId: string): Promise<string | null> {
	return provider === 'gitlab' ? getGitlabToken(userId) : getGithubToken(userId);
}

function requireProjectPath(projectPath: string | null): string {
	if (!projectPath) {
		throw new HandlerError('BAD_REQUEST', 'No project path configured.');
	}
	return projectPath;
}

function parseInput<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
	const parsed = schema.safeParse(input);
	if (!parsed.success) {
		throw new HandlerError('BAD_REQUEST', parsed.error.issues.map((issue) => issue.message).join('; '));
	}
	return parsed.data;
}
