import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { PrismaService } from '../src/prisma/prisma.service.js';
import { SharedStoryRepository } from '../src/stories/repositories/shared-story.repository.js';
import { StoryRepository } from '../src/stories/repositories/story.repository.js';
import { createStoriesTestApp } from './stories-test-module.js';

/** Port of upstream `tests/shared-story-group-access.test.ts` (SQLite there, the e2e Postgres here). */

const PROJECT_ID = 'group-share-project';
const STORY_ID = 'group-share-story';
const OWNER_ID = 'group-share-owner';
const GROUP_MEMBER_ID = 'group-share-member';
const DIRECT_USER_ID = 'group-share-direct';
const OUTSIDER_ID = 'group-share-outsider';
const GROUP_ID = 'group-share-analysts';

const USER_IDS = [OWNER_ID, GROUP_MEMBER_ID, DIRECT_USER_ID, OUTSIDER_ID];

describe('sharing a story with user groups', () => {
	let app: INestApplication;
	let prisma: PrismaService;
	let sharedStories: SharedStoryRepository;
	let stories: StoryRepository;

	beforeAll(async () => {
		({ app, prisma } = await createStoriesTestApp());
		sharedStories = app.get(SharedStoryRepository);
		stories = app.get(StoryRepository);

		await prisma.user.createMany({ data: USER_IDS.map((id) => ({ id, name: id, email: `${id}@example.com` })) });
		await prisma.project.create({ data: { id: PROJECT_ID, name: 'Group Share', type: 'local', path: '/tmp/gs' } });
		await prisma.projectMember.createMany({
			data: USER_IDS.map((userId) => ({ projectId: PROJECT_ID, userId, role: 'user' })),
		});
		await prisma.userGroup.create({ data: { id: GROUP_ID, projectId: PROJECT_ID, name: 'Analysts' } });
		await prisma.userGroupMember.create({ data: { groupId: GROUP_ID, userId: GROUP_MEMBER_ID } });
		await prisma.story.create({
			data: { id: STORY_ID, projectId: PROJECT_ID, userId: OWNER_ID, slug: 'revenue', title: 'Revenue' },
		});
		await prisma.storyVersion.create({
			data: { storyId: STORY_ID, version: 1, code: '# Revenue', action: 'create', source: 'user' },
		});
	});

	beforeEach(async () => {
		await prisma.sharedStory.deleteMany();
	});

	afterAll(async () => {
		await app?.close();
	});

	const shareWithGroupAndDirectUser = () =>
		sharedStories.createSharedStory(
			{ storyId: STORY_ID, projectId: PROJECT_ID, userId: OWNER_ID, visibility: 'specific' },
			{ userIds: [DIRECT_USER_ID], groupIds: [GROUP_ID] },
		);

	it('grants access to group members and direct users only', async () => {
		const shared = await shareWithGroupAndDirectUser();

		expect(await sharedStories.canUserAccessSharedStory(shared.id, GROUP_MEMBER_ID)).toBe(true);
		expect(await sharedStories.canUserAccessSharedStory(shared.id, DIRECT_USER_ID)).toBe(true);
		expect(await sharedStories.canUserAccessSharedStory(shared.id, OUTSIDER_ID)).toBe(false);
		expect(await stories.canUserAccessStory(STORY_ID, GROUP_MEMBER_ID)).toBe(true);
		expect(await stories.canUserAccessStory(STORY_ID, OUTSIDER_ID)).toBe(false);
	});

	it('resolves recipients from direct grants and current group membership', async () => {
		const shared = await shareWithGroupAndDirectUser();

		expect((await sharedStories.getSharedStoryRecipientUserIds(shared.id)).sort()).toEqual([
			DIRECT_USER_ID,
			GROUP_MEMBER_ID,
		]);
		expect(await sharedStories.getStoryShareAccess(STORY_ID, PROJECT_ID)).toMatchObject({
			shareId: shared.id,
			visibility: 'specific',
			allowedUserIds: [DIRECT_USER_ID],
			allowedGroupIds: [GROUP_ID],
		});
	});

	it('follows group membership changes after the story is shared', async () => {
		const shared = await shareWithGroupAndDirectUser();

		await prisma.userGroupMember.create({ data: { groupId: GROUP_ID, userId: OUTSIDER_ID } });
		expect(await sharedStories.canUserAccessSharedStory(shared.id, OUTSIDER_ID)).toBe(true);
		expect(await sharedStories.getSharedStoryRecipientUserIds(shared.id)).toContain(OUTSIDER_ID);

		await prisma.userGroupMember.deleteMany({ where: { groupId: GROUP_ID, userId: OUTSIDER_ID } });
		expect(await sharedStories.canUserAccessSharedStory(shared.id, OUTSIDER_ID)).toBe(false);
		expect(await sharedStories.getSharedStoryRecipientUserIds(shared.id)).not.toContain(OUTSIDER_ID);
	});

	it('lists group shares for members with user and group counts', async () => {
		await shareWithGroupAndDirectUser();

		const memberStories = await sharedStories.listUserSharedStories(PROJECT_ID, GROUP_MEMBER_ID);
		const outsiderStories = await sharedStories.listUserSharedStories(PROJECT_ID, OUTSIDER_ID);
		const sharingInfo = await stories.getStorySharingInfo([STORY_ID]);

		expect(memberStories).toHaveLength(1);
		expect(memberStories[0]).toMatchObject({ sharedWithCount: 1, sharedWithGroupCount: 1 });
		expect(outsiderStories).toHaveLength(0);
		expect(sharingInfo.get(STORY_ID)).toMatchObject({ sharedWithCount: 1, sharedWithGroupCount: 1 });
	});

	it('replaces group grants when access is updated or the share becomes project-wide', async () => {
		const shared = await shareWithGroupAndDirectUser();

		await sharedStories.updateSharedStoryRecipients(shared.id, { userIds: [DIRECT_USER_ID], groupIds: [] });
		expect(await sharedStories.canUserAccessSharedStory(shared.id, GROUP_MEMBER_ID)).toBe(false);

		await sharedStories.updateSharedStoryRecipients(shared.id, { userIds: [], groupIds: [GROUP_ID] });
		await sharedStories.createSharedStory({
			storyId: STORY_ID,
			projectId: PROJECT_ID,
			userId: OWNER_ID,
			visibility: 'project',
		});
		expect(await sharedStories.getStoryShareAccess(STORY_ID, PROJECT_ID)).toMatchObject({ allowedGroupIds: [] });
		expect(await sharedStories.getSharedStoryRecipientUserIds(shared.id)).toEqual([]);
	});

	/** Quarry additions: the shape of the raw `querySharedStories` row. */
	it('reads a shared story with its latest version, author and certifier', async () => {
		await prisma.storyVersion.create({
			data: { storyId: STORY_ID, version: 2, code: '# Revenue v2', action: 'update', source: 'user' },
		});
		await stories.setStoryCertification(STORY_ID, DIRECT_USER_ID);
		const shared = await sharedStories.createSharedStory(
			{ storyId: STORY_ID, projectId: PROJECT_ID, userId: OWNER_ID, visibility: 'project' },
			undefined,
			{ pinned: true },
		);

		const row = await sharedStories.getSharedStory(shared.id);

		expect(row).toMatchObject({
			id: shared.id,
			storyId: STORY_ID,
			isPinned: true,
			authorName: OWNER_ID,
			slug: 'revenue',
			format: 'classic',
			code: '# Revenue v2',
			version: 2,
			certifiedByName: DIRECT_USER_ID,
			sharedWithCount: 0,
			sharedWithGroupCount: 0,
		});
		expect(row?.certifiedAt).toBeInstanceOf(Date);
		expect(await sharedStories.getSharedStoryByStoryId(STORY_ID)).toMatchObject({ id: shared.id });

		await sharedStories.toggleSharedStoryPin(shared.id);
		expect((await sharedStories.getSharedStory(shared.id))?.isPinned).toBe(false);

		await stories.archiveByStoryId(STORY_ID);
		expect(await sharedStories.listUserSharedStories(PROJECT_ID, OUTSIDER_ID)).toHaveLength(0);
		expect(await sharedStories.listProjectArchivedSharedStories(PROJECT_ID)).toHaveLength(1);
		await stories.unarchiveByStoryId(STORY_ID);
		await stories.setStoryCertification(STORY_ID, null);
		await prisma.storyVersion.deleteMany({ where: { storyId: STORY_ID, version: 2 } });

		expect(await sharedStories.deleteProjectWideSharedStory(shared.id)).toBe(true);
		expect(await sharedStories.deleteProjectWideSharedStory(shared.id)).toBe(false);
	});
});
