import type { INestApplication } from '@nestjs/common';
import { DEFAULT_STORY_THEME_PAIR, type StoryThemePair } from '@quarry/shared/story-theme';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { PrismaService } from '../src/prisma/prisma.service.js';
import { FavoriteRepository } from '../src/stories/repositories/favorite.repository.js';
import { McpEmbedRepository } from '../src/stories/repositories/mcp-embed.repository.js';
import { StoryAppStateRepository } from '../src/stories/repositories/story-app-state.repository.js';
import { StoryDeliveryRepository } from '../src/stories/repositories/story-delivery.repository.js';
import { StoryThemeRepository } from '../src/stories/repositories/story-theme.repository.js';
import { createStoriesTestApp } from './stories-test-module.js';

/**
 * Quarry checks of the smaller story repositories on Postgres (theme versions, app state upserts on partial unique
 * indexes, favorites, deliveries, MCP embeds): upstream has no test of these query files of their own.
 */

const PROJECT_ID = 'repo-project';
const OTHER_PROJECT_ID = 'repo-other-project';
const USER_ID = 'repo-user';
const OTHER_USER_ID = 'repo-other-user';
const STORY_ID = 'repo-story';

let app: INestApplication;
let prisma: PrismaService;

beforeAll(async () => {
	({ app, prisma } = await createStoriesTestApp());
	await prisma.user.createMany({
		data: [
			{ id: USER_ID, name: 'User', email: 'repo-user@example.com' },
			{ id: OTHER_USER_ID, name: 'Other', email: 'repo-other@example.com' },
		],
	});
	await prisma.project.createMany({
		data: [
			{ id: PROJECT_ID, name: 'Repo', type: 'local', path: '/tmp/repo' },
			{ id: OTHER_PROJECT_ID, name: 'Other', type: 'local', path: '/tmp/repo-other' },
		],
	});
	await prisma.chat.create({ data: { id: 'repo-chat', userId: USER_ID, projectId: PROJECT_ID } });
	await prisma.story.create({ data: { id: STORY_ID, chatId: 'repo-chat', slug: 'story', title: 'Story' } });
});

afterAll(async () => {
	await app?.close();
});

describe('StoryThemeRepository', () => {
	it('versions the project theme, skipping saves of the latest one', async () => {
		const themes = app.get(StoryThemeRepository);
		expect(await themes.getStoryThemeState(PROJECT_ID)).toEqual({ theme: null, enabled: false, createdAt: null });

		await themes.setStoryThemeEnabled(PROJECT_ID, true);
		await themes.saveStoryTheme(PROJECT_ID, DEFAULT_STORY_THEME_PAIR);
		expect(await themes.listStoryThemeVersions(PROJECT_ID)).toHaveLength(1);
		expect(await themes.getActiveStoryTheme(PROJECT_ID)).toEqual(DEFAULT_STORY_THEME_PAIR);

		const renamed: StoryThemePair = {
			...DEFAULT_STORY_THEME_PAIR,
			light: {
				...DEFAULT_STORY_THEME_PAIR.light,
				brand: { ...DEFAULT_STORY_THEME_PAIR.light.brand, name: 'Acme' },
			},
		};
		await themes.saveStoryTheme(PROJECT_ID, renamed);
		const versions = await themes.listStoryThemeVersions(PROJECT_ID);
		expect(versions.map((version) => version.version)).toEqual([1, 2]);
		expect(versions[1].theme.light.brand.name).toBe('Acme');

		await themes.setStoryThemeEnabled(PROJECT_ID, false);
		expect(await themes.getActiveStoryTheme(PROJECT_ID)).toBeNull();

		expect(await themes.restoreStoryThemeVersion(PROJECT_ID, 1)).toEqual(DEFAULT_STORY_THEME_PAIR);
		expect(await themes.restoreStoryThemeVersion(PROJECT_ID, 9)).toBeNull();
		expect((await themes.listStoryThemeVersions(PROJECT_ID)).map((version) => version.version)).toEqual([1, 2, 3]);
		expect(await themes.getStoryThemeState(PROJECT_ID)).toMatchObject({ enabled: true });
	});
});

describe('StoryAppStateRepository', () => {
	it('upserts project and user state on their own keys', async () => {
		const states = app.get(StoryAppStateRepository);
		const projectKey = { storyId: STORY_ID, scope: 'project' as const, userId: null, key: 'filters' };
		const userKey = { storyId: STORY_ID, scope: 'user' as const, userId: USER_ID, key: 'filters' };

		await states.upsertStoryAppState(projectKey, { region: 'EU' }, USER_ID);
		await states.upsertStoryAppState(projectKey, { region: 'US' }, OTHER_USER_ID);
		await states.upsertStoryAppState(userKey, ['a'], USER_ID);
		await states.upsertStoryAppState({ ...userKey, userId: OTHER_USER_ID }, ['b'], OTHER_USER_ID);
		await states.upsertStoryAppState(userKey, ['a', 'c'], USER_ID);

		expect(await states.listProjectStoryAppState(STORY_ID)).toMatchObject([
			{ key: 'filters', value: { region: 'US' }, updatedBy: OTHER_USER_ID, userId: null },
		]);
		expect(await states.listUserStoryAppState(STORY_ID, USER_ID)).toMatchObject([{ value: ['a', 'c'] }]);
		expect(await states.countStoryAppStateKeys(STORY_ID, 'user', OTHER_USER_ID)).toBe(1);
		expect(await states.countStoryAppStateKeys(STORY_ID, 'project', null)).toBe(1);
		expect(await states.hasStoryAppStateKey(projectKey)).toBe(true);

		await states.deleteStoryAppState(projectKey);
		expect(await states.hasStoryAppStateKey(projectKey)).toBe(false);
		expect(await states.hasStoryAppStateKey(userKey)).toBe(true);
	});
});

describe('FavoriteRepository', () => {
	it('toggles story and folder favorites, listing those of the project', async () => {
		const favorites = app.get(FavoriteRepository);
		const folder = await prisma.storyFolder.create({
			data: { ownerId: USER_ID, projectId: PROJECT_ID, name: 'Folder' },
		});
		const otherFolder = await prisma.storyFolder.create({
			data: { ownerId: USER_ID, projectId: OTHER_PROJECT_ID, name: 'Elsewhere' },
		});

		expect(await favorites.toggleFavorite(USER_ID, { type: 'story', id: STORY_ID })).toBe(true);
		expect(await favorites.toggleFavorite(USER_ID, { type: 'folder', id: folder.id })).toBe(true);
		expect(await favorites.toggleFavorite(USER_ID, { type: 'folder', id: otherFolder.id })).toBe(true);
		expect(await favorites.listFavorites(USER_ID, PROJECT_ID)).toEqual({
			storyIds: [STORY_ID],
			folderIds: [folder.id],
		});
		expect(await favorites.listFavorites(OTHER_USER_ID, PROJECT_ID)).toEqual({ storyIds: [], folderIds: [] });

		expect(await favorites.toggleFavorite(USER_ID, { type: 'story', id: STORY_ID })).toBe(false);
		expect((await favorites.listFavorites(USER_ID, PROJECT_ID)).storyIds).toEqual([]);
	});
});

describe('StoryDeliveryRepository', () => {
	it('upserts a delivery per story and resets it', async () => {
		const deliveries = app.get(StoryDeliveryRepository);
		const created = await deliveries.upsert({
			storyId: STORY_ID,
			projectId: PROJECT_ID,
			enabled: true,
			cron: '0 9 * * 1',
			scheduleDescription: 'Mondays',
			channels: ['email'],
			recipientMode: 'specific',
			recipientUserIds: [OTHER_USER_ID],
			createdBy: USER_ID,
		});
		const updated = await deliveries.upsert({
			storyId: STORY_ID,
			projectId: PROJECT_ID,
			enabled: true,
			cron: '0 8 * * *',
			channels: ['email', 'slack'],
			recipientUserIds: [],
			recipientGroupIds: ['group'],
		});

		expect(updated.id).toBe(created.id);
		expect(updated).toMatchObject({
			cron: '0 8 * * *',
			channels: ['email', 'slack'],
			recipientGroupIds: ['group'],
		});
		expect(updated.createdBy).toBe(USER_ID);

		await deliveries.setEnabled(STORY_ID, false);
		expect((await deliveries.getByStoryId(STORY_ID))?.enabled).toBe(false);

		await deliveries.setEnabled(STORY_ID, true);
		await deliveries.disableAndResetRecipients(STORY_ID);
		expect(await deliveries.getByStoryId(STORY_ID)).toMatchObject({
			enabled: false,
			recipientMode: 'specific',
			recipientUserIds: [],
			recipientGroupIds: [],
		});
	});
});

describe('McpEmbedRepository', () => {
	it('embeds a chart or map only over a query result of the same project', async () => {
		const embeds = app.get(McpEmbedRepository);
		await prisma.mcpQueryData.create({
			data: {
				queryId: 'mcp-query',
				projectId: PROJECT_ID,
				columns: ['a'],
				data: [{ a: 1 }],
				expiresAt: new Date(Date.now() + 60_000),
			},
		});
		const chartConfig = { chartType: 'bar', xAxisKey: 'a', xAxisType: 'category', series: [] } as never;
		const mapConfig = { query_id: 'mcp-query' } as never;

		expect(
			await embeds.insertMcpChartEmbed({
				chartEmbedId: 'chart-1',
				queryId: 'mcp-query',
				projectId: OTHER_PROJECT_ID,
				chartConfig,
				sourceChatId: null,
			}),
		).toBe(false);
		expect(
			await embeds.insertMcpChartEmbed({
				chartEmbedId: 'chart-1',
				queryId: 'mcp-query',
				projectId: PROJECT_ID,
				chartConfig,
				sourceChatId: 'repo-chat',
			}),
		).toBe(true);
		expect(
			await embeds.insertMcpMapEmbed({
				mapEmbedId: 'map-1',
				queryId: 'mcp-query',
				projectId: PROJECT_ID,
				mapConfig,
				sourceChatId: null,
			}),
		).toBe(true);

		expect(await embeds.getMcpChartEmbedById('chart-1')).toEqual({
			projectId: PROJECT_ID,
			queryId: 'mcp-query',
			chartConfig,
			sourceChatId: 'repo-chat',
		});
		expect(await embeds.getMcpMapEmbedById('map-1')).toEqual({
			projectId: PROJECT_ID,
			queryId: 'mcp-query',
			mapConfig,
			sourceChatId: null,
		});
		expect(await embeds.getMcpChartEmbedById('missing')).toBeNull();
	});
});
