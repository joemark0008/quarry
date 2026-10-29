import { Injectable } from '@nestjs/common';

import { Job } from '../jobs/job.decorator.js';
import { ProjectRepository } from '../projects/project.repository.js';
import * as branchOwnershipQueries from './context-explorer.queries.js';
import { deleteOwnedContextBranch } from './git/context-explorer-git.js';
import { resolveContextRepository } from './git/context-repo.js';
import { REVIEW_REQUEST_PROVIDERS } from './git/review-request-provider.js';
import { logger, serializeError } from './logger.js';

const CLOSED_BRANCH_RETENTION_MS = 24 * 60 * 60 * 1000;

export const CONTEXT_BRANCH_CLEANUP_JOB_NAME = 'context.branch.cleanup';

type ContextBranchOwnership = Awaited<ReturnType<typeof branchOwnershipQueries.listContextBranchOwnerships>>[number];
type ProjectLookup = (projectId: string) => Promise<{ path: string | null } | null>;

/** pg-boss handler of `context.branch.cleanup`, daily at 05:00 UTC as upstream's recurring job. */
@Injectable()
export class ContextBranchCleanupHandler {
	constructor(private readonly projects: ProjectRepository) {}

	@Job(CONTEXT_BRANCH_CLEANUP_JOB_NAME, { cron: '0 5 * * *', retryLimit: 0 })
	async handle(): Promise<void> {
		await runContextBranchCleanup((projectId) => this.projects.getProjectById(projectId));
	}
}

/**
 * Port of upstream `handlers/context-branch-cleanup.handler.ts`: deletes the context branches users created once
 * their review request has been merged or closed for a day. Until GitHub/GitLab are ported (Phase 7) only the
 * generic Git provider can report review requests, so most branches are skipped as upstream does without a token.
 */
export async function runContextBranchCleanup(getProjectById: ProjectLookup): Promise<void> {
	const ownerships = await branchOwnershipQueries.listContextBranchOwnerships();
	for (const [projectId, projectOwnerships] of groupOwnershipsByProject(ownerships)) {
		const projectContext = await resolveProjectCleanupContext(projectId, projectOwnerships, getProjectById);
		if (!projectContext) {
			continue;
		}
		for (const ownership of projectOwnerships) {
			try {
				await cleanOwnedContextBranch(ownership, projectContext.projectFolder, projectContext.repo);
			} catch (error) {
				logger.warn('Context branch cleanup failed', {
					source: 'system',
					projectId,
					context: {
						branch: ownership.branch,
						userId: ownership.userId,
						...serializeError(error),
					},
				});
			}
		}
	}
}

async function cleanOwnedContextBranch(
	ownership: ContextBranchOwnership,
	projectFolder: string,
	repo: NonNullable<Awaited<ReturnType<typeof resolveContextRepository>>>,
): Promise<void> {
	const provider = REVIEW_REQUEST_PROVIDERS[repo.provider];
	const token = await provider.getToken(ownership.userId);
	if (token === null) {
		logSkip(ownership, 'provider token unavailable');
		return;
	}
	const reviewRequest = await provider.findReviewRequestByBranch(token, repo.repoFullName, ownership.branch);
	if (!reviewRequest) {
		logSkip(ownership, 'review request not found');
		return;
	}
	if (reviewRequest.state === 'open') {
		logSkip(ownership, 'review request still open', reviewRequest.url);
		return;
	}
	const completedAt = reviewRequest.state === 'merged' ? reviewRequest.mergedAt : reviewRequest.closedAt;
	const completedAtTimestamp = completedAt ? Date.parse(completedAt) : Number.NaN;
	if (!Number.isFinite(completedAtTimestamp)) {
		logSkip(ownership, 'review request completion time unavailable', reviewRequest.url);
		return;
	}
	if (Date.now() - completedAtTimestamp <= CLOSED_BRANCH_RETENTION_MS) {
		logSkip(ownership, 'review request completed less than 24 hours ago', reviewRequest.url);
		return;
	}
	const result = deleteOwnedContextBranch({
		projectId: ownership.projectId,
		projectFolder,
		userId: ownership.userId,
		branch: ownership.branch,
		token,
	});
	if (result.status === 'skipped') {
		logSkip(ownership, result.reason, reviewRequest.url);
		return;
	}
	await branchOwnershipQueries.releaseContextBranch(ownership.projectId, ownership.branch, ownership.userId);
	logger.info('Cleaned up context branch ownership', {
		source: 'system',
		projectId: ownership.projectId,
		context: {
			branch: ownership.branch,
			userId: ownership.userId,
			reason: result.reason,
			reviewRequestUrl: reviewRequest.url,
		},
	});
}

async function resolveProjectCleanupContext(
	projectId: string,
	ownerships: ContextBranchOwnership[],
	getProjectById: ProjectLookup,
): Promise<{
	projectFolder: string;
	repo: NonNullable<Awaited<ReturnType<typeof resolveContextRepository>>>;
} | null> {
	try {
		const project = await getProjectById(projectId);
		if (!project?.path) {
			logProjectSkip(ownerships, 'project path unavailable');
			return null;
		}
		const repo = await resolveContextRepository(projectId);
		if (!repo) {
			logProjectSkip(ownerships, 'context repository unavailable');
			return null;
		}
		return { projectFolder: project.path, repo };
	} catch (error) {
		for (const ownership of ownerships) {
			logger.warn('Context branch cleanup could not resolve project', {
				source: 'system',
				projectId,
				context: {
					branch: ownership.branch,
					userId: ownership.userId,
					...serializeError(error),
				},
			});
		}
		return null;
	}
}

function groupOwnershipsByProject(ownerships: ContextBranchOwnership[]): Map<string, ContextBranchOwnership[]> {
	const grouped = new Map<string, ContextBranchOwnership[]>();
	for (const ownership of ownerships) {
		const projectOwnerships = grouped.get(ownership.projectId) ?? [];
		projectOwnerships.push(ownership);
		grouped.set(ownership.projectId, projectOwnerships);
	}
	return grouped;
}

function logProjectSkip(ownerships: ContextBranchOwnership[], reason: string): void {
	for (const ownership of ownerships) {
		logSkip(ownership, reason);
	}
}

function logSkip(ownership: ContextBranchOwnership, reason: string, reviewRequestUrl?: string): void {
	logger.debug('Skipped context branch cleanup', {
		source: 'system',
		projectId: ownership.projectId,
		context: {
			branch: ownership.branch,
			userId: ownership.userId,
			reason,
			...(reviewRequestUrl ? { reviewRequestUrl } : {}),
		},
	});
}
