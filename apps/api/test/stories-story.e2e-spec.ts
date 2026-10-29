import type { INestApplication } from '@nestjs/common';
import { SYSTEM_EXAMPLE_PROJECT_ID } from '@quarry/shared';
import { LOCAL_DATABASE_ID } from '@quarry/shared/tools';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ChatRepository } from '../src/chats/chat.repository.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { JAFFLE_SHOP_STORY } from '../src/stories/fixtures/jaffle-shop-story.js';
import {
	ExampleStoryRepository,
	SYSTEM_EXAMPLE_CHAT_ID,
	SYSTEM_EXAMPLE_STORY_ID,
	SYSTEM_EXAMPLE_USER_ID,
} from '../src/stories/repositories/example-story.repository.js';
import { StoryRepository } from '../src/stories/repositories/story.repository.js';
import { createStoriesTestApp } from './stories-test-module.js';

/**
 * Ports of upstream `tests/story-title-persistence.test.ts` and the story cases of `tests/example-project.test.ts`,
 * plus quarry checks of the raw-SQL story listings (upstream tests them only through mocked services).
 */

const userId = 'story-title-persistence-user';
const projectId = 'story-title-persistence-project';
const chatId = 'story-title-persistence-chat';

let app: INestApplication;
let prisma: PrismaService;
let stories: StoryRepository;

beforeAll(async () => {
	({ app, prisma } = await createStoriesTestApp());
	stories = app.get(StoryRepository);
});

afterAll(async () => {
	await app?.close();
});

async function cleanup() {
	await prisma.story.deleteMany({ where: { projectId } });
	await prisma.story.deleteMany({ where: { chatId } });
	await prisma.chat.deleteMany({ where: { projectId } });
	await prisma.project.deleteMany({ where: { id: projectId } });
	await prisma.user.deleteMany({ where: { id: { in: [userId, 'story-certifier', 'story-stranger'] } } });
}

describe('story title persistence', () => {
	beforeEach(async () => {
		await cleanup();
		await prisma.user.create({
			data: { id: userId, name: 'Story Owner', email: 'story-title-persistence@example.com' },
		});
		await prisma.project.create({
			data: {
				id: projectId,
				name: 'Story Title Persistence',
				type: 'local',
				path: '/tmp/story-title-persistence',
			},
		});
		await prisma.chat.create({ data: { id: chatId, userId, projectId } });
	});

	afterEach(cleanup);

	it('keeps a renamed chat story title when creating another version', async () => {
		await stories.createStoryVersion({
			chatId,
			slug: 'chat-story',
			title: 'Original title',
			code: '# Version 1',
			action: 'create',
			source: 'user',
		});
		const story = await stories.getStoryByChatAndSlug(chatId, 'chat-story');
		expect(story).not.toBeNull();

		await stories.renameStory(story!.id, 'Renamed title');
		const version = await stories.createStoryVersion({
			chatId,
			slug: 'chat-story',
			title: 'Original title',
			code: '# Version 2',
			action: 'update',
			source: 'user',
		});

		const stored = await stories.getStoryByChatAndSlug(chatId, 'chat-story');
		expect(version.title).toBe('Renamed title');
		expect(stored?.title).toBe('Renamed title');
		expect(stored?.slug).toBe('chat-story');
	});

	it('keeps a renamed standalone story title when creating another version', async () => {
		await stories.createStandaloneVersion({
			userId,
			projectId,
			slug: 'standalone-story',
			title: 'Original title',
			code: '# Version 1',
			action: 'create',
			source: 'user',
		});
		const story = await stories.getStandaloneStoryByUserAndSlug(userId, projectId, 'standalone-story');
		expect(story).not.toBeNull();

		await stories.renameStory(story!.id, 'Renamed title');
		const version = await stories.createStandaloneVersion({
			userId,
			projectId,
			slug: 'standalone-story',
			title: 'Original title',
			code: '# Version 2',
			action: 'update',
			source: 'user',
		});

		const stored = await stories.getStandaloneStoryByUserAndSlug(userId, projectId, 'standalone-story');
		expect(version.title).toBe('Renamed title');
		expect(stored?.title).toBe('Renamed title');
		expect(stored?.slug).toBe('standalone-story');
	});

	it('numbers versions per story and reads them back with the story columns', async () => {
		const first = await stories.createStoryVersion({
			chatId,
			slug: 'versions',
			title: 'Versions',
			code: '# 1',
			action: 'create',
			source: 'assistant',
		});
		const second = await stories.createStoryVersion({
			chatId,
			slug: 'versions',
			title: 'Versions',
			code: '# 2',
			action: 'update',
			source: 'user',
		});

		expect([first.version, second.version]).toEqual([1, 2]);
		expect(second).toMatchObject({ storyId: first.storyId, code: '# 2', action: 'update', source: 'user' });
		expect(second.createdAt).toBeInstanceOf(Date);
		expect(await stories.getLatestVersionByChatAndSlug(chatId, 'versions')).toMatchObject({
			version: 2,
			code: '# 2',
			title: 'Versions',
			slug: 'versions',
			chatId,
			format: 'classic',
		});
		expect((await stories.getVersionByNumber(chatId, 'versions', 1))?.code).toBe('# 1');
		expect((await stories.listStoryVersions(chatId, 'versions')).map((v) => v.version)).toEqual([1, 2]);
		expect(await stories.listStoriesInChat(chatId)).toEqual([
			{ slug: 'versions', title: 'Versions', latestVersion: 2 },
		]);

		await stories.updateLatestVersionCode(chatId, 'versions', '# 2 edited');
		expect((await stories.getLatestVersionByStoryId(first.storyId))?.code).toBe('# 2 edited');
	});

	it('lists every chat story with its latest version, a never-published custom draft included', async () => {
		await stories.createStoryVersion({
			chatId,
			slug: 'a',
			title: 'A',
			code: '# A1',
			action: 'create',
			source: 'user',
		});
		await stories.createStoryVersion({
			chatId,
			slug: 'a',
			title: 'A',
			code: '# A2',
			action: 'update',
			source: 'user',
		});
		await stories.createCustomStory({ chatId, slug: 'draft', title: 'Draft' });

		const latest = await stories.listLatestVersionsInChat(chatId);

		expect(latest).toMatchObject([
			{ slug: 'a', version: 2, code: '# A2', source: 'user', format: 'classic', archivedAt: null },
			{ slug: 'draft', version: null, code: null, source: null, format: 'custom' },
		]);
		expect((await stories.listCustomStoriesInChat(chatId)).map((story) => story.slug)).toEqual(['draft']);
	});

	it('lists the stories of a user with their latest version, certifier and archive state', async () => {
		await prisma.user.create({ data: { id: 'story-certifier', name: 'Certifier', email: 'cert@example.com' } });
		await prisma.user.create({ data: { id: 'story-stranger', name: 'Stranger', email: 'stranger@example.com' } });
		const chatStory = await stories.createStoryVersion({
			chatId,
			slug: 'chat',
			title: 'Chat story',
			code: '# Chat',
			action: 'create',
			source: 'assistant',
		});
		const standalone = await stories.createStandaloneStory({
			userId,
			projectId,
			slug: 'standalone',
			title: 'Standalone',
			code: '# Standalone',
			source: 'user',
		});
		expect(standalone).toMatchObject({ slug: 'standalone', version: 1 });
		expect(
			await stories.createStandaloneStory({
				userId,
				projectId,
				slug: 'standalone',
				title: 'Duplicate',
				code: '#',
				source: 'user',
			}),
		).toBeNull();
		await stories.setStoryCertification(chatStory.storyId, 'story-certifier');

		const chatRows = await stories.listUserChatStories(userId, { projectId });
		expect(chatRows).toHaveLength(1);
		expect(chatRows[0]).toMatchObject({
			id: chatStory.storyId,
			projectId,
			code: '# Chat',
			version: 1,
			certifiedByName: 'Certifier',
		});
		expect(chatRows[0].versionCreatedAt).toBeInstanceOf(Date);
		expect((await stories.listUserStandaloneStories(userId, projectId)).map((row) => row.slug)).toEqual([
			'standalone',
		]);
		expect((await stories.listAllUserStoriesInProject(userId, projectId)).map((row) => row.slug)).toEqual([
			'standalone',
			'chat',
		]);
		expect(await stories.getStoryCertification(chatStory.storyId)).toEqual({
			certifiedAt: expect.any(Date),
			certifiedByName: 'Certifier',
		});

		await stories.archiveStory(chatId, 'chat');
		expect(await stories.listUserChatStories(userId)).toHaveLength(0);
		expect(await stories.listUserChatStories(userId, { archived: true })).toHaveLength(1);
		expect(await stories.getStoryByIdForUser(chatStory.storyId, userId)).toMatchObject({ slug: 'chat' });
		expect(await stories.getStoryByIdForUser(chatStory.storyId, 'story-stranger')).toBeNull();
		expect(await stories.getStoryProjectId(standalone!.id)).toBe(projectId);
		expect(await stories.getStoryOwnerId(chatStory.storyId)).toBe(userId);
	});

	it('upserts the data cache of a story', async () => {
		await stories.createStoryVersion({
			chatId,
			slug: 'c',
			title: 'C',
			code: '#',
			action: 'create',
			source: 'user',
		});
		const queryData = { q1: { data: [{ a: 1 }], columns: ['a'] } };
		const querySources = { q1: { fingerprint: 'f', databaseId: null, adminMode: false } };

		const first = await stories.upsertStoryDataCache(chatId, 'c', queryData, querySources, { q1: 'up' });
		const second = await stories.upsertStoryDataCache(chatId, 'c', queryData, querySources);

		expect(first).toMatchObject({ queryData, querySources, analysisResults: { q1: 'up' } });
		expect(second.analysisResults).toBeNull();
		expect(await stories.getStoryDataCacheByChatAndSlug(chatId, 'c')).toMatchObject({ queryData, querySources });

		await stories.upsertStoryDataCacheByStoryId(first.storyId, { q2: { data: [], columns: [] } });
		expect(await stories.getStoryDataCacheByStoryId(first.storyId)).toMatchObject({ querySources: null });
		expect((await stories.getStoryQueryDataByStoryIds([first.storyId])).get(first.storyId)).toEqual({
			q2: { data: [], columns: [] },
		});
		expect(await stories.getStoryDataCachedAt(first.storyId)).toBeInstanceOf(Date);
	});
});

describe('system example story', () => {
	beforeAll(async () => {
		await prisma.project.create({
			data: { id: SYSTEM_EXAMPLE_PROJECT_ID, name: 'Example', type: 'local', path: '/tmp/example' },
		});
	});

	it('upserts one pinned Jaffle Shop story owned by the system user', async () => {
		const exampleStories = app.get(ExampleStoryRepository);
		await exampleStories.upsertSystemExampleStory();
		await exampleStories.upsertSystemExampleStory();

		const [users, chats, storyRows, versions, shares, parts] = await Promise.all([
			prisma.user.findMany({ where: { id: SYSTEM_EXAMPLE_USER_ID } }),
			prisma.chat.findMany({ where: { id: SYSTEM_EXAMPLE_CHAT_ID } }),
			prisma.story.findMany({ where: { id: SYSTEM_EXAMPLE_STORY_ID } }),
			prisma.storyVersion.findMany({ where: { storyId: SYSTEM_EXAMPLE_STORY_ID } }),
			prisma.sharedStory.findMany({ where: { storyId: SYSTEM_EXAMPLE_STORY_ID } }),
			prisma.messagePart.findMany({
				where: { chatMessage: { chatId: SYSTEM_EXAMPLE_CHAT_ID } },
				select: { toolInput: true, toolOutput: true },
			}),
		]);

		expect(users).toHaveLength(1);
		expect(users[0]).toMatchObject({ name: 'Nao', email: 'system-example@getnao.invalid' });
		expect(chats).toHaveLength(1);
		expect(storyRows).toHaveLength(1);
		expect(storyRows[0]).toMatchObject({ slug: JAFFLE_SHOP_STORY.slug, title: JAFFLE_SHOP_STORY.title });
		expect(versions).toHaveLength(1);
		expect(versions[0].code).toBe(JAFFLE_SHOP_STORY.code);
		expect(shares).toHaveLength(1);
		expect(shares[0]).toMatchObject({ visibility: 'project', isPinned: true });
		expect(parts.map(({ toolOutput }) => (toolOutput as { id: string }).id).sort()).toEqual(
			Object.keys(JAFFLE_SHOP_STORY.queries).sort(),
		);
		expect(
			parts.every(({ toolInput }) => (toolInput as { database_id?: string }).database_id === LOCAL_DATABASE_ID),
		).toBe(true);

		const queryData = await app
			.get(ChatRepository)
			.getLatestSqlQueryDataByIds(SYSTEM_EXAMPLE_CHAT_ID, new Set(Object.keys(JAFFLE_SHOP_STORY.queries)));
		expect(Object.keys(queryData).sort()).toEqual(Object.keys(JAFFLE_SHOP_STORY.queries).sort());
	});

	/** Upstream opens the example story to every user on cloud only; quarry is never cloud (no open projects). */
	it('does not open the example story to users outside the project', async () => {
		expect(await stories.canUserAccessStory(SYSTEM_EXAMPLE_STORY_ID, 'any-user')).toBe(false);
	});
});
