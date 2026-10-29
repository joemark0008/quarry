import { beforeEach, expect, it, vi } from 'vitest';

/**
 * Port of upstream `tests/story-delivery.handler.test.ts`. Upstream rewrote the failed job's payload
 * (`scheduledJobQueries.updateJobPayload`) before its retry; pg-boss payloads are immutable, so the handler queues
 * a follow-up `story.deliver` job with the merged skips instead (asserted in the third case).
 */
const mocks = vi.hoisted(() => ({
	getStoryById: vi.fn(async (): Promise<Record<string, unknown> | null> => ({
		id: 'story-id',
		archivedAt: null,
		chatId: 'chat-id',
		projectId: 'project-id',
		slug: 'story-slug',
		userId: 'user-id',
		format: 'classic',
	})),
	notifyUsers: vi.fn(),
	refreshStoryData: vi.fn(),
	enqueueOnce: vi.fn(),
	addSharedStoryAllowedUsers: vi.fn(),
	createSharedStory: vi.fn(),
	getStoryShareAccess: vi.fn(async (): Promise<Record<string, unknown> | null> => ({
		allowedUserIds: [],
		shareId: 'share-id',
		visibility: 'organization',
	})),
	getByStoryId: vi.fn(async (): Promise<Record<string, unknown> | null> => ({ channels: ['email'], enabled: true })),
}));

vi.mock('../services/story-schedule.js', () => ({
	enqueueOnce: mocks.enqueueOnce,
	STORY_DELIVERY_JOB_NAME: 'story.deliver',
}));
vi.mock('../story-queries.js', () => ({
	sharedStoryQueries: {
		getStoryShareAccess: mocks.getStoryShareAccess,
		addSharedStoryAllowedUsers: mocks.addSharedStoryAllowedUsers,
		createSharedStory: mocks.createSharedStory,
	},
	storyQueries: {
		getStoryById: mocks.getStoryById,
		getLatestVersionByChatAndSlug: vi.fn(async () => ({
			code: 'export default {}',
			title: 'Story title',
		})),
	},
	storyDeliveryQueries: { getByStoryId: mocks.getByStoryId },
}));
vi.mock('./story-job-queries.js', () => ({
	userQueries: { getUserName: vi.fn(async () => 'Story owner') },
}));
vi.mock('../services/live-story.js', () => ({ refreshStoryData: mocks.refreshStoryData }));
vi.mock('./story-notifications.js', () => ({
	NotificationChannelDeliveryError: class extends Error {
		constructor(
			readonly succeeded: Array<{ userId: string; channel: string }>,
			readonly failed: Array<{ userId: string; channel: string }>,
		) {
			super('Notification channel delivery failed');
		}
	},
	notifyUsers: mocks.notifyUsers,
}));
vi.mock('../services/story-recipients.js', () => ({
	resolveDeliveryRecipientUserIds: vi.fn(async () => ['recipient-user-id']),
}));
vi.mock('../../agent/utils/keyed-lock.js', () => ({
	withKeyedLock: vi.fn(async (_key: string, callback: () => Promise<void>) => callback()),
}));
vi.mock('../../agent/utils/logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('./story-delivery-renderer.js', () => ({
	buildStoryEmailHtml: vi.fn(async () => undefined),
	buildStoryPdfAttachment: vi.fn(async () => []),
	renderCustomStoryPdf: vi.fn(),
}));
vi.mock('../utils/story-links.js', () => ({
	storyPath: vi.fn(() => '/stories/story-id'),
}));

import {
	deliverStoryOnRefresh,
	resolveStoryDeliveryProjectId,
	runScheduledStoryDelivery,
	storyDeliveryHandler,
} from './story-delivery.handler.js';
import { NotificationChannelDeliveryError } from './story-notifications.js';

beforeEach(() => {
	vi.clearAllMocks();
	mocks.refreshStoryData.mockResolvedValue({ queryData: {} });
});

it('delivers the refreshed story with scheduler-verified billing access', async () => {
	await runScheduledStoryDelivery('story-id');

	expect(mocks.refreshStoryData).toHaveBeenCalledWith('chat-id', 'story-slug', {
		billingAccessVerifiedProjectId: 'project-id',
	});
	expect(mocks.notifyUsers).toHaveBeenCalledOnce();
	expect(mocks.notifyUsers).toHaveBeenCalledWith(
		['recipient-user-id'],
		expect.objectContaining({ channels: ['email'] }),
		{ skipDeliveries: [], throwOnChannelError: true },
	);
});

it('lets the handler no-op when the scheduled story no longer exists', async () => {
	mocks.getStoryById.mockResolvedValueOnce(null);

	await expect(resolveStoryDeliveryProjectId({ storyId: 'deleted-story-id' })).resolves.toBeNull();
});

it('preserves successful channels when the scheduler retries delivery', async () => {
	const previousSkips = [{ userId: 'recipient-user-id', channel: 'slack' as const }];
	const newlySucceeded = [{ userId: 'recipient-user-id', channel: 'email' as const }];
	const error = new NotificationChannelDeliveryError(newlySucceeded, [
		{ userId: 'recipient-user-id', channel: 'in_app' },
	]);
	mocks.notifyUsers.mockRejectedValueOnce(error);

	await storyDeliveryHandler({ storyId: 'story-id', skipDeliveries: previousSkips }, { id: 'job-id' });

	expect(mocks.notifyUsers).toHaveBeenCalledWith(
		['recipient-user-id'],
		expect.objectContaining({ channels: ['email'] }),
		{ skipDeliveries: previousSkips, throwOnChannelError: true },
	);
	expect(mocks.enqueueOnce).toHaveBeenCalledWith({
		name: 'story.deliver',
		payload: { storyId: 'story-id', skipDeliveries: [...previousSkips, ...newlySucceeded], channelRetry: 1 },
		uniqueKey: 'story-delivery-retry-job-id',
		startAfterSeconds: 30,
	});
});

// quarry additions.
it('fails the job once the channel retries are used up', async () => {
	const error = new NotificationChannelDeliveryError([], [{ userId: 'recipient-user-id', channel: 'email' }]);
	mocks.notifyUsers.mockRejectedValueOnce(error);

	await expect(storyDeliveryHandler({ storyId: 'story-id', channelRetry: 5 }, { id: 'job-id' })).rejects.toBe(error);
	expect(mocks.enqueueOnce).not.toHaveBeenCalled();
});

it('grants share access to recipients missing from a specific share, or shares the story with them', async () => {
	mocks.getStoryShareAccess.mockResolvedValueOnce({
		allowedUserIds: ['someone'],
		shareId: 'share-id',
		visibility: 'specific',
	});
	await runScheduledStoryDelivery('story-id');
	expect(mocks.addSharedStoryAllowedUsers).toHaveBeenCalledWith('share-id', ['recipient-user-id']);

	mocks.getStoryShareAccess.mockResolvedValueOnce(null);
	await runScheduledStoryDelivery('story-id');
	expect(mocks.createSharedStory).toHaveBeenCalledWith(
		{ storyId: 'story-id', projectId: 'project-id', userId: 'user-id', visibility: 'specific' },
		{ userIds: ['recipient-user-id'] },
	);
});

it('delivers on refresh only when delivery follows the refresh schedule', async () => {
	mocks.getByStoryId.mockResolvedValue({ channels: ['in_app'], enabled: true, cron: '0 9 * * 1' });
	await deliverStoryOnRefresh('story-id', '0 * * * *', {});
	expect(mocks.notifyUsers).not.toHaveBeenCalled();

	mocks.getByStoryId.mockResolvedValue({ channels: ['in_app'], enabled: true, cron: null });
	await deliverStoryOnRefresh('story-id', '0 * * * *', {});
	expect(mocks.notifyUsers).toHaveBeenCalledOnce();
	expect(mocks.refreshStoryData).not.toHaveBeenCalled();

	mocks.getByStoryId.mockResolvedValue({ channels: ['email'], enabled: true });
});
