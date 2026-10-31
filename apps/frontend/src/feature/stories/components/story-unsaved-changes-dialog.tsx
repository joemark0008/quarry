import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import styles from './story-unsaved-changes-dialog.module.css';

export interface StoryUnsavedChangesDialogProps {
	open: boolean;
	canSave: boolean;
	isSaving: boolean;
	saveFailed: boolean;
	onKeepEditing: () => void;
	onSaveAndContinue: () => void;
	onLeaveWithoutSaving: () => void;
}

export function StoryUnsavedChangesDialog({
	open,
	canSave,
	isSaving,
	saveFailed,
	onKeepEditing,
	onSaveAndContinue,
	onLeaveWithoutSaving,
}: StoryUnsavedChangesDialogProps) {
	return (
		<AlertDialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen && !isSaving) {
					onKeepEditing();
				}
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Save Story changes?</AlertDialogTitle>
					<AlertDialogDescription>
						You have unsaved changes. Save them before continuing, or leave without saving.
					</AlertDialogDescription>
					{saveFailed && (
						<p className={styles.storyUnsavedChangesDialogP}>Could not save your changes. Please try again.</p>
					)}
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isSaving}>Keep editing</AlertDialogCancel>
					<AlertDialogAction
						variant='destructive'
						disabled={isSaving}
						onClick={(event) => {
							event.preventDefault();
							onLeaveWithoutSaving();
						}}
					>
						Leave without saving
					</AlertDialogAction>
					<Button onClick={onSaveAndContinue} disabled={!canSave || isSaving} isLoading={isSaving}>
						Save and continue
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
