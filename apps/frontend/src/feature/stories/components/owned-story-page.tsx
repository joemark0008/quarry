import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { ArchiveRestoreIcon } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { StoryChartEmbed, StoryMapEmbed, StoryTableEmbed } from './story-embeds';
import { StoryTabbedContent } from './story-tabbed-content';
import { useStoryThemeForCurrentMode } from './story-theme-provider';
import { StoryPageBody } from './story-page-body';
import { STORY_ASK_BAR_INSET_STYLE, StoryAskBar } from './story-ask-bar';
import { StoryPageHeader } from './story-page-header';
import styles from './owned-story-page.module.css';
import type { ParsedChartBlock, ParsedMapBlock, ParsedTableBlock } from '@quarry/shared/story-segments';
import type { LiveQueryConfig, QueryDataMap } from './story-embeds';
import { HighlightBubble } from '@/feature/chat/components/highlight-bubble';
import { Button } from '@/components/ui/button';
import { LiveStorySettingsDialog } from '@/feature/stories/components/side-panel/live-story-settings-dialog';
import { useStoryViewerLiveSettings } from '@/feature/stories/components/side-panel/hooks/use-story-viewer-live-settings';
import { ShareStoryDialog } from '@/components/share-dialog.story';
import { SelectionProvider } from '@/contexts/text-selection';
import { StoryChartEditProvider } from '@/contexts/story-chart-edit';
import { StoryMapEditProvider } from '@/contexts/story-map-edit';
import { StoryTableEditProvider } from '@/contexts/story-table-edit';
import { requestAskAboutSelection } from '@/stores/ask-bar';
import { useChatActivity } from '@/hooks/use-chat-activity';
import { useRetryStaleStoryRefresh } from '@/hooks/use-retry-stale-story-refresh';
import { useStoryPageEditor } from '@/hooks/use-story-page-editor';
import { useStoryVersionQueryData } from '@/hooks/use-story-version-query-data';
import { storyApi } from '@/lib/story-api';

export function OwnedStoryPage({ chatId, storySlug }: { chatId: string; storySlug: string }) {
	const { data: story } = useSuspenseQuery(storyApi.story.getLatest.queryOptions({ chatId, storySlug }));
	const queryClient = useQueryClient();
	const { running: isChatRunning } = useChatActivity(chatId);
	const [isLiveSettingsOpen, setIsLiveSettingsOpen] = useState(false);
	const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

	const {
		storyId,
		isLive,
		isLiveTextDynamic,
		cacheSchedule: liveCacheSchedule,
		cacheScheduleDescription,
		isUpdating,
		isRefreshing,
		handleSaveSettings,
		handleRefreshData,
	} = useStoryViewerLiveSettings({ chatId, storySlug });
	useRetryStaleStoryRefresh({
		storyKey: `${chatId}/${storySlug}`,
		needsRefresh: story.needsRefresh,
		isRefreshing,
		refresh: handleRefreshData,
	});

	const shareQuery = useQuery(storyApi.storyShare.getSharedStoryInfo.queryOptions({ chatId, storySlug }));
	const isShared = shareQuery.data?.isShared === true;

	const editor = useStoryPageEditor({
		chatId,
		storySlug,
		storyTitle: story.title,
		latestCode: story.code,
		isAgentRunning: isChatRunning,
	});
	const { queryData, isPending: isQueryDataPending } = useStoryVersionQueryData({
		chatId,
		storySlug,
		versionNumber: editor.versionNav.storedVersionNumber,
		isViewingLatest: editor.versionNav.isViewingLatest,
		latestQueryData: story.queryData as QueryDataMap | null,
	});
	const unarchiveMutation = useMutation(
		storyApi.story.unarchive.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: storyApi.story.getLatest.queryKey({ chatId, storySlug }) });
				queryClient.invalidateQueries({ queryKey: storyApi.story.listAll.queryKey() });
				queryClient.invalidateQueries({ queryKey: storyApi.story.listArchived.queryKey() });
			},
		}),
	);

	const isArchived = Boolean(story.archivedAt);
	const canEditCharts = !isArchived;
	const storyTheme = useStoryThemeForCurrentMode(story.theme);
	const showAskBar = Boolean(storyId) && !isArchived;
	const isAskInputHidden = editor.viewMode !== 'preview';

	return (
		<div
			className={styles.ownedStoryPageDiv}
			style={showAskBar && !isAskInputHidden ? STORY_ASK_BAR_INSET_STYLE : undefined}
		>
			<StoryPageHeader
				title={story.title}
				storyChat={{ storyId, isOwner: true, canChat: !isArchived }}
				canDuplicate={!isArchived}
				live={{
					isLive,
					cachedAt: story.cachedAt,
					lastRefreshFailure: story.lastRefreshFailure,
					isRefreshing,
					isUpdating,
					onRefresh: () => handleRefreshData(),
					onOpenSettings: () => setIsLiveSettingsOpen(true),
				}}
				download={{ chatId, storySlug, isOwner: true }}
				storyId={storyId}
				canRename
				isShared={isShared}
				onShare={() => setIsShareDialogOpen(true)}
				viewModeControls={{
					viewMode: editor.viewMode,
					onViewModeChange: editor.setViewMode,
					canEdit: canEditCharts,
					isAgentRunning: isChatRunning,
					isCodeDirty: editor.isCodeDirty,
					isCodeValid: editor.isCodeValid,
					onSave: editor.handleSave,
					onCancel: editor.handleCancel,
					isSaving: editor.isSaving,
				}}
				versionControls={{
					currentVersion: editor.versionNav.currentVersion,
					versionDates: editor.versionNav.versionDates,
					versionDate: editor.versionNav.versionDate,
					isViewingLatest: editor.versionNav.isViewingLatest,
					onSelectVersion: editor.versionNav.goToVersion,
					onRestore: editor.handleRestore,
				}}
			/>

			{story.archivedAt && (
				<div className={styles.ownedStoryPageDiv2}>
					<span className={styles.ownedStoryPageSpan}>This story has been archived.</span>
					<Button
						variant='outline'
						size='sm'
						className={styles.ownedStoryPageButton}
						onClick={() => unarchiveMutation.mutate({ chatId, storySlug })}
						disabled={unarchiveMutation.isPending}
					>
						<ArchiveRestoreIcon className={styles.ownedStoryPageArchiveRestoreIcon} />
						<span>Unarchive</span>
					</Button>
				</div>
			)}

			<div className={styles.ownedStoryPageDiv3}>
				<StoryPageBody
					editor={editor}
					queryData={queryData}
					theme={storyTheme}
					preview={
						<SelectionProvider key={storySlug}>
							<HighlightBubble onAsk={requestAskAboutSelection} disabled={isChatRunning} />
							{renderWithChartEditProvider(
								canEditCharts && editor.versionNav.isViewingLatest && !isChatRunning,
								{ chatId, storySlug, storyTitle: story.title, storyCode: editor.code },
								<PreviewContent
									code={editor.code}
									queryData={queryData}
									theme={storyTheme}
									chatId={chatId}
									storySlug={storySlug}
									cacheSchedule={story.cacheSchedule}
									filtersEnabled={editor.versionNav.isViewingLatest && !editor.isCodeDirty}
									isDataPending={isQueryDataPending}
									isViewingLatest={editor.versionNav.isViewingLatest}
								/>,
							)}
						</SelectionProvider>
					}
				/>

				{showAskBar && storyId && <StoryAskBar storyId={storyId} isOwner isInputHidden={isAskInputHidden} />}
			</div>

			<LiveStorySettingsDialog
				open={isLiveSettingsOpen}
				onOpenChange={setIsLiveSettingsOpen}
				chatId={chatId}
				storySlug={storySlug}
				isLive={isLive}
				isLiveTextDynamic={isLiveTextDynamic}
				cacheSchedule={liveCacheSchedule}
				cacheScheduleDescription={cacheScheduleDescription}
				isUpdating={isUpdating}
				onSaveSettings={handleSaveSettings}
			/>

			<ShareStoryDialog
				open={isShareDialogOpen}
				onOpenChange={setIsShareDialogOpen}
				chatId={chatId}
				storySlug={storySlug}
			/>
		</div>
	);
}

function renderWithChartEditProvider(
	enabled: boolean,
	params: { chatId: string; storySlug: string; storyTitle: string; storyCode: string },
	children: React.ReactNode,
) {
	if (!enabled) {
		return children;
	}

	return (
		<StoryChartEditProvider
			chatId={params.chatId}
			storySlug={params.storySlug}
			storyTitle={params.storyTitle}
			storyCode={params.storyCode}
		>
			<StoryTableEditProvider
				chatId={params.chatId}
				storySlug={params.storySlug}
				storyTitle={params.storyTitle}
				storyCode={params.storyCode}
			>
				<StoryMapEditProvider
					chatId={params.chatId}
					storySlug={params.storySlug}
					storyTitle={params.storyTitle}
					storyCode={params.storyCode}
				>
					{children}
				</StoryMapEditProvider>
			</StoryTableEditProvider>
		</StoryChartEditProvider>
	);
}

function PreviewContent({
	code,
	queryData,
	theme,
	chatId,
	storySlug,
	cacheSchedule,
	filtersEnabled,
	isDataPending,
	isViewingLatest,
}: {
	code: string;
	queryData: QueryDataMap | null;
	theme: ReturnType<typeof useStoryThemeForCurrentMode>;
	chatId: string;
	storySlug: string;
	cacheSchedule?: string | null;
	filtersEnabled: boolean;
	isDataPending: boolean;
	isViewingLatest: boolean;
}) {
	const isNoCacheMode = cacheSchedule === 'no-cache';
	const useLiveUnfiltered = isViewingLatest && isNoCacheMode;
	const filterApi = useMemo(
		() => (filtersEnabled ? { kind: 'owned' as const, chatId, storySlug } : null),
		[chatId, filtersEnabled, storySlug],
	);

	const noCacheQuery = useMemo<LiveQueryConfig | undefined>(
		() =>
			useLiveUnfiltered
				? { queryOptions: (queryId) => storyApi.story.getLiveQueryData.queryOptions({ chatId, queryId }) }
				: undefined,
		[useLiveUnfiltered, chatId],
	);

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
				queryData={useLiveUnfiltered && !hasActiveFilters ? undefined : data}
				liveQuery={useLiveUnfiltered && !hasActiveFilters ? noCacheQuery : undefined}
				hasActiveFilters={hasActiveFilters}
				isRefreshing={isRefreshing}
				isDataPending={isDataPending}
			/>
		),
		[isDataPending, noCacheQuery, useLiveUnfiltered],
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
				queryData={useLiveUnfiltered && !hasActiveFilters ? undefined : data}
				liveQuery={useLiveUnfiltered && !hasActiveFilters ? noCacheQuery : undefined}
				hasActiveFilters={hasActiveFilters}
				isRefreshing={isRefreshing}
				isDataPending={isDataPending}
			/>
		),
		[isDataPending, noCacheQuery, useLiveUnfiltered],
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
				queryData={useLiveUnfiltered && !hasActiveFilters ? undefined : data}
				liveQuery={useLiveUnfiltered && !hasActiveFilters ? noCacheQuery : undefined}
				hasActiveFilters={hasActiveFilters}
				isRefreshing={isRefreshing}
				isDataPending={isDataPending}
				allowExpand
			/>
		),
		[isDataPending, noCacheQuery, useLiveUnfiltered],
	);

	return (
		<StoryTabbedContent
			code={code}
			baselineQueryData={queryData}
			filterApi={filterApi}
			theme={theme}
			renderChart={renderChart}
			renderTable={renderTable}
			renderMap={renderMap}
		/>
	);
}
