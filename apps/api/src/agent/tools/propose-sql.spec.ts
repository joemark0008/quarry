import { describe, expect, it } from 'vitest';

import type { QueryResult, ToolContext } from '../types/tools.js';
import { getTools, QUERY_WORKBENCH_TOOLS } from './index.js';
import { wasSqlTested } from './propose-sql.js';

const SQL = 'SELECT count(*) FROM orders';
const contextWith = (...results: Partial<QueryResult>[]) =>
	({
		queryResults: new Map(results.map((result, index) => [`query_${index}`, { columns: [], data: [], ...result }])),
	}) as unknown as ToolContext;

describe('wasSqlTested', () => {
	it('is true for SQL that ran on the warehouse in this run', () => {
		expect(wasSqlTested(SQL, undefined, contextWith({ sqlQuery: SQL }))).toBe(true);
	});

	it('ignores surrounding whitespace and a trailing semicolon', () => {
		expect(wasSqlTested(`  ${SQL};\n`, undefined, contextWith({ sqlQuery: SQL }))).toBe(true);
	});

	it('is false when nothing ran', () => {
		expect(wasSqlTested(SQL, undefined, contextWith())).toBe(false);
	});

	it('is false for SQL that differs from what ran', () => {
		expect(wasSqlTested(`${SQL} WHERE id = 1`, undefined, contextWith({ sqlQuery: SQL }))).toBe(false);
	});

	it('is false for a run on another connection', () => {
		const context = contextWith({ sqlQuery: SQL, databaseId: 'other' });
		expect(wasSqlTested(SQL, 'warehouse', context)).toBe(false);
		expect(wasSqlTested(SQL, 'other', context)).toBe(true);
	});

	it('does not count compiled semantic queries', () => {
		expect(wasSqlTested(SQL, undefined, contextWith({ sqlQuery: SQL, compiledBySemanticLayer: true }))).toBe(false);
	});
});

describe('query workbench tool set', () => {
	it('is limited to the allowlist and drops charts, stories and file writes', () => {
		const names = Object.keys(getTools(null, undefined, { queryWorkbench: true }));
		expect(names.sort()).toEqual([...QUERY_WORKBENCH_TOOLS].sort());
	});

	it('keeps propose_sql out of other runs', () => {
		expect(Object.keys(getTools(null))).not.toContain('propose_sql');
	});
});
