import type { SemanticLayerMode } from '@quarry/shared/types';

import { isWarehouseSqlEnabled } from '../services/semantic-layer.service.js';
import type { AgentSettings } from '../types/agent-settings.js';
import clarification from './clarification.js';
import displayChart from './display-chart.js';
import executeSql, { localOnlyExecuteSql } from './execute-sql.js';
import grep from './grep.js';
import list from './list.js';
import read from './read.js';
import readQueryResult from './read-query-result.js';
import search from './search.js';
import suggestFollowUps from './suggest-follow-ups.js';

/**
 * Port of upstream `agents/tools/index.ts`. The registry only holds the tools whose modules quarry has
 * (PHASES.md: tools of optional phases stay out until their module exists): `story` (Phase 4), `load_skill`,
 * `execute_semantic_query`, `onboarding_*`, `generate_onboarding_rules`, `request_warehouse_*` (Phase 3),
 * `mcp_call`/`mcp_connect` (Phase 7). Not ported yet: `write`, `str_replace` (they write to permanent storage
 * and story files), `task` (subagents), `web_search`, `display_map`, `execute_python`, `execute_sandboxed_code`.
 */
export const tools = {
	clarification,
	display_chart: displayChart,
	execute_sql: executeSql,
	read_query_result: readQueryResult,
	grep,
	list,
	read,
	search,
	suggest_follow_ups: suggestFollowUps,
};

export const uiToolset = { ...tools };

export const getTools = (
	agentSettings: AgentSettings | null,
	extraTools?: Record<string, unknown>,
	options: {
		excludeFollowUps?: boolean;
		/** Restricts built-in tools to this allowlist by name; `extraTools` are always kept. */
		builtinToolAllowlist?: string[];
		/** Drops these built-in tools from the returned set. */
		excludeBuiltinTools?: string[];
		/** Semantic layer mode of the run; `exclusive` restricts `execute_sql` to the local database. */
		semanticLayerMode?: SemanticLayerMode | null;
	} = {},
) => {
	void agentSettings;
	const { execute_sql, suggest_follow_ups, ...rest } = tools;
	const baseTools = {
		...rest,
		execute_sql: isWarehouseSqlEnabled(options.semanticLayerMode) ? execute_sql : localOnlyExecuteSql,
		...(!options.excludeFollowUps && { suggest_follow_ups }),
		...extraTools,
	};

	let result = baseTools;
	if (options.builtinToolAllowlist) {
		const allowed = new Set(options.builtinToolAllowlist);
		result = keepTools(result, extraTools, (name) => allowed.has(name));
	}
	if (options.excludeBuiltinTools) {
		const excluded = new Set(options.excludeBuiltinTools);
		result = keepTools(result, extraTools, (name) => !excluded.has(name));
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
