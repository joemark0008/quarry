import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Port of upstream `tests/story-refresh-handler.test.ts`. */
const mocks = vi.hoisted(() => ({
	getStoryById: vi.fn(),
	getStoryProjectId: vi.fn(),
	getStoryOwnerId: vi.fn(),
	startStoryRefreshActivity: vi.fn(),
	completeActivity: vi.fn(),
	failActivity: vi.fn(),
	refreshStoryData: vi.fn(),
	deliverStoryOnRefresh: vi.fn(async () => undefined),
	enqueueOnce: vi.fn(),
}));

vi.mock('../story-queries.js', () => {
	const storyQueries = {
		getStoryById: mocks.getStoryById,
		getStoryProjectId: mocks.getStoryProjectId,
		getStoryOwnerId: mocks.getStoryOwnerId,
		startStoryRefreshActivity: mocks.startStoryRefreshActivity,
		completeActivity: mocks.completeActivity,
		failActivity: mocks.failActivity,
	};
	return { storyQueries, activityQueries: storyQueries };
});
vi.mock('../services/live-story.js', () => ({
	refreshStoryData: mocks.refreshStoryData,
}));
vi.mock('./story-delivery.handler.js', () => ({
	deliverStoryOnRefresh: mocks.deliverStoryOnRefresh,
	STORY_DELIVERY_JOB_NAME: 'story.deliver',
}));
vi.mock('../services/story-schedule.js', () => ({
	enqueueOnce: mocks.enqueueOnce,
	STORY_REFRESH_JOB_NAME: 'story.refresh',
}));
vi.mock('../utils/analytics-event.js', () => ({
	logAnalyticsEvent: vi.fn(),
}));
vi.mock('../../agent/utils/logger.js', () => ({
	logger: { error: vi.fn() },
}));

import { NotificationChannelDeliveryError } from './story-notifications.js';
import { runScheduledStoryRefresh, storyRefreshHandler } from './story-refresh.handler.js';

describe('scheduled Story refresh principal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getStoryById.mockResolvedValue({
			id: 'story-1',
			chatId: 'chat-1',
			slug: 'orders',
			title: 'Orders',
			isLive: true,
			archivedAt: null,
			projectId: 'project-1',
			userId: 'owner-1',
			cacheSchedule: '0 * * * *',
		});
		mocks.startStoryRefreshActivity.mockResolvedValue({ id: 'activity-1' });
		mocks.refreshStoryData.mockResolvedValue({ queryData: {} });
	});

	it('executes warehouse queries as the Story owner', async () => {
		await runScheduledStoryRefresh('story-1');

		expect(mocks.refreshStoryData).toHaveBeenCalledWith('chat-1', 'orders', {
			billingAccessVerifiedProjectId: 'project-1',
		});
	});

	it('fails the scheduled refresh when the owner has lost project access', async () => {
		mocks.refreshStoryData.mockRejectedValue(new Error('You do not have access to this project.'));

		await expect(runScheduledStoryRefresh('story-1')).rejects.toThrow('access to this project');
		expect(mocks.failActivity).toHaveBeenCalledWith('activity-1', 'You do not have access to this project.');
		expect(mocks.completeActivity).not.toHaveBeenCalled();
	});

	// quarry additions: the rest of the handler's paths.
	it('records the refresh as a completed scheduled activity and delivers on refresh', async () => {
		mocks.refreshStoryData.mockResolvedValue({ queryData: { q1: { data: [], columns: [] } } });

		await storyRefreshHandler({ storyId: 'story-1' });

		expect(mocks.startStoryRefreshActivity).toHaveBeenCalledWith({
			projectId: 'project-1',
			userId: 'owner-1',
			storyId: 'story-1',
			chatId: 'chat-1',
			trigger: 'schedule',
		});
		expect(mocks.completeActivity).toHaveBeenCalledWith('activity-1', { queriesRefreshed: 1 });
		expect(mocks.deliverStoryOnRefresh).toHaveBeenCalledWith('story-1', '0 * * * *', {
			q1: { data: [], columns: [] },
		});
	});

	it('skips stories that are no longer live or are archived', async () => {
		mocks.getStoryById.mockResolvedValue({ id: 'story-1', chatId: 'chat-1', isLive: false, archivedAt: null });

		await runScheduledStoryRefresh('story-1');

		expect(mocks.startStoryRefreshActivity).not.toHaveBeenCalled();
		expect(mocks.refreshStoryData).not.toHaveBeenCalled();
	});

	it('requires a storyId and an existing story', async () => {
		await expect(storyRefreshHandler({})).rejects.toThrow('storyId is required.');
		mocks.getStoryById.mockResolvedValue(null);
		await expect(storyRefreshHandler({ storyId: 'gone' })).rejects.toThrow('Story not found: gone');
	});

	it('queues a delivery retry, keeping delivered channels, when delivery after the refresh fails', async () => {
		const succeeded = [{ userId: 'user-2', channel: 'in_app' as const }];
		mocks.deliverStoryOnRefresh.mockRejectedValueOnce(
			new NotificationChannelDeliveryError(succeeded, [{ userId: 'user-2', channel: 'email' }]),
		);

		await runScheduledStoryRefresh('story-1');

		expect(mocks.completeActivity).toHaveBeenCalled();
		expect(mocks.enqueueOnce).toHaveBeenCalledWith({
			name: 'story.deliver',
			payload: { storyId: 'story-1', skipDeliveries: succeeded },
			uniqueKey: 'story-delivery-retry-activity-1',
		});
	});
});
