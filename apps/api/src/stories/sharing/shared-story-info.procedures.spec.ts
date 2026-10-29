import type { UserRole } from '@quarry/shared/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Port of upstream `tests/shared-story-info.routes.test.ts`. */
const mocks = vi.hoisted(() => ({
	getUserRoleInProject: vi.fn(),
	getStoryShareAccess: vi.fn(),
}));

vi.mock('../story-queries.js', () => ({
	activityQueries: {},
	projectQueries: { getUserRoleInProject: mocks.getUserRoleInProject },
	sharedStoryQueries: {
		getSharedStory: vi.fn(),
		getSharedStoryByStoryId: vi.fn(),
		getStoryShareAccess: mocks.getStoryShareAccess,
	},
	storyQueries: {
		getStoryByChatAndSlug: vi.fn(async () => ({ id: 'story-1', projectId: 'project-1' })),
		getStoryOwnerId: vi.fn(async () => 'owner-1'),
	},
	storyFolderQueries: {},
}));
vi.mock('../services/share-audience.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('../services/share-audience.js')>()),
	filterShareableUserGroupIds: vi.fn(async (_projectId: string, groupIds: string[]) => groupIds),
}));
vi.mock('../utils/analytics-event.js', () => ({ logAnalyticsEvent: vi.fn() }));

import type { AuthUser } from '../../auth/auth.service.js';
import type { Project } from '../../generated/prisma/client.js';
import { runProcedure } from '../procedure.js';
import { sharedStoryRoutes } from './shared-story.procedures.js';

const INPUT = { chatId: 'chat-1', storySlug: 'customers' };

describe('storyShare.getSharedStoryInfo', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getStoryShareAccess.mockResolvedValue({
			visibility: 'specific',
			allowedUserIds: ['recipient-1'],
			allowedGroupIds: ['group-1'],
		});
	});

	it('hides the access list from a project member who does not own the story', async () => {
		await expect(getSharedStoryInfo('member-1', 'user')).resolves.toMatchObject({
			isShared: false,
			allowedUserIds: [],
		});
		expect(mocks.getStoryShareAccess).not.toHaveBeenCalled();
	});

	it('shows the access list to the story owner', async () => {
		await expect(getSharedStoryInfo('owner-1', 'user')).resolves.toMatchObject({
			isShared: true,
			allowedUserIds: ['recipient-1'],
		});
	});

	it('shows the access list to a project admin', async () => {
		await expect(getSharedStoryInfo('admin-1', 'admin')).resolves.toMatchObject({
			isShared: true,
			allowedGroupIds: ['group-1'],
		});
	});
});

/** `@ProjectAccess()` resolves the selected project and the role before the procedure runs. */
function getSharedStoryInfo(userId: string, userRole: UserRole) {
	return runProcedure(
		sharedStoryRoutes,
		'getSharedStoryInfo',
		{
			user: { id: userId, name: 'Test User', email: `${userId}@example.com` } as AuthUser,
			project: { id: 'project-1' } as Project,
			userRole,
		},
		INPUT,
	);
}
