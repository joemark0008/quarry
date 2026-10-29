import { Injectable } from '@nestjs/common';

import type { SandboxSecret } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type SandboxSecretSummary = Pick<SandboxSecret, 'id' | 'name' | 'description' | 'createdAt' | 'updatedAt'>;

const summaryColumns = { id: true, name: true, description: true, createdAt: true, updatedAt: true } as const;

/** Port of upstream `queries/sandbox-secret.queries.ts`. Every secret belongs to one user in one project. */
@Injectable()
export class SandboxSecretRepository {
	constructor(private readonly prisma: PrismaService) {}

	listSandboxSecretSummaries(userId: string, projectId: string): Promise<SandboxSecretSummary[]> {
		return this.prisma.sandboxSecret.findMany({
			where: { userId, projectId },
			select: summaryColumns,
			orderBy: { name: 'asc' },
		});
	}

	listSandboxSecrets(userId: string, projectId: string): Promise<SandboxSecret[]> {
		return this.prisma.sandboxSecret.findMany({ where: { userId, projectId }, orderBy: { name: 'asc' } });
	}

	upsertSandboxSecret(values: {
		userId: string;
		projectId: string;
		name: string;
		encryptedValue: string;
		description: string | null;
	}): Promise<SandboxSecretSummary> {
		return this.prisma.sandboxSecret.upsert({
			where: {
				userId_projectId_name: { userId: values.userId, projectId: values.projectId, name: values.name },
			},
			create: values,
			update: { encryptedValue: values.encryptedValue, description: values.description, updatedAt: new Date() },
			select: summaryColumns,
		});
	}

	async updateSandboxSecretDescription(
		userId: string,
		projectId: string,
		secretId: string,
		description: string | null,
	): Promise<SandboxSecretSummary | null> {
		const { count } = await this.prisma.sandboxSecret.updateMany({
			where: { id: secretId, userId, projectId },
			data: { description },
		});
		if (count === 0) {
			return null;
		}
		return this.prisma.sandboxSecret.findUnique({ where: { id: secretId }, select: summaryColumns });
	}

	async deleteSandboxSecret(
		userId: string,
		projectId: string,
		secretId: string,
	): Promise<SandboxSecretSummary | null> {
		const row = await this.prisma.sandboxSecret.findFirst({
			where: { id: secretId, userId, projectId },
			select: summaryColumns,
		});
		if (!row) {
			return null;
		}
		await this.prisma.sandboxSecret.deleteMany({ where: { id: secretId, userId, projectId } });
		return row;
	}
}
