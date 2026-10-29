import { findOpenContextReviewRequest, getContextBranches } from './branches.js';
import { toContextRepoState } from './context-repo.js';
import { readOptionalGitValue } from './git-guards.js';
import {
	getDeploymentContextSource,
	getLiveContextRepository,
	getLiveContextUpdateStatus,
	getResolvedLiveContextUpdateStatus,
} from './live-context.js';
import { REVIEW_REQUEST_PROVIDERS } from './review-request-provider.js';
import type { ContextExplorerGitContext, ContextRepositoryStatus } from './types.js';
import { readContextWorktreeUpdateStatus, resolveContextExplorerGit, unavailableMessage } from './worktree.js';

export async function getContextRepositoryStatus(context: ContextExplorerGitContext): Promise<ContextRepositoryStatus> {
	const contextSource = getDeploymentContextSource();
	try {
		const resolution = await resolveContextExplorerGit(context);
		const liveContextUpdate = getResolvedLiveContextUpdateStatus(context, resolution);
		const repositoryState =
			resolution.status === 'available' ? toContextRepoState(resolution.repo) : resolution.repo;
		const liveContextRepository = getLiveContextRepository(repositoryState, contextSource);
		if (resolution.status === 'unavailable') {
			const provider = resolution.repo ? REVIEW_REQUEST_PROVIDERS[resolution.repo.provider] : null;
			return {
				repo: resolution.repo,
				repositoryUrl:
					resolution.repo && provider ? provider.publicRepoUrl(resolution.repo.repoFullName) : null,
				managedByContextSource: contextSource !== null,
				contextSource,
				liveContextRepository,
				liveContextUpdate,
				gitUnavailableReason: resolution.reason,
				gitUnavailableMessage: resolution.message,
				lastCommitMessage: null,
				lastCommitDate: null,
				branches: null,
				fileExplorerUpdate: null,
				openReviewRequest: null,
				isGitRepository: false,
			};
		}
		const { repo } = resolution;
		const provider = resolution.context.providerOverride ?? REVIEW_REQUEST_PROVIDERS[repo.provider];
		const branches = await getContextBranches(repo, resolution.context);
		const repoState = repositoryState;
		return {
			repo: repoState ? { ...repoState, branch: branches.currentBranch } : null,
			repositoryUrl: provider.publicRepoUrl(repo.repoFullName),
			managedByContextSource: contextSource !== null,
			contextSource,
			liveContextRepository,
			liveContextUpdate,
			gitUnavailableReason: null,
			gitUnavailableMessage: null,
			lastCommitMessage: readOptionalGitValue(repo.worktreeRoot, ['log', '-1', '--format=%s']),
			lastCommitDate: readOptionalGitValue(repo.worktreeRoot, ['log', '-1', '--format=%cI']),
			branches,
			fileExplorerUpdate: readContextWorktreeUpdateStatus(repo, context.projectFolder, provider),
			openReviewRequest: await findOpenContextReviewRequest(
				provider,
				resolution.context.token,
				repo.repoFullName,
				branches.currentBranch,
				branches.defaultBranch,
				context.projectId,
				context.userId,
			),
			isGitRepository: true,
		};
	} catch {
		const liveContextUpdate = getLiveContextUpdateStatus(context.projectFolder);
		return {
			repo: null,
			repositoryUrl: null,
			managedByContextSource: contextSource !== null,
			contextSource,
			liveContextRepository: contextSource,
			liveContextUpdate,
			gitUnavailableReason: 'git-unavailable',
			gitUnavailableMessage: unavailableMessage('git-unavailable'),
			lastCommitMessage: null,
			lastCommitDate: null,
			branches: null,
			fileExplorerUpdate: null,
			openReviewRequest: null,
			isGitRepository: false,
		};
	}
}

export {
	commitContextChanges,
	createContextBranch,
	createContextBranchAndCommit,
	deleteOwnedContextBranch,
	generateContextBranchName,
	getContextBranchCommitMessages,
	getContextBranches,
	pushContextBranch,
	suggestContextBranchName,
	switchContextBranch,
} from './branches.js';
export {
	discardAllContextChanges,
	discardContextFileChange,
	getChangedContextFiles,
	getContextFileDiff,
} from './changes.js';
export { sanitizeContextSourceRepositoryUrl } from './context-repo.js';
export {
	assertSafeDestructiveWorktreeCommand,
	assertSafeDestructiveWorktreeTarget,
	normalizeRemote,
	sanitizeLiveContextError,
} from './git-guards.js';
export { getDeploymentContextSource, getLiveContextUpdateStatus, pullLiveContext } from './live-context.js';
export type {
	ContextExplorerGitContext,
	ContextExplorerGitResolution,
	ContextHistoricalDiffAction,
	ContextRepositoryProvider,
	ContextRepositoryStatus,
	ContextWorktreeUpdateStatus,
	CreateBranchAndCommitInput,
	CreateBranchAndCommitResult,
	DeploymentContextSource,
	LiveContextPullFile,
	LiveContextPullResult,
	LiveContextUpdateStatus,
	OwnedContextBranchDeletionInput,
	OwnedContextBranchDeletionResult,
} from './types.js';
export {
	cleanupContextWorktree,
	connectContextRepository,
	disconnectContextRepository,
	ensureContextWorktree,
	getHistoricalContextDiffActions,
	requireContextExplorerGit,
	resolveContextExplorerGit,
	resolveContextExplorerGitSafely,
	updateContextWorktree,
} from './worktree.js';
