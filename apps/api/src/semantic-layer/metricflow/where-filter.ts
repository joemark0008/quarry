import { SemanticQueryError } from './errors.js';
import { type Grain, isGrain } from './time.js';

/** A model field referenced from a where template, before it is resolved against the manifest. */
export type FilterReference =
	| { kind: 'dimension'; name: string; grain: Grain | null }
	| { kind: 'entity'; name: string }
	| { kind: 'metric'; name: string; groupBy: string[] };

/** A where filter split into raw SQL and the references its `{{ … }}` templates stand for. */
export type ParsedFilter = (string | FilterReference)[];

const TEMPLATE = /\{\{([\s\S]*?)\}\}/g;

/**
 * Parses MetricFlow's Jinja where filters: `{{ Dimension('order__status') }}`, `.grain('month')`,
 * `{{ TimeDimension('metric_time', 'day') }}`, `{{ Entity('customer') }}` and
 * `{{ Metric('revenue', group_by=['customer']) }}`. Everything outside the templates is kept as SQL.
 */
export function parseWhereFilter(filter: string): ParsedFilter {
	const parts: ParsedFilter = [];
	let last = 0;
	for (const match of filter.matchAll(TEMPLATE)) {
		if (match.index > last) {
			parts.push(filter.slice(last, match.index));
		}
		parts.push(parseTemplate(match[1], filter));
		last = match.index + match[0].length;
	}
	if (last < filter.length) {
		parts.push(filter.slice(last));
	}
	return parts;
}

export function filterReferences(filter: ParsedFilter): FilterReference[] {
	return filter.filter((part): part is FilterReference => typeof part !== 'string');
}

type Token = { type: 'ident' | 'string' | 'number' | 'punct'; value: string };
type Value = string | number | boolean | null | string[];
interface Call {
	name: string;
	positional: Value[];
	keywords: Record<string, Value>;
}

function parseTemplate(source: string, filter: string): FilterReference {
	const invalid = (detail: string) =>
		new SemanticQueryError(
			`Invalid where filter \`${filter}\`: ${detail}. Use Dimension('entity__dimension'), ` +
				`TimeDimension('metric_time', 'day'), Entity('entity') or Metric('metric', group_by=['entity']).`,
		);
	const tokens = tokenize(source, invalid);
	let position = 0;
	const peek = () => tokens[position];
	const next = () => tokens[position++];
	const expect = (value: string) => {
		const token = next();
		if (!token || token.value !== value) {
			throw invalid(`expected \`${value}\``);
		}
	};
	const parseValue = (): Value => {
		const token = next();
		if (!token) {
			throw invalid('unexpected end of template');
		}
		if (token.type === 'string') {
			return token.value;
		}
		if (token.type === 'number') {
			return Number(token.value);
		}
		if (token.type === 'ident') {
			return token.value === 'True' ? true : token.value === 'False' ? false : null;
		}
		if (token.value === '[') {
			const items: string[] = [];
			while (peek() && peek().value !== ']') {
				const item = parseValue();
				if (typeof item !== 'string') {
					throw invalid('lists may only hold quoted names');
				}
				items.push(item);
				if (peek()?.value === ',') {
					next();
				}
			}
			expect(']');
			return items;
		}
		throw invalid(`unexpected \`${token.value}\``);
	};
	const parseCall = (): Call => {
		const name = next();
		if (!name || name.type !== 'ident') {
			throw invalid('expected a function call');
		}
		expect('(');
		const call: Call = { name: name.value, positional: [], keywords: {} };
		while (peek() && peek().value !== ')') {
			if (peek().type === 'ident' && tokens[position + 1]?.value === '=') {
				const key = next().value;
				next();
				call.keywords[key] = parseValue();
			} else {
				call.positional.push(parseValue());
			}
			if (peek()?.value === ',') {
				next();
			}
		}
		expect(')');
		return call;
	};

	const call = parseCall();
	const methods: Call[] = [];
	while (peek()?.value === '.') {
		next();
		methods.push(parseCall());
	}
	if (position < tokens.length) {
		throw invalid(`unexpected \`${peek().value}\``);
	}

	const argument = (index: number, keyword: string): Value | undefined =>
		call.positional[index] ?? call.keywords[keyword];
	const name = argument(0, 'name');
	if (typeof name !== 'string' || name === '') {
		throw invalid(`${call.name}() needs a quoted name`);
	}
	const qualified = withEntityPath(name, call.keywords.entity_path, invalid);

	switch (call.name) {
		case 'Dimension':
		case 'TimeDimension': {
			let grain = call.name === 'TimeDimension' ? argument(1, 'time_granularity_name') : undefined;
			for (const method of methods) {
				if (method.name === 'grain') {
					grain = method.positional[0] ?? method.keywords.time_granularity;
				} else if (method.name !== 'descending') {
					throw invalid(`\`.${method.name}()\` is not supported`);
				}
			}
			if (call.keywords.date_part_name || argument(2, 'date_part_name')) {
				throw invalid('date parts are not supported');
			}
			if (grain !== undefined && grain !== null && (typeof grain !== 'string' || !isGrain(grain.toLowerCase()))) {
				throw invalid(`unknown granularity \`${String(grain)}\``);
			}
			return { kind: 'dimension', name: qualified, grain: grain ? (grain.toLowerCase() as Grain) : null };
		}
		case 'Entity':
			if (methods.length > 0) {
				throw invalid('entities take no methods');
			}
			return { kind: 'entity', name: qualified };
		case 'Metric': {
			const groupBy = argument(1, 'group_by') ?? [];
			if (!Array.isArray(groupBy) || groupBy.length === 0) {
				throw invalid(`Metric('${name}') needs group_by=['entity']`);
			}
			return { kind: 'metric', name, groupBy };
		}
		default:
			throw invalid(`unknown template function \`${call.name}\``);
	}
}

function withEntityPath(name: string, entityPath: Value | undefined, invalid: (detail: string) => Error): string {
	if (entityPath === undefined || entityPath === null || (Array.isArray(entityPath) && entityPath.length === 0)) {
		return name;
	}
	if (!Array.isArray(entityPath) || entityPath.length > 1) {
		throw invalid('multi-hop entity paths are not supported');
	}
	return `${entityPath[0]}__${name}`;
}

function tokenize(source: string, invalid: (detail: string) => Error): Token[] {
	const tokens: Token[] = [];
	let index = 0;
	while (index < source.length) {
		const char = source[index];
		if (/\s/.test(char)) {
			index++;
		} else if (char === "'" || char === '"') {
			const end = source.indexOf(char, index + 1);
			if (end < 0) {
				throw invalid('unterminated string');
			}
			tokens.push({ type: 'string', value: source.slice(index + 1, end) });
			index = end + 1;
		} else if (/[A-Za-z_]/.test(char)) {
			const match = /^[A-Za-z_]\w*/.exec(source.slice(index))!;
			tokens.push({ type: 'ident', value: match[0] });
			index += match[0].length;
		} else if (/[\d-]/.test(char)) {
			const match = /^-?\d+(\.\d+)?/.exec(source.slice(index));
			if (!match) {
				throw invalid(`unexpected \`${char}\``);
			}
			tokens.push({ type: 'number', value: match[0] });
			index += match[0].length;
		} else if ('()[],.='.includes(char)) {
			tokens.push({ type: 'punct', value: char });
			index++;
		} else {
			throw invalid(`unexpected \`${char}\``);
		}
	}
	return tokens;
}
