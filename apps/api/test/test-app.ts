import 'reflect-metadata';

import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import pg from 'pg';
import { inject } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

/** Points the app at the e2e database (see global-setup.ts) before any module reads the env. */
export function useTestDatabase(): string {
	const url = inject('testDatabaseUrl');
	process.env.DATABASE_URL = url;
	process.env.MODE = 'test';
	process.env.ENABLE_USER_SIGNUP = 'false';
	return url;
}

/** Empties the app tables (pg-boss keeps its own schema). */
export async function resetDatabase(url: string): Promise<void> {
	const client = new pg.Client({ connectionString: url });
	await client.connect();
	try {
		const { rows } = await client.query<{ tablename: string }>(
			"SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
		);
		await client.query(`TRUNCATE ${rows.map((row) => `"${row.tablename}"`).join(', ')} CASCADE`);
	} finally {
		await client.end();
	}
}

export async function createTestApp(): Promise<NestExpressApplication> {
	const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
	const app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false, logger: ['error'] });
	configureApp(app);
	await app.init();
	return app;
}
