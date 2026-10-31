import { createFileRoute } from '@tanstack/react-router';
import { StoryEmbedPage } from '@/feature/embed/story-embed-page';

export const Route = createFileRoute('/embed/story/$storyId')({
	validateSearch: (search: Record<string, unknown>) => ({
		token: typeof search.token === 'string' ? search.token : '',
	}),
	component: StoryEmbedPage,
});
