import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	statSync,
	utimesSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SemanticLayerError, SemanticQueryError } from './errors.js';
import {
	metricflowDialectFor,
	MetricFlowSemanticLayer,
	runtimeManifestPath,
	SYNCED_MANIFEST_RELATIVE_PATH,
} from './semantic-layer.js';

// Port of upstream cli/tests/nao_core/semantic_layer/test_metricflow.py. quarry compiles for Postgres only, so the
// DuckDB assertions are made against the Postgres output and the BigQuery case expects the unsupported-dialect error.
const FIXTURE_MANIFEST = path.join(import.meta.dirname, '__fixtures__', 'semantic_manifest.json');
const EXAMPLE_MANIFEST = path.join(import.meta.dirname, '__fixtures__', 'example_semantic_manifest.json');
// The metric files of upstream `example/semantics/metrics/`, which `nao sync` generates from that manifest.
const EXAMPLE_DOCUMENTED_METRICS = [
	'average_order_value',
	'bank_transfer_revenue',
	'completed_orders',
	'completed_revenue',
	'completion_rate',
	'coupon_revenue',
	'credit_card_revenue',
	'cumulative_revenue',
	'customers',
	'gift_card_revenue',
	'largest_order',
	'orders',
	'revenue',
	'total_lifetime_value',
];

let tmpPath: string;
let manifestPath: string;

beforeEach(() => {
	tmpPath = mkdtempSync(path.join(tmpdir(), 'semantic-layer-'));
	manifestPath = path.join(tmpPath, 'semantic_manifest.json');
	copyFileSync(FIXTURE_MANIFEST, manifestPath);
});

afterEach(() => {
	rmSync(tmpPath, { recursive: true, force: true });
});

describe('MetricFlowSemanticLayer', () => {
	it('lists metrics with their dimensions', () => {
		const layer = MetricFlowSemanticLayer.load(manifestPath, 'postgres');

		const metrics = Object.fromEntries(layer.listMetrics().map((metric) => [metric.name, metric]));

		expect(new Set(Object.keys(metrics))).toEqual(new Set(['average_order_value', 'orders', 'revenue']));
		expect(metrics.revenue.label).toBe('Revenue');
		expect(metrics.revenue.type).toBe('simple');
		expect(metrics.revenue.semanticModels).toEqual(['orders']);
		expect(metrics.revenue.dimensions).toContain('order__status');
		expect(metrics.revenue.dimensions).toContain('metric_time');
		expect(metrics.average_order_value.type).toBe('ratio');
		expect(metrics.average_order_value.inputMetrics).toEqual(['revenue', 'orders']);
	});

	it('lists dimensions', () => {
		const layer = MetricFlowSemanticLayer.load(manifestPath, 'postgres');

		const dimensions = Object.fromEntries(layer.listDimensions().map((dimension) => [dimension.name, dimension]));

		expect(new Set(Object.keys(dimensions))).toEqual(new Set(['order__ordered_at', 'order__status']));
		expect(dimensions.order__ordered_at.type).toBe('time');
		expect(dimensions.order__ordered_at.granularity).toBe('day');
		expect(dimensions.order__status.description).toBe('Order status');
	});

	it('compiles a grouped and filtered query', () => {
		const layer = MetricFlowSemanticLayer.load(manifestPath, 'postgres');

		const sql = layer.compile({
			metrics: ['revenue', 'orders'],
			groupBy: ['metric_time__month'],
			where: ["{{ Dimension('order__status') }} = 'completed'"],
			orderBy: ['-metric_time__month'],
			limit: 12,
			startTime: '2024-01-01',
		});

		expect(sql).toContain('SUM(revenue) AS revenue');
		expect(sql).toContain('FROM main.orders');
		expect(sql).toContain("DATE_TRUNC('month', ordered_at)");
		expect(sql).toContain("order__status = 'completed'");
		expect(sql).toContain('ORDER BY metric_time__month DESC');
		expect(sql).toContain('LIMIT 12');
		expect(sql).toContain('2024-01-01');
		expect(sql).not.toContain('--');
	});

	it('compiles for Postgres only', () => {
		const postgresSql = MetricFlowSemanticLayer.load(manifestPath, 'postgres').compile({
			metrics: ['revenue'],
			groupBy: ['metric_time__month'],
		});

		expect(postgresSql).toContain("DATE_TRUNC('month', ordered_at)");
		expect(() => MetricFlowSemanticLayer.load(manifestPath, 'bigquery')).toThrow(SemanticLayerError);
		expect(() => MetricFlowSemanticLayer.load(manifestPath, 'bigquery')).toThrow(/postgres only/);
	});

	it('reports suggestions for an unknown metric', () => {
		const layer = MetricFlowSemanticLayer.load(manifestPath, 'postgres');

		expect(() => layer.compile({ metrics: ['revenu'] })).toThrow(SemanticQueryError);
		expect(() => layer.compile({ metrics: ['revenu'] })).toThrow(/'revenue'/);
	});

	it('rejects empty metrics and bad dates', () => {
		const layer = MetricFlowSemanticLayer.load(manifestPath, 'postgres');

		expect(() => layer.compile({ metrics: [] })).toThrow(/at least one metric/);
		expect(() => layer.compile({ metrics: ['revenue'], startTime: 'yesterday-ish' })).toThrow(SemanticQueryError);
		expect(() => layer.compile({ metrics: ['revenue'], startTime: 'yesterday-ish' })).toThrow(/start_time/);
	});

	it('reuses the engine until the manifest changes', () => {
		const first = MetricFlowSemanticLayer.load(manifestPath, 'postgres');

		expect(MetricFlowSemanticLayer.load(manifestPath, 'postgres')).toBe(first);

		const content = readFileSync(manifestPath, 'utf8');
		writeFileSync(manifestPath, content.replace('Total revenue from orders', 'Revenue, in euros'));
		const stat = statSync(manifestPath);
		utimesSync(manifestPath, stat.atime, new Date(stat.mtimeMs + 1000));

		const reloaded = MetricFlowSemanticLayer.load(manifestPath, 'postgres');

		expect(reloaded).not.toBe(first);
		expect(reloaded.listMetrics().map((metric) => metric.description)).toContain('Revenue, in euros');
	});

	it('reports a missing manifest as a setup error', () => {
		let error: unknown;
		try {
			MetricFlowSemanticLayer.load(path.join(tmpPath, 'missing.json'), 'postgres');
		} catch (caught) {
			error = caught;
		}

		expect(error).toBeInstanceOf(SemanticLayerError);
		expect(error).not.toBeInstanceOf(SemanticQueryError);
		expect((error as Error).message).toMatch(/not found/);
	});

	it('rejects a manifest that is not JSON', () => {
		writeFileSync(manifestPath, '{ nope');

		expect(() => MetricFlowSemanticLayer.load(manifestPath, 'postgres')).toThrow(
			/Could not load semantic manifest/,
		);
	});
});

describe('metricflowDialectFor', () => {
	it('maps nao database types to MetricFlow dialects', () => {
		expect(metricflowDialectFor('motherduck')).toBe('duckdb');
		expect(metricflowDialectFor('snowflake')).toBe('snowflake');
		expect(() => metricflowDialectFor('clickhouse')).toThrow(/clickhouse/);
	});
});

describe('runtimeManifestPath', () => {
	it('prefers the synced copy', () => {
		const config = { manifest_path: 'dbt/target/semantic_manifest.json' };

		expect(runtimeManifestPath(config, tmpPath)).toBe(path.resolve(tmpPath, 'dbt/target/semantic_manifest.json'));

		const synced = path.join(tmpPath, SYNCED_MANIFEST_RELATIVE_PATH);
		mkdirSync(path.dirname(synced), { recursive: true });
		writeFileSync(synced, '{}');

		expect(runtimeManifestPath(config, tmpPath)).toBe(synced);
	});
});

describe('example project', () => {
	it('ships a synced manifest whose metrics are the documented ones', () => {
		const layer = MetricFlowSemanticLayer.load(EXAMPLE_MANIFEST, 'postgres');

		expect(layer.listMetrics().map((metric) => metric.name)).toEqual(EXAMPLE_DOCUMENTED_METRICS);
	});
});
