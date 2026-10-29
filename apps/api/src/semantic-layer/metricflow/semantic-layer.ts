/**
 * Port of upstream `cli/nao_core/semantic_layer/metricflow.py`. Upstream uses MetricFlow (Python) as a SQL compiler
 * only; quarry has no Python, so `compiler.ts` compiles the manifest subset itself, for Postgres. The compiled SQL is
 * handed to the regular `execute_sql` pipeline, so credentials, allow-listing and column guards stay in one place.
 */
import { readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

import { QueryCompiler, type SemanticQuery } from './compiler.js';
import { SemanticLayerError } from './errors.js';
import { dimensionGrain, SemanticManifestLookup } from './lookup.js';
import { type ManifestMetric, parseManifest } from './manifest.js';

export type { SemanticQuery } from './compiler.js';

/** nao database types → MetricFlow SQL renderer. Types absent here have no MetricFlow renderer. */
export const METRICFLOW_DIALECTS: Record<string, string> = {
	athena: 'athena',
	bigquery: 'bigquery',
	databricks: 'databricks',
	duckdb: 'duckdb',
	motherduck: 'duckdb',
	postgres: 'postgres',
	redshift: 'redshift',
	snowflake: 'snowflake',
	trino: 'trino',
};

/** The dialects quarry's own compiler renders (quarry's only warehouse driver is Postgres). */
export const SUPPORTED_DIALECTS = ['postgres'];

/**
 * Where context sync copies the manifest so the runtime never depends on the dbt project being around.
 * `.meta/` is hidden from the agent's file tools: the manifest is an engine artifact, not context.
 */
export const SYNCED_MANIFEST_RELATIVE_PATH = path.join('.meta', 'semantic_layer', 'semantic_manifest.json');

/** The `semantic_layer` block of `quarry_config.yaml`. */
export interface SemanticLayerConfig {
	type?: 'metricflow';
	manifest_path: string;
	database?: string | null;
}

export interface DimensionInfo {
	name: string;
	type: string;
	description: string | null;
	semanticModel: string | null;
	granularity: string | null;
}

export interface MetricInfo {
	name: string;
	label: string | null;
	description: string | null;
	type: string;
	expr: string | null;
	inputMetrics: string[];
	semanticModels: string[];
	dimensions: string[];
}

/** Resolve `manifest_path` against the project folder. */
export function resolveManifestPath(config: SemanticLayerConfig, projectPath: string): string {
	const manifestPath = config.manifest_path.replace(/^~(?=$|[/\\])/, homedir());
	return path.isAbsolute(manifestPath) ? manifestPath : path.resolve(projectPath, manifestPath);
}

/** Prefer the synced copy of the manifest, falling back to the configured source path. */
export function runtimeManifestPath(config: SemanticLayerConfig, projectPath: string): string {
	const synced = path.join(projectPath, SYNCED_MANIFEST_RELATIVE_PATH);
	if (isFile(synced)) {
		return synced;
	}
	return resolveManifestPath(config, projectPath);
}

/** Map a nao database type to the MetricFlow dialect that renders SQL for it. */
export function metricflowDialectFor(databaseType: string): string {
	const dialect = METRICFLOW_DIALECTS[databaseType];
	if (dialect === undefined) {
		const supported = Object.keys(METRICFLOW_DIALECTS).sort().join(', ');
		throw new SemanticLayerError(
			`The semantic layer cannot compile SQL for \`${databaseType}\` databases. Supported types: ${supported}.`,
		);
	}
	return dialect;
}

const ENGINES = new Map<string, MetricFlowSemanticLayer>();

/** A loaded `semantic_manifest.json`, able to describe itself and compile queries for one SQL dialect. */
export class MetricFlowSemanticLayer {
	private readonly lookup: SemanticManifestLookup;

	constructor(
		readonly manifestPath: string,
		readonly dialect: string,
		manifestJson: string = readFileSync(manifestPath, 'utf8'),
	) {
		if (!SUPPORTED_DIALECTS.includes(dialect)) {
			throw new SemanticLayerError(
				`quarry's semantic layer compiles SQL for ${SUPPORTED_DIALECTS.join(', ')} only, not \`${dialect}\`.`,
			);
		}
		this.lookup = new SemanticManifestLookup(parseManifest(manifestJson, `semantic manifest ${manifestPath}`));
	}

	/** Load the manifest, reusing a cached engine until the file changes on disk. */
	static load(manifestPath: string, dialect: string): MetricFlowSemanticLayer {
		const resolved = path.resolve(manifestPath);
		if (!isFile(resolved)) {
			throw new SemanticLayerError(
				`Semantic manifest not found at ${resolved}. Sync the project context after \`dbt parse\`.`,
			);
		}
		const key = `${resolved}\0${statSync(resolved, { bigint: true }).mtimeNs}\0${dialect}`;
		let engine = ENGINES.get(key);
		if (!engine) {
			evictStaleEngines(resolved, dialect);
			engine = new MetricFlowSemanticLayer(resolved, dialect);
			ENGINES.set(key, engine);
		}
		return engine;
	}

	listMetrics(): MetricInfo[] {
		return [...this.lookup.metrics.values()]
			.map((metric) => this.metricInfo(metric))
			.sort((a, b) => compare(a.name, b.name));
	}

	listDimensions(): DimensionInfo[] {
		return this.lookup
			.allDimensions()
			.map(({ name, dimension, model }) => ({
				name,
				type: dimension.type,
				description: dimension.description ?? null,
				semanticModel: model.name,
				granularity: dimension.type === 'time' ? dimensionGrain(dimension) : null,
			}))
			.sort((a, b) => compare(a.name, b.name));
	}

	/** Compile a semantic query to SQL without executing it. */
	compile(query: SemanticQuery): string {
		return new QueryCompiler(this.lookup).compile(query).trim();
	}

	private metricInfo(metric: ManifestMetric): MetricInfo {
		const params = metric.type_params;
		const measures = this.lookup.baseMeasures(metric);
		const reachable = measures.map(({ model }) => new Set(this.lookup.reachableDimensions(model).keys()));
		const dimensions = reachable.length
			? [...reachable[0]].filter((name) => reachable.every((names) => names.has(name)))
			: [];
		const inputs = [...(params.metrics ?? []), params.numerator, params.denominator].filter(
			(input) => input !== null && input !== undefined,
		);
		return {
			name: metric.name,
			label: metric.label ?? null,
			description: metric.description ?? null,
			type: metric.type,
			expr: metric.type !== 'simple' ? (params.expr ?? null) : null,
			inputMetrics: inputs.map((input) => input.name),
			semanticModels: [...new Set(measures.map(({ model }) => model.name))].sort(compare),
			dimensions: [...dimensions, 'metric_time'].sort(compare),
		};
	}
}

/** Drop the engines built from older versions of this manifest for this dialect, keeping other projects cached. */
function evictStaleEngines(manifestPath: string, dialect: string): void {
	for (const key of ENGINES.keys()) {
		const [cachedPath, , cachedDialect] = key.split('\0');
		if (cachedPath === manifestPath && cachedDialect === dialect) {
			ENGINES.delete(key);
		}
	}
}

function isFile(filePath: string): boolean {
	try {
		return statSync(filePath).isFile();
	} catch {
		return false;
	}
}

/** Python's default string ordering (code points), so lists match upstream's `sorted`. */
function compare(a: string, b: string): number {
	return a < b ? -1 : a > b ? 1 : 0;
}
