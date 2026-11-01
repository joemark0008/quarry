import { readFile } from 'node:fs/promises';
import path from 'node:path';

import yaml from 'js-yaml';

import { type DatabaseConfig, getDatabaseFolderNames, postgresDatabaseConfigSchema } from './database-config.js';

/**
 * Port of the parts of `QuarryConfig.try_load` (`upstream_core/config/base.py`, `secrets.py`) the SQL engine and sync
 * need: read `quarry_config.yaml` from the project folder, substitute `{{ env('VAR') }}` references (request env
 * first, then the process env), and validate the `databases` list. `aws()` / `k8s()` secrets are not supported.
 */

/** The file name upstream reads; renamed at cut-over (PHASES.md 1c). */
export const PROJECT_CONFIG_FILE = 'quarry_config.yaml';

const TEMPLATE_REGEX = /\$?\{\{\s*(env|aws|k8s)\(\s*['"]([^'"]+)['"]\s*\)\s*\}\}/g;

export class ProjectConfigError extends Error {
	override name = 'ProjectConfigError';
}

export interface ProjectConfig {
	projectName: string | null;
	databases: ConfiguredDatabase[];
	/** The parsed YAML, for the sections other modules read (llm, rules…). */
	raw: Record<string, unknown>;
}

export type ConfiguredDatabase =
	| { supported: true; name: string; type: string; config: DatabaseConfig }
	| { supported: false; name: string; type: string };

export async function loadProjectConfig(
	projectPath: string,
	extraEnv: Record<string, string> = {},
): Promise<ProjectConfig | null> {
	let content: string;
	try {
		content = await readFile(path.join(projectPath, PROJECT_CONFIG_FILE), 'utf8');
	} catch {
		return null;
	}
	return parseProjectConfig(content, extraEnv);
}

export function parseProjectConfig(content: string, extraEnv: Record<string, string> = {}): ProjectConfig {
	const { rendered, missing } = processSecrets(content, extraEnv);
	let document: unknown;
	try {
		document = yaml.load(rendered) ?? {};
	} catch (error) {
		throw new ProjectConfigError(
			`Invalid ${PROJECT_CONFIG_FILE}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
	if (typeof document !== 'object' || document === null || Array.isArray(document)) {
		throw new ProjectConfigError(`Invalid ${PROJECT_CONFIG_FILE}: expected a mapping`);
	}
	const raw = document as Record<string, unknown>;
	const databases = Array.isArray(raw.databases) ? raw.databases : [];
	return {
		projectName: typeof raw.project_name === 'string' ? raw.project_name : null,
		databases: databases.map((entry, index) => parseDatabase(entry, index, missing)),
		raw,
	};
}

function parseDatabase(entry: unknown, index: number, missing: string[]): ConfiguredDatabase {
	const record = (entry ?? {}) as Record<string, unknown>;
	const name = typeof record.name === 'string' ? record.name : `database-${index + 1}`;
	const type = String(record.type ?? 'unknown').toLowerCase();
	if (type !== 'postgres') {
		return { supported: false, name, type };
	}
	const parsed = postgresDatabaseConfigSchema.safeParse(record);
	if (!parsed.success) {
		const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
		const hint = missing.length > 0 ? ` (unset environment variables: ${missing.join(', ')})` : '';
		throw new ProjectConfigError(`Invalid database '${name}' in ${PROJECT_CONFIG_FILE}: ${fields}${hint}`);
	}
	return { supported: true, name, type, config: parsed.data };
}

/** `secrets.process_secrets` for `env()`; a missing variable becomes an empty string and is reported. */
export function processSecrets(
	content: string,
	extraEnv: Record<string, string> = {},
): { rendered: string; missing: string[] } {
	const missing: string[] = [];
	const rendered = content.replace(TEMPLATE_REGEX, (_match, protocol: string, identifier: string) => {
		if (protocol !== 'env') {
			throw new ProjectConfigError(`${protocol}() secrets are not supported in ${PROJECT_CONFIG_FILE}`);
		}
		const value = identifier in extraEnv ? extraEnv[identifier] : process.env[identifier];
		if (!value) {
			missing.push(identifier);
			return '';
		}
		return value;
	});
	return { rendered, missing };
}

export interface ResolvedDatabase {
	config: DatabaseConfig;
	databaseFolder: string;
}

/** Port of `fastapi/main.py` `_resolve_database`: pick the connection a query runs on. */
export function resolveDatabase(projectConfig: ProjectConfig, databaseId?: string | null): ResolvedDatabase {
	const databases = projectConfig.databases;
	if (databases.length === 0) {
		throw new ProjectConfigError(`No databases configured in ${PROJECT_CONFIG_FILE}`);
	}
	const names = databases.map((db) => db.name);
	const duplicates = [...new Set(names.filter((name, index) => names.indexOf(name) !== index))].sort();
	if (duplicates.length > 0) {
		throw new ProjectConfigError(
			`Database connection names must be unique. Duplicate name(s): ${duplicates.join(', ')}`,
		);
	}

	let selectedIndex: number;
	if (databases.length === 1) {
		selectedIndex = 0;
	} else if (databaseId) {
		selectedIndex = databases.findIndex((db) => db.name === databaseId);
		if (selectedIndex === -1) {
			throw new ProjectConfigError(
				`Database '${databaseId}' not found. Available databases: ${names.join(', ')}`,
			);
		}
	} else {
		throw new ProjectConfigError(
			`Multiple databases configured. Please specify database_id. Available databases: ${names.join(', ')}`,
		);
	}

	const selected = databases[selectedIndex];
	if (!selected.supported) {
		throw new ProjectConfigError(
			`Database '${selected.name}' has type '${selected.type}', which quarry does not support yet (PostgreSQL only).`,
		);
	}
	const supported = databases.flatMap((db) => (db.supported ? [db.config] : []));
	const folders = getDatabaseFolderNames(supported);
	return { config: selected.config, databaseFolder: folders[supported.indexOf(selected.config)] };
}
