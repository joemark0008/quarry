import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { decryptSecret, encryptSecret } from '../common/utils/encryption.js';
import { ConfigService } from '../config/config.service.js';
import { WarehouseCredentialsRepository } from './warehouse-credentials.repository.js';

const storedWarehouseEnvSchema = z.object({
	version: z.literal(1),
	envVars: z.record(z.string(), z.string()),
});

/** Port of upstream `services/warehouse-credentials.ts` and `project-runtime-env.ts`. */
@Injectable()
export class WarehouseCredentialsService {
	constructor(
		private readonly credentials: WarehouseCredentialsRepository,
		private readonly config: ConfigService,
	) {}

	async saveProjectWarehouseEnvVars(
		projectId: string,
		provider: string,
		envVars: Record<string, string>,
	): Promise<void> {
		const payload = storedWarehouseEnvSchema.parse({ version: 1, envVars });
		const encrypted = encryptSecret(JSON.stringify(payload), this.config.env.BETTER_AUTH_SECRET);
		await this.credentials.upsertProjectWarehouseCredentials(projectId, provider, encrypted);
	}

	async getProjectWarehouseEnvVars(projectId: string): Promise<Record<string, string>> {
		const stored = await this.credentials.getProjectWarehouseCredentials(projectId);
		if (!stored) {
			return {};
		}
		try {
			const decrypted = decryptSecret(stored.encryptedCredentials, this.config.env.BETTER_AUTH_SECRET);
			return storedWarehouseEnvSchema.parse(JSON.parse(decrypted)).envVars;
		} catch {
			throw new Error('Invalid warehouse environment');
		}
	}

	async getProjectWarehouseProvider(projectId: string): Promise<string | null> {
		return (await this.credentials.getProjectWarehouseCredentials(projectId))?.provider ?? null;
	}

	deleteProjectWarehouseEnvVars(projectId: string): Promise<void> {
		return this.credentials.deleteProjectWarehouseCredentials(projectId);
	}

	/** Project env vars overlaid with the warehouse ones (`getProjectRuntimeEnvVars`). */
	async getProjectRuntimeEnvVars(projectId: string): Promise<Record<string, string>> {
		const [projectEnvVars, warehouseEnvVars] = await Promise.all([
			this.credentials.getProjectEnvVars(projectId),
			this.getProjectWarehouseEnvVars(projectId),
		]);
		return { ...projectEnvVars, ...warehouseEnvVars };
	}
}
