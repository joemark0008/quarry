import { Injectable } from '@nestjs/common';
import type { LlmProvider } from '@quarry/shared/types';

import type { Prisma, ProjectLlmConfig } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Port of upstream `queries/project-llm-config.queries.ts`. */
@Injectable()
export class ProjectLlmConfigRepository {
	constructor(private readonly prisma: PrismaService) {}

	getProjectLlmConfigs(projectId: string): Promise<ProjectLlmConfig[]> {
		return this.prisma.projectLlmConfig.findMany({ where: { projectId } });
	}

	getProjectLlmConfigByProvider(projectId: string, provider: LlmProvider): Promise<ProjectLlmConfig | null> {
		return this.prisma.projectLlmConfig.findUnique({ where: { projectId_provider: { projectId, provider } } });
	}

	/** A null `apiKey` keeps the stored key. */
	upsertProjectLlmConfig(config: {
		projectId: string;
		provider: LlmProvider;
		apiKey: string | null;
		enabledModels: string[];
		customModels: Prisma.InputJsonValue;
		baseUrl: string | null;
		credentials?: Prisma.InputJsonValue | null;
		modelSettings?: Prisma.InputJsonValue;
	}): Promise<ProjectLlmConfig> {
		const shared = {
			enabledModels: config.enabledModels,
			customModels: config.customModels,
			baseUrl: config.baseUrl,
			...(config.modelSettings !== undefined && { modelSettings: config.modelSettings }),
		};
		const credentials =
			config.credentials === undefined
				? {}
				: { credentials: config.credentials === null ? ({} as Prisma.InputJsonValue) : config.credentials };
		return this.prisma.projectLlmConfig.upsert({
			where: { projectId_provider: { projectId: config.projectId, provider: config.provider } },
			create: {
				projectId: config.projectId,
				provider: config.provider,
				apiKey: config.apiKey ?? '',
				...shared,
				...credentials,
			},
			update: { ...(config.apiKey !== null && { apiKey: config.apiKey }), ...shared, ...credentials },
		});
	}

	async deleteProjectLlmConfig(projectId: string, provider: LlmProvider): Promise<void> {
		await this.prisma.projectLlmConfig.deleteMany({ where: { projectId, provider } });
	}

	async getDefaultModelSettings(projectId: string): Promise<unknown> {
		const project = await this.prisma.project.findUnique({
			where: { id: projectId },
			select: { defaultModels: true },
		});
		return project?.defaultModels ?? null;
	}

	async getAgentSettings(projectId: string): Promise<unknown> {
		const project = await this.prisma.project.findUnique({
			where: { id: projectId },
			select: { agentSettings: true },
		});
		return project?.agentSettings ?? null;
	}

	async updateDefaultModelSettings(projectId: string, settings: Prisma.InputJsonValue): Promise<void> {
		await this.prisma.project.update({ where: { id: projectId }, data: { defaultModels: settings } });
	}

	async updateAgentSettings(projectId: string, settings: Prisma.InputJsonValue): Promise<void> {
		await this.prisma.project.update({ where: { id: projectId }, data: { agentSettings: settings } });
	}

	/** A configured anthropic, else openai, provider (first half of upstream `getProjectModelProvider`). */
	async getConfiguredTaskProvider(projectId: string): Promise<LlmProvider | undefined> {
		const configs = await this.getProjectLlmConfigs(projectId);
		return (['anthropic', 'openai'] as LlmProvider[]).find((provider) =>
			configs.some((config) => config.provider === provider),
		);
	}
}
