import { describe, expect, it } from 'vitest';

import { compileQueryToolSql } from '@quarry/shared/query-tools';
import { generateQuerySql, quoteIdentifier } from './query-builder';
import type { BuilderSpec } from './query-builder';

const base: BuilderSpec = {
	schema: 'public',
	table: 'orders',
	columns: [],
	filters: [],
	orderBy: [],
	limit: { kind: 'none' },
};

describe('generateQuerySql', () => {
	it('selects every column without a selection', () => {
		expect(generateQuerySql(base).sql).toBe('SELECT *\nFROM public.orders');
	});

	it('aggregates, groups the other columns, filters with a parameter and orders', () => {
		const generated = generateQuerySql({
			...base,
			columns: [
				{ column: 'status', aggregate: 'none' },
				{ column: '*', aggregate: 'count' },
				{ column: 'amount', aggregate: 'sum', alias: 'revenue' },
			],
			filters: [
				{
					column: 'order_date',
					operator: '>=',
					value: { kind: 'parameter', name: 'since', type: 'date', required: false, default: '2018-01-01' },
				},
				{ column: 'status', operator: 'in', value: { kind: 'value', value: "completed, it's" } },
			],
			orderBy: [{ column: 'revenue', direction: 'desc' }],
			limit: { kind: 'parameter', name: 'max_rows', default: 10 },
		});
		expect(generated.sql).toBe(
			[
				'SELECT status, count(*) AS count_rows, sum(amount) AS revenue',
				'FROM public.orders',
				"WHERE order_date >= {{ since }}\n  AND status IN ('completed', 'it''s')",
				'GROUP BY status',
				'ORDER BY revenue DESC',
				'LIMIT {{ max_rows }}',
			].join('\n'),
		);
		expect(generated.parameters).toEqual([
			expect.objectContaining({ name: 'since', type: 'date', default: '2018-01-01', required: false }),
			expect.objectContaining({ name: 'max_rows', type: 'integer', default: 10 }),
		]);
		expect(generated.groupBy).toEqual(['status']);
		expect(compileQueryToolSql(generated.sql, generated.parameters).order).toEqual(['since', 'max_rows']);
	});

	it('quotes identifiers that need it and escapes literals', () => {
		expect(quoteIdentifier('order')).toBe('"order"');
		expect(quoteIdentifier('Total "A"')).toBe('"Total ""A"""');
		const generated = generateQuerySql({
			...base,
			filters: [{ column: 'status', operator: '=', value: { kind: 'value', value: "x' OR '1'='1" } }],
		});
		expect(generated.sql).toContain("WHERE status = 'x'' OR ''1''=''1'");
	});

	it('rejects invalid combinations', () => {
		expect(() => generateQuerySql({ ...base, columns: [{ column: '*', aggregate: 'sum' }] })).toThrow(
			/needs a column/,
		);
		expect(() =>
			generateQuerySql({
				...base,
				filters: [
					{
						column: 'status',
						operator: 'in',
						value: { kind: 'parameter', name: 'status', type: 'string', required: true },
					},
				],
			}),
		).toThrow(/fixed values/);
	});
});
