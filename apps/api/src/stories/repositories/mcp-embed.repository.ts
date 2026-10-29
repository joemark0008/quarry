import { Injectable } from '@nestjs/common';
import type { McpChartEmbedStoredConfig, McpMapEmbedStoredConfig } from '@quarry/shared';

import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Port of upstream `queries/mcp-embed.queries.ts`. */
@Injectable()
export class McpEmbedRepository {
	constructor(private readonly prisma: PrismaService) {}

	/** Port of upstream `queries/mcp-query-data.queries.ts` `getMcpQueryData`: an unexpired MCP result, optionally the user's own. */
	async getMcpQueryData(
		queryId: string,
		projectId: string,
		options?: { userId?: string },
	): Promise<{ columns: string[]; data: Record<string, unknown>[]; sourceChatId: string | null } | null> {
		const row = await this.prisma.mcpQueryData.findFirst({
			where: { queryId, projectId, expiresAt: { gt: new Date() } },
			select: { columns: true, data: true, sourceChatId: true, callLogId: true },
		});
		if (!row) {
			return null;
		}
		if (options?.userId) {
			const callLog = row.callLogId
				? await this.prisma.mcpCallLog.findFirst({
						where: { id: row.callLogId, userId: options.userId },
						select: { id: true },
					})
				: null;
			if (!callLog) {
				return null;
			}
		}
		return {
			columns: row.columns as string[],
			data: row.data as Record<string, unknown>[],
			sourceChatId: row.sourceChatId ?? null,
		};
	}

	insertMcpChartEmbed(params: {
		chartEmbedId: string;
		queryId: string;
		projectId: string;
		chartConfig: McpChartEmbedStoredConfig;
		sourceChatId: string | null;
	}): Promise<boolean> {
		return this.insertMcpEmbed(params.queryId, params.projectId, async (tx) => {
			await tx.mcpChartEmbed.create({
				data: {
					chartEmbedId: params.chartEmbedId,
					queryId: params.queryId,
					chartConfig: params.chartConfig as Prisma.InputJsonValue,
					sourceChatId: params.sourceChatId,
				},
			});
		});
	}

	async getMcpChartEmbedById(chartEmbedId: string): Promise<{
		projectId: string;
		queryId: string;
		chartConfig: McpChartEmbedStoredConfig;
		sourceChatId: string | null;
	} | null> {
		const row = await this.prisma.mcpChartEmbed.findUnique({
			where: { chartEmbedId },
			include: { mcpQueryData: { select: { projectId: true } } },
		});
		if (!row) {
			return null;
		}
		return {
			projectId: row.mcpQueryData.projectId,
			queryId: row.queryId,
			chartConfig: row.chartConfig as McpChartEmbedStoredConfig,
			sourceChatId: row.sourceChatId ?? null,
		};
	}

	insertMcpMapEmbed(params: {
		mapEmbedId: string;
		queryId: string;
		projectId: string;
		mapConfig: McpMapEmbedStoredConfig;
		sourceChatId: string | null;
	}): Promise<boolean> {
		return this.insertMcpEmbed(params.queryId, params.projectId, async (tx) => {
			await tx.mcpMapEmbed.create({
				data: {
					mapEmbedId: params.mapEmbedId,
					queryId: params.queryId,
					mapConfig: params.mapConfig as Prisma.InputJsonValue,
					sourceChatId: params.sourceChatId,
				},
			});
		});
	}

	async getMcpMapEmbedById(mapEmbedId: string): Promise<{
		projectId: string;
		queryId: string;
		mapConfig: McpMapEmbedStoredConfig;
		sourceChatId: string | null;
	} | null> {
		const row = await this.prisma.mcpMapEmbed.findUnique({
			where: { mapEmbedId },
			include: { mcpQueryData: { select: { projectId: true } } },
		});
		if (!row) {
			return null;
		}
		return {
			projectId: row.mcpQueryData.projectId,
			queryId: row.queryId,
			mapConfig: row.mapConfig as McpMapEmbedStoredConfig,
			sourceChatId: row.sourceChatId ?? null,
		};
	}

	/** Only embeds a query result of the same project; false when there is none. */
	private insertMcpEmbed(
		queryId: string,
		projectId: string,
		insert: (tx: Prisma.TransactionClient) => Promise<void>,
	): Promise<boolean> {
		return this.prisma.$transaction(async (tx) => {
			const match = await tx.mcpQueryData.findFirst({ where: { queryId, projectId }, select: { queryId: true } });
			if (!match) {
				return false;
			}
			await insert(tx);
			return true;
		});
	}
}
