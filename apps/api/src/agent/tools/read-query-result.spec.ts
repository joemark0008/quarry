import type { readQueryResult } from '@quarry/shared/tools';
import { describe, expect, it, vi } from 'vitest';

import type { QueryResult, ToolContext } from '../types/tools.js';
import readQueryResultTool from './read-query-result.js';

const rows = Array.from({ length: 500 }, (_, index) => ({ id: index }));

async function execute(input: readQueryResult.Input): Promise<readQueryResult.Output> {
	const context = {
		// quarry: upstream mocked `queries/chat.queries#getQueryResultByQueryId`; it is a tool service here.
		services: { getQueryResultByQueryId: vi.fn(async () => null) },
		queryResults: new Map<string, QueryResult>([['query_big', { columns: ['id'], data: rows }]]),
		chatId: 'chat1',
	} as unknown as ToolContext;
	return (await readQueryResultTool.execute!(input, {
		experimental_context: context,
	} as Parameters<NonNullable<typeof readQueryResultTool.execute>>[1])) as readQueryResult.Output;
}

describe('read_query_result execute', () => {
	it('returns 20 rows by default', async () => {
		const output = await execute({ query_id: 'query_big' });

		expect(output.data).toHaveLength(20);
		expect(output.limit).toBe(20);
	});

	it('caps the requested limit at 100 rows', async () => {
		const output = await execute({ query_id: 'query_big', offset: 10, limit: 10_000 });

		expect(output.data).toHaveLength(100);
		expect(output.data[0]).toEqual({ id: 10 });
		expect(output.limit).toBe(100);
		expect(output.row_count).toBe(500);
	});
});
