import type { StoryExportData, StoryQueryResult } from '@quarry/shared/story-app';
import { buildStoryExportDocument } from '@quarry/shared/story-document';
import { DEFAULT_STORY_THEME_PAIR, type StoryThemeMode } from '@quarry/shared/story-theme';

import { formatDownloadFilename } from '../utils/story-download.js';
import { themeFontStylesheets } from '../utils/story-headless-page.js';
import { renderStoryPdf } from '../utils/story-snapshot.js';
import { loadStandaloneStoryRuntime } from '../utils/story-standalone-runtime.js';
import {
	type CustomStoryVersionView,
	getCustomStoryNarratives,
	getCustomStoryVersion,
	getStoredCustomStoryNarrativesByStoryId,
} from './custom-story.js';
import { getUnattendedCustomStoryState, getUnattendedCustomStoryStateByStoryId } from './custom-story-state.js';

export async function renderCustomStoryPdf(
	chatId: string,
	storySlug: string,
	queryData: Record<string, StoryQueryResult>,
): Promise<{ filename: string; buffer: Buffer }> {
	const [version, narratives, state, runtime] = await Promise.all([
		getCustomStoryVersion(chatId, storySlug),
		getCustomStoryNarratives(chatId, storySlug),
		getUnattendedCustomStoryState(chatId, storySlug),
		loadStandaloneStoryRuntime(),
	]);
	const html = buildCustomStoryDocumentHtml(version, queryData, narratives, runtime, 'light', state);
	const buffer = await renderStoryPdf(html, themeFontStylesheets(version.theme));
	return { filename: formatDownloadFilename(version.title, 'pdf'), buffer };
}

/** A version as a self-contained page in the given theme mode, from the story's saved narratives and shared state. */
export async function buildCustomStoryDocumentByStoryId(
	storyId: string,
	version: CustomStoryVersionView,
	queryData: Record<string, StoryQueryResult>,
	mode: StoryThemeMode,
): Promise<string> {
	const [narratives, runtime, state] = await Promise.all([
		getStoredCustomStoryNarrativesByStoryId(storyId),
		loadStandaloneStoryRuntime(),
		getUnattendedCustomStoryStateByStoryId(storyId),
	]);
	return buildCustomStoryDocumentHtml(version, queryData, narratives, runtime, mode, state);
}

function buildCustomStoryDocumentHtml(
	version: CustomStoryVersionView,
	queryData: Record<string, StoryQueryResult>,
	narratives: Record<string, string>,
	runtime: string,
	mode: StoryThemeMode = 'light',
	state?: StoryExportData['state'],
): string {
	if (!version.app) {
		throw new Error(version.bundleError ?? 'The latest version of this story did not build.');
	}

	const data: StoryExportData = { queries: pickQueries(queryData, version.queryIds), narratives, state };
	return buildStoryExportDocument({
		title: version.title,
		app: version.app,
		styles: version.styles.map((style) => style.content),
		theme: version.theme?.[mode] ?? DEFAULT_STORY_THEME_PAIR[mode],
		runtime,
		data,
	});
}

function pickQueries(
	queryData: Record<string, StoryQueryResult>,
	queryIds: string[],
): Record<string, StoryQueryResult> {
	return Object.fromEntries(
		queryIds.flatMap((queryId) => (queryData[queryId] ? [[queryId, queryData[queryId]]] : [])),
	);
}
