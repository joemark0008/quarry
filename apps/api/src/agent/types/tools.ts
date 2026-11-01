import type { McpAccess, UserGroupFeature, WarehouseRowSecurity } from '@quarry/shared';
import type { UserRulesGroupAccess } from '@quarry/shared/rules-template';
import type { displayChart, displayMap, generateOnboardingRules } from '@quarry/shared/tools';
import type { executeSql } from '@quarry/shared/tools';
import type { LlmSelectedModel, SemanticLayerMode, StoryFormat } from '@quarry/shared/types';

import type { ChatImage } from '../../attachments/image.repository.js';
import type { ResolvedSandboxSecret } from '../../sandbox/sandbox-secret.service.js';
import type { SkillService } from '../../skills/skill.service.js';
import type { WarehouseSqlOptions, WarehouseSqlResult } from '../../warehouse/warehouse-sql.service.js';
import type { ProviderModelResult } from '../providers/providers.js';
import type { WarehouseTableAccess } from '../services/context-access.js';
import type {
	ResolvedDocsContextAccess,
	ResolvedFilesContextAccess,
	ResolvedSkillsAccess,
} from '../services/user-group-context-access.service.js';
import { AgentSettings } from './agent-settings.js';

export interface QueryResult {
	columns: string[];
	data: Record<string, unknown>[];
	compiledBySemanticLayer?: boolean;
	/** Set when a saved query tool (`qt_<name>`) produced the result. */
	queryToolName?: string;
	/** The SQL as the model wrote it (filter templates included), set for results produced in the current run. */
	sqlQuery?: string;
	databaseId?: string;
}

export interface GeneratedArtifacts {
	charts: (displayChart.BuiltinChartInput | displayChart.KpiCardInput)[];
	maps: displayMap.Input[];
	stories: { id: string; title: string }[];
}

/** A stored `execute_sql` part, read back as SQL (upstream `getExecuteSqlPartByQueryIdInChat`). */
export interface StoredQueryPart {
	toolCallId: string;
	/** `qt_<name>` for saved query tools. */
	toolName: 'execute_sql' | 'execute_semantic_query' | `qt_${string}`;
	toolInput: executeSql.Input;
	toolOutput: executeSql.Output;
	adminMode: boolean;
}

/**
 * quarry: the services tools call, built per run by the agent module (PLAN.md §6: tools are framework-agnostic
 * AI SDK tools, services reach them through the ToolContext). Upstream imported these modules directly.
 */
export interface AgentToolServices {
	executeWarehouseSql(sql: string, options: WarehouseSqlOptions): Promise<WarehouseSqlResult>;
	getExecuteSqlPartByQueryIdInChat(chatId: string, queryId: string): Promise<StoredQueryPart | null>;
	updateExecuteSqlPart(toolCallId: string, input: executeSql.Input, output: executeSql.Output): Promise<void>;
	getQueryResultByQueryId(
		chatId: string,
		queryId: string,
	): Promise<{ columns: string[]; data: Record<string, unknown>[] } | null>;
	/** `db/readonly-app-db` `runScopedAppDbQuery`: read-only SQL over the project-scoped app-database views. */
	runScopedAppDbQuery(
		projectId: string,
		sql: string,
	): Promise<{ columns: string[]; rows: Record<string, unknown>[] }>;
	/** `utils/llm` `getProjectAvailableModels` (subagent model resolution). */
	getProjectAvailableModels(
		projectId: string,
	): Promise<Array<{ provider: LlmSelectedModel['provider']; modelId: string; name: string }>>;
	/** `utils/llm` `resolveProviderModel` (subagent model resolution). */
	resolveProviderModel(
		projectId: string,
		provider: LlmSelectedModel['provider'],
		modelId: string,
		applyUserSettings?: boolean,
	): Promise<ProviderModelResult | null>;
	/** `sandboxSecretService.resolve`: the user's decrypted secrets in the project, for `execute_sandboxed_code`. */
	resolveSandboxSecrets(userId: string, projectId: string): Promise<ResolvedSandboxSecret[]>;
	/** `image.queries` `getImagesByChatId`: the images attached to the chat, copied into the sandbox. */
	getImagesByChatId(chatId: string): Promise<ChatImage[]>;
	/** Upstream's `skillService` singleton (`load_skill`); skills are initialized before the run. */
	skills: Pick<SkillService, 'getSkill' | 'getSkills' | 'getSkillBody'>;
	/** `queueWarehouseFinalization`: quarry writes RULES.md for the run's project in the background instead. */
	scheduleOnboardingRules(
		projectId: string,
		businessContext: generateOnboardingRules.Input['businessContext'],
		modelSelection: LlmSelectedModel,
	): void;
}

export interface ToolContext {
	services: AgentToolServices;
	projectFolder: string;
	chatId: string;
	userId: string;
	projectId: string;
	supportsCustomCharts: boolean;
	agentSettings: AgentSettings | null;
	/** The model the run itself uses; subagents inherit it unless the project pins another one. */
	modelSelection?: LlmSelectedModel;
	usageRunId?: string;
	managedAiBillingMode?: 'wallet' | 'unbilled';
	/**
	 * How the run may use the project's semantic layer, resolved once from quarry_config.yaml
	 * and the admin settings. Null (or absent) when the project declares no semantic layer.
	 */
	semanticLayerMode?: SemanticLayerMode | null;
	envVars: Record<string, string>;
	warehouseTableAccess: WarehouseTableAccess;
	warehouseRowSecurity: WarehouseRowSecurity;
	docsContextAccess: ResolvedDocsContextAccess;
	filesContextAccess: ResolvedFilesContextAccess;
	/** MCP servers and tools the user's groups grant; spec files of other servers are hidden too. */
	mcpAccess: McpAccess;
	/** Project skills the user's groups grant; files of other skills under agent/skills/ are hidden too. */
	skillsAccess: ResolvedSkillsAccess;
	userGroupFeatures: UserGroupFeature[];
	userRulesGroupAccess: UserRulesGroupAccess;
	/** Project skills the user's groups load in full into the system prompt. */
	preloadedSkillNames?: string[];
	/**
	 * Database federation access token. Populated by the EE Microsoft/Azure AD
	 * integration when the user signs in via Microsoft; always null in the
	 * open-source edition.
	 */
	azureAccessToken: string | null;
	/**
	 * In-memory cache for query results within a single agent run.
	 * For queries from earlier turns in the same chat, prefer
	 * `services/query-result.service#getQueryResult`, which falls back
	 * to message history and caches the result back into this map.
	 */
	queryResults: Map<string, QueryResult>;
	generatedArtifacts: GeneratedArtifacts;
	/**
	 * Admin mode: when true, `execute_sql` runs read-only SQL over quarry's own
	 * project-scoped app-database views instead of the user's warehouse.
	 */
	adminMode?: boolean;
	/** The story a quick question is about; the story tool edits it in its own chat when `canEdit`. */
	linkedStory?: LinkedStory;
}

export type McpToolContext = Omit<ToolContext, 'chatId'> & {
	chatId: null;
	storyCreationEnabled?: boolean;
};

export interface LinkedStory {
	storyId: string;
	chatId: string;
	slug: string;
	title: string;
	format: StoryFormat;
	canEdit: boolean;
}
