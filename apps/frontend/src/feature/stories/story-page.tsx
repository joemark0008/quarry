import { getRouteApi } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { CustomStoryPreviewPage } from '@/feature/stories/components/custom-story/custom-story-page';
import { OwnedStoryPage } from '@/feature/stories/components/owned-story-page';
import { SharedStoryPage } from '@/feature/stories/components/shared-story-page';
import { StandaloneStoryPage } from '@/feature/stories/components/standalone-story-page';
import { storyApi } from '@/lib/story-api';

const Route = getRouteApi('/_protected/stories/$storyId');


export function StoryPage() {
	const { storyId } = Route.useParams();
	const { data: story } = useSuspenseQuery(storyApi.story.resolve.queryOptions({ storyId }));

	if (!story.isOwner) {
		return <SharedStoryPage key={storyId} storyId={storyId} />;
	}

	if (story.chatId && story.format === 'custom') {
		return <CustomStoryPreviewPage key={storyId} chatId={story.chatId} storySlug={story.slug} />;
	}

	if (story.chatId) {
		return <OwnedStoryPage key={storyId} chatId={story.chatId} storySlug={story.slug} />;
	}

	return <StandaloneStoryPage key={storyId} storyId={storyId} />;
}
