import type { StoryDeliveryRenderer } from '../jobs/story-delivery-renderer.js';
import { getActiveThemeForProject } from '../services/custom-story.js';
import { renderCustomStoryPdf } from '../services/custom-story-export.js';
import { projectQueries } from '../story-queries.js';
import { buildStoryDownloadFile } from '../utils/story-download.js';
import { generateStoryEmailHtml } from '../utils/story-html.js';

/** The `story.deliver` job's rendering: upstream `utils/story-email` and `services/custom-story-export`. */
export const storyDeliveryRendering: StoryDeliveryRenderer = {
	async renderStoryPdf({ title, code, queryData, projectId }) {
		const [displaySettings, theme] = await Promise.all([
			projectQueries.getDisplaySettings(projectId),
			getActiveThemeForProject(projectId),
		]);
		return buildStoryDownloadFile('pdf', title, code, queryData, displaySettings?.dateFormat, theme);
	},
	async renderStoryEmailHtml({ title, code, queryData, projectId }) {
		const [displaySettings, theme] = await Promise.all([
			projectQueries.getDisplaySettings(projectId),
			getActiveThemeForProject(projectId),
		]);
		return generateStoryEmailHtml({ title, code }, queryData, displaySettings?.dateFormat, undefined, theme);
	},
	renderCustomStoryPdf: (chatId, storySlug, queryData) =>
		renderCustomStoryPdf(chatId, storySlug, queryData as Parameters<typeof renderCustomStoryPdf>[2]),
};
