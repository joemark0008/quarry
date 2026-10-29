import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppDbRepository } from '../src/agent/app-db/app-db.repository.js';
import { validateAppDbQuery } from '../src/agent/utils/app-db-allowlist.js';
import { explainAppDbError } from '../src/agent/utils/app-db-errors.js';
import { ConfigModule } from '../src/config/config.module.js';
import { PrismaModule } from '../src/prisma/prisma.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { resetDatabase, useTestDatabase } from './test-app.js';

/**
 * Ports of upstream `tests/readonly-app-db.test.ts` and the DB-backed cases of `tests/query-app-db.test.ts`,
 * against the e2e Postgres database instead of SQLite.
 */

const ORG_ID = 'ro-test-org';
const USER_ID = 'ro-test-user';
const PROJECT_A = 'ro-test-project-a';
const PROJECT_B = 'ro-test-project-b';
const PART_A_TIME = new Date('2024-06-23T08:15:00Z');
const REVIEWER_ID = 'ro-test-reviewer';

let app: INestApplication;
let prisma: PrismaService;
let repository: AppDbRepository;
let databaseUrl: string;

/** Mirrors upstream `queryAppDb(projectId, sql)`: validate, run, explain the database error. */
async function queryAppDb(projectId: string, sql: string) {
	const verdict = await validateAppDbQuery(sql);
	if (!verdict.ok) {
		throw new Error(verdict.reason ?? 'Query rejected.');
	}
	try {
		const { columns, rows } = await repository.runScopedAppDbQuery(projectId, sql);
		return { _version: '1' as const, columns, rows, rowCount: rows.length };
	} catch (error) {
		throw new Error(explainAppDbError(error), { cause: error });
	}
}

async function seed() {
	await prisma.organization.create({ data: { id: ORG_ID, name: 'RO', slug: 'ro-test-org' } });
	await prisma.user.create({ data: { id: USER_ID, name: 'RO', email: 'ro@example.com' } });
	await prisma.project.createMany({
		data: [
			{ id: PROJECT_A, orgId: ORG_ID, name: 'A', type: 'local', path: '/tmp/ro-a' },
			{ id: PROJECT_B, orgId: ORG_ID, name: 'B', type: 'local', path: '/tmp/ro-b' },
		],
	});
	await prisma.chat.createMany({
		data: [
			{ id: 'ro-chat-a', userId: USER_ID, projectId: PROJECT_A, title: 'A chat' },
			{ id: 'ro-chat-b', userId: USER_ID, projectId: PROJECT_B, title: 'B chat' },
		],
	});
	await prisma.chatMessage.createMany({
		data: [
			{ id: 'ro-msg-a', chatId: 'ro-chat-a', role: 'user' },
			{ id: 'ro-msg-b', chatId: 'ro-chat-b', role: 'user' },
		],
	});
	await prisma.messagePart.createMany({
		data: [
			{ id: 'ro-part-a', messageId: 'ro-msg-a', order: 0, type: 'text', text: 'hello a', createdAt: PART_A_TIME },
			{ id: 'ro-part-b', messageId: 'ro-msg-b', order: 0, type: 'text', text: 'hello b' },
		],
	});
}

beforeAll(async () => {
	databaseUrl = useTestDatabase();
	const moduleRef = await Test.createTestingModule({
		imports: [ConfigModule, PrismaModule],
		providers: [AppDbRepository],
	}).compile();
	app = moduleRef.createNestApplication({ logger: ['error'] });
	await app.init();
	prisma = app.get(PrismaService);
	repository = app.get(AppDbRepository);
});

afterAll(async () => {
	await app?.close();
});

beforeEach(async () => {
	await resetDatabase(databaseUrl);
	await seed();
});

describe('runScopedAppDbQuery', () => {
	it('returns only the scoped project rows', async () => {
		const { rows } = await repository.runScopedAppDbQuery(PROJECT_A, 'SELECT chat_id, title FROM v_messages');
		expect(rows.map((r) => r.chat_id)).toEqual(['ro-chat-a']);
	});

	it('does not leak another project', async () => {
		const { rows } = await repository.runScopedAppDbQuery(PROJECT_B, 'SELECT chat_id FROM v_messages');
		expect(rows.map((r) => r.chat_id)).toEqual(['ro-chat-b']);
	});

	// Upstream's case uses SQLite's date()/datetime(); this is the Postgres equivalent.
	it('exposes timestamps as datetimes the date functions accept', async () => {
		const { rows } = await repository.runScopedAppDbQuery(
			PROJECT_A,
			"SELECT date_trunc('day', created_at) AS day FROM v_messages WHERE created_at >= '2024-06-01'",
		);
		expect(rows).toEqual([{ day: '2024-06-23T00:00:00.000Z' }]);
	});

	it('does not expose PII columns (email is not on the view)', async () => {
		await expect(repository.runScopedAppDbQuery(PROJECT_A, 'SELECT email FROM v_messages')).rejects.toThrow();
	});

	it('exposes story feedback scoped to the story project, with the owner and the reviewer', async () => {
		await prisma.user.create({ data: { id: REVIEWER_ID, name: 'Reviewer', email: 'reviewer@example.com' } });
		await prisma.story.createMany({
			data: [
				{ id: 'ro-story-a', chatId: 'ro-chat-a', slug: 'a', title: 'Chat story' },
				{ id: 'ro-story-b', projectId: PROJECT_B, userId: USER_ID, slug: 'b', title: 'Standalone story' },
			],
		});
		await prisma.storyFeedback.createMany({
			data: [
				{ storyId: 'ro-story-a', userId: REVIEWER_ID, vote: 'down', explanation: 'Wrong totals' },
				{ storyId: 'ro-story-b', userId: REVIEWER_ID, vote: 'up' },
			],
		});

		const projectA = await repository.runScopedAppDbQuery(
			PROJECT_A,
			'SELECT story_id, story_title, story_owner_name, user_name, vote, explanation FROM v_story_feedback',
		);
		const projectB = await repository.runScopedAppDbQuery(PROJECT_B, 'SELECT story_id, vote FROM v_story_feedback');

		expect(projectA.rows).toEqual([
			{
				story_id: 'ro-story-a',
				story_title: 'Chat story',
				story_owner_name: 'RO',
				user_name: 'Reviewer',
				vote: 'down',
				explanation: 'Wrong totals',
			},
		]);
		expect(projectB.rows).toEqual([{ story_id: 'ro-story-b', vote: 'up' }]);
	});

	it('blocks writes to the underlying tables', async () => {
		await expect(repository.runScopedAppDbQuery(PROJECT_A, "UPDATE chat SET title = 'hacked'")).rejects.toThrow(
			/read-only transaction/,
		);
		const chat = await prisma.chat.findUnique({ where: { id: 'ro-chat-a' } });
		expect(chat?.title).toBe('A chat');
	});

	// quarry-specific: the sandbox runs on Prisma's pooled connections, so it must not outlive the query.
	it('rolls back the sandbox so no temp objects linger, and returns JSON-safe values', async () => {
		for (let i = 0; i < 3; i++) {
			const { columns, rows } = await repository.runScopedAppDbQuery(
				PROJECT_A,
				'SELECT COUNT(*) AS n, 1.50::numeric AS amount FROM v_messages',
			);
			expect(columns).toEqual(['n', 'amount']);
			expect(rows).toEqual([{ n: '1', amount: '1.5' }]);
		}
		const leftovers = await prisma.$queryRawUnsafe<unknown[]>(
			"SELECT 1 FROM pg_class WHERE relpersistence = 't' AND relname IN ('_scope', 'v_messages')",
		);
		expect(leftovers).toEqual([]);
	});
});

describe('queryAppDb', () => {
	it('runs an allowlisted read-only query', async () => {
		const out = await queryAppDb(PROJECT_A, 'SELECT chat_id FROM v_messages');
		expect(out.rowCount).toBe(1);
		expect(out.rows[0].chat_id).toBe('ro-chat-a');
	});

	it('rejects a write', async () => {
		await expect(queryAppDb(PROJECT_A, 'DELETE FROM v_messages')).rejects.toThrow(/read-only/i);
	});

	it('rejects a base table', async () => {
		await expect(queryAppDb(PROJECT_A, 'SELECT * FROM chat')).rejects.toThrow(/allowlist/i);
	});

	it('rejects an auth table', async () => {
		await expect(queryAppDb(PROJECT_A, 'SELECT * FROM account')).rejects.toThrow(/allowlist/i);
	});

	// quarry-specific: the model sees the plain Postgres message, not Prisma's invocation wrapper.
	it('surfaces the database error message as-is', async () => {
		await expect(queryAppDb(PROJECT_A, 'SELECT nope FROM v_messages')).rejects.toThrow(
			/^column "nope" does not exist$/,
		);
	});

	it('explains an epoch comparison on a timestamp column', async () => {
		await expect(
			queryAppDb(PROJECT_A, 'SELECT chat_id FROM v_messages WHERE created_at >= 1700000000'),
		).rejects.toThrow(/not Unix epochs/);
	});
});
