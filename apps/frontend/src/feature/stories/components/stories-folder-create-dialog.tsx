import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Folder, FolderLock, Globe, Lock } from 'lucide-react';

import type { FolderItem } from '@/lib/stories-page';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FolderTreeSelect, getTargetVisibility } from './stories-folder-tree-select';
import { storyApi } from '@/lib/story-api';
import styles from './stories-folder-create-dialog.module.css';

type Mode = 'create' | 'modify';

export function FolderCreateDialog({
	open,
	onOpenChange,
	mode,
	initialName,
	folderId,
	parentId,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: Mode;
	initialName?: string;
	folderId?: string;
	parentId?: string | null;
}) {
	const [name, setName] = useState(initialName ?? '');
	const [selectedParentId, setSelectedParentId] = useState<string | null>(parentId ?? null);
	const inputRef = useRef<HTMLInputElement>(null);
	const queryClient = useQueryClient();

	const { data: tree = [] } = useQuery(storyApi.storyFolder.listTree.queryOptions());

	const effectiveParentVisibility = getTargetVisibility(selectedParentId, tree);
	const willBePrivate = effectiveParentVisibility === 'private';

	useEffect(() => {
		if (open) {
			setName(initialName ?? '');
			setSelectedParentId(parentId ?? null);
			setTimeout(() => inputRef.current?.focus(), 50);
		}
	}, [open, initialName, parentId]);

	const createMutation = useMutation(
		storyApi.storyFolder.create.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: storyApi.storyFolder.listTree.queryKey() });
				onOpenChange(false);
			},
		}),
	);

	const renameMutation = useMutation(
		storyApi.storyFolder.rename.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: storyApi.storyFolder.listTree.queryKey() });
				onOpenChange(false);
			},
		}),
	);

	const isPending = createMutation.isPending || renameMutation.isPending;
	const trimmed = name.trim();

	function handleSubmit() {
		if (!trimmed) {
			return;
		}
		if (mode === 'create') {
			createMutation.mutate({ name: trimmed, parentId: selectedParentId });
		} else if (folderId) {
			renameMutation.mutate({ id: folderId, name: trimmed });
		}
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
			handleSubmit();
		}
	}

	const FolderIconComponent = willBePrivate ? FolderLock : Folder;

	function isDisabledForCreate(folder: FolderItem): boolean {
		return folder.systemType === 'shared_with_me';
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className={styles.folderCreateDialogDialogContent}>
				<DialogHeader>
					<DialogTitle>{mode === 'create' ? 'New folder' : 'Rename folder'}</DialogTitle>
				</DialogHeader>

				{mode === 'create' && (
					<FolderTreeSelect
						tree={tree}
						selectedId={selectedParentId}
						onSelect={setSelectedParentId}
						isDisabled={isDisabledForCreate}
					/>
				)}

				<div className={styles.folderCreateDialogDiv}>
					<FolderIconComponent className={styles.folderCreateDialogFolderIconComponent} />
					<input
						ref={inputRef}
						type='text'
						value={name}
						onChange={(e) => setName(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder='Folder name'
						maxLength={100}
						className={styles.folderCreateDialogInput}
					/>
				</div>
				{mode === 'create' && (
					<p className={styles.folderCreateDialogP}>
						{willBePrivate ? (
							<>
								<Lock className={styles.folderCreateDialogLock} />
								This folder will be <strong>private</strong>
							</>
						) : (
							<>
								<Globe className={styles.folderCreateDialogLock} />
								This folder will be <strong>public</strong>
							</>
						)}
					</p>
				)}
				<DialogFooter>
					<Button
						variant='ghost'
						className={styles.folderCreateDialogButton}
						onClick={() => onOpenChange(false)}
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button
						variant='primary-gradient'
						className={styles.folderCreateDialogButton2}
						onClick={handleSubmit}
						disabled={!trimmed || isPending}
					>
						{mode === 'create' ? 'Create' : 'Save'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
