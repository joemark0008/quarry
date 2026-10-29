import { isBinaryDocument } from '@quarry/shared/attachments';
import { strReplace } from '@quarry/shared/tools';

import { isStorageEnabled, relativePathFromKey } from '../services/storage.js';
import { readUserFile, writeUserFile } from '../services/storage/user-files.js';
import {
	customStoryAuthoringError,
	isCustomStoriesEnabled,
	readStoryMountFile,
	storyMountOwnerChatId,
	writeStoryMountFile,
} from '../services/story-mount.js';
import { renderToModelOutput, StrReplaceOutput } from '../tool-outputs/index.js';
import type { ToolContext } from '../types/tools.js';
import { withKeyedLock } from '../utils/keyed-lock.js';
import { isStoryLibraryPath, STORY_LIBRARY_READ_ONLY } from '../utils/story-library.js';
import { isStoriesPath, STORIES_MOUNT } from '../utils/story-mount.js';
import {
	createTool,
	isStoragePath,
	STORAGE_MOUNT,
	toStorageRelativePath,
	toStorageScope,
	toStorageVirtualPath,
} from '../utils/tools.js';

export function buildStrReplaceToolDescription({
	storage = isStorageEnabled(),
	customStories = isCustomStoriesEnabled(),
}: { storage?: boolean; customStories?: boolean } = {}): string {
	const targets = [
		...(storage ? [`/${STORAGE_MOUNT}`] : []),
		...(customStories ? [`/${STORIES_MOUNT}/<story>/…`] : []),
	];
	const formattingHint = customStories
		? ' Story files are reformatted with Prettier on every save, so read a file before editing it rather than relying on the content you sent.'
		: '';
	return `Edit an existing text file under ${targets.join(' or under ')} by replacing one exact snippet with another. Prefer it over write for any change to a file that already exists: only the snippet travels, not the whole file. old_string must match the current content exactly (whitespace and indentation included) and, unless replace_all is true, exactly once.${formattingHint}`;
}

export default createTool<strReplace.Input, strReplace.Output>({
	description: buildStrReplaceToolDescription(),
	inputSchema: strReplace.InputSchema,
	outputSchema: strReplace.OutputSchema,
	execute: async ({ file_path, ...edit }, context) => {
		if (isStoriesPath(file_path)) {
			const authoringError = customStoryAuthoringError(context.userGroupFeatures);
			if (authoringError) {
				throw new Error(`Cannot edit '${file_path}': ${authoringError}`);
			}
			return { _version: '1' as const, ...(await editStoryFile(file_path, edit, context)) };
		}
		if (isStoragePath(file_path)) {
			return { _version: '1' as const, ...(await editStorageFile(file_path, edit, context)) };
		}
		if (isStoryLibraryPath(file_path)) {
			throw new Error(`Cannot edit '${file_path}': ${STORY_LIBRARY_READ_ONLY}`);
		}
		throw new Error(`Cannot edit '${file_path}': ${editableTargetsHint()}. Project context files are read-only.`);
	},

	toModelOutput: ({ output }) => renderToModelOutput(StrReplaceOutput({ output }), output),
});

type Edit = Omit<strReplace.Input, 'file_path'>;
type Edited = Omit<strReplace.Output, '_version'>;

const editStoryFile = async (filePath: string, edit: Edit, context: ToolContext): Promise<Edited> => {
	return withKeyedLock(`str-replace:story:${storyMountOwnerChatId(context, filePath)}:${filePath}`, async () => {
		const current = await readStoryMountFile(context, filePath);
		const { content, replacements } = strReplace.applyReplacement(current, edit);
		return { ...(await writeStoryMountFile(context, filePath, content)), replacements };
	});
};

const editStorageFile = async (filePath: string, edit: Edit, context: ToolContext): Promise<Edited> => {
	const scope = toStorageScope(context);
	const relativePath = toStorageRelativePath(filePath);
	if (isBinaryDocument(relativePath)) {
		throw new Error(
			`Cannot edit '${filePath}': it is not a text file. Use write to save a new text version instead.`,
		);
	}
	return withKeyedLock(`str-replace:storage:${scope.projectId}:${scope.userId}:${relativePath}`, async () => {
		const current = await readUserFile(scope, relativePath);
		const { content, replacements } = strReplace.applyReplacement(current, edit);
		const object = await writeUserFile(scope, relativePath, content);
		return {
			path: toStorageVirtualPath(relativePathFromKey(scope, object.key)),
			size: object.size,
			replacements,
		};
	});
};

const editableTargetsHint = (): string => {
	const targets = [
		...(isStorageEnabled() ? [`/${STORAGE_MOUNT}`] : []),
		...(isCustomStoriesEnabled() ? [`/${STORIES_MOUNT}/<story>`] : []),
	];
	return `only files under ${targets.join(' or ')} can be edited`;
};
