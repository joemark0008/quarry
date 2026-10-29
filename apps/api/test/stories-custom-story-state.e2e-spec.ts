import type { INestApplication } from '@nestjs/common';
import { MAX_STORY_STATE_KEYS } from '@quarry/shared/story-app';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { PrismaService } from '../src/prisma/prisma.service.js';
import { CustomStoryNotFoundError } from '../src/stories/services/custom-story.js';
import {
	getCustomStoryState,
	getUnattendedCustomStoryState,
	InvalidStoryStateError,
	setCustomStoryState,
} from '../src/stories/services/custom-story-state.js';
import { createStoriesTestApp } from './stories-test-module.js';

/** Port of upstream `tests/custom-story-state.test.ts` on Postgres. */

let app: INestApplication;
let prisma: PrismaService;

const CHAT = 'chat-1';
const SLUG = 'gauges';
const OWNER = 'owner';
const VIEWER = 'viewer';

function set(viewerId: string, key: string, value: unknown) {
	return setCustomStoryState(CHAT, SLUG, viewerId, { key, value, shared: false });
}

function setShared(viewerId: string, key: string, value: unknown) {
	return setCustomStoryState(CHAT, SLUG, viewerId, { key, value, shared: true });
}

describe('custom story state', () => {
	beforeAll(async () => {
		({ app, prisma } = await createStoriesTestApp());
		await prisma.user.createMany({
			data: [
				{ id: OWNER, name: 'Sarah', email: 'owner@example.com' },
				{ id: VIEWER, name: 'Viewer', email: 'viewer@example.com' },
			],
		});
		await prisma.project.create({
			data: { id: 'project-1', name: 'Project', type: 'local', path: '/tmp/project' },
		});
		await prisma.chat.create({ data: { id: CHAT, projectId: 'project-1', userId: OWNER, title: 'Chat' } });
		await prisma.story.createMany({
			data: [
				{ id: 'story-1', chatId: CHAT, slug: SLUG, title: 'Gauges', format: 'custom' },
				{ id: 'story-2', chatId: CHAT, slug: 'report', title: 'Report', format: 'classic' },
			],
		});
	});

	afterAll(async () => {
		await app?.close();
	});

	beforeEach(async () => {
		await prisma.storyAppState.deleteMany();
	});

	it("keeps each viewer's personal state to themselves, owner included", async () => {
		await set(OWNER, 'churn', 40);
		await set(VIEWER, 'churn', 70);

		expect(await getCustomStoryState(CHAT, SLUG, OWNER)).toEqual({ shared: {}, own: { churn: 40 } });
		expect(await getCustomStoryState(CHAT, SLUG, VIEWER)).toEqual({ shared: {}, own: { churn: 70 } });
	});

	it('lets every viewer read and write the shared state', async () => {
		await setShared(OWNER, 'score', 1);
		await setShared(VIEWER, 'score', 2);

		expect((await getCustomStoryState(CHAT, SLUG, OWNER)).shared).toEqual({ score: 2 });
		expect((await getCustomStoryState(CHAT, SLUG, VIEWER)).shared).toEqual({ score: 2 });
	});

	it('overwrites a key and removes it on null', async () => {
		await set(OWNER, 'slide', 2);
		await set(OWNER, 'slide', 5);
		expect((await getCustomStoryState(CHAT, SLUG, OWNER)).own).toEqual({ slide: 5 });

		await set(OWNER, 'slide', null);
		expect((await getCustomStoryState(CHAT, SLUG, OWNER)).own).toEqual({});
		expect(await prisma.storyAppState.count()).toBe(0);
	});

	it('refuses invalid keys and values that are too large', async () => {
		await expect(set(OWNER, '../escape', 1)).rejects.toBeInstanceOf(InvalidStoryStateError);
		await expect(set(OWNER, 'big', 'x'.repeat(40 * 1024))).rejects.toBeInstanceOf(InvalidStoryStateError);
	});

	it('caps the number of keys per viewer but still lets existing ones change', async () => {
		for (let index = 0; index < MAX_STORY_STATE_KEYS; index++) {
			await set(OWNER, `key-${index}`, index);
		}

		await expect(set(OWNER, 'one-more', 1)).rejects.toBeInstanceOf(InvalidStoryStateError);
		await expect(set(OWNER, 'key-0', 'updated')).resolves.toBeUndefined();
		await expect(set(VIEWER, 'one-more', 1)).resolves.toBeUndefined();
	});

	it("renders unattended exports with the shared state only, never someone's own", async () => {
		await setShared(OWNER, 'round', 3);
		await set(OWNER, 'churn', 70);

		expect(await getUnattendedCustomStoryState(CHAT, SLUG)).toEqual({ shared: { round: 3 }, own: {} });
	});

	it('only applies to custom stories', async () => {
		await expect(getCustomStoryState(CHAT, 'report', OWNER)).rejects.toBeInstanceOf(CustomStoryNotFoundError);
		await expect(
			setCustomStoryState(CHAT, 'report', OWNER, { key: 'a', value: 1, shared: false }),
		).rejects.toBeInstanceOf(CustomStoryNotFoundError);
	});
});
