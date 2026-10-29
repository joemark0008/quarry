import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class DatabaseSyncResult {
	@Field()
	databaseName: string;

	@Field(() => Int)
	schemasSynced: number;

	@Field(() => Int)
	tablesSynced: number;

	@Field(() => Int)
	renderErrors: number;

	@Field(() => Int)
	removedPaths: number;
}

@ObjectType({ description: 'State of the last context sync of the project.' })
export class ContextSyncStatus {
	@Field({ description: 'idle, queued, running, succeeded or failed.' })
	state: string;

	@Field(() => String, { nullable: true })
	requestedAt: string | null;

	@Field(() => String, { nullable: true })
	startedAt: string | null;

	@Field(() => String, { nullable: true })
	finishedAt: string | null;

	@Field(() => String, { nullable: true })
	message: string | null;

	@Field(() => [DatabaseSyncResult])
	databases: DatabaseSyncResult[];

	@Field(() => [String])
	log: string[];
}
