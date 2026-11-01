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
const TESTED_SQL = 'SELECT count(*) AS order_count FROM public.orders';
const EDITOR_SQL = 'SELECT 1 AS my_manual_edit';

/**
 * A query workbench run through `POST /api/agent` on the jaffle_shop warehouse, with a scripted LLM: the agent tests
 * a query, then offers it with `propose_sql`.
 */
describe('query workbench agent (e2e)', () => {
	let app: NestExpressApplication;
	let cookie: string[] = [];
	let projectId = '';
	let chatId = '';
	const scripted = scriptedModel();
	const warehouse = (() => {
		loadDotenv();
		return new URL(process.env.WAREHOUSE_URL ?? 'postgresql://quarry:quarry@localhost:5434/warehouse');
	})();

	beforeAll(async () => {
		const databaseUrl = useTestDatabase();
		process.env.QUARRY_PROJECTS_DIR = await mkdtemp(path.join(tmpdir(), 'quarry-projects-'));
		await resetDatabase(databaseUrl);
		app = await createTestApp();
		vi.spyOn(app.get(LlmService, { strict: false }), 'resolveProviderModel').mockResolvedValue(scripted.result);

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

	it('tests the query and proposes it, marked as tested, then stops', async () => {
		const res = await request(app.getHttpServer())
			.post('/api/agent')
			.set('Cookie', cookie)
			.set('x-quarry-project-id', projectId)
			.send({
				message: { text: 'How many orders?' },
				model: MODEL,
				mode: 'query_workbench',
				workbench: { sql: EDITOR_SQL, databaseId: 'warehouse' },
			})
			.buffer(true)
			.parse((response, callback) => {
				let body = '';
				response.on('data', (chunk: Buffer) => (body += chunk.toString()));
				response.on('end', () => callback(null, body));
			})
			.expect(200);

		const events = parseSse(res.body as string);
		chatId = events.find((event) => event.type === 'data-newChat')?.data.id;
		const outputs = events.filter((event) => event.type === 'tool-output-available');
		expect(outputs.at(-1)?.output).toMatchObject({ success: true, tested: true });
		expect(scripted.streamCalls()).toBe(2);
	});

	it('sends the editor to the model and only offers the workbench tools', () => {
		const call = scripted.calls[0] as { prompt: unknown; tools?: { name: string }[] };
		expect(JSON.stringify(call.prompt)).toContain(EDITOR_SQL);
		expect(JSON.stringify(call.prompt)).toContain('# Query workbench');
		const toolNames = call.tools?.map((tool) => tool.name) ?? [];
		expect(toolNames).toContain('propose_sql');
		expect(toolNames).not.toContain('display_chart');
		expect(toolNames).not.toContain('suggest_follow_ups');
	});

	it('saves the message without the editor context', async () => {
		const res = await graphql('query ($chatId: ID!) { chat(chatId: $chatId) { messages } }', { chatId });
		const [user, assistant] = res.body.data.chat.messages;
		expect(user.parts).toEqual([expect.objectContaining({ type: 'text', text: 'How many orders?' })]);
		expect(assistant.parts.map((part: { type: string }) => part.type)).toContain('tool-propose_sql');
	});

	it('keeps the chat out of the chat list', async () => {
		const list = await graphql('{ chatList { groups { chats { id } } } }');
		expect(list.body.data.chatList.groups.flatMap((group: { chats: unknown[] }) => group.chats)).toEqual([]);
	});

	it('rejects the editor context outside the workbench', async () => {
		await request(app.getHttpServer())
			.post('/api/agent')
			.set('Cookie', cookie)
			.set('x-quarry-project-id', projectId)
			.send({ message: { text: 'Hi' }, model: MODEL, workbench: { sql: 'SELECT 1', databaseId: null } })
			.expect(400);
	});
});

/** Step 1 calls `execute_sql`, step 2 calls `propose_sql`; a third step would mean the run didn't stop there. */
function scriptedModel() {
	const calls: unknown[] = [];
	const usage = {
		inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
		outputTokens: { total: 1, text: 1, reasoning: 0 },
	};
	const toolCall = (toolCallId: string, toolName: string, input: unknown): LanguageModelV3StreamPart[] => [
		{ type: 'tool-call', toolCallId, toolName, input: JSON.stringify(input) },
		{ type: 'finish', finishReason: { unified: 'tool-calls', raw: 'tool_use' }, usage },
	];
	const model = new MockLanguageModelV3({
		doGenerate: async () => ({
			content: [{ type: 'text', text: 'Order count' }],
			finishReason: { unified: 'stop', raw: 'stop' },
			usage,
			warnings: [],
		}),
		doStream: async (options) => {
			calls.push(options);
			const parts =
				calls.length === 1
					? toolCall('call_sql', 'execute_sql', { sql_query: TESTED_SQL, database_id: 'warehouse' })
					: toolCall('call_propose', 'propose_sql', {
							sql: TESTED_SQL,
							database_id: 'warehouse',
							summary: 'The number of orders.',
						});
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
	return {
		calls,
		streamCalls: () => calls.length,
		result: { model, providerOptions: {}, contextWindow: 128_000 } as unknown as ProviderModelResult,
	};
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- SSE events of every type
function parseSse(body: string): any[] {
	return body
		.split('\n')
		.filter((line) => line.startsWith('data: {'))
		.map((line) => JSON.parse(line.slice('data: '.length)));
}
