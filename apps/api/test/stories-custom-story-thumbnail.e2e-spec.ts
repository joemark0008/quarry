import type { INestApplication } from '@nestjs/common';
import { DEFAULT_DARK_STORY_THEME, DEFAULT_STORY_THEME, type StoryThemePair } from '@quarry/shared/story-theme';
import { Resvg } from '@resvg/resvg-js';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../src/prisma/prisma.service.js';
import { getCustomStoryThumbnail, queueCustomStoryThumbnail } from '../src/stories/services/custom-story-thumbnail.js';
import { storyFileQueries, storyQueries } from '../src/stories/story-queries.js';
import { closeBrowser, getBrowser } from '../src/stories/utils/headless-browser.js';
import type { StoryScreenshot } from '../src/stories/utils/story-screenshot.js';
import { createStoriesTestApp } from './stories-test-module.js';

/**
 * Port of upstream `tests/custom-story-thumbnail.test.ts` on Postgres. Upstream encodes WebP with sharp; quarry has
 * the headless Chrome do it, so the suite needs Chrome and is skipped without it. Screenshots stay mocked.
 */

const isChromeAvailable = await getBrowser().then(
	() => true,
	() => false,
);

let app: INestApplication;
let prisma: PrismaService;

const screenshots = vi.hoisted(() => ({
	render: null as unknown as StoryScreenshot,
	darkImage: null as unknown as Buffer,
	brokenModes: [] as string[],
	calls: 0,
}));
vi.mock('../src/stories/utils/story-screenshot.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('../src/stories/utils/story-screenshot.js')>()),
	renderStoryScreenshot: async (html: string) => {
		screenshots.calls++;
		const isBroken = screenshots.brokenModes.some((mode) => html.includes(`data-mode="${mode}"`));
		if (isBroken) {
			return { ...screenshots.render, blockErrors: ['Something went wrong.'] };
		}
		return html.includes('data-mode="dark"')
			? { ...screenshots.render, image: screenshots.darkImage }
			: screenshots.render;
	},
}));

const documents = vi.hoisted(() => ({ modes: [] as string[] }));
vi.mock('../src/stories/services/custom-story-export.js', () => ({
	buildCustomStoryDocumentByStoryId: async (
		_storyId: string,
		_version: unknown,
		_queryData: unknown,
		mode: string,
	) => {
		documents.modes.push(mode);
		return `<html data-mode="${mode}"></html>`;
	},
}));
const versionIds = vi.hoisted(() => ({ current: '' }));
const queries = vi.hoisted(() => ({ ids: [] as string[], saved: [] as string[] }));
const themes = vi.hoisted(() => ({ active: null as StoryThemePair | null }));
vi.mock('../src/stories/services/custom-story.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('../src/stories/services/custom-story.js')>()),
	getLatestCustomStoryVersionByStoryId: async () => ({
		version: { id: versionIds.current },
		app: { kind: 'react', bundle: 'bundle' },
		queryIds: queries.ids,
		theme: themes.active,
	}),
	getActiveThemeForStory: async () => themes.active,
	getStoredCustomStoryQueryDataByStoryId: async () =>
		Object.fromEntries(queries.saved.map((queryId) => [queryId, { data: [], columns: [] }])),
}));

const STORY_ID = 'story-1';
const STANDALONE_STORY_ID = 'story-standalone';
const LIVE_STORY_ID = 'story-live';

describe.skipIf(!isChromeAvailable)('custom story thumbnails', () => {
	beforeAll(async () => {
		({ app, prisma } = await createStoriesTestApp());
		await prisma.user.create({ data: { id: 'user-1', name: 'User', email: 'user@example.com' } });
		await prisma.project.create({
			data: { id: 'project-1', name: 'Project', type: 'local', path: '/tmp/project' },
		});
		await prisma.chat.create({ data: { id: 'chat-1', projectId: 'project-1', userId: 'user-1', title: 'Chat' } });
		await prisma.story.create({
			data: { id: STORY_ID, chatId: 'chat-1', slug: 'revenue', title: 'Revenue', format: 'custom' },
		});
		await prisma.story.create({
			data: {
				id: STANDALONE_STORY_ID,
				userId: 'user-1',
				projectId: 'project-1',
				slug: 'standalone',
				title: 'Standalone',
				format: 'custom',
			},
		});
		await prisma.story.create({
			data: { id: LIVE_STORY_ID, chatId: 'chat-1', slug: 'live', title: 'Live', format: 'custom', isLive: true },
		});
		await prisma.storyDataCache.create({ data: { storyId: LIVE_STORY_ID, queryData: {}, cachedAt: new Date() } });
	});

	afterAll(async () => {
		await closeBrowser();
		await app?.close();
	});

	beforeEach(async () => {
		screenshots.calls = 0;
		screenshots.brokenModes = [];
		screenshots.render = await cleanScreenshot('#ffffff');
		screenshots.darkImage = (await cleanScreenshot('#000000')).image;
		documents.modes = [];
		versionIds.current = await publishVersion();
	});

	afterEach(() => {
		vi.useRealTimers();
		queries.ids = [];
		queries.saved = [];
		themes.active = null;
	});

	it('renders a missing thumbnail in the background, then serves it', async () => {
		const story = await storyQueries.getStoryById(STORY_ID);

		expect(await getCustomStoryThumbnail(story!)).toBeNull();
		const thumbnail = await vi.waitUntil(() => getCustomStoryThumbnail(story!));

		expect(thumbnail.versionId).toBe(versionIds.current);
		expect(isWebp(thumbnail.image)).toBe(true);
		expect(documents.modes).toEqual(['light', 'dark']);
	});

	it('renders a queued version before anyone asks for it', async () => {
		queueCustomStoryThumbnail(STORY_ID, versionIds.current);

		await vi.waitUntil(() => storyFileQueries.getVersionThumbnail(versionIds.current));
		expect(screenshots.calls).toBe(2);
	});

	it('renders thumbnails for standalone custom stories', async () => {
		versionIds.current = await publishVersion(STANDALONE_STORY_ID);
		const story = await storyQueries.getStoryById(STANDALONE_STORY_ID);

		expect(await getCustomStoryThumbnail(story!)).toBeNull();
		const thumbnail = await vi.waitUntil(() => getCustomStoryThumbnail(story!));

		expect(thumbnail.versionId).toBe(versionIds.current);
		expect(screenshots.calls).toBe(2);
	});

	it('retries a broken render a few times, then never renders it again', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		screenshots.brokenModes = ['light', 'dark'];
		const story = await storyQueries.getStoryById(STORY_ID);

		for (const attempt of [1, 2, 3]) {
			await getCustomStoryThumbnail(story!);
			await vi.waitUntil(() => screenshots.calls === attempt * 2);
			await getCustomStoryThumbnail(story!);
			await settle();
			expect(screenshots.calls).toBe(attempt * 2);
			vi.setSystemTime(Date.now() + 3 * 60 * 1000);
		}
		await vi.waitUntil(async () => (await storyFileQueries.getVersionThumbnail(versionIds.current)) !== null);
		await getCustomStoryThumbnail(story!);
		await settle();

		expect(screenshots.calls).toBe(6);
		expect(await getCustomStoryThumbnail(story!)).toBeNull();
		expect(await getCustomStoryThumbnail(story!, 'dark')).toBeNull();
	});

	it('keeps the light thumbnail of a story that renders broken only in dark mode', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		screenshots.brokenModes = ['dark'];
		const story = await storyQueries.getStoryById(STORY_ID);

		const light = await vi.waitUntil(() => getCustomStoryThumbnail(story!));
		expect(light.isCurrent).toBe(false);
		for (const attempt of [2, 3]) {
			vi.setSystemTime(Date.now() + 3 * 60 * 1000);
			await getCustomStoryThumbnail(story!);
			await vi.waitUntil(() => documents.modes.filter((mode) => mode === 'dark').length === attempt);
		}
		const settled = await vi.waitUntil(async () => {
			const thumbnail = await getCustomStoryThumbnail(story!);
			return thumbnail?.isCurrent ? thumbnail : undefined;
		});

		expect(documents.modes).toEqual(['light', 'dark', 'dark', 'dark']);
		expect(settled.image).toEqual(light.image);
		expect(await getCustomStoryThumbnail(story!, 'dark')).toBeNull();
	});

	it('waits for missing query results without rendering nor giving up, and never runs a query', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		queries.ids = ['query_1'];
		const story = await storyQueries.getStoryById(STORY_ID);

		for (let attempt = 0; attempt < 5; attempt++) {
			await getCustomStoryThumbnail(story!);
			await settle();
			vi.setSystemTime(Date.now() + 3 * 60 * 1000);
		}
		expect(screenshots.calls).toBe(0);
		expect(await storyFileQueries.getVersionThumbnail(versionIds.current)).toBeNull();

		queries.saved = ['query_1'];
		await getCustomStoryThumbnail(story!);
		await vi.waitUntil(() => storyFileQueries.getVersionThumbnail(versionIds.current));
		expect(screenshots.calls).toBe(2);
	});

	it('serves the thumbnail matching the requested theme mode', async () => {
		const story = await storyQueries.getStoryById(STORY_ID);

		expect(await getCustomStoryThumbnail(story!, 'dark')).toBeNull();
		const dark = await vi.waitUntil(async () => {
			const thumbnail = await getCustomStoryThumbnail(story!, 'dark');
			return thumbnail?.isCurrent ? thumbnail : undefined;
		});
		const light = await getCustomStoryThumbnail(story!, 'light');

		expect(dark.image).not.toEqual(light!.image);
		expect(screenshots.calls).toBe(2);
	});

	it('serves the previous image after a theme change while it renders the new one', async () => {
		const story = await storyQueries.getStoryById(STORY_ID);
		await getCustomStoryThumbnail(story!);
		const before = await vi.waitUntil(() => getCustomStoryThumbnail(story!));

		themes.active = {
			light: DEFAULT_STORY_THEME,
			dark: { ...DEFAULT_DARK_STORY_THEME, accent: { ...DEFAULT_DARK_STORY_THEME.accent, color: '#ff0000' } },
		} as StoryThemePair;
		const stale = await getCustomStoryThumbnail(story!);
		const after = await vi.waitUntil(async () => {
			const thumbnail = await getCustomStoryThumbnail(story!);
			return thumbnail?.isCurrent ? thumbnail : undefined;
		});

		expect(stale).toMatchObject({ isCurrent: false, renderKey: before.renderKey });
		expect(after.renderKey).not.toBe(before.renderKey);
		expect(screenshots.calls).toBe(4);
	});

	it('renders a live story again once its data is refreshed', async () => {
		versionIds.current = await publishVersion(LIVE_STORY_ID);
		const story = await storyQueries.getStoryById(LIVE_STORY_ID);
		const before = await vi.waitUntil(async () => {
			const thumbnail = await getCustomStoryThumbnail(story!);
			return thumbnail?.isCurrent ? thumbnail : undefined;
		});

		await prisma.storyDataCache.update({
			where: { storyId: LIVE_STORY_ID },
			data: { cachedAt: new Date(Date.now() + 60_000) },
		});
		const stale = await getCustomStoryThumbnail(story!);
		const after = await vi.waitUntil(async () => {
			const thumbnail = await getCustomStoryThumbnail(story!);
			return thumbnail?.isCurrent ? thumbnail : undefined;
		});

		expect(stale?.isCurrent).toBe(false);
		expect(after.renderKey).not.toBe(before.renderKey);
		expect(screenshots.calls).toBe(4);
	});

	it('drops the thumbnail when its version is rebuilt', async () => {
		await storyFileQueries.setVersionThumbnail(versionIds.current, 'old', 'theme');

		await storyFileQueries.setVersionBundle(versionIds.current, { kind: 'react', bundle: 'rebuilt' });

		expect(await storyFileQueries.getVersionThumbnail(versionIds.current)).toBeNull();
	});
});

async function publishVersion(storyId = STORY_ID): Promise<string> {
	const count = await prisma.storyVersion.count();
	const version = await prisma.storyVersion.create({
		data: { storyId, version: count + 1, code: '', action: 'publish', source: 'assistant' },
	});
	await storyFileQueries.setVersionBundle(version.id, { kind: 'react', bundle: 'bundle' });
	return version.id;
}

async function cleanScreenshot(background: string): Promise<StoryScreenshot> {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800"><rect width="1280" height="800" fill="${background}"/></svg>`;
	const image = Buffer.from(new Resvg(svg).render().asPng());
	return { ready: true, blank: false, runtimeErrors: [], blockErrors: [], image };
}

function settle(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 50));
}

function isWebp(image: Buffer): boolean {
	return image.subarray(0, 4).toString('ascii') === 'RIFF' && image.subarray(8, 12).toString('ascii') === 'WEBP';
}
