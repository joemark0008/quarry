// @vitest-environment jsdom

import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CopyToolNameButton } from './copy-tool-name-button';

afterEach(cleanup);

describe('CopyToolNameButton', () => {
	it('copies the agent name and confirms it', async () => {
		const writeText = vi.fn(async () => undefined);
		Object.assign(navigator, { clipboard: { writeText } });
		render(
			<MantineProvider>
				<CopyToolNameButton name='qt_monthly_churn' />
			</MantineProvider>,
		);

		fireEvent.click(screen.getByRole('button', { name: 'Copy qt_monthly_churn' }));

		expect(writeText).toHaveBeenCalledWith('qt_monthly_churn');
		expect(await screen.findByRole('button', { name: 'Copied qt_monthly_churn' })).toBeTruthy();
	});
});
