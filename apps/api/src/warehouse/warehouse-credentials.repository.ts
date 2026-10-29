import { Injectable } from '@nestjs/common';

import type { ProjectWarehouseCredentials } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Port of upstream `queries/project-warehouse-credentials.queries.ts`. */
@Injectable()
export class WarehouseCredentialsRepository {
	constructor(private readonly prisma: PrismaService) {}

	async upsertProjectWarehouseCredentials(
		projectId: string,
		provider: string,
		encryptedCredentials: string,
	): Promise<void> {
		await this.prisma.projectWarehouseCredentials.upsert({
			where: { projectId },
			create: { projectId, provider, encryptedCredentials },
			update: { provider, encryptedCredentials },
		});
	}

	getProjectWarehouseCredentials(projectId: string): Promise<ProjectWarehouseCredentials | null> {
		return this.prisma.projectWarehouseCredentials.findUnique({ where: { projectId } });
	}

	async deleteProjectWarehouseCredentials(projectId: string): Promise<void> {
		await this.prisma.projectWarehouseCredentials.deleteMany({ where: { projectId } });
	}

	async getProjectEnvVars(projectId: string): Promise<Record<string, string>> {
		const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { envVars: true } });
		const envVars = project?.envVars;
		if (!envVars || typeof envVars !== 'object' || Array.isArray(envVars)) {
			return {};
		}
		return Object.fromEntries(
			Object.entries(envVars).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
		);
	}
}
