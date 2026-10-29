import type { AgentProfile } from '../agent-manager.js';
import { getTools } from '../tools/index.js';

const ANALYSIS_STEP_BUDGET = 40;
const CONTEXT_DISCOVERY_TOOLS = ['read', 'grep', 'list', 'search'];

/**
 * Port of upstream `agents/profiles/context-recommendations.ts`: reviews past chats to record recommendations on the
 * project context; it reads the context but never queries the warehouse.
 */
export function contextRecommendationsAgent(
	systemPrompt: string,
	recommendationTools: Record<string, unknown>,
): AgentProfile {
	return {
		source: 'contextRecommendations',
		tools: ({ agentSettings }) =>
			getTools(agentSettings, recommendationTools, {
				excludeFollowUps: true,
				builtinToolAllowlist: CONTEXT_DISCOVERY_TOOLS,
			}),
		systemPrompt: () => systemPrompt,
		maxSteps: ANALYSIS_STEP_BUDGET,
		skipMemoryExtraction: true,
	};
}
