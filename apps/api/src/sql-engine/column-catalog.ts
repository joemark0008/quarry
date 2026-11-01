import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** Port of `upstream_core/config/databases/column_catalog.py`: the `columns.json` written by sync, read by guards. */

export const COLUMN_CATALOG_VERSION = 1;

export interface CatalogColumn {
	name: string;
	type: string;
}
export type CatalogTables = Record<string, CatalogColumn[]>;
export type CatalogSchemas = Record<string, CatalogTables>;

export function columnCatalogPath(projectPath: string, databaseType: string, databaseFolder: string): string {
	return path.join(projectPath, '.meta', 'databases', `type=${databaseType}`, databaseFolder, 'columns.json');
}

export async function loadColumnCatalog(filePath: string): Promise<CatalogSchemas> {
	let document: unknown;
	try {
		document = JSON.parse(await readFile(filePath, 'utf8'));
	} catch {
		return {};
	}
	if (!isRecord(document) || document.version !== COLUMN_CATALOG_VERSION) {
		return {};
	}
	return parseSchemas(document.schemas);
}

export async function writeColumnCatalog(filePath: string, schemas: CatalogSchemas): Promise<void> {
	await mkdir(path.dirname(filePath), { recursive: true });
	const temporaryPath = `${filePath}.tmp`;
	await writeFile(temporaryPath, `${JSON.stringify({ version: COLUMN_CATALOG_VERSION, schemas }, null, 2)}\n`);
	await rename(temporaryPath, filePath);
}

export function mergeColumnCatalog(
	existing: CatalogSchemas,
	synced: CatalogSchemas,
	partial: boolean,
	preservedSchemas: string[] = [],
	preservedTables: [string, string][] = [],
): CatalogSchemas {
	let retained: CatalogSchemas = existing;
	if (!partial) {
		retained = {};
		const preservedTableKeys = new Set(preservedTables.map(([schema, table]) => `${schema}\u0000${table}`));
		for (const [schema, tables] of Object.entries(existing)) {
			if (preservedSchemas.includes(schema)) {
				retained[schema] = tables;
				continue;
			}
			const preserved = Object.fromEntries(
				Object.entries(tables).filter(([table]) => preservedTableKeys.has(`${schema}\u0000${table}`)),
			);
			if (Object.keys(preserved).length > 0) {
				retained[schema] = preserved;
			}
		}
	}
	const merged: CatalogSchemas = {};
	for (const [schema, tables] of Object.entries(retained)) {
		merged[schema] = Object.fromEntries(Object.entries(tables).map(([table, columns]) => [table, [...columns]]));
	}
	for (const [schema, tables] of Object.entries(synced)) {
		merged[schema] = { ...(merged[schema] ?? {}), ...tables };
	}
	return merged;
}

export function catalogColumns(columns: { name?: unknown; type?: unknown }[]): CatalogColumn[] {
	return columns
		.filter((column) => column.name != null && column.type != null)
		.map((column) => ({ name: String(column.name), type: String(column.type) }));
}

function parseSchemas(value: unknown): CatalogSchemas {
	if (!isRecord(value)) {
		return {};
	}
	const schemas: CatalogSchemas = {};
	for (const [schema, tables] of Object.entries(value)) {
		if (!isRecord(tables)) {
			continue;
		}
		const parsedTables: CatalogTables = {};
		for (const [table, columns] of Object.entries(tables)) {
			if (!Array.isArray(columns)) {
				continue;
			}
			parsedTables[table] = columns
				.filter(
					(column): column is CatalogColumn =>
						isRecord(column) && typeof column.name === 'string' && typeof column.type === 'string',
				)
				.map((column) => ({ name: column.name, type: column.type }));
		}
		schemas[schema] = parsedTables;
	}
	return schemas;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
