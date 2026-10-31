import { getRouteApi, useRouterState } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useLayoutEffect, useMemo } from 'react';
import styles from './map-embed-page.module.css';
import type { ReactNode } from 'react';
import { MapAppView } from '@/feature/chat/components/mcp-app/map-app-view';
import { Spinner } from '@/components/ui/spinner';
import { QUARRY_MCP_EMBED_MEASURE_ATTR, useMcpAppEmbedHeightReporting } from '@/hooks/use-mcp-app-embed-height';
import { isLikelyMcpAppPayloadToken, readEmbedTokenFromLocation } from '@/lib/embed-token';
import { storyApi } from '@/lib/story-api';

const Route = getRouteApi('/embed/map/$mapEmbedId');

export function MapEmbedPage() {
	const { mapEmbedId } = Route.useParams();
	const searchStr = useRouterState({ select: (s) => s.location.searchStr });
	const token = useMemo(() => readEmbedTokenFromLocation(searchStr), [searchStr]);
	const usedWrongTokenFormat = token.length > 0 && isLikelyMcpAppPayloadToken(token);

	useLayoutEffect(() => {
		const root = document.documentElement;
		root.classList.add('quarry-embed-app');
		return () => {
			root.classList.remove('quarry-embed-app');
		};
	}, []);

	useMcpAppEmbedHeightReporting();

	const mapQuery = useQuery(storyApi.embed.getMap.queryOptions({ mapEmbedId, token }));
	const map = mapQuery.data;

	let inner: ReactNode;
	if (mapQuery.isLoading) {
		inner = (
			<div className={styles.mapEmbedPageDiv}>
				<Spinner />
			</div>
		);
	} else if (mapQuery.isError || !map) {
		inner = (
			<div className={styles.mapEmbedPageDiv2}>
				<p>Map unavailable or link expired.</p>
				{usedWrongTokenFormat ? (
					<p className={styles.mapEmbedPageP}>
						Open the full <span className={styles.mapEmbedPageSpan}>embedUrl</span> link from{' '}
						<code className={styles.mapEmbedPageCode}>display_map</code> (or the &quot;Interactive app&quot;
						markdown link), not the JSON tool payload.
					</p>
				) : null}
			</div>
		);
	} else {
		const quarryUrl =
			typeof map.sourceChatId === 'string' && map.sourceChatId.trim()
				? `${window.location.origin}/${map.sourceChatId.trim()}`
				: undefined;
		inner = (
			<MapAppView
				config={map.mapConfig}
				data={map.data}
				columns={map.columns}
				quarryUrl={quarryUrl}
				projectId={map.projectId}
				customBoundaries={map.customBoundaries}
			/>
		);
	}

	return (
		<div {...{ [QUARRY_MCP_EMBED_MEASURE_ATTR]: '' }} className={styles.mapEmbedPageDiv3}>
			{inner}
		</div>
	);
}
