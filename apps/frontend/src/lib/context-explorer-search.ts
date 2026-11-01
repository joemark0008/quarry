export interface ContextExplorerSearch {
	path?: string;
}

export function validateContextExplorerSearch(search: Record<string, unknown>): ContextExplorerSearch {
	const path = parseContextExplorerPath(search.path);
	return path ? { path } : {};
}

export function parseContextExplorerPath(value: unknown): string | undefined {
	if (
		typeof value !== 'string' ||
		value.length === 0 ||
		value.length > 2_000 ||
		!value.startsWith('/') ||
		value.includes('\\') ||
		value.includes('\0')
	) {
		return undefined;
	}
	const segments = value.split('/').filter(Boolean);
	return segments.length > 0 && segments.every((segment) => segment !== '.' && segment !== '..') ? value : undefined;
}
