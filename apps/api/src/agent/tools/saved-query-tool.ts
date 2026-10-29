import { type QueryToolParameter, toQueryToolAgentName } from '@quarry/shared/query-tools';
import { savedQueryTool } from '@quarry/shared/tools';
import type { Tool } from 'ai';
import z from 'zod/v3';

import type { SavedQueryToolDefinition } from '../../query-tools/query-tool.service.js';
import { prepareQueryToolSql } from '../../query-tools/query-tool-sql.js';
import { ExecuteSqlOutput, renderToModelOutput } from '../tool-outputs/index.js';
import { createTool } from '../utils/tools.js';
import { executeQuery } from './execute-sql.js';

type SavedQueryToolInput = Record<string, unknown>;

const MAX_SQL_IN_DESCRIPTION = 1500;

/**
 * The project's saved query tools as agent tools, one `qt_<name>` each. A call checks its arguments against the
 * declared parameters and runs the saved SQL through `execute_sql`'s warehouse path with the arguments as bind
 * values, so the guards, the query id and the chat rendering are the same as for `execute_sql`.
 */
export function createSavedQueryTools(definitions: readonly SavedQueryToolDefinition[]): Record<string, Tool> {
	return Object.fromEntries(
		definitions.map((definition) => [toQueryToolAgentName(definition.name), createSavedQueryTool(definition)]),
	);
}

export function createSavedQueryTool(
	definition: SavedQueryToolDefinition,
): Tool<SavedQueryToolInput, savedQueryTool.Output> {
	const agentName = toQueryToolAgentName(definition.name);
	return createTool<SavedQueryToolInput, savedQueryTool.Output>({
		description: buildDescription(definition),
		inputSchema: buildInputSchema(definition.parameters),
		outputSchema: savedQueryTool.OutputSchema,
		execute: async (args, context) => {
			const prepared = await prepareQueryToolSql(definition.sqlTemplate, definition.parameters, args ?? {});
			const databaseId = definition.databaseId ?? undefined;
			const output = await executeQuery(
				{ sql_query: prepared.sql, database_id: databaseId, name: definition.name },
				context,
				{ params: prepared.params, recordedSql: prepared.displaySql, queryToolName: agentName },
			);
			return {
				...output,
				query_tool: {
					tool_id: definition.id,
					name: definition.name,
					sql_query: prepared.displaySql,
					...(databaseId && { database_id: databaseId }),
				},
			};
		},
		toModelOutput: ({ output }) => renderToModelOutput(ExecuteSqlOutput({ output }), output),
	});
}

function buildDescription(definition: SavedQueryToolDefinition): string {
	const sql =
		definition.sqlTemplate.length > MAX_SQL_IN_DESCRIPTION
			? `${definition.sqlTemplate.slice(0, MAX_SQL_IN_DESCRIPTION)}…`
			: definition.sqlTemplate;
	return [
		definition.description,
		'',
		'Saved query tool: runs a fixed, reviewed SQL query on the warehouse. Prefer it over writing SQL when it answers the question.',
		"Its result is a query result like execute_sql's: pass its query id to display_chart or read_query_result.",
		`SQL (arguments go into the {{ placeholders }}):\n${sql}`,
	].join('\n');
}

function buildInputSchema(parameters: readonly QueryToolParameter[]) {
	return z.object(Object.fromEntries(parameters.map((parameter) => [parameter.name, parameterSchema(parameter)])));
}

function parameterSchema(parameter: QueryToolParameter): z.ZodTypeAny {
	const base = {
		string: () => z.string(),
		number: () => z.number(),
		integer: () => z.number().int(),
		boolean: () => z.boolean(),
		date: () => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
	}[parameter.type]();
	const notes = [
		parameter.description,
		parameter.type === 'date' ? 'Date as YYYY-MM-DD.' : null,
		parameter.default !== undefined && parameter.default !== null
			? `Defaults to ${JSON.stringify(parameter.default)}.`
			: null,
	].filter(Boolean);
	const described = notes.length > 0 ? base.describe(notes.join(' ')) : base;
	const optional = !parameter.required || (parameter.default !== undefined && parameter.default !== null);
	return optional ? described.optional() : described;
}
