/**
 * Stand-in for upstream `services/sandbox-secret.service.ts` (sandbox secrets are Phase 2d): no secret is
 * stored, so the sandbox runs without any and the system prompt lists none.
 */

/** What the model is allowed to know about a secret: its name and what it is for, never its value. */
export interface SandboxSecretDefinition {
	name: string;
	description: string | null;
}

/** A decrypted secret, only ever handed to the sandbox runtime. */
export interface ResolvedSandboxSecret {
	name: string;
	value: string;
}

export const sandboxSecretService = {
	async safeListDefinitions(_userId: string, _projectId: string): Promise<SandboxSecretDefinition[]> {
		return [];
	},

	async resolve(_userId: string, _projectId: string): Promise<ResolvedSandboxSecret[]> {
		return [];
	},
};
