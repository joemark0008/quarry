import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import type { Project } from '../generated/prisma/client.js';
import { columnCatalogPath, writeColumnCatalog } from '../sql-engine/column-catalog.js';
import type { WarehouseCredentialsService } from '../warehouse/warehouse-credentials.service.js';
import type { WarehouseSqlService } from '../warehouse/warehouse-sql.service.js';
import type { QueryToolRepository } from './query-tool.repository.js';
import { canEditQueryTool, QueryToolService } from './query-tool.service.js';

describe('canEditQueryTool', () => {
	it('lets project admins and the creator edit', () => {
		expect(canEditQueryTool({ createdBy: 'ada' }, { userId: 'bob', role: 'admin' })).toBe(true);
		expect(canEditQueryTool({ createdBy: 'bob' }, { userId: 'bob', role: 'user' })).toBe(true);
		expect(canEditQueryTool({ createdBy: 'ada' }, { userId: 'bob', role: 'user' })).toBe(false);
		expect(canEditQueryTool({ createdBy: null }, { userId: 'bob', role: 'user' })).toBe(false);
	});
});

describe('QueryToolService.listTableColumns', () => {
	it('reads the columns the context sync recorded', async () => {
		const projectPath = await mkdtemp(path.join(tmpdir(), 'quarry-query-tools-'));
		await writeColumnCatalog(columnCatalogPath(projectPath, 'postgres', 'database=warehouse'), {
			public: {
				orders: [
					{ name: 'order_id', type: 'int32' },
					{ name: 'status', type: 'string' },
				],
			},
		});
		const service = new QueryToolService(
			{} as QueryToolRepository,
			{} as WarehouseSqlService,
			{} as WarehouseCredentialsService,
		);
		const project = { id: 'p1', path: projectPath } as Project;

		await expect(
			service.listTableColumns(project, {
				type: 'postgres',
				database: 'warehouse',
				schema: 'public',
				table: 'orders',
			}),
		).resolves.toEqual([
			{ name: 'order_id', type: 'int32' },
			{ name: 'status', type: 'string' },
		]);
		await expect(
			service.listTableColumns(project, {
				type: 'postgres',
				database: 'warehouse',
				schema: 'public',
				table: 'nope',
			}),
		).resolves.toEqual([]);
	});
});
