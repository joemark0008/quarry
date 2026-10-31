import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CustomStoryViewerAccess } from '@quarry/shared/story-app';
import type { DownloadFormat } from '@quarry/shared/types';

import type { CustomStoryViewMode } from './custom-story-view-mode';
import type { CustomStoryFileSource } from './story-data-options';
import { CustomStoryBody } from './custom-story-body';
import { CustomStoryFiles } from './custom-story-files';
import { CustomStoryViewLayers } from './custom-story-view-mode';
import { useCustomStoryDownload } from './use-custom-story-download';
import { useStoryViewerAgentState } from '@/feature/stories/components/side-panel/hooks/use-story-viewer-agent-state';
import { useStoryViewerSwitchStory } from '@/feature/stories/components/side-panel/hooks/use-story-viewer-switch-story';
import { StoryHeader } from '@/feature/stories/components/side-panel/story-header';
import { StoryViewer } from '@/feature/stories/components/side-panel/story-viewer';
import { useSidePanel } from '@/contexts/side-panel';
import { isNotFoundError } from '@/lib/api-error';
import { storyApi } from '@/lib/story-api';
import styles from './readonly-custom-story-viewer.module.css';

interface ReadonlyCustomStoryViewerProps {
	chatId: string;
	storySlug: string;
	access: CustomStoryViewerAccess;
}

export function ReadonlyCustomStoryViewer({ chatId, storySlug, access }: ReadonlyCustomStoryViewerProps) {
	const { close, setCurrentStorySlug, isReplay, shareSource } = useSidePanel();
	const [viewMode, setViewMode] = useState<CustomStoryViewMode>('app');
	const contentQuery = useQuery(storyApi.customStoryViewer.getVersion.queryOptions({ access, storySlug }));
	const content = contentQuery.data;
	const versionNumber = content?.version.number;
	const dataSource = useMemo<CustomStoryFileSource>(
		() => ({ kind: 'viewer', access, storySlug, versionNumber }),
		[access, storySlug, versionNumber],
	);
	const { allStories } = useStoryViewerAgentState(storySlug);
	const renderStoryViewer = useCallback(
		(nextStorySlug: string) => <StoryViewer chatId={chatId} storySlug={nextStorySlug} />,
		[chatId],
	);
	const { switchStory } = useStoryViewerSwitchStory({ renderStoryViewer });
	const renderExport = useCallback(
		(format: DownloadFormat, html: string) =>
			storyApi.customStoryViewer.download.mutate({ access, storySlug, format, html, versionNumber }),
		[access, storySlug, versionNumber],
	);
	const download = useCustomStoryDownload(content, dataSource, renderExport);

	useEffect(() => {
		setCurrentStorySlug(storySlug);
	}, [setCurrentStorySlug, storySlug]);

	return (
		<div className={styles.readonlyCustomStoryViewerDiv}>
			<StoryHeader
				title={content?.title ?? storySlug}
				chatId={chatId}
				storySlug={storySlug}
				storyId={content?.storyId}
				shareSource={shareSource}
				allStories={allStories}
				onSwitchStory={switchStory}
				viewMode={viewMode}
				onViewModeChange={setViewMode}
				currentVersion={content ? 1 : 0}
				versionDates={content ? [content.version.createdAt] : []}
				versionNumber={content?.version.number}
				versionDate={content?.version.createdAt}
				onSelectVersion={ignore}
				isViewingLatest
				onRestore={ignore}
				onShare={ignore}
				onEnlarge={ignore}
				isShared={false}
				isAgentRunning={false}
				isStoryUpdating={false}
				isReadonlyMode
				isReplay={isReplay}
				isLive={content?.isLive ?? false}
				isLiveUpdating={false}
				isRefreshing={false}
				onRefreshData={ignore}
				onOpenLiveSettings={ignore}
				onClose={close}
				cachedAt={content?.cachedAt}
				lastRefreshFailure={content?.lastRefreshFailure}
				onDownload={download}
			/>

			<CustomStoryViewLayers
				viewMode={viewMode}
				app={
					<CustomStoryBody
						dataSource={dataSource}
						content={content}
						isLoading={contentQuery.isLoading}
						error={contentQuery.error}
						hasPublishedVersion={!isNotFoundError(contentQuery.error)}
					/>
				}
				files={
					content && (
						<CustomStoryFiles
							key={content.version.id}
							source={dataSource}
							versionNumber={content.version.number}
							files={content.files}
						/>
					)
				}
			/>
		</div>
	);
}

function ignore() {}
