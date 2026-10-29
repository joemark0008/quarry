export { isPythonAvailable } from './execute-python.js';
export { isSandboxAvailable } from './execute-sandboxed-code.js';

import type { CustomBoundarySet } from '@quarry/shared';
import { writeFile } from '@quarry/shared/tools';
import type { SemanticLayerMode } from '@quarry/shared/types';

import { isSemanticQueryToolEnabled, isWarehouseSqlEnabled } from '../services/semantic-layer.service.js';
import { isStorageEnabled } from '../services/storage.js';
import { isCustomStoriesEnabled } from '../services/story-mount.js';
import type { AgentSettings } from '../types/agent-settings.js';
import clarification from './clarification.js';
import displayChart from './display-chart.js';
import { createDisplayMapTool } from './display-map.js';
import executePython from './execute-python.js';
import executeSandboxedCode from './execute-sandboxed-code.js';
import executeSemanticQuery from './execute-semantic-query.js';
import executeSql, { localOnlyExecuteSql } from './execute-sql.js';
import generateOnboardingRules from './generate-onboarding-rules.js';
import grep from './grep.js';
import list from './list.js';
import loadSkill from './load-skill.js';
import onboardingAgentPrompt from './onboarding-agent-prompt.js';
import onboardingCommand from './onboarding-command.js';
import onboardingProgress from './onboarding-progress.js';
import read from './read.js';
import readQueryResult from './read-query-result.js';
import requestWarehouseCredentials from './request-warehouse-credentials.js';
import requestWarehouseSelection from './request-warehouse-selection.js';
import search from './search.js';
import strReplace, { buildStrReplaceToolDescription } from './str-replace.js';
import suggestFollowUps from './suggest-follow-ups.js';
import task from './task.js';
import write, { buildWriteToolDescription } from './write.js';

export { createContextFixCollector } from './propose-context-fix.js';
export { createQueryAppDbTool } from './query-app-db.js';
export { createRecommendationCollector } from './record-recommendation.js';
export { createWebSearchTools } from './web-search.js';

/**
 * Port of upstream `agents/tools/index.ts`. Tools of modules quarry doesn't have yet stay out (PHASES.md): `story`
 * (Phase 4), `mcp_call`/`mcp_connect` (Phase 7). Upstream's gating is kept: `execute_semantic_query` needs a semantic
 * layer in `nao_config.yaml` and a querying mode, `task` needs `BETA_SUBAGENTS_ENABLED`,
 * `write`/`str_replace` need permanent storage (Phase 2d) or custom stories (Phase 4), `execute_python` and
 * `execute_sandboxed_code` need their runtime and the experimental agent setting, `display_map` the map setting,
 * `request_warehouse_*`, `onboarding_*` and `generate_onboarding_rules` an onboarding run. `web_search` comes in as an extra tool resolved from the provider settings
 * (`createWebSearchTools`); `query_app_db`, `record_recommendation` and `propose_*_fix` are built by the context
 * recommendations run (Phase 3) with the factories exported here.
 *
 * Only the MCP sub-agent excludes `display_map` upstream; kept for when it's ported.
 */
export const MCP_SUB_AGENT_EXCLUDED_TOOLS = ['display_map'];

export const tools = {
	clarification,
	display_chart: displayChart,
	...(executePython && { execute_python: executePython }),
	...(executeSandboxedCode && { execute_sandboxed_code: executeSandboxedCode }),
	execute_sql: executeSql,
	execute_semantic_query: executeSemanticQuery,
	read_query_result: readQueryResult,
	grep,
	list,
	load_skill: loadSkill,
	onboarding_agent_prompt: onboardingAgentPrompt,
	onboarding_command: onboardingCommand,
	onboarding_progress: onboardingProgress,
	request_warehouse_credentials: requestWarehouseCredentials,
	request_warehouse_selection: requestWarehouseSelection,
	generate_onboarding_rules: generateOnboardingRules,
	read,
	search,
	task,
	write,
	str_replace: strReplace,
	suggest_follow_ups: suggestFollowUps,
};

export const uiToolset = { ...tools, display_map: createDisplayMapTool() };

export const getTools = (
	agentSettings: AgentSettings | null,
	extraTools?: Record<string, unknown>,
	options: {
		excludeFollowUps?: boolean;
		onboarding?: boolean;
		/** Restricts built-in tools to this allowlist by name; `extraTools` are always kept. */
		builtinToolAllowlist?: string[];
		/** Drops these built-in tools from the returned set. */
		excludeBuiltinTools?: string[];
		/** Custom GeoJSON boundary sets defined by the project admin. */
		customBoundaries?: CustomBoundarySet[];
		/** Semantic layer mode of the run; `exclusive` restricts `execute_sql` to the local database. */
		semanticLayerMode?: SemanticLayerMode | null;
		/** Whether the run's user may author custom stories; omit to follow the instance flag alone. */
		customStoryAuthoring?: boolean;
		/** quarry: upstream read `env.BETA_SUBAGENTS_ENABLED` here; the agent service passes it from `ConfigService`. */
		subagentsEnabled?: boolean;
	} = {},
) => {
	const customStoryAuthoring = options.customStoryAuthoring ?? isCustomStoriesEnabled();
	const {
		execute_python,
		execute_sandboxed_code,
		execute_semantic_query,
		execute_sql,
		onboarding_agent_prompt: onboardingAgentPromptTool,
		onboarding_command: onboardingCommandTool,
		onboarding_progress: onboardingProgressTool,
		request_warehouse_credentials: requestWarehouseCredentialsTool,
		request_warehouse_selection: requestWarehouseSelectionTool,
		generate_onboarding_rules: generateOnboardingRulesTool,
		suggest_follow_ups,
		task: taskTool,
		write: writeTool,
		str_replace: strReplaceTool,
		...rest
	} = tools;
	const baseTools = {
		...rest,
		...(options.subagentsEnabled && { task: taskTool }),
		execute_sql: isWarehouseSqlEnabled(options.semanticLayerMode) ? execute_sql : localOnlyExecuteSql,
		...(isSemanticQueryToolEnabled(options.semanticLayerMode) && { execute_semantic_query }),
		...((isStorageEnabled() || customStoryAuthoring) && {
			write: writeTool,
			str_replace: {
				...strReplaceTool,
				description: buildStrReplaceToolDescription({ customStories: customStoryAuthoring }),
			},
		}),
		...(!options.excludeFollowUps && { suggest_follow_ups }),
	};

	const allTools = {
		...baseTools,
		...(options.onboarding && {
			onboarding_agent_prompt: onboardingAgentPromptTool,
			onboarding_command: onboardingCommandTool,
			onboarding_progress: onboardingProgressTool,
			request_warehouse_credentials: requestWarehouseCredentialsTool,
			request_warehouse_selection: requestWarehouseSelectionTool,
			generate_onboarding_rules: generateOnboardingRulesTool,
		}),
		...(agentSettings?.experimental?.pythonSandboxing && execute_python && { execute_python }),
		...(agentSettings?.experimental?.sandboxes && execute_sandboxed_code && { execute_sandboxed_code }),
		...(agentSettings?.mapEnabled !== false && {
			display_map: createDisplayMapTool(options.customBoundaries ?? []),
		}),
		...extraTools,
	};

	let result = allTools;
	if (options.builtinToolAllowlist) {
		const allowed = new Set(options.builtinToolAllowlist);
		result = keepTools(result, extraTools, (name) => allowed.has(name));
	}
	if (options.excludeBuiltinTools) {
		const excluded = new Set(options.excludeBuiltinTools);
		result = keepTools(result, extraTools, (name) => !excluded.has(name));
	}

	const canReplace = 'str_replace' in result;
	if ('write' in result) {
		result = {
			...result,
			write: {
				...writeTool,
				description: buildWriteToolDescription({ customStories: customStoryAuthoring, canReplace }),
				inputSchema: writeFile.buildInputSchema({ customStories: customStoryAuthoring }),
			},
		};
	}

	return result;
};

const keepTools = <T extends Record<string, unknown>>(
	toolset: T,
	extraTools: Record<string, unknown> | undefined,
	shouldKeep: (name: string) => boolean,
): T => {
	const extraToolNames = new Set(Object.keys(extraTools ?? {}));
	return Object.fromEntries(
		Object.entries(toolset).filter(([name]) => shouldKeep(name) || extraToolNames.has(name)),
	) as T;
};
