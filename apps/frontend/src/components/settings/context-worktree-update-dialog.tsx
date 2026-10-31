import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import styles from './context-worktree-update-dialog.module.css';

export const DIRTY_WORKTREE_CONFLICT_MESSAGE = 'Commit or discard changes before switching branches.';

interface ContextWorktreeUpdateDialogProps {
	open: boolean;
	branch: string;
	isPending: boolean;
	isBlocked?: boolean;
	error?: string;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void | Promise<void>;
	onBlockedAction?: () => void | Promise<void>;
}

export function ContextWorktreeUpdateDialog({
	open,
	branch,
	isPending,
	isBlocked = false,
	error,
	onOpenChange,
	onConfirm,
	onBlockedAction,
}: ContextWorktreeUpdateDialogProps) {
	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen && isPending) {
			return;
		}
		onOpenChange(nextOpen);
	};

	const handleBlockedAction = async () => {
		onOpenChange(false);
		await onBlockedAction?.();
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Update File Explorer?</DialogTitle>
				</DialogHeader>
				<DialogDescription className={styles.contextWorktreeUpdateDialogDialogDescription}>
					{`This will switch File Explorer to ${branch} and load the latest live context. Your branches and commits stay unchanged.`}
				</DialogDescription>
				{isBlocked ? (
					<p className={styles.contextWorktreeUpdateDialogP}>
						File Explorer has uncommitted changes. Commit or discard them before updating.
					</p>
				) : (
					error && <p className={styles.contextWorktreeUpdateDialogP2}>{error}</p>
				)}
				<div className={styles.contextWorktreeUpdateDialogDiv}>
					{isBlocked ? (
						<Button
							variant='primary-gradient'
							className={styles.contextWorktreeUpdateDialogButton}
							onClick={() => void handleBlockedAction()}
						>
							Finish your changes
						</Button>
					) : (
						<>
							<Button
								variant='outline'
								className={styles.contextWorktreeUpdateDialogButton2}
								disabled={isPending}
								onClick={() => handleOpenChange(false)}
							>
								Cancel
							</Button>
							<Button
								variant='primary-gradient'
								className={styles.contextWorktreeUpdateDialogButton}
								disabled={isPending}
								isLoading={isPending}
								onClick={onConfirm}
							>
								Update File Explorer
							</Button>
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

export function isDirtyWorktreeConflict(error: unknown): boolean {
	return error instanceof Error && error.message === DIRTY_WORKTREE_CONFLICT_MESSAGE;
}
