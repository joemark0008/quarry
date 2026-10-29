import { Injectable, OnModuleDestroy } from '@nestjs/common';

import type { DatabaseConfig } from './database-config.js';
import { PostgresDriver } from './drivers/postgres.driver.js';
import { AllowListedOnlyGuardError, enforceAllowListedOnly } from './guards/allow-listed-only.guard.js';
import { ColumnAccessError, validateColumnAccess } from './guards/column-access.guard.js';
import type { TableIdentity } from './guards/query-guard.js';
import { enforceReadOnly, ReadOnlyGuardError } from './guards/read-only.guard.js';
import {
	enforceRowSecurity,
	RowSecurityGuardError,
	type RowSecurityPolicies,
	rowSecurityPolicies,
	validateRowSecurityPredicate,
} from './guards/row-security.guard.js';
import { loadProjectConfig, ProjectConfigError, resolveDatabase } from './project-config.js';
import type { ExecuteLimits, QueryResult, WarehouseDriver } from './warehouse-driver.js';
import {
	inferWarehouseErrorFields,
	parseWarehouseCredentials,
	prepareWarehouseConfig,
	WarehouseCredentialsError,
	type WarehouseProvider,
} from './warehouse-provisioning.js';

/** Upstream `WarehouseTableAccess` (after `assertWarehouseTableAccess`), keyed by database type and folder. */
export type TableAccess =
	| { enforced: false }
	| {
			enforced: true;
			strict?: boolean;
			tables: { databaseType: string; database: string; schema: string; table: string }[];
	  };

export type RowSecurity =
	| { enforced: false }
	| {
			enforced: true;
			tables: ({
				databaseType: string;
				database: string;
				schema: string;
				table: string;
				constraintColumns: string[];
			} & (
				| { access: 'full' | 'none' }
				| { access: 'predicate'; predicate: string }
				| { access: 'blocked'; reason: string }
			))[];
	  };

export interface SqlRequest {
	sql: string;
	projectFolder: string;
	databaseId?: string | null;
	envVars?: Record<string, string>;
	enforceExcludedColumns?: boolean;
	tableAccess?: TableAccess;
	rowSecurity?: RowSecurity;
	limits?: ExecuteLimits;
}

/** Same role as upstream's `WarehouseSqlError`: carries the HTTP status FastAPI would have answered. */
export class WarehouseSqlError extends Error {
	override name = 'WarehouseSqlError';

	constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
	}
}

const GUARD_ERRORS = [ReadOnlyGuardError, AllowListedOnlyGuardError, ColumnAccessError, RowSecurityGuardError];

/**
 * Port of upstream's FastAPI service (`apps/backend/fastapi/main.py`): `/execute_sql`, `/validate_sql`,
 * `/validate_row_predicate`, `/warehouse/validate` and `/warehouse/prepare`, as in-process methods.
 */
@Injectable()
export class SqlEngineService implements OnModuleDestroy {
	private readonly drivers = new Map<string, WarehouseDriver>();

	async executeSql(request: SqlRequest): Promise<QueryResult> {
		return this.withErrors(async () => {
			const { driver, validatedSql } = await this.prepare(request);
			return driver.execute(validatedSql, request.limits);
		});
	}

	async validateSql(request: SqlRequest): Promise<{ valid: true; dialect: string }> {
		return this.withErrors(async () => {
			const { driver } = await this.prepare(request);
			return { valid: true as const, dialect: driver.type };
		});
	}

	async validateRowPredicate(predicate: string, constraintColumns: string[], databaseType: string): Promise<string> {
		try {
			return await validateRowSecurityPredicate(predicate, constraintColumns, databaseType.toLowerCase());
		} catch (error) {
			if (error instanceof RowSecurityGuardError) {
				throw new WarehouseSqlError(400, error.message);
			}
			throw error;
		}
	}

	/** `/warehouse/validate`: parse the credentials and list schemas on a throw-away connection. */
	async validateWarehouse(provider: string, credentials: Record<string, unknown>): Promise<{ valid: true }> {
		const config = parseWarehouseCredentials(provider, credentials);
		const driver = createDriver(config);
		try {
			await driver.listSchemas();
			return { valid: true };
		} catch (error) {
			throw new WarehouseCredentialsError(
				'warehouse_connection_failed',
				inferWarehouseErrorFields(provider as WarehouseProvider, error),
				error instanceof Error ? error.message : String(error),
			);
		} finally {
			await driver.close();
		}
	}

	/** `/warehouse/prepare`. */
	prepareWarehouse(provider: string, credentials: Record<string, unknown>, name?: string, envPrefix?: string) {
		return prepareWarehouseConfig(provider, credentials, name, envPrefix);
	}

	/** A pooled driver for a configured database (pools are reused across requests). */
	getDriver(config: DatabaseConfig): WarehouseDriver {
		const key = JSON.stringify(config);
		let driver = this.drivers.get(key);
		if (!driver) {
			driver = createDriver(config);
			this.drivers.set(key, driver);
		}
		return driver;
	}

	async onModuleDestroy(): Promise<void> {
		await Promise.all([...this.drivers.values()].map((driver) => driver.close()));
		this.drivers.clear();
	}

	/** Port of `_load_database` + `_validate_sql`: resolve the connection and run every guard in order. */
	private async prepare(request: SqlRequest): Promise<{ driver: WarehouseDriver; validatedSql: string }> {
		await enforceReadOnly(request.sql);

		const projectConfig = await loadProjectConfig(request.projectFolder, request.envVars ?? {});
		if (!projectConfig) {
			throw new ProjectConfigError(`No quarry_config.yaml found in the project folder`);
		}
		const { config, databaseFolder } = resolveDatabase(projectConfig, request.databaseId);
		const driver = this.getDriver(config);

		const groupAllowedTables = activeGroupAllowedTables(request.tableAccess, config, databaseFolder);
		const policies = activeRowSecurityPolicies(request.rowSecurity, config, databaseFolder);

		let sql = await enforceAllowListedOnly(
			request.sql,
			config,
			request.projectFolder,
			() => driver,
			groupAllowedTables,
			databaseFolder,
		);
		if (request.enforceExcludedColumns ?? true) {
			sql = await validateColumnAccess(sql, config, request.projectFolder, databaseFolder);
		}
		sql = await enforceRowSecurity(sql, config, policies, () => driver);
		return { driver, validatedSql: sql };
	}

	private async withErrors<T>(operation: () => Promise<T>): Promise<T> {
		try {
			return await operation();
		} catch (error) {
			if (error instanceof WarehouseSqlError) {
				throw error;
			}
			if (GUARD_ERRORS.some((type) => error instanceof type) || error instanceof ProjectConfigError) {
				throw new WarehouseSqlError(400, (error as Error).message);
			}
			throw new WarehouseSqlError(500, error instanceof Error ? error.message : String(error));
		}
	}
}

export function createDriver(config: DatabaseConfig): WarehouseDriver {
	switch (config.type) {
		case 'postgres':
			return new PostgresDriver(config);
	}
}

/** Port of `_active_group_allowed_tables`. */
function activeGroupAllowedTables(
	access: TableAccess | undefined,
	config: DatabaseConfig,
	databaseFolder: string,
): TableIdentity[] | null {
	if (!access?.enforced || access.strict === false) {
		return null;
	}
	const folderName = databaseFolder.replace(/^database=/, '');
	return access.tables
		.filter((entry) => entry.databaseType.toLowerCase() === config.type && entry.database === folderName)
		.map((entry) => [entry.schema, entry.table] as const);
}

/** Port of `_active_row_security_policies`. */
function activeRowSecurityPolicies(
	rowSecurity: RowSecurity | undefined,
	config: DatabaseConfig,
	databaseFolder: string,
): RowSecurityPolicies | null {
	if (!rowSecurity?.enforced) {
		return null;
	}
	const folderName = databaseFolder.replace(/^database=/, '');
	const seen = new Set<string>();
	const entries: Parameters<typeof rowSecurityPolicies>[0] = [];
	for (const entry of rowSecurity.tables) {
		if (entry.databaseType.toLowerCase() !== config.type || entry.database !== folderName) {
			continue;
		}
		const key = JSON.stringify([entry.schema, entry.table]);
		if (seen.has(key)) {
			throw new WarehouseSqlError(400, `Duplicate row security policy for ${entry.schema}.${entry.table}.`);
		}
		seen.add(key);
		const identity = [entry.schema, entry.table] as const;
		if (entry.access === 'blocked') {
			entries.push([
				identity,
				{ access: 'blocked', constraint_columns: entry.constraintColumns, reason: entry.reason },
			]);
		} else {
			entries.push([
				identity,
				{
					access: entry.access,
					constraint_columns: entry.constraintColumns,
					predicate: entry.access === 'predicate' ? entry.predicate : null,
				},
			]);
		}
	}
	return rowSecurityPolicies(entries);
}
