import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { storyApi } from '@/lib/story-api';

interface UseStoryViewerSharingParams {
	chatId: string;
	storySlug: string;
}

export const useStoryViewerSharing = ({ chatId, storySlug }: UseStoryViewerSharingParams) => {
	const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
	const shareQuery = useQuery(storyApi.storyShare.getSharedStoryInfo.queryOptions({ chatId, storySlug }));
	const isShared = shareQuery.data?.isShared === true;

	return {
		isShareDialogOpen,
		setIsShareDialogOpen,
		isShared,
	};
};
