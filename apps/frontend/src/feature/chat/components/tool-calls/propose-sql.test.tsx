// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProposeSqlToolCall } from './propose-sql';
import type { ToolCallComponentProps } from '.';
import type { QueryWorkbenchActions } from '@/contexts/query-workbench';
import { QueryWorkbenchContext } from '@/contexts/query-workbench';

const SQL = 'SELECT 1';

const toolPart = (overrides: object = {}) =>
	({
		type: 'tool-propose_sql',
		toolCallId: 'call_1',
		state: 'output-available',
		input: { sql: SQL, database_id: 'warehouse', summary: 'One row.' },
		output: { success: true, tested: true },
		...overrides,
	}) as unknown as ToolCallComponentProps<'propose_sql'>['toolPart'];

const renderCard = (part = toolPart(), workbench: QueryWorkbenchActions | null = null) =>
	render(
		<QueryWorkbenchContext.Provider value={workbench}>
			<ProposeSqlToolCall toolPart={part} />
		</QueryWorkbenchContext.Provider>,
	);

afterEach(cleanup);

describe('ProposeSqlToolCall', () => {
	it('applies the query and its connection to the editor', () => {
		const applySql = vi.fn();
		renderCard(toolPart(), { sql: '', applySql });
		fireEvent.click(screen.getByRole('button', { name: 'Apply to editor' }));
		expect(applySql).toHaveBeenCalledWith(SQL, 'warehouse');
	});

	it('shows when the query is already in the editor', () => {
		renderCard(toolPart(), { sql: ` ${SQL}\n`, applySql: vi.fn() });
		expect((screen.getByRole('button', { name: 'In the editor' }) as HTMLButtonElement).disabled).toBe(true);
	});

	it('takes the tested label from the server', () => {
		renderCard();
		expect(screen.getByText('Tested')).toBeTruthy();
		cleanup();
		renderCard(toolPart({ output: { success: true, tested: false } }));
		expect(screen.getByText('Not tested')).toBeTruthy();
	});

	it('is copy-only outside the workbench', () => {
		renderCard();
		expect(screen.queryByRole('button', { name: 'Apply to editor' })).toBeNull();
		expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy();
	});
});
