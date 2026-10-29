import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { UserRole } from '@quarry/shared/types';
import { GraphQLJSON } from 'graphql-type-json';

import type { AuthUser } from '../../auth/auth.service.js';
import { ProjectAccess } from '../../common/decorators/access.decorator.js';
import { CurrentProject, CurrentUser, CurrentUserRole } from '../../common/decorators/current.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { Project } from '../../generated/prisma/client.js';
import { customStoryViewerRoutes } from '../procedures/custom-story-viewer.procedures.js';
import { storyRoutes } from '../procedures/story.procedures.js';
import { storyThemeRoutes } from '../procedures/story-theme.procedures.js';
import { embedRoutes } from './embed.procedures.js';
import { sharedChatStoryRoutes } from './shared-chat-story.procedures.js';
import { sharedStoryRoutes } from './shared-story.procedures.js';
import { StorySharingService } from './story-sharing.service.js';

/** Upstream tRPC `trpc.sharedStory.*` (`list`, `create`, `getStoryIdByShareId`, `get`, `getCustomVersion`, `getCustomStoryQuerySql`, `getCustomStoryQueryData`, `getCustomStoryNarratives`, `getCustomStoryState`, `setCustomStoryState`, `downloadCustom`, `getVersionQueryData`, `getLiveQueryData`, `getFilterOptions`, `getFilteredQueryData`, `getQuerySql`, `refreshData`, `getSharedStoryInfo`, `listShareableGroups`, `updateAccess`, `togglePin`, `delete`, `download`): JSON in, JSON out, as `StoryResolver`. */
@Resolver()
export class SharedStoryResolver {
	constructor(private readonly sharing: StorySharingService) {}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.sharedStory.list`.' })
	sharedStoryList(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(sharedStoryRoutes, 'list', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.sharedStory.create`.' })
	sharedStoryCreate(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(sharedStoryRoutes, 'create', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.sharedStory.getStoryIdByShareId`.' })
	sharedStoryGetStoryIdByShareId(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(sharedStoryRoutes, 'getStoryIdByShareId', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.sharedStory.get`.' })
	sharedStoryGet(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(sharedStoryRoutes, 'get', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.sharedStory.getCustomVersion`.' })
	sharedStoryGetCustomVersion(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(sharedStoryRoutes, 'getCustomVersion', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.sharedStory.getCustomStoryQuerySql`.' })
	sharedStoryGetCustomStoryQuerySql(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(sharedStoryRoutes, 'getCustomStoryQuerySql', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.sharedStory.getCustomStoryQueryData`.' })
	sharedStoryGetCustomStoryQueryData(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(sharedStoryRoutes, 'getCustomStoryQueryData', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.sharedStory.getCustomStoryNarratives`.' })
	sharedStoryGetCustomStoryNarratives(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(sharedStoryRoutes, 'getCustomStoryNarratives', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.sharedStory.getCustomStoryState`.' })
	sharedStoryGetCustomStoryState(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(sharedStoryRoutes, 'getCustomStoryState', { user, project, userRole }, input);
	}

	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.sharedStory.setCustomStoryState`.' })
	sharedStorySetCustomStoryState(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(sharedStoryRoutes, 'setCustomStoryState', { user, project, userRole }, input);
	}

	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.sharedStory.downloadCustom`.' })
	sharedStoryDownloadCustom(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(sharedStoryRoutes, 'downloadCustom', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.sharedStory.getVersionQueryData`.' })
	sharedStoryGetVersionQueryData(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(sharedStoryRoutes, 'getVersionQueryData', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.sharedStory.getLiveQueryData`.' })
	sharedStoryGetLiveQueryData(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(sharedStoryRoutes, 'getLiveQueryData', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.sharedStory.getFilterOptions`.' })
	sharedStoryGetFilterOptions(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(sharedStoryRoutes, 'getFilterOptions', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.sharedStory.getFilteredQueryData`.' })
	sharedStoryGetFilteredQueryData(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(sharedStoryRoutes, 'getFilteredQueryData', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.sharedStory.getQuerySql`.' })
	sharedStoryGetQuerySql(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(sharedStoryRoutes, 'getQuerySql', { user, project, userRole }, input);
	}

	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.sharedStory.refreshData`.' })
	sharedStoryRefreshData(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(sharedStoryRoutes, 'refreshData', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.sharedStory.getSharedStoryInfo`.' })
	sharedStoryGetSharedStoryInfo(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(sharedStoryRoutes, 'getSharedStoryInfo', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.sharedStory.listShareableGroups`.' })
	sharedStoryListShareableGroups(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(sharedStoryRoutes, 'listShareableGroups', { user, project, userRole }, input);
	}

	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.sharedStory.updateAccess`.' })
	sharedStoryUpdateAccess(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(sharedStoryRoutes, 'updateAccess', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.sharedStory.togglePin`.' })
	sharedStoryTogglePin(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(sharedStoryRoutes, 'togglePin', { user, project, userRole }, input);
	}

	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.sharedStory.delete`.' })
	sharedStoryDelete(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(sharedStoryRoutes, 'delete', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.sharedStory.download`.' })
	sharedStoryDownload(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(sharedStoryRoutes, 'download', { user, project, userRole }, input);
	}
}

/** Upstream tRPC `trpc.story.*` (`download`, `downloadStandalone`, `downloadCustom`): JSON in, JSON out, as `StoryResolver`. */
@Resolver()
export class StoryDownloadResolver {
	constructor(private readonly sharing: StorySharingService) {}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.download`.' })
	storyDownload(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(storyRoutes, 'download', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.downloadStandalone`.' })
	storyDownloadStandalone(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(storyRoutes, 'downloadStandalone', { user, project, userRole }, input);
	}

	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.downloadCustom`.' })
	storyDownloadCustom(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(storyRoutes, 'downloadCustom', { user, project, userRole }, input);
	}
}

/** Upstream tRPC `trpc.customStoryViewer.*` (`download`): JSON in, JSON out, as `StoryResolver`. */
@Resolver()
export class CustomStoryViewerDownloadResolver {
	constructor(private readonly sharing: StorySharingService) {}

	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.customStoryViewer.download`.' })
	customStoryViewerDownload(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(customStoryViewerRoutes, 'download', { user, project, userRole }, input);
	}
}

/** Upstream tRPC `trpc.sharedChat.*` (`downloadStory`): JSON in, JSON out, as `StoryResolver`. */
@Resolver()
export class SharedChatStoryResolver {
	constructor(private readonly sharing: StorySharingService) {}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.sharedChat.downloadStory`.' })
	sharedChatDownloadStory(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(sharedChatStoryRoutes, 'downloadStory', { user, project, userRole }, input);
	}
}

/** Upstream tRPC `trpc.storyTheme.*` (`generate`): JSON in, JSON out, as `StoryResolver`. */
@Resolver()
export class StoryThemeGenerateResolver {
	constructor(private readonly sharing: StorySharingService) {}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.storyTheme.generate`.' })
	storyThemeGenerate(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.sharing.run(storyThemeRoutes, 'generate', { user, project, userRole }, input);
	}
}

/** Upstream tRPC `trpc.embed.*`: public, authenticated by the embed token in `input`. */
@Resolver()
export class EmbedResolver {
	constructor(private readonly sharing: StorySharingService) {}

	@Public()
	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.embed.getStory`.' })
	embedGetStory(@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown) {
		return this.sharing.runPublic(embedRoutes, 'getStory', input);
	}

	@Public()
	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.embed.getChart`.' })
	embedGetChart(@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown) {
		return this.sharing.runPublic(embedRoutes, 'getChart', input);
	}

	@Public()
	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.embed.getMap`.' })
	embedGetMap(@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown) {
		return this.sharing.runPublic(embedRoutes, 'getMap', input);
	}

	@Public()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.embed.downloadStory`.' })
	embedDownloadStory(@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown) {
		return this.sharing.runPublic(embedRoutes, 'downloadStory', input);
	}
}
