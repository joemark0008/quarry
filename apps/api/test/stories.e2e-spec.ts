import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, resetDatabase, useTestDatabase } from './test-app.js';

const ORIGIN = 'http://localhost:3000';
const STORY_CODE = '# Revenue\n\nRevenue grew this quarter.';

/**
 * The stories GraphQL API (upstream tRPC `story.*`, `storyFolder.*`, `storyTheme.*`, `customStoryViewer.*`) on
 * Postgres: route-level coverage of the procedures' access rules, validation and results.
 */
describe('stories (e2e)', () => {
	let app: NestExpressApplication;
	let prisma: PrismaService;
	let ownerCookie: string[] = [];
	let strangerCookie: string[] = [];
	let projectId = '';
	let chatId = '';
	let storyId = '';

	beforeAll(async () => {
		const databaseUrl = useTestDatabase();
		process.env.ENABLE_USER_SIGNUP = 'true';
		process.env.QUARRY_PROJECTS_DIR = await mkdtemp(path.join(tmpdir(), 'quarry-projects-'));
		await resetDatabase(databaseUrl);
		app = await createTestApp();
		prisma = app.get(PrismaService);
		ownerCookie = await signUp('Ada', 'ada@example.com');
		strangerCookie = await signUp('Bob', 'bob@example.com');
		const project = await graphql(ownerCookie, 'mutation { createProject(input: { name: "Stories" }) { id } }');
		projectId = project.body.data.createProject.id;
		const owner = await prisma.user.findFirstOrThrow({ where: { email: 'ada@example.com' } });
		const chat = await prisma.chat.create({ data: { userId: owner.id, projectId, title: 'Revenue chat' } });
		chatId = chat.id;
	});

	afterAll(async () => {
		process.env.ENABLE_USER_SIGNUP = 'false';
		await app?.close();
	});

	const signUp = async (name: string, email: string): Promise<string[]> => {
		const res = await request(app.getHttpServer())
			.post('/api/auth/sign-up/email')
			.set('Origin', ORIGIN)
			.send({ name, email, password: 'Sup3r-secret!' })
			.expect(200);
		return [res.headers['set-cookie']].flat().filter(Boolean) as string[];
	};

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
		const res = await graphql(cookie, `${kind} ($input: JSON) { ${field}(input: $input) }`, { input });
		const error = res.body.errors?.[0];
		return { data: res.body.data?.[field], code: error?.extensions?.code, message: error?.message };
	};

	it('creates a story version from the chat and files it in the private root', async () => {
		const created = await call('mutation', 'storyCreateVersion', {
			chatId,
			storySlug: 'revenue',
			title: 'Revenue',
			code: STORY_CODE,
			action: 'create',
		});
		expect(created.code).toBeUndefined();
		expect(created.data).toMatchObject({ version: 1, code: STORY_CODE, source: 'user' });
		storyId = (created.data as { storyId: string }).storyId;

		const stories = await call('query', 'storyListStories', { chatId });
		expect(stories.data).toEqual([{ storySlug: 'revenue', title: 'Revenue', latestVersion: 1 }]);

		const items = await call('query', 'storyFolderListItems');
		expect(items.code).toBeUndefined();
		expect(JSON.stringify(items.data)).toContain(storyId);
	});

	it('reads the latest version, its versions and the story id back', async () => {
		const latest = await call('query', 'storyGetLatest', { chatId, storySlug: 'revenue' });
		expect(latest.data).toMatchObject({ title: 'Revenue', code: STORY_CODE, needsRefresh: false, theme: null });

		const versions = await call('query', 'storyListVersions', { chatId, storySlug: 'revenue' });
		expect(versions.data).toMatchObject({ id: storyId, title: 'Revenue', format: 'classic', isLive: false });

		const id = await call('query', 'storyGetIdByChatAndSlug', { chatId, storySlug: 'revenue' });
		expect(id.data).toEqual({ storyId });

		const resolved = await call('query', 'storyResolve', { storyId });
		expect(resolved.data).toMatchObject({ storyId, chatId, isOwner: true, isArchived: false, projectId });
	});

	it('lists the story among the user’s stories with its summary', async () => {
		const all = await call('query', 'storyListAll', { projectId });
		expect(all.code).toBeUndefined();
		expect(all.data).toEqual([expect.objectContaining({ id: storyId, storySlug: 'revenue', title: 'Revenue' })]);
	});

	it('renames the story, validating the title with upstream’s schema', async () => {
		const invalid = await call('mutation', 'storyRename', { storyId, title: '   ' });
		expect(invalid.code).toBe('BAD_REQUEST');

		await call('mutation', 'storyRename', { storyId, title: 'Quarterly revenue' });
		const resolved = await call('query', 'storyResolve', { storyId });
		expect(resolved.data).toMatchObject({ title: 'Quarterly revenue' });
	});

	it('certifies the story for project admins', async () => {
		const toggled = await call('mutation', 'storyToggleCertification', { storyId });
		expect(toggled.code).toBeUndefined();
		expect((toggled.data as { certifiedAt: string | null }).certifiedAt).not.toBeNull();

		const certification = await call('query', 'storyGetCertification', { storyId });
		expect(certification.data).toMatchObject({ certifiedAt: expect.any(String), certifiedByName: 'Ada' });
	});

	it('refuses an invalid refresh schedule before saving it', async () => {
		const res = await call('mutation', 'storyUpdateLiveSettings', {
			chatId,
			storySlug: 'revenue',
			isLive: true,
			isLiveTextDynamic: false,
			cacheSchedule: 'not a cron',
			cacheScheduleDescription: null,
		});
		expect(res.code).toBe('BAD_REQUEST');
		expect(res.message).toContain('Invalid cron expression');

		const saved = await call('mutation', 'storyUpdateLiveSettings', {
			chatId,
			storySlug: 'revenue',
			isLive: true,
			isLiveTextDynamic: false,
			cacheSchedule: '0 8 * * *',
			cacheScheduleDescription: 'Every day at 8am',
		});
		expect(saved.code).toBeUndefined();
		const versions = await call('query', 'storyListVersions', { chatId, storySlug: 'revenue' });
		expect(versions.data).toMatchObject({ isLive: true, cacheSchedule: '0 8 * * *' });
	});

	it('saves the delivery settings of a live story', async () => {
		const updated = await call('mutation', 'storyUpdateDelivery', {
			chatId,
			storySlug: 'revenue',
			enabled: true,
			cron: '0 9 * * 1',
			scheduleDescription: 'Mondays at 9',
			channels: ['email'],
			recipientMode: 'all',
			recipientUserIds: [],
		});
		expect(updated.code).toBeUndefined();

		const delivery = await call('query', 'storyGetDelivery', { chatId, storySlug: 'revenue' });
		expect(delivery.data).toMatchObject({ enabled: true, cron: '0 9 * * 1', recipientMode: 'all' });
	});

	it('moves the story into a new folder', async () => {
		const folder = await call('mutation', 'storyFolderCreate', { name: 'Finance', visibility: 'private' });
		expect(folder.code).toBeUndefined();
		const folderId = (folder.data as { id: string }).id;

		const moved = await call('mutation', 'storyFolderMoveStory', { storyId, folderId });
		expect(moved.code).toBeUndefined();

		const tree = await call('query', 'storyFolderListTree');
		expect(JSON.stringify(tree.data)).toContain('Finance');
	});

	it('archives and unarchives the story', async () => {
		await call('mutation', 'storyArchive', { chatId, storySlug: 'revenue' });
		const archived = await call('query', 'storyListArchived', { projectId });
		expect(archived.data).toEqual([expect.objectContaining({ id: storyId })]);

		await call('mutation', 'storyUnarchive', { chatId, storySlug: 'revenue' });
		const all = await call('query', 'storyListAll', { projectId });
		expect(all.data).toEqual([expect.objectContaining({ id: storyId })]);
	});

	it('deletes a story for good, only for its owner, and keeps the chat', async () => {
		const created = await call('mutation', 'storyCreateVersion', {
			chatId,
			storySlug: 'to-delete',
			title: 'To delete',
			code: STORY_CODE,
			action: 'create',
		});
		const deletedId = (created.data as { storyId: string }).storyId;

		const refused = await call('mutation', 'storyDeletePermanently', { storyId: deletedId }, strangerCookie);
		expect(refused.code).toBeDefined();
		expect(await prisma.story.count({ where: { id: deletedId } })).toBe(1);

		const deleted = await call('mutation', 'storyDeletePermanently', { storyId: deletedId });
		expect(deleted.code).toBeUndefined();
		expect(await prisma.story.count({ where: { id: deletedId } })).toBe(0);
		expect(await prisma.storyVersion.count({ where: { storyId: deletedId } })).toBe(0);
		expect(await prisma.chat.count({ where: { id: chatId } })).toBe(1);

		const missing = await call('mutation', 'storyDeletePermanently', { storyId: deletedId });
		expect(missing.code).toBe('NOT_FOUND');
	});

	it('asks about and forks the story into new chats (`chatFork.askStory`, `forkStory`)', async () => {
		const asked = await call('mutation', 'chatForkAskStory', { storyId, selectionText: 'Revenue grew' });
		expect(asked.code).toBeUndefined();
		expect(asked.data).toEqual({ chatId: expect.any(String), hasAttachedStoryChat: false });
		const question = await prisma.chat.findUniqueOrThrow({
			where: { id: (asked.data as { chatId: string }).chatId },
		});
		expect(question.forkMetadata).toMatchObject({
			type: 'story_question',
			id: storyId,
			selectionText: 'Revenue grew',
		});

		const forked = await call('mutation', 'chatForkForkStory', { storyId });
		expect(forked.code).toBeUndefined();
		const forkId = (forked.data as { chatId: string }).chatId;
		const forkedStories = await call('query', 'storyListStories', { chatId: forkId });
		expect(forkedStories.data).toEqual([expect.objectContaining({ storySlug: 'revenue', latestVersion: 1 })]);
	});

	it('keeps the chat’s stories to its owner', async () => {
		const res = await call('query', 'storyGetLatest', { chatId, storySlug: 'revenue' }, strangerCookie);
		expect(res.code).toBe('FORBIDDEN');

		const resolved = await call('query', 'storyResolve', { storyId }, strangerCookie);
		expect(resolved.code).toBe('NOT_FOUND');
	});

	it('resolves no project for a user outside it, as upstream `projectProtectedProcedure`', async () => {
		const res = await call('query', 'storyListStandalone', undefined, strangerCookie);
		expect(res.code).toBe('BAD_REQUEST');
	});

	it('reports no active theme while custom stories are disabled', async () => {
		const res = await call('query', 'storyThemeGetActive');
		expect(res.data).toEqual({ theme: null, thumbnailFingerprint: expect.any(String) });

		const state = await call('query', 'storyThemeGetState');
		expect(state.code).toBe('FORBIDDEN');
	});

	describe('deleting chats', () => {
		const owner = () => prisma.user.findFirstOrThrow({ where: { email: 'ada@example.com' } });
		const chatWithStory = async (slug: string, data: { isStarred?: boolean; deletedAt?: Date } = {}) => {
			const chat = await prisma.chat.create({
				data: { userId: (await owner()).id, projectId, title: slug, ...data },
			});
			const created = await call('mutation', 'storyCreateVersion', {
				chatId: chat.id,
				storySlug: slug,
				title: slug,
				code: STORY_CODE,
				action: 'create',
			});
			expect(created.code).toBeUndefined();
			return { chatId: chat.id, storyId: (created.data as { storyId: string }).storyId };
		};
		const exists = async ({ chatId: id, storyId: story }: { chatId: string; storyId: string }) => [
			await prisma.chat.count({ where: { id } }),
			await prisma.story.count({ where: { id: story } }),
		];

		it('removes one chat and its stories for its owner only', async () => {
			const target = await chatWithStory('single');
			const mutation = 'mutation ($chatId: ID!) { deleteChat(chatId: $chatId) }';

			const refused = await graphql(strangerCookie, mutation, { chatId: target.chatId });
			expect(refused.body.errors?.[0]).toBeDefined();
			expect(await exists(target)).toEqual([1, 1]);

			const deleted = await graphql(ownerCookie, mutation, { chatId: target.chatId });
			expect(deleted.body.errors).toBeUndefined();
			expect(await exists(target)).toEqual([0, 0]);
		});

		it('removes non-starred chats and their stories from the database, and keeps starred ones', async () => {
			const plain = await chatWithStory('plain');
			const hidden = await chatWithStory('hidden', { deletedAt: new Date() });
			const starred = await chatWithStory('starred', { isStarred: true });

			const res = await graphql(ownerCookie, 'mutation { deleteAllNonStarredChats }');
			expect(res.body.errors).toBeUndefined();
			expect(res.body.data.deleteAllNonStarredChats).toBeGreaterThanOrEqual(2);

			expect(await exists(plain)).toEqual([0, 0]);
			expect(await exists(hidden)).toEqual([0, 0]);
			expect(await exists(starred)).toEqual([1, 1]);
		});
	});
});
