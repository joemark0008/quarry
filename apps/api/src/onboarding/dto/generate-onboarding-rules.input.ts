import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, MaxLength } from 'class-validator';

@InputType()
export class GenerateOnboardingRulesInput {
	@Field(() => String, {
		nullable: true,
		description: 'What the business does; a public https URL in it is fetched for more context.',
	})
	@IsOptional()
	@IsString()
	@MaxLength(15_000)
	additionalContext?: string | null;
}
