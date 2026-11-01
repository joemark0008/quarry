import { readdir } from 'node:fs/promises';
import path from 'node:path';

import { getDatabaseFolderNames } from '../database-config.js';
import {
	baseTables,
	type BlockedFactory,
	errorMessage,
	parseQuery,
	parseStatements,
	traverseScopes,
} from './pg-ast.js';
import {
	displayTable,
	type GuardConnection,
	loadSchemas,
	resolveTable,
	SUPPORTED_GUARD_DIALECTS,
	type TableIdentity,
	tableKey,
} from './query-guard.js';

/** Port of `upstream_core/config/databases/allow_listed_only_guard.py`. */

export class AllowListedOnlyGuardError extends Error {
	override name = 'AllowListedOnlyGuardError';
}

export interface AllowListedOnlyConfig {
	type: string;
	name: string;
	database: string;
	allow_listed_only: boolean;
}

export async function enforceAllowListedOnly(
	sql: string,
	dbConfig: AllowListedOnlyConfig,
	projectFolder: string,
	connect: () => Promise<GuardConnection> | GuardConnection,
	groupAllowedTables: TableIdentity[] | null = null,
	databaseFolder: string | null = null,
): Promise<string> {
	if (!dbConfig.allow_listed_only && groupAllowedTables === null) {
		return sql;
	}

	const blocked = dbConfig.allow_listed_only ? allowListBlocked : contextBlocked;
	try {
		if (!SUPPORTED_GUARD_DIALECTS.has(dbConfig.type)) {
			throw blocked(`the database dialect '${dbConfig.type}' is not supported`);
		}

		const statement = await parseQuery(sql, blocked);
		const tables = baseTables(traverseScopes(statement), statement, blocked);
		if (tables.length === 0) {
			return sql;
		}

		const conn = await connect();
		const schemas = await loadSchemas(conn, blocked);
		const tablesBySchema = new Map<string, string[]>();
		const referenced = new Map<string, TableIdentity>();
		for (const table of tables) {
			const identity = await resolveTable(table, conn, schemas, tablesBySchema, blocked);
			referenced.set(tableKey(identity), identity);
		}

		if (groupAllowedTables !== null) {
			const denied = findUnlistedTables([...referenced.values()], groupAllowedTables);
			if (denied.length > 0) {
				throw new AllowListedOnlyGuardError(contextAccessMessage(denied));
			}
		}

		if (dbConfig.allow_listed_only) {
			const allowed = await loadAllowedContextTables(projectFolder, dbConfig, databaseFolder);
			const unlisted = findUnlistedTables([...referenced.values()], allowed);
			if (unlisted.length > 0) {
				throw new AllowListedOnlyGuardError(unlistedMessage(unlisted, allowed));
			}
		}
		return sql;
	} catch (error) {
		if (error instanceof AllowListedOnlyGuardError) {
			throw error;
		}
		throw blocked(errorMessage(error));
	}
}

/** True when the query reads a table, or cannot be parsed (conservative). */
export async function queryReferencesBaseTables(sql: string, databaseType: string): Promise<boolean> {
	if (!SUPPORTED_GUARD_DIALECTS.has(databaseType)) {
		return true;
	}
	try {
		const statements = await parseStatements(sql);
		if (statements.length !== 1 || !statements[0]?.SelectStmt) {
			return true;
		}
		return baseTables(traverseScopes(statements[0]), statements[0], allowListBlocked).length > 0;
	} catch {
		return true;
	}
}

/** The `(schema, table)` pairs present as `schema=…/table=…` folders in the synced context. */
export async function loadAllowedContextTables(
	projectFolder: string,
	dbConfig: Pick<AllowListedOnlyConfig, 'type' | 'name' | 'database'>,
	databaseFolder: string | null = null,
): Promise<TableIdentity[]> {
	const folder = databaseFolder ?? getDatabaseFolderNames([dbConfig])[0];
	const databasePath = path.join(projectFolder, 'databases', `type=${dbConfig.type}`, folder);
	const allowed: TableIdentity[] = [];
	for (const schemaEntry of await readDirectories(databasePath)) {
		if (!schemaEntry.startsWith('schema=')) {
			continue;
		}
		const schema = schemaEntry.slice('schema='.length);
		for (const tableEntry of await readDirectories(path.join(databasePath, schemaEntry))) {
			if (tableEntry.startsWith('table=')) {
				allowed.push([schema, tableEntry.slice('table='.length)]);
			}
		}
	}
	return allowed;
}

async function readDirectories(directory: string): Promise<string[]> {
	try {
		const entries = await readdir(directory, { withFileTypes: true });
		return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
	} catch {
		return [];
	}
}

function findUnlistedTables(referenced: TableIdentity[], allowed: TableIdentity[]): TableIdentity[] {
	const allowedKeys = new Set(allowed.map(tableKey));
	return referenced
		.filter((identity) => !allowedKeys.has(tableKey(identity)))
		.sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])));
}

function unlistedMessage(unlisted: TableIdentity[], allowed: TableIdentity[]): string {
	const names = unlisted.map(displayTable).join(', ');
	const message =
		'Query blocked because allow_listed_only is enabled. ' +
		`Unlisted table(s): ${names}. Only synced context tables are allowed - ` +
		'list/read context to see them.';
	if (allowed.length === 0) {
		return `${message} No tables are currently present in synced context.`;
	}
	return message;
}

function contextAccessMessage(denied: TableIdentity[]): string {
	return `Query blocked by Context table permissions. Denied table(s): ${denied.map(displayTable).join(', ')}.`;
}

const allowListBlocked: BlockedFactory = (reason) =>
	new AllowListedOnlyGuardError(
		`Query blocked because allow_listed_only is enabled and the query could not be safely validated: ${reason}`,
	);

const contextBlocked: BlockedFactory = (reason) =>
	new AllowListedOnlyGuardError(
		`Query blocked because Context table permissions are enforced and the query could not be safely validated: ${reason}`,
	);
