import { Injectable, Logger } from '@nestjs/common';

import { decryptSecret, encryptSecret } from '../common/utils/encryption.js';
import { ConfigService } from '../config/config.service.js';
import { SandboxSecretRepository, type SandboxSecretSummary } from './sandbox-secret.repository.js';

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

/**
 * Port of upstream `services/sandbox-secret.service.ts`. Values are encrypted with the app secret like the
 * warehouse credentials; `resolve` (the sandbox tool, through `ToolContext.services`) is the only way back.
 */
@Injectable()
export class SandboxSecretService {
	private readonly logger = new Logger(SandboxSecretService.name);

	constructor(
		private readonly secrets: SandboxSecretRepository,
		private readonly config: ConfigService,
	) {}

	list(userId: string, projectId: string): Promise<SandboxSecretSummary[]> {
		return this.secrets.listSandboxSecretSummaries(userId, projectId);
	}

	set(
		userId: string,
		projectId: string,
		input: { name: string; value: string; description?: string | null },
	): Promise<SandboxSecretSummary> {
		return this.secrets.upsertSandboxSecret({
			userId,
			projectId,
			name: input.name,
			encryptedValue: encryptSecret(input.value, this.config.env.BETTER_AUTH_SECRET),
			description: normalizeDescription(input.description),
		});
	}

	updateDescription(
		userId: string,
		projectId: string,
		secretId: string,
		description: string | null | undefined,
	): Promise<SandboxSecretSummary | null> {
		return this.secrets.updateSandboxSecretDescription(
			userId,
			projectId,
			secretId,
			normalizeDescription(description),
		);
	}

	delete(userId: string, projectId: string, secretId: string): Promise<SandboxSecretSummary | null> {
		return this.secrets.deleteSandboxSecret(userId, projectId, secretId);
	}

	async listDefinitions(userId: string, projectId: string): Promise<SandboxSecretDefinition[]> {
		const secrets = await this.secrets.listSandboxSecretSummaries(userId, projectId);
		return secrets.map(({ name, description }) => ({ name, description }));
	}

	async safeListDefinitions(userId: string, projectId: string): Promise<SandboxSecretDefinition[]> {
		try {
			return await this.listDefinitions(userId, projectId);
		} catch (error) {
			this.logger.error('Failed to load sandbox secret definitions', error);
			return [];
		}
	}

	async resolve(userId: string, projectId: string): Promise<ResolvedSandboxSecret[]> {
		const secrets = await this.secrets.listSandboxSecrets(userId, projectId);
		return secrets.map(({ name, encryptedValue }) => ({
			name,
			value: decryptSecret(encryptedValue, this.config.env.BETTER_AUTH_SECRET),
		}));
	}
}

function normalizeDescription(description: string | null | undefined): string | null {
	const trimmed = description?.trim();
	return trimmed ? trimmed : null;
}
