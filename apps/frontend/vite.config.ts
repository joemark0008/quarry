import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

import { STORY_RUNTIME_SOURCES, storyRuntime } from './vite/story-runtime-plugin';

/** apps/api (NestJS + GraphQL). */
const QUARRY_API_URL = process.env.QUARRY_API_URL ?? 'http://localhost:5006';
/** Upstream nao backend (../fork-reference), serving every screen not migrated yet. */
const UPSTREAM_API_URL = process.env.UPSTREAM_API_URL ?? 'http://localhost:5005';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		devtools({
			enhancedLogs: {
				enabled: false,
			},
			// Overridable so quarry and the upstream frontend can run side by side.
			eventBusConfig: { port: Number(process.env.TANSTACK_DEVTOOLS_PORT ?? 42069) },
		}),
		tanstackRouter({
			target: 'react',
			autoCodeSplitting: false,
		}),
		viteReact({ exclude: [/\/node_modules\//, STORY_RUNTIME_SOURCES] }),
		svgr({
			include: '**/*.svg',
			svgrOptions: { exportType: 'default' },
		}),
		tailwindcss(),
		storyRuntime(),
	],
	resolve: {
		alias: [
			{ find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
			// Upstream sources reached through @nao/shared/backend/* must load quarry's @nao/shared, not fork-reference's.
			{ find: /^@nao\/shared$/, replacement: fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)) },
			{ find: /^@nao\/shared\/(.*)$/, replacement: fileURLToPath(new URL('../shared/src/$1', import.meta.url)) },
		],
	},
	server: {
		fs: {
			// The @nao/shared/backend/* bridges import upstream sources from ../fork-reference until Phase 8.
			allow: ['../..', '../../../fork-reference'],
		},
		// Proxy split (PLAN.md §8): migrated paths go to apps/api, everything else to the upstream backend.
		// Most specific first: Vite matches proxy keys in order.
		proxy: {
			'/graphql': { target: QUARRY_API_URL },
			'/api/auth': { target: QUARRY_API_URL },
			'/health': { target: QUARRY_API_URL },
			'/api': { target: UPSTREAM_API_URL },
			'/mcp': { target: UPSTREAM_API_URL },
			'/.well-known': { target: UPSTREAM_API_URL },
			'/i/': { target: UPSTREAM_API_URL },
			'/c/': { target: UPSTREAM_API_URL },
		},
	},
});
