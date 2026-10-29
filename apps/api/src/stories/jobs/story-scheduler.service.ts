import { Injectable } from '@nestjs/common';

import { JobsService } from '../../jobs/jobs.service.js';
import {
	type EnqueueOnceInput,
	STORY_DELIVERY_JOB_NAME,
	STORY_REFRESH_JOB_NAME,
	storyDeliveryScheduleKey,
	storyRefreshScheduleKey,
	type StoryScheduler,
} from '../services/story-schedule.js';

/** pg-boss keys can't contain ':' (upstream's unique keys use it). */
const toBossKey = (key: string): string => key.replaceAll(':', '-');

/** A day: `enqueueOnce` keys are unique per job (activity or job id), so the slot only has to outlast the retry. */
const ENQUEUE_ONCE_SLOT_SECONDS = 24 * 60 * 60;

/**
 * The story scheduler on pg-boss (upstream `scheduler.service` `upsertRecurringJob` / `deleteJob` / `enqueueOnce`):
 * one schedule per story on the `story.refresh` and `story.deliver` queues, keyed `story-refresh-<id>` /
 * `story-delivery-<id>`, payload `{ storyId }`. pg-boss replaces a schedule's cron in place, which is upstream's
 * `resetRunAtOnConflict`. Crons run in UTC, like quarry's other schedules.
 */
@Injectable()
export class PgBossStoryScheduler implements StoryScheduler {
	constructor(private readonly jobs: JobsService) {}

	syncStoryRefreshJob(storyId: string, cron: string | null): Promise<void> {
		return this.sync(STORY_REFRESH_JOB_NAME, storyRefreshScheduleKey(storyId), storyId, cron);
	}

	syncStoryDeliveryJob(storyId: string, cron: string | null): Promise<void> {
		return this.sync(STORY_DELIVERY_JOB_NAME, storyDeliveryScheduleKey(storyId), storyId, cron);
	}

	async enqueueOnce({ name, payload, uniqueKey, startAfterSeconds }: EnqueueOnceInput): Promise<void> {
		await this.jobs.send(name, payload, {
			singletonKey: toBossKey(uniqueKey),
			singletonSeconds: ENQUEUE_ONCE_SLOT_SECONDS,
			...(startAfterSeconds ? { startAfter: startAfterSeconds } : {}),
		});
	}

	private async sync(name: string, key: string, storyId: string, cron: string | null): Promise<void> {
		const boss = this.jobs.getBoss();
		if (cron === null) {
			await boss.unschedule(name, key);
			return;
		}
		await boss.schedule(name, cron, { storyId }, { tz: 'UTC', key });
	}
}
