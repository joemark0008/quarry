import { type BlockedFactory, errorMessage, findNodes, parseStatements, type PgNode } from './pg-ast.js';

/**
 * quarry addition (upstream relies on warehouse permissions): the agent and the SQL editor may only run one
 * read-only query. The Postgres driver also runs every query in a `READ ONLY` transaction, so this guard is the
 * first of two layers; its job is to give a clear error before anything reaches the warehouse.
 */

export class ReadOnlyGuardError extends Error {
	override name = 'ReadOnlyGuardError';
}

/**
 * Functions that read files, other databases or server state, change settings, or hold the connection.
 * Table guards cannot see the tables these reach, so they are refused outright.
 */
const DENIED_FUNCTION_PATTERNS = [
	/^dblink/,
	/^pg_read_/,
	/^pg_ls_/,
	/^pg_stat_file$/,
	/^lo_/,
	/^pg_sleep/,
	/^pg_advisory/,
	/^pg_try_advisory/,
	/^pg_terminate_backend$/,
	/^pg_cancel_backend$/,
	/^pg_reload_conf$/,
	/^pg_rotate_logfile$/,
	/^set_config$/,
	/^pg_notify$/,
	/^query_to_xml/,
	/^query_to_json/,
	/^cursor_to_xml/,
	/^table_to_xml/,
	/^schema_to_xml/,
	/^database_to_xml/,
	/^xpath/,
	/^nextval$/,
	/^setval$/,
	/^txid_/,
	/^pg_logical_/,
	/^pg_replication_/,
	/^pg_create_/,
	/^pg_drop_/,
	/^pg_switch_wal$/,
	/^pg_promote$/,
	/^pg_import_system_collations$/,
];

export async function enforceReadOnly(sql: string): Promise<PgNode> {
	let statements: PgNode[];
	try {
		statements = await parseStatements(sql);
	} catch (error) {
		throw blocked(`the SQL could not be parsed: ${errorMessage(error)}`);
	}
	if (statements.length === 0) {
		throw blocked('the query is empty');
	}
	if (statements.length > 1) {
		throw blocked('only one statement can be run at a time');
	}
	const statement = statements[0];
	const type = Object.keys(statement)[0];
	if (type !== 'SelectStmt') {
		throw blocked(`${describeStatement(type)} statements are not allowed, only SELECT queries`);
	}
	for (const select of [statement.SelectStmt, ...findNodes(statement, 'SelectStmt')]) {
		if (select.intoClause) {
			throw blocked('SELECT INTO creates a table and is not allowed');
		}
		if (select.lockingClause) {
			throw blocked('locking clauses (FOR UPDATE / FOR SHARE) are not allowed');
		}
	}
	for (const cte of findNodes(statement, 'CommonTableExpr')) {
		if (!cte.ctequery?.SelectStmt) {
			throw blocked('data-modifying statements in WITH are not allowed');
		}
	}
	for (const call of findNodes(statement, 'FuncCall')) {
		const names: PgNode[] = call.funcname ?? [];
		const name = String(names[names.length - 1]?.String?.sval ?? '').toLowerCase();
		if (DENIED_FUNCTION_PATTERNS.some((pattern) => pattern.test(name))) {
			throw blocked(`the function ${name}() is not allowed`);
		}
	}
	return statement;
}

function describeStatement(type: string): string {
	const names: Record<string, string> = {
		InsertStmt: 'INSERT',
		UpdateStmt: 'UPDATE',
		DeleteStmt: 'DELETE',
		MergeStmt: 'MERGE',
		TruncateStmt: 'TRUNCATE',
		DropStmt: 'DROP',
		CreateStmt: 'CREATE TABLE',
		CreateTableAsStmt: 'CREATE TABLE AS',
		AlterTableStmt: 'ALTER TABLE',
		CopyStmt: 'COPY',
		GrantStmt: 'GRANT',
		ExplainStmt: 'EXPLAIN',
		VariableSetStmt: 'SET',
		TransactionStmt: 'Transaction',
		DoStmt: 'DO',
		CallStmt: 'CALL',
	};
	return names[type] ?? type.replace(/Stmt$/, '');
}

const blocked: BlockedFactory = (reason) => new ReadOnlyGuardError(`Query blocked: ${reason}.`);
