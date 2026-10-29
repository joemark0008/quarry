import { SemanticLayerError } from './errors.js';
import type {
	ManifestDimension,
	ManifestEntity,
	ManifestMeasure,
	ManifestMetric,
	MeasureInput,
	SemanticManifest,
	SemanticModel,
} from './manifest.js';
import { type Grain, toGrain } from './time.js';

/** A measure as an aggregation source: its model, definition and the metric-level input options. */
export interface ResolvedMeasure {
	model: SemanticModel;
	measure: ManifestMeasure;
	input: MeasureInput;
}

/** A dimension reachable from a model: on the model itself, or one join away through `entity`. */
export interface ReachableDimension {
	/** Granularity-free name, `entity__dimension`. */
	name: string;
	entity: string;
	model: SemanticModel;
	dimension: ManifestDimension;
	local: boolean;
}

export interface TimeSpineSource {
	relation: string;
	column: string;
	grain: Grain;
}

/** Port of the lookups MetricFlow's `SemanticManifestLookup` provides, for the subset quarry compiles. */
export class SemanticManifestLookup {
	readonly models = new Map<string, SemanticModel>();
	readonly metrics = new Map<string, ManifestMetric>();
	readonly measures = new Map<string, { model: SemanticModel; measure: ManifestMeasure }>();
	private readonly reachable = new Map<string, Map<string, ReachableDimension>>();

	constructor(readonly manifest: SemanticManifest) {
		for (const model of manifest.semantic_models) {
			this.models.set(model.name, model);
			for (const measure of model.measures) {
				this.measures.set(measure.name, { model, measure });
			}
		}
		for (const metric of manifest.metrics) {
			this.metrics.set(metric.name, metric);
		}
		// `create_metric: true` measures are simple metrics of the same name.
		for (const { measure } of this.measures.values()) {
			if (measure.create_metric && !this.metrics.has(measure.name)) {
				this.metrics.set(measure.name, {
					name: measure.name,
					type: 'simple',
					label: measure.label ?? null,
					description: measure.description ?? null,
					type_params: { measure: { name: measure.name } },
				});
			}
		}
	}

	/** Entities that identify a row of the model (not foreign keys), so its dimensions are named after them. */
	identityEntities(model: SemanticModel): string[] {
		const names = model.entities.filter((entity) => entity.type !== 'foreign').map((entity) => entity.name);
		if (model.primary_entity && !names.includes(model.primary_entity)) {
			names.push(model.primary_entity);
		}
		return names;
	}

	entity(model: SemanticModel, name: string): ManifestEntity | undefined {
		return model.entities.find((entity) => entity.name === name);
	}

	/** Every dimension a measure of this model can be grouped by, local ones winning over joined ones. */
	reachableDimensions(model: SemanticModel): Map<string, ReachableDimension> {
		const cached = this.reachable.get(model.name);
		if (cached) {
			return cached;
		}
		const dimensions = new Map<string, ReachableDimension>();
		for (const entity of this.identityEntities(model)) {
			for (const dimension of model.dimensions) {
				const name = `${entity}__${dimension.name}`;
				dimensions.set(name, { name, entity, model, dimension, local: true });
			}
		}
		for (const entity of model.entities) {
			for (const other of this.models.values()) {
				if (other === model || !this.joinableThrough(other, entity.name)) {
					continue;
				}
				for (const dimension of other.dimensions) {
					const name = `${entity.name}__${dimension.name}`;
					if (!dimensions.has(name)) {
						dimensions.set(name, { name, entity: entity.name, model: other, dimension, local: false });
					}
				}
			}
		}
		this.reachable.set(model.name, dimensions);
		return dimensions;
	}

	/** A model can be joined on an entity it identifies with a key column (never foreign to foreign). */
	joinableThrough(model: SemanticModel, entityName: string): boolean {
		const entity = this.entity(model, entityName);
		return entity !== undefined && entity.type !== 'foreign';
	}

	/** Every `entity__dimension` declared on a model under one of its identity entities. */
	allDimensions(): ReachableDimension[] {
		const dimensions = new Map<string, ReachableDimension>();
		for (const model of this.models.values()) {
			for (const entity of this.identityEntities(model)) {
				for (const dimension of model.dimensions) {
					const name = `${entity}__${dimension.name}`;
					if (!dimensions.has(name)) {
						dimensions.set(name, { name, entity, model, dimension, local: true });
					}
				}
			}
		}
		return [...dimensions.values()];
	}

	/** The measure a simple or cumulative metric aggregates. */
	metricMeasure(metric: ManifestMetric): ResolvedMeasure {
		const params = metric.type_params;
		if (params.measure) {
			const found = this.measures.get(params.measure.name);
			if (!found) {
				throw new SemanticLayerError(
					`Metric \`${metric.name}\` uses the unknown measure \`${params.measure.name}\`.`,
				);
			}
			return { ...found, input: params.measure };
		}
		const aggregation = params.metric_aggregation_params;
		if (aggregation) {
			const model = this.models.get(aggregation.semantic_model);
			if (!model) {
				throw new SemanticLayerError(
					`Metric \`${metric.name}\` uses the unknown semantic model \`${aggregation.semantic_model}\`.`,
				);
			}
			return {
				model,
				measure: {
					name: metric.name,
					agg: aggregation.agg,
					expr: params.expr ?? metric.name,
					agg_params: aggregation.agg_params ?? null,
					agg_time_dimension: aggregation.agg_time_dimension ?? null,
					non_additive_dimension: aggregation.non_additive_dimension ?? null,
				},
				input: {
					name: metric.name,
					join_to_timespine: params.join_to_timespine ?? null,
					fill_nulls_with: params.fill_nulls_with ?? null,
				},
			};
		}
		throw new SemanticLayerError(`Metric \`${metric.name}\` has no measure to aggregate.`);
	}

	/** The measures a metric is ultimately computed from, through ratio and derived inputs. */
	baseMeasures(metric: ManifestMetric, seen = new Set<string>()): ResolvedMeasure[] {
		if (seen.has(metric.name)) {
			throw new SemanticLayerError(`Metric \`${metric.name}\` refers to itself.`);
		}
		const next = new Set(seen).add(metric.name);
		const params = metric.type_params;
		if (metric.type === 'simple' || metric.type === 'cumulative') {
			return [this.metricMeasure(metric)];
		}
		const inputs = [...(params.metrics ?? []), params.numerator, params.denominator].filter(
			(input) => input !== null && input !== undefined,
		);
		return inputs.flatMap((input) => {
			const inputMetric = this.metrics.get(input.name);
			if (!inputMetric) {
				throw new SemanticLayerError(`Metric \`${metric.name}\` uses the unknown metric \`${input.name}\`.`);
			}
			return this.baseMeasures(inputMetric, next);
		});
	}

	/** The time dimension `metric_time` stands for when aggregating this measure. */
	aggTimeDimension(resolved: ResolvedMeasure): ManifestDimension | null {
		const name = resolved.measure.agg_time_dimension ?? resolved.model.defaults?.agg_time_dimension;
		if (!name) {
			return null;
		}
		const dimension = resolved.model.dimensions.find((candidate) => candidate.name === name);
		if (!dimension || dimension.type !== 'time') {
			throw new SemanticLayerError(
				`Semantic model \`${resolved.model.name}\` has no time dimension \`${name}\` to use as metric_time.`,
			);
		}
		return dimension;
	}

	timeSpine(): TimeSpineSource | null {
		const configuration = this.manifest.project_configuration;
		const spine =
			configuration?.time_spines?.find(
				(candidate) => toGrain(candidate.primary_column.time_granularity) === 'day',
			) ?? configuration?.time_spines?.[0];
		if (spine) {
			return {
				relation: relationName(spine.node_relation),
				column: spine.primary_column.name,
				grain: toGrain(spine.primary_column.time_granularity),
			};
		}
		const legacy = configuration?.time_spine_table_configurations?.[0];
		if (legacy) {
			return { relation: legacy.location, column: legacy.column_name, grain: toGrain(legacy.grain) };
		}
		return null;
	}
}

export function relationName(relation: SemanticModel['node_relation']): string {
	if (relation.relation_name) {
		return relation.relation_name;
	}
	return relation.schema_name ? `${relation.schema_name}.${relation.alias}` : relation.alias;
}

export function dimensionGrain(dimension: ManifestDimension): Grain {
	return toGrain(dimension.type_params?.time_granularity);
}
