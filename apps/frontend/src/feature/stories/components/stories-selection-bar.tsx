import { BULK_ITEMS_LIMIT } from '@quarry/shared';
import { ArchiveIcon, ArchiveRestoreIcon, FolderInput, MessageSquarePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useContentCenteredStyle } from '@/hooks/use-sidebar-content-offset';
import { cn } from '@/lib/utils';
import styles from './stories-selection-bar.module.css';

export function StoriesSelectionBar({
	selectedCount,
	limitReached = false,
	showArchived,
	isPending,
	canMove,
	onArchive,
	onUnarchive,
	onMove,
	onStartChat,
	onCancel,
}: {
	selectedCount: number;
	limitReached?: boolean;
	showArchived: boolean;
	isPending: boolean;
	canMove: boolean;
	onArchive: () => void;
	onUnarchive: () => void;
	onMove: () => void;
	onStartChat: () => void;
	onCancel: () => void;
}) {
	const centeredStyle = useContentCenteredStyle();

	if (selectedCount === 0) {
		return null;
	}

	return (
		<div
			style={centeredStyle}
			className={cn(
				styles.storiesSelectionBarDiv,
				styles.storiesSelectionBarDiv2,
				styles.storiesSelectionBarDiv3,
			)}
		>
			<span className={styles.storiesSelectionBarSpan}>{selectedCount} selected</span>
			{limitReached && (
				<span className={styles.storiesSelectionBarSpan2}>
					Please select max {BULK_ITEMS_LIMIT} stories and {BULK_ITEMS_LIMIT} folders
				</span>
			)}
			<div className={styles.storiesSelectionBarDiv4} />
			{showArchived ? (
				<Button
					size='sm'
					variant='ghost'
					onClick={onUnarchive}
					disabled={isPending}
					className={styles.storiesSelectionBarButton}
				>
					<ArchiveRestoreIcon className={styles.storiesSelectionBarArchiveRestoreIcon} />
					Restore
				</Button>
			) : (
				<>
					<Button
						size='sm'
						variant='ghost'
						onClick={onStartChat}
						disabled={isPending}
						className={styles.storiesSelectionBarButton}
					>
						<MessageSquarePlus className={styles.storiesSelectionBarArchiveRestoreIcon} />
						New chat
					</Button>
					<Button
						size='sm'
						variant='ghost'
						onClick={onMove}
						disabled={isPending || !canMove}
						className={styles.storiesSelectionBarButton}
					>
						<FolderInput className={styles.storiesSelectionBarArchiveRestoreIcon} />
						Move
					</Button>
					<Button
						size='sm'
						variant='ghost'
						onClick={onArchive}
						disabled={isPending}
						className={styles.storiesSelectionBarButton}
					>
						<ArchiveIcon className={styles.storiesSelectionBarArchiveRestoreIcon} />
						Archive
					</Button>
				</>
			)}
			<Button
				size='icon-xs'
				variant='ghost'
				onClick={onCancel}
				disabled={isPending}
				aria-label='Cancel selection'
				className={styles.storiesSelectionBarButton2}
			>
				<X className={styles.storiesSelectionBarArchiveRestoreIcon} />
			</Button>
		</div>
	);
}
