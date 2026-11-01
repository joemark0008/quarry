// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorkbenchResults } from './workbench-results';

vi.mock('@/feature/chat/components/tool-calls/display-table', () => ({
	TableDisplay: ({ columns }: { columns: string[] }) => <div>{columns.join(',')}</div>,
}));

afterEach(cleanup);

describe('WorkbenchResults', () => {
	it('prompts to run before anything has run', () => {
		render(<WorkbenchResults result={null} isRunning={false} />);
		expect(screen.getByText(/Run the query/)).toBeTruthy();
	});

	it('shows the rows and says when they were cut', () => {
		const result = { columns: ['id'], rows: [{ id: 1 }], rowCount: 1, truncated: true, sql: 'SELECT 1' };
		render(<WorkbenchResults result={result} isRunning={false} />);
		expect(screen.getByText(/1 row \(first rows only\)/)).toBeTruthy();
		expect(screen.getByText('id')).toBeTruthy();
	});

	it('hands an error to the assistant', () => {
		const onAskToFix = vi.fn();
		render(<WorkbenchResults result={null} error='syntax error' isRunning={false} onAskToFix={onAskToFix} />);
		expect(screen.getByText('syntax error')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'Ask assistant to fix' }));
		expect(onAskToFix).toHaveBeenCalled();
	});
});
