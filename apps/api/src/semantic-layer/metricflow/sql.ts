/** Small SQL text builders that lay compiled queries out the way MetricFlow does (two-space indents, leading commas). */
export interface SelectParts {
	columns: string[];
	from: string;
	joins?: string[];
	where?: string[];
	groupBy?: string[];
}

export function renderSelect({ columns, from, joins = [], where = [], groupBy = [] }: SelectParts): string {
	const lines = ['SELECT', ...list(columns), `FROM ${from}`, ...joins];
	if (where.length > 0) {
		lines.push(`WHERE ${andAll(where)}`);
	}
	if (groupBy.length > 0) {
		lines.push('GROUP BY', ...list(groupBy));
	}
	return lines.join('\n');
}

export function subquery(sql: string, alias: string): string {
	return `(\n${indent(sql)}\n) ${alias}`;
}

export function andAll(conditions: string[]): string {
	return conditions.length === 1 ? conditions[0] : conditions.map((condition) => `(${condition})`).join(' AND ');
}

export function indent(text: string, prefix = '  '): string {
	return text
		.split('\n')
		.map((line) => (line === '' ? line : `${prefix}${line}`))
		.join('\n');
}

export function quoteLiteral(value: string): string {
	return `'${value.replaceAll("'", "''")}'`;
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function isIdentifier(expr: string): boolean {
	return IDENTIFIER.test(expr);
}

function list(items: string[]): string[] {
	return items.map((item, index) => indent(index === 0 ? item : `, ${item}`));
}
