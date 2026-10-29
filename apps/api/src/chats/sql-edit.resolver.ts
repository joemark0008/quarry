import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

import type { AuthUser } from '../auth/auth.service.js';
import { CurrentUser } from '../common/decorators/current.decorator.js';
import { SqlEditInput } from './dto/chat.input.js';
import { SqlEditResult } from './models/chat.model.js';
import { SqlEditService } from './sql-edit.service.js';

/** Upstream tRPC `sql.previewQuery` / `sql.updateQuery`: the SQL editor of a chat's query. */
@Resolver()
export class SqlEditResolver {
	constructor(private readonly sqlEdits: SqlEditService) {}

	@Mutation(() => GraphQLJSON, { description: 'Runs an edited query without saving it (`execute_sql` output).' })
	previewSqlQuery(@CurrentUser() user: AuthUser, @Args('input') input: SqlEditInput) {
		return this.sqlEdits.previewSqlQueryInChat(toOptions(input, user.id));
	}

	@Mutation(() => SqlEditResult, { description: "Runs an edited query and saves it in the chat's message." })
	updateSqlQuery(@CurrentUser() user: AuthUser, @Args('input') input: SqlEditInput) {
		return this.sqlEdits.updateSqlQueryInChat(toOptions(input, user.id));
	}
}

function toOptions(input: SqlEditInput, userId: string) {
	return {
		queryId: input.queryId,
		sqlQuery: input.sqlQuery,
		databaseId: input.databaseId ?? undefined,
		name: input.name ?? undefined,
		userId,
	};
}
