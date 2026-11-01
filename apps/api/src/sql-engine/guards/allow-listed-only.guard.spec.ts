import { describe, expect, it } from 'vitest';

import {
	AllowListedOnlyGuardError,
	enforceAllowListedOnly,
	loadAllowedContextTables,
	queryReferencesBaseTables,
} from './allow-listed-only.guard.js';
import { createContextTable, FakeConnection, tempProject } from './guard-test-utils.js';
import type { TableIdentity } from './query-guard.js';

/**
 * Port of `cli/tests/upstream_core/config/test_allow_listed_only_guard.py` on the Postgres dialect.
 * Not ported: the DuckDB/MotherDuck/DuckLake/StarRocks/ClickHouse dialect cases (quarry only parses Postgres).
 */

function config(allowListedOnly: boolean, type = 'postgres') {
	return { type, name: 'local', database: 'local', allow_listed_only: allowListedOnly };
}

async function run(
	sql: string,
	allowListedOnly: boolean,
	conn: FakeConnection,
	project: string,
	groupAllowedTables: TableIdentity[] | null = null,
	type = 'postgres',
) {
	return enforceAllowListedOnly(sql, config(allowListedOnly, type), project, conn.connect, groupAllowedTables);
}

describe('allow_listed_only guard', () => {
	it('is a no-op with the flag off', async () => {
		const project = await tempProject();
		const conn = new FakeConnection();
		await expect(run('SELECT * FROM users', false, conn, project)).resolves.toBe('SELECT * FROM users');
		expect(conn.connectCount).toBe(0);
	});

	it('allows the exact table with request-only table access', async () => {
		const project = await tempProject();
		const sql = 'SELECT * FROM main.orders';
		await expect(run(sql, false, new FakeConnection(), project, [['main', 'orders']])).resolves.toBe(sql);
	});

	it('blocks a denied join with request-only table access', async () => {
		const project = await tempProject();
		await expect(
			run('SELECT * FROM orders JOIN users USING (id)', false, new FakeConnection(), project, [
				['main', 'orders'],
			]),
		).rejects.toThrow(/Context table permissions.*main\.users/);
	});

	it('intersects request access and synced context', async () => {
		const project = await tempProject();
		await createContextTable(project, 'main', 'orders');
		await expect(
			run('SELECT * FROM users', true, new FakeConnection(), project, [['main', 'users']]),
		).rejects.toThrow(/main\.users/);
		await expect(
			run('SELECT * FROM orders', true, new FakeConnection(), project, [['main', 'users']]),
		).rejects.toThrow(/main\.orders/);
	});

	it('denies tables but allows table-less queries with empty request access', async () => {
		const project = await tempProject();
		await expect(run('SELECT 1', false, new FakeConnection(), project, [])).resolves.toBe('SELECT 1');
		await expect(run('SELECT * FROM orders', false, new FakeConnection(), project, [])).rejects.toThrow(
			/main\.orders/,
		);
	});

	it('preserves quoted exact-case resolution', async () => {
		const project = await tempProject();
		const sql = 'SELECT * FROM main."Orders"';
		await expect(
			run(sql, false, new FakeConnection({ main: ['Orders'] }), project, [['main', 'Orders']]),
		).resolves.toBe(sql);
	});

	it('resolves unquoted and quoted Postgres tables to distinct case', async () => {
		const project = await tempProject();
		const conn = () => new FakeConnection({ public: ['orders', 'Orders'] });
		const unquoted = 'SELECT * FROM PUBLIC.Orders';
		await expect(run(unquoted, false, conn(), project, [['public', 'orders']])).resolves.toBe(unquoted);
		await expect(run(unquoted, false, conn(), project, [['public', 'Orders']])).rejects.toThrow(/public\.orders/);
		const quoted = 'SELECT * FROM public."Orders"';
		await expect(run(quoted, false, conn(), project, [['public', 'Orders']])).resolves.toBe(quoted);
		await expect(run(quoted, false, conn(), project, [['public', 'orders']])).rejects.toThrow(/public\.Orders/);
	});

	it('preserves quoted case for catalog and schema', async () => {
		const project = await tempProject();
		const conn = () =>
			new FakeConnection({ 'catalog.public': ['orders'], 'catalog.Public': ['orders'] }, 'catalog.public');
		const unquoted = 'SELECT * FROM CATALOG.Public.Orders';
		await expect(run(unquoted, false, conn(), project, [['catalog.public', 'orders']])).resolves.toBe(unquoted);
		const quotedSchema = 'SELECT * FROM catalog."Public".orders';
		await expect(run(quotedSchema, false, conn(), project, [['catalog.Public', 'orders']])).resolves.toBe(
			quotedSchema,
		);
		await expect(
			run('SELECT * FROM "CATALOG".public.orders', false, conn(), project, [['catalog.public', 'orders']]),
		).rejects.toThrow('does not match');
	});

	it('does not let structured identities collide on dots', async () => {
		const project = await tempProject();
		const conn = () => new FakeConnection({ 'a.b': ['c'], a: ['b.c'] });
		const dottedSchema = 'SELECT * FROM "a.b".c';
		await expect(run(dottedSchema, false, conn(), project, [['a.b', 'c']])).resolves.toBe(dottedSchema);
		await expect(run(dottedSchema, false, conn(), project, [['a', 'b.c']])).rejects.toThrow(
			AllowListedOnlyGuardError,
		);
		const dottedTable = 'SELECT * FROM a."b.c"';
		await expect(run(dottedTable, false, conn(), project, [['a', 'b.c']])).resolves.toBe(dottedTable);
		await expect(run(dottedTable, false, conn(), project, [['a.b', 'c']])).rejects.toThrow(
			AllowListedOnlyGuardError,
		);
	});

	it.each([
		[['a.b', 'c'] as const, 'SELECT * FROM a."b.c"'],
		[['a', 'b.c'] as const, 'SELECT * FROM "a.b".c'],
	])('does not let synced context identities collide on dots (%j)', async ([schema, table], blockedSql) => {
		const project = await tempProject();
		await createContextTable(project, schema, table);
		await expect(run(blockedSql, true, new FakeConnection({ 'a.b': ['c'], a: ['b.c'] }), project)).rejects.toThrow(
			AllowListedOnlyGuardError,
		);
	});

	it('fails closed for an unsupported dialect', async () => {
		const project = await tempProject();
		await expect(
			run('SELECT * FROM orders', false, new FakeConnection(), project, [['main', 'orders']], 'unsupported'),
		).rejects.toThrow('not supported');
	});

	it('blocks table functions as dynamic table references', async () => {
		const project = await tempProject();
		await expect(
			run("SELECT * FROM pg_read_file('/etc/passwd')", false, new FakeConnection(), project, [
				['main', 'orders'],
			]),
		).rejects.toThrow('dynamic table reference');
	});

	it('allows a listed qualified table', async () => {
		const project = await tempProject();
		await createContextTable(project, 'main', 'orders');
		const sql = 'SELECT * FROM main.orders';
		await expect(run(sql, true, new FakeConnection(), project)).resolves.toBe(sql);
	});

	it('blocks an unlisted qualified table', async () => {
		const project = await tempProject();
		await createContextTable(project, 'main', 'orders');
		const error = await run('SELECT * FROM main.users', true, new FakeConnection(), project).catch((e) => e);
		expect(error).toBeInstanceOf(AllowListedOnlyGuardError);
		expect(error.message).toContain('Unlisted table(s): main.users');
		expect(error.message).toContain('Only synced context tables are allowed - list/read context to see them.');
	});

	it('requires the exact resolved table name', async () => {
		const project = await tempProject();
		await createContextTable(project, 'main', 'Users');
		await expect(
			run('SELECT * FROM main.users', true, new FakeConnection({ main: ['users'] }), project),
		).rejects.toThrow(/main\.users/);
	});

	it('does not fall back to another catalog for an explicit catalog', async () => {
		const project = await tempProject();
		await expect(
			run(
				'SELECT * FROM default_catalog.analytics.events',
				false,
				new FakeConnection({ 'other_catalog.analytics': ['events'] }, 'default_catalog.analytics'),
				project,
				[['other_catalog.analytics', 'events']],
			),
		).rejects.toThrow('default_catalog.analytics');
	});

	it('resolves unqualified tables against the live schema', async () => {
		const project = await tempProject();
		await createContextTable(project, 'main', 'orders');
		await expect(run('SELECT * FROM orders', true, new FakeConnection(), project)).resolves.toBe(
			'SELECT * FROM orders',
		);
		await expect(run('SELECT * FROM users', true, new FakeConnection(), project)).rejects.toThrow(/main\.users/);
	});

	it('only checks the base table of a CTE', async () => {
		const project = await tempProject();
		await createContextTable(project, 'main', 'orders');
		const sql = 'WITH recent AS (SELECT * FROM orders) SELECT * FROM recent';
		await expect(run(sql, true, new FakeConnection(), project)).resolves.toBe(sql);
	});

	it('checks tables in subqueries, set operations and lateral joins', async () => {
		const project = await tempProject();
		await createContextTable(project, 'main', 'orders');
		for (const sql of [
			'SELECT * FROM orders WHERE id IN (SELECT id FROM users)',
			'SELECT id FROM orders UNION ALL SELECT id FROM users',
			'SELECT * FROM orders o CROSS JOIN LATERAL (SELECT * FROM users u WHERE u.id = o.user_id) l',
			'SELECT (SELECT count(*) FROM users) FROM orders',
		]) {
			await expect(run(sql, true, new FakeConnection(), project)).rejects.toThrow(/main\.users/);
		}
	});

	it('allows a query without tables without connecting', async () => {
		const project = await tempProject();
		const conn = new FakeConnection();
		await expect(run('SELECT 1', true, conn, project)).resolves.toBe('SELECT 1');
		expect(conn.connectCount).toBe(0);
	});

	it.each([
		['SELECT 1', false],
		['SELECT * FROM main.orders', true],
	])('queryReferencesBaseTables(%s) is %s', async (sql, expected) => {
		await expect(queryReferencesBaseTables(sql, 'postgres')).resolves.toBe(expected);
	});

	it('treats an unparseable query as referencing base tables', async () => {
		await expect(queryReferencesBaseTables('SELECT (', 'postgres')).resolves.toBe(true);
	});

	it('blocks an unparseable query', async () => {
		const project = await tempProject();
		await expect(run('SELECT (', true, new FakeConnection(), project)).rejects.toThrow(
			'the SQL could not be parsed',
		);
	});

	it('reports that no tables are synced when the context is empty', async () => {
		const project = await tempProject();
		await expect(run('SELECT * FROM users', true, new FakeConnection(), project)).rejects.toThrow(
			'No tables are currently present in synced context',
		);
	});

	it('uses the sanitized config name when two connections share a database name', async () => {
		const project = await tempProject();
		await createContextTable(project, 'default', 'events', { databaseFolder: 'analytics_prod' });
		await expect(
			loadAllowedContextTables(
				project,
				{ type: 'postgres', name: 'analytics prod', database: 'x' },
				'database=analytics_prod',
			),
		).resolves.toEqual([['default', 'events']]);
	});
});
