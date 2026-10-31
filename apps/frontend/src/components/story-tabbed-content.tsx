import { useMemo, useState } from 'react';
import { parseStoryTabs, stripStoryTabsMarkup } from '@quarry/shared/story-tabs';
import { splitCodeIntoSegments } from '@quarry/shared/story-segments';
import type { ParsedChartBlock, ParsedMapBlock, ParsedTableBlock } from '@quarry/shared/story-segments';
import type { StoryTheme } from '@quarry/shared/story-theme';

import type { QueryDataMap } from '@/components/story-embeds';
import type { StoryFilterApi } from '@/hooks/use-story-filters';
import { StoryFilterBar } from '@/components/story-filter-bar';
import { StoryThemeProvider } from '@/components/story-theme-provider';
import { StoryTabsBar } from '@/components/side-panel/story-tabs-bar';
import { StoryBlock, StoryMapFrame, StoryTableFrame } from '@/components/story-block';
import { SegmentList } from '@/components/story-rendering';
import { StoryQuerySqlProvider } from '@/contexts/story-query-sql';
import { useStoryFilters } from '@/hooks/use-story-filters';
import styles from './story-tabbed-content.module.css';

export interface StoryEmbedRenderOptions {
	queryData: QueryDataMap | null;
	hasActiveFilters: boolean;
	isRefreshing: boolean;
	key: number;
}

interface StoryTabbedContentProps {
	code: string;
	renderChart: (chart: ParsedChartBlock, options: StoryEmbedRenderOptions) => React.ReactNode;
	renderTable: (table: ParsedTableBlock, options: StoryEmbedRenderOptions) => React.ReactNode;
	renderMap: (map: ParsedMapBlock, options: StoryEmbedRenderOptions) => React.ReactNode;
	contentClassName?: string;
	baselineQueryData?: QueryDataMap | null;
	filterApi?: StoryFilterApi | null;
	theme?: StoryTheme | null;
}

export function StoryTabbedContent({
	code,
	renderChart,
	renderTable,
	renderMap,
	contentClassName = styles.defaultContent,
	baselineQueryData,
	filterApi,
	theme,
}: StoryTabbedContentProps) {
	const tabs = useMemo(() => parseStoryTabs(code), [code]);
	const [activeIndex, setActiveIndex] = useState(0);
	const isTabbed = Boolean(tabs?.length);
	const activeTabIndex = tabs?.length ? Math.min(activeIndex, tabs.length - 1) : 0;
	const activeCode = isTabbed && tabs ? tabs[activeTabIndex].innerCode : stripStoryTabsMarkup(code);
	const segments = useMemo(() => splitCodeIntoSegments(activeCode), [activeCode]);
	const storyFilters = useStoryFilters({
		code,
		baselineQueryData,
		api: filterApi,
		enabled: Boolean(filterApi),
	});
	const querySqlSource = useMemo(
		() =>
			filterApi
				? {
						api: filterApi,
						selections: storyFilters.filtersEnabled ? storyFilters.debouncedSelections : {},
					}
				: null,
		[filterApi, storyFilters.filtersEnabled, storyFilters.debouncedSelections],
	);

	return (
		<StoryQuerySqlProvider value={querySqlSource}>
			<StoryThemeProvider
				theme={theme ?? null}
				className={styles.storyTabbedContentStoryThemeProvider}
			>
				{isTabbed && tabs && (
					<StoryTabsBar
						tabs={tabs.map((tab) => ({ title: tab.title }))}
						activeIndex={activeTabIndex}
						onSelect={setActiveIndex}
						contentClassName={styles.storyTabbedContentStoryTabsBar}
					/>
				)}
				<div className={styles.storyTabbedContentDiv}>
					<div className={contentClassName}>
						<StoryFilterBar
							filters={storyFilters.filters}
							selections={storyFilters.selections}
							onSelectionChange={storyFilters.setSelection}
							onClear={storyFilters.clearSelections}
							api={filterApi}
						/>
						<SegmentList
							segments={segments}
							renderChart={(chart, key) => (
								<StoryBlock>
									{renderChart(chart, {
										queryData: storyFilters.queryData,
										hasActiveFilters: storyFilters.hasActiveFilters,
										isRefreshing: storyFilters.isFiltering,
										key,
									})}
								</StoryBlock>
							)}
							renderTable={(table, key) => (
								<StoryTableFrame>
									{renderTable(table, {
										queryData: storyFilters.queryData,
										hasActiveFilters: storyFilters.hasActiveFilters,
										isRefreshing: storyFilters.isFiltering,
										key,
									})}
								</StoryTableFrame>
							)}
							renderMap={(map, key) => (
								<StoryMapFrame>
									{renderMap(map, {
										queryData: storyFilters.queryData,
										hasActiveFilters: storyFilters.hasActiveFilters,
										isRefreshing: storyFilters.isFiltering,
										key,
									})}
								</StoryMapFrame>
							)}
						/>
					</div>
					<div aria-hidden className={styles.storyTabbedContentDiv2} />
				</div>
			</StoryThemeProvider>
		</StoryQuerySqlProvider>
	);
}
