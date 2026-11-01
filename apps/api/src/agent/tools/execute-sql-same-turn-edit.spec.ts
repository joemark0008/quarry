import type { ToolCallOptions } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentToolServices, ToolContext } from '../types/tools.js';
import executeSqlTool, { executeQuery } from './execute-sql.js';

// quarry: upstream mocked `queries/execute-sql.queries` and stubbed `fetch` to the FastAPI SQL engine;
// both reach the tool through `context.services` here.
const services = {
	executeWarehouseSql: vi.fn(),
	getExecuteSqlPartByQueryIdInChat: vi.fn(),
	updateExecuteSqlPart: vi.fn(),
	getQueryResultByQueryId: vi.fn(),
	runScopedAppDbQuery: vi.fn(),
	getProjectAvailableModels: vi.fn(),
	resolveProviderModel: vi.fn(),
	resolveSandboxSecrets: vi.fn(),
	getImagesByChatId: vi.fn(),
	skills: vi.fn(),
	scheduleOnboardingRules: vi.fn(),
	recordLlmInference: vi.fn(),
} satisfies Record<keyof AgentToolServices, ReturnType<typeof vi.fn>>;

describe('execute_sql in-place edit of a query created in the current turn', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		services.getExecuteSqlPartByQueryIdInChat.mockResolvedValue(null);
		services.executeWarehouseSql.mockResolvedValue({ data: [{ n: 1 }], row_count: 1, columns: ['n'] });
	});

	it('re-runs a same-turn SQL query under its id when it is not persisted yet', async () => {
		const context = createContext();
		const created = await executeQuery({ sql_query: 'SELECT 1 AS n' }, context);

		const edited = await runTool({ sql_query: 'SELECT 2 AS n', query_id: created.id }, context);

		expect(services.getExecuteSqlPartByQueryIdInChat).toHaveBeenCalledWith('chat-1', created.id);
		expect(edited.id).toBe(created.id);
		expect(context.queryResults.get(created.id)).toEqual({
			columns: ['n'],
			data: [{ n: 1 }],
			sqlQuery: 'SELECT 2 AS n',
		});
		expect(services.updateExecuteSqlPart).not.toHaveBeenCalled();
	});

	it('refuses to edit a same-turn semantic query as SQL', async () => {
		const context = createContext();
		const created = await executeQuery({ sql_query: 'SELECT 1 AS n' }, context, {
			compiledBySemanticLayer: true,
		});

		await expect(runTool({ sql_query: 'SELECT 2 AS n', query_id: created.id }, context)).rejects.toThrow(
			`Query ${created.id} is a semantic query and cannot be edited as SQL`,
		);
	});

	it('still reports unknown query ids', async () => {
		await expect(
			runTool({ sql_query: 'SELECT 2 AS n', query_id: 'query_missing0' }, createContext()),
		).rejects.toThrow('Query query_missing0 not found in this chat');
	});
});

async function runTool(input: Parameters<typeof executeQuery>[0], context: ToolContext) {
	const options = { toolCallId: 'call-1', messages: [], experimental_context: context } as ToolCallOptions;
	const output = await executeSqlTool.execute!(input, options);
	return output as Awaited<ReturnType<typeof executeQuery>>;
}

function createContext(): ToolContext {
	return {
		services: services as unknown as AgentToolServices,
		projectFolder: '/tmp/project',
		chatId: 'chat-1',
		userId: 'user-1',
		projectId: 'project-1',
		supportsCustomCharts: false,
		agentSettings: {},
		envVars: {},
		warehouseTableAccess: { enforced: false },
		warehouseRowSecurity: { enforced: false },
		docsContextAccess: { enforced: false } as ToolContext['docsContextAccess'],
		filesContextAccess: { enforced: false } as ToolContext['filesContextAccess'],
		mcpAccess: { mode: 'all' } as ToolContext['mcpAccess'],
		skillsAccess: { mode: 'all' } as ToolContext['skillsAccess'],
		userGroupFeatures: [],
		userRulesGroupAccess: { enforced: false } as ToolContext['userRulesGroupAccess'],
		azureAccessToken: null,
		queryResults: new Map(),
		generatedArtifacts: { charts: [], maps: [], stories: [] },
	};
}
