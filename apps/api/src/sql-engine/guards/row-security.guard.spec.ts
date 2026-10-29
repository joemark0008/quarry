import pg from 'pg';
import { describe, expect, inject, it } from 'vitest';

import { FakeConnection } from './guard-test-utils.js';
import type { TableIdentity } from './query-guard.js';
import {
	enforceRowSecurity,
	RowSecurityGuardError,
	rowSecurityPolicies,
	type RowSecurityPolicy,
	validateRowSecurityPredicate,
} from './row-security.guard.js';

/**
 * Port of `cli/tests/nao_core/config/test_row_security_guard.py` on the Postgres dialect. Rewritten SQL comes from
 * the Postgres deparser (lower-case `true`/`false`, identifiers quoted only when needed); the DuckDB execution
 * checks run on Postgres temp tables. Not ported: the BigQuery quoted-path and MySQL literal cases.
 */

const conn = () => new FakeConnection({ main: ['orders', 'users'] });

function policy(predicate = 'tenant_id = 7'): [TableIdentity, RowSecurityPolicy][] {
	return [[['main', 'orders'], { access: 'predicate', constraint_columns: ['tenant_id', 'region'], predicate }]];
}

const usersPolicy = (predicate: string, columns = ['region']): [TableIdentity, RowSecurityPolicy] => [
	['main', 'users'],
	{ access: 'predicate', constraint_columns: columns, predicate },
];

/** The deparser pads subquery parentheses (`( SELECT … )`); compare without the padding. */
async function enforce(sql: string, entries: [TableIdentity, RowSecurityPolicy][], connection = conn()) {
	const rewritten = await enforceRowSecurity(
		sql,
		{ type: 'postgres' },
		rowSecurityPolicies(entries),
		connection.connect,
	);
	return rewritten.replace(/\( /g, '(').replace(/ \)/g, ')');
}

describe('row security guard', () => {
	it('injects the predicate with the table alias', async () => {
		const sql = await enforce('SELECT o.id FROM orders AS o WHERE o.active = TRUE', policy());
		expect(sql).toContain('o.active = true AND o.tenant_id = 7');
	});

	it('filters each sensitive table in a join', async () => {
		const sql = await enforce('SELECT * FROM orders o JOIN users u ON o.user_id = u.id', [
			...policy(),
			usersPolicy("region IN ('eu', 'us')"),
		]);
		expect(sql).toContain('o.tenant_id = 7');
		expect(sql).toContain("u.region IN ('eu', 'us')");
	});

	it('keeps LEFT JOIN rows by filtering the nullable side in ON', async () => {
		const sql = await enforce(
			'SELECT * FROM orders o LEFT JOIN users u ON o.user_id = u.id WHERE o.active = TRUE',
			[usersPolicy("region = 'eu'")],
		);
		expect(sql).toContain("LEFT JOIN users AS u ON o.user_id = u.id AND u.region = 'eu'");
		expect(sql).toContain('WHERE o.active = true');
	});

	it('pre-filters the nullable side of an outer join with USING, and keeps its rows', async () => {
		const leftSql = await enforce(
			'SELECT o.id, u.region FROM orders o LEFT JOIN users u USING (user_id) ORDER BY o.id',
			[usersPolicy("region = 'eu'")],
		);
		const rightSql = await enforce(
			'SELECT o.id, u.region FROM orders o RIGHT JOIN users u USING (user_id) ORDER BY u.user_id',
			policy(),
		);
		expect(leftSql).toContain("LEFT JOIN (SELECT * FROM users AS u WHERE u.region = 'eu') AS u USING (user_id)");
		expect(rightSql).toContain(
			'FROM (SELECT * FROM orders AS o WHERE o.tenant_id = 7) AS o RIGHT JOIN users AS u USING (user_id)',
		);

		const client = new pg.Client({ connectionString: inject('testDatabaseUrl') });
		await client.connect();
		try {
			await client.query('CREATE TEMP TABLE orders (id INTEGER, user_id INTEGER, tenant_id INTEGER)');
			await client.query('INSERT INTO orders VALUES (1, 10, 8), (2, 20, 7)');
			await client.query('CREATE TEMP TABLE users (user_id INTEGER, region VARCHAR)');
			await client.query("INSERT INTO users VALUES (10, 'us'), (20, 'eu')");
			const left = await client.query({ text: leftSql, rowMode: 'array' });
			const right = await client.query({ text: rightSql, rowMode: 'array' });
			expect(left.rows).toEqual([
				[1, null],
				[2, 'eu'],
			]);
			expect(right.rows).toEqual([
				[null, 'us'],
				[2, 'eu'],
			]);
		} finally {
			await client.end();
		}
	});

	it('keeps RIGHT JOIN rows by filtering the nullable side in ON', async () => {
		const sql = await enforce('SELECT * FROM orders o RIGHT JOIN users u ON o.user_id = u.id', policy());
		expect(sql).toContain('RIGHT JOIN users AS u ON o.user_id = u.id AND o.tenant_id = 7');
		expect(sql).not.toContain('WHERE o.tenant_id');
	});

	it('keeps FULL JOIN rows by pre-filtering each protected source', async () => {
		const sql = await enforce(
			'SELECT * FROM main.orders AS "Order Source" FULL OUTER JOIN main.users AS "User Source" ' +
				'ON "Order Source".user_id = "User Source".id',
			[...policy(), usersPolicy("region = 'eu'")],
		);
		expect(sql).toContain(
			'(SELECT * FROM main.orders AS "Order Source" WHERE "Order Source".tenant_id = 7) AS "Order Source"',
		);
		expect(sql).toContain(
			'(SELECT * FROM main.users AS "User Source" WHERE "User Source".region = \'eu\') AS "User Source"',
		);
	});

	it('rejects a qualified FULL JOIN table without an explicit alias', async () => {
		await expect(
			enforce('SELECT * FROM main.orders FULL OUTER JOIN users ON main.orders.user_id = users.id', policy()),
		).rejects.toThrow('require an explicit alias');
	});

	it('filters the base table of a nested query and CTE once', async () => {
		const sql = await enforce('WITH scoped AS (SELECT * FROM orders o) SELECT * FROM scoped', policy());
		expect(sql).toContain('WHERE o.tenant_id = 7');
		expect(sql.match(/tenant_id/g)).toHaveLength(1);
	});

	it('filters tables in subqueries and set operations', async () => {
		const sql = await enforce(
			'SELECT id FROM orders UNION ALL SELECT id FROM users WHERE id IN (SELECT user_id FROM orders x)',
			policy(),
		);
		expect(sql).toContain('FROM orders WHERE orders.tenant_id = 7');
		expect(sql).toContain('FROM orders AS x WHERE x.tenant_id = 7');
	});

	it('denies all rows with the "none" policy', async () => {
		const sql = await enforce('SELECT * FROM orders', [
			[['main', 'orders'], { access: 'none', constraint_columns: ['tenant_id'], predicate: null }],
		]);
		expect(sql).toContain('WHERE false');
	});

	it('raises the reason of a blocked policy', async () => {
		const reason = 'Enterprise license is inactive.';
		await expect(
			enforce('SELECT * FROM orders', [
				[['main', 'orders'], { access: 'blocked', constraint_columns: ['tenant_id'], reason }],
			]),
		).rejects.toThrow(reason);
	});

	it('adds no filter with full access', async () => {
		await expect(
			enforce('SELECT * FROM orders', [
				[['main', 'orders'], { access: 'full', constraint_columns: ['tenant_id'], predicate: null }],
			]),
		).resolves.toBe('SELECT * FROM orders');
	});

	it('applies a unique case-insensitive policy match', async () => {
		const sql = await enforce(
			'SELECT * FROM public.orders',
			[
				[
					['Public', 'Orders'],
					{ access: 'predicate', constraint_columns: ['tenant_id'], predicate: 'tenant_id = 7' },
				],
			],
			new FakeConnection({ public: ['orders'] }),
		);
		expect(sql).toContain('WHERE orders.tenant_id = 7');
	});

	it('rejects ambiguous case-insensitive policy matches', async () => {
		await expect(
			enforce(
				'SELECT * FROM public.orders',
				[
					[
						['Public', 'Orders'],
						{ access: 'predicate', constraint_columns: ['tenant_id'], predicate: 'tenant_id = 7' },
					],
					[['PUBLIC', 'ORDERS'], { access: 'none', constraint_columns: ['tenant_id'], predicate: null }],
				],
				new FakeConnection({ public: ['orders'] }),
			),
		).rejects.toThrow(
			"Query blocked because row-level security could not be safely enforced: multiple row-security policies match 'public.orders' case-insensitively",
		);
	});

	it.each([
		'tenant_id = 1; DELETE FROM orders',
		'tenant_id = (SELECT tenant_id FROM users)',
		'other_column = 1',
		'users.tenant_id = 1',
		'tenant_id = ?',
		'tenant_id = :tenant',
		"LOWER(region) = 'eu'",
		'tenant_id = 1 -- bypass',
		'* = 1',
		'tenant_id = 1) OR (1 = 1',
		'tenant_id = $1',
	])('rejects the unsafe predicate %s', async (predicate) => {
		await expect(enforce('SELECT * FROM orders', policy(predicate))).rejects.toThrow(RowSecurityGuardError);
	});

	it.each(['tenant_id = 1 OR 1 = 1', 'tenant_id = 1 AND 2 <> 3', 'tenant_id = 1 OR TRUE'])(
		'rejects the ungrounded comparison branch in %s',
		async (predicate) => {
			await expect(enforce('SELECT * FROM orders', policy(predicate))).rejects.toThrow(
				'every row predicate comparison',
			);
		},
	);

	it('allows each AND/OR branch to reference constraint columns', async () => {
		const sql = await enforce(
			'SELECT * FROM orders',
			policy("tenant_id = 1 OR (region = 'eu' AND tenant_id > 10)"),
		);
		expect(sql).toContain("tenant_id = 1 OR (orders.region = 'eu' AND orders.tenant_id > 10)");
	});

	it('keeps a quoted alias when qualifying predicates', async () => {
		const sql = await enforce('SELECT * FROM orders AS "Case Sensitive"', policy());
		expect(sql).toContain('"Case Sensitive".tenant_id = 7');
	});

	it('rejects an unsupported dialect', async () => {
		await expect(
			enforceRowSecurity(
				'SELECT * FROM orders',
				{ type: 'unknown' },
				rowSecurityPolicies(policy()),
				conn().connect,
			),
		).rejects.toThrow('not supported');
	});

	it('normalizes a valid predicate', async () => {
		await expect(validateRowSecurityPredicate("REGION = 'eu'", ['region'], 'postgres')).resolves.toBe(
			"region = 'eu'",
		);
		await expect(validateRowSecurityPredicate("region = 'eu'", ['region'], 'mysql')).rejects.toThrow(
			'not supported',
		);
	});
});
