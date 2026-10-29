import { SemanticLayerError } from './errors.js';

/**
 * The parts of dbt's `semantic_manifest.json` (MetricFlow semantic interfaces) quarry compiles. Field names keep the
 * manifest's snake_case so a parsed file is used as-is.
 */
export interface NodeRelation {
	alias: string;
	schema_name: string;
	database?: string | null;
	relation_name?: string | null;
}

export type EntityType = 'primary' | 'unique' | 'natural' | 'foreign';

export interface ManifestEntity {
	name: string;
	type: EntityType;
	expr?: string | null;
	description?: string | null;
	role?: string | null;
}

export type AggregationType =
	'sum' | 'min' | 'max' | 'count' | 'count_distinct' | 'sum_boolean' | 'average' | 'percentile' | 'median';

export interface AggregationParams {
	percentile?: number | null;
	use_discrete_percentile?: boolean | null;
	use_approximate_percentile?: boolean | null;
}

export interface ManifestMeasure {
	name: string;
	agg: AggregationType;
	expr?: string | null;
	description?: string | null;
	label?: string | null;
	create_metric?: boolean | null;
	agg_params?: AggregationParams | null;
	non_additive_dimension?: unknown;
	agg_time_dimension?: string | null;
}

export interface ManifestDimension {
	name: string;
	type: 'categorical' | 'time';
	description?: string | null;
	label?: string | null;
	expr?: string | null;
	is_partition?: boolean | null;
	type_params?: { time_granularity?: string | null; validity_params?: unknown } | null;
}

export interface SemanticModel {
	name: string;
	description?: string | null;
	label?: string | null;
	node_relation: NodeRelation;
	defaults?: { agg_time_dimension?: string | null } | null;
	primary_entity?: string | null;
	entities: ManifestEntity[];
	measures: ManifestMeasure[];
	dimensions: ManifestDimension[];
}

export interface WhereFilterIntersection {
	where_filters: { where_sql_template: string }[];
}

export interface MeasureInput {
	name: string;
	filter?: WhereFilterIntersection | null;
	alias?: string | null;
	join_to_timespine?: boolean | null;
	fill_nulls_with?: number | null;
}

export interface MetricInput {
	name: string;
	filter?: WhereFilterIntersection | null;
	alias?: string | null;
	offset_window?: unknown;
	offset_to_grain?: string | null;
}

/** `{count, granularity}` in manifests; older YAML-style strings (`"7 days"`) are accepted too. */
export type MetricTimeWindow = { count: number; granularity: string } | string;

export type PeriodAggregation = 'first' | 'last' | 'average';

export interface CumulativeTypeParams {
	window?: MetricTimeWindow | null;
	grain_to_date?: string | null;
	period_agg?: PeriodAggregation | null;
}

/** Newer dbt versions define simple metrics without a measure: the aggregation lives on the metric. */
export interface MetricAggregationParams {
	semantic_model: string;
	agg: AggregationType;
	agg_params?: AggregationParams | null;
	agg_time_dimension?: string | null;
	non_additive_dimension?: unknown;
}

export type MetricType = 'simple' | 'ratio' | 'cumulative' | 'derived' | 'conversion';

export interface MetricTypeParams {
	measure?: MeasureInput | null;
	numerator?: MetricInput | null;
	denominator?: MetricInput | null;
	expr?: string | null;
	window?: MetricTimeWindow | null;
	grain_to_date?: string | null;
	metrics?: MetricInput[] | null;
	conversion_type_params?: unknown;
	cumulative_type_params?: CumulativeTypeParams | null;
	input_measures?: MeasureInput[] | null;
	metric_aggregation_params?: MetricAggregationParams | null;
	join_to_timespine?: boolean | null;
	fill_nulls_with?: number | null;
}

export interface ManifestMetric {
	name: string;
	type: MetricType;
	description?: string | null;
	label?: string | null;
	type_params: MetricTypeParams;
	filter?: WhereFilterIntersection | null;
}

export interface TimeSpine {
	node_relation: NodeRelation;
	primary_column: { name: string; time_granularity: string };
}

/** Legacy time spine declaration (`location` is `schema.table`). */
export interface TimeSpineTableConfiguration {
	location: string;
	column_name: string;
	grain: string;
}

export interface SemanticManifest {
	semantic_models: SemanticModel[];
	metrics: ManifestMetric[];
	project_configuration?: {
		time_spines?: TimeSpine[] | null;
		time_spine_table_configurations?: TimeSpineTableConfiguration[] | null;
	} | null;
}

/** Parses and shape-checks a manifest; the checks are the ones the compiler relies on, not a full schema. */
export function parseManifest(json: string, source = 'semantic manifest'): SemanticManifest {
	let raw: unknown;
	try {
		raw = JSON.parse(json);
	} catch (error) {
		throw new SemanticLayerError(`Could not load ${source}: ${(error as Error).message}`);
	}
	const fail = (detail: string): never => {
		throw new SemanticLayerError(`Could not load ${source}: ${detail}`);
	};
	if (!isRecord(raw)) {
		return fail('expected a JSON object.');
	}
	const models = raw.semantic_models ?? [];
	const metrics = raw.metrics ?? [];
	if (!Array.isArray(models)) {
		return fail('`semantic_models` must be a list.');
	}
	if (!Array.isArray(metrics)) {
		return fail('`metrics` must be a list.');
	}
	for (const model of models) {
		if (!isRecord(model) || typeof model.name !== 'string') {
			return fail('every semantic model needs a `name`.');
		}
		if (!isRecord(model.node_relation) || typeof model.node_relation.alias !== 'string') {
			return fail(`semantic model \`${model.name}\` has no \`node_relation\`.`);
		}
		for (const key of ['entities', 'measures', 'dimensions'] as const) {
			model[key] ??= [];
			if (!Array.isArray(model[key]) || !(model[key] as unknown[]).every(hasName)) {
				return fail(`\`${key}\` of semantic model \`${model.name}\` must be a list of named items.`);
			}
		}
	}
	for (const metric of metrics) {
		if (!isRecord(metric) || typeof metric.name !== 'string' || typeof metric.type !== 'string') {
			return fail('every metric needs a `name` and a `type`.');
		}
		metric.type_params ??= {};
		if (!isRecord(metric.type_params)) {
			return fail(`metric \`${metric.name}\` has invalid \`type_params\`.`);
		}
	}
	return raw as unknown as SemanticManifest;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasName(value: unknown): boolean {
	return isRecord(value) && typeof value.name === 'string';
}
