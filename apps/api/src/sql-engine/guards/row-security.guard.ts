import {
	baseTables,
	type BlockedFactory,
	deparseExpression,
	deparseStatement,
	errorMessage,
	parseQuery,
	parseStatements,
	type PgNode,
	type TableRef,
	traverseScopes,
} from './pg-ast.js';
import {
	type GuardConnection,
	loadSchemas,
	matchSqlIdentifier,
	resolveTable,
	SUPPORTED_GUARD_DIALECTS,
	type TableIdentity,
} from './query-guard.js';

/**
 * Port of `nao_core/config/databases/row_security_guard.py`: rewrites a query so every protected table only
 * returns the rows its policy allows. The predicate goes into the WHERE clause, into the ON clause of the outer
 * join that makes the table nullable, or into a pre-filtering subquery (FULL joins, `USING` joins).
 */

export class RowSecurityGuardError extends Error {
	override name = 'RowSecurityGuardError';
}

export type RowSecurityPolicy =
	| { access: 'none' | 'full' | 'predicate'; constraint_columns: string[]; predicate?: string | null }
	| { access: 'blocked'; constraint_columns: string[]; reason: string };

/** Policies keyed by `[schema, table]`. */
export type RowSecurityPolicies = Map<string, { identity: TableIdentity; policy: RowSecurityPolicy }>;

export function rowSecurityPolicies(entries: [TableIdentity, RowSecurityPolicy][]): RowSecurityPolicies {
	return new Map(entries.map(([identity, policy]) => [JSON.stringify(identity), { identity, policy }]));
}

const COMPARISON_OPERATORS = new Set(['=', '<>', '!=', '<', '>', '<=', '>=']);

export async function validateRowSecurityPredicate(
	predicate: string,
	constraintColumns: string[],
	databaseType: string,
): Promise<string> {
	if (!SUPPORTED_GUARD_DIALECTS.has(databaseType)) {
		throw blocked(`the database dialect '${databaseType}' is not supported`);
	}
	return deparseExpression(await parsePredicate(predicate, constraintColumns));
}

export async function enforceRowSecurity(
	sql: string,
	dbConfig: { type: string },
	policies: RowSecurityPolicies | null,
	connect: () => Promise<GuardConnection> | GuardConnection,
): Promise<string> {
	if (policies === null) {
		return sql;
	}
	if (!SUPPORTED_GUARD_DIALECTS.has(dbConfig.type)) {
		throw blocked(`the database dialect '${dbConfig.type}' is not supported`);
	}

	try {
		const statement = await parseQuery(sql, blocked);
		const tables = baseTables(traverseScopes(statement), statement, blocked);
		if (tables.length === 0) {
			return await deparseStatement(statement);
		}
		const conn = await connect();
		const schemas = await loadSchemas(conn, blocked);
		const tablesBySchema = new Map<string, string[]>();
		const parsedPolicies = new Map<string, PgNode>();
		const conditions: { table: TableRef; condition: PgNode }[] = [];

		for (const table of tables) {
			const identity = await resolveTable(table, conn, schemas, tablesBySchema, blocked);
			const policy = lookupPolicy(policies, identity);
			if (policy?.access === 'blocked') {
				throw blocked(policy.reason);
			}
			if (!policy || policy.access === 'full') {
				continue;
			}

			let condition: PgNode;
			if (policy.access === 'none') {
				condition = { A_Const: { boolval: { boolval: false } } };
			} else {
				const key = JSON.stringify(identity);
				let parsed = parsedPolicies.get(key);
				if (!parsed) {
					parsed = await parsePredicate(policy.predicate ?? null, policy.constraint_columns);
					parsedPolicies.set(key, parsed);
				}
				condition = structuredClone(parsed);
				qualifyColumns(condition, tableQualifier(table));
			}
			conditions.push({ table, condition });
		}

		for (const { table, condition } of conditions) {
			injectPolicyCondition(table, condition);
		}
		return await deparseStatement(statement);
	} catch (error) {
		if (error instanceof RowSecurityGuardError) {
			throw error;
		}
		throw blocked(errorMessage(error));
	}
}

function lookupPolicy(policies: RowSecurityPolicies, identity: TableIdentity): RowSecurityPolicy | null {
	const exact = policies.get(JSON.stringify(identity));
	if (exact) {
		return exact.policy;
	}
	const [schema, table] = identity;
	const matches = [...policies.values()].filter(
		({ identity: [policySchema, policyTable] }) =>
			policySchema.toLowerCase() === schema.toLowerCase() && policyTable.toLowerCase() === table.toLowerCase(),
	);
	if (matches.length > 1) {
		throw blocked(`multiple row-security policies match '${schema}.${table}' case-insensitively`);
	}
	return matches[0]?.policy ?? null;
}

async function parsePredicate(predicate: string | null, constraintColumns: string[]): Promise<PgNode> {
	if (!predicate || /;|--|\/\*|\*\//.test(predicate)) {
		throw blocked('a row predicate is empty or contains a comment');
	}
	let expression: PgNode;
	try {
		const statements = await parseStatements(`SELECT ${predicate}`);
		const select = statements.length === 1 ? statements[0].SelectStmt : null;
		const target = select?.targetList?.length === 1 ? select.targetList[0].ResTarget : null;
		const otherClauses = select
			? Object.keys(select).filter((key) => !['targetList', 'limitOption', 'op'].includes(key))
			: [];
		if (!select || !target || target.name || otherClauses.length > 0 || select.op !== 'SETOP_NONE') {
			throw new Error('the predicate is not a single expression');
		}
		expression = target.val;
	} catch (error) {
		throw blocked(`a row predicate could not be parsed: ${errorMessage(error)}`);
	}

	const type = nodeType(expression);
	if (!['A_Expr', 'BoolExpr', 'NullTest', 'BooleanTest'].includes(type)) {
		throw blocked('a row predicate must be a boolean comparison');
	}
	const columns: PgNode[] = [];
	checkPredicateNode(expression, columns);

	const available = [...new Set(constraintColumns)];
	for (const column of columns) {
		const fields: PgNode[] = column.fields ?? [];
		if (fields.length !== 1 || !fields[0].String) {
			throw blocked('row predicate columns must be unqualified');
		}
		const name: string = fields[0].String.sval;
		if (matchSqlIdentifier(name, available) === null) {
			throw blocked(`row predicate column '${name}' is not a configured constraint column`);
		}
	}
	if (columns.length === 0) {
		throw blocked('a row predicate must reference a constraint column');
	}
	if (!everyComparisonBranchIsGrounded(expression)) {
		throw blocked('every row predicate comparison must reference a constraint column');
	}
	return expression;
}

function checkPredicateNode(node: PgNode, columns: PgNode[]): void {
	const type = nodeType(node);
	const body = node[type];
	switch (type) {
		case 'A_Expr': {
			const operator: string | undefined = body.name?.[0]?.String?.sval;
			const allowedKind =
				(body.kind === 'AEXPR_OP' && operator !== undefined && COMPARISON_OPERATORS.has(operator)) ||
				body.kind === 'AEXPR_IN' ||
				body.kind === 'AEXPR_BETWEEN' ||
				body.kind === 'AEXPR_NOT_BETWEEN';
			if (!allowedKind || !body.lexpr) {
				throw blocked(`row predicate expression '${operator ?? body.kind}' is not allowed`);
			}
			checkPredicateNode(body.lexpr, columns);
			if (body.rexpr?.List) {
				for (const item of body.rexpr.List.items ?? []) {
					checkPredicateNode(item, columns);
				}
			} else if (body.rexpr) {
				checkPredicateNode(body.rexpr, columns);
			}
			return;
		}
		case 'BoolExpr':
			for (const arg of body.args ?? []) {
				checkPredicateNode(arg, columns);
			}
			return;
		case 'NullTest':
		case 'BooleanTest':
			checkPredicateNode(body.arg, columns);
			return;
		case 'ColumnRef':
			if ((body.fields ?? []).some((field: PgNode) => field.A_Star)) {
				throw blocked("row predicate expression 'star' is not allowed");
			}
			columns.push(body);
			return;
		case 'A_Const':
			return;
		default:
			throw blocked(`row predicate expression '${type}' is not allowed`);
	}
}

function everyComparisonBranchIsGrounded(node: PgNode): boolean {
	const type = nodeType(node);
	if (type === 'BoolExpr') {
		return (node.BoolExpr.args ?? []).every(everyComparisonBranchIsGrounded);
	}
	if (type === 'A_Expr' || type === 'NullTest' || type === 'BooleanTest') {
		return JSON.stringify(node).includes('"ColumnRef"');
	}
	return false;
}

function nodeType(node: PgNode): string {
	return Object.keys(node ?? {})[0] ?? 'unknown';
}

function tableQualifier(table: TableRef): string {
	if (!table.qualifier) {
		throw blocked('a protected table alias could not be resolved');
	}
	return table.qualifier;
}

function qualifyColumns(node: unknown, qualifier: string): void {
	if (Array.isArray(node)) {
		node.forEach((child) => qualifyColumns(child, qualifier));
		return;
	}
	if (!node || typeof node !== 'object') {
		return;
	}
	const record = node as PgNode;
	if (record.ColumnRef) {
		record.ColumnRef.fields = [{ String: { sval: qualifier } }, ...record.ColumnRef.fields];
		return;
	}
	Object.values(record).forEach((child) => qualifyColumns(child, qualifier));
}

interface JoinStep {
	join: PgNode;
	side: 'larg' | 'rarg';
}

function injectPolicyCondition(table: TableRef, condition: PgNode): void {
	const select = table.scope.select;
	const fromClause: PgNode[] = select.fromClause ?? [];
	const path = findJoinPath(fromClause, table.node);
	if (!path) {
		throw blocked('a protected table is not contained by a SELECT scope');
	}

	if (fromClause.some(containsFullJoin)) {
		if (!table.hasAlias && (table.schema || table.catalog)) {
			throw blocked('qualified tables in FULL JOIN queries require an explicit alias');
		}
		prefilterTable(select, table, condition);
		return;
	}

	for (const step of [...path].reverse()) {
		const nullable =
			(step.join.jointype === 'JOIN_LEFT' && step.side === 'rarg') ||
			(step.join.jointype === 'JOIN_RIGHT' && step.side === 'larg');
		if (!nullable) {
			continue;
		}
		if (step.join.usingClause) {
			prefilterTable(select, table, condition);
		} else {
			step.join.quals = and(step.join.quals, condition);
		}
		return;
	}

	select.whereClause = and(select.whereClause, condition);
}

function and(existing: PgNode | undefined, condition: PgNode): PgNode {
	if (!existing) {
		return condition;
	}
	return { BoolExpr: { boolop: 'AND_EXPR', args: [existing, condition] } };
}

/** The joins between the FROM clause and the table, outermost first; null when the table is not there. */
function findJoinPath(items: PgNode[], rangeVar: PgNode): JoinStep[] | null {
	for (const item of items) {
		const path = findInFromItem(item, rangeVar);
		if (path) {
			return path;
		}
	}
	return null;
}

function findInFromItem(item: PgNode, rangeVar: PgNode): JoinStep[] | null {
	if (item.RangeVar === rangeVar) {
		return [];
	}
	if (item.RangeTableSample?.relation?.RangeVar === rangeVar) {
		return [];
	}
	if (item.JoinExpr) {
		for (const side of ['larg', 'rarg'] as const) {
			const path = findInFromItem(item.JoinExpr[side], rangeVar);
			if (path) {
				return [{ join: item.JoinExpr, side }, ...path];
			}
		}
	}
	return null;
}

function containsFullJoin(item: PgNode): boolean {
	if (!item.JoinExpr) {
		return false;
	}
	return (
		item.JoinExpr.jointype === 'JOIN_FULL' ||
		containsFullJoin(item.JoinExpr.larg) ||
		containsFullJoin(item.JoinExpr.rarg)
	);
}

/** Replaces the table with `(SELECT * FROM table AS q WHERE condition) AS q`. */
function prefilterTable(select: PgNode, table: TableRef, condition: PgNode): void {
	const qualifier = tableQualifier(table);
	const outerAlias = table.node.alias ? { ...table.node.alias } : { aliasname: qualifier };
	const innerRangeVar = { ...table.node, alias: { aliasname: qualifier } };
	const replacement = {
		RangeSubselect: {
			subquery: {
				SelectStmt: {
					targetList: [{ ResTarget: { val: { ColumnRef: { fields: [{ A_Star: {} }] } } } }],
					fromClause: [{ RangeVar: innerRangeVar }],
					whereClause: condition,
					limitOption: 'LIMIT_OPTION_DEFAULT',
					op: 'SETOP_NONE',
				},
			},
			alias: outerAlias,
		},
	};
	if (!replaceFromItem(select.fromClause ?? [], table.node, replacement)) {
		throw blocked('a protected table could not be pre-filtered');
	}
}

function replaceFromItem(items: PgNode[], rangeVar: PgNode, replacement: PgNode): boolean {
	for (let index = 0; index < items.length; index++) {
		if (items[index].RangeVar === rangeVar) {
			items[index] = replacement;
			return true;
		}
		if (items[index].JoinExpr && replaceInJoin(items[index].JoinExpr, rangeVar, replacement)) {
			return true;
		}
	}
	return false;
}

function replaceInJoin(join: PgNode, rangeVar: PgNode, replacement: PgNode): boolean {
	for (const side of ['larg', 'rarg'] as const) {
		if (join[side].RangeVar === rangeVar) {
			join[side] = replacement;
			return true;
		}
		if (join[side].JoinExpr && replaceInJoin(join[side].JoinExpr, rangeVar, replacement)) {
			return true;
		}
	}
	return false;
}

const blocked: BlockedFactory = (reason) =>
	new RowSecurityGuardError(`Query blocked because row-level security could not be safely enforced: ${reason}`);
