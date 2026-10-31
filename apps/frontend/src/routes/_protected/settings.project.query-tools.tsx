import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { QueryToolsSettings } from '@/components/settings/query-tools/query-tools-settings';

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

function QueryToolsPage() {
	const { sql } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	return (
		<QueryToolsSettings
			key={sql ?? 'list'}
			initialSql={sql}
			onInitialSqlUsed={() => sql && navigate({ search: {}, replace: true })}
		/>
	);
}
