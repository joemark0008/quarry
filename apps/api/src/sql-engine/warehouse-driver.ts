import type { DatabaseConfig } from './database-config.js';
import type { GuardConnection } from './guards/query-guard.js';

/**
 * One adapter per warehouse type (PLAN.md §6, `sql-engine`). Replaces the Ibis connections the Python service
 * opened from `upstream_core/config/databases/*`. quarry ships the Postgres driver; others are added the same way.
 */
export interface WarehouseDriver extends GuardConnection {
	readonly config: DatabaseConfig;
	testConnection(): Promise<ConnectionCheck>;
	listSchemas(): Promise<string[]>;
	listTables(schema: string): Promise<string[]>;
	describeTable(schema: string, table: string): Promise<TableDescription>;
	countRows(schema: string, table: string): Promise<number>;
	previewRows(schema: string, table: string, limit: number): Promise<Record<string, unknown>[]>;
	/** `params` are bind values for `$1…$n` in `sql` (saved query tools). */
	execute(sql: string, limits?: ExecuteLimits, params?: readonly unknown[]): Promise<QueryResult>;
	close(): Promise<void>;
}

export interface ConnectionCheck {
	success: boolean;
	message: string;
}

export interface ColumnDescription {
	name: string;
	/** Ibis-style type name (`int32`, `string`, `decimal(10, 2)`, `… NOT NULL`), as upstream's sync wrote it. */
	type: string;
	nullable: boolean;
	description: string | null;
}

export interface TableDescription {
	description: string | null;
	columns: ColumnDescription[];
}

export interface ExecuteLimits {
	/** Rows returned at most; the rest are dropped and `truncated` is set. */
	maxRows?: number;
	/** Statement timeout in milliseconds. */
	timeoutMs?: number;
}

/** Same shape as the `/execute_sql` response of upstream's FastAPI service. */
export interface QueryResult {
	data: Record<string, unknown>[];
	row_count: number;
	columns: string[];
	dialect: string;
	truncated?: boolean;
}
