import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { syncSemanticLayerProvider } from './semantic-layer-sync.js';

// Port of upstream `cli/tests/upstream_core/semantic_layer/test_sync_provider.py`, plus a byte-for-byte comparison with
// the docs upstream's Python sync generated for its example project. `test_provider_only_syncs_when_configured`
// covered the Python provider registry; quarry's context sync only calls the provider when `semantic_layer` is set.
const FIXTURES = path.join(import.meta.dirname, 'metricflow/__fixtures__');
const FIXTURE_MANIFEST = path.join(FIXTURES, 'semantic_manifest.json');
const UPSTREAM_EXAMPLE = path.join(import.meta.dirname, '../../../../../fork-reference/example');

/** The two README lines that name the product differ from upstream on purpose. */
function withoutProductName(content: string): string {
	return content.replace(/^(Synced from the|Query metrics with the) .*$/gm, '');
}

const dirs: string[] = [];

afterEach(() => {
	while (dirs.length > 0) {
		rmSync(dirs.pop() as string, { recursive: true, force: true });
	}
});

function projectWithManifest(manifest = FIXTURE_MANIFEST, relativePath = 'dbt/target/semantic_manifest.json') {
	const project = mkdtempSync(path.join(tmpdir(), 'quarry-semantic-sync-'));
	dirs.push(project);
	mkdirSync(path.dirname(path.join(project, relativePath)), { recursive: true });
	cpSync(manifest, path.join(project, relativePath));
	return project;
}

const semanticLayer = { type: 'metricflow' as const, manifest_path: 'dbt/target/semantic_manifest.json' };

describe('semantic layer sync', () => {
	it('writes the manifest copy and the docs', () => {
		const project = projectWithManifest();
		const output = path.join(project, 'semantics');
		mkdirSync(path.join(output, 'metrics'), { recursive: true });
		writeFileSync(path.join(output, 'metrics', 'stale_metric.md'), 'old');
		writeFileSync(path.join(output, 'my_notes.md'), 'keep me');

		const result = syncSemanticLayerProvider(semanticLayer, project, output);

		expect(result.success).toBe(true);
		expect(result.itemsSynced).toBe(3);
		expect(readFileSync(path.join(project, '.meta/semantic_layer/semantic_manifest.json'), 'utf8')).toBe(
			readFileSync(FIXTURE_MANIFEST, 'utf8'),
		);
		expect(readdirSync(path.join(output, 'metrics')).sort()).toEqual([
			'average_order_value.md',
			'orders.md',
			'revenue.md',
		]);
		expect(readFileSync(path.join(output, 'my_notes.md'), 'utf8')).toBe('keep me');

		const revenueDoc = readFileSync(path.join(output, 'metrics', 'revenue.md'), 'utf8');
		expect(revenueDoc).toContain('# revenue');
		expect(revenueDoc).toContain('**Label:** Revenue');
		expect(revenueDoc).toContain('Total revenue from orders');
		expect(revenueDoc).toContain('- `order__status`');
		expect(revenueDoc).toContain('{"metrics": ["revenue"], "group_by": ["metric_time__month"]');
		expect(revenueDoc).toContain("{{ Dimension('order__ordered_at') }} IS NOT NULL");
		expect(revenueDoc).toContain('"order_by": ["-revenue"], "limit": 10}');

		const ratioDoc = readFileSync(path.join(output, 'metrics', 'average_order_value.md'), 'utf8');
		expect(ratioDoc).toContain('**Type:** ratio');
		expect(ratioDoc).toContain('**Input metrics:** `revenue`, `orders`');

		const dimensionsDoc = readFileSync(path.join(output, 'dimensions.md'), 'utf8');
		expect(dimensionsDoc).toContain('| `order__status` | categorical |  | `orders` | Order status |');
		expect(dimensionsDoc).toContain('| `order__ordered_at` | time | day | `orders` |  |');

		const readme = readFileSync(path.join(output, 'README.md'), 'utf8');
		expect(readme).toContain('3 metrics');
		for (const parameter of [
			'`metrics`',
			'`group_by`',
			'`where`',
			'`order_by`',
			'`limit`',
			'`start_time`, `end_time`',
		]) {
			expect(readme).toContain(`| ${parameter} |`);
		}
	});

	it('keeps the last good manifest when the source is broken', () => {
		const project = projectWithManifest();
		const output = path.join(project, 'semantics');
		syncSemanticLayerProvider(semanticLayer, project, output);
		writeFileSync(path.join(project, 'dbt/target/semantic_manifest.json'), '{ not json');

		const result = syncSemanticLayerProvider(semanticLayer, project, output);

		expect(result.success).toBe(false);
		expect(readFileSync(path.join(project, '.meta/semantic_layer/semantic_manifest.json'), 'utf8')).toBe(
			readFileSync(FIXTURE_MANIFEST, 'utf8'),
		);
	});

	it('reports a missing manifest', () => {
		const project = mkdtempSync(path.join(tmpdir(), 'quarry-semantic-sync-'));
		dirs.push(project);

		const result = syncSemanticLayerProvider(
			{ type: 'metricflow', manifest_path: 'nowhere/semantic_manifest.json' },
			project,
			path.join(project, 'semantics'),
		);

		expect(result.success).toBe(false);
		expect(result.error).toContain('not found');
	});

	// Needs the read-only upstream clone next to quarry (`../fork-reference`).
	it.skipIf(!existsSync(UPSTREAM_EXAMPLE))(
		"generates the same docs as upstream's Python sync for the example project",
		() => {
			const manifestPath = './repos/dbt/target/semantic_manifest.json';
			const project = projectWithManifest(path.join(FIXTURES, 'example_semantic_manifest.json'), manifestPath);
			const output = path.join(project, 'semantics');

			syncSemanticLayerProvider({ type: 'metricflow', manifest_path: manifestPath }, project, output);

			const upstream = path.join(UPSTREAM_EXAMPLE, 'semantics');
			const files = [
				'README.md',
				'dimensions.md',
				...readdirSync(path.join(upstream, 'metrics')).map((f) => `metrics/${f}`),
			];
			expect(readdirSync(path.join(output, 'metrics')).sort()).toEqual(
				readdirSync(path.join(upstream, 'metrics')).sort(),
			);
			for (const file of files) {
				expect(withoutProductName(readFileSync(path.join(output, file), 'utf8')), file).toBe(
					withoutProductName(readFileSync(path.join(upstream, file), 'utf8')),
				);
			}
		},
	);
});
