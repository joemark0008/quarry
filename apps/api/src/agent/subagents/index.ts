import type { task } from '@quarry/shared/tools';

import { exploreSubagent } from './explore.js';
import type { SubagentDefinition } from './types.js';

export { resolveSubagentModel } from './model.js';
export { runSubagent } from './run.js';
export type { SubagentDefinition } from './types.js';

/** Every subagent type the main agent can delegate to. Add a definition here to expose a new one. */
export const SUBAGENTS: Record<task.SubagentType, SubagentDefinition> = {
	explore: exploreSubagent,
};

export function getSubagent(type: task.SubagentType): SubagentDefinition {
	return SUBAGENTS[type];
}

export function describeSubagents(): string {
	return Object.values(SUBAGENTS)
		.map((subagent) => `- ${subagent.type}: ${subagent.description}`)
		.join('\n');
}
