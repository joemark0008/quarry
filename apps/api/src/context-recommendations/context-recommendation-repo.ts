import type { RepoProvider } from '@quarry/shared/types';

import type { ContextRecommendationConfigRecord } from './context-recommendation.types.js';

/** Upstream `context-pr.service` `RecommendationRepo`: the Git repository context fixes are proposed against. */
export interface RecommendationRepo {
	repoFullName: string;
	branch: string | null;
	source: 'settings' | 'deployment' | 'linked';
	provider: RepoProvider | 'generic';
	webUrl: string;
	subPath: string;
}

/**
 * Stand-in for upstream `resolveRecommendationRepo` (`services/context-pr.service.ts`, Phase 7 `git-providers`):
 * the repository saved on the recommendations settings page, with no sub-path detection. Upstream also falls back
 * to the deployment's Git context source, which quarry does not have (context files live in the project folder).
 */
export function toRecommendationRepo(config: ContextRecommendationConfigRecord | null): RecommendationRepo | null {
	if (!config?.repoFullName) {
		return null;
	}
	const provider = config.repoProvider ?? 'github';
	const baseUrl = provider === 'gitlab' ? 'https://gitlab.com' : 'https://github.com';
	return {
		repoFullName: config.repoFullName,
		branch: null,
		source: 'settings',
		provider,
		webUrl: `${baseUrl}/${config.repoFullName}`,
		subPath: '',
	};
}
