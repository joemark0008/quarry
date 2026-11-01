import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { LanguageModelV3StreamPart } from '@ai-sdk/provider';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { MockLanguageModelV3 } from 'ai/test';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { LlmService } from '../src/agent/llm/llm.service.js';
import type { ProviderModelResult } from '../src/agent/providers/providers.js';
import { loadDotenv } from '../src/config/env.js';
import { createTestApp, createTestUser, resetDatabase, useTestDatabase } from './test-app.js';

const MODEL = { provider: 'openai', modelId: 'gpt-4.1-mini' };
const SQL = 'SELECT count(*) AS order_count FROM public.orders';
const ANSWER = 'There are 99 orders.';

/**
 * Phase 2c flow on `apps/api`: stream a chat through `POST /api/agent` against the jaffle_shop warehouse and check
 * that the tool call, its result and the final answer are saved. The LLM is a scripted mock (no key, no network):
 * the first step calls `execute_sql`, the second answers.
 */
describe('agent chat (e2e)', () => {
	let app: NestExpressApplication;
	let cookie: string[] = [];
	let projectId = '';
	let chatId = '';
	const warehouse = (() => {
		loadDotenv();
		return new URL(process.env.WAREHOUSE_URL ?? 'postgresql://quarry:quarry@localhost:5434/warehouse');
	})();

	beforeAll(async () => {
		const databaseUrl = useTestDatabase();
		process.env.QUARRY_PROJECTS_DIR = await mkdtemp(path.join(tmpdir(), 'quarry-projects-'));
		await resetDatabase(databaseUrl);
		app = await createTestApp();
		vi.spyOn(app.get(LlmService, { strict: false }), 'resolveProviderModel').mockResolvedValue(scriptedModel());

		({ cookie } = await createTestUser(app, { name: 'Ada', email: 'ada@example.com', password: 'Sup3r-secret!' }));

		const project = await graphql('mutation { createProject(input: { name: "Jaffle" }) { id } }');
		projectId = project.body.data.createProject.id;
		const connected = await graphql(
			'mutation ($input: WarehouseConnectionInput!) { connectWarehouse(input: $input) { success message } }',
			{
				input: {
					name: 'warehouse',
					host: warehouse.hostname,
					port: Number(warehouse.port || 5432),
					database: warehouse.pathname.slice(1),
					user: decodeURIComponent(warehouse.username),
					password: decodeURIComponent(warehouse.password),
				},
			},
		);
		expect(connected.body.data.connectWarehouse.success).toBe(true);
	});

	afterAll(async () => {
		await app?.close();
	});

	const graphql = (query: string, variables: Record<string, unknown> = {}) =>
		request(app.getHttpServer())
			.post('/graphql')
			.set('Cookie', cookie)
			.set(projectId ? { 'x-quarry-project-id': projectId } : {})
			.send({ query, variables });

	it('streams the run as an AI SDK UI message stream', async () => {
		const res = await request(app.getHttpServer())
			.post('/api/agent')
			.set('Cookie', cookie)
			.set('x-quarry-project-id', projectId)
			.send({ message: { text: 'How many orders are there?' }, model: MODEL })
			.buffer(true)
			.parse((response, callback) => {
				let body = '';
				response.on('data', (chunk: Buffer) => (body += chunk.toString()));
				response.on('end', () => callback(null, body));
			})
			.expect(200);

		expect(res.headers['content-type']).toContain('text/event-stream');
		const events = parseSse(res.body as string);
		chatId = events.find((event) => event.type === 'data-newChat')?.data.id;
		expect(chatId).toBeTruthy();

		const toolInput = events.find((event) => event.type === 'tool-input-available');
		expect(toolInput).toMatchObject({ toolName: 'execute_sql', input: { sql_query: SQL } });
		const toolOutput = events.find((event) => event.type === 'tool-output-available');
		expect(toolOutput?.output).toMatchObject({ data: [{ order_count: 99 }], columns: ['order_count'] });
		const text = events
			.filter((event) => event.type === 'text-delta')
			.map((event) => event.delta)
			.join('');
		expect(text).toBe(ANSWER);
		expect(events.at(-1)?.type).toBe('finish');
	});

	it('saves the user message, the tool call with its result and the answer', async () => {
		const res = await graphql('query ($chatId: ID!) { chat(chatId: $chatId) { title messages } }', { chatId });
		expect(res.body.errors).toBeUndefined();
		const [user, assistant] = res.body.data.chat.messages;

		expect(user).toMatchObject({ role: 'user', parts: [{ type: 'text', text: 'How many orders are there?' }] });
		expect(assistant.role).toBe('assistant');
		const sqlPart = assistant.parts.find((part: { type: string }) => part.type === 'tool-execute_sql');
		expect(sqlPart).toMatchObject({
			state: 'output-available',
			input: { sql_query: SQL },
			output: { data: [{ order_count: 99 }], row_count: 1 },
		});
		expect(assistant.parts.filter((part: { type: string }) => part.type === 'text').at(-1).text).toBe(ANSWER);
	});

	it('lists the chat and serves its saved query rows', async () => {
		const list = await graphql('{ chatList { groups { chats { id } } } }');
		expect(list.body.data.chatList.groups.flatMap((group: { chats: unknown[] }) => group.chats)).toEqual([
			{ id: chatId },
		]);

		const chat = await graphql('query ($chatId: ID!) { chat(chatId: $chatId) { messages } }', { chatId });
		const sqlPart = chat.body.data.chat.messages[1].parts.find(
			(part: { type: string }) => part.type === 'tool-execute_sql',
		);
		const rows = await graphql(
			'query ($input: QueryRowsInput!) { queryRows(input: $input) { columns rows totalRows } }',
			{ input: { chatId, toolCallId: sqlPart.toolCallId, queryId: sqlPart.output.id } },
		);
		expect(rows.body.data.queryRows).toEqual({
			columns: ['order_count'],
			rows: [{ order_count: 99 }],
			totalRows: 1,
		});
	});
});

/** Step 1 calls `execute_sql`, step 2 answers; `generateText` calls (the chat title) get a short title. */
function scriptedModel(): ProviderModelResult {
	let streamCalls = 0;
	const usage = {
		inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
		outputTokens: { total: 1, text: 1, reasoning: 0 },
	};
	const model = new MockLanguageModelV3({
		doGenerate: async () => ({
			content: [{ type: 'text', text: 'Order count' }],
			finishReason: { unified: 'stop', raw: 'stop' },
			usage,
			warnings: [],
		}),
		doStream: async () => {
			streamCalls += 1;
			const parts: LanguageModelV3StreamPart[] =
				streamCalls === 1
					? [
							{
								type: 'tool-call',
								toolCallId: 'call_sql',
								toolName: 'execute_sql',
								input: JSON.stringify({ sql_query: SQL, database_id: 'warehouse' }),
							},
							{ type: 'finish', finishReason: { unified: 'tool-calls', raw: 'tool_use' }, usage },
						]
					: [
							{ type: 'text-start', id: 'text_1' },
							{ type: 'text-delta', id: 'text_1', delta: ANSWER },
							{ type: 'text-end', id: 'text_1' },
							{ type: 'finish', finishReason: { unified: 'stop', raw: 'stop' }, usage },
						];
			return {
				stream: new ReadableStream<LanguageModelV3StreamPart>({
					start(controller) {
						controller.enqueue({ type: 'stream-start', warnings: [] });
						parts.forEach((part) => controller.enqueue(part));
						controller.close();
					},
				}),
			};
		},
	});
	return { model, providerOptions: {}, contextWindow: 128_000 } as unknown as ProviderModelResult;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- SSE events of every type
function parseSse(body: string): any[] {
	return body
		.split('\n')
		.filter((line) => line.startsWith('data: {'))
		.map((line) => JSON.parse(line.slice('data: '.length)));
}
