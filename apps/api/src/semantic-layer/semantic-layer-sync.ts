import { copyFileSync, existsSync, mkdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
	type DimensionInfo,
	MetricFlowSemanticLayer,
	type MetricInfo,
	resolveManifestPath,
	type SemanticLayerConfig,
	SemanticLayerError,
	SYNCED_MANIFEST_RELATIVE_PATH,
} from './metricflow/index.js';

const METRICS_DIR = 'metrics';
const DIMENSIONS_FILENAME = 'dimensions.md';
const README_FILENAME = 'README.md';
export const SEMANTICS_OUTPUT_DIR = 'semantics';

export interface SemanticLayerSyncResult {
	success: boolean;
	itemsSynced: number;
	summary?: string;
	error?: string;
}

/**
 * Port of upstream `upstream_core/commands/sync/providers/semantic_layer/provider.py` (`SemanticLayerSyncProvider.sync`):
 * part of the in-app context sync. A broken manifest leaves the last good copy and docs in place.
 */
export function syncSemanticLayerProvider(
	semanticLayer: SemanticLayerConfig,
	projectPath: string,
	outputPath: string = path.join(projectPath, SEMANTICS_OUTPUT_DIR),
): SemanticLayerSyncResult {
	try {
		const { metrics, dimensions } = syncSemanticLayer(semanticLayer, projectPath, outputPath);
		return {
			success: true,
			itemsSynced: metrics.length,
			summary: `${metrics.length} metrics, ${dimensions.length} dimensions`,
		};
	} catch (error) {
		if (error instanceof SemanticLayerError) {
			return { success: false, itemsSynced: 0, error: error.message };
		}
		throw error;
	}
}

/** Copy the manifest under `.meta/` and regenerate the metric and dimension docs. */
export function syncSemanticLayer(
	semanticLayer: SemanticLayerConfig,
	projectPath: string,
	outputPath: string,
): { metrics: MetricInfo[]; dimensions: DimensionInfo[] } {
	const sourceManifest = resolveManifestPath(semanticLayer, projectPath);
	if (!isFile(sourceManifest)) {
		throw new SemanticLayerError(
			`Semantic manifest not found at ${sourceManifest}. Run \`dbt parse\` and check \`semantic_layer.manifest_path\`.`,
		);
	}

	// Listing metrics does not render SQL, so the dialect does not matter; quarry compiles Postgres only.
	const engine = MetricFlowSemanticLayer.load(sourceManifest, 'postgres');
	const metrics = engine.listMetrics();
	const dimensions = engine.listDimensions();

	mkdirSync(outputPath, { recursive: true });
	const manifestCopy = path.join(projectPath, SYNCED_MANIFEST_RELATIVE_PATH);
	mkdirSync(path.dirname(manifestCopy), { recursive: true });
	if (!isSameFile(sourceManifest, manifestCopy)) {
		copyFileSync(sourceManifest, manifestCopy);
	}

	writeMetricDocs(path.join(outputPath, METRICS_DIR), metrics);
	writeFileSync(path.join(outputPath, DIMENSIONS_FILENAME), renderDimensionsIndex(dimensions));
	writeFileSync(
		path.join(outputPath, README_FILENAME),
		renderReadme(semanticLayer, metrics.length, dimensions.length),
	);
	return { metrics, dimensions };
}

export function renderMetricDoc(metric: MetricInfo): string {
	const lines = [`# ${metric.name}`, ''];
	if (metric.label && metric.label !== metric.name) {
		lines.push(`**Label:** ${metric.label}  `);
	}
	lines.push(`**Type:** ${metric.type}  `);
	if (metric.description) {
		lines.push(`**Description:** ${metric.description}  `);
	}
	if (metric.expr) {
		lines.push(`**Expression:** \`${metric.expr}\`  `);
	}
	if (metric.inputMetrics.length > 0) {
		lines.push(`**Input metrics:** ${metric.inputMetrics.map((name) => `\`${name}\``).join(', ')}  `);
	}
	if (metric.semanticModels.length > 0) {
		lines.push(`**Semantic models:** ${metric.semanticModels.map((name) => `\`${name}\``).join(', ')}  `);
	}

	lines.push('', '## Dimensions', '');
	lines.push(
		'Group by or filter this metric with any of the dimensions below. `metric_time` accepts a granularity ' +
			'suffix: `metric_time__day`, `metric_time__week`, `metric_time__month`, `metric_time__quarter`, ' +
			'`metric_time__year`.',
	);
	lines.push('');
	lines.push(...metric.dimensions.map((dimension) => `- \`${dimension}\``));

	lines.push('', '## Query', '');
	lines.push('Over time:');
	lines.push('```json');
	lines.push(
		`{"metrics": ["${metric.name}"], "group_by": ["metric_time__month"], "order_by": ["metric_time__month"]}`,
	);
	lines.push('```');
	lines.push('');
	lines.push('Broken down, filtered and ranked (see `../README.md` for every parameter):');
	lines.push('```json');
	lines.push(pythonJsonDumps(filteredQueryExample(metric)));
	lines.push('```');
	return `${lines.join('\n')}\n`;
}

export function renderDimensionsIndex(dimensions: DimensionInfo[]): string {
	const lines = [
		'# Dimensions',
		'',
		'Every dimension exposed by the semantic layer, named `entity__dimension` as expected by ' +
			'`execute_semantic_query`. Time dimensions accept a granularity suffix (e.g. `booking__ds__month`).',
		'',
		'| Dimension | Type | Granularity | Semantic model | Description |',
		'| --- | --- | --- | --- | --- |',
	];
	for (const dimension of dimensions) {
		const cells = [
			`\`${dimension.name}\``,
			dimension.type,
			dimension.granularity ?? '',
			dimension.semanticModel ? `\`${dimension.semanticModel}\`` : '',
			escapeTableCell(dimension.description),
		];
		lines.push(`| ${cells.join(' | ')} |`);
	}
	return `${lines.join('\n')}\n`;
}

export function renderReadme(semanticLayer: SemanticLayerConfig, metricCount: number, dimensionCount: number): string {
	return (
		'# Semantic layer\n' +
		'\n' +
		`Synced from the ${semanticLayer.type ?? 'metricflow'} manifest at \`${semanticLayer.manifest_path}\` by \`context sync\`. ` +
		'Do not edit generated files, they are rewritten on every sync.\n' +
		'\n' +
		`- \`${METRICS_DIR}/<metric>.md\` — one file per metric (${metricCount} metrics): definition, type and the ` +
		'dimensions it can be grouped or filtered by.\n' +
		`- \`${DIMENSIONS_FILENAME}\` — index of every dimension (${dimensionCount} dimensions).\n` +
		'\n' +
		'Query metrics with the `execute_semantic_query` tool: quarry compiles the governed definition to SQL with ' +
		'MetricFlow and runs it on the configured database.\n' +
		'\n' +
		'## Query parameters\n' +
		'\n' +
		'The examples below use illustrative names; the metrics and dimensions of this project are the ones ' +
		`listed in \`${METRICS_DIR}/\` and \`${DIMENSIONS_FILENAME}\`.\n` +
		'\n' +
		'| Parameter | Meaning | Example |\n' +
		'| --- | --- | --- |\n' +
		'| `metrics` | Metric names to compute (required, one or more). | `["revenue", "orders"]` |\n' +
		'| `group_by` | Dimensions or entities to break down by, as `entity__dimension`. Time dimensions take a ' +
		"granularity suffix: `day`, `week`, `month`, `quarter`, `year`. `metric_time` is the metric's own time " +
		'axis and works for every metric. | `["metric_time__month", "customer__region"]` |\n' +
		'| `where` | SQL filters, ANDed together. Wrap every model field in a template so MetricFlow resolves the ' +
		"joins: `Dimension('entity__dimension')`, `TimeDimension('metric_time', 'day')`, `Entity('entity')`, " +
		"`Metric('metric', group_by=['entity'])`. Bare column names are not resolved and fail. | " +
		"`[\"{{ Dimension('order__status') }} = 'completed'\", \"{{ TimeDimension('metric_time', 'day') }} >= " +
		"'2024-01-01'\"]` |\n" +
		'| `order_by` | Metrics or `group_by` items to sort by; prefix with `-` for descending. | ' +
		'`["-revenue", "metric_time__month"]` |\n' +
		'| `limit` | Maximum number of rows. | `10` |\n' +
		'| `start_time`, `end_time` | Inclusive ISO dates bounding `metric_time`. Simpler than a `where` for plain ' +
		'date ranges; combine with `where` for anything else. | `"2024-01-01"`, `"2024-12-31"` |\n' +
		'\n' +
		'Filter on a metric to keep only entities above a threshold, e.g. customers who spent more than 100: ' +
		'`{"metrics": ["revenue"], "group_by": ["customer__name"], ' +
		'"where": ["{{ Metric(\'revenue\', group_by=[\'customer\']) }} > 100"]}`.\n' +
		'\n' +
		'Only metrics are queryable: measures are building blocks and are exposed as metrics either explicitly or ' +
		'with `create_metric: true` in the semantic model.\n'
	);
}

function writeMetricDocs(metricsDir: string, metrics: MetricInfo[]): void {
	rmSync(metricsDir, { recursive: true, force: true });
	mkdirSync(metricsDir, { recursive: true });
	for (const metric of metrics) {
		writeFileSync(path.join(metricsDir, `${metric.name}.md`), renderMetricDoc(metric));
	}
}

/** A query using one of the metric's own dimensions, so the example is copy-pasteable. */
function filteredQueryExample(metric: MetricInfo): Record<string, unknown> {
	const dimension = metric.dimensions.find((name) => name !== 'metric_time');
	if (!dimension) {
		return {
			metrics: [metric.name],
			group_by: ['metric_time__year'],
			order_by: [`-${metric.name}`],
			limit: 10,
		};
	}
	return {
		metrics: [metric.name],
		group_by: [dimension],
		where: [`{{ Dimension('${dimension}') }} IS NOT NULL`],
		order_by: [`-${metric.name}`],
		limit: 10,
	};
}

/** Python's `json.dumps` separators (`", "`, `": "`), so the docs are byte-identical to upstream's. */
function pythonJsonDumps(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map(pythonJsonDumps).join(', ')}]`;
	}
	if (value !== null && typeof value === 'object') {
		return `{${Object.entries(value)
			.map(([key, item]) => `${JSON.stringify(key)}: ${pythonJsonDumps(item)}`)
			.join(', ')}}`;
	}
	return JSON.stringify(value);
}

function escapeTableCell(value: string | null): string {
	if (!value) {
		return '';
	}
	return value.split(/\s+/).filter(Boolean).join(' ').replaceAll('|', '\\|');
}

function isFile(filePath: string): boolean {
	try {
		return statSync(filePath).isFile();
	} catch {
		return false;
	}
}

function isSameFile(first: string, second: string): boolean {
	return existsSync(second) && realpathSync(first) === realpathSync(second);
}
