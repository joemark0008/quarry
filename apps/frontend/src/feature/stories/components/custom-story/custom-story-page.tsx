import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { CustomStoryBlockEditDialog, CustomStoryTableFormatDialog } from './custom-story-block-edit';
import { ActionErrorBanner, CustomStoryBody } from './custom-story-body';
import { CustomStoryFiles } from './custom-story-files';
import { CustomStoryViewLayers } from './custom-story-view-mode';
import { useCustomStory } from './use-custom-story';
import { useCustomStoryDownload } from './use-custom-story-download';
import styles from './custom-story-page.module.css';
import type { DownloadFormat, StoryBlockReference } from '@quarry/shared/types';
import type { StoryBlockEditPayload, StoryTableFormatEditRequest } from '@quarry/shared/story-app';
import type { StoryBlockEditTarget, StoryTableFormatEditTarget } from '@/stores/story-block-edit';

import type { CustomStoryDataSource } from './story-data-options';
import type { CustomStoryViewMode } from './custom-story-view-mode';
import type { StoryPageHeaderProps } from '@/feature/stories/components/story-page-header';
import { STORY_ASK_BAR_INSET, StoryAskBar } from '@/feature/stories/components/story-ask-bar';
import { ShareStoryDialog } from '@/components/share-dialog.story';
import { SharedStoryHeader } from '@/feature/stories/components/shared-story-header';
import { useStoryViewerLiveSettings } from '@/feature/stories/components/side-panel/hooks/use-story-viewer-live-settings';
import { useStoryViewerSharing } from '@/feature/stories/components/side-panel/hooks/use-story-viewer-sharing';
import { LiveStorySettingsDialog } from '@/feature/stories/components/side-panel/live-story-settings-dialog';
import { ArchivedBanner } from '@/feature/stories/components/side-panel/story-archived-banner';
import { StoryPageHeader } from '@/feature/stories/components/story-page-header';
import { useEffectiveUserGroupFeatures } from '@/hooks/use-effective-user-group-features';
import { useRetryStaleStoryRefresh } from '@/hooks/use-retry-stale-story-refresh';
import { storyApi } from '@/lib/story-api';
import { requestAsk } from '@/stores/ask-bar';

interface CustomStoryPreviewPageProps {
	chatId: string;
	storySlug: string;
	authorName?: string;
}

/** Full-page view of a custom story for its owner, with the same header as a classic story's page. */
export function CustomStoryPreviewPage({ chatId, storySlug, authorName }: CustomStoryPreviewPageProps) {
	const story = useCustomStory(chatId, storySlug);
	const { customStoryCreationEnabled } = useEffectiveUserGroupFeatures();
	const { content } = story;
	const storyId = story.versionsQuery.data?.id ?? content?.storyId ?? null;
	const sharing = useStoryViewerSharing({ chatId, storySlug });
	const live = useStoryViewerLiveSettings({ chatId, storySlug });
	useRetryStaleStoryRefresh({
		storyKey: `${chatId}/${storySlug}`,
		needsRefresh: content?.needsRefresh ?? false,
		isRefreshing: live.isRefreshing,
		refresh: live.handleRefreshData,
	});
	const [viewMode, setViewMode] = useState<CustomStoryViewMode>('app');
	const [isLiveSettingsOpen, setIsLiveSettingsOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<StoryBlockEditTarget | null>(null);
	const [tableFormatTarget, setTableFormatTarget] = useState<StoryTableFormatEditTarget | null>(null);
	const canEditBlocks = story.isViewingLatest && !story.isAgentRunning && !story.isArchived;

	const handleEditBlock = useCallback(
		(payload: StoryBlockEditPayload) => {
			if (content) {
				setEditTarget({ chatId, storySlug, versionNumber: content.version.number, payload });
			}
		},
		[chatId, content, storySlug],
	);
	const handleEditTableFormat = useCallback(
		(request: StoryTableFormatEditRequest) => {
			if (content) {
				setTableFormatTarget({ chatId, storySlug, versionNumber: content.version.number, request });
			}
		},
		[chatId, content, storySlug],
	);
	const handleAskBlock = useCallback((block: StoryBlockReference) => {
		requestAsk({ chatId: null, selection: { text: block.title ?? '', block } });
	}, []);

	const showAskBar = Boolean(storyId) && !story.isArchived;
	const isAskInputHidden = viewMode !== 'app';

	return (
		<div className={styles.customStoryPreviewPageDiv}>
			<StoryPageHeader
				title={content?.title ?? story.versionsQuery.data?.title ?? storySlug}
				authorName={authorName}
				storyChat={{ storyId, isOwner: true, canChat: !story.isArchived }}
				canDuplicate={!story.isArchived}
				live={{
					isLive: live.isLive,
					cachedAt: content?.cachedAt,
					lastRefreshFailure: content?.lastRefreshFailure,
					isRefreshing: live.isRefreshing,
					isUpdating: live.isUpdating,
					onRefresh: live.handleRefreshData,
					onOpenSettings: () => setIsLiveSettingsOpen(true),
				}}
				download={{ chatId, storySlug, isOwner: true, onDownload: story.download }}
				storyId={storyId}
				canRename
				isShared={sharing.isShared}
				onShare={() => sharing.setIsShareDialogOpen(true)}
				viewModeControls={{ viewMode, onViewModeChange: setViewMode }}
				versionControls={{
					currentVersion: story.currentVersionIndex,
					versionDates: story.versionDates,
					versionDate: story.viewedVersionDate,
					isViewingLatest: story.isViewingLatest,
					onSelectVersion: story.goToVersion,
					onRestore: story.restore,
				}}
			/>

			{story.isArchived && <ArchivedBanner chatId={chatId} storySlug={storySlug} />}
			{story.restoreError && <ActionErrorBanner message={story.restoreError.message} />}

			<div className={styles.customStoryPreviewPageDiv2}>
				<CustomStoryViewLayers
					viewMode={viewMode}
					app={
						<CustomStoryBody
							bottomInset={showAskBar && !isAskInputHidden ? STORY_ASK_BAR_INSET : undefined}
							dataSource={story.dataSource}
							content={content}
							isLoading={story.isLoading}
							error={story.error}
							hasPublishedVersion={story.hasPublishedVersion}
							editable={canEditBlocks && viewMode === 'app'}
							onEditBlock={handleEditBlock}
							onEditTableFormat={handleEditTableFormat}
							onAskBlock={handleAskBlock}
						/>
					}
					files={
						content && (
							<CustomStoryFiles
								key={content.version.id}
								source={story.dataSource}
								versionNumber={content.version.number}
								files={content.files}
								editable={canEditBlocks && customStoryCreationEnabled}
							/>
						)
					}
				/>
				{showAskBar && storyId && <StoryAskBar storyId={storyId} isOwner isInputHidden={isAskInputHidden} />}
			</div>

			<CustomStoryBlockEditDialog
				target={canEditBlocks ? editTarget : null}
				onClose={() => setEditTarget(null)}
			/>
			<CustomStoryTableFormatDialog
				target={canEditBlocks ? tableFormatTarget : null}
				onClose={() => setTableFormatTarget(null)}
			/>
			<ShareStoryDialog
				open={sharing.isShareDialogOpen}
				onOpenChange={sharing.setIsShareDialogOpen}
				chatId={chatId}
				storySlug={storySlug}
			/>
			<LiveStorySettingsDialog
				open={isLiveSettingsOpen}
				onOpenChange={setIsLiveSettingsOpen}
				chatId={chatId}
				storySlug={storySlug}
				isLive={live.isLive}
				isLiveTextDynamic={live.isLiveTextDynamic}
				cacheSchedule={live.cacheSchedule}
				cacheScheduleDescription={live.cacheScheduleDescription}
				isUpdating={live.isUpdating}
				onSaveSettings={live.handleSaveSettings}
			/>
		</div>
	);
}

interface SharedCustomStoryPageProps {
	storyId: string;
	title: string;
	authorName: string;
	isSignedIn: boolean;
	isLive: boolean;
	canRefresh: boolean;
	storyChatHeader?: Pick<StoryPageHeaderProps, 'storyChat' | 'canDuplicate'>;
}

/** A custom story opened from a share link: data comes through the share, limited to the queries the story uses. */
export function SharedCustomStoryPage({
	storyId,
	title,
	authorName,
	isSignedIn,
	isLive,
	canRefresh,
	storyChatHeader,
}: SharedCustomStoryPageProps) {
	const queryClient = useQueryClient();
	const contentQuery = useQuery(storyApi.storyShare.getCustomVersion.queryOptions({ storyId }));
	const content = contentQuery.data;
	const versionNumber = content?.version.number;
	const dataSource = useMemo<CustomStoryDataSource>(
		() => ({ kind: 'share', storyId, versionNumber }),
		[storyId, versionNumber],
	);

	const refreshMutation = useMutation(
		storyApi.storyShare.refreshData.mutationOptions({
			onSettled: () =>
				Promise.all([
					queryClient.invalidateQueries({ queryKey: storyApi.storyShare.get.queryKey({ storyId }) }),
					queryClient.invalidateQueries({
						queryKey: storyApi.storyShare.getCustomVersion.queryKey({ storyId }),
					}),
					queryClient.invalidateQueries({
						queryKey: storyApi.storyShare.getCustomStoryQueryData.queryKey({ storyId }),
					}),
					queryClient.invalidateQueries({
						queryKey: storyApi.storyShare.getCustomStoryNarratives.queryKey({ storyId }),
					}),
				]),
		}),
	);
	const renderExport = useCallback(
		(format: DownloadFormat, html: string) => storyApi.storyShare.downloadCustom.mutate({ storyId, format, html }),
		[storyId],
	);
	const download = useCustomStoryDownload(content, dataSource, renderExport);

	return (
		<div className={styles.customStoryPreviewPageDiv}>
			<SharedStoryHeader
				title={content?.title ?? title}
				authorName={authorName}
				storyChatHeader={storyChatHeader}
				isLive={isLive}
				cachedAt={content?.cachedAt}
				lastRefreshFailure={content?.lastRefreshFailure}
				isRefreshing={refreshMutation.isPending}
				canRefresh={canRefresh}
				onRefresh={() => refreshMutation.mutate({ storyId })}
				storyId={isSignedIn ? storyId : null}
				download={{ shareSource: { type: 'story', storyId }, isOwner: false, onDownload: download }}
			/>
			<div className={styles.customStoryPreviewPageDiv2}>
				<CustomStoryBody
					bottomInset={storyChatHeader?.storyChat?.canChat ? STORY_ASK_BAR_INSET : undefined}
					dataSource={dataSource}
					content={content}
					isLoading={contentQuery.isLoading}
					error={contentQuery.error}
					hasPublishedVersion
				/>
				{storyChatHeader?.storyChat?.canChat && (
					<StoryAskBar storyId={storyId} isOwner={storyChatHeader.storyChat.isOwner} />
				)}
			</div>
		</div>
	);
}
