import { z } from 'zod';

/**
 * Port of the database entries of `nao_config.yaml` (`nao_core/config/databases/base.py` + `postgres.py`).
 * quarry supports Postgres only; other types are rejected when the config is loaded.
 */

export const DEFAULT_PREVIEW_MAX_VALUE_LENGTH = 1000;
export const MIN_PREVIEW_MAX_VALUE_LENGTH = 100;
export const DEFAULT_DATABASE_TEMPLATES = ['columns', 'preview'] as const;

const databaseTemplateSchema = z.enum(['columns', 'preview', 'profiling', 'ai_summary', 'query_history']);

export const postgresDatabaseConfigSchema = z.object({
	type: z.literal('postgres'),
	name: z.string().min(1),
	host: z.string().min(1),
	port: z.coerce.number().int().positive().default(5432),
	database: z.string().min(1),
	user: z.string().min(1),
	password: z.string().default(''),
	schema_name: z.string().nullish(),
	ssl: z.boolean().optional(),
	include: z
		.array(z.string())
		.nullish()
		.transform((value) => value ?? []),
	exclude: z
		.array(z.string())
		.nullish()
		.transform((value) => value ?? []),
	allow_listed_only: z.boolean().default(false),
	exclude_columns: z
		.array(z.string())
		.nullish()
		.transform((value) => value ?? []),
	preview_max_value_length: z
		.number()
		.int()
		.min(0)
		.default(DEFAULT_PREVIEW_MAX_VALUE_LENGTH)
		.refine((value) => value === 0 || value >= MIN_PREVIEW_MAX_VALUE_LENGTH, {
			message: `must be 0 (no cap) or at least ${MIN_PREVIEW_MAX_VALUE_LENGTH}`,
		}),
	templates: z
		.array(databaseTemplateSchema)
		.nullish()
		.transform((value) => (value && value.length > 0 ? value : [...DEFAULT_DATABASE_TEMPLATES])),
});

export type PostgresDatabaseConfig = z.infer<typeof postgresDatabaseConfigSchema>;
export type DatabaseConfig = PostgresDatabaseConfig;

export function getDatabaseName(config: DatabaseConfig): string {
	return config.database;
}

/** `DatabaseConfig.matches_pattern`: include/exclude globs on `schema.table`. */
export function matchesPattern(config: Pick<DatabaseConfig, 'include' | 'exclude'>, schema: string, table: string) {
	const fullName = `${schema}.${table}`;
	if (config.include.length > 0 && !config.include.some((pattern) => fnmatch(fullName, pattern))) {
		return false;
	}
	if (config.exclude.length > 0 && config.exclude.some((pattern) => fnmatch(fullName, pattern))) {
		return false;
	}
	return true;
}

/** `DatabaseConfig.column_matches_pattern`: false when `schema.table.column` matches an `exclude_columns` glob. */
export function columnMatchesPattern(
	config: Pick<DatabaseConfig, 'exclude_columns'>,
	schema: string,
	table: string,
	column: string,
): boolean {
	if (config.exclude_columns.length === 0) {
		return true;
	}
	const fullName = `${schema}.${table}.${column}`;
	return !config.exclude_columns.some((pattern) => fnmatch(fullName, pattern));
}

/**
 * Port of `sync/cleanup.get_database_folder_names`: `database=<name>`, or `database=<config name>` when two
 * connections of the same type share a database name.
 */
export function getDatabaseFolderNames(databases: { type: string; name: string; database: string }[]): string[] {
	const counts = new Map<string, number>();
	for (const db of databases) {
		const key = `${db.type}\u0000${db.database.toLowerCase()}`;
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return databases.map((db) => {
		const key = `${db.type}\u0000${db.database.toLowerCase()}`;
		if ((counts.get(key) ?? 0) > 1) {
			return `database=${sanitizeFolderPart(db.name)}`;
		}
		return `database=${db.database}`;
	});
}

export function sanitizeFolderPart(value: string): string {
	return (
		value
			.trim()
			.replace(/[^A-Za-z0-9._-]+/g, '_')
			.replace(/^_+|_+$/g, '') || 'connection'
	);
}

/** Python `fnmatch.fnmatch` (case-sensitive on POSIX): `*`, `?`, `[seq]`, `[!seq]`. */
export function fnmatch(name: string, pattern: string): boolean {
	return fnmatchRegExp(pattern).test(name);
}

function fnmatchRegExp(pattern: string): RegExp {
	let source = '';
	for (let index = 0; index < pattern.length; index++) {
		const char = pattern[index];
		if (char === '*') {
			source += '.*';
		} else if (char === '?') {
			source += '.';
		} else if (char === '[') {
			const end = pattern.indexOf(']', index + 2);
			if (end === -1) {
				source += '\\[';
				continue;
			}
			let body = pattern.slice(index + 1, end);
			if (body.startsWith('!')) {
				body = `^${body.slice(1)}`;
			}
			source += `[${body.replace(/\\/g, '\\\\')}]`;
			index = end;
		} else {
			source += char.replace(/[.+^${}()|\\/]/g, '\\$&');
		}
	}
	return new RegExp(`^${source}$`, 's');
}
