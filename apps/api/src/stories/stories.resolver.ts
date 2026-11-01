import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { UserRole } from '@quarry/shared/types';
import { GraphQLJSON } from 'graphql-type-json';

import type { AuthUser } from '../auth/auth.service.js';
import { ProjectAccess } from '../common/decorators/access.decorator.js';
import { CurrentProject, CurrentUser, CurrentUserRole } from '../common/decorators/current.decorator.js';
import type { Project } from '../generated/prisma/client.js';
import { chatForkStoryRoutes } from './procedures/chat-fork-story.procedures.js';
import { customStoryViewerRoutes } from './procedures/custom-story-viewer.procedures.js';
import { storyRoutes } from './procedures/story.procedures.js';
import { storyFolderRoutes } from './procedures/story-folder.procedures.js';
import { storyThemeRoutes } from './procedures/story-theme.procedures.js';
import { StoriesService } from './stories.service.js';

/** Upstream tRPC `trpc.story.*`: one field per procedure, `input` in upstream's shape (validated with its zod schema). */
@Resolver()
export class StoryResolver {
	constructor(private readonly stories: StoriesService) {}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.listAll`.' })
	storyListAll(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'listAll', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.listArchived`.' })
	storyListArchived(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'listArchived', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.listStandalone`.' })
	storyListStandalone(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'listStandalone', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.listStandaloneArchived`.' })
	storyListStandaloneArchived(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'listStandaloneArchived', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.listReferenceable`.' })
	storyListReferenceable(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'listReferenceable', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.listMostViewed`.' })
	storyListMostViewed(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'listMostViewed', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.resolve`.' })
	storyResolve(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'resolve', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.listQuickQuestions`.' })
	storyListQuickQuestions(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'listQuickQuestions', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.listMentioningChats`.' })
	storyListMentioningChats(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'listMentioningChats', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.getIdByChatAndSlug`.' })
	storyGetIdByChatAndSlug(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'getIdByChatAndSlug', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.getStandalone`.' })
	storyGetStandalone(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'getStandalone', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.getLatest`.' })
	storyGetLatest(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'getLatest', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.listVersions`.' })
	storyListVersions(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'listVersions', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.getVersionQueryData`.' })
	storyGetVersionQueryData(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'getVersionQueryData', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.getCustomVersion`.' })
	storyGetCustomVersion(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'getCustomVersion', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.getCustomVersionFile`.' })
	storyGetCustomVersionFile(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'getCustomVersionFile', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.getCustomStoryQueryData`.' })
	storyGetCustomStoryQueryData(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'getCustomStoryQueryData', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.getCustomStoryQuerySql`.' })
	storyGetCustomStoryQuerySql(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'getCustomStoryQuerySql', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.getCustomStoryNarratives`.' })
	storyGetCustomStoryNarratives(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'getCustomStoryNarratives', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.getCustomStoryState`.' })
	storyGetCustomStoryState(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'getCustomStoryState', { user, project, userRole }, input);
	}

	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.setCustomStoryState`.' })
	storySetCustomStoryState(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'setCustomStoryState', { user, project, userRole }, input);
	}

	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.editCustomStoryBlock`.' })
	storyEditCustomStoryBlock(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'editCustomStoryBlock', { user, project, userRole }, input);
	}

	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.saveCustomStoryFiles`.' })
	storySaveCustomStoryFiles(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'saveCustomStoryFiles', { user, project, userRole }, input);
	}

	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.restoreCustomVersion`.' })
	storyRestoreCustomVersion(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'restoreCustomVersion', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.listStories`.' })
	storyListStories(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'listStories', { user, project, userRole }, input);
	}

	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.rename`.' })
	storyRename(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'rename', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.getCertification`.' })
	storyGetCertification(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'getCertification', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.toggleCertification`.' })
	storyToggleCertification(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'toggleCertification', { user, project, userRole }, input);
	}

	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.createVersion`.' })
	storyCreateVersion(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'createVersion', { user, project, userRole }, input);
	}

	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.updateLiveSettings`.' })
	storyUpdateLiveSettings(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'updateLiveSettings', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.getDelivery`.' })
	storyGetDelivery(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'getDelivery', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.listDeliveryRecipients`.' })
	storyListDeliveryRecipients(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'listDeliveryRecipients', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.listDeliveryRecipientGroups`.' })
	storyListDeliveryRecipientGroups(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'listDeliveryRecipientGroups', { user, project, userRole }, input);
	}

	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.updateDelivery`.' })
	storyUpdateDelivery(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'updateDelivery', { user, project, userRole }, input);
	}

	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.refreshData`.' })
	storyRefreshData(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'refreshData', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.getLiveQueryData`.' })
	storyGetLiveQueryData(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'getLiveQueryData', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.getFilterOptions`.' })
	storyGetFilterOptions(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'getFilterOptions', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.getFilteredQueryData`.' })
	storyGetFilteredQueryData(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'getFilteredQueryData', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.getQuerySql`.' })
	storyGetQuerySql(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'getQuerySql', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.parseCronFromText`.' })
	storyParseCronFromText(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'parseCronFromText', { user, project, userRole }, input);
	}

	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.archive`.' })
	storyArchive(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'archive', { user, project, userRole }, input);
	}

	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.unarchive`.' })
	storyUnarchive(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'unarchive', { user, project, userRole }, input);
	}

	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.archiveStandalone`.' })
	storyArchiveStandalone(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'archiveStandalone', { user, project, userRole }, input);
	}

	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.unarchiveStandalone`.' })
	storyUnarchiveStandalone(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'unarchiveStandalone', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.listSharedArchived`.' })
	storyListSharedArchived(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'listSharedArchived', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Deletes a story for good (quarry addition).' })
	storyDeletePermanently(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'deletePermanently', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.archiveShared`.' })
	storyArchiveShared(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'archiveShared', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.unarchiveShared`.' })
	storyUnarchiveShared(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'unarchiveShared', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.bulkArchive`.' })
	storyBulkArchive(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'bulkArchive', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.story.bulkUnarchive`.' })
	storyBulkUnarchive(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyRoutes, 'bulkUnarchive', { user, project, userRole }, input);
	}
}

/** Upstream tRPC `trpc.storyFolder.*`: one field per procedure, `input` in upstream's shape (validated with its zod schema). */
@Resolver()
export class StoryFolderResolver {
	constructor(private readonly stories: StoriesService) {}

	@ProjectAccess()
	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.storyFolder.listTree`.' })
	storyFolderListTree(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyFolderRoutes, 'listTree', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.storyFolder.listItems`.' })
	storyFolderListItems(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyFolderRoutes, 'listItems', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.storyFolder.create`.' })
	storyFolderCreate(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyFolderRoutes, 'create', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.storyFolder.rename`.' })
	storyFolderRename(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyFolderRoutes, 'rename', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.storyFolder.delete`.' })
	storyFolderDelete(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyFolderRoutes, 'delete', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.storyFolder.archive`.' })
	storyFolderArchive(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyFolderRoutes, 'archive', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.storyFolder.unarchive`.' })
	storyFolderUnarchive(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyFolderRoutes, 'unarchive', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.storyFolder.bulkArchive`.' })
	storyFolderBulkArchive(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyFolderRoutes, 'bulkArchive', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.storyFolder.bulkUnarchive`.' })
	storyFolderBulkUnarchive(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyFolderRoutes, 'bulkUnarchive', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.storyFolder.move`.' })
	storyFolderMove(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyFolderRoutes, 'move', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.storyFolder.moveStory`.' })
	storyFolderMoveStory(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyFolderRoutes, 'moveStory', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.storyFolder.bulkMove`.' })
	storyFolderBulkMove(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyFolderRoutes, 'bulkMove', { user, project, userRole }, input);
	}
}

/** Upstream tRPC `trpc.storyTheme.*`: one field per procedure, `input` in upstream's shape (validated with its zod schema). */
@Resolver()
export class StoryThemeResolver {
	constructor(private readonly stories: StoriesService) {}

	@ProjectAccess()
	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.storyTheme.getActive`.' })
	storyThemeGetActive(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyThemeRoutes, 'getActive', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.storyTheme.getState`.' })
	storyThemeGetState(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyThemeRoutes, 'getState', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.storyTheme.listVersions`.' })
	storyThemeListVersions(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyThemeRoutes, 'listVersions', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.storyTheme.save`.' })
	storyThemeSave(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyThemeRoutes, 'save', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.storyTheme.restoreVersion`.' })
	storyThemeRestoreVersion(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyThemeRoutes, 'restoreVersion', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.storyTheme.setEnabled`.' })
	storyThemeSetEnabled(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(storyThemeRoutes, 'setEnabled', { user, project, userRole }, input);
	}
}

/** Upstream tRPC `trpc.customStoryViewer.*`: one field per procedure, `input` in upstream's shape (validated with its zod schema). */
@Resolver()
export class CustomStoryViewerResolver {
	constructor(private readonly stories: StoriesService) {}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.customStoryViewer.getFormat`.' })
	customStoryViewerGetFormat(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(customStoryViewerRoutes, 'getFormat', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.customStoryViewer.getTheme`.' })
	customStoryViewerGetTheme(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(customStoryViewerRoutes, 'getTheme', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.customStoryViewer.getVersion`.' })
	customStoryViewerGetVersion(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(customStoryViewerRoutes, 'getVersion', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.customStoryViewer.getFile`.' })
	customStoryViewerGetFile(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(customStoryViewerRoutes, 'getFile', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.customStoryViewer.getQueryData`.' })
	customStoryViewerGetQueryData(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(customStoryViewerRoutes, 'getQueryData', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.customStoryViewer.getQuerySql`.' })
	customStoryViewerGetQuerySql(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(customStoryViewerRoutes, 'getQuerySql', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.customStoryViewer.getState`.' })
	customStoryViewerGetState(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(customStoryViewerRoutes, 'getState', { user, project, userRole }, input);
	}

	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.customStoryViewer.setState`.' })
	customStoryViewerSetState(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(customStoryViewerRoutes, 'setState', { user, project, userRole }, input);
	}

	@Query(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.customStoryViewer.getNarratives`.' })
	customStoryViewerGetNarratives(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(customStoryViewerRoutes, 'getNarratives', { user, project, userRole }, input);
	}
}

/** The story procedures of upstream tRPC `trpc.chatFork.*` (the chat ones are in the chats module): one field per procedure, `input` in upstream's shape (validated with its zod schema). */
@Resolver()
export class ChatForkStoryResolver {
	constructor(private readonly stories: StoriesService) {}

	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.chatFork.askStory`.' })
	chatForkAskStory(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(chatForkStoryRoutes, 'askStory', { user, project, userRole }, input);
	}

	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.chatFork.forkStory`.' })
	chatForkForkStory(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(chatForkStoryRoutes, 'forkStory', { user, project, userRole }, input);
	}

	@ProjectAccess()
	@Mutation(() => GraphQLJSON, { nullable: true, description: 'Upstream `trpc.chatFork.openStandalone`.' })
	chatForkOpenStandalone(
		@CurrentUser() user: AuthUser,
		@CurrentProject() project: Project | undefined,
		@CurrentUserRole() userRole: UserRole | null | undefined,
		@Args('input', { type: () => GraphQLJSON, nullable: true }) input?: unknown,
	) {
		return this.stories.run(chatForkStoryRoutes, 'openStandalone', { user, project, userRole }, input);
	}
}
