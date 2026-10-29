import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { loadDotenv } from '../config/env.js';
import { fnmatch, getDatabaseFolderNames } from './database-config.js';
import { createContextTable } from './guards/guard-test-utils.js';
import { parseProjectConfig, ProjectConfigError, resolveDatabase } from './project-config.js';
import { SqlEngineService, WarehouseSqlError } from './sql-engine.service.js';
import { toJsonSafe } from './value-serializer.js';
import { prepareWarehouseConfig, WarehouseCredentialsError } from './warehouse-provisioning.js';

/**
 * The FastAPI endpoints (upstream `fastapi/test_main.py` covers them through the HTTP layer) run in-process
 * against the jaffle_shop `warehouse` database of the Docker Postgres (`WAREHOUSE_URL`).
 */

loadDotenv();
const warehouseUrl = new URL(process.env.WAREHOUSE_URL ?? 'postgresql://quarry:quarry@localhost:5434/warehouse');

function credentials() {
	return {
		host: warehouseUrl.hostname,
		port: Number(warehouseUrl.port || 5432),
		user: decodeURIComponent(warehouseUrl.username),
		password: decodeURIComponent(warehouseUrl.password),
		database: warehouseUrl.pathname.slice(1),
	};
}

describe('SqlEngineService', () => {
	const engine = new SqlEngineService();
	let projectFolder: string;
	let envVars: Record<string, string>;

	beforeAll(async () => {
		projectFolder = await mkdtemp(path.join(tmpdir(), 'quarry-engine-'));
		const prepared = prepareWarehouseConfig('postgres', credentials(), 'jaffle');
		envVars = prepared.envVars;
		const yaml = [
			'project_name: engine-test',
			'databases:',
			...Object.entries({
				...prepared.databaseConfig,
				allow_listed_only: true,
				exclude_columns: ['*.last_name'],
			}).map(
				([key, value], index) =>
					`${index === 0 ? '  - ' : '    '}${key}: ${Array.isArray(value) ? JSON.stringify(value) : value}`,
			),
		].join('\n');
		await writeFile(path.join(projectFolder, 'nao_config.yaml'), yaml);
		await createContextTable(projectFolder, 'public', 'customers', { databaseFolder: 'warehouse' });
		await createContextTable(projectFolder, 'public', 'orders', { databaseFolder: 'warehouse' });
	});

	afterAll(() => engine.onModuleDestroy());

	const request = (sql: string, extra: Record<string, unknown> = {}) => ({
		sql,
		projectFolder,
		envVars,
		...extra,
	});

	it('runs an allowed query and returns JSON-safe rows', async () => {
		const result = await engine.executeSql(
			request(
				'SELECT customer_id, first_name, first_order, number_of_orders, customer_lifetime_value FROM customers ORDER BY customer_id LIMIT 2',
			),
		);
		expect(result.columns).toEqual([
			'customer_id',
			'first_name',
			'first_order',
			'number_of_orders',
			'customer_lifetime_value',
		]);
		expect(result.row_count).toBe(2);
		expect(result.dialect).toBe('postgres');
		expect(result.data[0]).toEqual({
			customer_id: 1,
			first_name: 'Michael',
			first_order: '2018-01-01',
			number_of_orders: 2,
			customer_lifetime_value: 33,
		});
	});

	it('blocks write statements before they reach the warehouse', async () => {
		const error = await engine.executeSql(request('DELETE FROM customers')).catch((e) => e);
		expect(error).toBeInstanceOf(WarehouseSqlError);
		expect(error.status).toBe(400);
		expect(error.message).toContain('DELETE statements are not allowed');
	});

	it('blocks a table that is not in the synced context', async () => {
		const error = await engine.executeSql(request('SELECT * FROM raw_payments')).catch((e) => e);
		expect(error.status).toBe(400);
		expect(error.message).toContain('Unlisted table(s): public.raw_payments');
	});

	it('blocks an excluded column', async () => {
		const error = await engine.executeSql(request('SELECT last_name FROM customers')).catch((e) => e);
		expect(error.status).toBe(400);
		// No columns.json yet (sync writes it), so the schema is unknown, as upstream reports it.
		expect(error.message).toContain('excluded column(s): customers.last_name');
	});

	it('applies row security predicates', async () => {
		const result = await engine.executeSql(
			request('SELECT count(*) AS n FROM customers', {
				rowSecurity: {
					enforced: true,
					tables: [
						{
							databaseType: 'postgres',
							database: 'warehouse',
							schema: 'public',
							table: 'customers',
							constraintColumns: ['customer_id'],
							access: 'predicate',
							predicate: 'customer_id <= 10',
						},
					],
				},
			}),
		);
		expect(result.data).toEqual([{ n: 10 }]);
	});

	it('validates without executing', async () => {
		await expect(engine.validateSql(request('SELECT customer_id FROM customers'))).resolves.toEqual({
			valid: true,
			dialect: 'postgres',
		});
	});

	it('limits rows', async () => {
		const result = await engine.executeSql(
			request('SELECT customer_id FROM customers', { limits: { maxRows: 3 } }),
		);
		expect(result.row_count).toBe(3);
		expect(result.truncated).toBe(true);
	});

	it('validates warehouse credentials', async () => {
		await expect(engine.validateWarehouse('postgres', credentials())).resolves.toEqual({ valid: true });
		const error = await engine
			.validateWarehouse('postgres', { ...credentials(), password: 'wrong-password' })
			.catch((e) => e);
		expect(error).toBeInstanceOf(WarehouseCredentialsError);
		expect(error.code).toBe('warehouse_connection_failed');
		expect(error.fields).toEqual(['user', 'password']);
		const invalid = await engine.validateWarehouse('postgres', { host: 'x', token: 'y' }).catch((e) => e);
		expect(invalid.code).toBe('invalid_warehouse_credentials');
		expect(invalid.fields).toEqual(['token']);
	});

	it('normalizes row predicates', async () => {
		await expect(engine.validateRowPredicate('Tenant_ID = 7', ['tenant_id'], 'POSTGRES')).resolves.toBe(
			'tenant_id = 7',
		);
		await expect(engine.validateRowPredicate('lower(x) = 1', ['x'], 'postgres')).rejects.toThrow(WarehouseSqlError);
	});
});

describe('project config', () => {
	it('substitutes env references and rejects unsupported types on use', () => {
		const config = parseProjectConfig(
			[
				'databases:',
				'  - { name: pg, type: postgres, host: localhost, database: "{{ env(\'DB\') }}", user: u }',
				'  - { name: duck, type: duckdb, path: ./x.duckdb }',
			].join('\n'),
			{ DB: 'warehouse' },
		);
		expect(resolveDatabase(config, 'pg')).toMatchObject({
			config: { database: 'warehouse', port: 5432, templates: ['columns', 'preview'] },
			databaseFolder: 'database=warehouse',
		});
		expect(() => resolveDatabase(config, 'duck')).toThrow(/PostgreSQL only/);
		expect(() => resolveDatabase(config)).toThrow(/Multiple databases configured/);
		expect(() => resolveDatabase(config, 'nope')).toThrow(ProjectConfigError);
	});

	it('names folders after the connection when two share a database name', () => {
		expect(
			getDatabaseFolderNames([
				{ type: 'postgres', name: 'prod eu', database: 'app' },
				{ type: 'postgres', name: 'prod us', database: 'app' },
				{ type: 'postgres', name: 'dwh', database: 'analytics' },
			]),
		).toEqual(['database=prod_eu', 'database=prod_us', 'database=analytics']);
	});

	it('matches fnmatch globs', () => {
		expect(fnmatch('analytics.events.user_id', 'analytics.events.*_id')).toBe(true);
		expect(fnmatch('main.users._peerdb_version', '*._peerdb_*')).toBe(true);
		expect(fnmatch('main.users.email', 'main.[!u]*.email')).toBe(false);
		expect(fnmatch('main.users.email', 'main.user?.email')).toBe(true);
	});
});

describe('toJsonSafe', () => {
	it('follows the upstream serialisation rules', () => {
		expect(toJsonSafe('12.50', 1700)).toBe(12.5);
		expect(toJsonSafe('NaN', 1700)).toBeNull();
		expect(toJsonSafe('9007199254740993', 20)).toBe('9007199254740993');
		expect(toJsonSafe('42', 20)).toBe(42);
		expect(toJsonSafe('2018-01-01 00:00:00', 1114)).toBe('2018-01-01T00:00:00');
		expect(toJsonSafe('2018-01-01 00:00:00+00', 1184)).toBe('2018-01-01T00:00:00+00:00');
		expect(toJsonSafe(Buffer.from('hi'))).toBe('hi');
		expect(toJsonSafe(Number.POSITIVE_INFINITY)).toBeNull();
	});
});
