import { mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { GuardConnection } from './query-guard.js';

/** The `FakeConnection` / `FakeDatabaseConfig` pair of the upstream guard tests. */
export class FakeConnection implements GuardConnection {
	connectCount = 0;

	constructor(
		public schemas: Record<string, string[]> = { main: ['orders', 'users'] },
		private readonly databaseName = 'local',
		readonly type = 'postgres',
	) {}

	getDatabaseName(): string {
		return this.databaseName;
	}

	async listSchemas(): Promise<string[]> {
		return Object.keys(this.schemas);
	}

	async listTables(schema: string): Promise<string[]> {
		const tables = this.schemas[schema];
		if (!tables) {
			throw new Error(`schema ${schema} does not exist`);
		}
		return tables;
	}

	connect = (): FakeConnection => {
		this.connectCount += 1;
		return this;
	};
}

export async function tempProject(): Promise<string> {
	return mkdtemp(path.join(tmpdir(), 'quarry-guard-'));
}

export async function createContextTable(
	projectFolder: string,
	schema: string,
	table: string,
	{ databaseType = 'postgres', databaseFolder = 'local' } = {},
): Promise<void> {
	await mkdir(
		path.join(
			projectFolder,
			'databases',
			`type=${databaseType}`,
			`database=${databaseFolder}`,
			`schema=${schema}`,
			`table=${table}`,
		),
		{ recursive: true },
	);
}
