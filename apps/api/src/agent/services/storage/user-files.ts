import type { StorageScope } from '../storage.js';

/** Stand-in for upstream `services/storage/user-files` (Phase 2d): storage is off, nothing is reachable. */
const unavailable = () => new Error('Saved files are not available in this workspace.');

export interface UserDirectoryEntry {
	relativePath: string;
	name: string;
	type: 'file' | 'directory';
	size?: number;
	itemCount?: number;
}

export async function readUserFile(_scope: StorageScope, _relativePath: string): Promise<never> {
	throw unavailable();
}

export async function findUserFiles(
	_scope: StorageScope,
	_matches: (relativePath: string) => boolean,
): Promise<{ key: string; size: number }[]> {
	return [];
}

export function canGrepUserFiles(): boolean {
	return false;
}

export function grepRootForUser(_scope: StorageScope, _relativePath?: string): string {
	throw unavailable();
}

export async function listUserDirectory(_scope: StorageScope, _relativePath: string): Promise<UserDirectoryEntry[]> {
	return [];
}

/** Object written to storage (upstream `StorageObject`). */
export interface StorageObject {
	key: string;
	size: number;
}

export async function readUserFileBytes(_scope: StorageScope, _relativePath: string): Promise<Buffer> {
	throw unavailable();
}

export async function writeUserFile(
	_scope: StorageScope,
	_relativePath: string,
	_content: string,
): Promise<StorageObject> {
	throw unavailable();
}

export async function writeUserFileBytes(
	_scope: StorageScope,
	_relativePath: string,
	_data: Buffer,
): Promise<StorageObject> {
	throw unavailable();
}
