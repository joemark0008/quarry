import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import type { SemanticQuery } from './compiler.js';
import { SemanticLayerError, SemanticQueryError } from './errors.js';
import { MetricFlowSemanticLayer } from './semantic-layer.js';

// The reference queries were compiled by upstream MetricFlow (Postgres dialect) and both SQL texts were run on the
// jaffle_shop warehouse with identical results; the snapshots pin quarry's SQL. `extended_semantic_manifest.json` is
// the example manifest plus derived, windowed/grain-to-date cumulative, percentile, sum_boolean, fill_nulls_with and
// `create_metric` definitions.
const fixtures = path.join(import.meta.dirname, '__fixtures__');
const example = new MetricFlowSemanticLayer(path.join(fixtures, 'example_semantic_manifest.json'), 'postgres');
const extended = new MetricFlowSemanticLayer(path.join(fixtures, 'extended_semantic_manifest.json'), 'postgres');
const reference = JSON.parse(readFileSync(path.join(fixtures, 'reference_queries.json'), 'utf8')) as Record<
	'example' | 'extended' | 'errors',
	SemanticQuery[]
>;

describe('semantic query compiler', () => {
	it.each(reference.example.map((query) => [JSON.stringify(query), query] as const))(
		'compiles example query %s',
		(_, query) => {
			expect(example.compile(query)).toMatchSnapshot();
		},
	);

	it.each(reference.extended.map((query) => [JSON.stringify(query), query] as const))(
		'compiles extended query %s',
		(_, query) => {
			expect(extended.compile(query)).toMatchSnapshot();
		},
	);

	it.each(reference.errors.map((query) => [JSON.stringify(query), query] as const))(
		'rejects %s as MetricFlow does',
		(_, query) => {
			expect(() => extended.compile(query)).toThrow(SemanticQueryError);
		},
	);

	it('lists the example dimensions and metric dimensions as MetricFlow does', () => {
		expect(
			example
				.listDimensions()
				.map(({ name, type, granularity, semanticModel }) => [name, type, granularity, semanticModel]),
		).toEqual([
			['customer__first_name', 'categorical', null, 'customers'],
			['customer__first_order', 'time', 'day', 'customers'],
			['customer__last_name', 'categorical', null, 'customers'],
			['customer__most_recent_order', 'time', 'day', 'customers'],
			['order__order_date', 'time', 'day', 'orders'],
			['order__status', 'categorical', null, 'orders'],
		]);
		const averageOrderValue = example.listMetrics().find((metric) => metric.name === 'average_order_value')!;
		expect(averageOrderValue).toMatchObject({
			type: 'ratio',
			inputMetrics: ['revenue', 'orders'],
			semanticModels: ['orders'],
			dimensions: [
				'customer__first_name',
				'customer__first_order',
				'customer__last_name',
				'customer__most_recent_order',
				'metric_time',
				'order__order_date',
				'order__status',
			],
		});
		const customers = example.listMetrics().find((metric) => metric.name === 'customers')!;
		expect(customers.dimensions).not.toContain('order__status');
	});

	it('suggests the group-by items a metric can use', () => {
		expect(() => example.compile({ metrics: ['customers'], groupBy: ['order__status'] })).toThrow(
			/customer__first_name/,
		);
	});

	it('widens the time range to whole periods of the metric_time grain', () => {
		const sql = example.compile({
			metrics: ['revenue'],
			groupBy: ['metric_time__month'],
			startTime: '2018-02-15',
			endTime: '2018-03-20',
		});

		expect(sql).toContain("BETWEEN '2018-02-01' AND '2018-03-31'");
	});

	it('keeps open bounds at MetricFlow defaults', () => {
		expect(example.compile({ metrics: ['revenue'], endTime: '2018-03-31' })).toContain(
			"BETWEEN '2000-01-01' AND '2018-03-31'",
		);
	});

	it('rejects time offsets in derived metrics', () => {
		const manifest = JSON.parse(readFileSync(path.join(fixtures, 'example_semantic_manifest.json'), 'utf8'));
		manifest.metrics.push({
			name: 'revenue_last_month',
			type: 'derived',
			type_params: {
				expr: 'revenue',
				metrics: [{ name: 'revenue', offset_window: { count: 1, granularity: 'month' } }],
			},
		});
		const layer = new MetricFlowSemanticLayer('inline.json', 'postgres', JSON.stringify(manifest));

		expect(() => layer.compile({ metrics: ['revenue_last_month'] })).toThrow(/offset/);
	});

	it('rejects conversion metrics and non-additive measures as unsupported', () => {
		const manifest = JSON.parse(readFileSync(path.join(fixtures, 'example_semantic_manifest.json'), 'utf8'));
		manifest.metrics.push({ name: 'visit_to_buy', type: 'conversion', type_params: {} });
		manifest.semantic_models[1].measures.push({
			name: 'balance',
			agg: 'sum',
			expr: 'amount',
			create_metric: true,
			non_additive_dimension: { name: 'order_date', window_choice: 'max' },
		});
		const layer = new MetricFlowSemanticLayer('inline.json', 'postgres', JSON.stringify(manifest));

		expect(() => layer.compile({ metrics: ['visit_to_buy'] })).toThrow(SemanticLayerError);
		expect(() => layer.compile({ metrics: ['visit_to_buy'] })).toThrow(/conversion/);
		expect(() => layer.compile({ metrics: ['balance'] })).toThrow(/non_additive_dimension/);
	});

	it('rejects malformed where templates', () => {
		expect(() =>
			example.compile({ metrics: ['revenue'], where: ["{{ Dimenson('order__status') }} = 'x'"] }),
		).toThrow(SemanticQueryError);
		expect(() =>
			example.compile({ metrics: ['revenue'], where: ["{{ Dimension('order__nope') }} = 'x'"] }),
		).toThrow(/order__status/);
	});
});
