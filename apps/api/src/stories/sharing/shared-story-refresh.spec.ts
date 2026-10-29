import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Port of upstream `tests/shared-story-refresh.test.ts`. Differences: no billing (the cloud-billing cases and
 * assertions are gone); no user groups, so the fork grant is project membership (`share-audience.ts`) and the
 * user-group mocks are gone; procedures rethrow the handler's error itself (tRPC wrapped it with a `cause`).
 */

const mocks = vi.hoisted(() => ({
	getSharedStory: vi.fn(),
	getSharedStoryByStoryId: vi.fn(),
	canUserAccessSharedStory: vi.fn(),
	getUserRoleInProject: vi.fn(),
	getStoryByChatAndSlug: vi.fn(),
	getStoryOwnerId: vi.fn(),
	startStoryRefreshActivity: vi.fn(),
	completeActivity: vi.fn(),
	failActivity: vi.fn(),
	getLatestStoryRefreshFailure: vi.fn(),
	getStoryQueryData: vi.fn(),
	refreshStoryData: vi.fn(),
	logAnalyticsEvent: vi.fn(),
}));

vi.mock('../story-queries.js', () => ({
	activityQueries: {
		startStoryRefreshActivity: mocks.startStoryRefreshActivity,
		completeActivity: mocks.completeActivity,
		failActivity: mocks.failActivity,
		getLatestStoryRefreshFailure: mocks.getLatestStoryRefreshFailure,
	},
	projectQueries: { getUserRoleInProject: mocks.getUserRoleInProject },
	sharedStoryQueries: {
		getSharedStory: mocks.getSharedStory,
		getSharedStoryByStoryId: mocks.getSharedStoryByStoryId,
		canUserAccessSharedStory: mocks.canUserAccessSharedStory,
	},
	storyQueries: {
		getStoryByChatAndSlug: mocks.getStoryByChatAndSlug,
		getStoryOwnerId: mocks.getStoryOwnerId,
		getStoryProjectId: vi.fn(async () => null),
	},
	storyFolderQueries: {},
}));
vi.mock('../services/custom-story.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('../services/custom-story.js')>()),
	getActiveThemeForStory: vi.fn(async () => null),
}));
vi.mock('../services/live-story.js', () => ({
	executeLiveQuery: vi.fn(),
	getStoryQueryData: mocks.getStoryQueryData,
	refreshStoryData: mocks.refreshStoryData,
}));
vi.mock('../services/story-filters.js', () => ({
	assertStoryFiltersEnabled: vi.fn(),
	getFilteredStoryQueryData: vi.fn(),
	getStoryFilterOptions: vi.fn(),
	getStoryQuerySql: vi.fn(),
}));
vi.mock('../utils/analytics-event.js', () => ({
	logAnalyticsEvent: mocks.logAnalyticsEvent,
}));
vi.mock('../utils/story-download.js', () => ({ buildDownloadResponse: vi.fn() }));
vi.mock('../utils/story-summary.js', () => ({ extractStorySummary: vi.fn() }));

import type { AuthUser } from '../../auth/auth.service.js';
import { runProcedure } from '../procedure.js';
import { sharedStoryRoutes } from './shared-story.procedures.js';

type StoryView = { canRefresh: boolean; canFork: boolean };

describe('shared Story manual refresh', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getSharedStoryByStoryId.mockResolvedValue({
			id: 'share-1',
			projectId: 'project-1',
			userId: 'sharer-1',
			visibility: 'project',
			storyId: 'story-1',
			chatId: 'chat-1',
			slug: 'orders',
		});
		mocks.getStoryByChatAndSlug.mockResolvedValue({
			id: 'story-1',
			chatId: 'chat-1',
			isLive: true,
		});
		mocks.getStoryOwnerId.mockResolvedValue('owner-1');
		mocks.startStoryRefreshActivity.mockResolvedValue({ id: 'activity-1' });
		mocks.getLatestStoryRefreshFailure.mockResolvedValue(null);
		mocks.getStoryQueryData.mockResolvedValue({
			queryData: { query_orders: { columns: ['id'], data: [{ id: 1 }] } },
			cachedAt: new Date('2026-09-12T10:00:00.000Z'),
		});
		mocks.refreshStoryData.mockResolvedValue({
			queryData: { query_orders: { columns: ['id'], data: [{ id: 1 }] } },
		});
		mocks.getUserRoleInProject.mockImplementation(async (_projectId: string, userId: string) => {
			if (userId === 'admin-1') {
				return 'admin';
			}
			if (userId === 'owner-1' || userId === 'sharer-1' || userId === 'member-1') {
				return 'user';
			}
			return 'viewer';
		});
	});

	it.each([
		['owner', 'owner-1', true],
		['admin', 'admin-1', true],
		['member', 'member-1', false],
	] as const)('reports refresh capability for the %s', async (_label, userId, expected) => {
		const story = (await call(userId, 'get', { storyId: 'story-1' })) as StoryView;

		expect(story.canRefresh).toBe(expected);
		expect(mocks.getSharedStoryByStoryId).toHaveBeenCalledWith('story-1');
		expect(mocks.getSharedStory).not.toHaveBeenCalled();
	});

	it.each([
		['owner', 'owner-1', true],
		['member', 'member-1', false],
	] as const)(
		'defers the refresh after a failure only when the %s can retry it',
		async (_label, userId, expected) => {
			mocks.getLatestStoryRefreshFailure.mockResolvedValue({
				errorMessage: 'No output generated.',
				failedAt: new Date('2026-09-12T10:00:00.000Z'),
			});

			await call(userId, 'get', { storyId: 'story-1' });

			expect(mocks.getStoryQueryData).toHaveBeenCalledWith('chat-1', 'orders', undefined, true, null, {
				deferRefresh: expected,
				deferFirstRefresh: expected,
			});
		},
	);

	it.each([
		['owner', 'owner-1', true],
		['member', 'member-1', false],
	] as const)('defers the first refresh only when the %s can run it', async (_label, userId, expected) => {
		await call(userId, 'get', { storyId: 'story-1' });

		expect(mocks.getStoryQueryData).toHaveBeenCalledWith('chat-1', 'orders', undefined, true, null, {
			deferRefresh: false,
			deferFirstRefresh: expected,
		});
	});

	it('leaves the data of a shared custom story to its own endpoints', async () => {
		mocks.getSharedStoryByStoryId.mockResolvedValue({
			id: 'share-1',
			projectId: 'project-1',
			userId: 'sharer-1',
			visibility: 'project',
			storyId: 'story-1',
			chatId: 'chat-1',
			slug: 'orders',
			format: 'custom',
		});

		const story = await call('owner-1', 'get', { storyId: 'story-1' });

		expect(mocks.getStoryQueryData).not.toHaveBeenCalled();
		expect(story).toMatchObject({ queryData: null, needsRefresh: false });
	});

	it('resolves fork permission against the shared Story project', async () => {
		const story = (await call('member-1', 'get', { storyId: 'story-1' })) as StoryView;

		expect(story.canFork).toBe(true);
		expect(mocks.getUserRoleInProject).toHaveBeenCalledWith('project-1', 'member-1');
	});

	it('allows the owner to fork without checking the creation grant', async () => {
		const story = (await call('sharer-1', 'get', { storyId: 'story-1' })) as StoryView;

		expect(story.canFork).toBe(true);
		expect(mocks.getUserRoleInProject).toHaveBeenCalledTimes(1);
	});

	it('blocks viewers from forking even with the creation grant', async () => {
		const story = (await call('viewer-1', 'get', { storyId: 'story-1' })) as StoryView;

		expect(story.canFork).toBe(false);
		expect(mocks.getUserRoleInProject).toHaveBeenCalledTimes(1);
	});

	it('rejects a viewer before refreshing the shared cache', async () => {
		await expect(call('viewer-1', 'refreshData', { storyId: 'story-1' })).rejects.toMatchObject({
			codeMessage: 'FORBIDDEN',
		});

		expect(mocks.refreshStoryData).not.toHaveBeenCalled();
		expect(mocks.startStoryRefreshActivity).not.toHaveBeenCalled();
	});

	it('lets the owner refresh using the owner execution principal', async () => {
		await call('owner-1', 'refreshData', { storyId: 'story-1' });

		expect(mocks.refreshStoryData).toHaveBeenCalledWith('chat-1', 'orders', {
			billingAccessVerifiedProjectId: 'project-1',
		});
		expect(mocks.startStoryRefreshActivity).toHaveBeenCalledWith({
			projectId: 'project-1',
			userId: 'owner-1',
			storyId: 'story-1',
			chatId: 'chat-1',
			trigger: 'manual',
		});
		expect(mocks.completeActivity).toHaveBeenCalledWith('activity-1', { queriesRefreshed: 1 });
		expect(mocks.logAnalyticsEvent).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 'owner-1' }));
	});

	it('lets an admin trigger an owner-scoped refresh while recording the admin actor', async () => {
		await call('admin-1', 'refreshData', { storyId: 'story-1' });

		expect(mocks.refreshStoryData).toHaveBeenCalledWith('chat-1', 'orders', {
			billingAccessVerifiedProjectId: 'project-1',
		});
		expect(mocks.startStoryRefreshActivity).toHaveBeenCalledWith(expect.objectContaining({ userId: 'owner-1' }));
		expect(mocks.completeActivity).toHaveBeenCalledWith('activity-1', { queriesRefreshed: 1 });
		expect(mocks.logAnalyticsEvent).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 'admin-1' }));
	});

	it('fails the activity and rethrows the original refresh error', async () => {
		const refreshError = new Error('Warehouse unavailable');
		mocks.refreshStoryData.mockRejectedValueOnce(refreshError);

		await expect(call('owner-1', 'refreshData', { storyId: 'story-1' })).rejects.toBe(refreshError);

		expect(mocks.failActivity).toHaveBeenCalledWith('activity-1', 'Warehouse unavailable');
		expect(mocks.completeActivity).not.toHaveBeenCalled();
		expect(mocks.logAnalyticsEvent).not.toHaveBeenCalled();
	});
});

function call(userId: string, name: keyof typeof sharedStoryRoutes, input: unknown): Promise<unknown> {
	return runProcedure(
		sharedStoryRoutes,
		name,
		{ user: { id: userId, name: 'Test User', email: `${userId}@example.com` } as AuthUser },
		input,
	);
}
