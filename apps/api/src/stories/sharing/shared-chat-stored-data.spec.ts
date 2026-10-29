import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Adapted from upstream `tests/shared-chat-stored-data.test.ts`: upstream checks `sharedChat.getSharedChat` (the chats
 * module's), with this share fixture; here the same fixture drives the one shared-chat procedure stories own,
 * `sharedChat.downloadStory`, which exports a story of the shared chat from its stored data.
 */
const mocks = vi.hoisted(() => ({
	getSharedChatInfo: vi.fn(),
	canUserAccessSharedChat: vi.fn(),
	getChatOwnerId: vi.fn(),
	getUserRoleInProject: vi.fn(),
	getDisplaySettings: vi.fn(),
	getLatestVersionByChatAndSlug: vi.fn(),
	getVersionByNumber: vi.fn(),
	getStoryQueryData: vi.fn(),
	buildDownloadResponse: vi.fn(),
	logAnalyticsEvent: vi.fn(),
}));

vi.mock('../story-queries.js', () => ({
	chatQueries: { getChatOwnerId: mocks.getChatOwnerId },
	projectQueries: { getUserRoleInProject: mocks.getUserRoleInProject, getDisplaySettings: mocks.getDisplaySettings },
	sharedChatQueries: {
		getSharedChatInfo: mocks.getSharedChatInfo,
		canUserAccessSharedChat: mocks.canUserAccessSharedChat,
	},
	storyQueries: {
		getLatestVersionByChatAndSlug: mocks.getLatestVersionByChatAndSlug,
		getVersionByNumber: mocks.getVersionByNumber,
	},
}));
vi.mock('../services/custom-story.js', () => ({ getActiveThemeForProject: vi.fn(async () => null) }));
vi.mock('../services/live-story.js', () => ({ getStoryQueryData: mocks.getStoryQueryData }));
vi.mock('../utils/analytics-event.js', () => ({ logAnalyticsEvent: mocks.logAnalyticsEvent }));
vi.mock('../utils/story-download.js', () => ({ buildDownloadResponse: mocks.buildDownloadResponse }));

import type { AuthUser } from '../../auth/auth.service.js';
import { runProcedure } from '../procedure.js';
import { sharedChatStoryRoutes } from './shared-chat-story.procedures.js';

const QUERY_DATA = { query_orders: { columns: ['id'], data: [{ id: 1 }] } };

describe('shared chat stored data', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getSharedChatInfo.mockResolvedValue({
			id: 'share-1',
			projectId: 'project-1',
			userId: 'owner-1',
			chatId: 'chat-1',
			visibility: 'project',
			title: 'Shared chat',
			authorName: 'Owner',
		});
		mocks.getUserRoleInProject.mockResolvedValue('user');
		mocks.getDisplaySettings.mockResolvedValue({ dateFormat: null });
		mocks.getLatestVersionByChatAndSlug.mockResolvedValue({
			storyId: 'story-1',
			version: 2,
			title: 'Orders',
			code: '<table query_id="query_orders" />',
			isLive: false,
			cacheSchedule: null,
		});
		mocks.getStoryQueryData.mockResolvedValue({ queryData: QUERY_DATA, code: '<table query_id="query_orders" />' });
		mocks.buildDownloadResponse.mockResolvedValue({
			data: 'cGRm',
			filename: 'orders.pdf',
			mimeType: 'application/pdf',
		});
	});

	it('exports a story of the shared chat from its stored data', async () => {
		await expect(downloadStory('viewer-1')).resolves.toEqual({
			data: 'cGRm',
			filename: 'orders.pdf',
			mimeType: 'application/pdf',
		});
		expect(mocks.getStoryQueryData).toHaveBeenCalledWith(
			'chat-1',
			'orders',
			'<table query_id="query_orders" />',
			false,
			null,
		);
		expect(mocks.buildDownloadResponse).toHaveBeenCalledWith(
			'pdf',
			'Orders',
			'<table query_id="query_orders" />',
			QUERY_DATA,
			null,
			null,
		);
		expect(mocks.logAnalyticsEvent).toHaveBeenCalledWith(
			expect.objectContaining({ actorUserId: 'viewer-1', sharedChatId: 'share-1' }),
		);
	});

	it('refuses a member a specific share was not given to', async () => {
		mocks.getSharedChatInfo.mockResolvedValue({
			id: 'share-1',
			projectId: 'project-1',
			userId: 'owner-1',
			chatId: 'chat-1',
			visibility: 'specific',
		});
		mocks.getChatOwnerId.mockResolvedValue('owner-1');
		mocks.canUserAccessSharedChat.mockResolvedValue(false);

		await expect(downloadStory('viewer-1')).rejects.toMatchObject({ codeMessage: 'FORBIDDEN' });
		expect(mocks.buildDownloadResponse).not.toHaveBeenCalled();
	});

	it('refuses users outside the project', async () => {
		mocks.getUserRoleInProject.mockResolvedValue(null);

		await expect(downloadStory('stranger-1')).rejects.toMatchObject({ codeMessage: 'FORBIDDEN' });
	});
});

function downloadStory(userId: string) {
	return runProcedure(
		sharedChatStoryRoutes,
		'downloadStory',
		{ user: { id: userId, name: 'Viewer', email: `${userId}@example.com` } as AuthUser },
		{ shareId: 'share-1', storySlug: 'orders', format: 'pdf' },
	);
}
