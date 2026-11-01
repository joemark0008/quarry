import { renderToMarkdown } from '../markdown/index.js';
import { ExploreSubagentPrompt } from '../prompts/explore-subagent-prompt.js';
import grep from '../tools/grep.js';
import list from '../tools/list.js';
import read from '../tools/read.js';
import search from '../tools/search.js';
import { getUserRules } from '../user-rules.js';
import { readProjectContext } from '../utils/quarry-config.js';
import { truncateMiddle } from '../utils/utils.js';
import type { SubagentDefinition } from './types.js';

const USER_RULES_MAX_CHARS = 6_000;

export const exploreSubagent: SubagentDefinition = {
	type: 'explore',
	description: [
		'Explores the project context to find what a question needs (tables, columns, joins, metric definitions, docs, rules) and reports it with file paths.',
		'Use it when the relevant context is not yet known in the conversation and finding it would take more than a couple of lookups.',
		'The prompt must state the thoroughness level: "quick" for a targeted lookup, "medium" for a moderate exploration, "very thorough" for a comprehensive sweep across locations and naming conventions.',
	].join(' '),
	maxSteps: 15,
	tools: { read, list, grep, search },
	systemPrompt: (context) => {
		const { repos, templates, presence } = readProjectContext(context.projectFolder);
		const userRules = getUserRules(context.projectFolder);
		return renderToMarkdown(
			ExploreSubagentPrompt({
				templates,
				repoNames: repos.map((repo) => repo.name),
				contextPresence: presence,
				userRules: userRules ? truncateMiddle(userRules, USER_RULES_MAX_CHARS) : undefined,
			}),
		);
	},
};
