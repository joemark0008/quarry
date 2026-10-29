import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
// @resvg/resvg-js is a dependency of apps/api (chart images).
const require = createRequire(join(HERE, '..', 'apps', 'api', 'package.json'));
const { Resvg } = require('@resvg/resvg-js');

const OUT = process.argv[2];
const WORDMARK_PATH = JSON.parse(readFileSync(join(HERE, 'wordmark.json'), 'utf8')).d;

const color = {
	teal: '#0F6E56',
	tealLight: '#1D9E75',
	tealDark: '#085041',
	gold: '#EF9F27',
	ink: '#2C2C2A',
	paper: '#F1EFE8',
};

const facets = (p) => `
	<polygon points="28,6 47,17 47,39 28,50 9,39 9,17" fill="${p.base}"/>
	<polygon points="28,6 47,17 28,28" fill="${p.light}"/>
	<polygon points="9,17 28,28 9,39" fill="${p.dark}"/>
	<polygon points="28,28 47,39 28,50" fill="${p.accent}"/>`;

const palettes = {
	color: { base: color.teal, light: color.tealLight, dark: color.tealDark, accent: color.gold },
	white: { base: '#FFFFFF', light: '#FFFFFF', dark: '#C9E9DD', accent: color.gold },
	mono: { base: '#6B6A65', light: '#8E8D87', dark: '#45443F', accent: '#B4B2A9' },
	outline: { base: '#FFFFFF', light: '#FFFFFF', dark: '#FFFFFF', accent: '#FFFFFF' },
};

const MARK_BOX = '5 5 46 46';
const svg = (viewBox, body, size = '') =>
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${size} fill="none">${body}\n</svg>\n`;

const mark = (palette) => svg(MARK_BOX, facets(palette));
const wordmark = (ink) => svg('0 -60 336 90', `\n\t<path d="${WORDMARK_PATH}" fill="${ink}"/>`);

const fullLogo = (ink, palette) =>
	svg(
		'0 0 310 80',
		`
	<svg x="0" y="4" width="72" height="72" viewBox="${MARK_BOX}">${facets(palette)}</svg>
	<path transform="translate(85.9 58) scale(0.65)" d="${WORDMARK_PATH}" fill="${ink}"/>`,
	);

const hero = (fill, stroke) =>
	svg(
		'0 0 737 401',
		`
	<g opacity="0.5" stroke="${stroke}" stroke-width="0.15" stroke-linejoin="round" fill="${fill}" transform="translate(172.5 4.5) scale(7)">
		<polygon points="28,6 47,17 28,28"/><polygon points="28,6 28,28 9,17"/>
		<polygon points="9,17 28,28 9,39"/><polygon points="9,39 28,28 28,50"/>
		<polygon points="28,28 47,39 28,50"/><polygon points="47,17 47,39 28,28"/>
	</g>`,
		' width="737" height="401"',
	);

const square = (size, bg, palette, pad, radius) => {
	const inner = size - pad * 2;
	return svg(
		`0 0 ${size} ${size}`,
		`
	<rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>
	<svg x="${pad}" y="${pad}" width="${inner}" height="${inner}" viewBox="${MARK_BOX}">${facets(palette)}</svg>`,
	);
};

const appIcon = square(512, '#FFFFFF', palettes.color, 96, 112);
const appIconDark = square(512, '#04342C', palettes.white, 96, 112);

const files = {
	'svg/quarry-mark.svg': mark(palettes.color),
	'svg/quarry-mark-white.svg': mark(palettes.white),
	'svg/quarry-mark-greyscale.svg': mark(palettes.mono),
	'svg/quarry-wordmark.svg': wordmark(color.ink),
	'svg/quarry-wordmark-white.svg': wordmark(color.paper),
	'svg/quarry-logo-light.svg': fullLogo(color.ink, palettes.color),
	'svg/quarry-logo-dark.svg': fullLogo(color.paper, palettes.color),
	'svg/quarry-app-icon.svg': appIcon,
	'svg/quarry-app-icon-dark.svg': appIconDark,
	'frontend/public/favicon.svg': mark(palettes.color),
	'frontend/public/lightLogo.svg': hero('#F8F8F8', '#D8D8D8'),
	'frontend/public/darkLogo.svg': hero('#2A2A28', '#3D3D3A'),
	'frontend/public/light-card-logo.svg': hero('#E1F5EE', '#9FE1CB'),
	'frontend/public/dark-card-logo.svg': hero('#0B3A30', '#0F6E56'),
	'frontend/src/components/icons/quarry-logo.svg': mark(palettes.color),
	'frontend/src/components/icons/quarry-full-logo.svg': fullLogo(color.ink, palettes.color),
	'frontend/src/components/icons/quarry-logo-greyscale.svg': mark(palettes.mono),
};

const pngs = {
	'png/quarry-logo-light-1200.png': [files['svg/quarry-logo-light.svg'], 1200],
	'png/quarry-logo-dark-1200.png': [files['svg/quarry-logo-dark.svg'], 1200],
	'png/quarry-app-icon-1024.png': [appIcon, 1024],
	'png/quarry-app-icon-dark-1024.png': [appIconDark, 1024],
	'png/quarry-mark-white-512.png': [files['svg/quarry-mark-white.svg'], 512],
	'png/quarry-mark-greyscale-512.png': [files['svg/quarry-mark-greyscale.svg'], 512],
	'frontend/public/appicon.png': [square(180, '#FFFFFF', palettes.color, 30, 0), 180],
	'frontend/public/icon-192.png': [appIcon, 192],
	'frontend/public/icon-512.png': [appIcon, 512],
	'frontend/public/color.png': [square(192, color.teal, palettes.white, 36, 0), 192],
	'frontend/public/outline.png': [mark(palettes.outline), 32],
	'frontend/src/components/icons/quarry-desktop-logo.png': [appIcon, 512],
};
for (const size of [64, 128, 256, 512, 1024]) {
	pngs[`png/quarry-mark-${size}.png`] = [files['svg/quarry-mark.svg'], size];
}

const render = (source, width) => new Resvg(source, { fitTo: { mode: 'width', value: width } }).render().asPng();

const write = (relativePath, data) => {
	const path = join(OUT, relativePath);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, data);
};

for (const [path, content] of Object.entries(files)) {
	write(path, content);
}
for (const [path, [source, width]] of Object.entries(pngs)) {
	write(path, render(source, width));
}

const icoSizes = [16, 32, 48];
const icoImages = icoSizes.map((size) => render(mark(palettes.color), size));
const header = Buffer.alloc(6 + 16 * icoImages.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoImages.length, 4);
let offset = header.length;
icoImages.forEach((image, index) => {
	const entry = 6 + index * 16;
	header.writeUInt8(icoSizes[index], entry);
	header.writeUInt8(icoSizes[index], entry + 1);
	header.writeUInt16LE(1, entry + 4);
	header.writeUInt16LE(32, entry + 6);
	header.writeUInt32LE(image.length, entry + 8);
	header.writeUInt32LE(offset, entry + 12);
	offset += image.length;
});
write('frontend/public/favicon.ico', Buffer.concat([header, ...icoImages]));

write(
	'frontend/public/site.webmanifest',
	JSON.stringify(
		{
			name: 'quarry',
			short_name: 'quarry',
			icons: [
				{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
				{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
			],
			theme_color: color.teal,
			background_color: '#FFFFFF',
			display: 'standalone',
		},
		null,
		'\t',
	) + '\n',
);

console.log('written to', OUT);
