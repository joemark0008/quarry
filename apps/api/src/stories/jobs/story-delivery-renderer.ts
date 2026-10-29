import { logger } from '../../agent/utils/logger.js';
import type { EmailAttachment } from './story-notifications.js';

export type StoryDeliveryQueryData = Record<string, { data: unknown[]; columns: string[] }>;

/** Upstream `utils/story-html` `StoryEmailHtml`: the email body and its inline (`cid:`) images. */
export interface StoryEmailHtml {
	html: string;
	images: EmailAttachment[];
}

/**
 * What the `story.deliver` job needs from the story rendering code (upstream `utils/story-email`
 * `buildStoryPdfAttachment` / `buildStoryEmailHtml` and `services/custom-story-export` `renderCustomStoryPdf`).
 * The rendering (headless Chrome, story HTML) is ported separately; it binds itself with
 * `bindStoryDeliveryRenderer`. Until then the stand-in below renders nothing, so deliveries go out without the PDF
 * attachment and the HTML body, as upstream does when rendering fails.
 */
export interface StoryDeliveryRenderer {
	/** A classic story as a PDF (upstream `buildStoryDownloadFile('pdf', …)` with the project's date format and theme). */
	renderStoryPdf(input: {
		title: string;
		code: string;
		queryData: StoryDeliveryQueryData;
		projectId: string;
	}): Promise<{ filename: string; buffer: Buffer; mimeType: string }>;
	/** A classic story as an email body (upstream `generateStoryEmailHtml`). */
	renderStoryEmailHtml(input: {
		title: string;
		code: string;
		queryData: StoryDeliveryQueryData;
		projectId: string;
	}): Promise<StoryEmailHtml>;
	/** A custom story as a PDF (upstream `renderCustomStoryPdf`). */
	renderCustomStoryPdf(
		chatId: string,
		storySlug: string,
		queryData: StoryDeliveryQueryData,
	): Promise<{ filename: string; buffer: Buffer }>;
}

class RenderingNotAvailableError extends Error {
	constructor() {
		super('Story rendering is not available yet.');
	}
}

const standInRenderer: StoryDeliveryRenderer = {
	renderStoryPdf: async () => {
		throw new RenderingNotAvailableError();
	},
	renderStoryEmailHtml: async () => {
		throw new RenderingNotAvailableError();
	},
	renderCustomStoryPdf: async () => {
		throw new RenderingNotAvailableError();
	},
};

let renderer: StoryDeliveryRenderer = standInRenderer;

/** Binds (or, with `null`, unbinds) the story renderer the delivery job uses. */
export function bindStoryDeliveryRenderer(bound: StoryDeliveryRenderer | null): void {
	renderer = bound ?? standInRenderer;
}

export function storyDeliveryRenderer(): StoryDeliveryRenderer {
	return renderer;
}

/** Upstream `utils/story-email` `buildStoryPdfAttachment`. */
export async function buildStoryPdfAttachment(
	title: string,
	code: string,
	queryData: StoryDeliveryQueryData,
	projectId: string,
): Promise<EmailAttachment[]> {
	try {
		const file = await renderer.renderStoryPdf({ title, code, queryData, projectId });
		return [{ filename: file.filename, content: file.buffer, contentType: file.mimeType }];
	} catch (error) {
		logFailure(`Failed to build story PDF attachment: ${String(error)}`, projectId, error);
		return [];
	}
}

/** Upstream `utils/story-email` `buildStoryEmailHtml`. */
export async function buildStoryEmailHtml(
	title: string,
	code: string,
	queryData: StoryDeliveryQueryData,
	projectId: string,
): Promise<StoryEmailHtml | undefined> {
	try {
		return await renderer.renderStoryEmailHtml({ title, code, queryData, projectId });
	} catch (error) {
		logFailure(`Failed to build story email HTML: ${String(error)}`, projectId, error);
		return undefined;
	}
}

/** Upstream `services/custom-story-export` `renderCustomStoryPdf`. */
export function renderCustomStoryPdf(
	chatId: string,
	storySlug: string,
	queryData: StoryDeliveryQueryData,
): Promise<{ filename: string; buffer: Buffer }> {
	return renderer.renderCustomStoryPdf(chatId, storySlug, queryData);
}

function logFailure(message: string, projectId: string, error: unknown): void {
	if (error instanceof RenderingNotAvailableError) {
		logger.debug(message, { source: 'system', projectId });
		return;
	}
	logger.error(message, { source: 'system', projectId });
}
