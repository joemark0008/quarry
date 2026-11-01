import { createHash } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getChatInfo: vi.fn(),
	getChatOwnerId: vi.fn(),
	getChatProjectId: vi.fn(),
	getLatestVersionByChatAndSlug: vi.fn(),
	getSqlQueriesFromCode: vi.fn(),
	getSqlQueryById: vi.fn(),
	getStoryDataCacheByChatAndSlug: vi.fn(),
	getQueryDataFromCode: vi.fn(),
	queryAppDb: vi.fn(),
	buildToolContext: vi.fn(),
	executeWarehouseSql: vi.fn(),
	upsertStoryDataCache: vi.fn(),
	updateLatestVersionCode: vi.fn(),
	findMissingQueryIds: vi.fn(),
	backfillMissingQueryData: vi.fn(),
	generateText: vi.fn(),
	getProjectModelProvider: vi.fn(),
	resolveDefaultModelSelection: vi.fn(),
	resolveProviderModel: vi.fn(),
}));

vi.mock('ai', async (importOriginal) => ({
	...(await importOriginal<typeof import('ai')>()),
	generateText: mocks.generateText,
}));

vi.mock('../story-queries.js', () => ({
	chatQueries: {
		getChatInfo: mocks.getChatInfo,
		getChatOwnerId: mocks.getChatOwnerId,
		getChatProjectId: mocks.getChatProjectId,
	},
	executeSqlQueries: { getLatestSqlQueriesByIds: vi.fn(async () => ({})) },
	storyQueries: {
		getLatestVersionByChatAndSlug: mocks.getLatestVersionByChatAndSlug,
		getSqlQueriesFromCode: mocks.getSqlQueriesFromCode,
		getSqlQueryById: mocks.getSqlQueryById,
		getStoryDataCacheByChatAndSlug: mocks.getStoryDataCacheByChatAndSlug,
		upsertStoryDataCache: mocks.upsertStoryDataCache,
		updateLatestVersionCode: mocks.updateLatestVersionCode,
	},
	sharedStoryQueries: { getQueryDataFromCode: mocks.getQueryDataFromCode },
	storyFileQueries: { listVersionFiles: vi.fn(async () => []) },
	storyRuntime: {
		buildToolContext: mocks.buildToolContext,
		runScopedAppDbQuery: mocks.queryAppDb,
		llm: {
			getProjectModelProvider: mocks.getProjectModelProvider,
			resolveDefaultModelSelection: mocks.resolveDefaultModelSelection,
			resolveProviderModel: mocks.resolveProviderModel,
		},
	},
}));

vi.mock('../utils/story-query-data.js', () => ({
	backfillMissingQueryData: mocks.backfillMissingQueryData,
	findMissingQueryIds: mocks.findMissingQueryIds,
	extractCustomStoryQueryIds: () => new Set<string>(),
}));

import { createStoryExecutionContext, executeLiveQuery, getStoryQueryData, refreshStoryData } from './live-story.js';

function querySource(sql: string, databaseId: string | null = null, adminMode = false) {
	return {
		fingerprint: createHash('sha256').update(JSON.stringify({ sql, databaseId, adminMode })).digest('hex'),
		databaseId,
		adminMode,
	};
}

describe('live story SQL execution', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mocks.getChatInfo.mockResolvedValue({
			projectId: 'project-1',
			userId: 'owner-1',
			title: 'Chat',
		});
		mocks.getChatOwnerId.mockResolvedValue('owner-1');
		mocks.getChatProjectId.mockResolvedValue('project-1');
		mocks.getLatestVersionByChatAndSlug.mockResolvedValue({
			code: '<table query_id="query_admin" />',
			isLiveTextDynamic: false,
			format: 'classic',
		});
		mocks.buildToolContext.mockImplementation(async () => ({
			services: { executeWarehouseSql: mocks.executeWarehouseSql },
			projectFolder: '/project',
			projectId: 'project-1',
			userId: 'owner-1',
			chatId: 'chat-1',
			queryResults: new Map(),
			envVars: { TOKEN: 'secret' },
			azureAccessToken: 'owner-token',
			agentSettings: null,
			warehouseTableAccess: { enforced: true, strict: true, tables: [] },
			warehouseRowSecurity: {
				enforced: true,
				tables: [
					{
						databaseType: 'duckdb',
						database: 'analytics',
						schema: 'main',
						table: 'orders',
						constraintColumns: ['tenant_id'],
						access: 'predicate',
						predicate: 'tenant_id = 1',
					},
				],
			},
		}));
		mocks.getStoryDataCacheByChatAndSlug.mockResolvedValue(null);
		mocks.findMissingQueryIds.mockReturnValue([]);
		mocks.upsertStoryDataCache.mockResolvedValue({});
		mocks.updateLatestVersionCode.mockResolvedValue(undefined);
		mocks.resolveDefaultModelSelection.mockResolvedValue(null);
		mocks.getProjectModelProvider.mockResolvedValue(null);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('builds the execution context with the chat owner', async () => {
		await createStoryExecutionContext('chat-1');

		expect(mocks.buildToolContext).toHaveBeenCalledWith({
			projectId: 'project-1',
			userId: 'owner-1',
			chatId: 'chat-1',
		});
	});

	it('rejects execution when the chat owner is missing', async () => {
		mocks.getChatOwnerId.mockResolvedValue(undefined);

		await expect(createStoryExecutionContext('chat-1')).rejects.toThrow('Chat owner not found');
		expect(mocks.buildToolContext).not.toHaveBeenCalled();
	});

	it('refreshes admin-mode story queries from the app database', async () => {
		mocks.getSqlQueriesFromCode.mockResolvedValue({
			query_admin: {
				sqlQuery: 'SELECT * FROM v_messages',
				adminMode: true,
			},
		});
		mocks.queryAppDb.mockResolvedValue({
			_version: '1',
			columns: ['chat_id'],
			rows: [{ chat_id: 'chat-1' }],
			rowCount: 1,
		});

		await expect(refreshStoryData('chat-1', 'usage')).resolves.toEqual({
			queryData: {
				query_admin: {
					columns: ['chat_id'],
					data: [{ chat_id: 'chat-1' }],
				},
			},
			narratives: {},
		});

		expect(mocks.buildToolContext).not.toHaveBeenCalled();
		expect(mocks.upsertStoryDataCache).toHaveBeenCalledWith(
			'chat-1',
			'usage',
			{
				query_admin: {
					columns: ['chat_id'],
					data: [{ chat_id: 'chat-1' }],
				},
			},
			{
				query_admin: querySource('SELECT * FROM v_messages', null, true),
			},
			{},
		);
	});

	it('refreshes a shared live story as its owner and writes the shared cache', async () => {
		const code = '<table query_id="query_warehouse" />';
		mocks.getLatestVersionByChatAndSlug.mockResolvedValue({
			code,
			isLiveTextDynamic: false,
			format: 'classic',
		});
		mocks.getSqlQueriesFromCode.mockResolvedValue({
			query_warehouse: {
				sqlQuery: 'SELECT * FROM orders',
				databaseId: 'analytics',
				adminMode: false,
			},
		});
		mocks.executeWarehouseSql.mockResolvedValue({ columns: ['order_id'], data: [{ order_id: 1 }], row_count: 1 });

		await expect(getStoryQueryData('chat-1', 'orders', code, true, null)).resolves.toMatchObject({
			queryData: {
				query_warehouse: {
					columns: ['order_id'],
					data: [{ order_id: 1 }],
				},
			},
			code,
		});

		expect(mocks.queryAppDb).not.toHaveBeenCalled();
		expect(mocks.executeWarehouseSql).toHaveBeenCalledOnce();
		expect(mocks.buildToolContext).toHaveBeenCalledWith({
			projectId: 'project-1',
			userId: 'owner-1',
			chatId: 'chat-1',
		});
		// quarry: the warehouse runs in process (upstream posted to its FastAPI service with the same access rules).
		expect(mocks.executeWarehouseSql.mock.calls[0][1]).toMatchObject({
			databaseId: 'analytics',
			azureAccessToken: 'owner-token',
			tableAccess: { enforced: true, tables: [] },
			rowSecurity: {
				enforced: true,
				tables: [expect.objectContaining({ table: 'orders', predicate: 'tenant_id = 1' })],
			},
		});
		expect(mocks.upsertStoryDataCache).toHaveBeenCalledWith(
			'chat-1',
			'orders',
			{
				query_warehouse: {
					columns: ['order_id'],
					data: [{ order_id: 1 }],
				},
			},
			{
				query_warehouse: querySource('SELECT * FROM orders', 'analytics'),
			},
			{},
		);
	});

	it('returns non-live stored data regardless of row security', async () => {
		const code = '<table query_id="query_warehouse" />';
		const queryData = {
			query_warehouse: {
				columns: ['region'],
				data: [{ region: 'all-regions' }],
			},
		};
		mocks.getQueryDataFromCode.mockResolvedValue(queryData);

		await expect(getStoryQueryData('chat-1', 'orders', code, false, null)).resolves.toEqual({
			queryData,
			cachedAt: null,
			code,
			allowsPersistedFallback: true,
		});

		expect(mocks.getQueryDataFromCode).toHaveBeenCalledWith('chat-1', code);
		expect(mocks.buildToolContext).not.toHaveBeenCalled();
	});

	it('serves a fresh shared cache without building an execution context', async () => {
		const code = '<table query_id="query_warehouse" />';
		const cache = {
			queryData: {
				query_warehouse: {
					columns: ['owner'],
					data: [{ owner: 'owner-1' }],
				},
			},
			querySources: {
				query_warehouse: querySource('SELECT * FROM orders', 'analytics'),
			},
			cachedAt: new Date(),
		};
		mocks.getStoryDataCacheByChatAndSlug.mockResolvedValue(cache);

		await expect(getStoryQueryData('chat-1', 'orders', code, true, null)).resolves.toEqual({
			queryData: cache.queryData,
			cachedAt: cache.cachedAt,
			code,
		});
		expect(mocks.buildToolContext).not.toHaveBeenCalled();
	});

	it('backfills missing data in a fresh legacy cache', async () => {
		const code = '<table query_id="query_warehouse" />';
		const cachedAt = new Date();
		const backfilled = {
			query_warehouse: {
				columns: ['id'],
				data: [{ id: 2 }],
			},
		};
		mocks.getStoryDataCacheByChatAndSlug.mockResolvedValue({
			queryData: {},
			querySources: null,
			cachedAt,
		});
		mocks.findMissingQueryIds.mockReturnValue(['query_warehouse']);
		mocks.backfillMissingQueryData.mockResolvedValue(backfilled);

		await expect(getStoryQueryData('chat-1', 'orders', code, true, null)).resolves.toEqual({
			queryData: backfilled,
			cachedAt,
			code,
		});
		expect(mocks.backfillMissingQueryData).toHaveBeenCalledWith(code, {}, { chatId: 'chat-1' });
	});

	it('falls back to an expired cache when owner refresh fails', async () => {
		const code = '<table query_id="query_warehouse" />';
		const cache = {
			queryData: {
				query_warehouse: {
					columns: ['id'],
					data: [{ id: 1 }],
				},
			},
			querySources: null,
			cachedAt: new Date(0),
		};
		mocks.getStoryDataCacheByChatAndSlug.mockResolvedValue(cache);
		mocks.getLatestVersionByChatAndSlug.mockRejectedValue(new Error('Warehouse unavailable'));

		await expect(getStoryQueryData('chat-1', 'orders', code, true, '* * * * *')).resolves.toEqual({
			queryData: cache.queryData,
			cachedAt: cache.cachedAt,
			code,
		});
	});

	// quarry: no billing, so the two 'cloud billing access is restricted' cases are not ported.

	it('serves an expired cache without refreshing when the refresh is deferred', async () => {
		const code = '<table query_id="query_warehouse" />';
		const cache = {
			queryData: {
				query_warehouse: {
					columns: ['id'],
					data: [{ id: 1 }],
				},
			},
			querySources: null,
			cachedAt: new Date(0),
		};
		mocks.getStoryDataCacheByChatAndSlug.mockResolvedValue(cache);

		await expect(
			getStoryQueryData('chat-1', 'orders', code, true, '* * * * *', { deferRefresh: true }),
		).resolves.toEqual({
			queryData: cache.queryData,
			cachedAt: cache.cachedAt,
			code,
			needsRefresh: true,
		});
		expect(mocks.getLatestVersionByChatAndSlug).not.toHaveBeenCalled();
	});

	it('serves the chat data of a never-cached story and leaves its first refresh to the caller', async () => {
		const code = '<table query_id="query_warehouse" />';
		const queryData = {
			query_warehouse: {
				columns: ['id'],
				data: [{ id: 1 }],
			},
		};
		mocks.getStoryDataCacheByChatAndSlug.mockResolvedValue(null);
		mocks.getQueryDataFromCode.mockResolvedValue(queryData);

		await expect(
			getStoryQueryData('chat-1', 'orders', code, true, null, { deferFirstRefresh: true }),
		).resolves.toEqual({
			queryData,
			cachedAt: null,
			code,
			needsRefresh: true,
		});
		expect(mocks.getLatestVersionByChatAndSlug).not.toHaveBeenCalled();
	});

	it('does not defer the refresh after a failure for a story without queries', async () => {
		const code = '# Just a title';
		mocks.getStoryDataCacheByChatAndSlug.mockResolvedValue(null);
		mocks.getLatestVersionByChatAndSlug.mockResolvedValue({ code, isLiveTextDynamic: false, format: 'classic' });
		mocks.getSqlQueriesFromCode.mockResolvedValue({});

		const result = await getStoryQueryData('chat-1', 'orders', code, true, null, { deferRefresh: true });

		expect(result.needsRefresh).toBeUndefined();
	});

	it('does not defer the first refresh of a story without queries', async () => {
		const code = '# Just a title';
		mocks.getStoryDataCacheByChatAndSlug.mockResolvedValue(null);
		mocks.getLatestVersionByChatAndSlug.mockResolvedValue({ code, isLiveTextDynamic: false, format: 'classic' });
		mocks.getSqlQueriesFromCode.mockResolvedValue({});

		await expect(
			getStoryQueryData('chat-1', 'orders', code, true, null, { deferFirstRefresh: true }),
		).resolves.toEqual({
			queryData: null,
			cachedAt: expect.any(Date),
			code,
		});
		expect(mocks.getLatestVersionByChatAndSlug).toHaveBeenCalled();
	});

	it('still refreshes an expired cache inline when only the first refresh is deferred', async () => {
		const code = '<table query_id="query_warehouse" />';
		mocks.getStoryDataCacheByChatAndSlug.mockResolvedValue({
			queryData: { query_warehouse: { columns: ['id'], data: [{ id: 1 }] } },
			querySources: null,
			cachedAt: new Date(0),
		});
		mocks.getLatestVersionByChatAndSlug.mockResolvedValue({ code, isLiveTextDynamic: false, format: 'classic' });
		mocks.getSqlQueriesFromCode.mockResolvedValue({});

		const result = await getStoryQueryData('chat-1', 'orders', code, true, '* * * * *', {
			deferFirstRefresh: true,
		});

		expect(result.needsRefresh).toBeUndefined();
		expect(mocks.getLatestVersionByChatAndSlug).toHaveBeenCalled();
	});

	it('falls back to stored data when refresh fails without a cache', async () => {
		const code = '<table query_id="query_warehouse" />';
		const queryData = {
			query_warehouse: {
				columns: ['id'],
				data: [{ id: 1 }],
			},
		};
		mocks.getLatestVersionByChatAndSlug.mockRejectedValue(new Error('Warehouse unavailable'));
		mocks.getQueryDataFromCode.mockResolvedValue(queryData);

		await expect(getStoryQueryData('chat-1', 'orders', code, true, null)).resolves.toEqual({
			queryData,
			cachedAt: null,
			code,
		});
	});

	it('uses the app database for a single admin-mode live query', async () => {
		mocks.getSqlQueryById.mockResolvedValue({
			sqlQuery: 'SELECT chat_id FROM v_messages',
			adminMode: true,
		});
		mocks.queryAppDb.mockResolvedValue({
			_version: '1',
			columns: ['chat_id'],
			rows: [{ chat_id: 'chat-1' }],
			rowCount: 1,
		});

		await expect(executeLiveQuery('chat-1', 'query_admin')).resolves.toEqual({
			columns: ['chat_id'],
			data: [{ chat_id: 'chat-1' }],
		});
		expect(mocks.buildToolContext).not.toHaveBeenCalled();
	});
});
