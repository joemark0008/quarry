import type { QueryToolParameter, QueryToolParameterType } from '@quarry/shared/query-tools';

/**
 * The query builder of Settings → Query tools: a table, columns (optionally aggregated), filters, order and a
 * limit, turned into Postgres SQL. Filter values are either fixed (written as quoted literals) or parameters
 * (`{{ name }}` placeholders the saved tool binds when it runs). Non-aggregated columns are grouped automatically
 * as soon as one column is aggregated.
 */

export const AGGREGATES = ['none', 'count', 'count_distinct', 'sum', 'avg', 'min', 'max'] as const;
export type Aggregate = (typeof AGGREGATES)[number];

export const FILTER_OPERATORS = [
	'=',
	'!=',
	'>',
	'>=',
	'<',
	'<=',
	'like',
	'ilike',
	'in',
	'is_null',
	'is_not_null',
] as const;
export type FilterOperator = (typeof FILTER_OPERATORS)[number];

export const FILTER_OPERATOR_LABELS: Record<FilterOperator, string> = {
	'=': 'equals',
	'!=': 'not equals',
	'>': 'greater than',
	'>=': 'at least',
	'<': 'less than',
	'<=': 'at most',
	like: 'matches (like)',
	ilike: 'matches, any case',
	in: 'is one of',
	is_null: 'is empty',
	is_not_null: 'is not empty',
};

export interface BuilderColumn {
	/** Column name, or `*` with `count`. */
	column: string;
	aggregate: Aggregate;
	alias?: string;
}

export type FilterValue =
	| { kind: 'value'; value: string }
	| { kind: 'parameter'; name: string; type: QueryToolParameterType; required: boolean; default?: string };

export interface BuilderFilter {
	column: string;
	operator: FilterOperator;
	value: FilterValue;
}

export interface BuilderOrder {
	/** A selected column's output name (its alias, or the column). */
	column: string;
	direction: 'asc' | 'desc';
}

export type BuilderLimit =
	{ kind: 'none' } | { kind: 'value'; value: number } | { kind: 'parameter'; name: string; default: number };

export interface BuilderSpec {
	schema: string;
	table: string;
	columns: BuilderColumn[];
	filters: BuilderFilter[];
	orderBy: BuilderOrder[];
	limit: BuilderLimit;
}

export interface GeneratedQuery {
	sql: string;
	parameters: QueryToolParameter[];
	groupBy: string[];
}

const SIMPLE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/;
const RESERVED = new Set([
	'all',
	'and',
	'any',
	'as',
	'asc',
	'case',
	'check',
	'column',
	'create',
	'default',
	'desc',
	'distinct',
	'do',
	'else',
	'end',
	'false',
	'for',
	'from',
	'grant',
	'group',
	'having',
	'in',
	'into',
	'is',
	'limit',
	'not',
	'null',
	'offset',
	'on',
	'or',
	'order',
	'select',
	'table',
	'then',
	'to',
	'true',
	'union',
	'user',
	'using',
	'when',
	'where',
	'with',
]);

export function quoteIdentifier(name: string): string {
	return SIMPLE_IDENTIFIER.test(name) && !RESERVED.has(name) ? name : `"${name.replaceAll('"', '""')}"`;
}

export function quoteLiteral(value: string): string {
	return `'${value.replaceAll("'", "''")}'`;
}

/** The name a selected column has in the result. */
export function outputName(column: BuilderColumn): string {
	if (column.alias?.trim()) {
		return column.alias.trim();
	}
	if (column.aggregate === 'none') {
		return column.column;
	}
	const base = column.column === '*' ? 'rows' : column.column;
	return `${column.aggregate === 'count_distinct' ? 'distinct' : column.aggregate}_${base}`;
}

export function generateQuerySql(spec: BuilderSpec): GeneratedQuery {
	if (!spec.table) {
		throw new Error('Pick a table.');
	}
	const parameters: QueryToolParameter[] = [];
	const addParameter = (parameter: QueryToolParameter) => {
		const existing = parameters.find((candidate) => candidate.name === parameter.name);
		if (existing && existing.type !== parameter.type) {
			throw new Error(`Parameter "${parameter.name}" is used with two types.`);
		}
		if (!existing) {
			parameters.push(parameter);
		}
	};

	const hasAggregate = spec.columns.some((column) => column.aggregate !== 'none');
	const select =
		spec.columns.length === 0 ? ['*'] : spec.columns.map((column) => selectExpression(column, hasAggregate));
	const groupBy = hasAggregate
		? spec.columns.filter((column) => column.aggregate === 'none').map((column) => quoteIdentifier(column.column))
		: [];

	const where = spec.filters.map((filter) => filterExpression(filter, addParameter));

	const lines = [
		`SELECT ${select.join(', ')}`,
		`FROM ${quoteIdentifier(spec.schema)}.${quoteIdentifier(spec.table)}`,
	];
	if (where.length > 0) {
		lines.push(`WHERE ${where.join('\n  AND ')}`);
	}
	if (groupBy.length > 0) {
		lines.push(`GROUP BY ${groupBy.join(', ')}`);
	}
	if (spec.orderBy.length > 0) {
		lines.push(
			`ORDER BY ${spec.orderBy.map((order) => `${quoteIdentifier(order.column)} ${order.direction.toUpperCase()}`).join(', ')}`,
		);
	}
	if (spec.limit.kind === 'value') {
		lines.push(`LIMIT ${Math.max(0, Math.floor(spec.limit.value))}`);
	} else if (spec.limit.kind === 'parameter') {
		addParameter({
			name: spec.limit.name,
			type: 'integer',
			required: false,
			default: spec.limit.default,
			description: 'Maximum number of rows.',
		});
		lines.push(`LIMIT {{ ${spec.limit.name} }}`);
	}
	return { sql: lines.join('\n'), parameters, groupBy };
}

function selectExpression(column: BuilderColumn, hasAggregate: boolean): string {
	const name = column.column === '*' ? '*' : quoteIdentifier(column.column);
	const alias = column.alias?.trim();
	if (column.aggregate === 'none') {
		if (column.column === '*') {
			if (hasAggregate) {
				throw new Error('Select specific columns when aggregating.');
			}
			return '*';
		}
		return alias ? `${name} AS ${quoteIdentifier(alias)}` : name;
	}
	if (column.column === '*' && column.aggregate !== 'count') {
		throw new Error(`${column.aggregate} needs a column.`);
	}
	const expression =
		column.aggregate === 'count_distinct' ? `count(DISTINCT ${name})` : `${column.aggregate}(${name})`;
	return `${expression} AS ${quoteIdentifier(outputName(column))}`;
}

function filterExpression(filter: BuilderFilter, addParameter: (parameter: QueryToolParameter) => void): string {
	const column = quoteIdentifier(filter.column);
	if (filter.operator === 'is_null') {
		return `${column} IS NULL`;
	}
	if (filter.operator === 'is_not_null') {
		return `${column} IS NOT NULL`;
	}
	const operator = filter.operator === 'like' ? 'LIKE' : filter.operator === 'ilike' ? 'ILIKE' : filter.operator;
	if (filter.value.kind === 'parameter') {
		if (filter.operator === 'in') {
			throw new Error('"is one of" takes fixed values, not a parameter.');
		}
		const { name, type, required } = filter.value;
		addParameter({
			name,
			type,
			required,
			description: `Filter on ${filter.column}.`,
			...(filter.value.default !== undefined && filter.value.default !== '' && { default: filter.value.default }),
		});
		return `${column} ${operator} {{ ${name} }}`;
	}
	if (filter.operator === 'in') {
		const values = filter.value.value
			.split(',')
			.map((value) => value.trim())
			.filter(Boolean);
		if (values.length === 0) {
			throw new Error(`Give at least one value for ${filter.column}.`);
		}
		return `${column} IN (${values.map(quoteLiteral).join(', ')})`;
	}
	return `${column} ${operator} ${quoteLiteral(filter.value.value)}`;
}
