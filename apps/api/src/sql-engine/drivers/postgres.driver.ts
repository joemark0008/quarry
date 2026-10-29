import pg from 'pg';

import type { PostgresDatabaseConfig } from '../database-config.js';
import { toJsonSafe } from '../value-serializer.js';
import type {
	ColumnDescription,
	ConnectionCheck,
	ExecuteLimits,
	QueryResult,
	TableDescription,
	WarehouseDriver,
} from '../warehouse-driver.js';

export const DEFAULT_STATEMENT_TIMEOUT_MS = 120_000;
const SYSTEM_SCHEMAS = new Set(['pg_catalog', 'information_schema']);

/** Values come back as text and are converted in `toJsonSafe`, like upstream's `_convert_value`. */
const RAW_TEXT_TYPES = [
	pg.types.builtins.INT8,
	pg.types.builtins.NUMERIC,
	pg.types.builtins.DATE,
	pg.types.builtins.TIMESTAMP,
	pg.types.builtins.TIMESTAMPTZ,
	pg.types.builtins.TIME,
	pg.types.builtins.TIMETZ,
	pg.types.builtins.INTERVAL,
];

const typeParsers = {
	getTypeParser(oid: number, format?: 'text' | 'binary') {
		if (RAW_TEXT_TYPES.includes(oid)) {
			return (value: string) => value;
		}
		return pg.types.getTypeParser(oid, format);
	},
};

/** Port of `PostgresConfig` + `PostgresDatabaseContext` on `pg` (one pool per connection config). */
export class PostgresDriver implements WarehouseDriver {
	readonly type = 'postgres';
	private readonly pool: pg.Pool;

	constructor(readonly config: PostgresDatabaseConfig) {
		this.pool = new pg.Pool({
			host: config.host,
			port: config.port,
			database: config.database,
			user: config.user,
			password: config.password,
			ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
			max: 5,
			idleTimeoutMillis: 30_000,
			connectionTimeoutMillis: 10_000,
			types: typeParsers,
			application_name: 'quarry',
		});
		// An idle client losing its connection must not crash the process.
		this.pool.on('error', () => undefined);
	}

	getDatabaseName(): string {
		return this.config.database;
	}

	async testConnection(): Promise<ConnectionCheck> {
		try {
			if (this.config.schema_name) {
				const tables = await this.listTables(this.config.schema_name);
				return { success: true, message: `Connected successfully (${tables.length} tables found)` };
			}
			const schemas = await this.listSchemas();
			return { success: true, message: `Connected successfully (${schemas.length} schemas found)` };
		} catch (error) {
			return { success: false, message: error instanceof Error ? error.message : String(error) };
		}
	}

	async listSchemas(): Promise<string[]> {
		if (this.config.schema_name) {
			return [this.config.schema_name];
		}
		const { rows } = await this.pool.query<{ nspname: string }>(
			'SELECT nspname FROM pg_catalog.pg_namespace ORDER BY nspname',
		);
		return rows
			.map((row) => row.nspname)
			.filter((schema) => !SYSTEM_SCHEMAS.has(schema) && !schema.startsWith('pg_'));
	}

	async listTables(schema: string): Promise<string[]> {
		const { rows } = await this.pool.query<{ relname: string }>(
			`SELECT c.relname
			FROM pg_catalog.pg_class c
			JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
			WHERE n.nspname = $1 AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
			ORDER BY c.relname`,
			[schema],
		);
		return rows.map((row) => row.relname);
	}

	async describeTable(schema: string, table: string): Promise<TableDescription> {
		const { rows } = await this.pool.query<{
			name: string;
			data_type: string;
			not_null: boolean;
			description: string | null;
		}>(
			`SELECT a.attname AS name,
				pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
				a.attnotnull AS not_null,
				pg_catalog.col_description(c.oid, a.attnum) AS description
			FROM pg_catalog.pg_attribute a
			JOIN pg_catalog.pg_class c ON c.oid = a.attrelid
			JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
			WHERE n.nspname = $1 AND c.relname = $2 AND a.attnum > 0 AND NOT a.attisdropped
			ORDER BY a.attnum`,
			[schema, table],
		);
		const description = await this.pool.query<{ description: string | null }>(
			`SELECT pg_catalog.obj_description(c.oid, 'pg_class') AS description
			FROM pg_catalog.pg_class c
			JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
			WHERE n.nspname = $1 AND c.relname = $2`,
			[schema, table],
		);
		const columns: ColumnDescription[] = rows.map((row) => ({
			name: row.name,
			type: ibisTypeName(row.data_type) + (row.not_null ? ' NOT NULL' : ''),
			nullable: !row.not_null,
			description: row.description?.trim() || null,
		}));
		return { description: description.rows[0]?.description?.trim() || null, columns };
	}

	async countRows(schema: string, table: string): Promise<number> {
		const { rows } = await this.pool.query<{ count: string }>(
			`SELECT count(*) AS count FROM ${quoteIdentifier(schema)}.${quoteIdentifier(table)}`,
		);
		return Number(rows[0]?.count ?? 0);
	}

	async previewRows(schema: string, table: string, limit: number): Promise<Record<string, unknown>[]> {
		const result = await this.execute(
			`SELECT * FROM ${quoteIdentifier(schema)}.${quoteIdentifier(table)} LIMIT ${Math.max(0, Math.floor(limit))}`,
		);
		return result.data;
	}

	/** Runs one query in a READ ONLY transaction with a statement timeout. */
	async execute(sql: string, limits: ExecuteLimits = {}): Promise<QueryResult> {
		const client = await this.pool.connect();
		try {
			await client.query('BEGIN READ ONLY');
			const timeout = Math.max(1, Math.floor(limits.timeoutMs ?? DEFAULT_STATEMENT_TIMEOUT_MS));
			await client.query(`SET LOCAL statement_timeout = ${timeout}`);
			const result = await client.query({ text: sql, rowMode: 'array' });
			await client.query('COMMIT');
			return toQueryResult(result, limits.maxRows);
		} catch (error) {
			await client.query('ROLLBACK').catch(() => undefined);
			throw error;
		} finally {
			client.release();
		}
	}

	async close(): Promise<void> {
		await this.pool.end();
	}
}

function toQueryResult(result: pg.QueryArrayResult, maxRows?: number): QueryResult {
	const columns = result.fields.map((field) => field.name);
	const rows = maxRows !== undefined && result.rows.length > maxRows ? result.rows.slice(0, maxRows) : result.rows;
	const data = rows.map((row) => {
		const record: Record<string, unknown> = {};
		columns.forEach((column, index) => {
			record[column] = toJsonSafe(row[index], result.fields[index].dataTypeID);
		});
		return record;
	});
	return {
		data,
		row_count: data.length,
		columns,
		dialect: 'postgres',
		...(rows.length < result.rows.length ? { truncated: true } : {}),
	};
}

export function quoteIdentifier(identifier: string): string {
	return `"${identifier.replace(/"/g, '""')}"`;
}

/** Postgres type → the Ibis type name upstream's sync printed in `columns.md`. */
export function ibisTypeName(postgresType: string): string {
	const type = postgresType.toLowerCase();
	const isArray = type.endsWith('[]');
	const base = isArray ? type.slice(0, -2) : type;
	const mapped = mapBaseType(base);
	return isArray ? `array<${mapped}>` : mapped;
}

function mapBaseType(type: string): string {
	const decimal = /^numeric(?:\((\d+),\s*(\d+)\))?$/.exec(type);
	if (decimal) {
		return decimal[1] ? `decimal(${decimal[1]}, ${decimal[2]})` : 'decimal';
	}
	if (type.startsWith('character varying') || type.startsWith('character(') || type === 'text') {
		return 'string';
	}
	if (type.startsWith('timestamp') && type.includes('with time zone')) {
		return "timestamp('UTC')";
	}
	if (type.startsWith('timestamp')) {
		return 'timestamp';
	}
	if (type.startsWith('time')) {
		return 'time';
	}
	const simple: Record<string, string> = {
		smallint: 'int16',
		integer: 'int32',
		bigint: 'int64',
		real: 'float32',
		'double precision': 'float64',
		boolean: 'boolean',
		date: 'date',
		uuid: 'uuid',
		json: 'json',
		jsonb: 'json',
		bytea: 'binary',
		interval: 'interval',
		inet: 'inet',
		macaddr: 'macaddr',
		character: 'string',
		name: 'string',
	};
	return simple[type] ?? type;
}
