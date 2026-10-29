import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import type { QueryToolParameterType, QueryToolParameterValue } from '@quarry/shared/query-tools';
import { GraphQLJSON } from 'graphql-type-json';

@ObjectType({ description: 'A typed argument of a saved query tool, written `{{ name }}` in its SQL.' })
export class QueryToolParameter {
	@Field()
	name: string;

	@Field(() => String, { description: 'string, number, integer, boolean or date (YYYY-MM-DD).' })
	type: QueryToolParameterType;

	@Field(() => String, { nullable: true })
	description?: string | null;

	@Field()
	required: boolean;

	@Field(() => GraphQLJSON, { nullable: true, description: 'Used when an optional argument is left out.' })
	default?: QueryToolParameterValue;
}

@ObjectType({ description: "A named, parameterized SQL query on the project's warehouse, callable by the agent." })
export class ProjectQueryTool {
	@Field(() => ID)
	id: string;

	@Field({ description: 'snake_case name; the agent calls it as `qt_<name>`.' })
	name: string;

	@Field({ description: 'The tool name the agent sees.' })
	agentToolName: string;

	@Field()
	description: string;

	@Field({ description: 'SQL with `{{ name }}` placeholders.' })
	sqlTemplate: string;

	@Field(() => [QueryToolParameter])
	parameters: QueryToolParameter[];

	@Field(() => String, { nullable: true, description: 'Warehouse connection; null for the default one.' })
	databaseId: string | null;

	@Field()
	enabled: boolean;

	@Field(() => String, { nullable: true })
	createdBy: string | null;

	@Field({ description: 'Whether the signed-in user may edit or delete it (project admins and its creator).' })
	canEdit: boolean;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

@ObjectType({ description: 'Rows of a query tool run from the editor.' })
export class QueryToolPreview {
	@Field(() => [String])
	columns: string[];

	@Field(() => GraphQLJSON, { description: 'Rows as objects keyed by column.' })
	rows: Record<string, unknown>[];

	@Field(() => Int)
	rowCount: number;

	@Field({ description: 'True when more rows matched than the preview returns.' })
	truncated: boolean;

	@Field({ description: 'The query as run, with the argument values written in.' })
	sql: string;
}

@ObjectType({ description: 'A column of a synced warehouse table, for the query builder.' })
export class QueryToolColumn {
	@Field()
	name: string;

	@Field({ description: 'Type name as the context sync recorded it.' })
	type: string;
}
