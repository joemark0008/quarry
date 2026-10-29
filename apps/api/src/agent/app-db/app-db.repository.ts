import { Injectable } from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { getScopedViews } from './app-db-views.js';

export interface AppDbQueryResult {
	columns: string[];
	rows: Record<string, unknown>[];
}

const APP_DB_STATEMENT_TIMEOUT_MS = 30_000;
/** Prisma's interactive transactions time out after 5s by default; leave room for the statement timeout. */
const APP_DB_TRANSACTION_TIMEOUT_MS = APP_DB_STATEMENT_TIMEOUT_MS + 10_000;

/** Thrown at the end of the transaction so Prisma rolls it back and the temp objects never outlive the query. */
class RollbackSandbox extends Error {
	constructor(readonly result: AppDbQueryResult) {
		super('rollback app-db sandbox');
	}
}

/**
 * Port of upstream `db/readonly-app-db.ts` (`runPostgres`; quarry is Postgres-only).
 *
 * Upstream opens a dedicated postgres.js connection, builds the sandbox in a setup transaction and runs
 * the query in a second, read-only one. Prisma hands out pooled connections, so here everything happens
 * in ONE interactive transaction that is always rolled back: the `_scope` temp table and the temp views
 * are dropped with it and never linger on the pooled connection.
 */
@Injectable()
export class AppDbRepository {
	constructor(private readonly prisma: PrismaService) {}

	async runScopedAppDbQuery(projectId: string, sql: string): Promise<AppDbQueryResult> {
		try {
			await this.prisma.$transaction(
				async (tx) => {
					await tx.$executeRawUnsafe('CREATE TEMP TABLE _scope (project_id text NOT NULL)');
					await tx.$executeRaw`INSERT INTO _scope (project_id) VALUES (${projectId})`;
					for (const view of getScopedViews()) {
						await tx.$executeRawUnsafe(`CREATE TEMP VIEW ${view.name} AS ${view.body}`);
					}
					// Run the caller's query read-only so any write that slipped past the validator is rejected at
					// the database level. Switching read-write -> read-only mid-transaction is allowed in Postgres
					// (upstream used a separate READ ONLY transaction because CREATE is disallowed under it).
					await tx.$executeRawUnsafe('SET LOCAL transaction_read_only = on');
					// The validator's function-call lexer reads plain strings with standard (non-backslash) escaping.
					await tx.$executeRawUnsafe('SET LOCAL standard_conforming_strings = on');
					// Caps runaway queries (huge cross joins, generate_series) so one tool call cannot pin the database.
					await tx.$executeRawUnsafe(`SET LOCAL statement_timeout = ${APP_DB_STATEMENT_TIMEOUT_MS}`);
					const rows = (await tx.$queryRawUnsafe<Record<string, unknown>[]>(sql)).map(normalizeRow);
					throw new RollbackSandbox({ columns: rows.length > 0 ? Object.keys(rows[0]) : [], rows });
				},
				{ timeout: APP_DB_TRANSACTION_TIMEOUT_MS },
			);
		} catch (error) {
			if (error instanceof RollbackSandbox) {
				return error.result;
			}
			throw unwrapDatabaseError(error);
		}
		throw new Error('unreachable: the app-db sandbox transaction always rolls back');
	}
}

/**
 * Prisma wraps a failed raw query as `Invalid prisma.$queryRawUnsafe() invocation: Raw query failed. Code: …`.
 * Upstream surfaced the plain Postgres message (which `explainAppDbError` and the model read), so unwrap it.
 */
function unwrapDatabaseError(error: unknown): unknown {
	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		const cause = (error.meta?.driverAdapterError as { cause?: { originalMessage?: unknown } } | undefined)?.cause;
		if (typeof cause?.originalMessage === 'string') {
			return new Error(cause.originalMessage, { cause: error });
		}
	}
	return error;
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, normalizeValue(value)]));
}

/**
 * Keeps results JSON-serializable, like upstream's postgres.js output: BigInt and Decimal become strings,
 * Dates become ISO strings. Upstream kept naive `timestamp`/`date` values as the strings Postgres returned
 * (e.g. `2024-06-23 08:15:00`); Prisma has already parsed them as UTC Dates, so they come out as
 * `2024-06-23T08:15:00.000Z` here, which denotes the same instant.
 */
function normalizeValue(value: unknown): unknown {
	if (typeof value === 'bigint') {
		return value.toString();
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	if (Prisma.Decimal.isDecimal(value)) {
		return value.toString();
	}
	return value;
}
