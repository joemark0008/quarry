/** Port of upstream `tests/context-explorer.routes.test.ts`: the route handlers are `ContextExplorerService`. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	ContextProjectResolutionError: class ContextProjectResolutionError extends Error {},
	completeActivity: vi.fn(),
	connectContextRepository: vi.fn(),
	failActivity: vi.fn(),
	getContextFileDiff: vi.fn(),
	getFileTree: vi.fn(),
	getGithubToken: vi.fn(),
	getGitlabToken: vi.fn(),
	listUserGroups: vi.fn(),
	getHistoricalContextDiffActions: vi.fn(),
	getContextRepositoryStatus: vi.fn(),
	listContextPullActivities: vi.fn(),
	loggerWarn: vi.fn(),
	pullLiveContext: vi.fn(),
	readFileContent: vi.fn(),
	resolveContextExplorerGit: vi.fn(),
	resolveContextExplorerGitSafely: vi.fn(),
	resolveContextRepository: vi.fn(),
	sanitizeLiveContextError: vi.fn((error: unknown) =>
		error instanceof Error ? error : new Error('Context pull failed.'),
	),
	startContextPullActivity: vi.fn(),
	updateContextWorktree: vi.fn(),
	writeFileContent: vi.fn(),
}));

vi.mock('./logger.js', () => ({
	logger: { warn: mocks.loggerWarn },
	serializeError: (error: unknown) => ({ message: error instanceof Error ? error.message : String(error) }),
}));

vi.mock('./context-explorer.queries.js', () => ({
	getGithubToken: mocks.getGithubToken,
	getGitlabToken: mocks.getGitlabToken,
}));

vi.mock('./files/context-files.js', () => ({
	getFileTree: mocks.getFileTree,
	MAX_CONTEXT_FILE_SIZE: 1024 * 1024,
	readFileContent: mocks.readFileContent,
	searchFileContents: vi.fn(),
	writeFileContent: mocks.writeFileContent,
}));

vi.mock('./git/context-explorer-git.js', () => ({
	commitContextChanges: vi.fn(),
	connectContextRepository: mocks.connectContextRepository,
	createContextBranch: vi.fn(),
	createContextBranchAndCommit: vi.fn(),
	discardAllContextChanges: vi.fn(),
	discardContextFileChange: vi.fn(),
	disconnectContextRepository: vi.fn(),
	getChangedContextFiles: vi.fn(),
	getContextFileDiff: mocks.getContextFileDiff,
	getContextRepositoryStatus: mocks.getContextRepositoryStatus,
	getHistoricalContextDiffActions: mocks.getHistoricalContextDiffActions,
	pullLiveContext: mocks.pullLiveContext,
	resolveContextExplorerGit: mocks.resolveContextExplorerGit,
	resolveContextExplorerGitSafely: mocks.resolveContextExplorerGitSafely,
	sanitizeLiveContextError: mocks.sanitizeLiveContextError,
	suggestContextBranchName: vi.fn(),
	switchContextBranch: vi.fn(),
	updateContextWorktree: mocks.updateContextWorktree,
}));

vi.mock('./git/context-explorer-pr.js', () => ({
	pushContextExplorerBranch: vi.fn(),
}));

vi.mock('./git/context-repo.js', () => ({
	ContextProjectResolutionError: mocks.ContextProjectResolutionError,
	resolveContextRepository: mocks.resolveContextRepository,
	resolveContextSourceGitToken: vi.fn(() => null),
	sanitizeContextSourceRepositoryUrl: vi.fn((url: string) => url),
}));

import { Reflector } from '@nestjs/core';

import { ACCESS_KEY, type AccessRequirement } from '../common/decorators/access.decorator.js';
import { HandlerError } from '../common/errors/handler-error.js';
import type { ContextExplorerRepository } from './context-explorer.repository.js';
import { ContextExplorerResolver } from './context-explorer.resolver.js';
import { ContextExplorerService } from './context-explorer.service.js';

describe('context explorer repository connection', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mocks.getGithubToken.mockResolvedValue('github-token');
		mocks.getGitlabToken.mockResolvedValue('gitlab-token');
		mocks.resolveContextRepository.mockResolvedValue({
			provider: 'github',
		});
		mocks.connectContextRepository.mockResolvedValue({
			provider: 'gitlab',
			repoFullName: 'quarry/context',
			defaultBranch: 'main',
			branch: 'main',
			connectionType: 'linked-existing-commit',
		});
	});

	it('connects a GitHub repository with the GitHub token', async () => {
		await createCaller().connectRepository({ provider: 'github', repoFullName: 'quarry/context' });

		expect(mocks.getGithubToken).toHaveBeenCalledWith('user-id');
		expect(mocks.getGitlabToken).not.toHaveBeenCalled();
		expect(mocks.connectContextRepository).toHaveBeenCalledWith(
			expect.objectContaining({
				provider: 'github',
				repoFullName: 'quarry/context',
				token: 'github-token',
			}),
		);
	});

	it('connects a GitLab repository with the GitLab token', async () => {
		await expect(
			createCaller().connectRepository({ provider: 'gitlab', repoFullName: 'quarry/context' }),
		).resolves.toMatchObject({
			provider: 'gitlab',
			repoFullName: 'quarry/context',
		});

		expect(mocks.getGitlabToken).toHaveBeenCalledWith('user-id');
		expect(mocks.getGithubToken).not.toHaveBeenCalled();
		expect(mocks.connectContextRepository).toHaveBeenCalledWith(
			expect.objectContaining({
				provider: 'gitlab',
				repoFullName: 'quarry/context',
				token: 'gitlab-token',
			}),
		);
	});

	it('names GitLab when its token is missing', async () => {
		mocks.getGitlabToken.mockResolvedValue(null);

		await expect(
			createCaller().connectRepository({ provider: 'gitlab', repoFullName: 'quarry/context' }),
		).rejects.toMatchObject({
			codeMessage: 'FORBIDDEN',
			message: 'Connect your GitLab account first.',
		});
		expect(mocks.connectContextRepository).not.toHaveBeenCalled();
	});
});

describe('context explorer file access', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mocks.getGithubToken.mockResolvedValue('github-token');
		mocks.resolveContextRepository.mockResolvedValue({ provider: 'github' });
	});

	it('returns the source file tree without resolving Git', async () => {
		const entries = [
			{ name: 'folder', path: '/folder', type: 'directory', children: [] },
			{ name: 'quarry_config.yaml', path: '/quarry_config.yaml', type: 'file' },
		];
		mocks.getFileTree.mockResolvedValue(entries);
		mocks.resolveContextExplorerGit.mockRejectedValue(new Error('clone failed'));
		mocks.resolveContextExplorerGitSafely.mockRejectedValue(new Error('clone failed'));

		await expect(createCaller().getFileTree()).resolves.toEqual({ entries });

		expect(mocks.getFileTree).toHaveBeenCalledWith('/tmp/quarry-project');
		expect(mocks.resolveContextExplorerGit).not.toHaveBeenCalled();
		expect(mocks.resolveContextExplorerGitSafely).not.toHaveBeenCalled();
	});

	it('uses safe Git resolution for reads and strict resolution for writes', async () => {
		const unavailableGit = {
			status: 'unavailable',
			reason: 'git-unavailable',
			message: 'Repository status is temporarily unavailable.',
			repo: null,
		};
		const availableGit = {
			status: 'available',
			repo: {},
			context: {},
		};
		mocks.resolveContextExplorerGitSafely.mockResolvedValue(unavailableGit);
		mocks.resolveContextExplorerGit.mockResolvedValue(availableGit);
		mocks.readFileContent.mockResolvedValue({
			content: 'source\n',
			hash: 'hash',
			isEditable: false,
			reason: 'git-unavailable',
		});
		mocks.writeFileContent.mockResolvedValue({ hash: 'updated-hash' });

		await createCaller().readFile({ path: '/context.md' });
		expect(mocks.resolveContextExplorerGitSafely).toHaveBeenCalledOnce();
		expect(mocks.readFileContent).toHaveBeenCalledWith(
			'/context.md',
			expect.objectContaining({ git: unavailableGit }),
		);

		await createCaller().writeFile({
			path: '/context.md',
			content: 'updated\n',
			expectedHash: '0'.repeat(64),
		});
		expect(mocks.resolveContextExplorerGit).toHaveBeenCalledOnce();
		expect(mocks.writeFileContent).toHaveBeenCalledWith(
			'/context.md',
			'updated\n',
			'0'.repeat(64),
			expect.objectContaining({ git: availableGit }),
		);
	});

	it('passes validated historical commit ranges to the file diff service', async () => {
		const from = 'a'.repeat(40);
		const to = 'B'.repeat(64);
		mocks.resolveContextExplorerGit.mockResolvedValue({ status: 'available', repo: {}, context: {} });
		mocks.getContextFileDiff.mockResolvedValue({
			path: '/context.md',
			kind: 'modified',
			additions: 1,
			deletions: 1,
			oldContent: 'old\n',
			newContent: 'new\n',
		});

		await createCaller().getFileDiff({ path: '/context.md', from, to });

		expect(mocks.getContextFileDiff).toHaveBeenCalledWith(
			expect.objectContaining({ projectId: 'project-id', projectFolder: '/tmp/quarry-project' }),
			'/context.md',
			{ fromCommit: from, toCommit: to },
		);
	});

	it('checks only the selected historical range action', async () => {
		const from = 'a'.repeat(40);
		const to = 'b'.repeat(40);
		mocks.getHistoricalContextDiffActions.mockResolvedValue(['switch']);

		await expect(createCaller().getHistoricalDiffAction({ from, to })).resolves.toBe('switch');

		expect(mocks.getHistoricalContextDiffActions).toHaveBeenCalledWith(
			expect.objectContaining({ projectId: 'project-id', projectFolder: '/tmp/quarry-project' }),
			[{ fromCommit: from, toCommit: to }],
		);
		expect(mocks.listContextPullActivities).not.toHaveBeenCalled();
	});

	it('updates the current user worktree with required historical commits', async () => {
		const from = 'a'.repeat(40);
		const to = 'b'.repeat(40);
		mocks.updateContextWorktree.mockResolvedValue({ branch: 'main', commit: to });

		await createCaller().updateWorktree({ requiredCommits: [from, to] });

		expect(mocks.updateContextWorktree).toHaveBeenCalledWith(
			expect.objectContaining({ projectId: 'project-id', projectFolder: '/tmp/quarry-project' }),
			[from, to],
		);
	});

	it.each([
		{ path: '/context.md', from: 'abc1234', to: 'b'.repeat(40) },
		{ path: '/context.md', from: 'a'.repeat(40) },
		{ path: '/context.md', to: 'b'.repeat(40) },
	])('rejects invalid or partial historical commit ranges', async (input) => {
		await expect(createCaller().getFileDiff(input)).rejects.toMatchObject({ codeMessage: 'BAD_REQUEST' });
		expect(mocks.getContextFileDiff).not.toHaveBeenCalled();
	});
});

describe('live context update access', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mocks.getGithubToken.mockResolvedValue('github-token');
		mocks.resolveContextRepository.mockResolvedValue({ provider: 'github' });
		mocks.getHistoricalContextDiffActions.mockImplementation(async (_context, ranges: unknown[]) =>
			ranges.map(() => 'update'),
		);
		mocks.getContextRepositoryStatus.mockResolvedValue({
			liveContextUpdate: { enabled: true, available: true, configuredBranch: 'main' },
		});
		mocks.sanitizeLiveContextError.mockImplementation((error: unknown) =>
			error instanceof Error ? error : new Error('Context pull failed.'),
		);
		mocks.startContextPullActivity.mockResolvedValue({ id: 'activity-id' });
		mocks.pullLiveContext.mockReturnValue({
			changed: false,
			checkedAt: '2026-08-27T10:00:00.000Z',
			configuredBranch: 'main',
			oldCommit: 'a'.repeat(40),
			newCommit: 'a'.repeat(40),
			files: [],
		});
	});

	it('records a successful no-change pull for project admins', async () => {
		await expect(createCaller().pullLiveContext()).resolves.toMatchObject({ changed: false, files: [] });

		expect(mocks.startContextPullActivity).toHaveBeenCalledWith('project-id', 'user-id');
		expect(mocks.pullLiveContext).toHaveBeenCalledWith(
			expect.objectContaining({
				projectId: 'project-id',
				projectFolder: '/tmp/quarry-project',
				userId: 'user-id',
				token: 'github-token',
			}),
		);
		expect(mocks.completeActivity).toHaveBeenCalledWith('activity-id', {
			configuredBranch: 'main',
			changed: false,
			oldCommit: 'a'.repeat(40),
			newCommit: 'a'.repeat(40),
			fileCount: 0,
			files: [],
		});
	});

	it('records changed file details for a successful pull', async () => {
		const files = [{ path: '/context.md', additions: 2, deletions: 1 }];
		mocks.pullLiveContext.mockReturnValue({
			changed: true,
			checkedAt: '2026-08-27T10:00:00.000Z',
			configuredBranch: 'main',
			oldCommit: 'a'.repeat(40),
			newCommit: 'b'.repeat(40),
			files,
		});

		await createCaller().pullLiveContext();

		expect(mocks.completeActivity).toHaveBeenCalledWith(
			'activity-id',
			expect.objectContaining({ configuredBranch: 'main', changed: true, files }),
		);
	});

	it('limits persisted file details without truncating the pull result', async () => {
		const files = Array.from({ length: 1_001 }, (_, index) => ({
			path: `/context-${index}.md`,
			additions: 1,
			deletions: 0,
		}));
		mocks.pullLiveContext.mockReturnValue({
			changed: true,
			checkedAt: '2026-08-27T10:00:00.000Z',
			configuredBranch: 'main',
			oldCommit: 'a'.repeat(40),
			newCommit: 'b'.repeat(40),
			files,
		});

		const result = await createCaller().pullLiveContext();

		expect(result.files).toEqual(files);
		expect(result.files).toHaveLength(1_001);
		expect(mocks.completeActivity).toHaveBeenCalledWith(
			'activity-id',
			expect.objectContaining({
				newCommit: 'b'.repeat(40),
				fileCount: 1_001,
				files: files.slice(0, 1_000),
			}),
		);
		mocks.listContextPullActivities.mockResolvedValue([
			{
				id: 'large-pull',
				status: 'completed',
				payload: mocks.completeActivity.mock.calls[0][1],
				errorMessage: null,
				startedAt: new Date('2026-08-27T10:00:00.000Z'),
				completedAt: new Date('2026-08-27T10:00:01.000Z'),
				actorName: 'Admin User',
			},
		]);

		await expect(createCaller().getLiveContextPullHistory()).resolves.toEqual([
			expect.objectContaining({
				newCommit: 'b'.repeat(40),
				fileCount: 1_001,
				files: files.slice(0, 1_000),
			}),
		]);
		mocks.listContextPullActivities.mockResolvedValue([
			{
				id: 'legacy-large-pull',
				status: 'completed',
				payload: {
					configuredBranch: 'main',
					changed: true,
					oldCommit: 'a'.repeat(40),
					newCommit: 'b'.repeat(40),
					files,
				},
				errorMessage: null,
				startedAt: new Date('2026-08-26T10:00:00.000Z'),
				completedAt: new Date('2026-08-26T10:00:01.000Z'),
				actorName: 'Admin User',
			},
		]);

		await expect(createCaller().getLiveContextPullHistory()).resolves.toEqual([
			expect.objectContaining({
				newCommit: 'b'.repeat(40),
				fileCount: 1_001,
				files: files.slice(0, 1_000),
			}),
		]);
	});

	it('records and parses a first repository clone without an old commit', async () => {
		mocks.pullLiveContext.mockReturnValue({
			changed: true,
			checkedAt: '2026-08-27T10:00:00.000Z',
			configuredBranch: 'main',
			oldCommit: null,
			newCommit: 'b'.repeat(40),
			files: [{ path: '/context.md', additions: 1, deletions: 0 }],
		});

		await createCaller().pullLiveContext();

		expect(mocks.completeActivity).toHaveBeenCalledWith(
			'activity-id',
			expect.objectContaining({ oldCommit: null, newCommit: 'b'.repeat(40) }),
		);
		mocks.listContextPullActivities.mockResolvedValue([
			{
				id: 'initial-clone',
				status: 'completed',
				payload: {
					configuredBranch: 'main',
					changed: true,
					oldCommit: null,
					newCommit: 'b'.repeat(40),
					files: [{ path: '/context.md', additions: 1, deletions: 0 }],
				},
				errorMessage: null,
				startedAt: new Date('2026-08-27T10:00:00.000Z'),
				completedAt: new Date('2026-08-27T10:00:01.000Z'),
				actorName: 'Admin User',
			},
		]);

		await expect(createCaller().getLiveContextPullHistory()).resolves.toEqual([
			expect.objectContaining({ oldCommit: null, newCommit: 'b'.repeat(40) }),
		]);
	});

	it('returns a successful pull when completing its history fails', async () => {
		mocks.completeActivity.mockRejectedValue(new Error('database unavailable'));

		await expect(createCaller().pullLiveContext()).resolves.toMatchObject({ changed: false });

		expect(mocks.failActivity).not.toHaveBeenCalled();
		expect(mocks.loggerWarn).toHaveBeenCalledWith('Context pull completed, but its history could not be saved.', {
			source: 'system',
			context: {
				projectId: 'project-id',
				activityId: 'activity-id',
				error: { message: 'database unavailable' },
			},
		});
	});

	it('records sanitized pull failures', async () => {
		mocks.pullLiveContext.mockImplementation(() => {
			throw new Error('safe pull failure');
		});

		await expect(createCaller().pullLiveContext()).rejects.toThrow('safe pull failure');

		expect(mocks.failActivity).toHaveBeenCalledWith('activity-id', 'safe pull failure');
	});

	it('maps context project resolution failures to bad requests', async () => {
		mocks.pullLiveContext.mockImplementation(() => {
			throw new mocks.ContextProjectResolutionError('Configured context subfolder was not found.');
		});

		await expect(createCaller().pullLiveContext()).rejects.toMatchObject({
			codeMessage: 'BAD_REQUEST',
			message: 'Configured context subfolder was not found.',
		});
		expect(mocks.failActivity).toHaveBeenCalledWith('activity-id', 'Configured context subfolder was not found.');
	});

	it('records failures while creating the Git context', async () => {
		const setupError = new Error('repository setup failed');
		mocks.resolveContextRepository.mockRejectedValue(setupError);

		// quarry: an unexpected error stays a plain error, which the exception filter reports as internal.
		const failure = createCaller().pullLiveContext();
		await expect(failure).rejects.toThrow('repository setup failed');
		await expect(failure).rejects.not.toBeInstanceOf(HandlerError);
		expect(mocks.sanitizeLiveContextError).toHaveBeenCalledWith(setupError, undefined);
		expect(mocks.failActivity).toHaveBeenCalledWith('activity-id', 'repository setup failed');
		expect(mocks.pullLiveContext).not.toHaveBeenCalled();
	});

	it('lets context admins read status but not pull the live context', async () => {
		await expect(createCaller().getRepositoryStatus()).resolves.toMatchObject({
			liveContextUpdate: { enabled: true, available: true },
		});
		// quarry: roles are checked by the guard from the resolver's access metadata.
		expect(accessRoles('contextRepositoryStatus')).toEqual(['admin', 'context_admin']);
		expect(accessRoles('pullLiveContext')).toEqual(['admin']);
	});

	it('returns safely parsed history newest first to context admins', async () => {
		mocks.getHistoricalContextDiffActions.mockResolvedValue(['open', 'switch', 'blocked']);
		mocks.listContextPullActivities.mockResolvedValue([
			{
				id: 'newest',
				status: 'completed',
				payload: {
					configuredBranch: 'main',
					changed: true,
					oldCommit: 'a'.repeat(40),
					newCommit: 'b'.repeat(40),
					files: [{ path: '/context.md', additions: 1, deletions: 0 }],
				},
				errorMessage: null,
				startedAt: new Date('2026-08-27T11:00:00.000Z'),
				completedAt: new Date('2026-08-27T11:00:01.000Z'),
				actorName: 'Admin User',
			},
			{
				id: 'legacy',
				status: 'completed',
				payload: {
					configuredBranch: 'main',
					changed: false,
					oldCommit: 'a'.repeat(40),
					newCommit: 'a'.repeat(40),
					files: [],
				},
				errorMessage: null,
				startedAt: new Date('2026-08-27T10:30:00.000Z'),
				completedAt: new Date('2026-08-27T10:30:01.000Z'),
				actorName: 'Legacy Admin',
			},
			{
				id: 'older',
				status: 'failed',
				payload: { untrusted: true },
				errorMessage: 'Safe failure',
				startedAt: new Date('2026-08-27T10:00:00.000Z'),
				completedAt: new Date('2026-08-27T10:00:01.000Z'),
				actorName: null,
			},
		]);

		const history = await createCaller().getLiveContextPullHistory();

		expect(history).toEqual([
			expect.objectContaining({
				id: 'newest',
				changed: true,
				fileCount: 1,
				fileExplorerAction: 'open',
				files: [{ path: '/context.md', additions: 1, deletions: 0 }],
			}),
			expect.objectContaining({
				id: 'legacy',
				changed: false,
				newCommit: 'a'.repeat(40),
				fileCount: 0,
			}),
			expect.objectContaining({
				id: 'older',
				changed: null,
				fileCount: 0,
				files: [],
				errorMessage: 'Safe failure',
			}),
		]);
		expect(history[0]).not.toHaveProperty('actorName');
	});
});

describe('context explorer RULES preview groups', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('returns only minimal groups from the selected project to a context admin', async () => {
		mocks.listUserGroups.mockResolvedValue([
			{
				id: 'default-id',
				name: 'All Users',
				isDefault: true,
				featureGrants: ['storyCreation'],
				contextGrants: { mode: 'all' },
			},
			{
				id: 'finance-id',
				name: 'Finance',
				isDefault: false,
				featureGrants: [],
				contextGrants: { mode: 'restricted' },
			},
		]);

		await expect(createCaller().getRulesPreviewGroups()).resolves.toEqual({
			enforced: true,
			groups: [
				{ id: 'default-id', name: 'All Users', isDefault: true },
				{ id: 'finance-id', name: 'Finance', isDefault: false },
			],
		});
		expect(mocks.listUserGroups).toHaveBeenCalledWith('project-id');
	});

	it('returns enforced preview groups without unlimited entitlement', async () => {
		mocks.listUserGroups.mockResolvedValue([
			{ id: 'default-id', name: 'All Users', isDefault: true },
			{ id: 'finance-id', name: 'Finance', isDefault: false },
		]);

		await expect(createCaller().getRulesPreviewGroups()).resolves.toEqual({
			enforced: true,
			groups: [
				{ id: 'default-id', name: 'All Users', isDefault: true },
				{ id: 'finance-id', name: 'Finance', isDefault: false },
			],
		});
		expect(mocks.listUserGroups).toHaveBeenCalledWith('project-id');
	});

	it('rejects users without context administration access', () => {
		// quarry: the guard rejects any role missing from the resolver's access metadata.
		expect(accessRoles('contextRulesPreviewGroups')).not.toContain('user');
		expect(accessRoles('contextRulesPreviewGroups')).not.toContain('viewer');
	});
});

function createCaller() {
	const service = new ContextExplorerService({
		completeActivity: mocks.completeActivity,
		failActivity: mocks.failActivity,
		listContextPullActivities: mocks.listContextPullActivities,
		startContextPullActivity: mocks.startContextPullActivity,
		listActiveUserGroups: mocks.listUserGroups,
	} as unknown as ContextExplorerRepository);
	const project = { id: 'project-id', path: '/tmp/quarry-project' };
	const user = { id: 'user-id', name: 'Test User', email: 'test@example.com' };
	return {
		getRepositoryStatus: () => service.getRepositoryStatus(project, user),
		getLiveContextPullHistory: () => service.getLiveContextPullHistory(project, user),
		pullLiveContext: () => service.pullLiveContext(project, user),
		connectRepository: (input: unknown) => service.connectRepository(project, user, input),
		getFileTree: () => service.getFileTree(project),
		getRulesPreviewGroups: () => service.getRulesPreviewGroups(project),
		readFile: (input: { path: string }) => service.readFile(project, user, input.path),
		writeFile: (input: unknown) => service.writeFile(project, user, input),
		getFileDiff: (input: unknown) => service.getFileDiff(project, user, input),
		getHistoricalDiffAction: (input: unknown) => service.getHistoricalDiffAction(project, user, input),
		updateWorktree: (input: { requiredCommits: string[] }) =>
			service.updateWorktree(project, user, input.requiredCommits),
	};
}

function accessRoles(handler: keyof ContextExplorerResolver): readonly string[] | undefined {
	const reflector = new Reflector();
	const requirement = reflector.getAllAndOverride<AccessRequirement | undefined>(ACCESS_KEY, [
		ContextExplorerResolver.prototype[handler],
		ContextExplorerResolver,
	]);
	return requirement?.kind === 'project' ? requirement.roles : undefined;
}
