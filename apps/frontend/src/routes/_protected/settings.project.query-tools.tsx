import { createFileRoute } from '@tanstack/react-router';
import { QueryToolsPage } from '@/feature/settings/query-tools-page';

export const Route = createFileRoute('/_protected/settings/project/query-tools')({
	staticData: {
		title: 'Query tools',
		description: 'Save SQL queries on the warehouse as tools the agent can call by name.',
	},
	/** `sql`: start a new tool from a chat query (Save as tool). */
	validateSearch: (search: Record<string, unknown>): { sql?: string } => ({
		...(typeof search.sql === 'string' && search.sql.trim() && { sql: search.sql }),
	}),
	component: QueryToolsPage,
});
