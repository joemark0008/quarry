import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	loadEmbedStoryContent: vi.fn(),
	buildDownloadResponse: vi.fn(),
}));

/** Port of upstream `tests/embed-story-routes.test.ts` (`createCaller` → `runProcedure`). */
vi.mock('./embed-story.js', () => ({
	loadEmbedStoryContent: mocks.loadEmbedStoryContent,
}));
vi.mock('../utils/story-download.js', () => ({
	buildDownloadResponse: mocks.buildDownloadResponse,
}));
vi.mock('../utils/analytics-event.js', () => ({
	logAnalyticsEvent: vi.fn(),
}));

import { runProcedure } from '../procedure.js';
import { embedRoutes } from './embed.procedures.js';

describe('public embedded Story routes', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.loadEmbedStoryContent.mockResolvedValue({
			storyId: 'story-1',
			projectId: 'project-1',
			title: 'Orders',
			code: '<table query_id="query_orders" />',
			slug: 'orders',
			chatId: 'chat-1',
			queryData: { query_orders: { columns: ['id'], data: [{ id: 1 }] } },
			dateFormat: null,
			theme: null,
		});
		mocks.buildDownloadResponse.mockReturnValue({ filename: 'orders.pdf' });
	});

	it('loads the public embed view through the guarded utility', async () => {
		await expect(
			runProcedure(embedRoutes, 'getStory', {} as never, { storyId: 'story-1', token: 'token' }),
		).resolves.toMatchObject({
			id: 'story-1',
			queryData: { query_orders: { columns: ['id'], data: [{ id: 1 }] } },
		});
		expect(mocks.loadEmbedStoryContent).toHaveBeenCalledWith('story-1', 'token');
	});

	it('loads public downloads through the guarded utility', async () => {
		await expect(
			runProcedure(embedRoutes, 'downloadStory', {} as never, {
				storyId: 'story-1',
				token: 'token',
				format: 'pdf',
			}),
		).resolves.toEqual({
			filename: 'orders.pdf',
		});
		expect(mocks.loadEmbedStoryContent).toHaveBeenCalledWith('story-1', 'token');
		expect(mocks.buildDownloadResponse).toHaveBeenCalledWith(
			'pdf',
			'Orders',
			'<table query_id="query_orders" />',
			{ query_orders: { columns: ['id'], data: [{ id: 1 }] } },
			null,
			null,
		);
	});
});
