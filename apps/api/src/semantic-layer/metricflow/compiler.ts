import { SemanticLayerError, SemanticQueryError } from './errors.js';
import { dimensionGrain, relationName, type ResolvedMeasure, type SemanticManifestLookup } from './lookup.js';
import type {
	CumulativeTypeParams,
	ManifestMetric,
	MetricInput,
	MetricTimeWindow,
	PeriodAggregation,
	WhereFilterIntersection,
} from './manifest.js';
import { andAll, indent, isIdentifier, quoteLiteral, renderSelect, subquery } from './sql.js';
import { resolutionErrorMessage, suggest } from './suggestions.js';
import {
	endOfPeriod,
	formatQueryTime,
	type Grain,
	grainRank,
	isGrain,
	parseQueryTime,
	startOfPeriod,
	toGrain,
} from './time.js';
import { type FilterReference, filterReferences, type ParsedFilter, parseWhereFilter } from './where-filter.js';

/** A metric query in semantic terms, mirroring the `mf query` flags. */
export interface SemanticQuery {
	metrics: string[];
	groupBy?: string[];
	where?: string[];
	orderBy?: string[];
	limit?: number | null;
	startTime?: string | null;
	endTime?: string | null;
}

/** A group-by or filter item resolved to the column alias MetricFlow gives it. */
interface Item {
	alias: string;
	kind: 'metric_time' | 'dimension' | 'entity' | 'metric';
	input: string;
	grain?: Grain;
	/** `entity__dimension` for dimensions, the entity name for entities. */
	name?: string;
	metric?: string;
	groupBy?: string[];
}

interface Compiled {
	sql: string;
	value: string;
}

interface MetricContext {
	filters: ParsedFilter[];
	/** Formatted `BETWEEN` bounds on the aggregation time, or null without start_time / end_time. */
	constraint: { start: string; end: string } | null;
}

type ColumnRef = { source: 'base'; expr: string } | { source: 'join'; alias: string; column: string };

/** MetricFlow's defaults for an open-ended time constraint. */
const UNBOUNDED_START = '2000-01-01';
const UNBOUNDED_END = '2040-12-31';

/**
 * Compiles one semantic query to Postgres SQL. Each metric becomes a subquery over its measure's semantic model
 * (joined one hop through entities), filters are applied on aliases in a wrapping query as MetricFlow does, and
 * several metrics are merged with a FULL OUTER JOIN on the group-by columns.
 */
export class QueryCompiler {
	private subqueryCount = 0;
	private defaultGrain: Grain = 'day';

	constructor(private readonly lookup: SemanticManifestLookup) {}

	compile(query: SemanticQuery): string {
		const metrics = [...new Set(query.metrics ?? [])];
		if (metrics.length === 0) {
			throw new SemanticQueryError('A semantic query needs at least one metric.');
		}
		for (const name of metrics) {
			this.requireMetric(name, 'The given input does not exactly match any known metrics.');
		}
		this.defaultGrain = this.metricTimeGrain(metrics);

		const groupBy = dedupe((query.groupBy ?? []).map((name) => this.groupByItem(name, metrics)));
		const context: MetricContext = {
			filters: (query.where ?? []).map(parseWhereFilter),
			constraint: this.timeConstraint(query, groupBy),
		};
		const parts = metrics.map((name) => this.compileMetric(name, name, groupBy, context));
		const lines = [this.combine(parts, groupBy).sql];

		const orderBy = (query.orderBy ?? []).map((item) => this.orderByItem(item, metrics, groupBy));
		if (orderBy.length > 0) {
			lines.push(`ORDER BY ${orderBy.join(', ')}`);
		}
		if (query.limit !== undefined && query.limit !== null) {
			if (!Number.isInteger(query.limit) || query.limit < 0) {
				throw new SemanticQueryError(`Invalid limit \`${query.limit}\`: use a non-negative integer.`);
			}
			lines.push(`LIMIT ${query.limit}`);
		}
		return lines.join('\n');
	}

	// --- metrics -----------------------------------------------------------------------------------------------

	private compileMetric(name: string, output: string, groupBy: Item[], context: MetricContext): Compiled {
		const metric = this.requireMetric(name, 'The given input does not exactly match any known metrics.');
		const scoped: MetricContext = { ...context, filters: [...context.filters, ...parseFilters(metric.filter)] };
		switch (metric.type) {
			case 'simple':
				return this.compileMeasure(metric, this.lookup.metricMeasure(metric), output, groupBy, scoped);
			case 'cumulative': {
				const measure = this.lookup.metricMeasure(metric);
				return groupBy.some((item) => item.kind === 'metric_time')
					? this.compileCumulative(metric, measure, output, groupBy, scoped)
					: this.compileMeasure(metric, measure, output, groupBy, scoped);
			}
			case 'ratio':
				return this.compileRatio(metric, output, groupBy, scoped);
			case 'derived':
				return this.compileDerived(metric, output, groupBy, scoped);
			case 'conversion':
				throw new SemanticLayerError(
					`Metric \`${metric.name}\` is a conversion metric, which quarry's semantic layer does not support yet.`,
				);
			default:
				throw new SemanticLayerError(
					`Metric \`${metric.name}\` has the unknown type \`${String(metric.type)}\`.`,
				);
		}
	}

	private compileRatio(metric: ManifestMetric, output: string, groupBy: Item[], context: MetricContext): Compiled {
		const { numerator, denominator } = metric.type_params;
		if (!numerator || !denominator) {
			throw new SemanticLayerError(`Ratio metric \`${metric.name}\` needs a numerator and a denominator.`);
		}
		let numeratorName = numerator.alias ?? numerator.name;
		let denominatorName = denominator.alias ?? denominator.name;
		if (numeratorName === denominatorName) {
			numeratorName = `${numeratorName}__numerator`;
			denominatorName = `${denominatorName}__denominator`;
		}
		const combined = this.combine(
			[
				this.compileInput(numerator, numeratorName, groupBy, context),
				this.compileInput(denominator, denominatorName, groupBy, context),
			],
			groupBy,
		);
		const ratio =
			`CAST(${numeratorName} AS DOUBLE PRECISION) / ` +
			`CAST(NULLIF(${denominatorName}, 0) AS DOUBLE PRECISION) AS ${output}`;
		return this.project(combined, groupBy, ratio, output);
	}

	private compileDerived(metric: ManifestMetric, output: string, groupBy: Item[], context: MetricContext): Compiled {
		const inputs = metric.type_params.metrics ?? [];
		const expr = metric.type_params.expr;
		if (inputs.length === 0 || !expr) {
			throw new SemanticLayerError(`Derived metric \`${metric.name}\` needs an expr and input metrics.`);
		}
		for (const input of inputs) {
			if (input.offset_window || input.offset_to_grain) {
				throw new SemanticQueryError(
					`Derived metric \`${metric.name}\` offsets \`${input.name}\` in time (offset_window / ` +
						`offset_to_grain), which quarry's semantic layer does not support yet.`,
				);
			}
		}
		const names = inputs.map((input) => input.alias ?? input.name);
		if (new Set(names).size !== names.length) {
			throw new SemanticLayerError(
				`Derived metric \`${metric.name}\` uses the same input twice; give each one an alias.`,
			);
		}
		const combined = this.combine(
			inputs.map((input, index) => this.compileInput(input, names[index], groupBy, context)),
			groupBy,
		);
		return this.project(combined, groupBy, `${expr} AS ${output}`, output);
	}

	private compileInput(input: MetricInput, output: string, groupBy: Item[], context: MetricContext): Compiled {
		return this.compileMetric(input.name, output, groupBy, {
			...context,
			filters: [...context.filters, ...parseFilters(input.filter)],
		});
	}

	/** One aggregation of a measure, grouped and filtered: the leaf of every metric. */
	private compileMeasure(
		metric: ManifestMetric,
		resolved: ResolvedMeasure,
		output: string,
		groupBy: Item[],
		context: MetricContext,
	): Compiled {
		checkSupported(metric, resolved);
		const items = dedupe([...groupBy, ...this.filterItems(context.filters)]);
		const scope = new ModelScope(this, this.lookup, metric.name, resolved);
		const refs = items.map((item) => scope.ref(item));
		const valueAlias = items.some((item) => item.alias === output) ? `__${output}` : output;
		const valueRef: ColumnRef = { source: 'base', expr: resolved.measure.expr ?? resolved.measure.name };
		const where = context.constraint
			? [`DATE_TRUNC('day', ${scope.render(scope.aggTime())}) BETWEEN ${betweenBounds(context.constraint)}`]
			: [];

		const inner = renderSelect({
			columns: [
				...items.map((item, index) => aliased(scope.renderItem(refs[index], item), item.alias)),
				aliased(scope.render(valueRef), valueAlias),
			],
			from: scope.from(),
			joins: scope.joins(),
			where,
		});
		const aliases = groupBy.map((item) => item.alias);
		return {
			value: output,
			sql: renderSelect({
				columns: [...aliases, `${aggregate(resolved, valueAlias)} AS ${output}`],
				from: subquery(inner, this.nextAlias()),
				where: this.renderFilters(context.filters),
				groupBy: aliases,
			}),
		};
	}

	/**
	 * A running total over the time spine: each spine day joins the measure rows up to it (inside the window or
	 * since the start of the `grain_to_date` period), then coarser periods keep the first, last or average day.
	 */
	private compileCumulative(
		metric: ManifestMetric,
		resolved: ResolvedMeasure,
		output: string,
		groupBy: Item[],
		context: MetricContext,
	): Compiled {
		checkSupported(metric, resolved);
		const spine = this.lookup.timeSpine();
		if (!spine) {
			throw new SemanticLayerError(
				`Cumulative metric \`${metric.name}\` needs a time spine; declare one in the dbt project and parse it again.`,
			);
		}
		if (spine.grain !== 'day') {
			throw new SemanticLayerError(`quarry's semantic layer needs a daily time spine, not \`${spine.grain}\`.`);
		}
		const params = cumulativeParams(metric);
		const items = dedupe([...groupBy, ...this.filterItems(context.filters)]);
		const timeItems = items.filter((item) => item.kind === 'metric_time');
		const otherItems = items.filter((item) => item.kind !== 'metric_time');

		const scope = new ModelScope(this, this.lookup, metric.name, resolved);
		const refs = otherItems.map((item) => scope.ref(item));
		const aggDay = `DATE_TRUNC('day', ${scope.render(scope.aggTime())})`;
		const valueAlias = items.some((item) => item.alias === output) ? `__${output}` : output;
		const measureRows = renderSelect({
			columns: [
				`${aggDay} AS __agg_day`,
				...otherItems.map((item, index) => aliased(scope.renderItem(refs[index], item), item.alias)),
				aliased(
					scope.render({ source: 'base', expr: resolved.measure.expr ?? resolved.measure.name }),
					valueAlias,
				),
			],
			from: scope.from(),
			joins: scope.joins(),
		});

		const spineAlias = 'time_spine_src';
		const rowsAlias = this.nextAlias();
		const day = `${spineAlias}.${spine.column}`;
		const conditions = [`${rowsAlias}.__agg_day <= ${day}`];
		if (params.window) {
			conditions.push(`${rowsAlias}.__agg_day > ${day} - ${intervalOf(params.window, metric.name)}`);
		}
		if (params.grainToDate) {
			conditions.push(`${rowsAlias}.__agg_day >= DATE_TRUNC('${params.grainToDate}', ${day})`);
		}
		const joined = renderSelect({
			columns: [
				`${day} AS metric_time__day`,
				...timeItems
					.filter((item) => item.alias !== 'metric_time__day')
					.map((item) => `DATE_TRUNC('${item.grain}', ${day}) AS ${item.alias}`),
				...otherItems.map((item) => `${rowsAlias}.${item.alias}`),
				`${rowsAlias}.${valueAlias}`,
			],
			from: `${spine.relation} ${spineAlias}`,
			joins: [`INNER JOIN ${subquery(measureRows, rowsAlias)}`, `ON ${andAll(conditions)}`],
			where: context.constraint ? [`${day} BETWEEN ${betweenBounds(context.constraint)}`] : [],
		});

		const aliases = groupBy.map((item) => item.alias);
		const dailyGroup = ['metric_time__day', ...aliases.filter((alias) => alias !== 'metric_time__day')];
		const daily = renderSelect({
			columns: [...dailyGroup, `${aggregate(resolved, valueAlias)} AS ${output}`],
			from: subquery(joined, this.nextAlias()),
			where: this.renderFilters(context.filters),
			groupBy: dailyGroup,
		});
		if (groupBy.every((item) => item.kind !== 'metric_time' || item.grain === 'day')) {
			return { sql: daily, value: output };
		}

		const partition = `PARTITION BY ${aliases.join(', ')}`;
		const window =
			params.periodAgg === 'average'
				? `AVG(${output}) OVER (${partition})`
				: `${params.periodAgg === 'last' ? 'LAST_VALUE' : 'FIRST_VALUE'}(${output}) OVER (\n` +
					indent(
						[
							partition,
							'ORDER BY metric_time__day',
							'ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING',
						].join('\n'),
					) +
					'\n)';
		const periods = renderSelect({
			columns: [...aliases, `${window} AS ${output}`],
			from: subquery(daily, this.nextAlias()),
		});
		return {
			value: output,
			sql: renderSelect({
				columns: [...aliases, output],
				from: subquery(periods, this.nextAlias()),
				groupBy: [...aliases, output],
			}),
		};
	}

	/** Puts metric subqueries side by side on their group-by columns (MetricFlow's combine-aggregated-outputs node). */
	private combine(parts: Compiled[], groupBy: Item[]): Compiled {
		if (parts.length === 1) {
			return parts[0];
		}
		const aliases = parts.map(() => this.nextAlias());
		const keys = groupBy.map((item) => item.alias);
		const coalesced = (key: string, count: number) =>
			count === 1
				? `${aliases[0]}.${key}`
				: `COALESCE(${aliases
						.slice(0, count)
						.map((alias) => `${alias}.${key}`)
						.join(', ')})`;
		const joins = parts.slice(1).flatMap((part, index) => {
			const alias = aliases[index + 1];
			if (keys.length === 0) {
				return [`CROSS JOIN ${subquery(part.sql, alias)}`];
			}
			const on = keys.map((key) => `${coalesced(key, index + 1)} = ${alias}.${key}`);
			return [`FULL OUTER JOIN ${subquery(part.sql, alias)}`, `ON ${andAll(on)}`];
		});
		const groupExprs = keys.map((key) => coalesced(key, parts.length));
		return {
			value: '',
			sql: renderSelect({
				columns: [
					...keys.map((key, index) => `${groupExprs[index]} AS ${key}`),
					...parts.map((part, index) => `MAX(${aliases[index]}.${part.value}) AS ${part.value}`),
				],
				from: subquery(parts[0].sql, aliases[0]),
				joins,
				groupBy: groupExprs,
			}),
		};
	}

	private project(combined: Compiled, groupBy: Item[], column: string, output: string): Compiled {
		return {
			value: output,
			sql: renderSelect({
				columns: [...groupBy.map((item) => item.alias), column],
				from: subquery(combined.sql, this.nextAlias()),
			}),
		};
	}

	// --- items -------------------------------------------------------------------------------------------------

	private groupByItem(name: string, metrics: string[]): Item {
		const parts = name.split('__');
		if (parts[0] === 'metric_time') {
			if (parts.length === 1) {
				return metricTimeItem(this.defaultGrain, name);
			}
			if (parts.length === 2 && isGrain(parts[1])) {
				return metricTimeItem(parts[1], name);
			}
		} else if (parts.length === 1) {
			if ([...this.lookup.models.values()].some((model) => this.lookup.entity(model, name))) {
				return { alias: name, kind: 'entity', name, input: name };
			}
		} else if (parts.length === 2 || (parts.length === 3 && isGrain(parts[2]))) {
			const item = this.dimensionItem(`${parts[0]}__${parts[1]}`, (parts[2] as Grain | undefined) ?? null, name);
			if (item) {
				return item;
			}
		}
		throw new SemanticQueryError(
			resolutionErrorMessage(
				`The given input does not match any of the available group-by-items for ${describeMetrics(metrics)}.`,
				name,
				suggest(name, this.availableNames(metrics)),
			),
		);
	}

	private dimensionItem(name: string, grain: Grain | null, input: string): Item | null {
		const found = this.lookup.allDimensions().find((dimension) => dimension.name === name);
		if (!found) {
			return null;
		}
		if (found.dimension.type !== 'time') {
			if (grain) {
				throw new SemanticQueryError(`\`${name}\` is a categorical dimension and takes no granularity.`);
			}
			return { alias: name, kind: 'dimension', name, input };
		}
		const defined = dimensionGrain(found.dimension);
		const effective = grain ?? defined;
		if (grainRank(effective) < grainRank(defined)) {
			throw new SemanticQueryError(
				`\`${name}\` is defined at the \`${defined}\` granularity and cannot be grouped by \`${effective}\`.`,
			);
		}
		return { alias: `${name}__${effective}`, kind: 'dimension', name, grain: effective, input };
	}

	private filterItems(filters: ParsedFilter[]): Item[] {
		return filters.flatMap((filter) => filterReferences(filter).map((reference) => this.referenceItem(reference)));
	}

	private referenceItem(reference: FilterReference): Item {
		switch (reference.kind) {
			case 'metric': {
				this.requireMetric(reference.name, 'The metric in the where filter does not match any known metrics.');
				return {
					alias: `${reference.groupBy.join('__')}__${reference.name}`,
					kind: 'metric',
					metric: reference.name,
					groupBy: reference.groupBy,
					input: `Metric('${reference.name}')`,
				};
			}
			case 'entity':
				return {
					alias: reference.name,
					kind: 'entity',
					name: reference.name,
					input: `Entity('${reference.name}')`,
				};
			default: {
				const input = `Dimension('${reference.name}')`;
				if (reference.name === 'metric_time') {
					return metricTimeItem(reference.grain ?? this.defaultGrain, input);
				}
				const item = this.dimensionItem(reference.name, reference.grain, input);
				if (!item) {
					throw new SemanticQueryError(
						resolutionErrorMessage(
							'The dimension in the where filter does not match any known dimension.',
							reference.name,
							suggest(
								reference.name,
								this.lookup.allDimensions().map((dimension) => dimension.name),
							),
						),
					);
				}
				return item;
			}
		}
	}

	private renderFilters(filters: ParsedFilter[]): string[] {
		return filters.map((filter) =>
			filter
				.map((part) => (typeof part === 'string' ? part : this.referenceItem(part).alias))
				.join('')
				.trim(),
		);
	}

	private orderByItem(entry: string, metrics: string[], groupBy: Item[]): string {
		const descending = entry.startsWith('-');
		const name = descending ? entry.slice(1) : entry;
		const direction = descending ? ' DESC' : '';
		if (metrics.includes(name)) {
			return `${name}${direction}`;
		}
		const matches = groupBy.filter(
			(item) =>
				item.alias === name ||
				item.input === name ||
				(item.kind === 'metric_time' && name === 'metric_time') ||
				(item.kind === 'dimension' && item.name === name),
		);
		if (matches.length !== 1) {
			throw new SemanticQueryError(
				resolutionErrorMessage(
					`The order-by item '${name}' does not match exactly one of the query items.`,
					name,
				),
			);
		}
		return `${matches[0].alias}${direction}`;
	}

	/** Port of MetricFlow's time constraint: bounds widened to whole periods of the queried metric_time grain. */
	private timeConstraint(query: SemanticQuery, groupBy: Item[]): MetricContext['constraint'] {
		let start = parseQueryTime(query.startTime, 'start_time');
		let end = parseQueryTime(query.endTime, 'end_time');
		if (!start && !end) {
			return null;
		}
		const grains = groupBy.filter((item) => item.kind === 'metric_time').map((item) => item.grain!);
		if (grains.length > 0) {
			const grain = grains.reduce((finest, candidate) =>
				grainRank(candidate) < grainRank(finest) ? candidate : finest,
			);
			if (grainRank(grain) >= grainRank('day')) {
				start = start && { date: startOfPeriod(start.date, grain), hasTime: false };
				end = end && { date: endOfPeriod(end.date, grain), hasTime: false };
			}
		}
		return {
			start: start ? formatQueryTime(start) : UNBOUNDED_START,
			end: end ? formatQueryTime(end) : UNBOUNDED_END,
		};
	}

	// --- lookups -----------------------------------------------------------------------------------------------

	/** `metric_time` without a suffix means the finest aggregation time granularity of the queried metrics. */
	private metricTimeGrain(metrics: string[]): Grain {
		const grains = metrics.flatMap((name) =>
			this.lookup.baseMeasures(this.lookup.metrics.get(name)!).flatMap((measure) => {
				const dimension = this.lookup.aggTimeDimension(measure);
				return dimension ? [dimensionGrain(dimension)] : [];
			}),
		);
		return grains.reduce<Grain>(
			(finest, grain) => (grainRank(grain) < grainRank(finest) ? grain : finest),
			grains[0] ?? 'day',
		);
	}

	/** Names a metric can be grouped by, as MetricFlow suggests them (time dimensions with their grain). */
	availableNames(metrics: string[]): string[] {
		const names = new Set<string>();
		for (const name of metrics) {
			const metric = this.lookup.metrics.get(name);
			if (!metric) {
				continue;
			}
			for (const { model } of this.lookup.baseMeasures(metric)) {
				for (const dimension of this.lookup.reachableDimensions(model).values()) {
					names.add(
						dimension.dimension.type === 'time'
							? `${dimension.name}__${dimensionGrain(dimension.dimension)}`
							: dimension.name,
					);
				}
				for (const entity of model.entities) {
					names.add(entity.name);
				}
			}
		}
		names.add('metric_time__day');
		return [...names];
	}

	private requireMetric(name: string, message: string): ManifestMetric {
		const metric = this.lookup.metrics.get(name);
		if (!metric) {
			throw new SemanticQueryError(
				resolutionErrorMessage(message, name, suggest(name, this.lookup.metrics.keys())),
			);
		}
		return metric;
	}

	compileFilterMetric(item: Item): Compiled {
		const entities = item.groupBy!.map((entity) => ({
			alias: entity,
			kind: 'entity' as const,
			name: entity,
			input: entity,
		}));
		return this.compileMetric(item.metric!, item.metric!, entities, { filters: [], constraint: null });
	}

	nextAlias(): string {
		return `subq_${++this.subqueryCount}`;
	}
}

interface JoinEntry {
	alias: string;
	clause: () => string[];
}

/** The FROM side of one measure aggregation: its semantic model plus the models and metric filters joined to it. */
class ModelScope {
	readonly alias: string;
	private readonly joinEntries: JoinEntry[] = [];
	private readonly modelJoins = new Map<string, { alias: string; columns: Map<string, string> }>();

	constructor(
		private readonly compiler: QueryCompiler,
		private readonly lookup: SemanticManifestLookup,
		private readonly metricName: string,
		private readonly resolved: ResolvedMeasure,
	) {
		this.alias = `${resolved.model.name}_src`;
	}

	ref(item: Item): ColumnRef {
		switch (item.kind) {
			case 'metric_time':
				return this.aggTime();
			case 'entity': {
				const entity = this.lookup.entity(this.resolved.model, item.name!);
				if (!entity) {
					throw this.unavailable(item);
				}
				return { source: 'base', expr: entity.expr ?? entity.name };
			}
			case 'metric':
				return this.metricJoin(item);
			default: {
				const reachable = this.lookup.reachableDimensions(this.resolved.model).get(item.name!);
				if (!reachable) {
					throw this.unavailable(item);
				}
				const expr = reachable.dimension.expr ?? reachable.dimension.name;
				if (reachable.local) {
					return { source: 'base', expr };
				}
				const join = this.modelJoin(reachable.model, reachable.entity);
				join.columns.set(reachable.dimension.name, expr);
				return { source: 'join', alias: join.alias, column: reachable.dimension.name };
			}
		}
	}

	aggTime(): ColumnRef {
		const dimension = this.lookup.aggTimeDimension(this.resolved);
		if (!dimension) {
			throw new SemanticQueryError(
				`Metric \`${this.metricName}\` has no aggregation time dimension, so it cannot use metric_time or a time range.`,
			);
		}
		return { source: 'base', expr: dimension.expr ?? dimension.name };
	}

	/** Renders a column, qualified by its table alias once other relations are joined in. */
	render(ref: ColumnRef): string {
		if (ref.source === 'join') {
			return `${ref.alias}.${ref.column}`;
		}
		return this.joinEntries.length > 0 && isIdentifier(ref.expr) ? `${this.alias}.${ref.expr}` : ref.expr;
	}

	/** Renders an item's column, truncated to its granularity when it is a time item. */
	renderItem(ref: ColumnRef, item: Item): string {
		const column = this.render(ref);
		return item.grain ? `DATE_TRUNC('${item.grain}', ${column})` : column;
	}

	from(): string {
		return `${relationName(this.resolved.model.node_relation)} ${this.alias}`;
	}

	joins(): string[] {
		return this.joinEntries.flatMap((entry) => entry.clause());
	}

	private modelJoin(model: ResolvedMeasure['model'], entityName: string) {
		const key = `${model.name}:${entityName}`;
		const existing = this.modelJoins.get(key);
		if (existing) {
			return existing;
		}
		const used = new Set([this.alias, ...this.joinEntries.map((entry) => entry.alias)]);
		let alias = `${model.name}_src`;
		for (let index = 2; used.has(alias); index++) {
			alias = `${model.name}_src_${index}`;
		}
		const join = { alias, columns: new Map<string, string>() };
		this.modelJoins.set(key, join);
		const baseEntity = this.lookup.entity(this.resolved.model, entityName)!;
		const joinedEntity = this.lookup.entity(model, entityName)!;
		this.joinEntries.push({
			alias,
			clause: () => {
				const columns = [
					aliased(joinedEntity.expr ?? joinedEntity.name, entityName),
					...[...join.columns].map(([name, expr]) => aliased(expr, name)),
				];
				const body = renderSelect({ columns, from: relationName(model.node_relation) });
				const baseKey = this.render({ source: 'base', expr: baseEntity.expr ?? baseEntity.name });
				return [`LEFT OUTER JOIN ${subquery(body, alias)}`, `ON ${baseKey} = ${alias}.${entityName}`];
			},
		});
		return join;
	}

	/** `{{ Metric('revenue', group_by=['customer']) }}`: the metric aggregated per entity, joined on that entity. */
	private metricJoin(item: Item): ColumnRef {
		for (const entity of item.groupBy!) {
			if (!this.lookup.entity(this.resolved.model, entity)) {
				throw this.unavailable(item);
			}
		}
		const compiled = this.compiler.compileFilterMetric(item);
		const alias = this.compiler.nextAlias();
		this.joinEntries.push({
			alias,
			clause: () => {
				const on = item.groupBy!.map((name) => {
					const entity = this.lookup.entity(this.resolved.model, name)!;
					return `${this.render({ source: 'base', expr: entity.expr ?? entity.name })} = ${alias}.${name}`;
				});
				return [`LEFT OUTER JOIN ${subquery(compiled.sql, alias)}`, `ON ${andAll(on)}`];
			},
		});
		return { source: 'join', alias, column: compiled.value };
	}

	private unavailable(item: Item): SemanticQueryError {
		return new SemanticQueryError(
			resolutionErrorMessage(
				`The given input does not match any of the available group-by-items for metric \`${this.metricName}\`. ` +
					'Common issues are: incorrect names, or no valid join path from the measure to the item ' +
					'(fan-out and multi-hop joins are not supported).',
				item.input,
				suggest(item.input, this.compiler.availableNames([this.metricName])),
			),
		);
	}
}

function metricTimeItem(grain: Grain, input: string): Item {
	return { alias: `metric_time__${grain}`, kind: 'metric_time', grain, input };
}

function dedupe(items: Item[]): Item[] {
	const seen = new Map<string, Item>();
	for (const item of items) {
		if (!seen.has(item.alias)) {
			seen.set(item.alias, item);
		}
	}
	return [...seen.values()];
}

function aliased(expr: string, alias: string): string {
	return expr === alias ? expr : `${expr} AS ${alias}`;
}

function parseFilters(filter: WhereFilterIntersection | null | undefined): ParsedFilter[] {
	return (filter?.where_filters ?? []).map((where) => parseWhereFilter(where.where_sql_template));
}

function betweenBounds(constraint: NonNullable<MetricContext['constraint']>): string {
	return `${quoteLiteral(constraint.start)} AND ${quoteLiteral(constraint.end)}`;
}

function describeMetrics(metrics: string[]): string {
	return metrics.length === 1
		? `metric \`${metrics[0]}\``
		: `metrics ${metrics.map((name) => `\`${name}\``).join(', ')}`;
}

function checkSupported(metric: ManifestMetric, resolved: ResolvedMeasure): void {
	if (resolved.measure.non_additive_dimension) {
		throw new SemanticLayerError(
			`Measure \`${resolved.measure.name}\` (metric \`${metric.name}\`) has a non_additive_dimension, ` +
				"which quarry's semantic layer does not support yet.",
		);
	}
	if (resolved.input.join_to_timespine) {
		throw new SemanticLayerError(
			`Metric \`${metric.name}\` sets join_to_timespine, which quarry's semantic layer does not support yet.`,
		);
	}
}

function aggregate(resolved: ResolvedMeasure, column: string): string {
	const { measure } = resolved;
	let expr: string;
	switch (measure.agg) {
		case 'sum':
			expr = `SUM(${column})`;
			break;
		case 'min':
			expr = `MIN(${column})`;
			break;
		case 'max':
			expr = `MAX(${column})`;
			break;
		case 'count':
			expr = `COUNT(${column})`;
			break;
		case 'count_distinct':
			expr = `COUNT(DISTINCT ${column})`;
			break;
		case 'sum_boolean':
			expr = `SUM(CASE WHEN ${column} THEN 1 ELSE 0 END)`;
			break;
		case 'average':
			expr = `AVG(${column})`;
			break;
		case 'median':
			expr = `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${column})`;
			break;
		case 'percentile': {
			const percentile = measure.agg_params?.percentile;
			if (typeof percentile !== 'number' || percentile < 0 || percentile > 1) {
				throw new SemanticLayerError(
					`Percentile measure \`${measure.name}\` needs agg_params.percentile in [0, 1].`,
				);
			}
			const fn = measure.agg_params?.use_discrete_percentile ? 'PERCENTILE_DISC' : 'PERCENTILE_CONT';
			expr = `${fn}(${percentile}) WITHIN GROUP (ORDER BY ${column})`;
			break;
		}
		default:
			throw new SemanticLayerError(
				`Measure \`${measure.name}\` uses the unknown aggregation \`${String(measure.agg)}\`.`,
			);
	}
	const fill = resolved.input.fill_nulls_with;
	return fill === null || fill === undefined ? expr : `COALESCE(${expr}, ${fill})`;
}

interface ResolvedCumulativeParams {
	window: { count: number; grain: Grain } | null;
	grainToDate: Grain | null;
	periodAgg: PeriodAggregation;
}

function cumulativeParams(metric: ManifestMetric): ResolvedCumulativeParams {
	const params: CumulativeTypeParams = metric.type_params.cumulative_type_params ?? {};
	const window = params.window ?? metric.type_params.window ?? null;
	const grainToDate = params.grain_to_date ?? metric.type_params.grain_to_date ?? null;
	return {
		window: window ? parseWindow(window, metric.name) : null,
		grainToDate: grainToDate ? toGrain(grainToDate) : null,
		periodAgg: params.period_agg ?? 'first',
	};
}

function parseWindow(window: MetricTimeWindow, metricName: string): { count: number; grain: Grain } {
	let count: number;
	let granularity: string;
	if (typeof window === 'string') {
		const match = /^\s*(\d+)\s+(\w+?)s?\s*$/i.exec(window);
		if (!match) {
			throw new SemanticLayerError(`Cumulative metric \`${metricName}\` has an invalid window \`${window}\`.`);
		}
		count = Number(match[1]);
		granularity = match[2];
	} else {
		count = window.count;
		granularity = window.granularity;
	}
	const grain = granularity.toLowerCase().replace(/s$/, '');
	if (!isGrain(grain) || !Number.isInteger(count) || count <= 0) {
		throw new SemanticLayerError(
			`Cumulative metric \`${metricName}\` has an unsupported window \`${count} ${granularity}\`.`,
		);
	}
	return { count, grain };
}

function intervalOf(window: { count: number; grain: Grain }, metricName: string): string {
	switch (window.grain) {
		case 'year':
			return `MAKE_INTERVAL(years => ${window.count})`;
		case 'quarter':
			return `MAKE_INTERVAL(months => ${window.count * 3})`;
		case 'month':
			return `MAKE_INTERVAL(months => ${window.count})`;
		case 'week':
			return `MAKE_INTERVAL(weeks => ${window.count})`;
		case 'day':
			return `MAKE_INTERVAL(days => ${window.count})`;
		case 'hour':
			return `MAKE_INTERVAL(hours => ${window.count})`;
		case 'minute':
			return `MAKE_INTERVAL(mins => ${window.count})`;
		default:
			throw new SemanticLayerError(`Cumulative metric \`${metricName}\` has a window finer than minutes.`);
	}
}
