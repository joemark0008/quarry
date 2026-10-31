import { Download, Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { McpAppHeader } from './mcp-app-header';
import { OpenInQuarryButton } from './open-in-quarry-button';
import type { ParsedChartBlock, ParsedMapBlock, ParsedTableBlock } from '@quarry/shared/story-segments';
import type { StoryThemePair } from '@quarry/shared/story-theme';
import type { DownloadFormat } from '@quarry/shared/types';

import type { QueryDataMap } from '@/components/story-embeds';
import { StoryChartEmbed, StoryMapEmbed, StoryTableEmbed } from '@/components/story-embeds';
import { StoryTabbedContent } from '@/components/story-tabbed-content';
import { useStoryThemeForCurrentMode } from '@/components/story-theme-provider';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import styles from './story-app-view.module.css';

interface StoryAppViewProps {
	title: string;
	code: string;
	queryData: QueryDataMap | null;
	theme?: StoryThemePair | null;
	quarryUrl?: string;
	onDownload?: (format: DownloadFormat) => Promise<void>;
}

export function StoryAppView({ title, code, queryData, theme, quarryUrl, onDownload }: StoryAppViewProps) {
	const storyTheme = useStoryThemeForCurrentMode(theme);

	return (
		<div className={styles.storyAppViewDiv}>
			<McpAppHeader title={title}>
				{onDownload ? <StoryDownloadButton onDownload={onDownload} /> : null}
				{quarryUrl ? <OpenInQuarryButton url={quarryUrl} /> : null}
			</McpAppHeader>
			<StoryBody code={code} queryData={queryData} theme={storyTheme} />
		</div>
	);
}

function StoryBody({
	code,
	queryData,
	theme,
}: {
	code: string;
	queryData: QueryDataMap | null;
	theme: ReturnType<typeof useStoryThemeForCurrentMode>;
}) {
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
			/>
		),
		[],
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
			/>
		),
		[],
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
				allowExpand
			/>
		),
		[],
	);

	return (
		<StoryTabbedContent
			code={code}
			baselineQueryData={queryData}
			theme={theme}
			renderChart={renderChart}
			renderTable={renderTable}
			renderMap={renderMap}
		/>
	);
}

function StoryDownloadButton({ onDownload }: { onDownload: (format: DownloadFormat) => Promise<void> }) {
	const [isDownloading, setIsDownloading] = useState(false);

	const handleSelect = async (format: DownloadFormat) => {
		setIsDownloading(true);
		try {
			await onDownload(format);
		} finally {
			setIsDownloading(false);
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant='outline' size='sm' className={styles.storyDownloadButtonButton} disabled={isDownloading}>
					{isDownloading ? <Loader2 className={styles.storyDownloadButtonLoader2} /> : <Download className={styles.storyDownloadButtonDownload} />}
					<span className={styles.storyDownloadButtonSpan}>Download</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end'>
				<DropdownMenuItem onClick={() => handleSelect('pdf')}>PDF</DropdownMenuItem>
				<DropdownMenuItem onClick={() => handleSelect('html')}>HTML</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
