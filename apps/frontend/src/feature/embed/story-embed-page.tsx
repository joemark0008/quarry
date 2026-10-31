import { getRouteApi, useRouterState } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import styles from './story-embed-page.module.css';
import type { ReactNode } from 'react';
import type { DownloadFormat } from '@quarry/shared/types';
import type { QueryDataMap } from '@/feature/stories/components/story-embeds';
import { StoryAppView } from '@/feature/chat/components/mcp-app/story-app-view';
import { Spinner } from '@/components/ui/spinner';
import { QUARRY_MCP_EMBED_MEASURE_ATTR, useMcpAppEmbedHeightReporting } from '@/hooks/use-mcp-app-embed-height';
import { readEmbedTokenFromLocation } from '@/lib/embed-token';
import { storyApi } from '@/lib/story-api';

const Route = getRouteApi('/embed/story/$storyId');

export function StoryEmbedPage() {
	const { storyId } = Route.useParams();
	const searchStr = useRouterState({ select: (s) => s.location.searchStr });
	const token = useMemo(() => readEmbedTokenFromLocation(searchStr), [searchStr]);

	useMcpAppEmbedHeightReporting();

	const storyQuery = useQuery(storyApi.embed.getStory.queryOptions({ storyId, token }));
	const story = storyQuery.data;

	let inner: ReactNode;
	if (storyQuery.isLoading) {
		inner = (
			<div className={styles.storyEmbedPageDiv}>
				<Spinner />
			</div>
		);
	} else if (storyQuery.isError || !story) {
		inner = <div className={styles.storyEmbedPageDiv2}>Story unavailable or link expired.</div>;
	} else {
		const quarryUrl = `${window.location.origin}${story.openInQuarryPath}`;
		inner = (
			<StoryAppView
				title={story.title}
				code={story.code}
				queryData={story.queryData as QueryDataMap | null}
				theme={story.theme}
				quarryUrl={quarryUrl}
				onDownload={(format) => downloadStory(storyId, token, format)}
			/>
		);
	}

	return (
		<div {...{ [QUARRY_MCP_EMBED_MEASURE_ATTR]: '' }} className={styles.storyEmbedPageDiv3}>
			{inner}
		</div>
	);
}

async function downloadStory(storyId: string, token: string, format: DownloadFormat): Promise<void> {
	const result = await storyApi.embed.downloadStory.mutate({ storyId, token, format });
	const bytes = Uint8Array.from(atob(result.data), (c) => c.charCodeAt(0));
	const blob = new Blob([bytes], { type: result.mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = result.filename;
	a.click();
	URL.revokeObjectURL(url);
}
