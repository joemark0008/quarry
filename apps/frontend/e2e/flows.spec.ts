import { expect, test } from '@playwright/test';
import { logIn, trackErrors, USER } from './helpers';
import type { Page } from '@playwright/test';

const isDark = (page: Page) =>
	page.evaluate(
		() =>
			document.documentElement.classList.contains('dark') ||
			document.documentElement.getAttribute('data-mantine-color-scheme') === 'dark',
	);

test.describe('signed out', () => {
	test('a wrong password shows an error and stays on login', async ({ page }) => {
		await page.goto('/login');
		await page.locator('input[name="email"]').fill(USER.email);
		await page.locator('input[name="password"]').fill('wrong-password');
		await page.getByRole('button', { name: 'Log in', exact: true }).click();
		await expect(page.getByText(/invalid email or password/i)).toBeVisible();
		await expect(page).toHaveURL(/\/login/);
	});

	test('a protected page redirects to login and returns after signing in', async ({ page }) => {
		await page.goto('/settings/account');
		await expect(page).toHaveURL(/\/login\?redirect=/);
		await page.locator('input[name="email"]').fill(USER.email);
		await page.locator('input[name="password"]').fill(USER.password);
		await page.getByRole('button', { name: 'Log in', exact: true }).click();
		await expect(page).toHaveURL(/\/settings\/account/);
		await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible();
	});
});

test.describe('signed in', () => {
	test.beforeEach(async ({ page }) => {
		await logIn(page);
	});

	test('search opens from the keyboard and closes on Escape', async ({ page }) => {
		await expect(page.getByRole('button', { name: 'Toggle sidebar' })).toBeVisible();
		await page.keyboard.press('ControlOrMeta+k');
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await dialog.getByRole('textbox').or(dialog.getByRole('combobox')).first().fill('booking');
		await expect(dialog.getByText(/booking/i).first()).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(dialog).toBeHidden();
	});

	test('the sidebar collapses and expands', async ({ page }) => {
		const stories = page.getByRole('button', { name: /^Stories/ });
		await expect(stories).toBeVisible();
		const before = (await stories.boundingBox())!.width;
		await page.getByRole('button', { name: 'Toggle sidebar' }).click();
		await expect.poll(async () => (await stories.boundingBox())!.width).toBeLessThan(before);
		await page.getByRole('button', { name: 'Toggle sidebar' }).click();
		await expect.poll(async () => (await stories.boundingBox())!.width).toBe(before);
	});

	test('the theme setting changes the color scheme and survives a reload', async ({ page }) => {
		await page.goto('/settings/account');
		await page.getByRole('button', { name: 'Dark', exact: true }).click();
		await expect.poll(() => isDark(page)).toBe(true);
		await page.reload();
		await expect.poll(() => isDark(page)).toBe(true);
		await page.getByRole('button', { name: 'Light', exact: true }).click();
		await expect.poll(() => isDark(page)).toBe(false);
	});

	test('settings navigation reaches each section', async ({ page }) => {
		await page.goto('/settings/account');
		for (const [label, path, heading] of [
			['Project Settings', '/settings/project', null],
			['Warehouse', '/settings/project/warehouse', 'Warehouse'],
			['Agent', '/settings/project/agent', 'Agent'],
			['Query tools', '/settings/project/query-tools', null],
			['Appearance', '/settings/appearance', 'Appearance'],
			['Git', '/settings/git', null],
			['Recommendations', '/settings/recommendations', null],
			['File Explorer', '/settings/context-explorer', null],
			['Storage', '/settings/storage', null],
		] as const) {
			await page.getByRole('link', { name: label, exact: true }).click();
			await expect(page).toHaveURL(new RegExp(`${path}(\\?.*)?$`));
			if (heading) {
				await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
			}
		}
	});

	test('the agent settings tabs switch', async ({ page }) => {
		await page.goto('/settings/project/agent');
		await expect(page.getByText('LLM Configuration').first()).toBeVisible();
		await page
			.getByRole('button', { name: 'Capabilities' })
			.or(page.getByRole('tab', { name: 'Capabilities' }))
			.click();
		await expect(page.getByText('LLM Configuration').first()).toBeHidden();
		await page
			.getByRole('button', { name: 'Models' })
			.or(page.getByRole('tab', { name: 'Models' }))
			.click();
		await expect(page.getByText('LLM Configuration').first()).toBeVisible();
	});

	test('the stories page opens the new folder dialog', async ({ page }) => {
		await page.getByRole('button', { name: /^Stories/ }).click();
		await expect(page).toHaveURL(/\/stories/);
		await page.getByRole('button', { name: 'New folder' }).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(dialog).toBeHidden();
	});

	test('a chat from the list opens with its messages', async ({ page }) => {
		const firstChat = page.getByRole('link', { name: /booking|Facilities|Warehouse|order amount/i }).first();
		await firstChat.click();
		await expect(page).toHaveURL(/\/[0-9a-z-]{10,}$/i);
		await expect(
			page
				.locator('[data-testid], main, body')
				.getByText(/\S{3,}/)
				.nth(10),
		).toBeVisible();
	});

	test('sending a message gets an answer from the agent', async ({ page }) => {
		test.setTimeout(180_000);
		const errors = trackErrors(page);
		const prompt = page.locator('[contenteditable]').first();
		await prompt.click();
		await page.keyboard.type('Reply with exactly the word PONG and do not use any tools.');
		await page.keyboard.press('Enter');
		await expect(page).toHaveURL(/\/[0-9a-z-]{10,}$/i, { timeout: 60_000 });
		await expect(page.getByText('PONG', { exact: true }).first()).toBeVisible({ timeout: 120_000 });
		expect(errors).toEqual([]);
		await page.reload();
		await expect(page.getByText('PONG', { exact: true }).first()).toBeVisible();
	});

	test('sign out returns to login', async ({ page }) => {
		await page.goto('/settings/account');
		await page.getByRole('button', { name: 'Sign out' }).click();
		await expect(page).toHaveURL(/\/login/);
		await page.goto('/settings/account');
		await expect(page).toHaveURL(/\/login/);
	});
});
