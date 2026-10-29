/** Stand-in for upstream `services/story-mount` (custom stories are Phase 4): disabled. */
export function isCustomStoriesEnabled(..._args: unknown[]): boolean {
	return false;
}

export async function listStoryMount(..._args: unknown[]): Promise<never[]> {
	return [];
}

export async function readStoryMountFile(_scope: unknown, virtualPath: string): Promise<string> {
	throw new Error(`File not found: ${virtualPath}`);
}

export async function findStoryMountFiles(
	_scope: unknown,
	_matches: (mountRelativePath: string) => boolean,
): Promise<{ path: string; size: string; dir: string }[]> {
	return [];
}

export async function listStoryMountFilesToGrep(..._args: unknown[]): Promise<never[]> {
	return [];
}

/** Upstream `customStoryAuthoringError`: custom stories are disabled until Phase 4. */
export function customStoryAuthoringError(_userGroupFeatures: unknown[]): string | null {
	return 'Custom stories are disabled on this instance.';
}

export async function writeStoryMountFile(
	_scope: unknown,
	virtualPath: string,
	_content: string,
): Promise<{ path: string; size: number }> {
	throw new Error(`Cannot write '${virtualPath}': custom stories are disabled on this instance.`);
}

export function storyMountOwnerChatId(scope: { chatId: string }, _virtualPath: string): string {
	return scope.chatId;
}
