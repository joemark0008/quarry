import { z } from 'zod/v4';

import type { ForkMetadata } from '../../agent/types/chat.js';
import { HandlerError } from '../../common/errors/handler-error.js';
import {
	assertUserGroupFeatureForTrpc,
	cloudBillingMiddleware,
	projectProtectedProcedure,
	protectedProcedure,
} from '../procedure.js';
import { attachChatToStandaloneStory } from '../services/standalone-story.js';
import { forkStoryIntoChat } from '../services/story-fork.js';
import { chatQueries, projectQueries, storyQueries, storyReferenceQueries } from '../story-queries.js';
import { logAnalyticsEvent } from '../utils/analytics-event.js';

/**
 * The story procedures of upstream `trpc/chat-fork.routes.ts` (`trpc.chatFork.askStory`, `forkStory`,
 * `openStandalone`), which Phase 2c left for stories; the chat procedures are in the chats module. The fork of a
 * shared story (`chatFork.fork` with a `story` source) comes with story sharing (stage 3).
 */

const storyIdInputSchema = z.object({ storyId: z.string() });

const MAX_ASK_SELECTION_LENGTH = 4_000;

/** A long selection is cut rather than refused, so the question is still asked. */
const selectionTextSchema = z
	.string()
	.trim()
	.transform((text) => text.slice(0, MAX_ASK_SELECTION_LENGTH));

/** The story is forked in its own project, whatever project is active, like the fork of a share. */
const resolvedStoryForkProcedure = protectedProcedure.input(storyIdInputSchema).use(async ({ ctx, input, next }) => {
	const projectId = await storyQueries.getStoryProjectId(input.storyId);
	const story = projectId
		? await storyReferenceQueries.getReferenceableStory(ctx.user.id, projectId, input.storyId)
		: null;
	if (!projectId || !story) {
		throw new HandlerError('NOT_FOUND', 'Story not found.');
	}
	const userRole = await projectQueries.getUserRoleInProject(projectId, ctx.user.id);
	if (userRole !== 'admin' && userRole !== 'user' && userRole !== 'context_admin') {
		throw new HandlerError('FORBIDDEN', 'Viewers cannot perform this action');
	}
	return next({ ctx: { story, projectId } });
});

const storyForkProcedure = resolvedStoryForkProcedure.use(
	cloudBillingMiddleware<{ projectId: string }>(({ projectId }) => ({ projectId })),
);

const resolvedStandaloneStoryProcedure = projectProtectedProcedure
	.input(storyIdInputSchema)
	.use(async ({ ctx, input, next }) => {
		const story = await storyQueries.getStoryByIdForUser(input.storyId, ctx.user.id);
		if (!story || story.projectId !== ctx.project.id) {
			throw new HandlerError('NOT_FOUND', 'Story not found.');
		}
		return next({ ctx: { story } });
	});

export const chatForkStoryRoutes = {
	askStory: storyForkProcedure
		.input(z.object({ selectionText: selectionTextSchema.optional() }))
		.mutation(async ({ ctx, input }): Promise<{ chatId: string; hasAttachedStoryChat: boolean }> => {
			const { story, projectId, user } = ctx;
			const hasAttachedStoryChat = !story.chatId && story.ownerId === user.id;
			if (hasAttachedStoryChat) {
				await attachChatToStandaloneStory(
					{ id: story.storyId, slug: story.slug, title: story.title, code: story.code },
					{ userId: user.id, projectId },
				);
			}
			const forkMetadata: ForkMetadata = {
				type: 'story_question',
				id: story.storyId,
				title: story.title,
				authorName: story.authorName ?? '',
				...(input.selectionText && { selectionText: input.selectionText }),
			};
			const chat = await chatQueries.createForkedChat(
				{ projectId, userId: user.id, title: story.title, forkMetadata },
				[],
			);
			return { chatId: chat.id, hasAttachedStoryChat };
		}),

	forkStory: storyForkProcedure.mutation(async ({ ctx }): Promise<{ chatId: string }> => {
		const { story, projectId, user } = ctx;
		if (story.ownerId !== user.id) {
			await assertUserGroupFeatureForTrpc(projectId, user.id, 'storyCreation');
		}
		const { chatId } = await forkStoryIntoChat(story, { userId: user.id, projectId });
		logStoryFork({ ...story, projectId }, user.id, chatId, 'full');
		return { chatId };
	}),

	openStandalone: resolvedStandaloneStoryProcedure.mutation(async ({ ctx }): Promise<{ chatId: string }> => {
		const { story } = ctx;
		if (story.chatId) {
			return { chatId: story.chatId };
		}
		const { chatId } = await attachChatToStandaloneStory(story, { userId: ctx.user.id, projectId: ctx.project.id });

		void logAnalyticsEvent({
			projectId: ctx.project.id,
			type: 'fork',
			assetType: 'story',
			actorUserId: ctx.user.id,
			storyId: story.id,
			metadata: { type: 'fork', resultId: chatId, scope: 'full', versionNumber: story.version },
		});

		return { chatId };
	}),
};

function logStoryFork(
	story: { projectId: string; storyId: string; chatId: string | null; sharedStoryId?: string; version: number },
	userId: string,
	resultChatId: string,
	scope: 'full' | 'selection',
): void {
	void logAnalyticsEvent({
		projectId: story.projectId,
		type: 'fork',
		assetType: 'story',
		actorUserId: userId,
		storyId: story.storyId,
		chatId: story.chatId,
		sharedStoryId: story.sharedStoryId,
		metadata: { type: 'fork', resultId: resultChatId, scope, versionNumber: story.version },
	});
}
