import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';
import type { ParsedChartBlock, ParsedMapBlock, ParsedTableBlock } from '@quarry/shared/story-segments';

import type { QueryDataMap } from '@/components/story-embeds';
import { HighlightBubble } from '@/components/highlight-bubble';
import { StoryAccessError } from '@/components/story-access-error';
import { StoryChartEmbed, StoryMapEmbed, StoryTableEmbed } from '@/components/story-embeds';
import { StoryTabbedContent } from '@/components/story-tabbed-content';
import { useStoryThemeForCurrentMode } from '@/components/story-theme-provider';
import { STORY_ASK_BAR_INSET_STYLE, StoryAskBar } from '@/components/story-ask-bar';
import { StoryPageHeader } from '@/components/story-page-header';
import { Spinner } from '@/components/ui/spinner';
import { SelectionProvider } from '@/contexts/text-selection';
import { requestAskAboutSelection } from '@/stores/ask-bar';
import { storyApi } from '@/lib/story-api';
import { chatApi } from '@/lib/chat-api';
import styles from './standalone-story-page.module.css';

export function StandaloneStoryPage({ storyId }: { storyId: string }) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const storyQuery = useQuery(storyApi.story.getStandalone.queryOptions({ storyId }));
	const story = storyQuery.data;
	const storyTheme = useStoryThemeForCurrentMode(story?.theme);

	const openStandaloneMutation = useMutation(
		chatApi.chatFork.openStandalone.mutationOptions({
			onSuccess: ({ chatId }) => {
				queryClient.invalidateQueries({ queryKey: storyApi.story.listAll.queryKey() });
				queryClient.invalidateQueries({ queryKey: storyApi.story.listStandalone.queryKey() });
				queryClient.invalidateQueries({ queryKey: storyApi.story.resolve.queryKey({ storyId }) });
				navigate({ to: '/$chatId', params: { chatId }, state: { openStorySlug: story?.slug } });
			},
		}),
	);
	if (storyQuery.isLoading) {
		return (
			<div className={styles.standaloneStoryPageDiv}>
				<Spinner />
			</div>
		);
	}

	if (storyQuery.isError || !story) {
		return <StoryAccessError error={storyQuery.error} onRetry={() => storyQuery.refetch()} />;
	}

	const isArchived = Boolean(story.archivedAt);

	return (
		<div
			className={styles.standaloneStoryPageDiv2}
			style={isArchived ? undefined : STORY_ASK_BAR_INSET_STYLE}
		>
			<StoryPageHeader
				title={story.title}
				storyChat={{
					storyId,
					isOwner: true,
					canChat: !isArchived,
					onOpenInChat: story.chatId ? undefined : () => openStandaloneMutation.mutate({ storyId }),
					isOpeningInChat: openStandaloneMutation.isPending,
				}}
				canDuplicate={!isArchived}
				download={{ storyId, isOwner: true }}
				storyId={storyId}
				canRename
				live={
					story.isLive
						? {
								isLive: true,
								cachedAt: story.cachedAt,
								lastRefreshFailure: story.lastRefreshFailure,
							}
						: undefined
				}
			/>
			<div className={styles.standaloneStoryPageDiv3}>
				<SelectionProvider key={storyId}>
					<HighlightBubble onAsk={requestAskAboutSelection} disabled={isArchived} />
					<StandaloneStoryContent
						code={story.code}
						queryData={story.queryData as QueryDataMap | null}
						theme={storyTheme}
						chatId={story.chatId}
						storySlug={story.slug}
					/>
				</SelectionProvider>

				{!isArchived && <StoryAskBar storyId={storyId} isOwner />}
			</div>
		</div>
	);
}

function StandaloneStoryContent({
	code,
	queryData,
	theme,
	chatId,
	storySlug,
	filtersEnabled = true,
	isDataPending = false,
}: {
	code: string;
	queryData: QueryDataMap | null;
	theme: ReturnType<typeof useStoryThemeForCurrentMode>;
	chatId?: string | null;
	storySlug?: string;
	filtersEnabled?: boolean;
	isDataPending?: boolean;
}) {
	const filterApi = filtersEnabled && chatId && storySlug ? { kind: 'owned' as const, chatId, storySlug } : null;

	const renderChart = useCallback(
		(
			chart: ParsedChartBlock,
			{
				queryData: data,
				hasActiveFilters,
				isRefreshing,
			}: {
				queryData: QueryDataMap | null;
				hasActiveFilters: boolean;
				isRefreshing: boolean;
			},
		) => (
			<StoryChartEmbed
				chart={chart}
				queryData={data}
				hasActiveFilters={hasActiveFilters}
				isRefreshing={isRefreshing}
				isDataPending={isDataPending}
			/>
		),
		[isDataPending],
	);

	const renderTable = useCallback(
		(
			table: ParsedTableBlock,
			{
				queryData: data,
				hasActiveFilters,
				isRefreshing,
			}: { queryData: QueryDataMap | null; hasActiveFilters: boolean; isRefreshing: boolean },
		) => (
			<StoryTableEmbed
				table={table}
				queryData={data}
				hasActiveFilters={hasActiveFilters}
				isRefreshing={isRefreshing}
				isDataPending={isDataPending}
			/>
		),
		[isDataPending],
	);

	const renderMap = useCallback(
		(
			map: ParsedMapBlock,
			{
				queryData: data,
				hasActiveFilters,
				isRefreshing,
			}: { queryData: QueryDataMap | null; hasActiveFilters: boolean; isRefreshing: boolean },
		) => (
			<StoryMapEmbed
				map={map}
				queryData={data}
				hasActiveFilters={hasActiveFilters}
				isRefreshing={isRefreshing}
				isDataPending={isDataPending}
				allowExpand
			/>
		),
		[isDataPending],
	);

	return (
		<StoryTabbedContent
			code={code}
			baselineQueryData={queryData}
			theme={theme}
			filterApi={filterApi}
			renderChart={renderChart}
			renderTable={renderTable}
			renderMap={renderMap}
		/>
	);
}
