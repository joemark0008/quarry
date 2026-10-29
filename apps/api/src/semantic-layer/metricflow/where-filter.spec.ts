import { describe, expect, it } from 'vitest';

import { SemanticQueryError } from './errors.js';
import { parseWhereFilter } from './where-filter.js';

describe('parseWhereFilter', () => {
	it('splits SQL and template references', () => {
		expect(parseWhereFilter("{{ Dimension('order__status') }} = 'completed'")).toEqual([
			{ kind: 'dimension', name: 'order__status', grain: null },
			" = 'completed'",
		]);
	});

	it('reads granularities from TimeDimension and .grain()', () => {
		expect(parseWhereFilter("{{ TimeDimension('metric_time', 'day') }} >= '2024-01-01'")[0]).toEqual({
			kind: 'dimension',
			name: 'metric_time',
			grain: 'day',
		});
		expect(parseWhereFilter("{{ Dimension('order__ordered_at').grain('MONTH') }} = '2024-01-01'")[0]).toEqual({
			kind: 'dimension',
			name: 'order__ordered_at',
			grain: 'month',
		});
		expect(parseWhereFilter("{{ TimeDimension('metric_time', time_granularity_name='week') }} > 1")[0]).toEqual({
			kind: 'dimension',
			name: 'metric_time',
			grain: 'week',
		});
	});

	it('reads entities, metrics and single-hop entity paths', () => {
		expect(parseWhereFilter("{{ Entity('customer') }} = 1")[0]).toEqual({ kind: 'entity', name: 'customer' });
		expect(parseWhereFilter("{{ Metric('revenue', group_by=['customer']) }} > 100")[0]).toEqual({
			kind: 'metric',
			name: 'revenue',
			groupBy: ['customer'],
		});
		expect(parseWhereFilter("{{ Dimension('status', entity_path=['order']) }} = 'x'")[0]).toEqual({
			kind: 'dimension',
			name: 'order__status',
			grain: null,
		});
	});

	it('rejects unknown functions, multi-hop paths and metrics without group_by', () => {
		expect(() => parseWhereFilter("{{ Column('status') }} = 1")).toThrow(SemanticQueryError);
		expect(() => parseWhereFilter("{{ Dimension('x', entity_path=['a', 'b']) }} = 1")).toThrow(/multi-hop/);
		expect(() => parseWhereFilter("{{ Metric('revenue') }} > 1")).toThrow(/group_by/);
		expect(() => parseWhereFilter("{{ Dimension('order__status').date_part('year') }} = 1")).toThrow(
			/not supported/,
		);
	});
});
