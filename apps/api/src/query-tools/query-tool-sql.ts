import {
	bindQueryToolValues,
	compileQueryToolSql,
	type QueryToolParameter,
	type QueryToolParameterValue,
	QueryToolTemplateError,
} from '@quarry/shared/query-tools';

import { deparseStatement, errorMessage, parseStatements, type PgNode } from '../sql-engine/guards/pg-ast.js';

export interface PreparedQueryToolSql {
	/** The SQL sent to the warehouse, with `$1…$n` parameters. */
	sql: string;
	/** Bind values of `$1…$n`. */
	params: QueryToolParameterValue[];
	/**
	 * The same query with the values written in as SQL literals by the Postgres deparser, for the chat's SQL view
	 * and for re-running the result later (charts, stories). Never sent with `params`.
	 */
	displaySql: string;
}

/** Compiles a saved tool's template and checks the arguments against its parameters. */
export async function prepareQueryToolSql(
	template: string,
	parameters: readonly QueryToolParameter[],
	args: Record<string, unknown>,
): Promise<PreparedQueryToolSql> {
	const compiled = compileQueryToolSql(template, parameters);
	const params = bindQueryToolValues(compiled, parameters, args);
	const displaySql = await inlineQueryToolParams(compiled.sql, params);
	return { sql: compiled.sql, params, displaySql };
}

/** Replaces each `$n` parameter reference in the parsed query with a constant node, then deparses it. */
export async function inlineQueryToolParams(sql: string, values: readonly QueryToolParameterValue[]): Promise<string> {
	let statements: PgNode[];
	try {
		statements = await parseStatements(sql);
	} catch (error) {
		throw new QueryToolTemplateError(`The SQL could not be parsed: ${errorMessage(error)}`);
	}
	if (statements.length !== 1) {
		throw new QueryToolTemplateError('A query tool runs exactly one SQL statement.');
	}
	const replaced = replaceParamRefs(statements[0], values) as PgNode;
	return deparseStatement(replaced);
}

function replaceParamRefs(node: unknown, values: readonly QueryToolParameterValue[]): unknown {
	if (Array.isArray(node)) {
		return node.map((child) => replaceParamRefs(child, values));
	}
	if (!node || typeof node !== 'object') {
		return node;
	}
	const record = node as PgNode;
	if (record.ParamRef) {
		const index = Number(record.ParamRef.number) - 1;
		if (index < 0 || index >= values.length) {
			throw new QueryToolTemplateError(`The SQL references $${index + 1}, which has no value.`);
		}
		return constantNode(values[index]);
	}
	return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, replaceParamRefs(value, values)]));
}

function constantNode(value: QueryToolParameterValue): PgNode {
	if (value === null) {
		return { A_Const: { isnull: true } };
	}
	if (typeof value === 'boolean') {
		return { A_Const: { boolval: { boolval: value } } };
	}
	if (typeof value === 'number') {
		return Number.isInteger(value) && Math.abs(value) <= 2_147_483_647
			? { A_Const: { ival: { ival: value } } }
			: { A_Const: { fval: { fval: String(value) } } };
	}
	return { A_Const: { sval: { sval: value } } };
}
