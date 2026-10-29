import { Injectable } from '@nestjs/common';

import { withKeyedLock } from '../../agent/utils/keyed-lock.js';
import { logger } from '../../agent/utils/logger.js';
import { Job } from '../../jobs/job.decorator.js';
import { refreshStoryData } from '../services/live-story.js';
import { enqueueOnce, STORY_REFRESH_JOB_NAME } from '../services/story-schedule.js';
import { activityQueries, storyQueries } from '../story-queries.js';
import { logAnalyticsEvent } from '../utils/analytics-event.js';
import { deliverStoryOnRefresh, STORY_DELIVERY_JOB_NAME } from './story-delivery.handler.js';
import { NotificationChannelDeliveryError } from './story-notifications.js';

export { STORY_REFRESH_JOB_NAME };

type StoryRefreshJobPayload = {
	storyId?: string;
};

/**
 * Port of upstream `handlers/story-refresh.handler.ts` (`story.refresh`): the recurring refresh of a live story,
 * scheduled per story by `PgBossStoryScheduler` (key `story-refresh-<id>`). Refresh notifications to the owner are
 * Phase 5 (`notifyStoryRefreshed` / `notifyStoryRefreshFailed` are no-ops, as in the manual `story.refreshData`).
 */
export async function storyRefreshHandler(payload: StoryRefreshJobPayload): Promise<void> {
	const storyId = payload.storyId;
	if (!storyId) {
		throw new Error('storyId is required.');
	}
	await runScheduledStoryRefresh(storyId);
}

export async function resolveStoryRefreshProjectId(payload: StoryRefreshJobPayload): Promise<string> {
	if (!payload.storyId) {
		throw new Error('storyId is required.');
	}
	const story = await storyQueries.getStoryById(payload.storyId);
	if (!story) {
		throw new Error(`Story not found: ${payload.storyId}`);
	}
	const projectId = story.projectId ?? (await storyQueries.getStoryProjectId(story.id));
	if (!projectId) {
		throw new Error(`Story ${payload.storyId} is missing a project; cannot schedule refresh.`);
	}
	return projectId;
}

/**
 * Runs a scheduled refresh for a live story and records the outcome as an
 * `activity` row so it surfaces in the activity feed.
 */
export async function runScheduledStoryRefresh(storyId: string): Promise<void> {
	await withKeyedLock(`story:${storyId}`, async () => {
		await runLockedScheduledStoryRefresh(storyId);
	});
}

async function runLockedScheduledStoryRefresh(storyId: string): Promise<void> {
	const story = await storyQueries.getStoryById(storyId);
	if (!story) {
		throw new Error(`Story not found: ${storyId}`);
	}
	if (!story.chatId) {
		throw new Error(`Story has no chat to refresh: ${storyId}`);
	}
	if (!story.isLive || story.archivedAt) {
		return;
	}

	const projectId = story.projectId ?? (await storyQueries.getStoryProjectId(story.id));
	const userId = story.userId ?? (await storyQueries.getStoryOwnerId(story.id));
	if (!projectId || !userId) {
		throw new Error(`Story ${storyId} is missing project or user ownership; cannot schedule refresh.`);
	}
	const activity = await activityQueries.startStoryRefreshActivity({
		projectId,
		userId,
		storyId,
		chatId: story.chatId,
		trigger: 'schedule',
	});

	try {
		const { queryData } = await refreshStoryData(story.chatId, story.slug, {
			billingAccessVerifiedProjectId: projectId,
		});
		const queriesRefreshed = Object.keys(queryData).length;
		await activityQueries.completeActivity(activity.id, { queriesRefreshed });
		await notifyStoryRefreshed({
			projectId,
			ownerId: userId,
			storyId,
			storyTitle: story.title,
			queriesRefreshed,
			trigger: 'schedule',
		}).catch((notifyError) => {
			logger.error(`Failed to notify story refresh: ${String(notifyError)}`, {
				source: 'system',
				projectId,
				context: { storyId },
			});
		});
		logAnalyticsEvent({
			projectId,
			type: 'refresh',
			assetType: 'story',
			actorUserId: userId,
			storyId,
			chatId: story.chatId,
			metadata: { type: 'refresh', trigger: 'scheduled', queriesRefreshed: Object.keys(queryData).length },
		});
		await deliverStoryOnRefresh(storyId, story.cacheSchedule, queryData).catch(async (error) => {
			logger.error(`Story delivery after scheduled refresh failed; enqueuing retry: ${String(error)}`, {
				source: 'system',
				projectId,
				context: { storyId },
			});
			await enqueueOnce({
				name: STORY_DELIVERY_JOB_NAME,
				payload: {
					storyId,
					skipDeliveries: error instanceof NotificationChannelDeliveryError ? error.succeeded : [],
				},
				uniqueKey: `story-delivery-retry-${activity.id}`,
			});
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		logger.error(`Story refresh failed: ${message}`, {
			source: 'system',
			projectId,
			context: { storyId, activityId: activity.id },
		});
		await activityQueries.failActivity(activity.id, message);
		await notifyStoryRefreshFailed({
			projectId,
			ownerId: userId,
			storyId,
			storyTitle: story.title,
			errorMessage: message,
			trigger: 'schedule',
		}).catch((notifyError) => {
			logger.error(`Failed to notify owner of refresh failure: ${String(notifyError)}`, {
				source: 'system',
				projectId,
				context: { storyId },
			});
		});
		throw err;
	}
}

/** Owner notifications of refreshes are Phase 5 (upstream `notification.service`). */
async function notifyStoryRefreshed(_input: Record<string, unknown>): Promise<void> {}
async function notifyStoryRefreshFailed(_input: Record<string, unknown>): Promise<void> {}

/** The pg-boss worker of `story.refresh` (upstream `registerJob(STORY_REFRESH_JOB_NAME, storyRefreshHandler)`). */
@Injectable()
export class StoryRefreshJob {
	@Job(STORY_REFRESH_JOB_NAME)
	handle(payload: StoryRefreshJobPayload): Promise<void> {
		return storyRefreshHandler(payload ?? {});
	}
}
