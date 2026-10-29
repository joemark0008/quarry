import type { QueryClient } from '@tanstack/react-query';

import { trpc } from '@/main';
import { storyApi } from '@/lib/story-api';

export function invalidateStoriesCaches(queryClient: QueryClient): void {
	void queryClient.invalidateQueries({ queryKey: storyApi.storyFolder.listTree.queryKey() });
	void queryClient.invalidateQueries({ queryKey: storyApi.storyFolder.listItems.queryKey() });
	void queryClient.invalidateQueries({ queryKey: storyApi.story.listAll.queryKey() });
	void queryClient.invalidateQueries({ queryKey: storyApi.story.listStandalone.queryKey() });
	void queryClient.invalidateQueries({ queryKey: storyApi.story.listArchived.queryKey() });
	void queryClient.invalidateQueries({ queryKey: storyApi.story.listStandaloneArchived.queryKey() });
	void queryClient.invalidateQueries({ queryKey: storyApi.story.listSharedArchived.queryKey() });
	void queryClient.invalidateQueries({ queryKey: trpc.storyShare.list.queryKey() });
	void queryClient.invalidateQueries({ queryKey: trpc.favorite.list.queryKey() });
}

export function invalidateStoryArchiveCaches(queryClient: QueryClient): void {
	invalidateStoriesCaches(queryClient);
	void queryClient.invalidateQueries({ queryKey: storyApi.story.listVersions.queryKey() });
	void queryClient.invalidateQueries({ queryKey: storyApi.story.getLatest.queryKey() });
	void queryClient.invalidateQueries({ queryKey: storyApi.story.getCustomVersion.queryKey() });
}

export function invalidateStoryPlacementCaches(queryClient: QueryClient): void {
	invalidateStoriesCaches(queryClient);
	void queryClient.invalidateQueries({ queryKey: trpc.storyShare.getSharedStoryInfo.queryKey() });
}

export function invalidateStoryTitleCaches(queryClient: QueryClient): void {
	invalidateStoriesCaches(queryClient);
	void queryClient.invalidateQueries({ queryKey: storyApi.story.listVersions.queryKey() });
	void queryClient.invalidateQueries({ queryKey: storyApi.story.listStories.queryKey() });
	void queryClient.invalidateQueries({ queryKey: storyApi.story.getLatest.queryKey() });
	void queryClient.invalidateQueries({ queryKey: storyApi.story.getStandalone.queryKey() });
	void queryClient.invalidateQueries({ queryKey: trpc.storyShare.get.queryKey() });
}
