import { NO_CACHE_SCHEDULE } from '@quarry/shared';
import type { RecipientMode } from '@quarry/shared/types';
import { CronExpressionParser } from 'cron-parser';

import { HandlerError } from '../../common/errors/handler-error.js';
import { storyDeliveryQueries, storyQueries } from '../story-queries.js';

/**
 * The scheduling bits the story routes and story jobs call (upstream `scheduler.service` `nextCronTick` /
 * `enqueueOnce`, the refresh and delivery job sync in `story.routes.ts` / `story-delivery.service.ts`). Upstream kept
 * recurring jobs in its `scheduled_job` table and linked them from `story.scheduled_job_id` /
 * `story_delivery.scheduled_job_id`; quarry runs jobs on pg-boss, whose schedules are keyed by name (keys cannot
 * contain ':'), so those columns are gone. `StoryJobsModule` binds the pg-boss scheduler (`PgBossStoryScheduler`)
 * with `bindStoryScheduler`; unbound (unit specs), settings are saved and nothing is scheduled.
 */
export const STORY_REFRESH_JOB_NAME = 'story.refresh';
export const STORY_DELIVERY_JOB_NAME = 'story.deliver';

/** pg-boss schedule keys, one per story (upstream `storyRefreshJobUniqueKey` used `story-refresh:<id>`). */
export const storyRefreshScheduleKey = (storyId: string): string => `story-refresh-${storyId}`;
export const storyDeliveryScheduleKey = (storyId: string): string => `story-delivery-${storyId}`;

export interface StoryScheduler {
	/** Live stories with a real cron get a recurring refresh; manual, no-cache or disabled stories lose theirs. */
	syncStoryRefreshJob(storyId: string, cron: string | null): Promise<void>;
	/** Delivery runs on its own schedule unless it coincides with the refresh (which then delivers). */
	syncStoryDeliveryJob(storyId: string, cron: string | null): Promise<void>;
	/** Upstream `enqueueOnce`: sends a one-off job unless one with the same unique key is already queued. */
	enqueueOnce(job: EnqueueOnceInput): Promise<void>;
}

export interface EnqueueOnceInput {
	name: string;
	payload: object;
	uniqueKey: string;
	/** Delay before the job may run. */
	startAfterSeconds?: number;
}

const noScheduler: StoryScheduler = {
	syncStoryRefreshJob: async () => undefined,
	syncStoryDeliveryJob: async () => undefined,
	enqueueOnce: async () => undefined,
};

let scheduler: StoryScheduler = noScheduler;

export function bindStoryScheduler(bound: StoryScheduler | null): void {
	scheduler = bound ?? noScheduler;
}

/** Upstream `scheduler.service` `enqueueOnce`. */
export function enqueueOnce(job: EnqueueOnceInput): Promise<void> {
	return scheduler.enqueueOnce(job);
}

/** Upstream `scheduler.service` `nextCronTick`. */
export function nextCronTick(cron: string, after: Date): Date | null {
	try {
		const interval = CronExpressionParser.parse(cron, { currentDate: after });
		return interval.next().toDate();
	} catch {
		return null;
	}
}

/**
 * Validates the refresh schedule before touching the database so an invalid
 * cron cannot be persisted on the story row.
 */
export function assertValidRefreshSchedule(isLive: boolean, cacheSchedule: string | null): void {
	if (!isLive || cacheSchedule === null || cacheSchedule === NO_CACHE_SCHEDULE) {
		return;
	}
	if (!nextCronTick(cacheSchedule, new Date())) {
		throw new HandlerError('BAD_REQUEST', `Invalid cron expression for refresh schedule: ${cacheSchedule}`);
	}
}

/** Idempotently aligns the story's refresh schedule with its current cache settings. */
export async function syncStoryRefreshJob(
	storyId: string,
	isLive: boolean,
	cacheSchedule: string | null,
): Promise<void> {
	const shouldSchedule = isLive && cacheSchedule !== null && cacheSchedule !== NO_CACHE_SCHEDULE;
	if (shouldSchedule && !nextCronTick(cacheSchedule, new Date())) {
		throw new HandlerError('BAD_REQUEST', `Invalid cron expression for refresh schedule: ${cacheSchedule}`);
	}
	await scheduler.syncStoryRefreshJob(storyId, shouldSchedule ? cacheSchedule : null);
}

/** Upstream `story-delivery.service` `assertValidDeliverySchedule`. */
export function assertValidDeliverySchedule(
	enabled: boolean,
	cron: string | null,
	recipientMode: RecipientMode,
	recipientUserIds: string[],
	recipientGroupIds: string[],
): void {
	if (!enabled) {
		return;
	}
	if (recipientMode === 'specific' && recipientUserIds.length === 0 && recipientGroupIds.length === 0) {
		throw new HandlerError('BAD_REQUEST', 'Add at least one recipient to schedule delivery.');
	}
	if (cron !== null && !nextCronTick(cron, new Date())) {
		throw new HandlerError('BAD_REQUEST', `Invalid cron expression for delivery schedule: ${cron}`);
	}
}

/** Upstream `story-delivery.service` `syncStoryDeliveryJob`. */
export async function syncStoryDeliveryJob(storyId: string, enabled: boolean, cron: string | null): Promise<void> {
	const story = await storyQueries.getStoryById(storyId);
	const coincidesWithRefresh = cron !== null && Boolean(story?.isLive) && story?.cacheSchedule === cron;
	const shouldSchedule = enabled && cron !== null && cron !== NO_CACHE_SCHEDULE && !coincidesWithRefresh;
	if (shouldSchedule && !nextCronTick(cron, new Date())) {
		throw new HandlerError('BAD_REQUEST', `Invalid cron expression for delivery schedule: ${cron}`);
	}
	await scheduler.syncStoryDeliveryJob(storyId, shouldSchedule ? cron : null);
}

/** Upstream `story-delivery.service` `disableStoryDelivery`. */
export async function disableStoryDelivery(storyId: string): Promise<void> {
	await scheduler.syncStoryDeliveryJob(storyId, null);
	await storyDeliveryQueries.setEnabled(storyId, false);
}

/** Upstream `unscheduleStoryRefreshJob` (story routes): no refresh, no delivery. */
export async function unscheduleStoryRefreshJob(storyId: string): Promise<void> {
	await scheduler.syncStoryRefreshJob(storyId, null);
	await disableStoryDelivery(storyId);
}

/**
 * Upstream `story-delivery.service` `teardownStoryDelivery` (called when a story's share is removed): no schedule,
 * delivery disabled and its recipients reset. Removing the story's notification unsubscribes comes with the
 * notifications module (Phase 5).
 */
export async function teardownStoryDelivery(storyId: string): Promise<void> {
	await scheduler.syncStoryDeliveryJob(storyId, null);
	await storyDeliveryQueries.disableAndResetRecipients(storyId);
}
