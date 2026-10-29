import { describe, expect, it, vi } from 'vitest';

import type { ToolContext } from '../types/tools.js';
import { executeQuery } from './execute-sql.js';

const exploitSql =
	"SELECT * FROM postgres_query('__ducklake_metadata_lake', 'SELECT rolname, rolpassword FROM pg_authid')";

function buildContext(overrides: Partial<ToolContext> = {}): ToolContext {
	return {
		services: {
			executeWarehouseSql: vi.fn(),
			getExecuteSqlPartByQueryIdInChat: vi.fn(),
			updateExecuteSqlPart: vi.fn(),
			getQueryResultByQueryId: vi.fn(),
		},
		projectFolder: '/tmp/project',
		chatId: 'chat1',
		userId: 'user1',
		projectId: 'project1',
		supportsCustomCharts: false,
		agentSettings: null,
		envVars: {},
		azureAccessToken: null,
		queryResults: new Map(),
		generatedArtifacts: { charts: [], maps: [], stories: [] },
		...overrides,
	} as unknown as ToolContext;
}

describe('execute_sql blocks catalog/server-passthrough calls unconditionally', () => {
	it('rejects the exploit payload when write permissions are disabled', async () => {
		const context = buildContext({ agentSettings: { sql: { dangerouslyWritePermEnabled: false } } as never });
		await expect(executeQuery({ sql_query: exploitSql }, context)).rejects.toThrow(/passthrough/);
	});

	it('still rejects the exploit payload when write permissions are enabled', async () => {
		const context = buildContext({ agentSettings: { sql: { dangerouslyWritePermEnabled: true } } as never });
		await expect(executeQuery({ sql_query: exploitSql }, context)).rejects.toThrow(/passthrough/);
	});

	it('still rejects the exploit payload when no agent settings are configured', async () => {
		const context = buildContext({ agentSettings: null });
		await expect(executeQuery({ sql_query: exploitSql }, context)).rejects.toThrow(/passthrough/);
	});
});
