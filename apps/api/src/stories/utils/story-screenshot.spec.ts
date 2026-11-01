import { afterAll, describe, expect, it } from 'vitest';

import { closeBrowser, getBrowser } from './headless-browser.js';
import { isBrokenRender, renderStoryScreenshot } from './story-screenshot.js';

/** Port of upstream `tests/story-screenshot.test.ts`; needs Chrome (skipped without it). PNG size read without sharp. */

const VIEWPORT = { width: 1280, height: 800 };

const isChromeAvailable = await getBrowser().then(
	() => true,
	() => false,
);

describe.skipIf(!isChromeAvailable)('rendering a story screenshot', () => {
	afterAll(async () => {
		await closeBrowser();
	});

	it('captures the first screen of a story that rendered cleanly', async () => {
		const screenshot = await renderStoryScreenshot(readyPage('<p>content</p>'), VIEWPORT, []);

		expect(pngMetadata(screenshot.image)).toEqual({ format: 'png', width: 1280, height: 800 });
		expect(isBrokenRender(screenshot)).toBe(false);
	});

	it('is broken on runtime errors, including the ones the error boundary catches', async () => {
		const screenshot = await renderStoryScreenshot(
			readyPage(
				'<p>content</p>',
				`window.postMessage({ type: 'quarry-story:error', message: 'boundary error' }, '*');
				setTimeout(() => { throw new Error('thrown error'); });`,
			),
			VIEWPORT,
			[],
		);

		expect(screenshot.runtimeErrors).toEqual(expect.arrayContaining(['boundary error', 'thrown error']));
		expect(isBrokenRender(screenshot)).toBe(true);
	});

	it('is broken when story-kit blocks show an error', async () => {
		const screenshot = await renderStoryScreenshot(
			readyPage(`
				<div class="quarry-block__state quarry-block__state--error">Query q1 is not part of this export.</div>
				<div class="quarry-block__state">No rows.</div>
			`),
			VIEWPORT,
			[],
		);

		expect(screenshot.blockErrors).toEqual(['Query q1 is not part of this export.']);
		expect(isBrokenRender(screenshot)).toBe(true);
	});

	it('is broken on a blank page', async () => {
		const screenshot = await renderStoryScreenshot(readyPage(''), VIEWPORT, []);

		expect(screenshot.blank).toBe(true);
		expect(isBrokenRender(screenshot)).toBe(true);
	});

	it('is blank when its only content sits below the captured first screen', async () => {
		const screenshot = await renderStoryScreenshot(
			readyPage(`<div style="margin-top: ${VIEWPORT.height * 2}px">Below the fold</div>`),
			VIEWPORT,
			[],
		);

		expect(screenshot.blank).toBe(true);
	});

	it('keeps a story drawn only with CSS shapes', async () => {
		const screenshot = await renderStoryScreenshot(
			readyPage('<div style="width: 200px; height: 120px; background: #c2410c"></div>'),
			VIEWPORT,
			[],
		);

		expect(screenshot.blank).toBe(false);
	});

	it('ignores block errors outside the captured first screen', async () => {
		const screenshot = await renderStoryScreenshot(
			readyPage(
				`<p>content</p><div class="quarry-block__state--error" style="margin-top: ${VIEWPORT.height * 2}px">Hidden error</div>`,
			),
			VIEWPORT,
			[],
		);

		expect(screenshot.blockErrors).toEqual([]);
	});

	it('is broken when the app never finishes mounting', { timeout: 60_000 }, async () => {
		const screenshot = await renderStoryScreenshot('<html><body><p>loading</p></body></html>', VIEWPORT, []);

		expect(screenshot.ready).toBe(false);
		expect(isBrokenRender(screenshot)).toBe(true);
	});
});

function readyPage(body: string, script = ''): string {
	return `<html><body style="margin: 0">${body}<script>
		document.documentElement.dataset.quarryStoryReady = 'true';
		${script}
	</script></body></html>`;
}

function pngMetadata(image: Buffer): { format: string; width: number; height: number } {
	const isPng = image.subarray(1, 4).toString('ascii') === 'PNG';
	return { format: isPng ? 'png' : 'unknown', width: image.readUInt32BE(16), height: image.readUInt32BE(20) };
}
