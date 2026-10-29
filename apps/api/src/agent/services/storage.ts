/**
 * Stand-in for upstream `services/storage`: permanent user file storage arrives with attachments (Phase 2d).
 * Until then storage is off, so the context tools only see the project folder.
 */
export interface StorageScope {
	projectId: string;
	userId: string;
}

export function isStorageEnabled(): boolean {
	return false;
}

export function relativePathFromKey(_scope: StorageScope, key: string): string {
	return key;
}

/** Upstream `env.NAO_STORAGE_MAX_FILE_SIZE_MB` (quarry `QUARRY_STORAGE_MAX_FILE_SIZE_MB`, read by the Phase 2d storage). */
export const STORAGE_MAX_FILE_SIZE_MB = 10;
