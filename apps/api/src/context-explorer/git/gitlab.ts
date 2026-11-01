import { env } from '../context-env.js';
import type { GitIdentity } from './git-identity.js';

export { QUARRY_CO_AUTHOR } from './git-identity.js';

/**
 * Stand-in for upstream `services/gitlab.ts`: the GitLab OAuth integration, its API calls and the managed GitLab
 * repository are Phase 7 (`git-providers`). Until then no GitLab token exists, so a context repository can only be
 * connected through the deployment's generic Git source (`QUARRY_CONTEXT_SOURCE=git`).
 */
export const GITLAB_UNAVAILABLE_MESSAGE = 'The GitLab integration is not available yet.';

export interface GitInfo {
	branch: string | null;
}

export function isGitlabIntegrationAvailable(): boolean {
	return false;
}

export function gitlabBaseUrl(): string {
	return env.GITLAB_BASE_URL?.replace(/\/$/, '') || 'https://gitlab.com';
}

export function authenticatedRepoUrl(token: string, repoFullName: string): string {
	const withoutScheme = gitlabBaseUrl().replace(/^https?:\/\//, '');
	return `https://oauth2:${token}@${withoutScheme}/${repoFullName}.git`;
}

export function publicRepoUrl(repoFullName: string): string {
	return `${gitlabBaseUrl()}/${repoFullName}.git`;
}

export function cloneRepo(): void {
	throw new Error(GITLAB_UNAVAILABLE_MESSAGE);
}

export function getGitInfo(): GitInfo {
	return { branch: null };
}

export async function getUserGitIdentity(_token: string): Promise<GitIdentity> {
	throw new Error(GITLAB_UNAVAILABLE_MESSAGE);
}

export function commitAllAndPushBranch(): string {
	throw new Error(GITLAB_UNAVAILABLE_MESSAGE);
}

export function pushBranch(_args: { token: string; repoFullName: string; dir: string; branch: string }): string {
	throw new Error(GITLAB_UNAVAILABLE_MESSAGE);
}

export async function findOpenMergeRequest(
	..._args: [token: string, repoFullName: string, branch: string, apiBaseUrl?: string]
): Promise<{ url: string } | null> {
	return null;
}

export async function findMergeRequestByBranch(_token: string, _repoFullName: string, _branch: string): Promise<null> {
	return null;
}

export async function createMergeRequest(
	..._args: [token: string, repoFullName: string, input: unknown, apiBaseUrl?: string]
): Promise<{ web_url: string }> {
	throw new Error(GITLAB_UNAVAILABLE_MESSAGE);
}
