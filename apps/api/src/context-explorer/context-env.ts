import { z } from 'zod';

/**
 * The deployment variables upstream's context Git code reads from its module-level `env`. The copied Git services
 * stay module-level, so (like `attachments/storage`) they parse these from `process.env` themselves; the full
 * validated environment (`config/env.ts`) declares the same variables.
 */
const contextEnvSchema = z.object({
	QUARRY_CONTEXT_SOURCE: z.enum(['local', 'git', 'api']).optional(),
	QUARRY_CONTEXT_GIT_URL: z.string().optional(),
	QUARRY_CONTEXT_GIT_BRANCH: z.string().optional(),
	QUARRY_CONTEXT_GIT_SUBPATH: z.string().optional(),
	QUARRY_CONTEXT_GIT_TOKEN: z.string().optional(),
	QUARRY_CONTEXT_GIT_SSH_KEY: z.string().optional(),
	QUARRY_CONTEXT_GIT_PLATFORM: z.enum(['github', 'gitlab', 'bitbucket']).optional(),
	GITLAB_BASE_URL: z
		.string()
		.optional()
		.transform((value) => value || undefined),
});

export type ContextEnv = z.output<typeof contextEnvSchema>;

export const env: ContextEnv = contextEnvSchema.parse(process.env);

/** Re-reads `process.env` after a test changed it (upstream `__reloadEnvForTesting`). */
export function __reloadContextEnvForTesting(): void {
	const parsed = contextEnvSchema.parse(process.env);
	const mutable = env as Record<string, unknown>;
	for (const key of Object.keys(mutable)) {
		delete mutable[key];
	}
	Object.assign(env, parsed);
}
