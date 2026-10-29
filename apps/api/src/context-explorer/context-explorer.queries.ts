import type { ContextRecommendationConfig } from '../generated/prisma/client.js';
import type { ContextExplorerRepository, ContextRepositoryConfigPatch } from './context-explorer.repository.js';
import type { OpenReviewRequestResult } from './git/review-request-provider.js';

/**
 * The query functions upstream's module-level Git services import (`queries/context-branch-ownership.queries`,
 * `context-recommendation.queries` `getConfig`/`updateConfig`, `user.queries` provider tokens). The copied services
 * stay module-level, so `ContextExplorerModule` binds the repository here at boot; specs mock this module the way
 * upstream mocks its query files.
 */
let repository: ContextExplorerRepository | null = null;

export function bindContextExplorerRepository(bound: ContextExplorerRepository | null): void {
	repository = bound;
}

function requireRepository(): ContextExplorerRepository {
	if (!repository) {
		throw new Error('The context explorer repository is not bound.');
	}
	return repository;
}

export function listContextBranchOwnerships(): Promise<
	Array<{ id: string; projectId: string; branch: string; userId: string }>
> {
	return requireRepository().listContextBranchOwnerships();
}

export function claimContextBranch(projectId: string, branch: string, userId: string): Promise<boolean> {
	return requireRepository().claimContextBranch(projectId, branch, userId);
}

export function releaseContextBranch(projectId: string, branch: string, userId: string): Promise<void> {
	return requireRepository().releaseContextBranch(projectId, branch, userId);
}

export function getOwnedContextBranches(projectId: string, userId: string): Promise<Set<string>> {
	return requireRepository().getOwnedContextBranches(projectId, userId);
}

export function isContextBranchOwnedByUser(projectId: string, branch: string, userId: string): Promise<boolean> {
	return requireRepository().isContextBranchOwnedByUser(projectId, branch, userId);
}

export function getContextBranchReviewRequest(
	projectId: string,
	branch: string,
	userId: string,
): Promise<OpenReviewRequestResult | null> {
	return requireRepository().getContextBranchReviewRequest(projectId, branch, userId);
}

export function setContextBranchReviewRequest(
	projectId: string,
	branch: string,
	userId: string,
	reviewRequest: OpenReviewRequestResult,
): Promise<void> {
	return requireRepository().setContextBranchReviewRequest(projectId, branch, userId, reviewRequest);
}

export function getConfig(projectId: string): Promise<ContextRecommendationConfig | null> {
	return requireRepository().getConfig(projectId);
}

export function updateConfig(
	projectId: string,
	patch: ContextRepositoryConfigPatch,
): Promise<ContextRecommendationConfig> {
	return requireRepository().updateConfig(projectId, patch);
}

/** GitHub and GitLab OAuth accounts arrive with the `git-providers` module (Phase 7). */
export async function getGithubToken(_userId: string): Promise<string | null> {
	return null;
}

export async function getGitlabToken(_userId: string): Promise<string | null> {
	return null;
}
