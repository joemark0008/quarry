import { useMutation, useQueryClient } from '@tanstack/react-query';
import { trpc } from '@/main';
import { storyApi } from '@/lib/story-api';

export function useToggleStoryCertification() {
	const queryClient = useQueryClient();

	const mutation = useMutation(
		storyApi.story.toggleCertification.mutationOptions({
			onSuccess: (_data, { storyId }) => {
				queryClient.invalidateQueries({ queryKey: storyApi.story.getCertification.queryKey({ storyId }) });
				queryClient.invalidateQueries({ queryKey: storyApi.story.listAll.queryKey() });
				queryClient.invalidateQueries({ queryKey: storyApi.story.listStandalone.queryKey() });
				queryClient.invalidateQueries({ queryKey: storyApi.story.listArchived.queryKey() });
				queryClient.invalidateQueries({ queryKey: storyApi.story.listStandaloneArchived.queryKey() });
				queryClient.invalidateQueries({ queryKey: storyApi.story.listSharedArchived.queryKey() });
				queryClient.invalidateQueries({ queryKey: trpc.storyShare.list.queryKey() });
			},
		}),
	);

	function toggle(storyId: string) {
		mutation.mutate({ storyId });
	}

	return { toggle, isPending: mutation.isPending };
}
