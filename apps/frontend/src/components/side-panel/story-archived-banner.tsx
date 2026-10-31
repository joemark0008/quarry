import { ArchiveRestoreIcon } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { storyApi } from '@/lib/story-api';
import styles from './story-archived-banner.module.css';

interface ArchivedBannerProps {
	chatId: string;
	storySlug: string;
}

export function ArchivedBanner({ chatId, storySlug }: ArchivedBannerProps) {
	const queryClient = useQueryClient();

	const unarchiveMutation = useMutation(
		storyApi.story.unarchive.mutationOptions({
			onSuccess: () => {
				void queryClient.invalidateQueries({
					queryKey: storyApi.story.listVersions.queryKey({ chatId, storySlug }),
				});
				void queryClient.invalidateQueries({
					queryKey: storyApi.story.getCustomVersion.queryKey({ chatId, storySlug }),
				});
				void queryClient.invalidateQueries({ queryKey: storyApi.story.listAll.queryKey() });
				void queryClient.invalidateQueries({ queryKey: storyApi.story.listArchived.queryKey() });
			},
		}),
	);

	return (
		<div className={styles.archivedBannerDiv}>
			<span className={styles.archivedBannerSpan}>This story has been archived.</span>
			<Button
				variant='outline'
				size='sm'
				className={styles.archivedBannerButton}
				onClick={() => unarchiveMutation.mutate({ chatId, storySlug })}
				disabled={unarchiveMutation.isPending}
			>
				<ArchiveRestoreIcon className={styles.archivedBannerArchiveRestoreIcon} />
				<span>Unarchive</span>
			</Button>
		</div>
	);
}
