import { MAX_STORY_LOGO_BYTES, STORY_LOGO_MEDIA_TYPES } from '@quarry/shared/story-theme';
import { SOURCE_IMAGE_MEDIA_TYPES } from '@quarry/shared/story-theme-source';

import { logger } from '../../../agent/utils/logger.js';
import type { SourceImage } from './generate.js';

const SVG_RASTER_SIZE = 512;

export interface StoryLogo {
	dataUri: string;
	image: SourceImage | null;
}

export interface WhiteLabelBrand {
	appName: string | null;
	brandColor: string | null;
	logo: StoryLogo | null;
	skippedLogoNote: string | null;
}

/**
 * Upstream reads the instance's white-label branding (`branding.service`). quarry has no branding service, so there is
 * never a white-label brand (as `storyTheme.getState`'s `whiteLabelIdentity: null`).
 */
export async function readWhiteLabelBrand(): Promise<WhiteLabelBrand | null> {
	return null;
}

export function renderWhiteLabelBrand(brand: WhiteLabelBrand, { logoAttached }: { logoAttached: boolean }): string {
	return [
		'WHITE-LABEL BRANDING, set by the admin in nao’s white-label settings:',
		brand.appName ? `  Brand name: ${brand.appName}` : '',
		brand.brandColor
			? `  Primary colour: ${brand.brandColor} — the brand's own declared primary. Use it as the accent and the first chart colour unless the admin guidance says otherwise.`
			: '',
		logoAttached && brand.logo?.image
			? '  The logo is the last attached image: read the wordmark style and colours from it.'
			: '',
		brand.logo ? '  A logo is configured, so the story header shows it: prefer header "logo" or "band".' : '',
		brand.appName && !brand.logo ? '  A brand name is configured, so the story header can use header "name".' : '',
	]
		.filter(Boolean)
		.join('\n');
}

export async function toStoryLogo(data: string, rawMediaType: string): Promise<StoryLogo | null> {
	const mediaType = normalizeMediaType(rawMediaType);
	const base64 = data.replace(/^data:[^,]*,/, '').replace(/\s/g, '');
	const isStoryLogo = (STORY_LOGO_MEDIA_TYPES as readonly string[]).includes(mediaType);
	if (!isStoryLogo || Buffer.byteLength(base64, 'base64') > MAX_STORY_LOGO_BYTES) {
		return null;
	}
	const bytes = new Uint8Array(Buffer.from(base64, 'base64'));
	const isRaster = (SOURCE_IMAGE_MEDIA_TYPES as readonly string[]).includes(mediaType);
	return {
		dataUri: `data:${mediaType};base64,${base64}`,
		image: isRaster ? { data: bytes, mediaType } : await rasterizeSvg(bytes),
	};
}

function normalizeMediaType(rawMediaType: string): string {
	return rawMediaType.toLowerCase().replace('image/jpg', 'image/jpeg');
}

/**
 * The model only reads raster images, so an SVG logo is drawn to a PNG for it; the header keeps the SVG. Upstream
 * uses sharp; quarry draws it with resvg (as chart images).
 */
async function rasterizeSvg(svg: Uint8Array): Promise<SourceImage | null> {
	try {
		const { Resvg } = await import('@resvg/resvg-js');
		const rendered = new Resvg(Buffer.from(svg), { fitTo: { mode: 'width', value: SVG_RASTER_SIZE } }).render();
		const scale = Math.min(1, SVG_RASTER_SIZE / Math.max(rendered.width, rendered.height));
		const png =
			scale < 1
				? new Resvg(Buffer.from(svg), {
						fitTo: { mode: 'width', value: Math.round(rendered.width * scale) },
					})
						.render()
						.asPng()
				: rendered.asPng();
		return { data: new Uint8Array(png), mediaType: 'image/png' };
	} catch (error) {
		logger.warn(`An SVG logo could not be rasterized for theme generation: ${String(error)}`, { source: 'system' });
		return null;
	}
}
