import { createFileRoute } from '@tanstack/react-router';
import { StoryContentLoading } from '@/feature/stories/components/side-panel/story-content-loading';
import { StoryRouteError } from '@/feature/stories/components/story-access-error';
import { StoryPage } from '@/feature/stories/story-page';

export const Route = createFileRoute('/_protected/stories/$storyId')({
	component: StoryPage,
	pendingComponent: StoryContentLoading,
	errorComponent: StoryRouteError,
});
