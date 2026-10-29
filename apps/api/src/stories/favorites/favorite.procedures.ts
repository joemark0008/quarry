import { HandlerError } from '../../common/errors/handler-error.js';
import { favoriteQueries } from '../jobs/story-job-queries.js';
import { projectProtectedProcedure } from '../procedure.js';
import { projectQueries, storyFolderQueries, storyQueries } from '../story-queries.js';
import { logAnalyticsEvent } from '../utils/analytics-event.js';

/** Port of upstream `trpc/favorite.routes.ts` (`trpc.favorite.*`): favorite stories and story folders. */
export const favoriteRoutes = {
	toggle: projectProtectedProcedure.input(favoriteQueries.favoriteTargetSchema).mutation(async ({ input, ctx }) => {
		if (input.type === 'story') {
			const canAccess = await storyQueries.canUserAccessStory(input.id, ctx.user.id);
			if (!canAccess) {
				throw new HandlerError('FORBIDDEN', 'You do not have access to this story.');
			}
		} else {
			const folder = await storyFolderQueries.getFolderById(input.id);
			if (!folder || (folder.visibility === 'private' && folder.ownerId !== ctx.user.id)) {
				throw new HandlerError('NOT_FOUND', 'Folder not found.');
			}
			const userRole = await projectQueries.getUserRoleInProject(folder.projectId, ctx.user.id);
			if (!userRole) {
				throw new HandlerError('NOT_FOUND', 'Folder not found.');
			}
		}

		const isFavorited = await favoriteQueries.toggleFavorite(ctx.user.id, { type: input.type, id: input.id });

		if (input.type === 'story') {
			logAnalyticsEvent({
				projectId: ctx.project.id,
				type: 'favorite',
				assetType: 'story',
				actorUserId: ctx.user.id,
				storyId: input.id,
				metadata: { type: 'favorite', favorited: isFavorited },
			});
		}

		return { isFavorited };
	}),

	list: projectProtectedProcedure.query(async ({ ctx }) => {
		return favoriteQueries.listFavorites(ctx.user.id, ctx.project.id);
	}),
};
