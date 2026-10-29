import { describe, expect, it } from 'vitest';

import { columnCatalogPath, writeColumnCatalog } from '../column-catalog.js';
import { ColumnAccessError, validateColumnAccess } from './column-access.guard.js';
import { tempProject } from './guard-test-utils.js';

/**
 * Port of `cli/tests/nao_core/config/test_column_access.py` on the Postgres dialect.
 * Not ported: `* EXCLUDE` / `* EXCEPT` / `REPLACE` / `RENAME` and `UNNEST(...)` alias cases (BigQuery, Snowflake,
 * DuckDB syntax). Postgres has no star exclusion, so the Postgres advice ("select columns explicitly") applies.
 * `exclude_columns_guard.py` is not ported: the FastAPI service only uses `column_access.py`.
 */

type Schemas = Record<string, Record<string, string[]>>;

const defaultSchemas: Schemas = {
	main: {
		users: ['id', 'name', 'email', 'secret', 'ssn', '_peerdb_version'],
		orders: ['id', 'user_id', 'total'],
	},
};

function config(excludeColumns: string[], database = 'local') {
	return { type: 'postgres', name: 'test-database', database, exclude_columns: excludeColumns };
}

async function writeCatalog(project: string, schemas: Schemas, database = 'local') {
	const catalog = Object.fromEntries(
		Object.entries(schemas).map(([schema, tables]) => [
			schema,
			Object.fromEntries(
				Object.entries(tables).map(([table, columns]) => [
					table,
					columns.map((name) => ({ name, type: 'VARCHAR' })),
				]),
			),
		]),
	);
	await writeColumnCatalog(columnCatalogPath(project, 'postgres', `database=${database}`), catalog);
}

async function projectWithCatalog(schemas: Schemas = defaultSchemas) {
	const project = await tempProject();
	await writeCatalog(project, schemas);
	return project;
}

describe('column access guard', () => {
	it('blocks an explicit excluded select column', async () => {
		const project = await projectWithCatalog();
		await expect(validateColumnAccess('SELECT email FROM users', config(['*.email']), project)).rejects.toThrow(
			/main\.users\.email/,
		);
	});

	it.each([
		'SELECT name FROM users WHERE email IS NOT NULL',
		'SELECT u.name FROM users u JOIN orders o ON u.email = o.user_id',
		'SELECT name FROM users ORDER BY email',
		'SELECT name FROM users GROUP BY name, email',
		'SELECT name FROM users WHERE id IN (SELECT id FROM users WHERE email IS NULL)',
	])('blocks an explicit excluded column outside the select list: %s', async (sql) => {
		const project = await projectWithCatalog();
		await expect(validateColumnAccess(sql, config(['*.email']), project)).rejects.toThrow(/main\.users\.email/);
	});

	it('blocks SELECT * that includes an excluded column, with the Postgres advice', async () => {
		const project = await projectWithCatalog();
		const error = await validateColumnAccess('SELECT * FROM users', config(['*.email']), project).catch((e) => e);
		expect(error).toBeInstanceOf(ColumnAccessError);
		expect(error.message).toBe(
			'Query blocked because SELECT * would include excluded column(s): main.users.email. ' +
				'Select only allowed columns explicitly instead of using *.',
		);
	});

	it('blocks a qualified star that includes an excluded column', async () => {
		const project = await projectWithCatalog();
		await expect(
			validateColumnAccess(
				'SELECT o.*, u.* FROM orders o JOIN users u ON u.id = o.user_id',
				config(['*.email']),
				project,
			),
		).rejects.toThrow(/main\.users\.email/);
		const safe = 'SELECT o.*, u.name FROM orders o JOIN users u ON u.id = o.user_id';
		await expect(validateColumnAccess(safe, config(['*.email']), project)).resolves.toBe(safe);
	});

	it('allows SELECT * on a table missing from the catalog', async () => {
		const project = await tempProject();
		const sql = 'SELECT * FROM unknown_users';
		await expect(validateColumnAccess(sql, config(['*.email']), project)).resolves.toBe(sql);
	});

	it('blocks a CTE star that includes an excluded column', async () => {
		const project = await projectWithCatalog();
		await expect(
			validateColumnAccess(
				'WITH selected_users AS (SELECT * FROM users) SELECT * FROM selected_users',
				config(['*.email']),
				project,
			),
		).rejects.toThrow(/SELECT \* would include excluded column\(s\): main\.users\.email/);
	});

	it('blocks an explicit excluded column read from a CTE star', async () => {
		const project = await projectWithCatalog();
		await expect(
			validateColumnAccess(
				'WITH selected_users AS (SELECT * FROM users) SELECT email FROM selected_users',
				config(['*.email']),
				project,
			),
		).rejects.toThrow(/main\.users\.email/);
	});

	it('allows a CTE that only exposes allowed columns, with ORDER BY on an output alias', async () => {
		const project = await projectWithCatalog();
		const sql =
			'WITH spend AS (SELECT user_id, sum(total) AS revenue FROM orders GROUP BY user_id) ' +
			'SELECT u.name, s.revenue FROM spend s JOIN users u ON u.id = s.user_id ORDER BY revenue DESC LIMIT 5';
		await expect(validateColumnAccess(sql, config(['*.email']), project)).resolves.toBe(sql);
	});

	it('allows a safe query unchanged', async () => {
		const project = await projectWithCatalog();
		const sql = 'SELECT id, name FROM users WHERE id > 10';
		await expect(validateColumnAccess(sql, config(['*.email']), project)).resolves.toBe(sql);
	});

	it('blocks a different catalog without a local schema fallback', async () => {
		const project = await projectWithCatalog();
		await expect(
			validateColumnAccess('SELECT id FROM remote.main.users', config(['*.email']), project),
		).rejects.toThrow('does not match the configured database');
	});

	it('resolves the local schema through a matching catalog', async () => {
		const project = await projectWithCatalog();
		const safe = 'SELECT id FROM LOCAL.main.users';
		await expect(validateColumnAccess(safe, config(['*.email']), project)).resolves.toBe(safe);
		await expect(
			validateColumnAccess('SELECT email FROM LOCAL.main.users', config(['*.email']), project),
		).rejects.toThrow(/main\.users\.email/);
	});

	it('blocks an unparseable query', async () => {
		const project = await projectWithCatalog();
		await expect(validateColumnAccess('SELECT (', config(['*.email']), project)).rejects.toThrow(
			'could not be parsed',
		);
	});

	it('blocks a star nested inside an expression', async () => {
		const project = await projectWithCatalog();
		await expect(
			validateColumnAccess('SELECT ARRAY_AGG(users.*) FROM users', config(['*.email']), project),
		).rejects.toThrow('nested inside an expression');
		const count = 'SELECT count(*) FROM users';
		await expect(validateColumnAccess(count, config(['*.email']), project)).resolves.toBe(count);
	});

	it('is a no-op without exclude_columns, even for invalid SQL', async () => {
		const project = await tempProject();
		await expect(validateColumnAccess('not valid SQL', config([]), project)).resolves.toBe('not valid SQL');
	});

	it('skips the catalog for a query without tables', async () => {
		const project = await tempProject();
		await expect(validateColumnAccess('SELECT 1', config(['*.email']), project)).resolves.toBe('SELECT 1');
	});

	it('blocks an explicit column without a catalog', async () => {
		const project = await tempProject();
		await expect(validateColumnAccess('SELECT email FROM users', config(['*.email']), project)).rejects.toThrow(
			/users\.email/,
		);
	});

	it.each([
		['*.ssn', 'SELECT ssn FROM main.users', 'main.users.ssn'],
		['*._peerdb_*', 'SELECT _peerdb_version FROM main.users', 'main.users._peerdb_version'],
		['analytics.events.*_id', 'SELECT user_id FROM analytics.events', 'analytics.events.user_id'],
	])('blocks columns matching the glob %s', async (pattern, sql, excludedName) => {
		const project = await tempProject();
		await expect(validateColumnAccess(sql, config([pattern]), project)).rejects.toThrow(excludedName);
	});

	it('does not apply a table pattern to other tables', async () => {
		const project = await projectWithCatalog();
		const sql = 'SELECT total FROM main.orders';
		await expect(validateColumnAccess(sql, config(['main.users.email']), project)).resolves.toBe(sql);
	});

	it('checks every candidate table for an ambiguous column', async () => {
		const project = await projectWithCatalog({
			main: { users: ['id', 'email'] },
			analytics: { users: ['id', 'email'] },
		});
		await expect(
			validateColumnAccess('SELECT email FROM users', config(['analytics.users.email']), project),
		).rejects.toThrow(/analytics\.users\.email/);
	});

	it('checks every missing catalog table for an unqualified join column', async () => {
		const project = await tempProject();
		await expect(
			validateColumnAccess(
				'SELECT ssn FROM main.customers c JOIN main.accounts a ON c.id = a.id',
				config(['main.accounts.ssn']),
				project,
			),
		).rejects.toThrow(/main\.accounts\.ssn/);
	});
});
