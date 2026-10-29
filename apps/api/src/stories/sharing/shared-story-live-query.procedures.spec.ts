import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Port of upstream `tests/shared-story-live-query.routes.test.ts`. quarry has no billing, so the cloud-billing check
 * upstream asserts is not there; the billing-verified project id is still passed on as upstream does.
 */
const mocks = vi.hoisted(() => ({
	getSharedStoryByStoryId: vi.fn(),
	canUserAccessSharedStory: vi.fn(),
	getUserRoleInProject: vi.fn(),
	executeLiveQuery: vi.fn(),
}));

vi.mock('../story-queries.js', () => ({
	activityQueries: {},
	projectQueries: { getUserRoleInProject: mocks.getUserRoleInProject },
	sharedStoryQueries: {
		getSharedStory: vi.fn(),
		getSharedStoryByStoryId: mocks.getSharedStoryByStoryId,
		canUserAccessSharedStory: mocks.canUserAccessSharedStory,
	},
	storyQueries: {},
	storyFolderQueries: {},
}));
vi.mock('../services/live-story.js', () => ({ executeLiveQuery: mocks.executeLiveQuery }));
vi.mock('../utils/analytics-event.js', () => ({ logAnalyticsEvent: vi.fn() }));

import type { AuthUser } from '../../auth/auth.service.js';
import { runProcedure } from '../procedure.js';
import { sharedStoryRoutes } from './shared-story.procedures.js';

const STORY_CODE =
	'<chart query_id="q_customers" chart_type="kpi_card" x_axis_key="x" series=\'[{"data_key":"n"}]\' />';

describe('storyShare.getLiveQueryData', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getSharedStoryByStoryId.mockResolvedValue({
			id: 'share-1',
			projectId: 'project-1',
			userId: 'owner-1',
			visibility: 'specific',
			storyId: 'story-1',
			chatId: 'chat-1',
			slug: 'customers',
			code: STORY_CODE,
		});
		mocks.getUserRoleInProject.mockResolvedValue('user');
		mocks.canUserAccessSharedStory.mockImplementation(
			async (_shareId: string, userId: string) => userId === 'recipient-1',
		);
		mocks.executeLiveQuery.mockResolvedValue({ data: [{ n: 100 }], columns: ['n'] });
	});

	it('runs a query of the shared story for a recipient', async () => {
		await expect(getLiveQueryData('recipient-1', 'q_customers')).resolves.toEqual({
			data: [{ n: 100 }],
			columns: ['n'],
		});
		expect(mocks.executeLiveQuery).toHaveBeenCalledWith('chat-1', 'q_customers', {
			billingAccessVerifiedProjectId: 'project-1',
		});
	});

	it('refuses a project member the story was not shared with', async () => {
		await expect(getLiveQueryData('member-1', 'q_customers')).rejects.toMatchObject({ codeMessage: 'FORBIDDEN' });
		expect(mocks.executeLiveQuery).not.toHaveBeenCalled();
	});

	it('refuses a query of the chat that the shared story does not use', async () => {
		await expect(getLiveQueryData('recipient-1', 'q_private')).rejects.toMatchObject({ codeMessage: 'NOT_FOUND' });
		expect(mocks.executeLiveQuery).not.toHaveBeenCalled();
	});
});

function getLiveQueryData(userId: string, queryId: string) {
	return runProcedure(
		sharedStoryRoutes,
		'getLiveQueryData',
		{ user: { id: userId, name: 'Test User', email: `${userId}@example.com` } as AuthUser },
		{ storyId: 'story-1', queryId },
	);
}
