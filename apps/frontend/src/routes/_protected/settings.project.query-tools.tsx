import { createFileRoute } from '@tanstack/react-router';
import { QueryToolsPage } from '@/feature/settings/query-tools-page';

export const Route = createFileRoute('/_protected/settings/project/query-tools')({
	staticData: {
		title: 'Query tools',
		description: 'Save SQL queries on the warehouse as tools the agent can call by name.',
	},
	/** `tool`: `new` or a tool id opens the workbench. `sql`: start a new draft from a chat query (Save as tool). */
	validateSearch: (search: Record<string, unknown>): { tool?: string; sql?: string } => {
		const sql = typeof search.sql === 'string' && search.sql.trim() ? search.sql : undefined;
		const tool = typeof search.tool === 'string' && search.tool ? search.tool : undefined;
		return { ...(sql ? { tool: tool ?? 'new', sql } : tool && { tool }) };
	},
	component: QueryToolsPage,
});
