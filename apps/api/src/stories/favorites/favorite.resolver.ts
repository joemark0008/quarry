import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { UserRole } from '@quarry/shared/types';
import { GraphQLJSON } from 'graphql-type-json';

import type { AuthUser } from '../../auth/auth.service.js';
import { ProjectAccess } from '../../common/decorators/access.decorator.js';
import { CurrentProject, CurrentUser, CurrentUserRole } from '../../common/decorators/current.decorator.js';
import type { Project } from '../../generated/prisma/client.js';
import { StoriesService } from '../stories.service.js';
import { favoriteRoutes } from './favorite.procedures.js';

/** Upstream tRPC `trpc.favorite.*` (stories API conventions). */
@Resolver()
export class FavoriteResolver {
	constructor(private readonly stories: StoriesService) {}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.favorite.toggle`.' })
	favoriteToggle(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(favoriteRoutes, 'toggle', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.favorite.list`.' })
	favoriteList(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(favoriteRoutes, 'list', { user, project, userRole }, input);
	}
}
