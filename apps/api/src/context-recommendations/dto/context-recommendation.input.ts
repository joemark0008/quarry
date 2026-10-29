import { Field, InputType, Int } from '@nestjs/graphql';
import { MAX_TRIGGER_CHATS } from '@quarry/shared/context-recommendation';
import { LLM_PROVIDERS, type LlmProvider, REPO_PROVIDERS, type RepoProvider } from '@quarry/shared/types';
import {
	ArrayMaxSize,
	ArrayMinSize,
	IsBoolean,
	IsIn,
	IsInt,
	IsOptional,
	IsString,
	Matches,
	Max,
	MaxLength,
	Min,
} from 'class-validator';

import {
	CONTEXT_RECOMMENDATION_FREQUENCIES,
	CONTEXT_RECOMMENDATION_STATUSES,
	type ContextRecommendationFrequency,
	type ContextRecommendationStatus,
	MAX_AUTO_PRS_PER_RUN,
	MIN_AUTO_PRS_PER_RUN,
} from '../../agent/types/context-recommendation.js';

export const MAX_CUSTOM_SYSTEM_PROMPT_INSTRUCTIONS_LENGTH = 4000;
const MAX_SELECTED_RECOMMENDATIONS = 20;
const REPO_FULL_NAME_PATTERN = /^[\w./-]+\/[\w.-]+$/;

/** Upstream tRPC `contextRecommendation.setConfig` input. */
@InputType()
export class SetContextRecommendationConfigInput {
	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsIn(LLM_PROVIDERS)
	modelProvider?: LlmProvider;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsString()
	modelId?: string;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsIn(CONTEXT_RECOMMENDATION_FREQUENCIES)
	frequency?: ContextRecommendationFrequency;

	@Field(() => String, {
		nullable: true,
		description: 'Trimmed; an empty value clears the instructions. Omit to keep them.',
	})
	@IsOptional()
	@IsString()
	@MaxLength(MAX_CUSTOM_SYSTEM_PROMPT_INSTRUCTIONS_LENGTH)
	customSystemPromptInstructions?: string;

	@Field(() => Boolean, { nullable: true })
	@IsOptional()
	@IsBoolean()
	autoCreatePrs?: boolean;

	@Field(() => Int, { nullable: true })
	@IsOptional()
	@IsInt()
	@Min(MIN_AUTO_PRS_PER_RUN)
	@Max(MAX_AUTO_PRS_PER_RUN)
	maxAutoPrsPerRun?: number;
}

/** Upstream tRPC `contextRecommendation.setRepo` input. */
@InputType()
export class SetContextRecommendationRepoInput {
	@Field(() => String, { nullable: true, description: 'Repository in "owner/name" format; null disconnects it.' })
	@IsOptional()
	@IsString()
	@Matches(REPO_FULL_NAME_PATTERN, { message: 'Expected a repository in "owner/name" format' })
	repoFullName: string | null;

	@Field(() => String, { nullable: true })
	@IsOptional()
	@IsIn(REPO_PROVIDERS)
	provider?: RepoProvider;
}

/** Upstream tRPC `contextRecommendation.setStatus` input. */
@InputType()
export class SetContextRecommendationStatusInput {
	@Field()
	@IsString()
	id: string;

	@Field(() => String)
	@IsIn(CONTEXT_RECOMMENDATION_STATUSES)
	status: ContextRecommendationStatus;
}

/** A selection of recommendations (PR batch, agent prompt). */
@InputType()
export class ContextRecommendationIdsInput {
	@Field(() => [String])
	@IsString({ each: true })
	@ArrayMinSize(1)
	@ArrayMaxSize(MAX_SELECTED_RECOMMENDATIONS)
	ids: string[];
}

@InputType()
export class ContextRecommendationTriggerChatsInput {
	@Field(() => [String])
	@IsString({ each: true })
	@ArrayMaxSize(MAX_TRIGGER_CHATS)
	chatIds: string[];
}
