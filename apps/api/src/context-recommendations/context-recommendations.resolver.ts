import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-type-json';

import {
	CONTEXT_RECOMMENDATION_STATUSES,
	type ContextRecommendationStatus,
} from '../agent/types/context-recommendation.js';
import type { AuthUser } from '../auth/auth.service.js';
import { ProjectAccess } from '../common/decorators/access.decorator.js';
import { CurrentProject, CurrentUser } from '../common/decorators/current.decorator.js';
import { HandlerError } from '../common/errors/handler-error.js';
import type { Project } from '../generated/prisma/client.js';
import { ContextRecommendationsHandler } from './context-recommendations.handler.js';
import { ContextRecommendationsService } from './context-recommendations.service.js';
import {
	ContextRecommendationIdsInput,
	ContextRecommendationTriggerChatsInput,
	SetContextRecommendationConfigInput,
	SetContextRecommendationRepoInput,
	SetContextRecommendationStatusInput,
} from './dto/context-recommendation.input.js';

/** Upstream `contextAdminProtectedProcedure` (billing gates of `cloudBilling*` dropped). */
const ContextAdmin = () => ProjectAccess({ roles: ['admin', 'context_admin'] });

/**
 * Settings → Recommendations: upstream tRPC `contextRecommendation.*`. Results keep upstream's shapes as JSON (the
 * frontend reuses the tRPC output types), dates as ISO strings.
 */
@Resolver()
export class ContextRecommendationsResolver {
	constructor(
		private readonly recommendations: ContextRecommendationsService,
		private readonly scheduler: ContextRecommendationsHandler,
	) {}

	@ContextAdmin()
	@Query(() => GraphQLJSON, { description: 'Upstream `contextRecommendation.list`: by impact, with their feedback.' })
	contextRecommendations(
		@CurrentProject() project: Project,
		@Args('status', { type: () => String, nullable: true }) status?: ContextRecommendationStatus,
	) {
		this.recommendations.assertEnabled();
		if (status && !CONTEXT_RECOMMENDATION_STATUSES.includes(status)) {
			throw new HandlerError('BAD_REQUEST', `Unknown recommendation status: ${status}`);
		}
		return this.recommendations.list(project.id, status);
	}

	@ContextAdmin()
	@Query(() => GraphQLJSON, { nullable: true })
	latestContextRecommendationRun(@CurrentProject() project: Project) {
		this.recommendations.assertEnabled();
		return this.recommendations.getLatestRun(project.id);
	}

	@ContextAdmin()
	@Query(() => GraphQLJSON, { nullable: true })
	latestSuccessfulContextRecommendationRun(@CurrentProject() project: Project) {
		this.recommendations.assertEnabled();
		return this.recommendations.getLatestSuccessfulRun(project.id);
	}

	@ContextAdmin()
	@Mutation(() => GraphQLJSON, { description: 'Starts a manual run in the background: `{ started: true }`.' })
	runContextRecommendations(@CurrentProject() project: Project, @CurrentUser() user: AuthUser) {
		this.recommendations.assertEnabled();
		return this.recommendations.startManualRun(project.id, user.id);
	}

	@ContextAdmin()
	@Mutation(() => GraphQLJSON, { description: 'The run, with `alreadyTerminal` when it had already ended.' })
	cancelContextRecommendationRun(@CurrentProject() project: Project, @Args('runId') runId: string) {
		this.recommendations.assertEnabled();
		return this.recommendations.cancelRun(project.id, runId);
	}

	@ContextAdmin()
	@Query(() => GraphQLJSON)
	contextRecommendationAvailableModels(@CurrentProject() project: Project) {
		this.recommendations.assertEnabled();
		return this.recommendations.listAvailableModels(project.id);
	}

	@ContextAdmin()
	@Query(() => GraphQLJSON, { nullable: true })
	contextRecommendationConfig(@CurrentProject() project: Project) {
		this.recommendations.assertEnabled();
		return this.recommendations.getConfig(project.id);
	}

	@ContextAdmin()
	@Mutation(() => Boolean)
	async setContextRecommendationConfig(
		@CurrentProject() project: Project,
		@Args('input') input: SetContextRecommendationConfigInput,
	): Promise<boolean> {
		this.recommendations.assertEnabled();
		await this.recommendations.setConfig(project.id, input);
		if (input.frequency) {
			await this.scheduler.ensureContextRecommendationsSchedule(project.id, input.frequency, { reset: true });
		}
		return true;
	}

	@ContextAdmin()
	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `contextRecommendation.getRepo`.' })
	contextRecommendationRepo(@CurrentProject() project: Project) {
		this.recommendations.assertEnabled();
		return this.recommendations.resolveRecommendationRepo(project.id);
	}

	@ContextAdmin()
	@Query(() => GraphQLJSON, { description: 'Upstream `contextRecommendation.listLinkedRepos`.' })
	contextRecommendationLinkedRepos(@CurrentProject() project: Project) {
		this.recommendations.assertEnabled();
		return this.recommendations.listLinkedRepos(project.id);
	}

	@ContextAdmin()
	@Mutation(() => Boolean)
	async setContextRecommendationRepo(
		@CurrentProject() project: Project,
		@Args('input') input: SetContextRecommendationRepoInput,
	): Promise<boolean> {
		this.recommendations.assertEnabled();
		await this.recommendations.setRepo(project.id, input.repoFullName ?? null, input.provider);
		return true;
	}

	@ContextAdmin()
	@Mutation(() => Boolean)
	async setContextRecommendationStatus(
		@CurrentProject() project: Project,
		@CurrentUser() user: AuthUser,
		@Args('input') input: SetContextRecommendationStatusInput,
	): Promise<boolean> {
		this.recommendations.assertEnabled();
		await this.recommendations.setStatus(project.id, input.id, input.status, user.id);
		return true;
	}

	@ContextAdmin()
	@Query(() => GraphQLJSON, {
		nullable: true,
		description: 'Upstream `contextRecommendation.getPrStatus`: null until GitHub/GitLab land (Phase 7).',
	})
	contextRecommendationPrStatus(@Args('id') _id: string): null {
		this.recommendations.assertEnabled();
		return null;
	}

	@ContextAdmin()
	@Mutation(() => GraphQLJSON, { description: 'Not available until GitHub/GitLab land (Phase 7).' })
	createContextRecommendationPullRequest(@Args('id') _id: string): never {
		this.recommendations.assertEnabled();
		return this.recommendations.assertPullRequestsAvailable();
	}

	@ContextAdmin()
	@Mutation(() => GraphQLJSON, { description: 'Not available until GitHub/GitLab land (Phase 7).' })
	createContextRecommendationBatchPullRequest(@Args('input') _input: ContextRecommendationIdsInput): never {
		this.recommendations.assertEnabled();
		return this.recommendations.assertPullRequestsAvailable();
	}

	@ContextAdmin()
	@Query(() => String, { description: 'Upstream `contextRecommendation.getAgentPrompt`.' })
	contextRecommendationAgentPrompt(
		@CurrentProject() project: Project,
		@Args('input') input: ContextRecommendationIdsInput,
	): Promise<string> {
		this.recommendations.assertEnabled();
		return this.recommendations.getAgentPrompt(project.id, input.ids);
	}

	@ContextAdmin()
	@Query(() => GraphQLJSON, { description: 'Upstream `contextRecommendation.listRecoTriggerChatMetadata`.' })
	contextRecommendationTriggerChats(
		@CurrentProject() project: Project,
		@Args('input') input: ContextRecommendationTriggerChatsInput,
	) {
		this.recommendations.assertEnabled();
		return this.recommendations.getRecommendationChatMetadata(project.id, input.chatIds);
	}
}
