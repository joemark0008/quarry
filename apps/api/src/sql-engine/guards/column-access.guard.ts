import { type CatalogSchemas, columnCatalogPath, loadColumnCatalog } from '../column-catalog.js';
import { columnMatchesPattern, getDatabaseFolderNames } from '../database-config.js';
import {
	type BlockedFactory,
	columnRefParts,
	errorMessage,
	findNodes,
	parseQuery,
	type PgNode,
	type Scope,
	type Source,
	type TableRef,
	traverseScopes,
} from './pg-ast.js';
import { matchIdentifier } from './query-guard.js';

/**
 * Port of `nao_core/config/databases/column_access.py` + `column_access_analysis.py`: blocks queries that read a
 * column matched by `exclude_columns`, explicitly or through `SELECT *`. Column lineage is traced through CTEs and
 * derived tables using the column catalog (`.meta/.../columns.json`) written by sync; no connection is opened.
 */

export class ColumnAccessError extends Error {
	override name = 'ColumnAccessError';
}

export interface ColumnAccessConfig {
	type: string;
	name: string;
	database: string;
	exclude_columns: string[];
}

interface ColumnOrigin {
	schema: string;
	table: string;
	column: string;
}

interface TableInfo {
	schema: string;
	table: string;
	columns: string[];
}

interface OutputColumn {
	name: string;
	origins: ColumnOrigin[];
}

const STAR_EXCLUSION_KEYWORDS: Record<string, string> = {};

export async function validateColumnAccess(
	sql: string,
	dbConfig: ColumnAccessConfig,
	projectPath: string,
	databaseFolder: string | null = null,
): Promise<string> {
	if (dbConfig.exclude_columns.length === 0) {
		return sql;
	}
	if (dbConfig.type !== 'postgres') {
		throw blocked(`the database dialect '${dbConfig.type}' is not supported`);
	}

	const statement = await parseQuery(sql, blocked);
	if (findNodes(statement, 'RangeVar').length === 0) {
		return sql;
	}

	try {
		const folder = databaseFolder ?? getDatabaseFolderNames([dbConfig])[0];
		const catalog = await loadColumnCatalog(columnCatalogPath(projectPath, dbConfig.type, folder));
		const scopes = traverseScopes(statement);
		const analyzer = new ColumnAccessAnalyzer(scopes, catalog, dbConfig);
		analyzer.validateStarLocations(statement);

		const explicit = analyzer.findExplicitExcludedReferences();
		if (explicit.length > 0) {
			const names = explicit.map(qualifiedName).sort().join(', ');
			throw new ColumnAccessError(
				`Query blocked because it explicitly references excluded column(s): ${names}. ` +
					'Remove those column references and try again.',
			);
		}

		const starred = analyzer.findExcludedStarReferences();
		if (starred.length > 0) {
			const names = starred.map(qualifiedName).sort().join(', ');
			const columnNames = [...new Set(starred.map((origin) => origin.column))].sort();
			const advice = starExclusionAdvice(dbConfig.type, columnNames);
			throw new ColumnAccessError(
				`Query blocked because SELECT * would include excluded column(s): ${names}. ${advice}`,
			);
		}
		return sql;
	} catch (error) {
		if (error instanceof ColumnAccessError) {
			throw error;
		}
		throw blocked(errorMessage(error));
	}
}

class ColumnAccessAnalyzer {
	private readonly outputCache = new Map<Scope, OutputColumn[]>();
	private readonly tableInfoCache = new Map<PgNode, TableInfo[]>();

	constructor(
		private readonly scopes: Scope[],
		private readonly catalog: CatalogSchemas,
		private readonly dbConfig: ColumnAccessConfig,
	) {}

	/** A star is only allowed as a whole projection (`SELECT *`, `SELECT t.*`); `count(*)` has no star node. */
	validateStarLocations(statement: PgNode): void {
		const allowed = new Set<PgNode>();
		for (const select of findNodes(statement, 'SelectStmt')) {
			for (const target of select.targetList ?? []) {
				if (target.ResTarget?.val?.ColumnRef) {
					allowed.add(target.ResTarget.val.ColumnRef);
				}
			}
		}
		for (const columnRef of findNodes(statement, 'ColumnRef')) {
			if (columnRefParts(columnRef).star && !allowed.has(columnRef)) {
				throw blocked('star expansion nested inside an expression cannot be resolved safely');
			}
		}
	}

	findExplicitExcludedReferences(): ColumnOrigin[] {
		const excluded = new Map<string, ColumnOrigin>();
		for (const scope of this.scopes) {
			for (const column of scope.columns) {
				if (columnRefParts(column).star) {
					continue;
				}
				for (const origin of this.resolveColumn(scope, column)) {
					if (this.isExcluded(origin)) {
						excluded.set(qualifiedName(origin), origin);
					}
				}
			}
		}
		return [...excluded.values()];
	}

	findExcludedStarReferences(): ColumnOrigin[] {
		const excluded = new Map<string, ColumnOrigin>();
		for (const scope of this.scopes) {
			if (scope.isSetOperation) {
				continue;
			}
			for (const target of scope.select.targetList ?? []) {
				const columnRef = target.ResTarget?.val?.ColumnRef;
				if (!columnRef || !columnRefParts(columnRef).star) {
					continue;
				}
				for (const output of this.starOutputs(scope, columnRef)) {
					for (const origin of output.origins) {
						if (this.isExcluded(origin)) {
							excluded.set(qualifiedName(origin), origin);
						}
					}
				}
			}
			if (excluded.size > 0) {
				return [...excluded.values()];
			}
		}
		return [...excluded.values()];
	}

	private starOutputs(scope: Scope, columnRef: PgNode): OutputColumn[] {
		const { parts } = columnRefParts(columnRef);
		if (parts.length > 0) {
			const alias = parts[parts.length - 1];
			const source = scope.sources.get(alias);
			if (!source) {
				throw blocked(`qualified star ${alias}.* could not be resolved`);
			}
			return this.sourceOutputs(source);
		}
		return scope.selectedSources.flatMap((source) => this.sourceOutputs(source));
	}

	private sourceOutputs(source: Source): OutputColumn[] {
		if (source.kind === 'table') {
			const outputs = new Map<string, OutputColumn>();
			for (const info of this.tableInfos(source.table)) {
				for (const column of info.columns) {
					const key = column.toLowerCase();
					const existing = outputs.get(key);
					const origin = { schema: info.schema, table: info.table, column };
					outputs.set(key, { name: column, origins: [...(existing?.origins ?? []), origin] });
				}
			}
			return [...outputs.values()];
		}
		if (source.kind === 'scope') {
			return this.scopeOutputs(source.scope);
		}
		return [];
	}

	private scopeOutputs(scope: Scope): OutputColumn[] {
		const cached = this.outputCache.get(scope);
		if (cached) {
			return cached;
		}
		if (scope.isSetOperation) {
			throw blocked('derived query outputs cannot be resolved safely');
		}
		const outputs: OutputColumn[] = [];
		const names = new Set<string>();
		for (const target of scope.select.targetList ?? []) {
			const resTarget = target.ResTarget;
			const columnRef = resTarget?.val?.ColumnRef;
			if (columnRef && columnRefParts(columnRef).star) {
				outputs.push(...this.starOutputs(scope, columnRef));
				continue;
			}
			const name = outputName(resTarget);
			if (!name) {
				throw blocked('a derived output column has no stable name');
			}
			if (names.has(name.toLowerCase())) {
				throw blocked(`derived query has duplicate output column '${name}'`);
			}
			names.add(name.toLowerCase());
			outputs.push({ name, origins: this.projectionOrigins(scope, resTarget.val) });
		}
		this.outputCache.set(scope, outputs);
		return outputs;
	}

	private projectionOrigins(scope: Scope, expression: PgNode): ColumnOrigin[] {
		const scopeColumns = new Set(scope.columns);
		return findNodes(expression, 'ColumnRef')
			.filter((column) => scopeColumns.has(column) && !columnRefParts(column).star)
			.flatMap((column) => this.resolveColumn(scope, column));
	}

	private resolveColumn(scope: Scope, columnRef: PgNode): ColumnOrigin[] {
		const { parts } = columnRefParts(columnRef);
		if (parts.length === 1) {
			return this.resolveUnqualifiedColumn(scope, parts[0]);
		}
		const qualifier = parts[parts.length - 2];
		const column = parts[parts.length - 1];
		let current: Scope | null = scope;
		let source: Source | undefined;
		while (current && !source) {
			source = current.sources.get(qualifier);
			current = current.parent;
		}
		if (!source) {
			throw blocked(`source alias '${qualifier}' could not be resolved`);
		}
		if (source.kind === 'table') {
			return this.tableColumnOrigins(source.table, column);
		}
		if (source.kind === 'scope') {
			return this.resolveScopeOutput(source.scope, column);
		}
		return [];
	}

	/**
	 * sqlglot's `qualify` ties an unqualified column to the source whose known columns contain it; when no
	 * source knows it, every candidate source is checked. Correlated subqueries fall back to the outer scopes,
	 * and ORDER BY / GROUP BY may name a projection alias.
	 */
	private resolveUnqualifiedColumn(scope: Scope, columnName: string): ColumnOrigin[] {
		let current: Scope | null = scope;
		while (current) {
			const origins = this.unqualifiedInScope(current, columnName);
			if (origins) {
				return origins;
			}
			current = current.kind === 'subquery' || current.kind === 'derived' ? current.parent : null;
		}
		const aliased = this.projectionAliasOrigins(scope, columnName);
		if (aliased) {
			return aliased;
		}
		throw blocked(`column '${columnName}' could not be tied to a source`);
	}

	private unqualifiedInScope(scope: Scope, columnName: string): ColumnOrigin[] | null {
		const known: ColumnOrigin[] = [];
		let knownMatch = false;
		const unknown: ColumnOrigin[] = [];
		let hasFunctionSource = false;
		for (const source of scope.selectedSources) {
			if (source.kind === 'table') {
				const infos = this.tableInfos(source.table);
				const matching = infos.filter((info) => matchIdentifier(columnName, info.columns) !== null);
				if (matching.length > 0) {
					knownMatch = true;
					known.push(...matching.map((info) => tableOrigin(info, columnName)));
				} else if (infos.every((info) => info.columns.length === 0)) {
					unknown.push(...infos.map((info) => tableOrigin(info, columnName)));
				}
			} else if (source.kind === 'scope') {
				const outputs = this.scopeOutputs(source.scope).filter(
					(output) => output.name.toLowerCase() === columnName.toLowerCase(),
				);
				if (outputs.length > 0) {
					knownMatch = true;
					known.push(...outputs.flatMap((output) => output.origins));
				}
			} else {
				hasFunctionSource = true;
			}
		}
		if (knownMatch) {
			return known;
		}
		if (unknown.length > 0) {
			return unknown;
		}
		if (hasFunctionSource) {
			return [];
		}
		return null;
	}

	private projectionAliasOrigins(scope: Scope, columnName: string): ColumnOrigin[] | null {
		for (const target of scope.select.targetList ?? []) {
			const resTarget = target.ResTarget;
			if (resTarget?.name && resTarget.name.toLowerCase() === columnName.toLowerCase()) {
				return findNodes(resTarget.val, 'ColumnRef')
					.filter((column) => !columnRefParts(column).star)
					.flatMap((column) => this.resolveColumn(scope, column));
			}
		}
		return null;
	}

	private tableColumnOrigins(table: TableRef, columnName: string): ColumnOrigin[] {
		return this.tableInfos(table).map((info) => tableOrigin(info, columnName));
	}

	private resolveScopeOutput(scope: Scope, columnName: string): ColumnOrigin[] {
		const matches = this.scopeOutputs(scope).filter(
			(output) => output.name.toLowerCase() === columnName.toLowerCase(),
		);
		if (matches.length !== 1) {
			throw blocked(`derived column '${columnName}' could not be resolved unambiguously`);
		}
		return matches[0].origins;
	}

	private tableInfos(table: TableRef): TableInfo[] {
		let infos = this.tableInfoCache.get(table.node);
		if (!infos) {
			infos = resolveTableInfos(table, this.catalog, this.dbConfig);
			this.tableInfoCache.set(table.node, infos);
		}
		return infos;
	}

	private isExcluded(origin: ColumnOrigin): boolean {
		return !columnMatchesPattern(this.dbConfig, origin.schema, origin.table, origin.column);
	}
}

function resolveTableInfos(table: TableRef, catalog: CatalogSchemas, dbConfig: ColumnAccessConfig): TableInfo[] {
	if (!table.name) {
		throw blocked('a dynamic table reference could not be resolved');
	}
	if (table.catalog && !catalogMatchesDatabase(table.catalog, dbConfig.database)) {
		throw blocked(`catalog '${table.catalog}' does not match the configured database '${dbConfig.database}'`);
	}
	const schemaNames = Object.keys(catalog);
	if (table.schema) {
		const candidates = table.catalog ? [`${table.catalog}.${table.schema}`, table.schema] : [table.schema];
		const schema =
			candidates.map((candidate) => matchIdentifier(candidate, schemaNames)).find((match) => match !== null) ??
			candidates[0];
		return [tableInfo(catalog, schema, table.name)];
	}
	const matches = schemaNames
		.filter((schema) => matchIdentifier(table.name, Object.keys(catalog[schema])) !== null)
		.map((schema) => tableInfo(catalog, schema, table.name));
	if (matches.length > 0) {
		return matches;
	}
	if (schemaNames.length === 1) {
		return [{ schema: schemaNames[0], table: table.name, columns: [] }];
	}
	return [{ schema: '', table: table.name, columns: [] }];
}

function tableInfo(catalog: CatalogSchemas, schema: string, requestedTable: string): TableInfo {
	const tables = catalog[schema] ?? {};
	const table = matchIdentifier(requestedTable, Object.keys(tables)) ?? requestedTable;
	return { schema, table, columns: (tables[table] ?? []).map((column) => column.name) };
}

function tableOrigin(info: TableInfo, columnName: string): ColumnOrigin {
	const column = matchIdentifier(columnName, info.columns) ?? columnName;
	return { schema: info.schema, table: info.table, column };
}

function catalogMatchesDatabase(requestedCatalog: string, databaseName: string): boolean {
	const parts = databaseName.split('.');
	const candidates = parts.map((_, index) => parts.slice(0, index + 1).join('.'));
	return matchIdentifier(requestedCatalog, candidates) !== null;
}

/** The output name Postgres gives a projection, when it is a stable one (alias, column or function name). */
function outputName(resTarget: PgNode): string | null {
	if (resTarget.name) {
		return resTarget.name;
	}
	let value = resTarget.val;
	while (value?.TypeCast) {
		value = value.TypeCast.arg;
	}
	if (value?.ColumnRef) {
		const { parts } = columnRefParts(value.ColumnRef);
		return parts[parts.length - 1] ?? null;
	}
	if (value?.FuncCall) {
		const names: PgNode[] = value.FuncCall.funcname ?? [];
		return names[names.length - 1]?.String?.sval ?? null;
	}
	return null;
}

function qualifiedName(origin: ColumnOrigin): string {
	return [origin.schema, origin.table, origin.column].filter(Boolean).join('.');
}

function starExclusionAdvice(databaseType: string, columnNames: string[]): string {
	const keyword = STAR_EXCLUSION_KEYWORDS[databaseType];
	if (!keyword) {
		return 'Select only allowed columns explicitly instead of using *.';
	}
	return `Use SELECT * ${keyword} (${columnNames.join(', ')}) to exclude them.`;
}

const blocked: BlockedFactory = (reason) =>
	new ColumnAccessError(`Query blocked because exclude_columns could not safely validate it: ${reason}`);
