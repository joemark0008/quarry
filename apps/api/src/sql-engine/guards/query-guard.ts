import type { BlockedFactory, TableRef } from './pg-ast.js';

/**
 * Port of `nao_core/config/databases/query_guard.py` (table resolution against the live schema).
 *
 * Postgres folds unquoted identifiers to lower case and keeps quoted ones as written; the parser has already
 * applied that rule, so a requested name matches a live schema or table only when it is equal to it.
 */

export type TableIdentity = readonly [schema: string, table: string];

/** What the guards need from a warehouse connection: the database name and its live schemas and tables. */
export interface GuardConnection {
	readonly type: string;
	getDatabaseName(): string;
	listSchemas(): Promise<string[]>;
	listTables(schema: string): Promise<string[]>;
}

export const SUPPORTED_GUARD_DIALECTS = new Set(['postgres']);

export async function loadSchemas(conn: GuardConnection, blocked: BlockedFactory): Promise<string[]> {
	try {
		return (await conn.listSchemas()).map(String);
	} catch (error) {
		throw blocked(`live schemas could not be listed: ${error instanceof Error ? error.message : String(error)}`);
	}
}

export async function resolveTable(
	table: TableRef,
	conn: GuardConnection,
	schemas: string[],
	tablesBySchema: Map<string, string[]>,
	blocked: BlockedFactory,
): Promise<TableIdentity> {
	if (!table.name) {
		throw blocked('a dynamic table reference could not be resolved');
	}

	if (table.catalog) {
		const databaseName = conn.getDatabaseName();
		if (!catalogMatchesConnection(table.catalog, databaseName, schemas)) {
			throw blocked(`catalog '${table.catalog}' does not match the connected database '${databaseName}'`);
		}
	}

	if (table.schema) {
		let schema: string;
		if (table.catalog) {
			const combined = `${table.catalog}.${table.schema}`;
			schema =
				matchSqlIdentifier(combined, schemas) ??
				(schemas.some((available) => available.includes('.'))
					? null
					: matchSqlIdentifier(table.schema, schemas)) ??
				combined;
		} else {
			schema = matchSchemaIdentifier(table.schema, schemas) ?? table.schema;
		}
		const resolved = await findTable(conn, schema, table.name, tablesBySchema, blocked);
		if (resolved === null) {
			throw blocked(`table ${schema}.${table.name} was not found in the live schema`);
		}
		return [schema, resolved];
	}

	const matches: TableIdentity[] = [];
	for (const schema of schemas) {
		const resolved = await findTable(conn, schema, table.name, tablesBySchema, blocked);
		if (resolved !== null) {
			matches.push([schema, resolved]);
		}
	}
	if (matches.length === 1) {
		return matches[0];
	}
	if (matches.length === 0) {
		throw blocked(`unqualified table ${table.name} was not found in the live schema`);
	}
	const matchedNames = matches.map(([schema, name]) => `${schema}.${name}`).join(', ');
	throw blocked(`unqualified table ${table.name} is ambiguous across: ${matchedNames}`);
}

/** Exact match first, then a unique case-insensitive one (`query_guard.match_identifier`). */
export function matchIdentifier(requested: string, available: string[]): string | null {
	if (available.includes(requested)) {
		return requested;
	}
	const folded = requested.toLowerCase();
	const matches = available.filter((value) => value.toLowerCase() === folded);
	return matches.length === 1 ? matches[0] : null;
}

/** `query_guard.match_sql_identifier` for Postgres: the parsed (already folded) name must be equal. */
export function matchSqlIdentifier(requested: string, available: string[]): string | null {
	return available.includes(requested) ? requested : null;
}

/** Also matches the last part of a `catalog.schema` live schema (`query_guard.match_schema_identifier`). */
export function matchSchemaIdentifier(requested: string, available: string[]): string | null {
	const matched = matchSqlIdentifier(requested, available);
	if (matched) {
		return matched;
	}
	const matches = available.filter((value) => value.slice(value.lastIndexOf('.') + 1) === requested);
	return matches.length === 1 ? matches[0] : null;
}

export function tableKey([schema, table]: TableIdentity): string {
	return JSON.stringify([schema, table]);
}

export function displayTable([schema, table]: TableIdentity): string {
	return `${schema}.${table}`;
}

async function findTable(
	conn: GuardConnection,
	schema: string,
	requestedTable: string,
	tablesBySchema: Map<string, string[]>,
	blocked: BlockedFactory,
): Promise<string | null> {
	if (!tablesBySchema.has(schema)) {
		try {
			tablesBySchema.set(schema, (await conn.listTables(schema)).map(String));
		} catch (error) {
			throw blocked(
				`tables could not be listed for schema ${schema}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	return matchSqlIdentifier(requestedTable, tablesBySchema.get(schema) ?? []);
}

function catalogMatchesConnection(requestedCatalog: string, databaseName: string, schemas: string[]): boolean {
	const parts = databaseName.split('.');
	const databaseCandidates = parts.map((_, index) => parts.slice(0, index + 1).join('.'));
	const schemaCatalogs = schemas
		.filter((schema) => schema.includes('.'))
		.map((schema) => schema.slice(0, schema.lastIndexOf('.')));
	return (
		matchSqlIdentifier(requestedCatalog, databaseCandidates) !== null ||
		matchSqlIdentifier(requestedCatalog, schemaCatalogs) !== null
	);
}
