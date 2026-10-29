import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import yaml from 'js-yaml';

import { PROJECT_CONFIG_FILE } from '../sql-engine/project-config.js';

/**
 * Edits `nao_config.yaml` without resolving its secrets. `{{ env('…') }}` references are written unquoted (they
 * are substituted before the YAML is parsed, and the substituted value is a JSON scalar), so they are swapped
 * for plain tokens while the YAML is parsed and dumped, then put back.
 */

const TEMPLATE_REGEX = /\$?\{\{\s*(?:env|aws|k8s)\(\s*['"][^'"]+['"]\s*\)\s*\}\}/g;
const TOKEN_PREFIX = '__QUARRY_TEMPLATE_';

export type ProjectConfigDocument = Record<string, unknown> & { databases?: Record<string, unknown>[] };

export async function readProjectConfigDocument(
	projectPath: string,
): Promise<{ document: ProjectConfigDocument; templates: string[] }> {
	let content = '';
	try {
		content = await readFile(path.join(projectPath, PROJECT_CONFIG_FILE), 'utf8');
	} catch {
		return { document: {}, templates: [] };
	}
	const templates: string[] = [];
	const protectedContent = content.replace(TEMPLATE_REGEX, (match) => {
		templates.push(match);
		return `${TOKEN_PREFIX}${templates.length - 1}__`;
	});
	const parsed = yaml.load(protectedContent);
	const document = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
	return { document: document as ProjectConfigDocument, templates };
}

export async function writeProjectConfigDocument(
	projectPath: string,
	document: ProjectConfigDocument,
	templates: string[],
): Promise<void> {
	const allTemplates = [...templates];
	const tokenized = tokenizeTemplates(document, allTemplates);
	const dumped = yaml.dump(tokenized, { lineWidth: 120, noRefs: true });
	const content = dumped.replace(new RegExp(`${TOKEN_PREFIX}(\\d+)__`, 'g'), (_match, index: string) => {
		return allTemplates[Number(index)];
	});
	await mkdir(projectPath, { recursive: true });
	const filePath = path.join(projectPath, PROJECT_CONFIG_FILE);
	await writeFile(`${filePath}.tmp`, content, { mode: 0o600 });
	await rename(`${filePath}.tmp`, filePath);
}

/** New template strings in the document (e.g. a database entry just added) become tokens too. */
function tokenizeTemplates(value: unknown, templates: string[]): unknown {
	if (typeof value === 'string') {
		return value.replace(TEMPLATE_REGEX, (match) => {
			templates.push(match);
			return `${TOKEN_PREFIX}${templates.length - 1}__`;
		});
	}
	if (Array.isArray(value)) {
		return value.map((item) => tokenizeTemplates(item, templates));
	}
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [key, tokenizeTemplates(item, templates)]),
		);
	}
	return value;
}
