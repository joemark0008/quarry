import { z } from 'zod';

import { HandlerError } from '../../common/errors/handler-error.js';
import { mcpQueryDataQueries as mcpEmbedQueries, projectQueries } from '../story-queries.js';
import { logAnalyticsEvent } from '../utils/analytics-event.js';
import { buildDownloadResponse } from '../utils/story-download.js';
import { storyPath } from '../utils/story-links.js';
import { loadEmbedStoryContent } from './embed-story.js';
import { assertProjectMcpEnabled, verifyEmbedToken } from './embed-token.js';
import { publicProcedure } from './sharing-procedure.js';

/** Port of upstream `trpc/embed.routes.ts` (`trpc.embed.*`): public, authenticated by the embed token. */
const tokenInput = z.object({ token: z.string() });

function resolveChartToken(token: string, chartEmbedId: string) {
	const payload = verifyEmbedToken(token);
	if (!payload || payload.type !== 'chart' || payload.resourceId !== chartEmbedId) {
		throw new HandlerError('UNAUTHORIZED', 'Invalid or expired embed token.');
	}
	return payload;
}

function resolveMapToken(token: string, mapEmbedId: string) {
	const payload = verifyEmbedToken(token);
	if (!payload || payload.type !== 'map' || payload.resourceId !== mapEmbedId) {
		throw new HandlerError('UNAUTHORIZED', 'Invalid or expired embed token.');
	}
	return payload;
}

export const embedRoutes = {
	getStory: publicProcedure.input(tokenInput.extend({ storyId: z.string() })).query(async ({ input }) => {
		const story = await loadEmbedStoryContent(input.storyId, input.token);
		logAnalyticsEvent({
			projectId: story.projectId,
			type: 'page_view',
			assetType: 'story',
			actorUserId: null,
			storyId: story.storyId,
			chatId: story.chatId,
		});
		return {
			id: story.storyId,
			title: story.title,
			code: story.code,
			queryData: story.queryData,
			theme: story.theme,
			openInNaoPath: storyPath(story.storyId),
		};
	}),

	getChart: publicProcedure.input(tokenInput.extend({ chartEmbedId: z.string() })).query(async ({ input }) => {
		const payload = resolveChartToken(input.token, input.chartEmbedId);

		const embed = await mcpEmbedQueries.getMcpChartEmbedById(input.chartEmbedId);
		if (!embed) {
			throw new HandlerError('NOT_FOUND', 'Chart embed not found.');
		}
		if (embed.projectId !== payload.projectId) {
			throw new HandlerError('UNAUTHORIZED', 'Embed token does not match this chart.');
		}

		await assertProjectMcpEnabled(embed.projectId);

		const queryData = await mcpEmbedQueries.getMcpQueryData(embed.queryId, embed.projectId);
		if (!queryData) {
			throw new HandlerError('NOT_FOUND', 'Query data not found or expired.');
		}

		const dbChat =
			typeof queryData.sourceChatId === 'string' && queryData.sourceChatId.trim()
				? queryData.sourceChatId.trim()
				: null;
		const rowChat =
			typeof embed.sourceChatId === 'string' && embed.sourceChatId.trim() ? embed.sourceChatId.trim() : null;
		const sourceChatId = dbChat ?? rowChat;

		return {
			data: queryData.data,
			sourceChatId,
			chartConfig: embed.chartConfig,
		};
	}),

	getMap: publicProcedure.input(tokenInput.extend({ mapEmbedId: z.string() })).query(async ({ input }) => {
		const payload = resolveMapToken(input.token, input.mapEmbedId);

		const embed = await mcpEmbedQueries.getMcpMapEmbedById(input.mapEmbedId);
		if (!embed) {
			throw new HandlerError('NOT_FOUND', 'Map embed not found.');
		}
		if (embed.projectId !== payload.projectId) {
			throw new HandlerError('UNAUTHORIZED', 'Embed token does not match this map.');
		}

		await assertProjectMcpEnabled(embed.projectId);

		const queryData = await mcpEmbedQueries.getMcpQueryData(embed.queryId, embed.projectId);
		if (!queryData) {
			throw new HandlerError('NOT_FOUND', 'Query data not found or expired.');
		}

		const dbChat =
			typeof queryData.sourceChatId === 'string' && queryData.sourceChatId.trim()
				? queryData.sourceChatId.trim()
				: null;
		const rowChat =
			typeof embed.sourceChatId === 'string' && embed.sourceChatId.trim() ? embed.sourceChatId.trim() : null;
		const sourceChatId = dbChat ?? rowChat;

		const regionKey = embed.mapConfig.region_boundaries;
		const customBoundaries =
			embed.mapConfig.map_type === 'choropleth' && regionKey
				? (await projectQueries.getCustomBoundaries(embed.projectId)).filter((set) => set.key === regionKey)
				: [];

		return {
			data: queryData.data,
			columns: queryData.columns,
			sourceChatId,
			projectId: embed.projectId,
			mapConfig: embed.mapConfig,
			customBoundaries,
		};
	}),

	downloadStory: publicProcedure
		.input(tokenInput.extend({ storyId: z.string(), format: z.enum(['pdf', 'html']) }))
		.mutation(async ({ input }) => {
			const story = await loadEmbedStoryContent(input.storyId, input.token);
			logAnalyticsEvent({
				projectId: story.projectId,
				type: 'download',
				assetType: 'story',
				actorUserId: null,
				storyId: story.storyId,
				chatId: story.chatId,
				metadata: { type: 'download', format: input.format, title: story.title },
			});
			return buildDownloadResponse(
				input.format,
				story.title,
				story.code,
				story.queryData,
				story.dateFormat,
				story.theme,
			);
		}),
};
