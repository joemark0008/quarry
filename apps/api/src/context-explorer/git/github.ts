import type { GitIdentity } from './git-identity.js';

export { QUARRY_CO_AUTHOR } from './git-identity.js';

/**
 * Stand-in for upstream `services/github.ts`: the GitHub OAuth integration, its API calls and the managed GitHub
 * repository are Phase 7 (`git-providers`). Until then no GitHub token exists, so a context repository can only be
 * connected through the deployment's generic Git source (`QUARRY_CONTEXT_SOURCE=git`).
 */
export const GITHUB_UNAVAILABLE_MESSAGE = 'The GitHub integration is not available yet.';

export interface GitInfo {
	branch: string | null;
}

export function isGithubIntegrationAvailable(): boolean {
	return false;
}

export function authenticatedRepoUrl(token: string, repoFullName: string): string {
	return `https://x-access-token:${token}@github.com/${repoFullName}.git`;
}

export function publicRepoUrl(repoFullName: string): string {
	return `https://github.com/${repoFullName}.git`;
}

export function cloneRepo(): void {
	throw new Error(GITHUB_UNAVAILABLE_MESSAGE);
}

export function getGitInfo(): GitInfo {
	return { branch: null };
}

export async function getUserGitIdentity(_token: string): Promise<GitIdentity> {
	throw new Error(GITHUB_UNAVAILABLE_MESSAGE);
}

export function commitAllAndPushBranch(): string {
	throw new Error(GITHUB_UNAVAILABLE_MESSAGE);
}

export function pushBranch(_args: { token: string; repoFullName: string; dir: string; branch: string }): string {
	throw new Error(GITHUB_UNAVAILABLE_MESSAGE);
}

export async function findOpenPullRequest(
	..._args: [token: string, repoFullName: string, branch: string, apiBaseUrl?: string]
): Promise<{ url: string } | null> {
	return null;
}

export async function findPullRequestByBranch(_token: string, _repoFullName: string, _branch: string): Promise<null> {
	return null;
}

export async function createPullRequest(
	..._args: [token: string, repoFullName: string, input: unknown, apiBaseUrl?: string]
): Promise<{ html_url: string }> {
	throw new Error(GITHUB_UNAVAILABLE_MESSAGE);
}
