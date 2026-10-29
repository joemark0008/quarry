import { Field, ID, InputType } from '@nestjs/graphql';
import {
	QUERY_TOOL_DESCRIPTION_MAX_LENGTH,
	QUERY_TOOL_MAX_PARAMETERS,
	QUERY_TOOL_NAME_MAX_LENGTH,
	QUERY_TOOL_NAME_MIN_LENGTH,
	QUERY_TOOL_NAME_PATTERN,
	QUERY_TOOL_PARAMETER_NAME_MAX_LENGTH,
	QUERY_TOOL_PARAMETER_TYPES,
	QUERY_TOOL_SQL_MAX_LENGTH,
	type QueryToolParameterType,
	type QueryToolParameterValue,
} from '@quarry/shared/query-tools';
import { Transform, Type } from 'class-transformer';
import {
	ArrayMaxSize,
	IsBoolean,
	IsIn,
	IsObject,
	IsOptional,
	IsString,
	Matches,
	MaxLength,
	MinLength,
	ValidateNested,
} from 'class-validator';
import { GraphQLJSON } from 'graphql-type-json';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

const NAME_MESSAGE = 'Use snake_case: lowercase letters, digits and underscores, starting with a letter.';

@InputType()
export class QueryToolParameterInput {
	@Field()
	@Transform(trim)
	@IsString()
	@MaxLength(QUERY_TOOL_PARAMETER_NAME_MAX_LENGTH)
	@Matches(QUERY_TOOL_NAME_PATTERN, { message: NAME_MESSAGE })
	name: string;

	@Field(() => String)
	@IsIn(QUERY_TOOL_PARAMETER_TYPES)
	type: QueryToolParameterType;

	@Field(() => String, { nullable: true })
	@Transform(trim)
	@IsOptional()
	@IsString()
	@MaxLength(QUERY_TOOL_DESCRIPTION_MAX_LENGTH)
	description?: string | null;

	@Field()
	@IsBoolean()
	required: boolean;

	@Field(() => GraphQLJSON, { nullable: true })
	@IsOptional()
	default?: QueryToolParameterValue;
}

@InputType()
export class CreateProjectQueryToolInput {
	@Field()
	@Transform(trim)
	@IsString()
	@MinLength(QUERY_TOOL_NAME_MIN_LENGTH)
	@MaxLength(QUERY_TOOL_NAME_MAX_LENGTH)
	@Matches(QUERY_TOOL_NAME_PATTERN, { message: NAME_MESSAGE })
	name: string;

	@Field()
	@Transform(trim)
	@IsString()
	@MinLength(1, { message: 'Describe what the tool returns, so the agent knows when to call it.' })
	@MaxLength(QUERY_TOOL_DESCRIPTION_MAX_LENGTH)
	description: string;

	@Field()
	@IsString()
	@MinLength(1)
	@MaxLength(QUERY_TOOL_SQL_MAX_LENGTH)
	sqlTemplate: string;

	@Field(() => [QueryToolParameterInput], { defaultValue: [] })
	@ArrayMaxSize(QUERY_TOOL_MAX_PARAMETERS)
	@ValidateNested({ each: true })
	@Type(() => QueryToolParameterInput)
	parameters: QueryToolParameterInput[];

	@Field(() => String, { nullable: true })
	@Transform(trim)
	@IsOptional()
	@IsString()
	databaseId?: string | null;

	@Field({ nullable: true })
	@IsOptional()
	@IsBoolean()
	enabled?: boolean;
}

@InputType()
export class UpdateProjectQueryToolInput {
	@Field(() => ID)
	@IsString()
	id: string;

	@Field({ nullable: true })
	@Transform(trim)
	@IsOptional()
	@IsString()
	@MinLength(QUERY_TOOL_NAME_MIN_LENGTH)
	@MaxLength(QUERY_TOOL_NAME_MAX_LENGTH)
	@Matches(QUERY_TOOL_NAME_PATTERN, { message: NAME_MESSAGE })
	name?: string;

	@Field({ nullable: true })
	@Transform(trim)
	@IsOptional()
	@IsString()
	@MinLength(1)
	@MaxLength(QUERY_TOOL_DESCRIPTION_MAX_LENGTH)
	description?: string;

	@Field({ nullable: true })
	@IsOptional()
	@IsString()
	@MinLength(1)
	@MaxLength(QUERY_TOOL_SQL_MAX_LENGTH)
	sqlTemplate?: string;

	@Field(() => [QueryToolParameterInput], { nullable: true })
	@IsOptional()
	@ArrayMaxSize(QUERY_TOOL_MAX_PARAMETERS)
	@ValidateNested({ each: true })
	@Type(() => QueryToolParameterInput)
	parameters?: QueryToolParameterInput[];

	@Field(() => String, { nullable: true })
	@Transform(trim)
	@IsOptional()
	@IsString()
	databaseId?: string | null;

	@Field({ nullable: true })
	@IsOptional()
	@IsBoolean()
	enabled?: boolean;
}

@InputType()
export class PreviewProjectQueryToolInput {
	@Field()
	@IsString()
	@MinLength(1)
	@MaxLength(QUERY_TOOL_SQL_MAX_LENGTH)
	sqlTemplate: string;

	@Field(() => [QueryToolParameterInput], { defaultValue: [] })
	@ArrayMaxSize(QUERY_TOOL_MAX_PARAMETERS)
	@ValidateNested({ each: true })
	@Type(() => QueryToolParameterInput)
	parameters: QueryToolParameterInput[];

	@Field(() => GraphQLJSON, { nullable: true, description: 'Argument values by parameter name.' })
	@IsOptional()
	@IsObject()
	values?: Record<string, unknown>;

	@Field(() => String, { nullable: true })
	@Transform(trim)
	@IsOptional()
	@IsString()
	databaseId?: string | null;
}
