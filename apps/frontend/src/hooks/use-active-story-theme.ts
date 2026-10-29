import { useQuery } from '@tanstack/react-query';
import type { StoryTheme } from '@quarry/shared/story-theme';

import { useStoryThemeForCurrentMode } from '@/components/story-theme-provider';
import { storyApi } from '@/lib/story-api';

export function useActiveStoryTheme(): StoryTheme | null {
	const { data: activeTheme } = useQuery(storyApi.storyTheme.getActive.queryOptions());
	return useStoryThemeForCurrentMode(activeTheme?.theme);
}
