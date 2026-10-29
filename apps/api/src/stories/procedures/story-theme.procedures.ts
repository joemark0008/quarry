import { storyThemePairSchema } from '@quarry/shared/story-theme';
import { storyThemeGenerationSchema } from '@quarry/shared/story-theme-generation';
import { z } from 'zod';

import { HandlerError } from '../../common/errors/handler-error.js';
import { env } from '../env.js';
import {
	advancedSettingsProtectedProcedure,
	assertUserGroupFeatureForTrpc,
	cloudBillingAdminProcedure,
	projectProtectedProcedure,
} from '../procedure.js';
import { storyThemeQueries } from '../story-queries.js';
import { storyThemeFingerprint } from '../utils/story-theme-fingerprint.js';

/**
 * Port of upstream `trpc/story-theme.routes.ts` (`trpc.storyTheme.*`), run by `StoriesService`. Not ported:
 * `generate` (themes from a website, images, PDFs or a ZIP: `services/story-theme/*` needs headless Chrome,
 * `cheerio` and `colorthief`) and the white-label identity (no branding service, so `whiteLabelIdentity` is null).
 */

function assertCustomStoriesEnabled() {
	if (!env.BETA_CUSTOM_STORIES_ENABLED) {
		throw new HandlerError('FORBIDDEN', 'Story theming is disabled on this instance.');
	}
}

const storyThemeReadProcedure = advancedSettingsProtectedProcedure.use(async ({ next }) => {
	assertCustomStoriesEnabled();
	return next();
});

const storyThemeAdminProcedure = cloudBillingAdminProcedure.use(async ({ ctx, next }) => {
	assertCustomStoriesEnabled();
	await assertUserGroupFeatureForTrpc(ctx.project.id, ctx.user.id, 'customStoryCreation');
	return next();
});

export const storyThemeRoutes = {
	getActive: projectProtectedProcedure.query(async ({ ctx }) => {
		const theme = env.BETA_CUSTOM_STORIES_ENABLED
			? await storyThemeQueries.getActiveStoryTheme(ctx.project.id)
			: null;
		return { theme, thumbnailFingerprint: storyThemeFingerprint(theme) };
	}),

	getState: storyThemeReadProcedure.query(async ({ ctx }) => {
		const state = await storyThemeQueries.getStoryThemeState(ctx.project.id);
		return { ...state, whiteLabelIdentity: null };
	}),

	listVersions: storyThemeReadProcedure.query(async ({ ctx }) => {
		const versions = await storyThemeQueries.listStoryThemeVersions(ctx.project.id);
		return { versions };
	}),

	save: storyThemeAdminProcedure
		.input(z.object({ theme: storyThemePairSchema, generation: storyThemeGenerationSchema.nullish() }))
		.mutation(async ({ ctx, input }) => {
			await storyThemeQueries.saveStoryTheme(ctx.project.id, input.theme, input.generation ?? null);
			return { ok: true };
		}),

	restoreVersion: storyThemeAdminProcedure
		.input(z.object({ version: z.number().int().positive() }))
		.mutation(async ({ ctx, input }) => {
			const theme = await storyThemeQueries.restoreStoryThemeVersion(ctx.project.id, input.version);
			if (!theme) {
				throw new HandlerError('NOT_FOUND', 'Theme version not found.');
			}
			return { theme };
		}),

	setEnabled: storyThemeAdminProcedure.input(z.object({ enabled: z.boolean() })).mutation(async ({ ctx, input }) => {
		await storyThemeQueries.setStoryThemeEnabled(ctx.project.id, input.enabled);
		return { ok: true };
	}),
};
