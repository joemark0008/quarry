import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { JobsService } from '../../jobs/jobs.service.js';
import { STORY_DELIVERY_JOB_NAME, STORY_REFRESH_JOB_NAME } from '../services/story-schedule.js';
import { PgBossStoryScheduler } from './story-scheduler.service.js';

const boss = { schedule: vi.fn(), unschedule: vi.fn() };
const send = vi.fn();
const scheduler = new PgBossStoryScheduler({ getBoss: () => boss, send } as unknown as JobsService);

describe('PgBossStoryScheduler', () => {
	beforeEach(() => vi.clearAllMocks());

	it('keeps one refresh and one delivery schedule per story', async () => {
		await scheduler.syncStoryRefreshJob('story-1', '0 * * * *');
		await scheduler.syncStoryDeliveryJob('story-1', '0 9 * * 1');

		expect(boss.schedule).toHaveBeenNthCalledWith(
			1,
			STORY_REFRESH_JOB_NAME,
			'0 * * * *',
			{ storyId: 'story-1' },
			{ tz: 'UTC', key: 'story-refresh-story-1' },
		);
		expect(boss.schedule).toHaveBeenNthCalledWith(
			2,
			STORY_DELIVERY_JOB_NAME,
			'0 9 * * 1',
			{ storyId: 'story-1' },
			{ tz: 'UTC', key: 'story-delivery-story-1' },
		);
	});

	it('removes the schedule when there is no cron', async () => {
		await scheduler.syncStoryRefreshJob('story-1', null);
		await scheduler.syncStoryDeliveryJob('story-1', null);

		expect(boss.unschedule).toHaveBeenCalledWith(STORY_REFRESH_JOB_NAME, 'story-refresh-story-1');
		expect(boss.unschedule).toHaveBeenCalledWith(STORY_DELIVERY_JOB_NAME, 'story-delivery-story-1');
		expect(boss.schedule).not.toHaveBeenCalled();
	});

	it('enqueues one-off jobs once per key, without the ":" pg-boss refuses', async () => {
		await scheduler.enqueueOnce({
			name: STORY_DELIVERY_JOB_NAME,
			payload: { storyId: 'story-1' },
			uniqueKey: 'story-delivery-retry:activity-1',
			startAfterSeconds: 30,
		});

		expect(send).toHaveBeenCalledWith(
			STORY_DELIVERY_JOB_NAME,
			{ storyId: 'story-1' },
			{ singletonKey: 'story-delivery-retry-activity-1', singletonSeconds: 86_400, startAfter: 30 },
		);
	});
});
