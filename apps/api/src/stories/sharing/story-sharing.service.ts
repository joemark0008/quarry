import { Injectable } from '@nestjs/common';
import type { StoryThemeMode } from '@quarry/shared/story-theme';
import { STORY_THEME_MODES } from '@quarry/shared/story-theme';
import type { DownloadFormat } from '@quarry/shared/types';
import { DOWNLOAD_FORMATS } from '@quarry/shared/types';

import { HandlerError } from '../../common/errors/handler-error.js';
import { type ProcedureBaseContext, type Router, runProcedure } from '../procedure.js';
import { type CustomStoryThumbnail, getCustomStoryThumbnail } from '../services/custom-story-thumbnail.js';
import { storyQueries } from '../story-queries.js';
import { buildStoryDownloadFile } from '../utils/story-download.js';
import { loadEmbedStoryContent } from './embed-story.js';

/**
 * Story sharing for the resolvers and REST controllers: runs upstream's `sharedStory`, `embed`, story download and
 * `storyTheme.generate` procedures, and serves the thumbnail and embed-download routes (upstream
 * `routes/story-thumbnail.ts`, `routes/embed-story-download.ts`).
 */
@Injectable()
export class StorySharingService {
	run<R extends Router, K extends keyof R & string>(
		router: R,
		name: K,
		ctx: ProcedureBaseContext,
		input: unknown,
	): Promise<unknown> {
		return runProcedure(router, name, ctx, input ?? undefined);
	}

	/** Upstream `publicProcedure`s (embeds): no session in the context. */
	runPublic<R extends Router, K extends keyof R & string>(router: R, name: K, input: unknown): Promise<unknown> {
		return runProcedure(router, name, {} as ProcedureBaseContext, input ?? undefined);
	}

	/** `GET /api/stories/:storyId/thumbnail`: null while no image is rendered yet (a render is queued). */
	async getThumbnail(storyId: string, userId: string, rawMode: unknown): Promise<CustomStoryThumbnail | null> {
		const mode = parseEnum<StoryThemeMode>(rawMode ?? 'light', STORY_THEME_MODES, 'mode');
		const story = await storyQueries.getStoryById(storyId);
		if (!story || story.format !== 'custom' || !(await storyQueries.canUserAccessStory(storyId, userId))) {
			throw new HandlerError('NOT_FOUND', 'Story not found');
		}
		return getCustomStoryThumbnail(story, mode);
	}

	/** `GET /api/embed/story/:storyId/download?token&format`. */
	async downloadEmbedStory(
		storyId: string,
		token: unknown,
		rawFormat: unknown,
	): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
		if (typeof token !== 'string') {
			throw new HandlerError('BAD_REQUEST', 'token is required.');
		}
		const format = parseEnum<DownloadFormat>(rawFormat, DOWNLOAD_FORMATS, 'format');
		const story = await loadEmbedStoryContent(storyId, token);
		return buildStoryDownloadFile(format, story.title, story.code, story.queryData, story.dateFormat, story.theme);
	}
}

function parseEnum<T extends string>(value: unknown, allowed: readonly T[], name: string): T {
	if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
		throw new HandlerError('BAD_REQUEST', `${name} must be one of ${allowed.join(', ')}.`);
	}
	return value as T;
}
