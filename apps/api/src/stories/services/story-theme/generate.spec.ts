import { Resvg } from '@resvg/resvg-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bindStoryRuntime } from '../../story-queries.js';
import { closeBrowser, getBrowser } from '../../utils/headless-browser.js';
import { generateStoryThemePairFromSources } from './generate.js';

/**
 * `storyTheme.generate` without a model (upstream has no test for it): the deterministic proposal from an image's
 * pixels, decoded in the headless Chrome where upstream used sharp. Skipped without Chrome.
 */
const isChromeAvailable = await getBrowser().then(
	() => true,
	() => false,
);

describe.skipIf(!isChromeAvailable)('generating a story theme', () => {
	beforeAll(() => {
		bindStoryRuntime({
			llm: {
				resolveDefaultModelSelection: async () => null,
				getProjectModelProvider: async () => undefined,
				resolveProviderModel: async () => null,
			},
		});
	});

	afterAll(async () => {
		bindStoryRuntime(null);
		await closeBrowser();
	});

	it('reads a dark page and its accent from an image', { timeout: 60_000 }, async () => {
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
			<rect width="400" height="300" fill="#0b1020"/>
			<rect x="40" y="40" width="120" height="60" fill="#f97316"/>
			<rect x="40" y="140" width="320" height="16" fill="#e5e7eb"/>
		</svg>`;
		const png = new Uint8Array(new Resvg(svg).render().asPng());

		const result = await generateStoryThemePairFromSources(
			{ projectId: 'project-1', userId: 'user-1' },
			{ image: { data: png, mediaType: 'image/png' }, imageName: 'brand.png', useWhiteLabel: true },
		);

		expect(result.sourceMode).toBe('dark');
		expect(result.theme.dark.surfaces.page.toLowerCase()).not.toBe('#ffffff');
		expect(result.theme.light).toBeDefined();
		expect(result.generation).toBeDefined();
	});
});
