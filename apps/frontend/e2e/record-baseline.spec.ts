import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { test } from '@playwright/test';

import { controlInventory, logIn, trackErrors } from './helpers';
import { APP_ROUTES, PUBLIC_ROUTES } from './routes';

const OUT = process.env.E2E_RECORD_DIR;
test.skip(!OUT, 'Set E2E_RECORD_DIR to record screenshots and the control inventory.');

const slug = (route: string) => route.replace(/\W+/g, '_') || 'root';

test('record every route', async ({ browser }) => {
	test.setTimeout(600_000);
	mkdirSync(OUT!, { recursive: true });
	const report: Record<string, unknown> = {};
	for (const scheme of ['light', 'dark'] as const) {
		const context = await browser.newContext({ colorScheme: scheme, viewport: { width: 1440, height: 900 } });
		const page = await context.newPage();
		const errors = trackErrors(page);
		for (const route of PUBLIC_ROUTES) {
			await page.goto(route);
			await page.waitForTimeout(1500);
			await page.screenshot({ path: join(OUT!, `${scheme}${slug(route)}.png`) });
			if (scheme === 'light') {
				report[route] = { url: new URL(page.url()).pathname, ...(await controlInventory(page)) };
			}
		}
		await logIn(page);
		for (const route of APP_ROUTES) {
			errors.length = 0;
			await page.goto(route);
			await page.waitForTimeout(2500);
			await page.screenshot({ path: join(OUT!, `${scheme}${slug(route)}.png`) });
			if (scheme === 'light') {
				report[route] = {
					url: new URL(page.url()).pathname,
					errors: [...errors],
					...(await controlInventory(page)),
				};
			}
		}
		await context.close();
	}
	writeFileSync(join(OUT!, 'inventory.json'), `${JSON.stringify(report, null, '\t')}\n`);
});
