import { describe, expect, it } from 'vitest';

import { enforceReadOnly, ReadOnlyGuardError } from './read-only.guard.js';

describe('read-only guard', () => {
	it.each([
		'SELECT 1',
		'select customer_id, sum(amount) from payments group by 1 order by 2 desc limit 5',
		'WITH c AS (SELECT * FROM customers) SELECT count(*) FILTER (WHERE first_order > now()) FROM c',
		"SELECT date_trunc('month', order_date)::date, count(*) FROM orders GROUP BY 1",
		'SELECT a FROM t UNION ALL SELECT b FROM u',
		'VALUES (1), (2)',
	])('allows the query %s', async (sql) => {
		await expect(enforceReadOnly(sql)).resolves.toBeDefined();
	});

	it.each([
		['DELETE FROM customers', 'DELETE statements are not allowed'],
		['UPDATE customers SET first_name = 1', 'UPDATE statements are not allowed'],
		['INSERT INTO customers VALUES (1)', 'INSERT statements are not allowed'],
		['DROP TABLE customers', 'DROP statements are not allowed'],
		['TRUNCATE customers', 'TRUNCATE statements are not allowed'],
		['CREATE TABLE x AS SELECT 1', 'CREATE TABLE AS statements are not allowed'],
		["COPY customers TO '/tmp/x'", 'COPY statements are not allowed'],
		['SET statement_timeout = 0', 'SET statements are not allowed'],
		['SELECT 1; SELECT 2', 'only one statement'],
		['SELECT * INTO copy FROM customers', 'SELECT INTO'],
		['SELECT * FROM customers FOR UPDATE', 'locking clauses'],
		['WITH d AS (DELETE FROM customers RETURNING *) SELECT * FROM d', 'data-modifying'],
		['SELECT pg_sleep(10)', 'pg_sleep() is not allowed'],
		["SELECT * FROM dblink('host=x', 'select 1') AS t(a int)", 'dblink() is not allowed'],
		["SELECT query_to_xml('select * from secrets', true, true, '')", 'query_to_xml() is not allowed'],
		["SELECT pg_read_file('/etc/passwd')", 'pg_read_file() is not allowed'],
		['', 'empty'],
		['SELECT (', 'could not be parsed'],
	])('blocks %s', async (sql, message) => {
		const error = await enforceReadOnly(sql).catch((e) => e);
		expect(error).toBeInstanceOf(ReadOnlyGuardError);
		expect(error.message).toContain(message);
	});
});
