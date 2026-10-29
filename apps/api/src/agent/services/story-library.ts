/** Stand-in for upstream `services/story-library` (stories are Phase 4): the `/stories` mount is empty. */
export async function listStoryLibrary(..._args: unknown[]): Promise<never[]> {
	return [];
}

export async function readStoryLibraryFile(_scope: unknown, virtualPath: string): Promise<string> {
	throw new Error(`File not found: ${virtualPath}`);
}

export async function findStoryLibraryFiles(
	_scope: unknown,
	_matches: (libraryRelativePath: string) => boolean,
	_storyId?: string | null,
): Promise<{ path: string; size: string; dir: string }[]> {
	return [];
}

// eslint-disable-next-line require-yield
export async function* storyLibraryFileBatchesToGrep(..._args: unknown[]): AsyncGenerator<never[]> {
	return;
}
