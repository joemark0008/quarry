import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { UserRole } from '@quarry/shared/types';
import { GraphQLJSON } from 'graphql-type-json';

import type { AuthUser } from '../../auth/auth.service.js';
import { ProjectAccess } from '../../common/decorators/access.decorator.js';
import { CurrentProject, CurrentUser, CurrentUserRole } from '../../common/decorators/current.decorator.js';
import type { Project } from '../../generated/prisma/client.js';
import { StoriesService } from '../stories.service.js';
import { feedbackRoutes } from './feedback.procedures.js';

/** Upstream tRPC `trpc.feedback.getStoryFeedback` / `submitStoryFeedback` (stories API conventions). */
@Resolver()
export class StoryFeedbackResolver {
	constructor(private readonly stories: StoriesService) {}

	@ProjectAccess()
	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.feedback.getStoryFeedback`.' })
	feedbackGetStoryFeedback(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(feedbackRoutes, 'getStoryFeedback', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.feedback.submitStoryFeedback`.' })
	feedbackSubmitStoryFeedback(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(feedbackRoutes, 'submitStoryFeedback', { user, project, userRole }, input);
	}
}
