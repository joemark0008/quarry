import type { CustomStoryViewerAccess } from '@quarry/shared/story-app';
import { DOWNLOAD_FORMATS } from '@quarry/shared/types';
import { z } from 'zod/v4';

import { HandlerError } from '../../common/errors/handler-error.js';
import { protectedProcedure } from '../procedure.js';
import {
	getActiveThemeForProject,
	getActiveThemeForStory,
	getCustomStoryFile,
	getCustomStoryNarratives,
	getCustomStoryVersion,
	getSharedCustomStoryQueryData,
	getSharedCustomStoryQuerySql,
} from '../services/custom-story.js';
import { getCustomStoryState, setCustomStoryState } from '../services/custom-story-state.js';
import { chatQueries, projectQueries, sharedChatQueries, storyQueries } from '../story-queries.js';
import { logAnalyticsEvent } from '../utils/analytics-event.js';
import {
	storySnapshotHtml,
	storyStateChange,
	toCustomStoryQueryTrpcError,
	toCustomStoryTrpcError,
} from '../utils/custom-story-errors.js';
import { themeFontStylesheets } from '../utils/story-headless-page.js';
import { buildStorySnapshotDownload } from '../utils/story-snapshot.js';

const viewerAccess = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('sharedChat'), shareId: z.string() }),
	z.object({ kind: z.literal('replay'), chatId: z.string() }),
]) satisfies z.ZodType<CustomStoryViewerAccess>;

interface ResolvedViewerAccess {
	chatId: string;
	projectId: string;
	sharedChatId: string | null;
}

const versionNumber = z.number().int().positive().optional();

const viewerProcedure = protectedProcedure
	.input(z.object({ access: viewerAccess, storySlug: z.string() }))
	.use(async ({ ctx, input, next }) => {
		const viewer = await resolveViewerAccess(input.access, ctx.user.id);
		return next({ ctx: { viewer } });
	});

/**
 * Port of upstream `trpc/custom-story-viewer.routes.ts` (`trpc.customStoryViewer.*`): custom stories inside a shared
 * chat or a chat replay, run by `StoriesService`.
 */
export const customStoryViewerRoutes = {
	getFormat: viewerProcedure.query(async ({ ctx, input }) => {
		const story = await storyQueries.getStoryByChatAndSlug(ctx.viewer.chatId, input.storySlug);
		return { format: story?.format ?? null };
	}),

	getTheme: viewerProcedure.query(({ ctx }) => getActiveThemeForProject(ctx.viewer.projectId)),

	getVersion: viewerProcedure.input(z.object({ versionNumber })).query(async ({ ctx, input }) => {
		try {
			return await getCustomStoryVersion(ctx.viewer.chatId, input.storySlug, input.versionNumber);
		} catch (error) {
			throw toCustomStoryTrpcError(error);
		}
	}),

	getFile: viewerProcedure.input(z.object({ path: z.string(), versionNumber })).query(async ({ ctx, input }) => {
		try {
			return await getCustomStoryFile(ctx.viewer.chatId, input.storySlug, input.path, input.versionNumber);
		} catch (error) {
			throw toCustomStoryTrpcError(error);
		}
	}),

	getQueryData: viewerProcedure
		.input(z.object({ queryId: z.string(), versionNumber }))
		.query(async ({ ctx, input }) => {
			try {
				return await getSharedCustomStoryQueryData(
					ctx.viewer.chatId,
					input.storySlug,
					input.queryId,
					input.versionNumber,
				);
			} catch (error) {
				throw toCustomStoryQueryTrpcError(error);
			}
		}),

	getQuerySql: viewerProcedure
		.input(z.object({ queryId: z.string(), versionNumber }))
		.query(async ({ ctx, input }) => {
			try {
				const sqlQuery = await getSharedCustomStoryQuerySql(
					ctx.viewer.chatId,
					input.storySlug,
					input.queryId,
					input.versionNumber,
				);
				return { sqlQuery };
			} catch (error) {
				throw toCustomStoryTrpcError(error);
			}
		}),

	getState: viewerProcedure.query(async ({ ctx, input }) => {
		try {
			return await getCustomStoryState(ctx.viewer.chatId, input.storySlug, ctx.user.id);
		} catch (error) {
			throw toCustomStoryTrpcError(error);
		}
	}),

	setState: viewerProcedure.input(z.object({ change: storyStateChange })).mutation(async ({ ctx, input }) => {
		try {
			await setCustomStoryState(ctx.viewer.chatId, input.storySlug, ctx.user.id, input.change);
		} catch (error) {
			throw toCustomStoryTrpcError(error);
		}
	}),

	getNarratives: viewerProcedure.query(async ({ ctx, input }) => {
		try {
			return await getCustomStoryNarratives(ctx.viewer.chatId, input.storySlug);
		} catch (error) {
			throw toCustomStoryTrpcError(error);
		}
	}),

	download: viewerProcedure
		.input(z.object({ format: z.enum(DOWNLOAD_FORMATS), html: storySnapshotHtml, versionNumber }))
		.mutation(async ({ ctx, input }) => {
			const version = input.versionNumber
				? await storyQueries.getVersionByNumber(ctx.viewer.chatId, input.storySlug, input.versionNumber)
				: await storyQueries.getLatestVersionByChatAndSlug(ctx.viewer.chatId, input.storySlug);
			if (!version || version.format !== 'custom') {
				throw new HandlerError('NOT_FOUND', 'Story not found.');
			}

			logAnalyticsEvent({
				projectId: ctx.viewer.projectId,
				type: 'download',
				assetType: 'story',
				actorUserId: ctx.user.id,
				storyId: version.storyId,
				chatId: ctx.viewer.chatId,
				...(ctx.viewer.sharedChatId && { sharedChatId: ctx.viewer.sharedChatId }),
				metadata: {
					type: 'download',
					format: input.format,
					versionNumber: version.version,
					title: version.title,
				},
			});

			const fontStylesheets = themeFontStylesheets(await getActiveThemeForStory(version.storyId));
			return buildStorySnapshotDownload(input.format, version.title, input.html, fontStylesheets);
		}),
};

async function resolveViewerAccess(access: CustomStoryViewerAccess, userId: string): Promise<ResolvedViewerAccess> {
	if (access.kind === 'sharedChat') {
		return resolveSharedChatAccess(access.shareId, userId);
	}
	return resolveReplayAccess(access.chatId, userId);
}

async function resolveSharedChatAccess(shareId: string, userId: string): Promise<ResolvedViewerAccess> {
	const share = await sharedChatQueries.getSharedChatInfo(shareId);
	if (!share) {
		throw new HandlerError('NOT_FOUND', 'Shared chat not found.');
	}
	if (!(await projectQueries.getUserRoleInProject(share.projectId, userId))) {
		throw new HandlerError('FORBIDDEN', 'You do not have access to this project.');
	}
	const canAccess =
		share.visibility !== 'specific' ||
		share.userId === userId ||
		(await sharedChatQueries.canUserAccessSharedChat(share.id, userId));
	if (!canAccess) {
		throw new HandlerError('FORBIDDEN', 'You do not have access to this shared chat.');
	}
	return { chatId: share.chatId, projectId: share.projectId, sharedChatId: share.id };
}

/** Same rule as `project.getChatReplay`: admins and context admins of the chat's project. */
async function resolveReplayAccess(chatId: string, userId: string): Promise<ResolvedViewerAccess> {
	const projectId = await chatQueries.getChatProjectId(chatId);
	if (!projectId) {
		throw new HandlerError('NOT_FOUND', 'Chat not found.');
	}
	const role = await projectQueries.getUserRoleInProject(projectId, userId);
	if (role !== 'admin' && role !== 'context_admin') {
		throw new HandlerError('FORBIDDEN', 'Only admins or context admins can replay chats.');
	}
	return { chatId, projectId, sharedChatId: null };
}
