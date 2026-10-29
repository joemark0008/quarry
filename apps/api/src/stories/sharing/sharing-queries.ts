import type { StorySharingRepository } from './story-sharing.repository.js';

/**
 * Bindings for the module-level sharing code (like `story-queries.ts`): `StorySharingModule` binds its own
 * repository at boot; specs bind fakes.
 */
export interface StorySharingRepositories {
	mcpEndpoint: StorySharingRepository;
}

type Bound = { [K in keyof StorySharingRepositories]?: Partial<StorySharingRepositories[K]> };

let repositories: Bound = {};

export function bindStorySharingQueries(bound: Bound | null): void {
	repositories = bound ?? {};
}

function namespace<K extends keyof StorySharingRepositories>(key: K): StorySharingRepositories[K] {
	return new Proxy({} as StorySharingRepositories[K], {
		get(_target, property) {
			return (...args: unknown[]) => {
				const repository = repositories[key] as Record<string | symbol, unknown> | undefined;
				const method = repository?.[property];
				if (typeof method !== 'function') {
					throw new Error(
						`The ${key} repository's ${String(property)} is not bound (StorySharingModule binds it).`,
					);
				}
				return method.apply(repository, args);
			};
		},
	});
}

/** Upstream `queries/mcp-endpoint.queries`. */
export const mcpEndpointQueries = namespace('mcpEndpoint');
