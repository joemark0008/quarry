import {
	MAX_STORY_BUNDLE_BYTES,
	STORY_APP_ALLOWED_IMPORTS,
	STORY_APP_ENTRY_CANDIDATES,
	STORY_APP_MANIFEST_PATH,
	STORY_DOCUMENT_SLOTS,
	type StoryApp,
} from '@quarry/shared/story-app';
import { FONT_STYLESHEET_HOSTS, isAllowedFontStylesheet } from '@quarry/shared/story-theme';

import {
	runStoryBuild,
	type StoryBuildDiagnostic,
	type StoryBuildRequest,
	type StoryBuildResponse,
} from './story-app-build.worker.js';

/**
 * Bundles a custom story's source files into one browser ES module, ready to be
 * served inside the sandboxed frame with the allowed packages supplied by an
 * import map. Upstream runs the build in a child `bun` process; quarry bundles
 * with esbuild (its own native process) under the same timeout. Nothing is ever
 * installed, and imports outside the allowlist fail the build.
 */

export interface StorySourceFile {
	path: string;
	content: string;
}

export type StoryBuildResult = { ok: true; app: StoryApp; entry: string } | { ok: false; errors: string[] };

const BUILD_TIMEOUT_MS = 20_000;
const STDERR_TAIL_CHARS = 600;
const REMOTE_STYLE_IMPORT = /@import\s+(?:url\(\s*)?["']?(https?:\/\/[^"')\s;]+)/gi;

export async function buildStoryApp(files: StorySourceFile[]): Promise<StoryBuildResult> {
	const sources = Object.fromEntries(files.map((file) => [file.path, file.content]));
	const entry = resolveEntry(sources);
	if (!entry.ok) {
		return entry;
	}
	const styleErrors = remoteStylesheetErrors(files);
	if (styleErrors.length > 0) {
		return { ok: false, errors: styleErrors };
	}

	const response = await runBuildWorker({
		entry: entry.path,
		files: sources,
		allowedImports: [...STORY_APP_ALLOWED_IMPORTS],
		fontStylesheetHosts: [...FONT_STYLESHEET_HOSTS],
		documentSlots: STORY_DOCUMENT_SLOTS,
	}).catch((error: unknown) => error as Error);
	if (response instanceof Error) {
		return { ok: false, errors: [response.message] };
	}
	if (!response.ok) {
		return { ok: false, errors: response.diagnostics.map(formatDiagnostic) };
	}

	const size = Buffer.byteLength(response.bundle, 'utf8') + Buffer.byteLength(response.pageShell ?? '', 'utf8');
	if (size > MAX_STORY_BUNDLE_BYTES) {
		return {
			ok: false,
			errors: [
				`The built app is ${Math.round(size / 1024)}KB; bundles are capped at ${MAX_STORY_BUNDLE_BYTES / 1024}KB. Move heavy data into queries instead of source files.`,
			],
		};
	}
	return { ok: true, app: toStoryApp(response.bundle, response.pageShell), entry: entry.path };
}

function toStoryApp(bundle: string, pageShell: string | null): StoryApp {
	return pageShell === null ? { kind: 'react', bundle } : { kind: 'html', bundle, pageShell };
}

function resolveEntry(sources: Record<string, string>): { ok: true; path: string } | { ok: false; errors: string[] } {
	const declared = declaredEntry(sources);
	if (declared.error) {
		return { ok: false, errors: [declared.error] };
	}
	if (declared.path) {
		if (!(declared.path in sources)) {
			return {
				ok: false,
				errors: [
					`${STORY_APP_MANIFEST_PATH} names "${declared.path}" as the entry, but that file does not exist.`,
				],
			};
		}
		return { ok: true, path: declared.path };
	}
	const candidate = STORY_APP_ENTRY_CANDIDATES.find((path) => path in sources);
	if (!candidate) {
		return {
			ok: false,
			errors: [
				`No entry file. Add ${STORY_APP_ENTRY_CANDIDATES.map((path) => `"${path}"`).join(' or ')} exporting the root component as default, or set "entry" in ${STORY_APP_MANIFEST_PATH} (a script, or an .html document).`,
			],
		};
	}
	return { ok: true, path: candidate };
}

/** The frame's content security policy would drop these silently, so the agent learns at build time instead. */
function remoteStylesheetErrors(files: StorySourceFile[]): string[] {
	return files
		.filter((file) => file.path.toLowerCase().endsWith('.css'))
		.flatMap((file) => {
			return [...file.content.matchAll(REMOTE_STYLE_IMPORT)]
				.filter((match) => !isAllowedFontStylesheet(match[1]))
				.map((match) => {
					const line = file.content.slice(0, match.index).split('\n').length;
					return `${file.path}:${line} — @import of "${match[1]}" is blocked: stories only load their own CSS and theme fonts. Leaflet's CSS and the kit styles are already loaded; delete this line.`;
				});
		});
}

function declaredEntry(sources: Record<string, string>): { path?: string; error?: string } {
	const manifest = sources[STORY_APP_MANIFEST_PATH];
	if (manifest === undefined) {
		return {};
	}
	try {
		const parsed: unknown = JSON.parse(manifest);
		const entry = typeof parsed === 'object' && parsed !== null ? (parsed as { entry?: unknown }).entry : undefined;
		if (entry !== undefined && typeof entry !== 'string') {
			return { error: `${STORY_APP_MANIFEST_PATH}: "entry" must be a string path relative to the story root.` };
		}
		return { path: entry };
	} catch (error) {
		return { error: `${STORY_APP_MANIFEST_PATH} is not valid JSON: ${(error as Error).message}` };
	}
}

function formatDiagnostic(diagnostic: StoryBuildDiagnostic): string {
	const location = diagnostic.file
		? `${diagnostic.file}${diagnostic.line ? `:${diagnostic.line}${diagnostic.column ? `:${diagnostic.column}` : ''}` : ''} — `
		: '';
	const excerpt = diagnostic.lineText ? `\n    ${diagnostic.lineText.trim()}` : '';
	return `${location}${diagnostic.message}${excerpt}`;
}

function runBuildWorker(request: StoryBuildRequest): Promise<StoryBuildResponse> {
	let timer: NodeJS.Timeout | undefined;
	const timeout = new Promise<never>((_resolve, reject) => {
		timer = setTimeout(
			() => reject(new Error(`The story build timed out after ${BUILD_TIMEOUT_MS / 1000}s.`)),
			BUILD_TIMEOUT_MS,
		);
	});
	const run = runStoryBuild(request).catch((error: unknown) => {
		const message = error instanceof Error ? error.message : String(error);
		throw new Error(`The story build crashed. ${message.slice(-STDERR_TAIL_CHARS)}`);
	});
	return Promise.race([run, timeout]).finally(() => clearTimeout(timer));
}
