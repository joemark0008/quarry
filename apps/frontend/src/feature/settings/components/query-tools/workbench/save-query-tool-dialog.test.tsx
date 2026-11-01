// @vitest-environment jsdom

import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SaveQueryToolDialog } from './save-query-tool-dialog';

const renderDialog = (onSubmit = vi.fn()) => {
	render(
		<MantineProvider>
			<SaveQueryToolDialog
				title='Save as query tool'
				initial={{ name: '', description: '', enabled: true }}
				submitLabel='Save tool'
				isPending={false}
				onClose={vi.fn()}
				onSubmit={onSubmit}
			/>
		</MantineProvider>,
	);
	return onSubmit;
};

const submit = () => screen.getByRole('button', { name: 'Save tool' }) as HTMLButtonElement;
const type = (placeholder: RegExp, value: string) =>
	fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });

afterEach(cleanup);

describe('SaveQueryToolDialog', () => {
	it('needs a valid name and a description', () => {
		renderDialog();
		expect(submit().disabled).toBe(true);

		type(/orders_by_status/, 'Not Valid');
		type(/What the query returns/, 'Orders by status.');
		expect(screen.getByText(/Use snake_case/)).toBeTruthy();
		expect(submit().disabled).toBe(true);

		type(/orders_by_status/, 'orders_by_status');
		expect(submit().disabled).toBe(false);
	});

	it('submits the details', () => {
		const onSubmit = renderDialog();
		type(/orders_by_status/, 'orders_by_status');
		type(/What the query returns/, 'Orders by status.');
		fireEvent.click(submit());
		expect(onSubmit).toHaveBeenCalledWith({
			name: 'orders_by_status',
			description: 'Orders by status.',
			enabled: true,
		});
	});
});
