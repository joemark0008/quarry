import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { loadDotenv } from '../src/config/env.js';
import { createTestApp, resetDatabase, useTestDatabase } from './test-app.js';

const ORIGIN = 'http://localhost:3000';

/** Phase 2b flow on `apps/api`: create a project → connect the jaffle_shop warehouse → sync its context. */
describe('projects, warehouse connection and context sync (e2e)', () => {
	let app: NestExpressApplication;
	let cookie: string[] = [];
	let projectId = '';
	let projectPath = '';
	const warehouse = (() => {
		loadDotenv();
		return new URL(process.env.WAREHOUSE_URL ?? 'postgresql://quarry:quarry@localhost:5434/warehouse');
	})();

	beforeAll(async () => {
		const databaseUrl = useTestDatabase();
		process.env.QUARRY_PROJECTS_DIR = await mkdtemp(path.join(tmpdir(), 'quarry-projects-'));
		await resetDatabase(databaseUrl);
		app = await createTestApp();
		const res = await request(app.getHttpServer())
			.post('/api/auth/sign-up/email')
			.set('Origin', ORIGIN)
			.send({ name: 'Ada', email: 'ada@example.com', password: 'Sup3r-secret!' })
			.expect(200);
		cookie = [res.headers['set-cookie']].flat().filter(Boolean) as string[];
	});

	afterAll(async () => {
		await app?.close();
	});

	const graphql = (query: string, variables: Record<string, unknown> = {}) =>
		request(app.getHttpServer())
			.post('/graphql')
			.set('Cookie', cookie)
			.set(projectId ? { 'x-nao-project-id': projectId } : {})
			.send({ query, variables });

	it('creates a project with its own folder', async () => {
		const res = await graphql(
			'mutation ($name: String!) { createProject(input: { name: $name }) { id name path userRole } }',
			{
				name: 'Jaffle analytics',
			},
		);
		expect(res.body.errors).toBeUndefined();
		const project = res.body.data.createProject;
		expect(project).toMatchObject({ name: 'Jaffle analytics', userRole: 'admin' });
		expect(project.path.startsWith(process.env.QUARRY_PROJECTS_DIR!)).toBe(true);
		projectId = project.id;
		projectPath = project.path;

		const list = await graphql('{ projects { id name } currentProject { id } }');
		expect(list.body.data.projects).toContainEqual({ id: projectId, name: 'Jaffle analytics' });
		expect(list.body.data.currentProject.id).toBe(projectId);
	});

	it('refuses a duplicate project name', async () => {
		const res = await graphql('mutation { createProject(input: { name: "jaffle ANALYTICS" }) { id } }');
		expect(res.body.errors[0].extensions.code).toBe('CONFLICT');
	});

	const connect = (password: string) =>
		graphql(
			`
				mutation ($input: WarehouseConnectionInput!) {
					connectWarehouse(input: $input) {
						success
						message
						fields
					}
				}
			`,
			{
				input: {
					name: 'jaffle',
					host: warehouse.hostname,
					port: Number(warehouse.port || 5432),
					database: warehouse.pathname.slice(1),
					user: decodeURIComponent(warehouse.username),
					password,
				},
			},
		);

	it('reports a failed connection without saving it', async () => {
		const res = await connect('wrong-password');
		expect(res.body.data.connectWarehouse).toMatchObject({ success: false, fields: ['user', 'password'] });
		const list = await graphql('{ warehouseConnections { name } }');
		expect(list.body.data.warehouseConnections).toEqual([]);
	});

	it('connects the warehouse and keeps the password out of nao_config.yaml', async () => {
		const res = await connect(decodeURIComponent(warehouse.password));
		expect(res.body.data.connectWarehouse).toEqual({ success: true, message: 'Connected', fields: [] });

		const yaml = await readFile(path.join(projectPath, 'nao_config.yaml'), 'utf8');
		expect(yaml).toContain("password: {{ env('QUARRY_WAREHOUSE_JAFFLE_PASSWORD') }}");
		expect(yaml).not.toContain(decodeURIComponent(warehouse.password) + '\n');

		const list = await graphql('{ warehouseConnections { name type database hasPassword supported } }');
		expect(list.body.data.warehouseConnections).toEqual([
			{ name: 'jaffle', type: 'postgres', database: 'warehouse', hasPassword: true, supported: true },
		]);
		const test = await graphql('mutation { testWarehouseConnection { success message } }');
		expect(test.body.data.testWarehouseConnection.success).toBe(true);
	});

	it('syncs the context through the context.sync job', async () => {
		const res = await graphql('mutation { syncContext { state } }');
		expect(res.body.data.syncContext.state).toBe('queued');

		let status: { state: string; message: string; databases: { tablesSynced: number }[] } | undefined;
		for (let attempt = 0; attempt < 60; attempt++) {
			const poll = await graphql('{ contextSyncStatus { state message databases { tablesSynced } } }');
			status = poll.body.data.contextSyncStatus;
			if (status?.state === 'succeeded' || status?.state === 'failed') {
				break;
			}
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
		expect(status).toMatchObject({ state: 'succeeded', databases: [{ tablesSynced: 9 }] });

		const tablePath = path.join(
			projectPath,
			'databases/type=postgres/database=warehouse/schema=public/table=customers',
		);
		const columns = await readFile(path.join(tablePath, 'columns.md'), 'utf8');
		expect(columns).toContain('type: generated');
		expect(columns).toContain('| **Row Count** | 100 |');
		expect(columns).toContain('- customer_id (int32)');
		expect(columns).toContain('- customer_lifetime_value (float64)');
		const preview = await readFile(path.join(tablePath, 'preview.md'), 'utf8');
		expect(preview).toContain('## Rows (10)');
		expect(preview).toContain('"first_name": "Michael"');
		expect(await readFile(path.join(tablePath, 'annotations.md'), 'utf8')).toContain('type: manual');

		const catalog = JSON.parse(
			await readFile(
				path.join(projectPath, '.meta/databases/type=postgres/database=warehouse/columns.json'),
				'utf8',
			),
		);
		expect(catalog.schemas.public.customers[0]).toEqual({ name: 'customer_id', type: 'int32' });
	});

	it('renames and deletes the project', async () => {
		const rename = await graphql(
			'mutation ($id: ID!) { renameProject(input: { projectId: $id, name: "Jaffle" }) { name } }',
			{ id: projectId },
		);
		expect(rename.body.data.renameProject.name).toBe('Jaffle');
		const res = await graphql('mutation ($id: ID!) { deleteProject(projectId: $id) }', { id: projectId });
		expect(res.body.data.deleteProject).toBe(true);
		await expect(readFile(path.join(projectPath, 'nao_config.yaml'))).rejects.toThrow();
	});
});
