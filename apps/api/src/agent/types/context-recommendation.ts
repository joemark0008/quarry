import type { RepoProvider } from '@quarry/shared/types';

/** The repository type of upstream `types/context-recommendation.ts` (recommendations are Phase 3). */
export interface LinkedContextRepo {
	name: string;
	contextPath: string;
	url: string | null;
	branch: string | null;
	localPath: string | null;
	repoFullName: string | null;
	/** Only set when `repoFullName` is resolved from a recognized GitHub or GitLab URL. */
	provider: RepoProvider | null;
}
