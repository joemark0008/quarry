import { z } from 'zod';

import type { AppDbQueryResult } from '../app-db/app-db.repository.js';
import { QueryAppDbOutput, renderToModelOutput } from '../tool-outputs/index.js';
import { ALLOWED_APP_DB_VIEWS, validateAppDbQuery } from '../utils/app-db-allowlist.js';
import { explainAppDbError } from '../utils/app-db-errors.js';
import { createTool } from '../utils/tools.js';

const InputSchema = z.object({
	sql: z.string().describe('A read-only SELECT/WITH query over the allowlisted, project-scoped views.'),
});
type Input = z.infer<typeof InputSchema>;

export interface QueryAppDbResult {
	_version: '1';
	columns: string[];
	rows: Record<string, unknown>[];
	rowCount: number;
}

/** quarry: runs through `AppDbRepository.runScopedAppDbQuery` (upstream `db/readonly-app-db`). */
export type RunScopedAppDbQuery = (projectId: string, sql: string) => Promise<AppDbQueryResult>;

export async function queryAppDb(
	runScopedAppDbQuery: RunScopedAppDbQuery,
	projectId: string,
	sql: string,
): Promise<QueryAppDbResult> {
	const verdict = await validateAppDbQuery(sql);
	if (!verdict.ok) {
		throw new Error(verdict.reason ?? 'Query rejected.');
	}
	try {
		const { columns, rows } = await runScopedAppDbQuery(projectId, sql);
		return { _version: '1', columns, rows, rowCount: rows.length };
	} catch (error) {
		throw new Error(explainAppDbError(error), { cause: error });
	}
}

export function createQueryAppDbTool(projectId: string) {
	return createTool<Input, QueryAppDbResult>({
		description: `Run a read-only SQL query over the quarry app database to mine usage signal. Only SELECT/WITH over these project-scoped views is allowed: ${ALLOWED_APP_DB_VIEWS.join(', ')}.`,
		inputSchema: InputSchema,
		execute: async ({ sql }, context) => queryAppDb(context.services.runScopedAppDbQuery, projectId, sql),
		toModelOutput: ({ output }) => renderToModelOutput(QueryAppDbOutput({ output }), output),
	});
}
