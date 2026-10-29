import type { Story as DBStory, StoryVersion as DBStoryVersion } from '../../generated/prisma/client.js';
import type { StoryFileInput } from '../repositories/story-file.repository.js';
import { db, storyFileQueries, storyFolderQueries, storyQueries } from '../story-queries.js';
import { formatStoryFiles } from '../utils/story-file-format.js';
import { normalizeStoryFilePath } from '../utils/story-file-path.js';
import { queueCustomStoryThumbnail } from './custom-story-thumbnail.js';
import { buildStoryApp } from './story-app-build.js';
import { scaffoldCustomStoryFiles } from './story-scaffold.js';

export type CustomStoryPublishResult =
	{ ok: true; version: number; files: string[] } | { ok: false; buildErrors: string[]; files: string[] };

interface StoryOwner {
	userId: string;
	projectId: string;
}

export async function createCustomStoryDraft(data: {
	chatId: string;
	slug: string;
	title: string;
	files: StoryFileInput[];
}): Promise<{ story: DBStory; files: string[] }> {
	const initialFiles = scaffoldCustomStoryFiles(data.title, await formatStoryFiles(data.files));
	return db.transaction(async (tx) => {
		const story = await storyQueries.createCustomStory(
			{ chatId: data.chatId, slug: data.slug, title: data.title },
			tx,
		);
		const files = await storyFileQueries.seedDraftFiles(story.id, initialFiles, tx);
		return { story, files: files.map((file) => file.path) };
	});
}

export async function applyCustomStoryDraftChanges(
	storyId: string,
	changes: { files: StoryFileInput[]; deletePaths: string[] },
): Promise<string[]> {
	const files = await formatStoryFiles(changes.files);
	const deletePaths = changes.deletePaths.map(normalizeStoryFilePath);
	const draft = new Set((await storyFileQueries.listDraftFiles(storyId)).map((file) => file.path));
	const missing = deletePaths.filter((path) => !draft.has(path));
	if (missing.length > 0) {
		throw new Error(`Not in the draft: ${missing.join(', ')}. Nothing was changed.`);
	}

	await db.transaction(async (tx) => {
		for (const path of deletePaths) {
			await storyFileQueries.deleteDraftFile(storyId, path, tx);
		}
		for (const file of files) {
			await storyFileQueries.writeDraftFile(storyId, file, tx);
		}
	});
	return (await storyFileQueries.listDraftFiles(storyId)).map((file) => file.path);
}

export async function publishCustomStoryDraft(
	story: DBStory,
	owner: StoryOwner,
	source: DBStoryVersion['source'],
): Promise<CustomStoryPublishResult> {
	const draft = await storyFileQueries.listDraftFiles(story.id);
	const build = await buildStoryApp(draft.map((file) => ({ path: file.path, content: file.content })));
	if (!build.ok) {
		return { ok: false, buildErrors: build.errors, files: draft.map((file) => file.path) };
	}

	const { version, files } = await db.transaction(async (tx) => {
		if (!storyFileQueries.hasSameFiles(await storyFileQueries.listDraftFiles(story.id, tx), draft)) {
			throw new Error('The draft changed while it was being built. Publish again.');
		}
		const cut = await storyFileQueries.cutVersionFromDraft({ storyId: story.id, action: 'publish', source }, tx);
		await storyFileQueries.setVersionBundle(cut.version.id, build.app, tx);
		if (cut.version.version === 1) {
			await storyFolderQueries.saveStoryInPrivateRoot(owner.userId, owner.projectId, story.id, tx);
		}
		return cut;
	});
	queueCustomStoryThumbnail(story.id, version.id);
	return { ok: true, version: version.version, files: files.map((file) => file.path) };
}
