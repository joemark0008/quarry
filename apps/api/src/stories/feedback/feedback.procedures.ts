import type { FeedbackNotificationPayload } from '@quarry/shared/types';
import { z } from 'zod/v4';

import { logger } from '../../agent/utils/logger.js';
import { HandlerError } from '../../common/errors/handler-error.js';
import type { Story as DBStory, StoryFeedback } from '../../generated/prisma/client.js';
import { feedbackQueries } from '../jobs/story-job-queries.js';
import { notifyUsers } from '../jobs/story-notifications.js';
import { projectProtectedProcedure } from '../procedure.js';
import { storyQueries } from '../story-queries.js';
import { logAnalyticsEvent } from '../utils/analytics-event.js';
import { storyPath } from '../utils/story-links.js';

const feedbackVoteSchema = z.enum(['up', 'down']);

/**
 * Port of the story half of upstream `trpc/feedback.routes.ts` (`getStoryFeedback`, `submitStoryFeedback`); message
 * feedback (`submit`, `getRecent`) is the chats module's `submitMessageFeedback` / `recentFeedbacks`. PostHog is not
 * ported; the owner's notification goes through the Phase 5 stand-in (`notifyUsers`: in-app row only).
 */
export const feedbackRoutes = {
	getStoryFeedback: projectProtectedProcedure
		.input(z.object({ storyId: z.string() }))
		.query(async ({ input, ctx }): Promise<StoryFeedback | null> => {
			await getAccessibleStory(input.storyId, ctx.user.id);
			return (await feedbackQueries.getUserStoryFeedback(input.storyId, ctx.user.id)) as StoryFeedback | null;
		}),

	submitStoryFeedback: projectProtectedProcedure
		.input(
			z.object({
				storyId: z.string(),
				vote: feedbackVoteSchema,
				explanation: z.string().max(2000).optional(),
			}),
		)
		.mutation(async ({ input, ctx }): Promise<StoryFeedback> => {
			const story = await getAccessibleStory(input.storyId, ctx.user.id);
			const projectId = (await storyQueries.getStoryProjectId(story.id)) ?? ctx.project.id;
			const explanation = input.explanation?.trim() || null;

			const feedback = (await feedbackQueries.upsertStoryFeedback({
				storyId: story.id,
				userId: ctx.user.id,
				vote: input.vote,
				explanation,
			})) as StoryFeedback;

			void logAnalyticsEvent({
				projectId,
				type: 'feedback',
				assetType: 'story',
				actorUserId: ctx.user.id,
				storyId: story.id,
				metadata: { type: 'feedback', vote: input.vote, explanation: explanation ?? undefined },
			});

			void notifyStoryOwnerOfFeedback(projectId, ctx.user, story, input.vote, explanation).catch((error) =>
				logger.error(`Failed to notify story owner of feedback: ${String(error)}`, {
					source: 'system',
				}),
			);

			return feedback;
		}),
};

async function getAccessibleStory(storyId: string, userId: string): Promise<DBStory> {
	const story = await storyQueries.getStoryById(storyId);
	if (!story || !(await storyQueries.canUserAccessStory(story.id, userId))) {
		throw new HandlerError('NOT_FOUND', 'Story not found.');
	}
	return story;
}

async function notifyStoryOwnerOfFeedback(
	projectId: string,
	submitter: { id: string; name: string },
	story: DBStory,
	vote: 'up' | 'down',
	explanation: string | null,
): Promise<void> {
	const ownerId = await storyQueries.getStoryOwnerId(story.id);
	if (!ownerId || ownerId === submitter.id) {
		return;
	}

	const sentiment = vote === 'up' ? 'positive' : 'negative';
	const payload: FeedbackNotificationPayload = {
		kind: 'feedback',
		vote,
		submitterName: submitter.name,
		chatTitle: null,
		storyTitle: story.title,
		explanation,
	};

	await notifyUsers([ownerId], {
		category: 'feedback',
		title: `${sentiment === 'positive' ? 'Positive' : 'Negative'} feedback on your story`,
		body: explanation
			? `${submitter.name} left ${sentiment} feedback on “${story.title}”: “${explanation}”`
			: `${submitter.name} left ${sentiment} feedback on “${story.title}”.`,
		linkUrl: storyPath(story.id),
		ctaLabel: 'Open story',
		projectId,
		payload,
	});
}
