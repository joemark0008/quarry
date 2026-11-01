import { LOCAL_DATABASE_ID, proposeSql } from '@quarry/shared/tools';

import type { ToolContext } from '../types/tools.js';
import { createTool } from '../utils/tools.js';

const normalizeSql = (sql: string): string => sql.trim().replace(/;\s*$/, '').trim();

/** Whether the exact SQL reached the warehouse and succeeded in this run, so a proposal can't claim an untested query. */
export const wasSqlTested = (sql: string, databaseId: string | undefined, context: ToolContext): boolean => {
	const target = normalizeSql(sql);
	return [...context.queryResults.values()].some(
		(result) =>
			result.sqlQuery !== undefined &&
			normalizeSql(result.sqlQuery) === target &&
			result.databaseId !== LOCAL_DATABASE_ID &&
			!result.compiledBySemanticLayer &&
			(!databaseId || !result.databaseId || result.databaseId === databaseId),
	);
};

/** The query workbench's way to offer SQL: it has no side effects, the user applies the query from a card. */
export default createTool<proposeSql.Input, proposeSql.Output>({
	description: proposeSql.description,
	inputSchema: proposeSql.InputSchema,
	outputSchema: proposeSql.OutputSchema,
	execute: async ({ sql, database_id }, context) => ({
		_version: '1' as const,
		success: true as const,
		tested: wasSqlTested(sql, database_id, context),
	}),

	toModelOutput: () => ({
		type: 'text',
		value: 'Query shown to the user. Stop and wait for their reply.',
	}),
});
