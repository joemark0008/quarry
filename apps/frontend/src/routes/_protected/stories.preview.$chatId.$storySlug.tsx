import { createFileRoute, redirect } from '@tanstack/react-router';

import { StoryRouteError } from '@/feature/stories/components/story-access-error';
import { storyApi } from '@/lib/story-api';

export const Route = createFileRoute('/_protected/stories/preview/$chatId/$storySlug')({
	beforeLoad: async ({ params }) => {
		const { storyId } = await storyApi.story.getIdByChatAndSlug.query({
			chatId: params.chatId,
			storySlug: params.storySlug,
		});
		throw redirect({ to: '/stories/$storyId', params: { storyId }, replace: true });
	},
	errorComponent: StoryRouteError,
});
