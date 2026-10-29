import { getBrowser } from './headless-browser.js';

/**
 * Image decoding and re-encoding in the shared headless Chrome, standing in for upstream's `sharp` (a native addon
 * quarry does not install): story thumbnails are resized to WebP, and theme generation reads sampled pixels.
 */

export interface RawImage {
	/** RGBA, 4 bytes per pixel. */
	data: Buffer;
	width: number;
	height: number;
}

/**
 * Decodes an image (PNG, JPEG, WebP, GIF…; EXIF orientation applied, as sharp's `rotate()`), shrunk to fit
 * `maxSize`×`maxSize` without enlarging, as RGBA pixels. Throws when the image cannot be decoded.
 */
export async function decodeImageToRgba(image: Uint8Array, maxSize: number): Promise<RawImage> {
	const result = await inBlankPage((page) =>
		page.evaluate(
			async (base64: string, max: number) => {
				const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
				const bitmap = await createImageBitmap(new Blob([bytes]), { imageOrientation: 'from-image' });
				const scale = Math.min(1, max / bitmap.width, max / bitmap.height);
				const width = Math.max(1, Math.round(bitmap.width * scale));
				const height = Math.max(1, Math.round(bitmap.height * scale));
				const canvas = new OffscreenCanvas(width, height);
				const context = canvas.getContext('2d');
				if (!context) {
					throw new Error('No 2D canvas context.');
				}
				context.drawImage(bitmap, 0, 0, width, height);
				const pixels = context.getImageData(0, 0, width, height).data;
				let binary = '';
				for (let offset = 0; offset < pixels.length; offset += 0x8000) {
					binary += String.fromCharCode(...pixels.subarray(offset, offset + 0x8000));
				}
				return { width, height, data: btoa(binary) };
			},
			Buffer.from(image).toString('base64'),
			maxSize,
		),
	);
	return { width: result.width, height: result.height, data: Buffer.from(result.data, 'base64') };
}

/** Resizes an image to `width` (keeping its ratio) and encodes it as WebP, as `sharp().resize({ width }).webp()`. */
export async function resizeToWebp(image: Uint8Array, width: number, quality: number): Promise<Buffer> {
	const base64 = await inBlankPage((page) =>
		page.evaluate(
			async (source: string, targetWidth: number, webpQuality: number) => {
				const bytes = Uint8Array.from(atob(source), (char) => char.charCodeAt(0));
				const bitmap = await createImageBitmap(new Blob([bytes]));
				const height = Math.max(1, Math.round((bitmap.height * targetWidth) / bitmap.width));
				const canvas = new OffscreenCanvas(targetWidth, height);
				const context = canvas.getContext('2d');
				if (!context) {
					throw new Error('No 2D canvas context.');
				}
				context.imageSmoothingQuality = 'high';
				context.drawImage(bitmap, 0, 0, targetWidth, height);
				const blob = await canvas.convertToBlob({ type: 'image/webp', quality: webpQuality });
				const encoded = new Uint8Array(await blob.arrayBuffer());
				let binary = '';
				for (let offset = 0; offset < encoded.length; offset += 0x8000) {
					binary += String.fromCharCode(...encoded.subarray(offset, offset + 0x8000));
				}
				return btoa(binary);
			},
			Buffer.from(image).toString('base64'),
			width,
			quality / 100,
		),
	);
	return Buffer.from(base64, 'base64');
}

async function inBlankPage<T>(
	run: (page: Awaited<ReturnType<Awaited<ReturnType<typeof getBrowser>>['newPage']>>) => Promise<T>,
): Promise<T> {
	const browser = await getBrowser();
	const page = await browser.newPage();
	try {
		return await run(page);
	} finally {
		await page.close();
	}
}
