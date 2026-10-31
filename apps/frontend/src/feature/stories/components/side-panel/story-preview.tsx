import { NO_CACHE_SCHEDULE } from '@quarry/shared';
import { splitCodeIntoSegments } from '@quarry/shared/story-segments';
import { memo, useCallback, useMemo, useRef } from 'react';
import styles from './story-preview.module.css';
import type { ParsedChartBlock, ParsedMapBlock, ParsedTableBlock } from '@quarry/shared/story-segments';
import type { StoryTheme } from '@quarry/shared/story-theme';

import type { LiveQueryConfig, QueryDataMap } from '@/feature/stories/components/story-embeds';
import {
	StoryChartEmbed as LiveChartEmbed,
	StoryMapEmbed as LiveMapEmbed,
	StoryTableEmbed as LiveTableEmbed,
} from '@/feature/stories/components/story-embeds';
import { StoryFilterBar } from '@/feature/stories/components/story-filter-bar';
import { StoryThemeProvider } from '@/feature/stories/components/story-theme-provider';
import { StoryBlock, StoryMapFrame, StoryTableFrame } from '@/feature/stories/components/story-block';
import { SegmentList } from '@/feature/stories/components/story-rendering';
import { StoryQuerySqlProvider } from '@/contexts/story-query-sql';
import { useStoryFilters } from '@/hooks/use-story-filters';
import { stabilizeStorySegments } from '@/lib/story-segment-stability';
import { storyApi } from '@/lib/story-api';

interface StoryPreviewProps {
	code: string;
	fullCode?: string;
	cacheSchedule: string | null;
	queryData: QueryDataMap | null;
	chatId: string;
	storySlug: string;
	versionKey?: string | number;
	filtersEnabled?: boolean;
	isStreaming?: boolean;
	isDataPending?: boolean;
	isViewingLatest?: boolean;
	theme?: StoryTheme | null;
}

export const StoryPreview = memo(function StoryPreview({
	code,
	fullCode,
	cacheSchedule,
	queryData,
	chatId,
	storySlug,
	versionKey,
	filtersEnabled = true,
	isStreaming = false,
	isDataPending = false,
	isViewingLatest = true,
	theme,
}: StoryPreviewProps) {
	const previousSegmentsRef = useRef<ReturnType<typeof splitCodeIntoSegments>>([]);
	const segments = useMemo(() => {
		const nextSegments = stabilizeStorySegments(splitCodeIntoSegments(code), previousSegmentsRef.current);
		previousSegmentsRef.current = nextSegments;
		return nextSegments;
	}, [code]);
	const isNoCacheMode = cacheSchedule === NO_CACHE_SCHEDULE;
	const filterApi = useMemo(() => ({ kind: 'owned' as const, chatId, storySlug }), [chatId, storySlug]);
	const storyFilters = useStoryFilters({
		code: fullCode ?? code,
		baselineQueryData: queryData,
		api: filterApi,
		enabled: filtersEnabled,
	});

	const noCacheQuery = useMemo<LiveQueryConfig | undefined>(
		() =>
			isNoCacheMode
				? { queryOptions: (queryId) => storyApi.story.getLiveQueryData.queryOptions({ chatId, queryId }) }
				: undefined,
		[isNoCacheMode, chatId],
	);

	const effectiveQueryData = storyFilters.queryData;

	const useLiveUnfiltered = isViewingLatest && isNoCacheMode && !storyFilters.hasActiveFilters;
	const querySqlSource = useMemo(
		() =>
			filtersEnabled
				? {
						api: filterApi,
						selections: storyFilters.debouncedSelections,
					}
				: null,
		[filterApi, filtersEnabled, storyFilters.debouncedSelections],
	);

	const renderChart = useCallback(
		(chart: ParsedChartBlock) => (
			<StoryBlock>
				<LiveChartEmbed
					chart={chart}
					queryData={useLiveUnfiltered ? undefined : effectiveQueryData}
					liveQuery={useLiveUnfiltered ? noCacheQuery : undefined}
					hasActiveFilters={storyFilters.hasActiveFilters}
					isRefreshing={storyFilters.isFiltering}
					isStreaming={isStreaming}
					isDataPending={isDataPending}
				/>
			</StoryBlock>
		),
		[
			effectiveQueryData,
			useLiveUnfiltered,
			noCacheQuery,
			storyFilters.hasActiveFilters,
			storyFilters.isFiltering,
			isStreaming,
			isDataPending,
		],
	);

	const renderTable = useCallback(
		(table: ParsedTableBlock) => (
			<StoryTableFrame>
				<LiveTableEmbed
					table={table}
					queryData={useLiveUnfiltered ? undefined : effectiveQueryData}
					liveQuery={useLiveUnfiltered ? noCacheQuery : undefined}
					hasActiveFilters={storyFilters.hasActiveFilters}
					isRefreshing={storyFilters.isFiltering}
					isStreaming={isStreaming}
					isDataPending={isDataPending}
				/>
			</StoryTableFrame>
		),
		[
			effectiveQueryData,
			useLiveUnfiltered,
			noCacheQuery,
			storyFilters.hasActiveFilters,
			storyFilters.isFiltering,
			isStreaming,
			isDataPending,
		],
	);

	const renderMap = useCallback(
		(map: ParsedMapBlock) => (
			<StoryMapFrame>
				<LiveMapEmbed
					map={map}
					queryData={useLiveUnfiltered ? undefined : effectiveQueryData}
					liveQuery={useLiveUnfiltered ? noCacheQuery : undefined}
					hasActiveFilters={storyFilters.hasActiveFilters}
					isRefreshing={storyFilters.isFiltering}
					isStreaming={isStreaming}
					isDataPending={isDataPending}
				/>
			</StoryMapFrame>
		),
		[
			effectiveQueryData,
			useLiveUnfiltered,
			noCacheQuery,
			storyFilters.hasActiveFilters,
			storyFilters.isFiltering,
			isStreaming,
			isDataPending,
		],
	);

	return (
		<StoryQuerySqlProvider value={querySqlSource}>
			<StoryThemeProvider theme={theme ?? null} className={styles.storyPreviewStoryThemeProvider}>
				<div data-story-content className={styles.storyPreviewDiv}>
					<StoryFilterBar
						filters={storyFilters.filters}
						selections={storyFilters.selections}
						onSelectionChange={storyFilters.setSelection}
						onClear={storyFilters.clearSelections}
						api={filterApi}
					/>
					<SegmentList
						segments={segments}
						versionKey={versionKey}
						renderChart={renderChart}
						renderTable={renderTable}
						renderMap={renderMap}
					/>
				</div>
			</StoryThemeProvider>
		</StoryQuerySqlProvider>
	);
});
