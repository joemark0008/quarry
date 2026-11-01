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
import { PrismaService } from '../src/prisma/prisma.service.js';
import { createTestApp, createTestUser, resetDatabase, useTestDatabase } from './test-app.js';

const MODEL = { provider: 'openai', modelId: 'gpt-4.1-mini' };
const TOOL_FIELDS =
	'id name agentToolName description sqlTemplate parameters { name type required default } enabled canEdit';
const ORDERS_BY_STATUS = {
	name: 'orders_by_status',
	description: 'Number of orders and total amount for one order status.',
	sqlTemplate:
		'SELECT status, count(*) AS order_count, sum(amount) AS total_amount FROM public.orders WHERE status = {{ status }} GROUP BY status',
	parameters: [{ name: 'status', type: 'string', required: true, description: 'Order status, e.g. completed' }],
};
const ANSWER = '67 orders are completed.';

/**
 * Saved query tools on Postgres with the jaffle_shop warehouse: the GraphQL CRUD with its access rules, the
 * preview run with bind values, and a chat where the (scripted) model calls the saved tool as `qt_<name>`.
 */
describe('query tools (e2e)', () => {
	let app: NestExpressApplication;
	let prisma: PrismaService;
	let adminCookie: string[] = [];
	let memberCookie: string[] = [];
	let viewerCookie: string[] = [];
	let projectId = '';
	let toolId = '';
	let memberToolId = '';
	const warehouse = (() => {
		loadDotenv();
		return new URL(process.env.WAREHOUSE_URL ?? 'postgresql://quarry:quarry@localhost:5434/warehouse');
	})();

	beforeAll(async () => {
		const databaseUrl = useTestDatabase();
		process.env.QUARRY_PROJECTS_DIR = await mkdtemp(path.join(tmpdir(), 'quarry-projects-'));
		await resetDatabase(databaseUrl);
		app = await createTestApp();
		prisma = app.get(PrismaService);
		vi.spyOn(app.get(LlmService, { strict: false }), 'resolveProviderModel').mockResolvedValue(scriptedModel());

		const admin = await signUp('Ada', 'ada@example.com');
		adminCookie = admin.cookie;
		const member = await signUp('Bob', 'bob@example.com');
		memberCookie = member.cookie;
		const viewer = await signUp('Vic', 'vic@example.com');
		viewerCookie = viewer.cookie;

		const project = await graphql(adminCookie, 'mutation { createProject(input: { name: "Jaffle" }) { id } }');
		projectId = project.body.data.createProject.id;
		await prisma.projectMember.createMany({
			data: [
				{ projectId, userId: member.userId, role: 'user' },
				{ projectId, userId: viewer.userId, role: 'viewer' },
			],
		});
		const connected = await graphql(
			adminCookie,
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

	const signUp = (name: string, email: string) => createTestUser(app, { name, email, password: 'Sup3r-secret!' });

	const graphql = (cookie: string[], query: string, variables: Record<string, unknown> = {}) =>
		request(app.getHttpServer())
			.post('/graphql')
			.set('Cookie', cookie)
			.set(projectId ? { 'x-quarry-project-id': projectId } : {})
			.send({ query, variables });

	const createTool = (cookie: string[], input: Record<string, unknown>) =>
		graphql(
			cookie,
			`mutation ($input: CreateProjectQueryToolInput!) { createProjectQueryTool(input: $input) { ${TOOL_FIELDS} } }`,
			{ input },
		);

	const updateTool = (cookie: string[], input: Record<string, unknown>) =>
		graphql(
			cookie,
			`mutation ($input: UpdateProjectQueryToolInput!) { updateProjectQueryTool(input: $input) { ${TOOL_FIELDS} } }`,
			{ input },
		);

	const preview = (cookie: string[], input: Record<string, unknown>) =>
		graphql(
			cookie,
			'mutation ($input: PreviewProjectQueryToolInput!) { previewProjectQueryTool(input: $input) { columns rows rowCount truncated sql } }',
			{ input },
		);

	it('previews a draft with its arguments bound as values', async () => {
		const res = await preview(adminCookie, {
			sqlTemplate: ORDERS_BY_STATUS.sqlTemplate,
			parameters: ORDERS_BY_STATUS.parameters,
			values: { status: 'completed' },
		});
		expect(res.body.errors).toBeUndefined();
		expect(res.body.data.previewProjectQueryTool).toMatchObject({
			columns: ['status', 'order_count', 'total_amount'],
			rows: [{ status: 'completed', order_count: 67 }],
			rowCount: 1,
			truncated: false,
		});
		expect(res.body.data.previewProjectQueryTool.sql).toContain("status = 'completed'");
	});

	it('keeps an injection attempt as a plain value', async () => {
		const res = await preview(adminCookie, {
			sqlTemplate: ORDERS_BY_STATUS.sqlTemplate,
			parameters: ORDERS_BY_STATUS.parameters,
			values: { status: "completed' OR '1'='1" },
		});
		expect(res.body.errors).toBeUndefined();
		expect(res.body.data.previewProjectQueryTool.rows).toEqual([]);
	});

	it('refuses write SQL, unknown placeholders and missing arguments', async () => {
		const write = await preview(adminCookie, { sqlTemplate: 'DELETE FROM public.orders', parameters: [] });
		expect(write.body.errors[0].extensions.code).toBe('BAD_REQUEST');

		const unknown = await preview(adminCookie, {
			sqlTemplate: 'SELECT * FROM public.orders WHERE status = {{ other }}',
			parameters: [],
		});
		expect(unknown.body.errors[0].message).toMatch(/not a declared parameter/);

		const missing = await preview(adminCookie, {
			sqlTemplate: ORDERS_BY_STATUS.sqlTemplate,
			parameters: ORDERS_BY_STATUS.parameters,
		});
		expect(missing.body.errors[0].message).toMatch(/required/);
	});

	it('creates a tool and lists it for every member', async () => {
		const res = await createTool(adminCookie, ORDERS_BY_STATUS);
		expect(res.body.errors).toBeUndefined();
		expect(res.body.data.createProjectQueryTool).toMatchObject({
			name: 'orders_by_status',
			agentToolName: 'qt_orders_by_status',
			parameters: [{ name: 'status', type: 'string', required: true, default: null }],
			enabled: true,
			canEdit: true,
		});
		toolId = res.body.data.createProjectQueryTool.id;

		const list = await graphql(viewerCookie, `{ projectQueryTools { ${TOOL_FIELDS} } }`);
		expect(list.body.data.projectQueryTools).toEqual([
			expect.objectContaining({ id: toolId, name: 'orders_by_status', canEdit: false }),
		]);
	});

	it('refuses a duplicate name and SQL the guards reject', async () => {
		const duplicate = await createTool(adminCookie, ORDERS_BY_STATUS);
		expect(duplicate.body.errors[0].extensions.code).toBe('CONFLICT');

		const write = await createTool(adminCookie, {
			...ORDERS_BY_STATUS,
			name: 'drop_orders',
			sqlTemplate: 'DROP TABLE public.orders',
			parameters: [],
		});
		expect(write.body.errors[0].extensions.code).toBe('BAD_REQUEST');
	});

	it('lets members create tools, edit their own, and only admins edit the others', async () => {
		const viewer = await createTool(viewerCookie, { ...ORDERS_BY_STATUS, name: 'viewer_tool' });
		expect(viewer.body.errors[0].extensions.code).toBe('FORBIDDEN');

		const created = await createTool(memberCookie, {
			name: 'recent_orders',
			description: 'Latest orders.',
			sqlTemplate: 'SELECT order_id, order_date FROM public.orders ORDER BY order_date DESC LIMIT {{ max_rows }}',
			parameters: [{ name: 'max_rows', type: 'integer', required: false, default: 5 }],
		});
		expect(created.body.errors).toBeUndefined();
		memberToolId = created.body.data.createProjectQueryTool.id;

		const own = await updateTool(memberCookie, { id: memberToolId, description: 'The latest orders.' });
		expect(own.body.data.updateProjectQueryTool.description).toBe('The latest orders.');

		const others = await updateTool(memberCookie, { id: toolId, enabled: false });
		expect(others.body.errors[0].extensions.code).toBe('FORBIDDEN');

		const byAdmin = await updateTool(adminCookie, { id: memberToolId, enabled: false });
		expect(byAdmin.body.data.updateProjectQueryTool).toMatchObject({ enabled: false, canEdit: true });
	});

	it('lets the agent call an enabled tool and saves the result like execute_sql', async () => {
		const res = await request(app.getHttpServer())
			.post('/api/agent')
			.set('Cookie', adminCookie)
			.set('x-quarry-project-id', projectId)
			.send({ message: { text: 'How many orders are completed?' }, model: MODEL })
			.buffer(true)
			.parse((response, callback) => {
				let body = '';
				response.on('data', (chunk: Buffer) => (body += chunk.toString()));
				response.on('end', () => callback(null, body));
			})
			.expect(200);

		const events = parseSse(res.body as string);
		const chatId = events.find((event) => event.type === 'data-newChat')?.data.id;
		const toolOutput = events.find((event) => event.type === 'tool-output-available');
		expect(toolOutput?.output).toMatchObject({
			data: [{ status: 'completed', order_count: 67 }],
			query_tool: { tool_id: toolId, name: 'orders_by_status' },
		});
		expect(toolOutput.output.query_tool.sql_query).toContain("status = 'completed'");

		const chat = await graphql(adminCookie, 'query ($chatId: ID!) { chat(chatId: $chatId) { messages } }', {
			chatId,
		});
		const part = chat.body.data.chat.messages[1].parts.find(
			(candidate: { type: string }) => candidate.type === 'tool-qt_orders_by_status',
		);
		expect(part).toMatchObject({ state: 'output-available', input: { status: 'completed' } });

		const rows = await graphql(
			adminCookie,
			'query ($input: QueryRowsInput!) { queryRows(input: $input) { columns rows totalRows } }',
			{ input: { chatId, toolCallId: part.toolCallId, queryId: part.output.id } },
		);
		expect(rows.body.errors).toBeUndefined();
		expect(rows.body.data.queryRows).toMatchObject({
			rows: [{ status: 'completed', order_count: 67 }],
			totalRows: 1,
		});
	});

	it('deletes a tool (admins and creators only)', async () => {
		const byMember = await graphql(memberCookie, 'mutation ($id: ID!) { deleteProjectQueryTool(id: $id) }', {
			id: toolId,
		});
		expect(byMember.body.errors[0].extensions.code).toBe('FORBIDDEN');

		const own = await graphql(memberCookie, 'mutation ($id: ID!) { deleteProjectQueryTool(id: $id) }', {
			id: memberToolId,
		});
		expect(own.body.data.deleteProjectQueryTool).toBe(true);

		const list = await graphql(adminCookie, '{ projectQueryTools { id } }');
		expect(list.body.data.projectQueryTools).toEqual([{ id: toolId }]);
	});
});

/** Step 1 calls the saved tool, step 2 answers; `generateText` calls (the chat title) get a short title. */
function scriptedModel(): ProviderModelResult {
	let streamCalls = 0;
	const usage = {
		inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
		outputTokens: { total: 1, text: 1, reasoning: 0 },
	};
	const model = new MockLanguageModelV3({
		doGenerate: async () => ({
			content: [{ type: 'text', text: 'Completed orders' }],
			finishReason: { unified: 'stop', raw: 'stop' },
			usage,
			warnings: [],
		}),
		doStream: async ({ tools }) => {
			streamCalls += 1;
			if (streamCalls === 1) {
				expect(tools?.map((tool) => tool.name)).toContain('qt_orders_by_status');
				expect(tools?.map((tool) => tool.name)).not.toContain('qt_recent_orders');
			}
			const parts: LanguageModelV3StreamPart[] =
				streamCalls === 1
					? [
							{
								type: 'tool-call',
								toolCallId: 'call_saved',
								toolName: 'qt_orders_by_status',
								input: JSON.stringify({ status: 'completed' }),
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
