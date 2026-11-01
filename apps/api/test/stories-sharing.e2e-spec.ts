import 'reflect-metadata';

import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { Resvg } from '@resvg/resvg-js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { generateEmbedToken } from '../src/stories/sharing/embed-token.js';
import { closeBrowser, getBrowser } from '../src/stories/utils/headless-browser.js';
import { storyThemeFingerprint } from '../src/stories/utils/story-theme-fingerprint.js';
import { createTestUser, resetDatabase, useTestDatabase } from './test-app.js';

const STORY_CODE = '# Orders\n\nOrders by status.\n\n<table query_id="query_orders" title="Orders by status" />';

const isChromeAvailable = await getBrowser().then(
	() => true,
	() => false,
);

/**
 * Story sharing on Postgres through HTTP: `GET /api/stories/:storyId/thumbnail` serves the stored WebP, the embed
 * routes (`GET /api/embed/story/:storyId/download`, GraphQL `embed*`) answer to a valid token, and `sharedStory*`
 * shares a story with the project.
 */
describe('story sharing (e2e)', () => {
	let app: NestExpressApplication;
	let prisma: PrismaService;
	let ownerCookie: string[] = [];
	let strangerCookie: string[] = [];
	let projectId = '';
	let chatId = '';
	let storyId = '';
	let customStoryId = '';
	const lightImage = webpLike('#ffffff');

	beforeAll(async () => {
		const databaseUrl = useTestDatabase();
		process.env.QUARRY_PROJECTS_DIR = await mkdtemp(path.join(tmpdir(), 'quarry-projects-'));
		await resetDatabase(databaseUrl);
		const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
		app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false, logger: ['error'] });
		configureApp(app);
		await app.init();
		prisma = app.get(PrismaService);

		ownerCookie = await signUp('Ada', 'ada@example.com');
		strangerCookie = await signUp('Bob', 'bob@example.com');
		const project = await graphql(ownerCookie, 'mutation { createProject(input: { name: "Sharing" }) { id } }');
		projectId = project.body.data.createProject.id;
		await prisma.project.update({ where: { id: projectId }, data: { mcpEndpointSettings: { enabled: true } } });
		const owner = await prisma.user.findFirstOrThrow({ where: { email: 'ada@example.com' } });
		const chat = await prisma.chat.create({ data: { userId: owner.id, projectId, title: 'Orders chat' } });
		chatId = chat.id;

		const created = await call('mutation', 'storyCreateVersion', {
			chatId,
			storySlug: 'orders',
			title: 'Orders',
			code: STORY_CODE,
			action: 'create',
		});
		storyId = (created.data as { storyId: string }).storyId;

		const custom = await prisma.story.create({
			data: { chatId, slug: 'dashboard', title: 'Dashboard', format: 'custom' },
		});
		customStoryId = custom.id;
		const version = await prisma.storyVersion.create({
			data: { storyId: customStoryId, version: 1, code: '', action: 'publish', source: 'assistant' },
		});
		await prisma.storyBundle.create({
			data: {
				storyVersionId: version.id,
				kind: 'react',
				bundle: 'bundle',
				thumbnail: JSON.stringify({
					light: lightImage.toString('base64'),
					dark: lightImage.toString('base64'),
				}),
				thumbnailTheme: storyThemeFingerprint(null),
			},
		});
	});

	afterAll(async () => {
		await closeBrowser();
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
		const res = await graphql(cookie, `${kind} ($input: JSON) { ${field}(input: $input) }`, { input });
		const error = res.body.errors?.[0];
		return { data: res.body.data?.[field], code: error?.extensions?.code, message: error?.message };
	};

	it('serves the stored thumbnail of a custom story as WebP, with an ETag', async () => {
		const res = await request(app.getHttpServer())
			.get(`/api/stories/${customStoryId}/thumbnail`)
			.set('Cookie', ownerCookie)
			.buffer(true)
			.parse((response, done) => {
				const chunks: Buffer[] = [];
				response.on('data', (chunk: Buffer) => chunks.push(chunk));
				response.on('end', () => done(null, Buffer.concat(chunks)));
			})
			.expect(200);

		expect(res.headers['content-type']).toBe('image/webp');
		expect(Buffer.compare(res.body as Buffer, lightImage)).toBe(0);

		await request(app.getHttpServer())
			.get(`/api/stories/${customStoryId}/thumbnail?mode=dark`)
			.set('Cookie', ownerCookie)
			.set('If-None-Match', res.headers.etag as string)
			.expect(304);
	});

	it('hides thumbnails from users without access, and refuses non-custom stories and bad modes', async () => {
		await request(app.getHttpServer())
			.get(`/api/stories/${customStoryId}/thumbnail`)
			.set('Cookie', strangerCookie)
			.expect(404);
		await request(app.getHttpServer())
			.get(`/api/stories/${storyId}/thumbnail`)
			.set('Cookie', ownerCookie)
			.expect(404);
		await request(app.getHttpServer())
			.get(`/api/stories/${customStoryId}/thumbnail?mode=sepia`)
			.set('Cookie', ownerCookie)
			.expect(400);
		await request(app.getHttpServer()).get(`/api/stories/${customStoryId}/thumbnail`).expect(401);
	});

	it('downloads an embedded story as HTML with a valid token, without a session', async () => {
		const token = generateEmbedToken('story', storyId, projectId);
		const res = await request(app.getHttpServer())
			.get(`/api/embed/story/${storyId}/download`)
			.query({ token, format: 'html' })
			.expect(200);

		expect(res.headers['content-type']).toContain('text/html');
		expect(res.headers['content-disposition']).toMatch(/^attachment; filename="orders-\d{4}-\d{2}-\d{2}\.html"$/);
		expect(res.text).toContain('Orders by status');
	});

	it.skipIf(!isChromeAvailable)('downloads an embedded story as a PDF', { timeout: 60_000 }, async () => {
		const token = generateEmbedToken('story', storyId, projectId);
		const res = await request(app.getHttpServer())
			.get(`/api/embed/story/${storyId}/download`)
			.query({ token, format: 'pdf' })
			.buffer(true)
			.parse((response, done) => {
				const chunks: Buffer[] = [];
				response.on('data', (chunk: Buffer) => chunks.push(chunk));
				response.on('end', () => done(null, Buffer.concat(chunks)));
			})
			.expect(200);

		expect(res.headers['content-type']).toBe('application/pdf');
		expect((res.body as Buffer).subarray(0, 5).toString('ascii')).toBe('%PDF-');
	});

	it('refuses embed downloads with a bad or mismatched token', async () => {
		await request(app.getHttpServer())
			.get(`/api/embed/story/${storyId}/download`)
			.query({ token: 'not-a-token', format: 'html' })
			.expect(401);
		await request(app.getHttpServer())
			.get(`/api/embed/story/${customStoryId}/download`)
			.query({ token: generateEmbedToken('story', storyId, projectId), format: 'html' })
			.expect(401);
	});

	it('loads an embedded story through GraphQL with its token', async () => {
		const token = generateEmbedToken('story', storyId, projectId);
		const res = await graphql([], 'query ($input: JSON) { embedGetStory(input: $input) }', {
			input: { storyId, token },
		});

		expect(res.body.errors).toBeUndefined();
		expect(res.body.data.embedGetStory).toMatchObject({ id: storyId, title: 'Orders', code: STORY_CODE });
	});

	it('shares a story with the project, which then lists it for the members', async () => {
		const shared = await call('mutation', 'sharedStoryCreate', { chatId, storySlug: 'orders' });
		expect(shared).toMatchObject({ data: { storyId } });

		const info = await call('query', 'sharedStoryGetSharedStoryInfo', { chatId, storySlug: 'orders' });
		expect(info.data).toMatchObject({ isShared: true, storyId, visibility: 'project' });

		const list = await call('query', 'sharedStoryList', { projectId });
		expect(list.data).toEqual([expect.objectContaining({ storyId, title: 'Orders' })]);

		const outsider = await call('query', 'sharedStoryGet', { storyId }, strangerCookie);
		expect(outsider.code).toBe('FORBIDDEN');

		expect(await call('mutation', 'sharedStoryDelete', { storyId })).toMatchObject({ data: null });
		expect(await prisma.sharedStory.count()).toBe(0);
	});

	it('downloads a chat story as HTML through GraphQL', async () => {
		const download = await call('query', 'storyDownload', { chatId, storySlug: 'orders', format: 'html' });

		expect(download.code).toBeUndefined();
		const { data, mimeType } = download.data as { data: string; mimeType: string };
		expect(mimeType).toBe('text/html');
		expect(Buffer.from(data, 'base64').toString()).toContain('Orders by status');
	});
});

/** A small image standing in for a rendered thumbnail (the route serves the stored bytes as they are). */
function webpLike(background: string): Buffer {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="40"><rect width="64" height="40" fill="${background}"/></svg>`;
	return Buffer.from(new Resvg(svg).render().asPng());
}
