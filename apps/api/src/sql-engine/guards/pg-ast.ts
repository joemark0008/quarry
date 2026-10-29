/* eslint-disable @typescript-eslint/no-explicit-any */
import { deparse, parse } from 'pgsql-parser';

/**
 * Scope analysis on the libpg_query AST, the Node counterpart of the parts of sqlglot the upstream guards use
 * (`sqlglot.parse`, `traverse_scope`, `exp.Table`, `exp.Column`). The AST comes from Postgres' own parser, so
 * identifiers are already folded the way Postgres folds them: unquoted names are lower-cased, quoted names keep
 * their case. Every guard compares the folded names exactly.
 */

export type PgNode = Record<string, any>;

export type BlockedFactory = (reason: string) => Error;

/** A `RangeVar` in a FROM clause that is not a CTE reference: a real table or view. */
export interface TableRef {
	node: PgNode;
	catalog: string | null;
	schema: string | null;
	name: string;
	/** Alias, or the table name when there is none (what columns are qualified with). */
	qualifier: string;
	hasAlias: boolean;
	scope: Scope;
}

export type Source = { kind: 'table'; table: TableRef } | { kind: 'scope'; scope: Scope } | { kind: 'function' };

export interface Scope {
	/** The inner `SelectStmt` object (without the `{ SelectStmt: … }` wrapper). */
	select: PgNode;
	parent: Scope | null;
	/** How the scope is used by its parent. */
	kind: 'root' | 'cte' | 'derived' | 'subquery' | 'union';
	ctes: Map<string, Scope>;
	/** FROM sources by alias (or table name). */
	sources: Map<string, Source>;
	/** FROM sources in order (sqlglot's `selected_sources`). */
	selectedSources: Source[];
	/** Column references that belong to this scope (not to nested subqueries). */
	columns: PgNode[];
	/** Set-operation branches (`UNION` …) when the select is not a plain SELECT. */
	branches: Scope[];
	/** Union scopes expose the output columns of their first branch. */
	isSetOperation: boolean;
}

export async function parseStatements(sql: string): Promise<PgNode[]> {
	const result = (await parse(sql)) as PgNode;
	return (result.stmts ?? []).map((statement: PgNode) => statement.stmt);
}

/** Port of `query_guard.parse_query`: exactly one statement, and it must be a query. */
export async function parseQuery(sql: string, blocked: BlockedFactory): Promise<PgNode> {
	let statements: PgNode[];
	try {
		statements = await parseStatements(sql);
	} catch (error) {
		throw blocked(`the SQL could not be parsed: ${errorMessage(error)}`);
	}
	if (statements.length !== 1 || !statements[0]) {
		throw blocked('exactly one SQL statement is required');
	}
	const statement = statements[0];
	if (!statement.SelectStmt) {
		throw blocked('only query statements can be validated');
	}
	return statement;
}

export async function deparseStatement(statement: PgNode): Promise<string> {
	return deparse({ version: 180004, stmts: [{ stmt: statement }] } as never, { pretty: false });
}

/** Deparses a single expression by printing it as the only target of a SELECT. */
export async function deparseExpression(expression: PgNode): Promise<string> {
	const sql = await deparseStatement({
		SelectStmt: {
			targetList: [{ ResTarget: { val: expression } }],
			limitOption: 'LIMIT_OPTION_DEFAULT',
			op: 'SETOP_NONE',
		},
	});
	return sql.replace(/^SELECT\s+/, '');
}

/** Builds the scope tree of a query statement and returns every scope, innermost first (like `traverse_scope`). */
export function traverseScopes(statement: PgNode): Scope[] {
	const scopes: Scope[] = [];
	buildScope(statement.SelectStmt, null, 'root', new Map(), scopes);
	return scopes;
}

/** Port of `query_guard.base_table_expressions`: every real table read by the query, once each. */
export function baseTables(scopes: Scope[], statement: PgNode, blocked: BlockedFactory): TableRef[] {
	const tables: TableRef[] = [];
	const seen = new Set<PgNode>();
	for (const scope of scopes) {
		for (const source of scope.selectedSources) {
			if (source.kind === 'function') {
				throw blocked('a dynamic table reference could not be resolved');
			}
			if (source.kind === 'table' && !seen.has(source.table.node)) {
				seen.add(source.table.node);
				tables.push(source.table);
			}
		}
	}
	if (tables.length === 0 && containsRangeVar(statement)) {
		throw blocked("the query's table references could not be resolved");
	}
	return tables;
}

function buildScope(
	select: PgNode,
	parent: Scope | null,
	kind: Scope['kind'],
	inheritedCtes: Map<string, Scope>,
	scopes: Scope[],
): Scope {
	const scope: Scope = {
		select,
		parent,
		kind,
		ctes: new Map(inheritedCtes),
		sources: new Map(),
		selectedSources: [],
		columns: [],
		branches: [],
		isSetOperation: Boolean(select.op && select.op !== 'SETOP_NONE'),
	};

	const withClause = select.withClause?.WithClause ?? select.withClause;
	const ctes: PgNode[] = withClause?.ctes ?? [];
	const recursive = Boolean(withClause?.recursive);
	for (const cte of ctes) {
		const definition = cte.CommonTableExpr;
		if (!definition.ctequery?.SelectStmt) {
			throw new Error('data-modifying statements in WITH cannot be validated');
		}
		if (recursive) {
			scope.ctes.set(definition.ctename, placeholderScope(definition.ctequery.SelectStmt, scope));
		}
		const cteScope = buildScope(definition.ctequery.SelectStmt, scope, 'cte', scope.ctes, scopes);
		scope.ctes.set(definition.ctename, cteScope);
	}

	if (scope.isSetOperation) {
		for (const branch of [select.larg, select.rarg]) {
			scope.branches.push(buildScope(branch, scope, 'union', scope.ctes, scopes));
		}
		collectExpressionScopes(select.sortClause, scope, scopes);
		collectExpressionScopes(select.limitCount, scope, scopes);
		collectExpressionScopes(select.limitOffset, scope, scopes);
		scopes.push(scope);
		return scope;
	}

	for (const item of select.fromClause ?? []) {
		addFromItem(item, scope, scopes);
	}
	for (const key of [
		'targetList',
		'whereClause',
		'groupClause',
		'havingClause',
		'sortClause',
		'windowClause',
		'distinctClause',
		'limitCount',
		'limitOffset',
		'valuesLists',
	]) {
		collectExpressionScopes(select[key], scope, scopes);
	}
	scopes.push(scope);
	return scope;
}

function placeholderScope(select: PgNode, parent: Scope): Scope {
	return {
		select,
		parent,
		kind: 'cte',
		ctes: new Map(),
		sources: new Map(),
		selectedSources: [],
		columns: [],
		branches: [],
		isSetOperation: false,
	};
}

function addFromItem(item: PgNode, scope: Scope, scopes: Scope[]): void {
	if (item.RangeVar) {
		const rangeVar = item.RangeVar;
		const alias: string | undefined = rangeVar.alias?.aliasname;
		const cte = !rangeVar.schemaname && !rangeVar.catalogname ? scope.ctes.get(rangeVar.relname) : undefined;
		const name = alias ?? rangeVar.relname;
		if (cte) {
			const source: Source = { kind: 'scope', scope: cte };
			scope.sources.set(name, source);
			scope.selectedSources.push(source);
			return;
		}
		const source: Source = {
			kind: 'table',
			table: {
				node: rangeVar,
				catalog: rangeVar.catalogname ?? null,
				schema: rangeVar.schemaname ?? null,
				name: rangeVar.relname,
				qualifier: name,
				hasAlias: alias !== undefined,
				scope,
			},
		};
		scope.sources.set(name, source);
		scope.selectedSources.push(source);
		return;
	}
	if (item.JoinExpr) {
		addFromItem(item.JoinExpr.larg, scope, scopes);
		addFromItem(item.JoinExpr.rarg, scope, scopes);
		collectExpressionScopes(item.JoinExpr.quals, scope, scopes);
		return;
	}
	if (item.RangeSubselect) {
		const child = buildScope(item.RangeSubselect.subquery.SelectStmt, scope, 'derived', scope.ctes, scopes);
		const source: Source = { kind: 'scope', scope: child };
		const alias: string | undefined = item.RangeSubselect.alias?.aliasname;
		if (alias) {
			scope.sources.set(alias, source);
		}
		scope.selectedSources.push(source);
		return;
	}
	if (item.RangeTableSample) {
		addFromItem(item.RangeTableSample.relation, scope, scopes);
		return;
	}
	// RangeFunction, RangeTableFunc (XMLTABLE), JSON_TABLE…: rows produced by a function call.
	const source: Source = { kind: 'function' };
	const functionAlias: string | undefined = Object.values(item)[0]?.alias?.aliasname;
	if (functionAlias) {
		scope.sources.set(functionAlias, source);
	}
	scope.selectedSources.push(source);
	collectExpressionScopes(item, scope, scopes);
}

/** Walks an expression tree, collecting column references for `scope` and building scopes for subqueries. */
function collectExpressionScopes(node: unknown, scope: Scope, scopes: Scope[]): void {
	if (Array.isArray(node)) {
		for (const child of node) {
			collectExpressionScopes(child, scope, scopes);
		}
		return;
	}
	if (!node || typeof node !== 'object') {
		return;
	}
	const record = node as PgNode;
	if (record.ColumnRef) {
		scope.columns.push(record.ColumnRef);
		return;
	}
	if (record.SubLink) {
		collectExpressionScopes(record.SubLink.testexpr, scope, scopes);
		buildScope(record.SubLink.subselect.SelectStmt, scope, 'subquery', scope.ctes, scopes);
		return;
	}
	if (record.SelectStmt) {
		buildScope(record.SelectStmt, scope, 'subquery', scope.ctes, scopes);
		return;
	}
	for (const value of Object.values(record)) {
		collectExpressionScopes(value, scope, scopes);
	}
}

export function containsRangeVar(node: unknown): boolean {
	return findNodes(node, 'RangeVar').length > 0;
}

/** Every node of a given type below `node` (the inner objects, e.g. the `ColumnRef` bodies). */
export function findNodes(node: unknown, type: string): PgNode[] {
	const found: PgNode[] = [];
	const visit = (value: unknown) => {
		if (Array.isArray(value)) {
			value.forEach(visit);
			return;
		}
		if (!value || typeof value !== 'object') {
			return;
		}
		for (const [key, child] of Object.entries(value)) {
			if (key === type && child && typeof child === 'object') {
				found.push(child as PgNode);
			}
			visit(child);
		}
	};
	visit(node);
	return found;
}

/** The identifier parts of a `ColumnRef` (`[table, column]`, `[column]`, or ending in `*`). */
export function columnRefParts(columnRef: PgNode): { parts: string[]; star: boolean } {
	const fields: PgNode[] = columnRef.fields ?? [];
	const star = fields.length > 0 && Boolean(fields[fields.length - 1].A_Star);
	const parts = fields.filter((field) => field.String).map((field) => field.String.sval as string);
	return { parts, star };
}

export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
