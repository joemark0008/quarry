// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearStoredDraft, useWorkbenchDraft } from './use-workbench-draft';

const options = { projectId: 'p1', toolKey: 'new' };

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('useWorkbenchDraft', () => {
	it('survives a remount', () => {
		const first = renderHook(() => useWorkbenchDraft(options));
		act(() => first.result.current.update({ sql: 'SELECT 1', chatId: 'chat_1' }));
		first.unmount();

		const second = renderHook(() => useWorkbenchDraft(options));
		expect(second.result.current.draft).toMatchObject({ sql: 'SELECT 1', chatId: 'chat_1' });
	});

	it('keeps drafts apart per project and tool', () => {
		const first = renderHook(() => useWorkbenchDraft(options));
		act(() => first.result.current.update({ sql: 'SELECT 1' }));

		expect(renderHook(() => useWorkbenchDraft({ ...options, toolKey: 't1' })).result.current.draft.sql).toBe('');
		expect(renderHook(() => useWorkbenchDraft({ ...options, projectId: 'p2' })).result.current.draft.sql).toBe('');
	});

	it('starts from the saved tool when there is no draft, and prefers a stored draft', () => {
		const withTool = { ...options, toolKey: 't1', base: { sql: 'SELECT saved', databaseId: 'warehouse' } };
		const first = renderHook(() => useWorkbenchDraft(withTool));
		expect(first.result.current.draft).toMatchObject({ sql: 'SELECT saved', databaseId: 'warehouse' });

		act(() => first.result.current.update({ sql: 'SELECT edited' }));
		first.unmount();
		expect(renderHook(() => useWorkbenchDraft(withTool)).result.current.draft.sql).toBe('SELECT edited');
	});

	it('lets seeded SQL win over a stored draft', () => {
		const first = renderHook(() => useWorkbenchDraft(options));
		act(() => first.result.current.update({ sql: 'SELECT old' }));
		first.unmount();

		const seeded = renderHook(() => useWorkbenchDraft({ ...options, initialSql: 'SELECT seeded' }));
		expect(seeded.result.current.draft.sql).toBe('SELECT seeded');
	});

	it('starts empty after the draft is cleared', () => {
		const first = renderHook(() => useWorkbenchDraft(options));
		act(() => first.result.current.update({ sql: 'SELECT 1' }));
		first.unmount();
		clearStoredDraft('p1', 'new');
		expect(renderHook(() => useWorkbenchDraft(options)).result.current.draft.sql).toBe('');
	});

	it('ignores a corrupt stored draft', () => {
		localStorage.setItem('quarry.workbench.p1.new', '{not json');
		expect(renderHook(() => useWorkbenchDraft(options)).result.current.draft.sql).toBe('');
	});
});
