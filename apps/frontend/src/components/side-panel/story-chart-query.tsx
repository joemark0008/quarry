import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import type { StoryQuerySqlSource } from '@/contexts/story-query-sql';

import { SqlQueryDisplay } from '@/components/tool-calls/sql-query-display';
import { storyApi } from '@/lib/story-api';
import styles from './story-chart-query.module.css';

export function StoryChartQueryView({ queryId, source }: { queryId: string; source: StoryQuerySqlSource }) {
	const ownedQuery = useQuery({
		...storyApi.story.getQuerySql.queryOptions({
			chatId: source.api.kind === 'owned' ? source.api.chatId : '',
			storySlug: source.api.kind === 'owned' ? source.api.storySlug : '',
			queryId,
			selections: source.selections,
		}),
		enabled: source.api.kind === 'owned',
	});

	const sharedQuery = useQuery({
		...storyApi.storyShare.getQuerySql.queryOptions({
			storyId: source.api.kind === 'shared' ? source.api.storyId : '',
			queryId,
			selections: source.selections,
		}),
		enabled: source.api.kind === 'shared',
	});

	const query = source.api.kind === 'shared' ? sharedQuery : ownedQuery;
	const data = query.data;

	if (query.isLoading) {
		return (
			<div className={styles.storyChartQueryViewDiv}>
				<Loader2 className={styles.storyChartQueryViewLoader2} />
				Loading query…
			</div>
		);
	}

	if (query.isError || !data) {
		return (
			<div className={styles.storyChartQueryViewDiv2}>
				{query.error?.message ?? 'Query unavailable'}
			</div>
		);
	}

	const showBoth = data.sqlQuery.trim() !== data.renderedSql.trim();

	return (
		<div className={styles.storyChartQueryViewDiv3}>
			{showBoth ? (
				<>
					<section className={styles.storyChartQueryViewSection}>
						<h4 className={styles.storyChartQueryViewH4}>
							Template query
						</h4>
						<SqlQueryDisplay query={data.sqlQuery} />
					</section>
					<section className={styles.storyChartQueryViewSection}>
						<h4 className={styles.storyChartQueryViewH4}>
							Rendered query
						</h4>
						<SqlQueryDisplay query={data.renderedSql} />
					</section>
				</>
			) : (
				<section className={styles.storyChartQueryViewSection}>
					<h4 className={styles.storyChartQueryViewH4}>Query</h4>
					<SqlQueryDisplay query={data.renderedSql} />
				</section>
			)}
		</div>
	);
}
