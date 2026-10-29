import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'A database configured in the project (`quarry_config.yaml`), without its secrets.' })
export class WarehouseConnection {
	@Field()
	name: string;

	@Field({ description: 'Warehouse type (`postgres`, or a type quarry cannot query yet).' })
	type: string;

	@Field()
	supported: boolean;

	@Field(() => String, { nullable: true })
	host: string | null;

	@Field(() => Int, { nullable: true })
	port: number | null;

	@Field(() => String, { nullable: true })
	database: string | null;

	@Field(() => String, { nullable: true })
	user: string | null;

	@Field(() => String, { nullable: true })
	schemaName: string | null;

	@Field()
	ssl: boolean;

	@Field({ description: 'Only tables present in the synced context can be queried.' })
	allowListedOnly: boolean;

	@Field()
	hasPassword: boolean;
}

@ObjectType()
export class WarehouseConnectionResult {
	@Field()
	success: boolean;

	@Field()
	message: string;

	@Field(() => [String], { description: 'Form fields the error most likely points at.' })
	fields: string[];
}
