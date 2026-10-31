import { ChevronRight, Folder, FolderLock, Globe, Home, Lock } from 'lucide-react';

import type { FolderItem } from '@/lib/stories-page';
import { cn } from '@/lib/utils';
import styles from './stories-folder-tree-select.module.css';

export type FolderTreeSelectProps = {
	tree: FolderItem[];
	selectedId: string | null;
	onSelect: (id: string | null) => void;
	isDisabled?: (folder: FolderItem) => boolean;
};

export function FolderTreeSelect({ tree, selectedId, onSelect, isDisabled }: FolderTreeSelectProps) {
	const rootSelected = selectedId === null;

	return (
		<div className={styles.folderTreeSelectDiv}>
			<FolderTreeItem
				label='Root'
				icon={<Home className={styles.folderTreeSelectHome} />}
				visibility='public'
				selected={rootSelected}
				disabled={false}
				depth={0}
				onSelect={() => onSelect(null)}
			/>
			{tree
				.filter((f) => f.parentId === null && f.id !== '__shared_with_me__')
				.map((f) => (
					<FolderTreeNode
						key={f.id}
						folder={f}
						allFolders={tree}
						selectedId={selectedId}
						depth={1}
						onSelect={onSelect}
						isDisabled={isDisabled}
					/>
				))}
		</div>
	);
}

export function getTargetVisibility(folderId: string | null, tree: FolderItem[]): string {
	if (folderId === null) {
		return 'public';
	}
	return tree.find((f) => f.id === folderId)?.visibility ?? 'public';
}

function FolderTreeNode({
	folder,
	allFolders,
	selectedId,
	depth,
	onSelect,
	isDisabled,
}: {
	folder: FolderItem;
	allFolders: FolderItem[];
	selectedId: string | null;
	depth: number;
	onSelect: (id: string | null) => void;
	isDisabled?: (folder: FolderItem) => boolean;
}) {
	const children = allFolders.filter((f) => f.parentId === folder.id);
	const disabled = isDisabled ? isDisabled(folder) : false;

	return (
		<>
			<FolderTreeItem
				label={folder.name}
				icon={
					folder.visibility === 'private' ? (
						<FolderLock className={styles.folderTreeSelectHome} />
					) : (
						<Folder className={styles.folderTreeSelectHome} />
					)
				}
				visibility={folder.visibility ?? 'public'}
				selected={selectedId === folder.id}
				disabled={disabled}
				depth={depth}
				onSelect={() => onSelect(folder.id)}
			/>
			{children.map((child) => (
				<FolderTreeNode
					key={child.id}
					folder={child}
					allFolders={allFolders}
					selectedId={selectedId}
					depth={depth + 1}
					onSelect={onSelect}
					isDisabled={isDisabled}
				/>
			))}
		</>
	);
}

function FolderTreeItem({
	label,
	icon,
	visibility,
	selected,
	disabled,
	depth,
	onSelect,
}: {
	label: string;
	icon: React.ReactNode;
	visibility: string;
	selected: boolean;
	disabled: boolean;
	depth: number;
	onSelect: () => void;
}) {
	return (
		<button
			type='button'
			disabled={disabled}
			onClick={onSelect}
			style={{ paddingLeft: `${Math.max(0, depth - 1) * 16 + 8}px` }}
			className={cn(
				styles.folderTreeItemButton,
				selected && styles.folderTreeItemButton2,
				!selected && !disabled && styles.folderTreeItemButton3,
				disabled && styles.folderTreeItemButton4,
			)}
		>
			{depth > 1 && <ChevronRight className={styles.folderTreeItemChevronRight} />}
			<span className={styles.folderTreeItemSpan}>{icon}</span>
			<span className={styles.folderTreeItemSpan2}>{label}</span>
			{visibility === 'private' ? (
				<Lock className={styles.folderTreeItemLock} />
			) : (
				<Globe className={styles.folderTreeItemGlobe} />
			)}
		</button>
	);
}
