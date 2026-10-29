import { asSchema, type ToolCallOptions } from 'ai';
import { describe, expect, it, vi } from 'vitest';

import type { SavedQueryToolDefinition } from '../../query-tools/query-tool.types.js';
import type { ToolContext } from '../types/tools.js';
import executeSql from './execute-sql.js';
import { createSavedQueryTools } from './saved-query-tool.js';

const definition: SavedQueryToolDefinition = {
	id: 'tool1',
	name: 'orders_by_status',
	description: 'Orders for one status.',
	sqlTemplate: 'SELECT order_id FROM orders WHERE status = {{ status }} LIMIT {{ max_rows }}',
	parameters: [
		{ name: 'status', type: 'string', required: true, description: 'Order status' },
		{ name: 'max_rows', type: 'integer', required: false, default: 10 },
	],
	databaseId: 'warehouse',
};

function buildContext(overrides: Partial<ToolContext> = {}): ToolContext {
	return {
		services: {
			executeWarehouseSql: vi.fn().mockResolvedValue({
				data: [{ order_id: 1 }],
				row_count: 1,
				columns: ['order_id'],
				dialect: 'postgres',
			}),
			getExecuteSqlPartByQueryIdInChat: vi.fn().mockResolvedValue(null),
			updateExecuteSqlPart: vi.fn(),
			getQueryResultByQueryId: vi.fn(),
		},
		projectFolder: '/tmp/project',
		chatId: 'chat1',
		userId: 'user1',
		projectId: 'project1',
		supportsCustomCharts: false,
		agentSettings: null,
		envVars: {},
		azureAccessToken: null,
		queryResults: new Map(),
		generatedArtifacts: { charts: [], maps: [], stories: [] },
		...overrides,
	} as unknown as ToolContext;
}

const run = (input: Record<string, unknown>, context: ToolContext) => {
	const tool = createSavedQueryTools([definition]).qt_orders_by_status;
	return tool.execute!(input, {
		experimental_context: context,
		toolCallId: 'call1',
		messages: [],
	} as ToolCallOptions);
};

describe('saved query tools', () => {
	it('are named qt_<name> with an input schema built from the parameters', async () => {
		const tools = createSavedQueryTools([definition]);
		expect(Object.keys(tools)).toEqual(['qt_orders_by_status']);
		const schema = (await asSchema(tools.qt_orders_by_status.inputSchema).jsonSchema) as {
			properties: Record<string, { type: string; description?: string }>;
			required?: string[];
		};
		expect(schema.properties.status).toMatchObject({ type: 'string', description: 'Order status' });
		expect(schema.properties.max_rows).toMatchObject({ type: 'integer', description: 'Defaults to 10.' });
		expect(schema.required).toEqual(['status']);
		expect(tools.qt_orders_by_status.description).toContain('Orders for one status.');
	});

	it('runs the saved SQL with the arguments as bind values and records the literal SQL', async () => {
		const context = buildContext();
		const output = await run({ status: "it's" }, context);

		expect(context.services.executeWarehouseSql).toHaveBeenCalledWith(
			'SELECT order_id FROM orders WHERE status = $1 LIMIT $2',
			expect.objectContaining({ databaseId: 'warehouse', params: ["it's", 10] }),
		);
		expect(output).toMatchObject({
			data: [{ order_id: 1 }],
			query_tool: { tool_id: 'tool1', name: 'orders_by_status', database_id: 'warehouse' },
		});
		const { id, query_tool } = output as { id: string; query_tool: { sql_query: string } };
		expect(query_tool.sql_query.replace(/\s+/g, ' ')).toBe(
			"SELECT order_id FROM orders WHERE status = 'it''s' LIMIT 10",
		);
		expect(context.queryResults.get(id)).toMatchObject({
			sqlQuery: query_tool.sql_query,
			queryToolName: 'qt_orders_by_status',
		});
	});

	it('rejects a missing required argument before reaching the warehouse', async () => {
		const context = buildContext();
		await expect(run({}, context)).rejects.toThrow(/required/);
		expect(context.services.executeWarehouseSql).not.toHaveBeenCalled();
	});

	it('cannot be edited in place through execute_sql', async () => {
		const context = buildContext();
		const output = (await run({ status: 'completed' }, context)) as { id: `query_${string}` };
		await expect(
			executeSql.execute!({ sql_query: 'SELECT 1', query_id: output.id }, {
				experimental_context: context,
				toolCallId: 'call2',
				messages: [],
			} as ToolCallOptions),
		).rejects.toThrow(/saved tool qt_orders_by_status/);
	});
});
