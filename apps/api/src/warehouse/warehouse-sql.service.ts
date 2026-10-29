import { Injectable } from '@nestjs/common';
import type { WarehouseRowSecurity } from '@quarry/shared';

import { SqlEngineService, WarehouseSqlError } from '../sql-engine/sql-engine.service.js';
import type { ExecuteLimits } from '../sql-engine/warehouse-driver.js';

/** Upstream `WarehouseTableAccess` (`services/context-access.ts`). */
export type WarehouseTableAccess =
	| { enforced: false }
	| {
			enforced: true;
			strict: boolean;
			tables: { databaseType: string; database: string; schema: string; table: string }[];
	  };

export interface WarehouseSqlOptions {
	projectFolder: string;
	databaseId?: string;
	envVars?: Record<string, string>;
	azureAccessToken?: string | null;
	enforceExcludedColumns: boolean;
	tableAccess: WarehouseTableAccess;
	rowSecurity: WarehouseRowSecurity;
	limits?: ExecuteLimits;
	/** Bind values for `$1…$n` in the SQL (saved query tools). */
	params?: readonly unknown[];
}

export interface WarehouseSqlResult {
	data: Record<string, unknown>[];
	row_count: number;
	columns: string[];
	dialect?: string;
}

export { WarehouseSqlError };

/**
 * Port of upstream `services/warehouse-sql.service.ts`. Upstream posted to the Python service
 * (`/execute_sql`, `/validate_sql`); quarry runs the Node SQL engine in-process. Errors keep the same
 * "Warehouse SQL request denied: …" message the agent and the UI already handle.
 */
@Injectable()
export class WarehouseSqlService {
	constructor(private readonly sqlEngine: SqlEngineService) {}

	async executeWarehouseSql(sql: string, options: WarehouseSqlOptions): Promise<WarehouseSqlResult> {
		const result = await this.request(() =>
			this.sqlEngine.executeSql({
				sql,
				projectFolder: options.projectFolder,
				databaseId: options.databaseId,
				envVars: options.envVars,
				enforceExcludedColumns: options.enforceExcludedColumns,
				tableAccess: options.tableAccess,
				rowSecurity: options.rowSecurity,
				limits: options.limits,
				params: options.params,
			}),
		);
		return { data: result.data, row_count: result.row_count, columns: result.columns, dialect: result.dialect };
	}

	async validateWarehouseSql(sql: string, options: WarehouseSqlOptions): Promise<void> {
		await this.request(() =>
			this.sqlEngine.validateSql({
				sql,
				projectFolder: options.projectFolder,
				databaseId: options.databaseId,
				envVars: options.envVars,
				enforceExcludedColumns: options.enforceExcludedColumns,
				tableAccess: options.tableAccess,
				rowSecurity: options.rowSecurity,
			}),
		);
	}

	async validateWarehouseRowPredicate(
		predicate: string,
		constraintColumns: string[],
		databaseType: string,
	): Promise<string> {
		try {
			return await this.sqlEngine.validateRowPredicate(predicate, constraintColumns, databaseType);
		} catch (error) {
			if (error instanceof WarehouseSqlError) {
				throw new WarehouseSqlError(error.status, `Warehouse row predicate denied: ${error.message}`);
			}
			throw error;
		}
	}

	private async request<T>(operation: () => Promise<T>): Promise<T> {
		try {
			return await operation();
		} catch (error) {
			if (error instanceof WarehouseSqlError) {
				throw new WarehouseSqlError(error.status, `Warehouse SQL request denied: ${error.message}`);
			}
			throw error;
		}
	}
}
