import { StoryPageHeader } from './story-page-header';
import type { StoryPageHeaderProps, StoryRefreshFailure } from './story-page-header';

interface SharedStoryHeaderProps {
	title: string;
	authorName: string;
	storyChatHeader?: Pick<StoryPageHeaderProps, 'storyChat' | 'canDuplicate'>;
	isLive: boolean;
	cachedAt?: string | Date | null;
	lastRefreshFailure?: StoryRefreshFailure | null;
	isRefreshing: boolean;
	canRefresh: boolean;
	onRefresh: () => void;
	storyId: string | null;
	download: StoryPageHeaderProps['download'];
}

export function SharedStoryHeader({
	title,
	authorName,
	storyChatHeader,
	isLive,
	cachedAt,
	lastRefreshFailure,
	isRefreshing,
	canRefresh,
	onRefresh,
	storyId,
	download,
}: SharedStoryHeaderProps) {
	return (
		<StoryPageHeader
			title={title}
			authorName={authorName}
			{...storyChatHeader}
			live={
				isLive
					? {
							isLive: true,
							cachedAt,
							lastRefreshFailure,
							isRefreshing,
							canRefresh,
							onRefresh,
							isInActionsMenu: true,
						}
					: undefined
			}
			download={download}
			storyId={storyId}
		/>
	);
}
