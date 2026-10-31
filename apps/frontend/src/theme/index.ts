import { createTheme, Modal } from '@mantine/core';
import type { CSSVariablesResolver, MantineColorsTuple } from '@mantine/core';

/** quarry teal, built around #0f6e56 (index 7) and #1d9e75 (index 5). */
const brand: MantineColorsTuple = [
	'#e7f6f1',
	'#c3e9dc',
	'#94d8c1',
	'#5cc9a3',
	'#25b587',
	'#1d9e75',
	'#158664',
	'#0f6e56',
	'#085041',
	'#053a2f',
];

/** Stock components read dark-* directly, so it is rebuilt on the dark tokens. */
const dark: MantineColorsTuple = [
	'#f7f7f8',
	'#d4d5d9',
	'#8d8f98',
	'#6b6d76',
	'#3b3c43',
	'#2e2f35',
	'#26272c',
	'#1f2024',
	'#141518',
	'#0c0d0f',
];

export const theme = createTheme({
	primaryColor: 'brand',
	primaryShade: { light: 7, dark: 5 },
	defaultRadius: 'md',
	colors: { brand, dark },
	fontFamily: 'var(--app-font-body)',
	fontFamilyMonospace: 'var(--app-font-mono)',
	headings: { fontFamily: 'var(--app-font-heading)' },
	components: {
		Modal: Modal.extend({
			defaultProps: {
				radius: 'lg',
				transitionProps: { transition: 'pop', duration: 180, timingFunction: 'cubic-bezier(.2,.8,.2,1)' },
			},
		}),
	},
});

const tokenVariables = {
	'--mantine-color-body': 'var(--app-surface)',
	'--mantine-color-text': 'var(--app-body)',
	'--mantine-color-dimmed': 'var(--app-muted)',
	'--mantine-color-default': 'var(--app-surface)',
	'--mantine-color-default-hover': 'var(--app-fill)',
	'--mantine-color-default-color': 'var(--app-body)',
	'--mantine-color-default-border': 'var(--app-line)',
	'--mantine-color-anchor': 'var(--app-accent-text)',
	'--mantine-color-error': 'var(--app-danger)',
};

export const cssVariablesResolver: CSSVariablesResolver = () => ({
	variables: {},
	light: tokenVariables,
	dark: tokenVariables,
});
