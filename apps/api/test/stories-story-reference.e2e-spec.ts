import type { INestApplication } from '@nestjs/common';
import { SHARED_WITH_ME_FOLDER_ID } from '@quarry/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Prisma } from '../src/generated/prisma/client.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { SharedStoryRepository } from '../src/stories/repositories/shared-story.repository.js';
import { StoryFolderRepository } from '../src/stories/repositories/story-folder.repository.js';
import {
	MAX_REFERENCEABLE_STORIES_LIMIT,
	type ReferenceableStoryFilters,
	StoryReferenceRepository,
} from '../src/stories/repositories/story-reference.repository.js';
import { createStoriesTestApp } from './stories-test-module.js';

/**
 * The query-level cases of upstream `tests/story-reference.test.ts` (`listReferenceableStories`,
 * `listAllReferenceableStoryListings`, `listMentioningChats`, and the folder filters `expandStoryReferences`
 * resolves through `findReferencedFolder`). The `story-reference` / `story-library` service cases come with stage 2.
 */

const PROJECT_ID = 'reference-project';
const OTHER_PROJECT_ID = 'reference-other-project';
const CHAT_ID = 'reference-chat';
const OWNER_ID = 'reference-owner';
const MEMBER_ID = 'reference-member';
const GROUP_MEMBER_ID = 'reference-group-member';
const GROUP_ID = 'reference-group';

const PRIVATE_STORY = 'story-private';
const CERTIFIED_STORY = 'story-certified';
const PINNED_STORY = 'story-pinned';
const GROUP_STORY = 'story-group';
const ARCHIVED_STORY = 'story-archived';
const OTHER_PROJECT_STORY = 'story-other-project';

const REVENUE_CODE = '# Revenue\n\n<chart query_id="query_revenue" chart_type="line" x_axis_key="month" />\n';

let app: INestApplication;
let prisma: PrismaService;
let references: StoryReferenceRepository;
let sharedStories: SharedStoryRepository;
let folders: StoryFolderRepository;

describe('referencing other stories', () => {
	beforeAll(async () => {
		({ app, prisma } = await createStoriesTestApp());
		references = app.get(StoryReferenceRepository);
		sharedStories = app.get(SharedStoryRepository);
		folders = app.get(StoryFolderRepository);
		await seedStories();
	});

	afterAll(async () => {
		await app?.close();
	});

	it('lists the stories a user owns or can see, pinned then certified then most recent', async () => {
		expect(await listIds(OWNER_ID)).toEqual([PINNED_STORY, CERTIFIED_STORY, GROUP_STORY, PRIVATE_STORY]);
		expect(await listIds(MEMBER_ID)).toEqual([PINNED_STORY, CERTIFIED_STORY]);
		expect(await listIds(GROUP_MEMBER_ID)).toEqual([PINNED_STORY, CERTIFIED_STORY, GROUP_STORY]);
	});

	it('lists the same stories without their content for the mention menu', async () => {
		for (const userId of [OWNER_ID, MEMBER_ID, GROUP_MEMBER_ID]) {
			const listings = await references.listAllReferenceableStoryListings(userId, PROJECT_ID);
			expect(listings.map((story) => story.storyId)).toEqual(await listIds(userId));
			expect(listings.every((story) => !('code' in story))).toBe(true);
		}
	});

	it('filters on trusted stories', async () => {
		expect(await listIds(OWNER_ID, { trustedOnly: true })).toEqual([PINNED_STORY, CERTIFIED_STORY]);
	});

	it('ignores the shares of a story made in another project', async () => {
		await sharedStories.createSharedStory(
			{ storyId: PRIVATE_STORY, projectId: OTHER_PROJECT_ID, userId: OWNER_ID, visibility: 'project' },
			undefined,
			{ pinned: true },
		);

		expect(await listIds(MEMBER_ID)).toEqual([PINNED_STORY, CERTIFIED_STORY]);
		expect(await listIds(OWNER_ID)).toEqual([PINNED_STORY, CERTIFIED_STORY, GROUP_STORY, PRIVATE_STORY]);
	});

	/** Query side of upstream "reads a story with the SQL of its queries" and "does not read stories the user cannot see". */
	it('reads one referenceable story with its latest version, and none the user cannot see', async () => {
		expect(await references.getReferenceableStory(MEMBER_ID, PROJECT_ID, CERTIFIED_STORY)).toMatchObject({
			storyId: CERTIFIED_STORY,
			chatId: CHAT_ID,
			title: 'Monthly revenue',
			authorName: 'Owner',
			ownerId: OWNER_ID,
			isCertified: true,
			isPinned: false,
			version: 2,
			code: REVENUE_CODE,
		});
		for (const storyId of [PRIVATE_STORY, ARCHIVED_STORY, OTHER_PROJECT_STORY]) {
			expect(await references.getReferenceableStory(MEMBER_ID, PROJECT_ID, storyId)).toBeNull();
		}
	});

	it('flags the stories shared with the user specifically', async () => {
		const [groupStory] = await references.listReferenceableStories(GROUP_MEMBER_ID, PROJECT_ID, {
			storyIds: [GROUP_STORY],
		});
		const [ownStory] = await references.listReferenceableStories(OWNER_ID, PROJECT_ID, { storyIds: [GROUP_STORY] });

		expect(groupStory.isSharedWithMe).toBe(true);
		expect(ownStory.isSharedWithMe).toBe(false);
	});

	it('expands a story folder into the stories of the folder and its subfolders the user can see', async () => {
		await prisma.storyFolder.createMany({
			data: [
				{ id: 'folder-finance', ownerId: OWNER_ID, projectId: PROJECT_ID, name: 'Finance' },
				{
					id: 'folder-finance-kpis',
					ownerId: OWNER_ID,
					projectId: PROJECT_ID,
					name: 'KPIs',
					parentId: 'folder-finance',
				},
				{
					id: 'folder-owner-private',
					ownerId: OWNER_ID,
					projectId: PROJECT_ID,
					name: 'Mine',
					visibility: 'private',
				},
			],
		});
		await prisma.storyFolderItem.createMany({
			data: [
				{ storyId: CERTIFIED_STORY, folderId: 'folder-finance' },
				{ storyId: PINNED_STORY, folderId: 'folder-finance-kpis' },
				{ storyId: PRIVATE_STORY, folderId: 'folder-finance-kpis' },
			],
		});

		const finance = await folders.findReferencedFolder(MEMBER_ID, PROJECT_ID, 'folder-finance');

		expect(finance?.name).toBe('Finance');
		expect(finance?.filters.folderIds?.sort()).toEqual(['folder-finance', 'folder-finance-kpis']);
		expect(await listIds(MEMBER_ID, finance?.filters)).toEqual([PINNED_STORY, CERTIFIED_STORY]);
		expect(await folders.findReferencedFolder(MEMBER_ID, PROJECT_ID, 'folder-owner-private')).toBeNull();
	});

	it('expands the shared with me folder into the stories shared with the user', async () => {
		const sharedWithMe = await folders.findReferencedFolder(GROUP_MEMBER_ID, PROJECT_ID, SHARED_WITH_ME_FOLDER_ID);

		expect(sharedWithMe).toEqual({ name: 'Shared with me', filters: { sharedWithMeOnly: true } });
		expect(await listIds(GROUP_MEMBER_ID, sharedWithMe?.filters)).toEqual([GROUP_STORY]);
	});

	it('reaches every story the user can see past the listing cap in the mention list', async () => {
		const storyIds = Array.from(
			{ length: MAX_REFERENCEABLE_STORIES_LIMIT + 5 },
			(_, index) => `story-page-${index}`,
		);
		await prisma.story.createMany({ data: storyIds.map((id) => ({ id, slug: id, chatId: CHAT_ID, title: id })) });
		await prisma.storyVersion.createMany({
			data: storyIds.map((storyId) => ({
				storyId,
				version: 1,
				code: storyId,
				action: 'create',
				source: 'assistant',
			})),
		});

		const mentionable = new Set(
			(await references.listAllReferenceableStoryListings(OWNER_ID, PROJECT_ID)).map((story) => story.storyId),
		);
		const capped = await references.listReferenceableStories(OWNER_ID, PROJECT_ID, { limit: 1_000 });
		const nextPage = await references.listReferenceableStories(OWNER_ID, PROJECT_ID, {
			limit: MAX_REFERENCEABLE_STORIES_LIMIT,
			offset: MAX_REFERENCEABLE_STORIES_LIMIT,
		});

		expect(storyIds.every((storyId) => mentionable.has(storyId))).toBe(true);
		expect(capped).toHaveLength(MAX_REFERENCEABLE_STORIES_LIMIT);
		expect(nextPage.length).toBeGreaterThan(0);
		expect(new Set([...capped, ...nextPage].map((story) => story.storyId)).size).toBe(
			capped.length + nextPage.length,
		);

		await prisma.story.deleteMany({ where: { id: { in: storyIds } } });
	});

	it('lists the chats of the user that created or visibly reference a story, the origin first', async () => {
		await insertChat('chat-mention', OWNER_ID, new Date('2026-02-01'), {
			role: 'user',
			text: `Explain @[story:${CERTIFIED_STORY}]`,
		});
		await insertChat('chat-card', OWNER_ID, new Date('2026-02-03'), {
			role: 'assistant',
			text: `<story-reference id="${CERTIFIED_STORY}">Monthly revenue</story-reference>`,
		});
		await insertChat('chat-read', OWNER_ID, new Date('2026-02-02'), {
			role: 'assistant',
			toolName: 'read',
			toolInput: { file_path: `/story-library/${CERTIFIED_STORY}/story.md` },
		});
		await insertChat('chat-unrelated', OWNER_ID, new Date('2026-02-04'), {
			role: 'user',
			text: `Explain @[story:${PINNED_STORY}]`,
		});
		await insertChat('chat-of-member', MEMBER_ID, new Date('2026-02-05'), {
			role: 'user',
			text: `Explain @[story:${CERTIFIED_STORY}]`,
		});
		await insertChat(
			'chat-in-other-project',
			OWNER_ID,
			new Date('2026-02-06'),
			{ role: 'user', text: `Explain @[story:${CERTIFIED_STORY}]` },
			OTHER_PROJECT_ID,
		);

		const chats = await references.listMentioningChats(OWNER_ID, PROJECT_ID, CERTIFIED_STORY, CHAT_ID);

		expect(chats.map((chat) => [chat.chatId, chat.isOrigin])).toEqual([
			[CHAT_ID, true],
			['chat-card', false],
			['chat-mention', false],
		]);
		expect(await references.listMentioningChats(MEMBER_ID, PROJECT_ID, CERTIFIED_STORY, CHAT_ID)).toMatchObject([
			{ chatId: 'chat-of-member', isOrigin: false },
		]);
		expect(
			(await references.listMentioningChats(OWNER_ID, PROJECT_ID, CERTIFIED_STORY, null)).map(
				(chat) => chat.chatId,
			),
		).toEqual(['chat-card', 'chat-mention']);
	});
});

async function insertChat(
	chatId: string,
	userId: string,
	updatedAt: Date,
	part: { role: 'user' | 'assistant'; text?: string; toolName?: string; toolInput?: Prisma.InputJsonValue },
	projectId = PROJECT_ID,
) {
	await prisma.chat.create({ data: { id: chatId, userId, projectId, title: chatId, updatedAt } });
	const messageId = `${chatId}-message`;
	await prisma.chatMessage.create({ data: { id: messageId, chatId, role: part.role } });
	await prisma.messagePart.create({
		data: {
			messageId,
			order: 0,
			type: part.toolName ? `tool-${part.toolName}` : 'text',
			text: part.text,
			toolName: part.toolName,
			toolCallId: part.toolName ? `${chatId}-call` : undefined,
			toolState: part.toolName ? 'output-available' : undefined,
			toolInput: part.toolInput,
		},
	});
}

async function listIds(userId: string, filters?: ReferenceableStoryFilters) {
	const stories = await references.listReferenceableStories(userId, PROJECT_ID, filters);
	return stories.map((story) => story.storyId);
}

function insertStory(values: Omit<Prisma.StoryUncheckedCreateInput, 'slug'>) {
	return prisma.story.create({ data: { ...values, slug: values.id ?? 'story' } });
}

function shareWithProject(storyId: string, options?: { pinned?: boolean }) {
	return sharedStories.createSharedStory(
		{ storyId, projectId: PROJECT_ID, userId: OWNER_ID, visibility: 'project' },
		undefined,
		options,
	);
}

async function seedStories() {
	await prisma.user.createMany({
		data: [
			{ id: OWNER_ID, name: 'Owner', email: 'owner@example.com' },
			{ id: MEMBER_ID, name: 'Member', email: 'member@example.com' },
			{ id: GROUP_MEMBER_ID, name: 'Group member', email: 'group-member@example.com' },
		],
	});
	await prisma.project.createMany({
		data: [
			{ id: PROJECT_ID, name: 'Reference', type: 'local', path: '/tmp/reference' },
			{ id: OTHER_PROJECT_ID, name: 'Other', type: 'local', path: '/tmp/other' },
		],
	});
	await prisma.userGroup.create({ data: { id: GROUP_ID, projectId: PROJECT_ID, name: 'Analysts' } });
	await prisma.userGroupMember.create({ data: { groupId: GROUP_ID, userId: GROUP_MEMBER_ID } });
	await prisma.chat.create({ data: { id: CHAT_ID, userId: OWNER_ID, projectId: PROJECT_ID } });

	await insertStory({
		id: PRIVATE_STORY,
		chatId: CHAT_ID,
		title: 'Private draft',
		updatedAt: new Date('2026-01-01'),
	});
	await insertStory({
		id: CERTIFIED_STORY,
		chatId: CHAT_ID,
		title: 'Monthly revenue',
		certifiedAt: new Date('2026-01-02'),
		updatedAt: new Date('2026-01-02'),
	});
	await insertStory({ id: PINNED_STORY, chatId: CHAT_ID, title: 'Pinned KPIs', updatedAt: new Date('2026-01-03') });
	await insertStory({
		id: GROUP_STORY,
		projectId: PROJECT_ID,
		userId: OWNER_ID,
		title: 'Churn by cohort',
		updatedAt: new Date('2026-01-04'),
	});
	await insertStory({ id: ARCHIVED_STORY, chatId: CHAT_ID, title: 'Old', archivedAt: new Date('2026-01-05') });
	await insertStory({ id: OTHER_PROJECT_STORY, projectId: OTHER_PROJECT_ID, userId: OWNER_ID, title: 'Elsewhere' });

	await prisma.storyVersion.createMany({
		data: [
			{ storyId: PRIVATE_STORY, version: 1, code: '# Draft', action: 'create', source: 'assistant' },
			{ storyId: CERTIFIED_STORY, version: 1, code: '# Old revenue', action: 'create', source: 'assistant' },
			{ storyId: CERTIFIED_STORY, version: 2, code: REVENUE_CODE, action: 'update', source: 'assistant' },
			{ storyId: PINNED_STORY, version: 1, code: '# KPIs', action: 'create', source: 'assistant' },
			{ storyId: GROUP_STORY, version: 1, code: '# Churn', action: 'create', source: 'user' },
			{ storyId: ARCHIVED_STORY, version: 1, code: '# Old', action: 'create', source: 'assistant' },
			{ storyId: OTHER_PROJECT_STORY, version: 1, code: '# Elsewhere', action: 'create', source: 'user' },
		],
	});

	await shareWithProject(CERTIFIED_STORY);
	await shareWithProject(PINNED_STORY, { pinned: true });
	await shareWithProject(ARCHIVED_STORY);
	await sharedStories.createSharedStory(
		{ storyId: OTHER_PROJECT_STORY, projectId: OTHER_PROJECT_ID, userId: OWNER_ID, visibility: 'project' },
		undefined,
	);
	await sharedStories.createSharedStory(
		{ storyId: GROUP_STORY, projectId: PROJECT_ID, userId: OWNER_ID, visibility: 'specific' },
		{ userIds: [], groupIds: [GROUP_ID] },
	);
}
