import { Injectable } from '@nestjs/common';
import { stripSqlFilterBlocks } from '@quarry/shared/sql-template';
import type { executeSql } from '@quarry/shared/tools';

import { AgentService } from '../agent/agent.service.js';
import { executeQuery } from '../agent/tools/execute-sql.js';
import { EXECUTE_SEMANTIC_QUERY_TOOL_NAME } from '../agent/utils/query-tools.js';
import { HandlerError } from '../common/errors/handler-error.js';
import { ChatRepository } from './chat.repository.js';

type SqlEditOptions = {
	queryId: string;
	sqlQuery: string;
	databaseId?: string;
	name?: string;
	userId: string;
};

/**
 * Port of upstream `services/update-sql.ts` and `trpc/sql.routes.ts`: re-run or save a query of a chat from the
 * SQL editor, through the same `execute_sql` path (guards included) the agent uses.
 */
@Injectable()
export class SqlEditService {
	constructor(
		private readonly chats: ChatRepository,
		private readonly agents: AgentService,
	) {}

	async updateSqlQueryInChat(
		opts: SqlEditOptions,
	): Promise<{ input: executeSql.Input; output: executeSql.Output; toolCallId: string; chatId: string }> {
		const { existing, context, input } = await this.prepareSqlEditContext(opts);
		const output = await runQuery(() =>
			executeQuery({ ...input, query_id: opts.queryId as `query_${string}` }, context),
		);
		await this.chats.updateExecuteSqlPart(existing.toolCallId, input, output);
		return { input, output, toolCallId: existing.toolCallId, chatId: existing.chatId };
	}

	async previewSqlQueryInChat(opts: SqlEditOptions): Promise<executeSql.Output> {
		const { context, input } = await this.prepareSqlEditContext(opts);
		return runQuery(() => executeQuery(input, context));
	}

	private async prepareSqlEditContext(opts: SqlEditOptions) {
		assertSqlQueryEditable(opts.sqlQuery);

		const existing = await this.chats.getLatestQueryPartByQueryId(opts.queryId);
		if (!existing) {
			throw new HandlerError('NOT_FOUND', `Query ${opts.queryId} not found.`);
		}
		if (existing.userId !== opts.userId) {
			throw new HandlerError('FORBIDDEN', 'You are not authorized to edit this query.');
		}
		if (existing.toolName === EXECUTE_SEMANTIC_QUERY_TOOL_NAME) {
			throw new HandlerError(
				'BAD_REQUEST',
				'Semantic queries cannot be edited as SQL. Ask the agent to adjust the metrics or dimensions.',
			);
		}

		const context = await this.agents.buildChatToolContext({
			projectId: existing.projectId,
			userId: opts.userId,
			chatId: existing.chatId,
		});
		const input: executeSql.Input = {
			sql_query: opts.sqlQuery,
			database_id: opts.databaseId ?? existing.toolInput.database_id ?? undefined,
			name: opts.name ?? existing.toolInput.name ?? undefined,
		};
		return { existing, context, input };
	}
}

/**
 * Query failures (a guard denying the SQL, a warehouse error) reach the editor with their message, as upstream's
 * tRPC error did, instead of the masked internal error.
 */
async function runQuery<T>(run: () => Promise<T>): Promise<T> {
	try {
		return await run();
	} catch (error) {
		if (error instanceof HandlerError) {
			throw error;
		}
		throw new HandlerError('BAD_REQUEST', error instanceof Error ? error.message : String(error));
	}
}

export function assertSqlQueryEditable(sqlQuery: string): void {
	if (!sqlQuery.trim()) {
		throw new HandlerError('BAD_REQUEST', 'SQL query cannot be empty.');
	}
	if (stripSqlFilterBlocks(sqlQuery).trim() === '') {
		throw new HandlerError('BAD_REQUEST', 'SQL query cannot be empty after removing filter blocks.');
	}
}
