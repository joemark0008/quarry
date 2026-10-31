import type { Page } from '@playwright/test';

export const USER = { email: 'test@test.test', password: 'test1234' };

export async function logIn(page: Page, redirect = '/') {
	await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`);
	await page.locator('input[name="email"]').fill(USER.email);
	await page.locator('input[name="password"]').fill(USER.password);
	await page.getByRole('button', { name: 'Log in', exact: true }).click();
	await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

/** Uncaught exceptions and console errors, minus network noise that a healthy page can produce. */
export function trackErrors(page: Page) {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
	page.on('console', (message) => {
		if (message.type() !== 'error') {
			return;
		}
		const text = message.text();
		if (/Failed to load resource|net::ERR|Download the React DevTools/.test(text)) {
			return;
		}
		errors.push(`console: ${text.slice(0, 300)}`);
	});
	return errors;
}

/** The accessible controls on screen: what a user can see and operate, independent of styling. */
export async function controlInventory(page: Page) {
	return page.evaluate(() => {
		const visible = (el: Element) => {
			const rect = el.getBoundingClientRect();
			const style = getComputedStyle(el);
			return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.opacity !== '0';
		};
		const name = (el: Element) =>
			(
				el.getAttribute('aria-label') ||
				(el as HTMLInputElement).placeholder ||
				(el as HTMLInputElement).name ||
				el.textContent ||
				''
			)
				.replace(/\s+/g, ' ')
				.trim()
				.slice(0, 80);
		const collect = (selector: string) =>
			[...new Set([...document.querySelectorAll(selector)].filter(visible).map(name).filter(Boolean))].sort();
		return {
			headings: collect('h1,h2,h3'),
			buttons: collect('button,[role=button],[role=switch],[role=tab],[role=combobox]'),
			links: collect('a[href]'),
			inputs: collect('input,textarea,select,[contenteditable=true]'),
		};
	});
}
