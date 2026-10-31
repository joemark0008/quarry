import { getRouteApi, useNavigate } from '@tanstack/react-router';
import { QueryToolsSettings } from '@/feature/settings/components/query-tools/query-tools-settings';

const Route = getRouteApi('/_protected/settings/project/query-tools');

export function QueryToolsPage() {
	const { sql } = Route.useSearch();
	const navigate = useNavigate({ from: '/settings/project/query-tools' });
	return (
		<QueryToolsSettings
			key={sql ?? 'list'}
			initialSql={sql}
			onInitialSqlUsed={() => sql && navigate({ search: {}, replace: true })}
		/>
	);
}
