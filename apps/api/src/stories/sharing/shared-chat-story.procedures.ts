import { DOWNLOAD_FORMATS } from '@quarry/shared/types';
import { z } from 'zod/v4';

import { HandlerError } from '../../common/errors/handler-error.js';
import { getActiveThemeForProject } from '../services/custom-story.js';
import { getStoryQueryData } from '../services/live-story.js';
import { chatQueries, projectQueries, sharedChatQueries, storyQueries } from '../story-queries.js';
import { logAnalyticsEvent } from '../utils/analytics-event.js';
import { buildDownloadResponse } from '../utils/story-download.js';
import { resourceProjectProcedure } from './sharing-procedure.js';

/**
 * The story procedure of upstream `trpc/shared-chat.routes.ts` (`trpc.sharedChat.downloadStory`); the rest of that
 * router is the chats module's.
 */
const shareAccessProcedure = resourceProjectProcedure(
	'shareId',
	(shareId: string) => sharedChatQueries.getSharedChatInfo(shareId),
	'Shared chat',
	async (share, userId) => {
		if (share.visibility !== 'specific') {
			return true;
		}
		const isOwner = (await chatQueries.getChatOwnerId(share.chatId)) === userId;
		return isOwner || sharedChatQueries.canUserAccessSharedChat(share.id, userId);
	},
);

export const sharedChatStoryRoutes = {
	downloadStory: shareAccessProcedure
		.input(
			z.object({
				shareId: z.string(),
				storySlug: z.string(),
				format: z.enum(DOWNLOAD_FORMATS),
				versionNumber: z.number().int().positive().optional(),
			}),
		)
		.query(async ({ input, ctx }) => {
			const share = ctx.resource;

			const version = input.versionNumber
				? await storyQueries.getVersionByNumber(share.chatId, input.storySlug, input.versionNumber)
				: await storyQueries.getLatestVersionByChatAndSlug(share.chatId, input.storySlug);
			if (!version) {
				throw new HandlerError('NOT_FOUND', 'Story version not found.');
			}

			const { queryData, code } = await getStoryQueryData(
				share.chatId,
				input.storySlug,
				version.code,
				version.isLive,
				version.cacheSchedule,
			);

			logAnalyticsEvent({
				projectId: share.projectId,
				type: 'download',
				assetType: 'story',
				actorUserId: ctx.user.id,
				storyId: version.storyId,
				chatId: share.chatId,
				sharedChatId: share.id,
				metadata: {
					type: 'download',
					format: input.format,
					versionNumber: version.version,
					title: version.title,
				},
			});

			const [displaySettings, theme] = await Promise.all([
				projectQueries.getDisplaySettings(share.projectId),
				getActiveThemeForProject(share.projectId),
			]);

			return buildDownloadResponse(
				input.format,
				version.title,
				code,
				queryData,
				displaySettings.dateFormat,
				theme,
			);
		}),
};
