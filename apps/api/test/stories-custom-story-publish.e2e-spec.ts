import type { INestApplication } from '@nestjs/common';
import type { Tool } from 'ai';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import storyTool from '../src/agent/tools/story.js';
import type { ToolContext } from '../src/agent/types/tools.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { StoryFileRepository } from '../src/stories/repositories/story-file.repository.js';
import { createStoriesTestApp } from './stories-test-module.js';

/**
 * Port of upstream `tests/custom-story-publish.test.ts` on Postgres. Custom stories are enabled through
 * `BETA_CUSTOM_STORIES_ENABLED` (upstream mocked `isCustomStoriesEnabled`); every user has `customStoryCreation`.
 */

let app: INestApplication;
let prisma: PrismaService;
let storyFiles: StoryFileRepository;

const onBuild = vi.hoisted(() => ({ current: async () => {} }));
vi.mock('../src/stories/services/story-app-build.js', () => ({
	buildStoryApp: async () => {
		await onBuild.current();
		return { ok: true, app: { kind: 'react', bundle: 'bundle' }, entry: 'app.tsx' };
	},
}));

const STORY_ID = 'story-1';

describe('publishing a custom story', () => {
	beforeAll(async () => {
		process.env.BETA_CUSTOM_STORIES_ENABLED = 'true';
		({ app, prisma } = await createStoriesTestApp());
		storyFiles = app.get(StoryFileRepository);
		await prisma.user.create({ data: { id: 'user-1', name: 'User', email: 'user@example.com' } });
		await prisma.project.create({
			data: { id: 'project-1', name: 'Project', type: 'local', path: '/tmp/project' },
		});
		await prisma.chat.create({ data: { id: 'chat-1', projectId: 'project-1', userId: 'user-1', title: 'Chat' } });
		await prisma.story.create({
			data: { id: STORY_ID, chatId: 'chat-1', slug: 'revenue', title: 'Revenue', format: 'custom' },
		});
	});

	afterAll(async () => {
		delete process.env.BETA_CUSTOM_STORIES_ENABLED;
		await app?.close();
	});

	beforeEach(async () => {
		onBuild.current = async () => {};
		await prisma.storyVersion.deleteMany();
		await prisma.storyDraftFile.deleteMany();
		await storyFiles.writeDraftFile(STORY_ID, { path: 'app.jsx', content: 'export default () => null;' });
	});

	it('publishes the draft it built, with its bundle', async () => {
		const output = await publish();

		expect(output).toMatchObject({ success: true, version: 1 });
		expect(await prisma.storyBundle.count()).toBe(1);
		expect(await prisma.storyFolderItem.count()).toBe(1);
	});

	it('refuses to publish when the draft changes during the build', async () => {
		onBuild.current = async () => {
			await storyFiles.writeDraftFile(STORY_ID, { path: 'app.jsx', content: 'export default () => 1;' });
		};

		const output = await publish();

		expect(output).toMatchObject({ success: false, error: expect.stringContaining('draft changed') });
		expect(await prisma.storyVersion.count()).toBe(0);
	});
});

function publish() {
	const tool = storyTool as Tool<{ action: 'publish'; id: string }, { success: boolean }>;
	return tool.execute!({ action: 'publish', id: 'revenue' }, {
		experimental_context: {
			chatId: 'chat-1',
			userId: 'user-1',
			projectId: 'project-1',
			userGroupFeatures: ['storyCreation', 'customStoryCreation'],
			generatedArtifacts: { stories: [] },
		} as unknown as ToolContext,
	} as Parameters<NonNullable<typeof tool.execute>>[1]);
}
