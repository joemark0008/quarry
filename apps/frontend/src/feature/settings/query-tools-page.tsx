import { getRouteApi, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { QueryToolsSettings } from '@/feature/settings/components/query-tools/query-tools-settings';
import { QueryWorkbenchPage } from '@/feature/settings/components/query-tools/workbench/query-workbench-page';

const Route = getRouteApi('/_protected/settings/project/query-tools');

export function QueryToolsPage() {
	const { tool, sql } = Route.useSearch();
	const navigate = useNavigate({ from: '/settings/project/query-tools' });

	// The seeded SQL is in the draft from now on: a reload must not bring it back over the user's edits.
	useEffect(() => {
		if (sql) {
			navigate({ search: { tool: 'new' }, replace: true });
		}
	}, [sql, navigate]);

	if (!tool) {
		return <QueryToolsSettings onOpen={(toolId) => navigate({ search: { tool: toolId } })} />;
	}
	return (
		<QueryWorkbenchPage
			toolParam={tool}
			initialSql={sql}
			onOpenTool={(toolId) => navigate({ search: { tool: toolId }, replace: true })}
			onOpenNew={() => navigate({ search: { tool: 'new' }, replace: true })}
			onBack={() => navigate({ search: {} })}
		/>
	);
}
