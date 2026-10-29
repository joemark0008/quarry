import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'A sandbox secret of the signed-in user in the project, without its value.' })
export class SandboxSecret {
	@Field(() => ID)
	id: string;

	@Field({ description: 'Environment variable name inside `execute_sandboxed_code`.' })
	name: string;

	@Field(() => String, { nullable: true })
	description: string | null;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}
