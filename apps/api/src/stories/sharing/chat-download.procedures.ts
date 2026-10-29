import { DOWNLOAD_FORMATS } from '@quarry/shared/types';
import { z } from 'zod/v4';

import { HandlerError } from '../../common/errors/handler-error.js';
import { protectedProcedure } from '../procedure.js';
import { chatQueries, projectQueries } from '../story-queries.js';
import { buildChatDownloadResponse } from '../utils/chat-download.js';

/** `download` of upstream `trpc/chat.routes.ts` (`trpc.chat.download`): the rest of that router is the chats module's. */
export const chatDownloadRoutes = {
	download: protectedProcedure
		.input(
			z.object({
				chatId: z.string(),
				format: z.enum(DOWNLOAD_FORMATS).default('pdf'),
				includeErrors: z.boolean().default(false),
				includeSql: z.boolean().default(true),
				includePython: z.boolean().default(true),
			}),
		)
		.query(async ({ input, ctx }) => {
			const [chat, ownerId] = await chatQueries.getChat(input.chatId);
			// Upstream's `chatOwnerProcedure`: only the owner downloads a chat.
			if (!chat || ownerId !== ctx.user.id) {
				throw new HandlerError('NOT_FOUND', `Chat with id ${input.chatId} not found.`);
			}

			const displaySettings = chat.projectId ? await projectQueries.getDisplaySettings(chat.projectId) : null;

			return buildChatDownloadResponse({
				chatId: chat.id,
				title: chat.title,
				createdAt: chat.createdAt,
				updatedAt: chat.updatedAt,
				messages: chat.messages,
				format: input.format,
				includeErrors: input.includeErrors,
				includeSql: input.includeSql,
				includePython: input.includePython,
				dateFormat: displaySettings?.dateFormat,
			});
		}),
};
