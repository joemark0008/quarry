import { parse, type ParserPlugin } from '@babel/parser';
import type { Node } from '@babel/types';
import { build, type Message, type Plugin } from 'esbuild';

/**
 * Port of upstream `services/story-app-build.worker.ts`. Upstream bundles in a child `bun` process with `Bun.build`,
 * `Bun.Transpiler` and `HTMLRewriter`; quarry has no Bun, so the same steps run in process: esbuild bundles from the
 * in-memory sources (esbuild itself runs as a separate native process, so a runaway build cannot block the event
 * loop, and the caller enforces the timeout), `@babel/parser` scans imports and the entry's default export, and a
 * small tag scanner (`rewriteHtmlEntry`) does the HTML entry rewrite. Messages and checks are upstream's.
 */

export interface StoryBuildRequest {
	entry: string;
	files: Record<string, string>;
	allowedImports: string[];
	fontStylesheetHosts: string[];
	documentSlots: { head: string; body: string };
}

export interface StoryBuildDiagnostic {
	message: string;
	file?: string;
	line?: number;
	column?: number;
	lineText?: string;
}

export type StoryBuildResponse =
	{ ok: true; bundle: string; pageShell: string | null } | { ok: false; diagnostics: StoryBuildDiagnostic[] };

const NAMESPACE = 'story';
const SCRIPT_EXTENSIONS = ['jsx', 'tsx', 'js', 'ts'];
const RESOLVE_EXTENSIONS = [...SCRIPT_EXTENSIONS, 'json', 'css', 'md'];
const PRODUCTION_DEFINE = { 'process.env.NODE_ENV': '"production"' };
const JSX_RUNTIME_IMPORTS = ['react/jsx-runtime', 'react/jsx-dev-runtime'];
const EXECUTABLE_SCRIPT_TYPES = ['', 'module', 'text/javascript', 'application/javascript'];
const VIRTUAL_PREFIX = '__quarry-';
const HTML_BUILD_ENTRY = `${VIRTUAL_PREFIX}entry.js`;

type ScriptLoader = 'jsx' | 'tsx' | 'js' | 'ts';

export async function runStoryBuild(request: StoryBuildRequest): Promise<StoryBuildResponse> {
	const files = { ...request.files };
	const allowed = new Set(request.allowedImports);
	const virtualFileNames = new Map<string, string>();
	const isHtmlEntry = /\.html$/i.test(request.entry);

	const displayFileName = (filePath: string | undefined): string | undefined => {
		return filePath === undefined ? undefined : (virtualFileNames.get(filePath) ?? filePath);
	};

	const resolveRelative = (importer: string, specifier: string): string | null => {
		const directory = importer.includes('/') ? importer.slice(0, importer.lastIndexOf('/')) : '';
		const base = normalize(directory ? `${directory}/${specifier}` : specifier);
		if (base === null) {
			return null;
		}
		const candidates = [
			base,
			...RESOLVE_EXTENSIONS.map((extension) => `${base}.${extension}`),
			...SCRIPT_EXTENSIONS.map((extension) => `${base}/index.${extension}`),
		];
		return candidates.find((candidate) => candidate in files) ?? null;
	};

	const describeImport = (importer: string, specifier: string): string | null => {
		if (allowed.has(specifier)) {
			return null;
		}
		const importerName = displayFileName(importer);
		if (!isRelative(specifier)) {
			return `"${importerName}" imports "${specifier}", which is not available to stories. Allowed packages: ${[...allowed].join(', ')}. Relative imports must start with "./" or "../".`;
		}
		if (resolveRelative(importer, specifier) === null) {
			return `"${importerName}" imports "${specifier}", which does not exist in the story. Write the file first, or fix the path.`;
		}
		return null;
	};

	/** Reports every bad import across the story at once, before the bundler stops at the first one. */
	const scanImports = (): StoryBuildDiagnostic[] => {
		const diagnostics: StoryBuildDiagnostic[] = [];
		for (const [filePath, content] of Object.entries(files)) {
			const extension = extensionOf(filePath);
			if (!SCRIPT_EXTENSIONS.includes(extension)) {
				continue;
			}
			const program = parseScript(content, extension as ScriptLoader);
			if (!program) {
				continue;
			}
			for (const specifier of importSpecifiers(program)) {
				if (JSX_RUNTIME_IMPORTS.includes(specifier)) {
					continue;
				}
				const message = describeImport(filePath, specifier);
				if (message) {
					diagnostics.push({ file: displayFileName(filePath), message });
				}
			}
		}
		return diagnostics;
	};

	/** The runtime renders the entry's default export, so an entry without one would only fail in the viewer. */
	const scanEntryExport = (): StoryBuildDiagnostic[] => {
		const extension = extensionOf(request.entry);
		if (!SCRIPT_EXTENSIONS.includes(extension)) {
			return [
				{
					file: request.entry,
					message: `The entry "${request.entry}" must be a .jsx, .tsx, .js or .ts file that default-exports the root React component, or an .html document.`,
				},
			];
		}
		const program = parseScript(files[request.entry], extension as ScriptLoader);
		if (!program || hasDefaultExport(program)) {
			return [];
		}
		return [
			{
				file: request.entry,
				message: `"${request.entry}" must default-export the root React component, e.g. "export default function App() { … }".`,
			},
		];
	};

	let pageShell: string | null = null;
	let buildEntry = request.entry;
	if (isHtmlEntry) {
		const prepared = prepareHtmlEntry(request, files, virtualFileNames, resolveRelative);
		if ('diagnostics' in prepared) {
			return { ok: false, diagnostics: prepared.diagnostics };
		}
		pageShell = prepared.pageShell;
		buildEntry = HTML_BUILD_ENTRY;
	}

	const importDiagnostics = [...scanImports(), ...(isHtmlEntry ? [] : scanEntryExport())];
	if (importDiagnostics.length > 0) {
		return { ok: false, diagnostics: importDiagnostics };
	}

	const storyFilesPlugin: Plugin = {
		name: 'story-files',
		setup(pluginBuild) {
			pluginBuild.onResolve({ filter: /.*/ }, (args) => {
				const specifier = args.path.startsWith(`${NAMESPACE}:`)
					? args.path.slice(NAMESPACE.length + 1)
					: args.path;
				if (args.kind === 'entry-point') {
					return { path: normalize(specifier) ?? specifier, namespace: NAMESPACE };
				}
				if (allowed.has(specifier)) {
					return { path: specifier, external: true };
				}
				const message = describeImport(args.importer, specifier);
				if (message) {
					return { errors: [{ text: message }] };
				}
				return { path: resolveRelative(args.importer, specifier)!, namespace: NAMESPACE };
			});
			pluginBuild.onLoad({ filter: /.*/, namespace: NAMESPACE }, (args) => {
				const extension = extensionOf(args.path);
				if (extension === 'css') {
					return { contents: '', loader: 'js' };
				}
				if (extension === 'md') {
					return { contents: files[args.path], loader: 'text' };
				}
				return { contents: files[args.path], loader: extension as ScriptLoader | 'json' };
			});
		},
	};

	try {
		const result = await build({
			entryPoints: [`${NAMESPACE}:${buildEntry}`],
			bundle: true,
			write: false,
			platform: 'browser',
			format: 'esm',
			minify: false,
			sourcemap: false,
			jsx: 'automatic',
			define: PRODUCTION_DEFINE,
			logLevel: 'silent',
			plugins: [storyFilesPlugin],
		});
		const output = result.outputFiles[0];
		return { ok: true, bundle: output?.text ?? '', pageShell };
	} catch (error) {
		const messages = (error as { errors?: Message[] }).errors;
		if (!messages) {
			throw error;
		}
		return {
			ok: false,
			diagnostics: messages.map((message) => ({
				message: message.text,
				file: displayFileName(message.location?.file?.replace(new RegExp(`^${NAMESPACE}:`), '') || undefined),
				line: message.location?.line || undefined,
				column: message.location ? message.location.column + 1 : undefined,
				lineText: message.location?.lineText || undefined,
			})),
		};
	}
}

/** Null when the path climbs above the story root. */
function normalize(filePath: string): string | null {
	const segments: string[] = [];
	for (const segment of filePath.split('/')) {
		if (segment === '..') {
			if (segments.pop() === undefined) {
				return null;
			}
		} else if (segment !== '.' && segment !== '') {
			segments.push(segment);
		}
	}
	return segments.join('/');
}

function extensionOf(filePath: string): string {
	return filePath.slice(filePath.lastIndexOf('.') + 1).toLowerCase();
}

function isRelative(specifier: string): boolean {
	return specifier.startsWith('./') || specifier.startsWith('../');
}

function isRemoteUrl(value: string): boolean {
	return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value);
}

function isLocalPath(value: string): boolean {
	return !isRemoteUrl(value) && !value.startsWith('/');
}

/** A file the parser cannot read is reported by the bundler with a position. */
function parseScript(content: string, loader: ScriptLoader): Node | null {
	const plugins: ParserPlugin[] =
		loader === 'ts' ? ['typescript'] : loader === 'tsx' ? ['typescript', 'jsx'] : ['jsx'];
	try {
		return parse(content, { sourceType: 'module', plugins }).program;
	} catch {
		return null;
	}
}

/** What `Bun.Transpiler.scanImports` reports: static imports, re-exports, dynamic `import()` and `require()`. */
function importSpecifiers(program: Node): string[] {
	const specifiers: string[] = [];
	walk(program, (node) => {
		if (
			(node.type === 'ImportDeclaration' ||
				node.type === 'ExportAllDeclaration' ||
				node.type === 'ExportNamedDeclaration') &&
			node.source
		) {
			specifiers.push(node.source.value);
		}
		if (node.type === 'CallExpression') {
			const [argument] = node.arguments;
			const isLoader =
				node.callee.type === 'Import' || (node.callee.type === 'Identifier' && node.callee.name === 'require');
			if (isLoader && argument?.type === 'StringLiteral') {
				specifiers.push(argument.value);
			}
		}
		if (node.type === 'ImportExpression' && node.source.type === 'StringLiteral') {
			specifiers.push(node.source.value);
		}
	});
	return specifiers;
}

function hasDefaultExport(program: Node): boolean {
	if (program.type !== 'Program') {
		return false;
	}
	return program.body.some(
		(statement) =>
			statement.type === 'ExportDefaultDeclaration' ||
			(statement.type === 'ExportNamedDeclaration' &&
				statement.specifiers.some((specifier) =>
					specifier.exported.type === 'Identifier'
						? specifier.exported.name === 'default'
						: specifier.exported.value === 'default',
				)),
	);
}

function walk(node: Node, visit: (node: Node) => void): void {
	visit(node);
	for (const key of Object.keys(node) as (keyof Node)[]) {
		if (key === 'loc' || key === 'leadingComments' || key === 'trailingComments' || key === 'innerComments') {
			continue;
		}
		const value = node[key] as unknown;
		if (Array.isArray(value)) {
			for (const child of value) {
				if (isNode(child)) {
					walk(child, visit);
				}
			}
		} else if (isNode(value)) {
			walk(value, visit);
		}
	}
}

function isNode(value: unknown): value is Node {
	return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string';
}

/**
 * Moves every executable `<script>` of the HTML entry, inline or local, into one virtual module that imports
 * them in document order: the frame's CSP only runs the host's hashed boot script, which loads the bundle.
 * The host's own CSP, import map and `<base>` rules must not be overridden, so those tags are dropped too.
 */
function prepareHtmlEntry(
	request: StoryBuildRequest,
	files: Record<string, string>,
	virtualFileNames: Map<string, string>,
	resolveRelative: (importer: string, specifier: string) => string | null,
): { pageShell: string } | { diagnostics: StoryBuildDiagnostic[] } {
	const diagnostics: StoryBuildDiagnostic[] = [];
	const imports: string[] = [];
	const inlineScripts: { path: string; content: string }[] = [];
	const entryDirectory = request.entry.slice(0, request.entry.lastIndexOf('/') + 1);
	const slots = request.documentSlots;

	const isAllowedFontStylesheet = (value: string): boolean => {
		try {
			const url = new URL(value, 'https://localhost');
			return url.protocol === 'https:' && request.fontStylesheetHosts.includes(url.hostname);
		} catch {
			return false;
		}
	};

	const addInlineScript = (content: string): void => {
		const path = `${entryDirectory}${VIRTUAL_PREFIX}inline-${inlineScripts.length}.js`;
		virtualFileNames.set(path, `${request.entry} (inline script #${inlineScripts.length + 1})`);
		inlineScripts.push({ path, content });
		imports.push(path);
	};

	const addScriptSource = (src: string): void => {
		if (!isLocalPath(src)) {
			diagnostics.push({
				file: request.entry,
				message: `<script src="${src}"> is not available to stories: scripts must be files of the story, referenced with a relative path.`,
			});
			return;
		}
		const resolved = resolveRelative(request.entry, src);
		if (resolved === null || !SCRIPT_EXTENSIONS.includes(extensionOf(resolved))) {
			diagnostics.push({
				file: request.entry,
				message: `<script src="${src}"> does not point to a .js, .jsx, .ts or .tsx file of the story. Write the file first, or fix the path.`,
			});
			return;
		}
		imports.push(resolved);
	};

	/** The frame's security policy would drop any other remote stylesheet silently, so the agent learns now. */
	const checkRemoteStylesheetLink = (href: string): void => {
		if (!isAllowedFontStylesheet(href)) {
			diagnostics.push({
				file: request.entry,
				message: `<link href="${href}"> is blocked by the story's security policy: only font stylesheets (${request.fontStylesheetHosts.join(', ')}) may be remote. Write the styles in a .css file of the story instead.`,
			});
		}
	};

	/** Every stylesheet of the story is inlined by the host, so a local link is only checked, then dropped. */
	const addStylesheetLink = (href: string): void => {
		if (resolveRelative(request.entry, href) === null) {
			diagnostics.push({
				file: request.entry,
				message: `<link href="${href}"> does not exist in the story. Write the file first, or fix the path.`,
			});
		}
	};

	/** The frame only runs listeners attached from scripts, so an inline handler would silently do nothing. */
	const checkInlineHandlers = (tag: StartTag): void => {
		for (const [name] of tag.attributes) {
			if (/^on/i.test(name)) {
				diagnostics.push({
					file: request.entry,
					message: `<${tag.name} ${name}="…"> is blocked by the story's security policy: attach the listener with addEventListener in a script instead.`,
				});
			}
		}
	};

	const { output, hasHtml, hasHead, hasBody, contentBeforeHead } = rewriteHtmlEntry(files[request.entry], {
		slots,
		onElement: checkInlineHandlers,
		onScript(tag, content) {
			const type = (attribute(tag, 'type') ?? '').trim().toLowerCase();
			if (type === 'importmap') {
				return 'remove';
			}
			if (!EXECUTABLE_SCRIPT_TYPES.includes(type)) {
				return 'keep';
			}
			const src = attribute(tag, 'src');
			if (src === null) {
				addInlineScript(content);
			} else {
				addScriptSource(src);
			}
			return 'remove';
		},
		onVoidElement(tag) {
			if (tag.name === 'base') {
				return 'remove';
			}
			if (tag.name === 'meta') {
				const httpEquiv = attribute(tag, 'http-equiv');
				return httpEquiv?.trim().toLowerCase() === 'content-security-policy' ? 'remove' : 'keep';
			}
			if (tag.name === 'link' && (attribute(tag, 'rel') ?? '').split(/\s+/).includes('stylesheet')) {
				const href = attribute(tag, 'href');
				if (href === null) {
					return 'keep';
				}
				if (!isLocalPath(href)) {
					checkRemoteStylesheetLink(href);
					return 'keep';
				}
				addStylesheetLink(href);
				return 'remove';
			}
			return 'keep';
		},
	});

	if (diagnostics.length > 0) {
		return { diagnostics };
	}
	for (const script of inlineScripts) {
		files[script.path] = script.content;
	}
	files[HTML_BUILD_ENTRY] = imports.map((path) => `import ${JSON.stringify(`./${path}`)};`).join('\n');
	virtualFileNames.set(HTML_BUILD_ENTRY, request.entry);

	const documentError = (problem: string): { diagnostics: StoryBuildDiagnostic[] } => {
		return { diagnostics: [{ file: request.entry, message: `"${request.entry}" ${problem}` }] };
	};

	const isFragment = !hasHtml && !hasHead && !hasBody;
	if (!isFragment && (!hasHead || !hasBody)) {
		return documentError(`must be a full document with <head> and <body>, or a fragment with neither.`);
	}
	if (!isFragment && contentBeforeHead) {
		return documentError(`must not have content before <head>: start it with <!doctype html><html><head>.`);
	}
	const pageShell = isFragment
		? `<!doctype html>\n<html>\n<head>\n${slots.head}\n</head>\n<body>\n${output}\n${slots.body}\n</body>\n</html>`
		: output;
	if (pageShell.split(slots.head).length !== 2 || pageShell.split(slots.body).length !== 2) {
		return documentError(`must have exactly one <head> and one <body>.`);
	}
	return { pageShell };
}

interface StartTag {
	name: string;
	attributes: [string, string | null][];
}

type TagAction = 'keep' | 'remove';

interface HtmlRewriteHandlers {
	slots: { head: string; body: string };
	onElement(tag: StartTag): void;
	onScript(tag: StartTag, content: string): TagAction;
	onVoidElement(tag: StartTag): TagAction;
}

interface HtmlRewriteResult {
	output: string;
	hasHtml: boolean;
	hasHead: boolean;
	hasBody: boolean;
	contentBeforeHead: boolean;
}

const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea', 'title']);
const TAG_PATTERN = /^<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/;
const ATTRIBUTE_PATTERN = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

/**
 * The subset of `HTMLRewriter` upstream relies on, as a single pass over the tags: comments are dropped, the head
 * slot is prepended to `<head>` and the body slot appended to `<body>`, scripts and void elements are kept or
 * removed by the handlers, and the document structure is reported.
 */
function rewriteHtmlEntry(html: string, handlers: HtmlRewriteHandlers): HtmlRewriteResult {
	const result: HtmlRewriteResult = {
		output: '',
		hasHtml: false,
		hasHead: false,
		hasBody: false,
		contentBeforeHead: false,
	};
	let index = 0;
	let bodyClosed = false;

	const markContentBeforeHead = () => {
		if (!result.hasHead) {
			result.contentBeforeHead = true;
		}
	};

	while (index < html.length) {
		const next = html.indexOf('<', index);
		const textEnd = next === -1 ? html.length : next;
		if (textEnd > index) {
			const text = html.slice(index, textEnd);
			if (text.trim() !== '') {
				markContentBeforeHead();
			}
			result.output += text;
			index = textEnd;
			continue;
		}

		if (html.startsWith('<!--', index)) {
			const end = html.indexOf('-->', index + 4);
			index = end === -1 ? html.length : end + 3;
			continue;
		}
		if (html.startsWith('<!', index) || html.startsWith('<?', index)) {
			const end = html.indexOf('>', index);
			const stop = end === -1 ? html.length : end + 1;
			result.output += html.slice(index, stop);
			index = stop;
			continue;
		}

		const match = TAG_PATTERN.exec(html.slice(index));
		if (!match) {
			markContentBeforeHead();
			result.output += '<';
			index += 1;
			continue;
		}
		const [source, closing, rawName, rawAttributes] = match;
		const name = rawName.toLowerCase();
		index += source.length;

		if (closing) {
			if (name === 'body' && !bodyClosed) {
				result.output += handlers.slots.body;
				bodyClosed = true;
			}
			result.output += source;
			continue;
		}

		const tag: StartTag = { name, attributes: parseAttributes(rawAttributes.replace(/\/\s*$/, '')) };
		if (name !== 'html' && name !== 'head') {
			markContentBeforeHead();
		}
		handlers.onElement(tag);

		if (RAW_TEXT_ELEMENTS.has(name)) {
			const closeTag = new RegExp(`</${name}\\s*>`, 'i');
			const rest = html.slice(index);
			const close = closeTag.exec(rest);
			const content = close ? rest.slice(0, close.index) : rest;
			const elementEnd = close ? index + close.index + close[0].length : html.length;
			const action = name === 'script' ? handlers.onScript(tag, content) : 'keep';
			if (action === 'keep') {
				result.output += source + html.slice(index, elementEnd);
			}
			index = elementEnd;
			continue;
		}

		if (handlers.onVoidElement(tag) === 'remove') {
			continue;
		}
		result.output += source;
		if (name === 'html') {
			result.hasHtml = true;
		} else if (name === 'head') {
			result.hasHead = true;
			result.output += handlers.slots.head;
		} else if (name === 'body') {
			result.hasBody = true;
		}
	}

	if (result.hasBody && !bodyClosed) {
		result.output += handlers.slots.body;
	}
	return result;
}

function parseAttributes(source: string): [string, string | null][] {
	return [...source.matchAll(ATTRIBUTE_PATTERN)].map((match) => [
		match[1].toLowerCase(),
		match[2] ?? match[3] ?? match[4] ?? null,
	]);
}

function attribute(tag: StartTag, name: string): string | null {
	const found = tag.attributes.find(([attributeName]) => attributeName === name);
	return found ? (found[1] ?? '') : null;
}
