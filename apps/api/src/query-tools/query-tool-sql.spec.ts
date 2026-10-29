import type { QueryToolParameter } from '@quarry/shared/query-tools';
import { describe, expect, it } from 'vitest';

import { inlineQueryToolParams, prepareQueryToolSql } from './query-tool-sql.js';

const parameters: QueryToolParameter[] = [
	{ name: 'status', type: 'string', required: true },
	{ name: 'min_amount', type: 'number', required: false, default: 0 },
	{ name: 'max_rows', type: 'integer', required: false, default: 10 },
];

describe('prepareQueryToolSql', () => {
	it('sends positional parameters and keeps a literal version for display', async () => {
		const prepared = await prepareQueryToolSql(
			'SELECT id FROM orders WHERE status = {{ status }} AND amount >= {{ min_amount }} LIMIT {{ max_rows }}',
			parameters,
			{ status: 'completed', min_amount: 12.5 },
		);
		expect(prepared.sql).toBe('SELECT id FROM orders WHERE status = $1 AND amount >= $2 LIMIT $3');
		expect(prepared.params).toEqual(['completed', 12.5, 10]);
		expect(prepared.displaySql.replace(/\s+/g, ' ')).toBe(
			"SELECT id FROM orders WHERE status = 'completed' AND amount >= 12.5 LIMIT 10",
		);
	});

	it('escapes string values through the deparser, so they stay data', async () => {
		const prepared = await prepareQueryToolSql(
			'SELECT id FROM orders WHERE status = {{ status }}',
			parameters.slice(0, 1),
			{
				status: "x'; DROP TABLE orders; --",
			},
		);
		expect(prepared.params).toEqual(["x'; DROP TABLE orders; --"]);
		expect(prepared.displaySql.replace(/\s+/g, ' ')).toBe(
			"SELECT id FROM orders WHERE status = 'x''; DROP TABLE orders; --'",
		);
	});

	it('rejects a placeholder in an identifier position', async () => {
		await expect(
			prepareQueryToolSql('SELECT * FROM {{ status }}', parameters.slice(0, 1), { status: 'orders' }),
		).rejects.toThrow(/could not be parsed/);
	});

	it('rejects several statements', async () => {
		await expect(inlineQueryToolParams('SELECT 1; SELECT 2', [])).rejects.toThrow(/exactly one/);
	});

	it('writes nulls, booleans, negatives and large numbers', async () => {
		const sql = await inlineQueryToolParams('SELECT $1, $2, $3, $4', [null, true, -5, 1e12]);
		expect(sql.replace(/\s+/g, ' ')).toBe('SELECT NULL, true, -5, 1000000000000');
	});
});
