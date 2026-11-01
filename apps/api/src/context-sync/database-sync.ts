import { access, readdir, rm, writeFile } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import {
	catalogColumns,
	type CatalogSchemas,
	columnCatalogPath,
	loadColumnCatalog,
	mergeColumnCatalog,
	writeColumnCatalog,
} from '../sql-engine/column-catalog.js';
import {
	columnMatchesPattern,
	type DatabaseConfig,
	fnmatch,
	getDatabaseFolderNames,
	matchesPattern,
} from '../sql-engine/database-config.js';
import type { ColumnDescription, WarehouseDriver } from '../sql-engine/warehouse-driver.js';
import {
	ANNOTATIONS_FILE_CONTENT,
	capPreviewValue,
	failedRenderPlaceholder,
	renderColumnsTemplate,
	renderPreviewTemplate,
	withGeneratedMarker,
} from './database-templates.js';

/**
 * Port of `upstream_core/commands/sync/providers/databases/provider.py` (`sync_database`) and `sync/cleanup.py`:
 * for every table of a connection, write `databases/type=…/database=…/schema=…/table=…/{columns,preview}.md`,
 * keep the user's `annotations.md`, remove tables that no longer exist and refresh the column catalog.
 */

export const PREVIEW_ROWS = 10;

export interface DatabaseSyncState {
	databaseName: string;
	schemasSynced: number;
	tablesSynced: number;
	renderErrors: number;
	removedPaths: number;
}

export type SyncLogger = (message: string) => void;

export async function syncDatabase(
	driver: WarehouseDriver,
	config: DatabaseConfig,
	projectPath: string,
	databaseFolder: string,
	options: { select?: string[]; log?: SyncLogger } = {},
): Promise<DatabaseSyncState> {
	const log = options.log ?? (() => undefined);
	const select = options.select ?? [];
	const dbPath = path.join(projectPath, 'databases', `type=${config.type}`, databaseFolder);
	const templates = config.templates.filter((template) => template === 'columns' || template === 'preview');

	const schemas = await driver.listSchemas();
	log(`${config.name}: found ${schemas.length} schemas`);

	const syncedTables = new Map<string, Set<string>>();
	const syncedColumns: CatalogSchemas = {};
	const failedSchemas = new Set<string>();
	const failedTables: [string, string][] = [];
	let renderErrors = 0;
	let tablesSynced = 0;

	for (const schema of schemas) {
		let allTables: string[];
		try {
			allTables = await driver.listTables(schema);
		} catch (error) {
			log(`Skipping schema ${schema}: ${errorMessage(error)}`);
			failedSchemas.add(schema);
			continue;
		}
		const tables = allTables.filter(
			(table) =>
				matchesPattern(config, schema, table) &&
				(select.length === 0 || matchesSelection(schema, table, select)),
		);
		if (tables.length === 0) {
			continue;
		}
		log(`${schema}: ${tables.length} tables (of ${allTables.length})`);
		const schemaPath = path.join(dbPath, `schema=${schema}`);
		syncedTables.set(schema, new Set());

		for (const table of tables) {
			const tablePath = path.join(schemaPath, `table=${table}`);
			await mkdir(tablePath, { recursive: true });
			await ensureAnnotationsFile(tablePath);

			let columns: ColumnDescription[] | null = null;
			let description: string | null = null;
			try {
				const described = await driver.describeTable(schema, table);
				columns = described.columns.filter((column) =>
					columnMatchesPattern(config, schema, table, column.name),
				);
				description = described.description;
			} catch (error) {
				log(`${schema}.${table}: columns could not be read: ${errorMessage(error)}`);
			}

			for (const template of templates) {
				const outputFile = path.join(tablePath, `${template}.md`);
				try {
					const content =
						template === 'columns'
							? renderColumnsTemplate({
									tableName: table,
									dataset: schema,
									description,
									rowCount: await driver.countRows(schema, table),
									columns: requireColumns(columns),
								})
							: renderPreviewTemplate({
									tableName: table,
									dataset: schema,
									rows: await previewRows(driver, config, schema, table),
								});
					await writeFile(outputFile, withGeneratedMarker(content));
				} catch (error) {
					renderErrors += 1;
					log(`${schema}.${table} ${template} failed: ${errorMessage(error)}`);
					if (!(await exists(outputFile))) {
						await writeFile(
							outputFile,
							withGeneratedMarker(failedRenderPlaceholder(table, template, error)),
						);
					}
				}
			}

			syncedTables.get(schema)?.add(table);
			tablesSynced += 1;
			if (columns) {
				syncedColumns[schema] ??= {};
				syncedColumns[schema][table] = catalogColumns(columns);
			} else {
				failedTables.push([schema, table]);
			}
		}
	}

	const removedPaths = select.length === 0 ? await cleanupStalePaths(dbPath, syncedTables, failedSchemas) : 0;
	const catalogPath = columnCatalogPath(projectPath, config.type, databaseFolder);
	const existing = await loadColumnCatalog(catalogPath);
	await writeColumnCatalog(
		catalogPath,
		mergeColumnCatalog(existing, syncedColumns, select.length > 0, [...failedSchemas], failedTables),
	);

	return {
		databaseName: config.name,
		schemasSynced: syncedTables.size,
		tablesSynced,
		renderErrors,
		removedPaths,
	};
}

/** `cleanup_stale_databases`: drop `database=` folders of connections no longer configured. */
export async function cleanupStaleDatabases(projectPath: string, databases: DatabaseConfig[]): Promise<void> {
	const basePath = path.join(projectPath, 'databases');
	const folders = getDatabaseFolderNames(databases);
	const valid = new Map<string, Set<string>>();
	databases.forEach((db, index) => {
		const typeFolder = `type=${db.type}`;
		valid.set(typeFolder, (valid.get(typeFolder) ?? new Set()).add(folders[index]));
	});
	for (const typeFolder of await listDirectories(basePath)) {
		if (!typeFolder.startsWith('type=')) {
			continue;
		}
		const validFolders = valid.get(typeFolder);
		if (!validFolders) {
			// Other warehouse types (e.g. an upstream DuckDB example) are not managed by quarry's sync.
			continue;
		}
		for (const databaseFolder of await listDirectories(path.join(basePath, typeFolder))) {
			if (databaseFolder.startsWith('database=') && !validFolders.has(databaseFolder)) {
				await rm(path.join(basePath, typeFolder, databaseFolder), { recursive: true, force: true });
			}
		}
	}
}

/** `_matches_selection`: `schema` selects a whole schema, `schema.table` one table; globs, case-insensitive. */
export function matchesSelection(schema: string, table: string, select: string[]): boolean {
	const fullName = `${schema}.${table}`.toLowerCase();
	return select.some((pattern) => {
		const lowered = pattern.toLowerCase();
		return fnmatch(fullName, lowered) || fnmatch(fullName, `${lowered}.*`);
	});
}

async function previewRows(
	driver: WarehouseDriver,
	config: DatabaseConfig,
	schema: string,
	table: string,
): Promise<Record<string, unknown>[]> {
	const rows = await driver.previewRows(schema, table, PREVIEW_ROWS);
	return rows.map((row) =>
		Object.fromEntries(
			Object.entries(row)
				.filter(([column]) => columnMatchesPattern(config, schema, table, column))
				.map(([column, value]) => [column, capPreviewValue(value, config.preview_max_value_length)]),
		),
	);
}

async function cleanupStalePaths(
	dbPath: string,
	syncedTables: Map<string, Set<string>>,
	failedSchemas: Set<string>,
): Promise<number> {
	let removed = 0;
	for (const schemaFolder of await listDirectories(dbPath)) {
		if (!schemaFolder.startsWith('schema=')) {
			continue;
		}
		const schema = schemaFolder.slice('schema='.length);
		const schemaPath = path.join(dbPath, schemaFolder);
		const synced = syncedTables.get(schema);
		if (!synced) {
			if (!failedSchemas.has(schema)) {
				await rm(schemaPath, { recursive: true, force: true });
				removed += 1;
			}
			continue;
		}
		for (const tableFolder of await listDirectories(schemaPath)) {
			if (tableFolder.startsWith('table=') && !synced.has(tableFolder.slice('table='.length))) {
				await rm(path.join(schemaPath, tableFolder), { recursive: true, force: true });
				removed += 1;
			}
		}
	}
	return removed;
}

async function ensureAnnotationsFile(tablePath: string): Promise<void> {
	const file = path.join(tablePath, 'annotations.md');
	if (!(await exists(file))) {
		await writeFile(file, ANNOTATIONS_FILE_CONTENT);
	}
}

function requireColumns(columns: ColumnDescription[] | null): ColumnDescription[] {
	if (!columns) {
		throw new Error('columns could not be read');
	}
	return columns;
}

async function listDirectories(directory: string): Promise<string[]> {
	try {
		const entries = await readdir(directory, { withFileTypes: true });
		return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
	} catch {
		return [];
	}
}

async function exists(file: string): Promise<boolean> {
	try {
		await access(file);
		return true;
	} catch {
		return false;
	}
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
