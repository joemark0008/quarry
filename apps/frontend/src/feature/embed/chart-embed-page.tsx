import { getRouteApi } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useRouterState } from '@tanstack/react-router';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { ChartAppView } from '@/feature/chat/components/mcp-app/chart-app-view';
import { Spinner } from '@/components/ui/spinner';
import { QUARRY_MCP_EMBED_MEASURE_ATTR, useMcpAppEmbedHeightReporting } from '@/hooks/use-mcp-app-embed-height';
import { isLikelyMcpAppPayloadToken, readEmbedTokenFromLocation } from '@/lib/embed-token';
import { storyApi } from '@/lib/story-api';
import styles from './chart-embed-page.module.css';

const Route = getRouteApi('/embed/chart/$chartEmbedId');


export function ChartEmbedPage() {
	const { chartEmbedId } = Route.useParams();
	const searchStr = useRouterState({ select: (s) => s.location.searchStr });
	const token = useMemo(() => readEmbedTokenFromLocation(searchStr), [searchStr]);
	const usedWrongTokenFormat = token.length > 0 && isLikelyMcpAppPayloadToken(token);

	useMcpAppEmbedHeightReporting();

	const chartQuery = useQuery(storyApi.embed.getChart.queryOptions({ chartEmbedId, token }));
	const chart = chartQuery.data;

	let inner: ReactNode;
	if (chartQuery.isLoading) {
		inner = (
			<div className={styles.chartEmbedPageDiv}>
				<Spinner />
			</div>
		);
	} else if (chartQuery.isError || !chart) {
		inner = (
			<div className={styles.chartEmbedPageDiv2}>
				<p>Chart unavailable or link expired.</p>
				{usedWrongTokenFormat ? (
					<p className={styles.chartEmbedPageP}>
						Open the full <span className={styles.chartEmbedPageSpan}>embedUrl</span> link from{' '}
						<code className={styles.chartEmbedPageCode}>display_chart</code> (or the &quot;Interactive app&quot;
						markdown link), not the JSON tool payload.
					</p>
				) : null}
			</div>
		);
	} else {
		const quarryUrl =
			typeof chart.sourceChatId === 'string' && chart.sourceChatId.trim()
				? `${window.location.origin}/${chart.sourceChatId.trim()}`
				: undefined;
		inner = <ChartAppView config={chart.chartConfig} data={chart.data} quarryUrl={quarryUrl} />;
	}

	return (
		<div
			{...{ [QUARRY_MCP_EMBED_MEASURE_ATTR]: '' }}
			className={styles.chartEmbedPageDiv3}
		>
			{inner}
		</div>
	);
}
