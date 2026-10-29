import { Field, InputType, Int } from '@nestjs/graphql';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

@InputType()
export class WarehouseConnectionInput {
	@Field({ description: 'Connection name, used for the context folder when two connections share a database.' })
	@IsString()
	@Matches(/^[A-Za-z0-9][A-Za-z0-9 _.-]*$/, { message: 'Use letters, digits, spaces, dots, dashes or underscores' })
	@MaxLength(64)
	name: string;

	@Field()
	@IsString()
	@MinLength(1)
	host: string;

	@Field(() => Int, { defaultValue: 5432 })
	@IsInt()
	@Min(1)
	@Max(65_535)
	port: number;

	@Field()
	@IsString()
	@MinLength(1)
	database: string;

	@Field()
	@IsString()
	@MinLength(1)
	user: string;

	@Field(() => String, { nullable: true, description: 'Leave empty to keep the stored password.' })
	@IsOptional()
	@IsString()
	password?: string | null;

	@Field(() => String, { nullable: true, description: 'Limit the connection to one schema.' })
	@IsOptional()
	@IsString()
	schemaName?: string | null;

	@Field(() => Boolean, { nullable: true })
	@IsOptional()
	@IsBoolean()
	ssl?: boolean | null;
}
