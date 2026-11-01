import 'reflect-metadata';

import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { JobsService } from '../src/jobs/jobs.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { StoryFavoritesModule } from '../src/stories/favorites/story-favorites.module.js';
import { StoryFeedbackModule } from '../src/stories/feedback/story-feedback.module.js';
import { STORY_BLOB_CLEANUP_JOB_NAME } from '../src/stories/jobs/story-blob-cleanup.handler.js';
import { StoryJobsModule } from '../src/stories/jobs/story-jobs.module.js';
import { STORY_REFRESH_JOB_NAME, storyRefreshScheduleKey } from '../src/stories/services/story-schedule.js';
import { createTestUser, resetDatabase, useTestDatabase } from './test-app.js';

const STORY_CODE = '# Revenue\n\nRevenue grew this quarter.';

async function waitFor<T>(check: () => Promise<T | undefined>, timeoutMs = 20_000): Promise<T> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const value = await check();
		if (value !== undefined) {
			return value;
		}
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
	throw new Error('Timed out');
}

/**
 * Phase 4 stage 3b on Postgres and pg-boss: saving a live story's schedule creates its pg-boss schedule, the
 * `story.refresh` job runs to completion (activity row, delivery on refresh), and the favorites and story feedback
 * GraphQL fields (upstream `trpc.favorite.*`, `trpc.feedback.*StoryFeedback`).
 */
describe('story jobs, favorites and story feedback (e2e)', () => {
	let app: NestExpressApplication;
	let prisma: PrismaService;
	let jobs: JobsService;
	let ownerCookie: string[] = [];
	let memberCookie: string[] = [];
	let strangerCookie: string[] = [];
	let projectId = '';
	let chatId = '';
	let storyId = '';
	let ownerId = '';
	let memberId = '';

	beforeAll(async () => {
		const databaseUrl = useTestDatabase();
		process.env.QUARRY_PROJECTS_DIR = await mkdtemp(path.join(tmpdir(), 'quarry-projects-'));
		await resetDatabase(databaseUrl);
		// The story modules as app.module.ts imports them (importing them again here is harmless once it does).
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule, StoryJobsModule, StoryFavoritesModule, StoryFeedbackModule],
		}).compile();
		app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false, logger: ['error'] });
		configureApp(app);
		await app.init();
		prisma = app.get(PrismaService);
		jobs = app.get(JobsService);

		ownerCookie = await signUp('Ada', 'ada@example.com');
		memberCookie = await signUp('Grace', 'grace@example.com');
		strangerCookie = await signUp('Bob', 'bob@example.com');
		const project = await graphql(ownerCookie, 'mutation { createProject(input: { name: "Jobs" }) { id } }');
		projectId = project.body.data.createProject.id;
		ownerId = (await prisma.user.findFirstOrThrow({ where: { email: 'ada@example.com' } })).id;
		memberId = (await prisma.user.findFirstOrThrow({ where: { email: 'grace@example.com' } })).id;
		await prisma.projectMember.create({ data: { projectId, userId: memberId, role: 'user' } });
		const chat = await prisma.chat.create({ data: { userId: ownerId, projectId, title: 'Revenue chat' } });
		chatId = chat.id;

		const created = await call('mutation', 'storyCreateVersion', {
			chatId,
			storySlug: 'revenue',
			title: 'Revenue',
			code: STORY_CODE,
			action: 'create',
		});
		storyId = (created.data as { storyId: string }).storyId;
	});

	afterAll(async () => {
		if (jobs && storyId) {
			await jobs
				.getBoss()
				.unschedule(STORY_REFRESH_JOB_NAME, storyRefreshScheduleKey(storyId))
				.catch(() => undefined);
		}
		await app?.close();
	});

	const signUp = async (name: string, email: string): Promise<string[]> =>
		(await createTestUser(app, { name, email, password: 'Sup3r-secret!' })).cookie;

	const graphql = (cookie: string[], query: string, variables: Record<string, unknown> = {}) =>
		request(app.getHttpServer())
			.post('/graphql')
			.set('Cookie', cookie)
			.set(projectId ? { 'x-quarry-project-id': projectId } : {})
			.send({ query, variables });

	const call = async (
		kind: 'query' | 'mutation',
		field: string,
		input?: unknown,
		cookie: string[] = ownerCookie,
	): Promise<{ data: unknown; code?: string; message?: string }> => {
		const res = await graphql(
			cookie,
			input === undefined ? `${kind} { ${field} }` : `${kind} ($input: JSON) { ${field}(input: $input) }`,
			input === undefined ? {} : { input },
		);
		const error = res.body.errors?.[0];
		return { data: res.body.data?.[field], code: error?.extensions?.code, message: error?.message };
	};

	describe('story jobs', () => {
		it('registers the story queues and the nightly blob cleanup', async () => {
			const schedules = await jobs.getBoss().getSchedules(STORY_BLOB_CLEANUP_JOB_NAME);
			expect(schedules).toEqual([expect.objectContaining({ cron: '30 4 * * *', timezone: 'UTC' })]);
		});

		it('creates a pg-boss refresh schedule when the story goes live on a cron', async () => {
			const saved = await call('mutation', 'storyUpdateLiveSettings', {
				chatId,
				storySlug: 'revenue',
				isLive: true,
				isLiveTextDynamic: false,
				cacheSchedule: '0 * * * *',
				cacheScheduleDescription: 'Every hour',
			});
			expect(saved.code).toBeUndefined();

			const schedules = await jobs
				.getBoss()
				.getSchedules(STORY_REFRESH_JOB_NAME, storyRefreshScheduleKey(storyId));
			expect(schedules).toEqual([
				expect.objectContaining({ cron: '0 * * * *', data: { storyId }, key: `story-refresh-${storyId}` }),
			]);
		});

		it('delivers the story to its recipients on refresh', async () => {
			const delivery = await call('mutation', 'storyUpdateDelivery', {
				chatId,
				storySlug: 'revenue',
				enabled: true,
				cron: null,
				scheduleDescription: null,
				channels: ['in_app', 'email'],
				recipientMode: 'specific',
				recipientUserIds: [memberId],
			});
			expect(delivery.code).toBeUndefined();
		});

		it('runs the scheduled refresh job to completion', async () => {
			// The job a schedule tick sends (pg-boss crons fire at most once a minute).
			const id = await jobs.send(STORY_REFRESH_JOB_NAME, { storyId });
			expect(id).toBeTruthy();

			const job = await waitFor(async () => {
				const found = await jobs.getBoss().getJobById(STORY_REFRESH_JOB_NAME, id!);
				return found?.state === 'completed' || found?.state === 'failed' ? found : undefined;
			});
			expect(job.state).toBe('completed');

			const activity = await prisma.activity.findFirstOrThrow({ where: { storyId, type: 'story.refreshed' } });
			expect(activity).toMatchObject({
				status: 'completed',
				trigger: 'schedule',
				userId: ownerId,
				payload: { queriesRefreshed: 0 },
			});

			// Delivery on refresh: an in-app notification for the recipient, who can now open the story.
			const notifications = await prisma.notification.findMany({ where: { userId: memberId } });
			expect(notifications).toEqual([
				expect.objectContaining({
					category: 'story_refresh',
					title: 'Revenue',
					linkUrl: `/stories/${storyId}`,
					projectId,
				}),
			]);
			expect(await prisma.sharedStory.count({ where: { storyId } })).toBe(1);
			const resolved = await call('query', 'storyResolve', { storyId }, memberCookie);
			expect(resolved.code).toBeUndefined();
		});

		it('removes the schedule when the story stops being live', async () => {
			await call('mutation', 'storyUpdateLiveSettings', {
				chatId,
				storySlug: 'revenue',
				isLive: false,
				isLiveTextDynamic: false,
				cacheSchedule: null,
				cacheScheduleDescription: null,
			});
			const schedules = await jobs
				.getBoss()
				.getSchedules(STORY_REFRESH_JOB_NAME, storyRefreshScheduleKey(storyId));
			expect(schedules).toEqual([]);
		});
	});

	describe('favorites', () => {
		it('toggles a favorite story and lists it', async () => {
			const on = await call('mutation', 'favoriteToggle', { type: 'story', id: storyId });
			expect(on).toMatchObject({ data: { isFavorited: true } });

			const list = await call('query', 'favoriteList');
			expect(list.data).toEqual({ storyIds: [storyId], folderIds: [] });

			const off = await call('mutation', 'favoriteToggle', { type: 'story', id: storyId });
			expect(off.data).toEqual({ isFavorited: false });
			expect((await call('query', 'favoriteList')).data).toEqual({ storyIds: [], folderIds: [] });
		});

		it('favorites a folder, but not someone else’s private folder', async () => {
			const created = await call('mutation', 'storyFolderCreate', { name: 'Finance' });
			expect(created.code).toBeUndefined();
			const folderId = (created.data as { id: string }).id;
			await prisma.storyFolder.update({ where: { id: folderId }, data: { visibility: 'private' } });

			const on = await call('mutation', 'favoriteToggle', { type: 'folder', id: folderId });
			expect(on.data).toEqual({ isFavorited: true });
			expect((await call('query', 'favoriteList')).data).toEqual({ storyIds: [], folderIds: [folderId] });

			const other = await call('mutation', 'favoriteToggle', { type: 'folder', id: folderId }, memberCookie);
			expect(other).toMatchObject({ code: 'NOT_FOUND', message: 'Folder not found.' });
		});

		it('refuses stories the user cannot open and invalid targets', async () => {
			const otherChat = await prisma.chat.create({ data: { userId: ownerId, projectId, title: 'Private' } });
			const privateStory = await prisma.story.create({
				data: { chatId: otherChat.id, slug: 'private', title: 'Private', projectId, userId: ownerId },
			});
			const denied = await call(
				'mutation',
				'favoriteToggle',
				{ type: 'story', id: privateStory.id },
				memberCookie,
			);
			expect(denied).toMatchObject({ code: 'FORBIDDEN', message: 'You do not have access to this story.' });

			const invalid = await call('mutation', 'favoriteToggle', { type: 'chat', id: storyId });
			expect(invalid.code).toBe('BAD_REQUEST');

			const stranger = await call('query', 'favoriteList', undefined, strangerCookie);
			expect(stranger.code).toBeDefined();
			expect(stranger.data ?? null).toBeNull();
		});
	});

	describe('story feedback', () => {
		it('saves a reader’s vote, updates it, and notifies the owner', async () => {
			expect((await call('query', 'feedbackGetStoryFeedback', { storyId }, memberCookie)).data).toBeNull();

			const submitted = await call(
				'mutation',
				'feedbackSubmitStoryFeedback',
				{ storyId, vote: 'down', explanation: '  Numbers look off  ' },
				memberCookie,
			);
			expect(submitted.code).toBeUndefined();
			expect(submitted.data).toMatchObject({
				storyId,
				userId: memberId,
				vote: 'down',
				explanation: 'Numbers look off',
			});

			const updated = await call(
				'mutation',
				'feedbackSubmitStoryFeedback',
				{ storyId, vote: 'up' },
				memberCookie,
			);
			expect(updated.data).toMatchObject({ vote: 'up', explanation: null });
			const read = await call('query', 'feedbackGetStoryFeedback', { storyId }, memberCookie);
			expect(read.data).toMatchObject({ storyId, userId: memberId, vote: 'up' });
			expect(await prisma.storyFeedback.count({ where: { storyId } })).toBe(1);

			const ownerNotifications = await waitFor(async () => {
				const rows = await prisma.notification.findMany({ where: { userId: ownerId, category: 'feedback' } });
				return rows.length === 2 ? rows : undefined;
			});
			expect(ownerNotifications.map((row) => row.title).sort()).toEqual([
				'Negative feedback on your story',
				'Positive feedback on your story',
			]);
		});

		it('keeps each user’s feedback separate and does not notify owners of their own', async () => {
			expect((await call('query', 'feedbackGetStoryFeedback', { storyId })).data).toBeNull();
			const own = await call('mutation', 'feedbackSubmitStoryFeedback', { storyId, vote: 'up' });
			expect(own.code).toBeUndefined();
			expect(await prisma.storyFeedback.count({ where: { storyId } })).toBe(2);
			await new Promise((resolve) => setTimeout(resolve, 200));
			expect(await prisma.notification.count({ where: { userId: ownerId, category: 'feedback' } })).toBe(2);
		});

		it('validates the vote and hides stories the user cannot open', async () => {
			const invalid = await call('mutation', 'feedbackSubmitStoryFeedback', { storyId, vote: 'meh' });
			expect(invalid.code).toBe('BAD_REQUEST');

			const tooLong = await call('mutation', 'feedbackSubmitStoryFeedback', {
				storyId,
				vote: 'up',
				explanation: 'x'.repeat(2001),
			});
			expect(tooLong.code).toBe('BAD_REQUEST');

			const missing = await call('query', 'feedbackGetStoryFeedback', { storyId: 'nope' });
			expect(missing).toMatchObject({ code: 'NOT_FOUND', message: 'Story not found.' });

			const stranger = await call('query', 'feedbackGetStoryFeedback', { storyId }, strangerCookie);
			expect(stranger.code).toBeDefined();
			expect(stranger.data ?? null).toBeNull();
		});
	});
});
