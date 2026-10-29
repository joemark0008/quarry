import type { DateFormatSettings } from '@quarry/shared/date';
import type { StoryThemePair } from '@quarry/shared/story-theme';

import { HandlerError } from '../../common/errors/handler-error.js';
import { getActiveThemeForProject } from '../services/custom-story.js';
import { getStoryQueryData } from '../services/live-story.js';
import { projectQueries, storyQueries } from '../story-queries.js';
import { backfillMissingQueryDataForSandbox, type StoryQueryDataMap } from '../utils/story-query-data.js';
import { assertProjectMcpEnabled, verifyEmbedToken } from './embed-token.js';

/** Port of upstream `utils/embed-story.ts`: the story behind an embed token (`embed.getStory`, embed downloads). */

export type EmbedStoryContent = {
	storyId: string;
	projectId: string;
	title: string;
	code: string;
	slug: string;
	chatId: string | null;
	queryData: StoryQueryDataMap | null;
	dateFormat: DateFormatSettings | null;
	theme: StoryThemePair | null;
};

export async function loadEmbedStoryContent(storyId: string, token: string): Promise<EmbedStoryContent> {
	const payload = verifyEmbedToken(token);
	if (!payload || payload.type !== 'story' || payload.resourceId !== storyId) {
		throw new HandlerError('UNAUTHORIZED', 'Invalid or expired embed token.');
	}

	const projectId = await storyQueries.getStoryProjectId(storyId);
	if (!projectId) {
		throw new HandlerError('NOT_FOUND', 'Story not found.');
	}
	if (projectId !== payload.projectId) {
		throw new HandlerError('UNAUTHORIZED', 'Embed token does not match this story.');
	}

	await assertProjectMcpEnabled(projectId);

	const version = await storyQueries.getLatestVersionByStoryId(storyId);
	if (!version) {
		throw new HandlerError('NOT_FOUND', 'Story not found.');
	}

	const ownerId = await storyQueries.getStoryOwnerId(version.storyId);
	if (!ownerId) {
		throw new HandlerError('FORBIDDEN', 'Story has no execution owner.');
	}
	const [storyData, displaySettings, theme] = await Promise.all([
		loadEmbedStoryData(version, projectId, ownerId),
		projectQueries.getDisplaySettings(projectId),
		getActiveThemeForProject(projectId),
	]);

	return {
		storyId: version.storyId,
		projectId,
		title: version.title,
		code: storyData.code,
		slug: version.slug,
		chatId: version.chatId,
		queryData: storyData.queryData,
		dateFormat: displaySettings.dateFormat ?? null,
		theme,
	};
}

async function loadEmbedStoryData(
	version: Awaited<ReturnType<typeof storyQueries.getLatestVersionByStoryId>>,
	projectId: string,
	ownerId: string,
): Promise<{ code: string; queryData: StoryQueryDataMap | null }> {
	if (!version) {
		throw new HandlerError('NOT_FOUND', 'Story not found.');
	}
	if (!version.chatId) {
		return {
			code: version.code,
			queryData: await backfillMissingQueryDataForSandbox(version.code, {
				storyId: version.storyId,
				chatId: version.chatId,
				projectId,
				userId: ownerId,
			}),
		};
	}
	const result = await getStoryQueryData(
		version.chatId,
		version.slug,
		version.code,
		version.isLive,
		version.cacheSchedule,
	);
	const queryData = result.allowsPersistedFallback
		? await backfillMissingQueryDataForSandbox(version.code, {
				storyId: version.storyId,
				chatId: version.chatId,
				projectId,
				userId: ownerId,
			})
		: result.queryData;
	return { code: result.code, queryData };
}
