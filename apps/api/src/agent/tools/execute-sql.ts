import { isQueryToolAgentName } from '@quarry/shared/query-tools';
import {
	sqlIncludesFilterTemplate,
	stripSqlFilterBlocks,
	validateSqlFilterTemplate,
} from '@quarry/shared/sql-template';
import type { executeSql } from '@quarry/shared/tools';
import { executeSql as schemas } from '@quarry/shared/tools';

import { env } from '../../stories/env.js';
import { isWarehouseSqlEnabled } from '../services/semantic-layer.service.js';
import { ExecuteSqlOutput, renderToModelOutput } from '../tool-outputs/index.js';
import { ToolContext } from '../types/tools.js';
import { containsBlockedPassthroughCall, detectQueryRowLimit, isReadOnlySqlQuery } from '../utils/sql-filter.js';
import { createTool } from '../utils/tools.js';
import { queryAppDb } from './query-app-db.js';

const EXECUTE_SEMANTIC_QUERY_TOOL_NAME = 'execute_semantic_query';

/** Upstream gated this on the enterprise license; quarry enforces `exclude_columns` whenever it is configured. */
async function resolveExcludedColumnEnforcement(..._args: unknown[]): Promise<boolean> {
	return true;
}

type SameTurnQueryOptions = {
	queryId?: `query_${string}`;
	/** The SQL as written by the model, kept so same-turn story validation can read it before the part is persisted. */
	sqlQuery: string;
};

type ExecuteQueryOptions = {
	/** SQL compiled by the semantic layer may reach the warehouse even when hand-written SQL may not. */
	compiledBySemanticLayer?: boolean;
	/** Bind values for `$1…$n` in `sql_query` (saved query tools); warehouse only. */
	params?: readonly unknown[];
	/** The SQL kept with the result (SQL view, re-runs), when it differs from the one sent with `params`. */
	recordedSql?: string;
	/** The saved query tool running the query. */
	queryToolName?: string;
};

export async function executeQuery(
	{ sql_query, database_id, query_id }: executeSql.Input,
	context: ToolContext,
	options: ExecuteQueryOptions = {},
): Promise<executeSql.Output> {
	if (!options.compiledBySemanticLayer) {
		assertWarehouseSqlAllowed(context);
	}
	const templateWarnings = env.BETA_STORY_FILTERS_ENABLED ? validateSqlFilterTemplate(sql_query) : [];
	const effectiveSql = stripSqlFilterBlocks(sql_query);
	if (templateWarnings.length > 0 && sqlIncludesFilterTemplate(effectiveSql)) {
		throw new Error(`Invalid story filter SQL template: ${templateWarnings.join(' ')}`);
	}
	if (containsBlockedPassthroughCall(effectiveSql)) {
		throw new Error(
			'Query calls a catalog/server-passthrough function (e.g. postgres_query, mysql_query, sqlite_query) — ' +
				"blocked regardless of write permissions, since these open a connection to another server rather than write to this database's data.",
		);
	}
	const writePermEnabled = context.agentSettings?.sql?.dangerouslyWritePermEnabled ?? false;
	if (!writePermEnabled && !(await isReadOnlySqlQuery(effectiveSql))) {
		throw new Error(
			'Write SQL operations are disabled. Only SELECT queries are allowed. Enable "Dangerous write permissions" in the admin panel to allow INSERT, UPDATE, DELETE and DDL queries.',
		);
	}

	if (options.params && context.adminMode) {
		throw new Error('Query parameters are only supported on the warehouse.');
	}

	if (context.adminMode) {
		return withTemplateWarnings(
			await executeAppDbQuery(effectiveSql, context, { queryId: query_id, sqlQuery: sql_query }),
			templateWarnings,
		);
	}

	const enforceExcludedColumns = await resolveExcludedColumnEnforcement(context.projectId, context.agentSettings);
	const data = await context.services.executeWarehouseSql(effectiveSql, {
		projectFolder: context.projectFolder,
		databaseId: database_id,
		envVars: context.envVars,
		azureAccessToken: context.azureAccessToken,
		enforceExcludedColumns,
		tableAccess: context.warehouseTableAccess,
		rowSecurity: context.warehouseRowSecurity ?? { enforced: false },
		...(options.params && { params: options.params }),
	});
	const id = query_id ?? (`query_${crypto.randomUUID().slice(0, 8)}` as const);

	context.queryResults.set(id, {
		columns: data.columns,
		data: data.data,
		sqlQuery: options.recordedSql ?? sql_query,
		...(database_id && { databaseId: database_id }),
		...(options.compiledBySemanticLayer && { compiledBySemanticLayer: true }),
		...(options.queryToolName && { queryToolName: options.queryToolName }),
	});

	const appliedLimit = detectQueryRowLimit(effectiveSql);

	return withTemplateWarnings(
		{
			_version: '1',
			...data,
			id,
			...(appliedLimit !== null && { applied_limit: appliedLimit }),
		},
		templateWarnings,
	);
}

async function executeAppDbQuery(
	effectiveSql: string,
	context: ToolContext,
	{ queryId, sqlQuery }: SameTurnQueryOptions,
): Promise<executeSql.Output> {
	const { columns, rows } = await queryAppDb(context.services.runScopedAppDbQuery, context.projectId, effectiveSql);
	const id = queryId ?? (`query_${crypto.randomUUID().slice(0, 8)}` as const);
	context.queryResults.set(id, { columns, data: rows, sqlQuery });
	const appliedLimit = detectQueryRowLimit(effectiveSql);
	return {
		_version: '1',
		data: rows,
		row_count: rows.length,
		columns,
		id,
		...(appliedLimit !== null && { applied_limit: appliedLimit }),
	};
}

function withTemplateWarnings(output: executeSql.Output, templateWarnings: string[]): executeSql.Output {
	if (templateWarnings.length === 0) {
		return output;
	}
	return { ...output, template_warnings: templateWarnings };
}

async function updateExistingQuery(
	input: executeSql.Input & { query_id: `query_${string}` },
	context: ToolContext,
): Promise<executeSql.Output> {
	const existing = await context.services.getExecuteSqlPartByQueryIdInChat(context.chatId, input.query_id);
	if (!existing) {
		return updateSameTurnQuery(input, context);
	}
	if (existing.toolName === EXECUTE_SEMANTIC_QUERY_TOOL_NAME) {
		throw semanticQueryNotEditableError(input.query_id);
	}
	if (isQueryToolAgentName(existing.toolName)) {
		throw new Error(
			`Query ${input.query_id} comes from the saved tool ${existing.toolName} and cannot be edited as SQL. Call ${existing.toolName} again with other arguments, or run execute_sql without query_id.`,
		);
	}

	const nextInput: executeSql.Input = {
		sql_query: input.sql_query,
		database_id: input.database_id ?? existing.toolInput.database_id,
		name: input.name ?? existing.toolInput.name,
	};

	const output = await executeQuery({ ...nextInput, query_id: input.query_id }, context);
	await context.services.updateExecuteSqlPart(existing.toolCallId, nextInput, output);
	return output;
}

/**
 * A query created earlier in the current turn is not persisted yet: it only lives in
 * the in-memory results. Re-running it under the same id is enough, the new part is
 * saved with the rest of the turn and wins over the older one as the latest.
 */
async function updateSameTurnQuery(
	input: executeSql.Input & { query_id: `query_${string}` },
	context: ToolContext,
): Promise<executeSql.Output> {
	const sameTurnResult = context.queryResults.get(input.query_id);
	if (!sameTurnResult) {
		throw new Error(
			`Query ${input.query_id} not found in this chat. Use execute_sql without query_id to create a new query.`,
		);
	}
	if (sameTurnResult.compiledBySemanticLayer) {
		throw semanticQueryNotEditableError(input.query_id);
	}
	if (sameTurnResult.queryToolName) {
		throw new Error(
			`Query ${input.query_id} comes from the saved tool ${sameTurnResult.queryToolName} and cannot be edited as SQL. Call it again with other arguments, or run execute_sql without query_id.`,
		);
	}
	return executeQuery(input, context);
}

function semanticQueryNotEditableError(queryId: string): Error {
	return new Error(
		`Query ${queryId} is a semantic query and cannot be edited as SQL. Call execute_semantic_query again with the adjusted metrics, group_by or where.`,
	);
}

/** Semantics-only mode: the warehouse is reached through the layer, never through raw SQL. */
function assertWarehouseSqlAllowed(context: ToolContext): void {
	if (context.adminMode || isWarehouseSqlEnabled(context.semanticLayerMode)) {
		return;
	}
	throw new Error('Raw SQL on the warehouse is disabled in this project: query metrics with execute_semantic_query.');
}

function buildExecuteSqlToolDescription() {
	return [
		'Execute a SQL query against the connected database and return the results. If multiple databases are configured, specify the database_id.',
		...(env.BETA_STORY_FILTERS_ENABLED
			? [
					'Story filters may be embedded as SQL template blocks that are stripped when this tool runs in chat.',
					'Correct syntax: WHERE 1 = 1 {% filter country %} AND country IN ({{ filters.country.sql }}) {% endfilter %}.',
					"For date_range filters, {{ filters.<id>.sql }} already expands to 'start' AND 'end', so write: {% filter period %} AND order_date BETWEEN {{ filters.period.sql }} {% endfilter %}.",
					'Never use filters.<id>.start, .end, .value, or placeholders outside {% filter %} blocks — placeholders outside blocks are rejected; other invalid templates return template_warnings.',
					'Prefer query_id when adding story filter templates so existing <chart>/<table> tags keep working.',
				]
			: []),
		'To edit a previous query in-place (keep the same query_id for charts/stories), pass query_id from an earlier execute_sql result.',
	].join(' ');
}

export default createTool<executeSql.Input, executeSql.Output>({
	description: buildExecuteSqlToolDescription(),
	inputSchema: schemas.InputSchema,
	outputSchema: schemas.OutputSchema,
	execute: async (input, context) => {
		if (input.query_id) {
			return updateExistingQuery({ ...input, query_id: input.query_id }, context);
		}
		return executeQuery(input, context);
	},
	toModelOutput: ({ output }) => renderToModelOutput(ExecuteSqlOutput({ output }), output),
});
