import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ChatRepository } from '../src/chats/chat.repository.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { createStoriesTestApp } from './stories-test-module.js';

/**
 * Port of upstream `tests/execute-sql-queries-batch.test.ts` (`getLatestSqlQueriesByChats`, which quarry keeps on
 * `ChatRepository` with the rest of upstream `execute-sql.queries`), plus the data counterpart the stories read.
 */

const CHAT_IDS = ['batch-chat-a', 'batch-chat-b', 'batch-chat-c'];
const QUERIES_PER_CHAT = 400;

let app: INestApplication;
let prisma: PrismaService;
let chats: ChatRepository;

describe('getLatestSqlQueriesByChats', () => {
	beforeAll(async () => {
		({ app, prisma } = await createStoriesTestApp());
		chats = app.get(ChatRepository);
		await seedQueries();
	});

	afterAll(async () => {
		await app?.close();
	});

	it('looks up more query ids than SQLite accepts in one expression', async () => {
		const queryIdsByChat = new Map(CHAT_IDS.map((chatId) => [chatId, new Set(queryIdsOf(chatId))]));

		const queriesByChat = await chats.getLatestSqlQueriesByChats(queryIdsByChat);

		for (const chatId of CHAT_IDS) {
			expect(Object.keys(queriesByChat.get(chatId) ?? {})).toHaveLength(QUERIES_PER_CHAT);
		}
		expect(queriesByChat.get('batch-chat-b')?.['batch-chat-b-q7']).toMatchObject({
			sqlQuery: 'select 7 from batch-chat-b',
			adminMode: false,
		});
	});

	it('only returns the queries asked for each chat', async () => {
		const queriesByChat = await chats.getLatestSqlQueriesByChats(
			new Map([
				['batch-chat-a', new Set(['batch-chat-a-q1', 'batch-chat-b-q1'])],
				['batch-chat-b', new Set(['batch-chat-b-q2'])],
			]),
		);

		expect(Object.keys(queriesByChat.get('batch-chat-a') ?? {})).toEqual(['batch-chat-a-q1']);
		expect(Object.keys(queriesByChat.get('batch-chat-b') ?? {})).toEqual(['batch-chat-b-q2']);
	});

	/** Quarry addition: the cached rows read by `getLatestSqlQueryDataByChats` / `ByIds`, the latest part winning. */
	it('reads the cached rows of the asked queries, the latest active part winning', async () => {
		await prisma.chatMessage.create({
			data: { id: 'batch-chat-a-rerun', chatId: 'batch-chat-a', role: 'assistant' },
		});
		await prisma.messagePart.create({
			data: {
				messageId: 'batch-chat-a-rerun',
				order: 0,
				type: 'tool-execute_sql',
				toolName: 'execute_sql',
				toolCallId: 'batch-chat-a-q1-rerun',
				toolState: 'output-available',
				toolInput: { sql_query: 'select 1 again', database_id: 'warehouse' },
				toolOutput: { id: 'batch-chat-a-q1', data: [{ n: 1 }], columns: ['n'], dialect: 'postgres' },
			},
		});

		const dataByChat = await chats.getLatestSqlQueryDataByChats(
			new Map([
				['batch-chat-a', new Set(['batch-chat-a-q1', 'batch-chat-a-q2'])],
				['batch-chat-c', new Set(['batch-chat-a-q1'])],
			]),
		);

		expect(dataByChat.get('batch-chat-a')).toEqual({
			'batch-chat-a-q1': { data: [{ n: 1 }], columns: ['n'] },
			'batch-chat-a-q2': { data: [], columns: [] },
		});
		expect(dataByChat.has('batch-chat-c')).toBe(false);
		expect(await chats.getLatestSqlQueryDataByIds('batch-chat-a', new Set())).toEqual({});
		expect(await chats.getLatestSqlQueriesByIds('batch-chat-a', new Set(['batch-chat-a-q1']))).toEqual({
			'batch-chat-a-q1': {
				sqlQuery: 'select 1 again',
				databaseId: 'warehouse',
				dialect: 'postgres',
				adminMode: false,
			},
		});
	});
});

function queryIdsOf(chatId: string): string[] {
	return Array.from({ length: QUERIES_PER_CHAT }, (_, index) => `${chatId}-q${index}`);
}

async function seedQueries() {
	await prisma.user.create({ data: { id: 'batch-user', name: 'User', email: 'batch-user@example.com' } });
	await prisma.project.create({ data: { id: 'batch-project', name: 'Batch', type: 'local', path: '/tmp/batch' } });
	for (const chatId of CHAT_IDS) {
		await prisma.chat.create({ data: { id: chatId, userId: 'batch-user', projectId: 'batch-project' } });
		const messageId = `${chatId}-message`;
		await prisma.chatMessage.create({
			data: { id: messageId, chatId, role: 'assistant', createdAt: new Date('2026-01-01') },
		});
		await prisma.messagePart.createMany({
			data: queryIdsOf(chatId).map((queryId, index) => ({
				messageId,
				order: index,
				type: 'tool-execute_sql',
				toolName: 'execute_sql',
				toolCallId: `${queryId}-call`,
				toolState: 'output-available',
				toolInput: { sql_query: `select ${index} from ${chatId}` },
				toolOutput: { id: queryId },
			})),
		});
	}
}
