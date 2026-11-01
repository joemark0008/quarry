import { useCallback, useEffect, useState } from 'react';
import type { QueryToolParameter } from '@quarry/shared/query-tools';

export interface WorkbenchDraft {
	sql: string;
	parameters: QueryToolParameter[];
	/** Values used by Run, by parameter name. */
	values: Record<string, string>;
	databaseId: string | null;
	chatId?: string;
}

const EMPTY_DRAFT: WorkbenchDraft = { sql: '', parameters: [], values: {}, databaseId: null };

const storageKey = (projectId: string, toolKey: string) => `quarry.workbench.${projectId}.${toolKey}`;

function readStoredDraft(projectId: string, toolKey: string): WorkbenchDraft | null {
	try {
		const stored = JSON.parse(localStorage.getItem(storageKey(projectId, toolKey)) ?? 'null');
		return stored && typeof stored.sql === 'string' ? { ...EMPTY_DRAFT, ...stored } : null;
	} catch {
		return null;
	}
}

export function clearStoredDraft(projectId: string, toolKey: string): void {
	localStorage.removeItem(storageKey(projectId, toolKey));
}

/**
 * The workbench's working state, kept in the browser per project and per tool so a reload loses nothing. `initialSql`
 * (Save as tool in chat) wins over a stored draft; `toolKey` changes when a new draft is saved as a tool.
 */
export function useWorkbenchDraft({
	projectId,
	toolKey,
	base,
	initialSql,
}: {
	projectId: string;
	toolKey: string;
	/** Where to start when there is no stored draft: the saved tool's values. */
	base?: Partial<WorkbenchDraft>;
	initialSql?: string;
}) {
	const [draft, setDraft] = useState<WorkbenchDraft>(() => {
		const start = readStoredDraft(projectId, toolKey) ?? { ...EMPTY_DRAFT, ...base };
		return initialSql ? { ...start, sql: initialSql } : start;
	});

	useEffect(() => {
		try {
			localStorage.setItem(storageKey(projectId, toolKey), JSON.stringify(draft));
		} catch {
			// A full or blocked storage only costs the draft's survival across reloads.
		}
	}, [draft, projectId, toolKey]);

	const update = useCallback((patch: Partial<WorkbenchDraft>) => {
		setDraft((current) => ({ ...current, ...patch }));
	}, []);

	return { draft, update };
}
