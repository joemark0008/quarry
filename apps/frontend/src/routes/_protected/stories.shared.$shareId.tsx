import { createFileRoute, redirect } from '@tanstack/react-router';

import { StoryRouteError } from '@/feature/stories/components/story-access-error';
import { storyApi } from '@/lib/story-api';

export const Route = createFileRoute('/_protected/stories/shared/$shareId')({
	beforeLoad: async ({ params }) => {
		const { storyId } = await storyApi.storyShare.getStoryIdByShareId.query({ shareId: params.shareId });
		throw redirect({ to: '/stories/$storyId', params: { storyId }, replace: true });
	},
	errorComponent: StoryRouteError,
});
