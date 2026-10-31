import { useDndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Link } from '@tanstack/react-router';
import {
	Archive,
	ArchiveRestore,
	Circle,
	CircleCheck,
	Folder,
	FolderInput,
	FolderLock,
	Lock,
	MoreHorizontal,
	Pencil,
	Star,
	Trash2,
} from 'lucide-react';
import type { DragEvent, MouseEvent } from 'react';
import type { StoryPanelDisplayMode } from '@quarry/shared/types';
import type { FolderItem } from '@/lib/stories-page';
import { isSystemFolder } from '@/lib/stories-page';
import { GRID_CARD_CLASS, GridCardFooter, LINES_CARD_CLASS } from '@/components/item-card';
import { FolderThumbnail } from '@/components/story-thumbnail';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { useToggleFavorite } from '@/hooks/use-toggle-favorite';
import { useActiveStoryTheme } from '@/hooks/use-active-story-theme';
import { usePermissions } from '@/hooks/use-permissions';
import { useSession } from '@/lib/auth-client';
import { hasAnyStoryReference, setStoryDragData } from '@/lib/story-reference';
import { formatRelativeDate } from '@/lib/time-ago';
import { selectedStoryReferencesStore } from '@/stores/story-references';
import { cn } from '@/lib/utils';
import styles from './stories-folder-card.module.css';

export type FolderDisplayMode = StoryPanelDisplayMode | 'grid-large';

export function FolderCard({
	folder,
	displayMode,
	currentUserName,
	onModify,
	onMove,
	onDelete,
	onArchive,
	onRestore,
	selected = false,
	selectionActive = false,
	onToggleSelect,
}: {
	folder: FolderItem;
	displayMode: FolderDisplayMode;
	currentUserName: string;
	onModify: (folder: FolderItem) => void;
	onMove: (folder: FolderItem) => void;
	onDelete: (folder: FolderItem) => void;
	onArchive: (folder: FolderItem) => void;
	onRestore: (folder: FolderItem) => void;
	selected?: boolean;
	selectionActive?: boolean;
	onToggleSelect?: (folderId: string) => void;
}) {
	const { isViewer, isAdmin } = usePermissions();
	const { data: session } = useSession();
	const isFolderFavorited = useToggleFavorite('folder').isFavorited(folder.id);
	const storyTheme = useActiveStoryTheme();
	const canManage = isAdmin || folder.ownerId === session?.user?.id;
	const isVirtual = folder.id === '__shared_with_me__';
	const draggableId = `drag-folder-${displayMode}-${folder.id}`;
	const droppableId = `drop-folder-${displayMode}-${folder.id}`;

	const { active } = useDndContext();
	const activeData = active?.data.current as { type?: string; isOwnedByUser?: boolean } | undefined;
	const blockPrivateDrop =
		folder.visibility === 'private' && activeData?.type === 'story' && activeData?.isOwnedByUser === false;

	const {
		attributes,
		listeners,
		setNodeRef: setDragRef,
		transform,
		isDragging,
	} = useDraggable({
		id: draggableId,
		disabled: isVirtual || isSystemFolder(folder) || isViewer || !canManage || (selectionActive && !selected),
	});
	const { setNodeRef: setDropRef, isOver } = useDroppable({
		id: droppableId,
		disabled: isVirtual || blockPrivateDrop,
	});

	function setRefs(el: HTMLElement | null) {
		setDragRef(el);
		setDropRef(el);
	}

	const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
	const canSelect = !isViewer && !isSystemFolder(folder);

	function handleToggleSelect(e: MouseEvent<HTMLElement>) {
		e.preventDefault();
		e.stopPropagation();
		if (canSelect && onToggleSelect) {
			onToggleSelect(folder.id);
		}
	}

	function handleNativeDragStart(e: DragEvent<HTMLDivElement>) {
		if (folder.archivedAt) {
			e.preventDefault();
			return;
		}
		const selection = selectedStoryReferencesStore.getSnapshot();
		setStoryDragData(
			e,
			selected && hasAnyStoryReference(selection) ? selection : { storyIds: [], folderIds: [folder.id] },
		);
	}

	function handleLinkClick(e: MouseEvent<HTMLElement>) {
		if (selectionActive && canSelect) {
			handleToggleSelect(e);
			return;
		}
		e.stopPropagation();
	}

	if (displayMode === 'lines') {
		return (
			<div
				ref={setRefs}
				style={style}
				{...attributes}
				{...listeners}
				onDragStart={handleNativeDragStart}
				className={cn(
					LINES_CARD_CLASS,
					styles.folderCardDiv,
					isOver && styles.folderCardDiv2,
					isDragging && styles.folderCardDiv3,
					selected && styles.folderCardDiv4,
				)}
				onClick={selectionActive && canSelect ? handleToggleSelect : undefined}
			>
				<div className={styles.folderCardDiv5}>
					{canSelect && (
						<div className={styles.folderCardDiv6} onPointerDown={(e) => e.stopPropagation()}>
							<FolderCheckbox
								selected={selected}
								visible={selected || selectionActive}
								onClick={handleToggleSelect}
							/>
						</div>
					)}
					<Link
						to='/stories'
						search={{ folderId: folder.id }}
						className={styles.folderCardLink}
						onClick={handleLinkClick}
					>
						<div className={styles.folderCardDiv7}>
							<FolderIcon folder={folder} />
							<span className={styles.folderCardSpan}>{folder.name}</span>
							<FolderStoryCount count={folder.storyCount} />
						</div>
						<div className={styles.folderCardDiv8}>
							{currentUserName}
						</div>
						<div className={styles.folderCardDiv9} />
						<div className={styles.folderCardDiv10}>
							{formatRelativeDate(folder.updatedAt)}
						</div>
					</Link>
				</div>
				<div className={styles.folderCardDiv11}>
					{!selectionActive && !isSystemFolder(folder) && (
						<>
							{!isViewer && (
								<div className={styles.folderCardDiv12}>
									<FolderKebab
										folder={folder}
										canManage={canManage}
										onModify={onModify}
										onMove={onMove}
										onDelete={onDelete}
										onArchive={onArchive}
										onRestore={onRestore}
									/>
								</div>
							)}
							<div
								className={cn(
									styles.folderCardDiv13,
									!isViewer &&
										canManage &&
										styles.folderCardDiv14,
								)}
								onPointerDown={(e) => e.stopPropagation()}
							>
								<FolderFavoriteButton folder={folder} />
							</div>
						</>
					)}
				</div>
			</div>
		);
	}

	if (displayMode === 'grid-large') {
		return (
			<div
				ref={setRefs}
				style={style}
				{...attributes}
				{...listeners}
				onDragStart={handleNativeDragStart}
				className={cn(
					GRID_CARD_CLASS,
					isOver && styles.folderCardDiv15,
					isDragging && styles.folderCardDiv3,
					selected && styles.folderCardDiv16,
				)}
				onClick={selectionActive && canSelect ? handleToggleSelect : undefined}
			>
				<div className={styles.folderCardDiv17}>
					<FolderThumbnail theme={storyTheme} />
				</div>

				<Link
					to='/stories'
					search={{ folderId: folder.id }}
					className={styles.folderCardLink2}
					onClick={handleLinkClick}
					aria-label={folder.name}
				>
					<div className={styles.folderCardDiv18}>
						<GridCardFooter
							title={folder.name}
							subtitle={`${folder.storyCount} ${folder.storyCount <= 1 ? 'story' : 'stories'}`}
						/>
						<div className={styles.folderCardDiv19}>
							{folder.visibility === 'private' && (
								<SimpleTooltip content='Private folder'>
									<span className={styles.folderCardSpan2}>
										<Lock className={styles.folderCardLock} />
									</span>
								</SimpleTooltip>
							)}
						</div>
					</div>
				</Link>

				{!isSystemFolder(folder) && (
					<>
						<div className={styles.folderCardDiv20} onPointerDown={(e) => e.stopPropagation()}>
							{canSelect && (
								<FolderCheckbox
									selected={selected}
									visible={selected || selectionActive}
									onClick={handleToggleSelect}
								/>
							)}
							{!selectionActive && <FolderFavoriteButton folder={folder} />}
						</div>
						{!isViewer && !selectionActive && (
							<div
								className={styles.folderCardDiv21}
								onPointerDown={(e) => e.stopPropagation()}
							>
								<FolderKebab
									folder={folder}
									canManage={canManage}
									onModify={onModify}
									onMove={onMove}
									onDelete={onDelete}
									onArchive={onArchive}
									onRestore={onRestore}
								/>
							</div>
						)}
					</>
				)}
			</div>
		);
	}

	const contentLeftPadding = !canSelect ? styles.contentLeftPadding : selected || selectionActive ? styles.contentLeftPadding2 : styles.contentLeftPadding3;
	const contentRightPadding =
		selectionActive || isSystemFolder(folder)
			? styles.contentRightPadding2
			: cn(isFolderFavorited ? styles.contentRightPadding : styles.contentRightPadding2, styles.contentRightPadding3);

	return (
		<div
			ref={setRefs}
			style={style}
			{...attributes}
			{...listeners}
			onDragStart={handleNativeDragStart}
			className={cn(
				`${styles.folderCardDiv22} group`,
				isOver && styles.folderCardDiv15,
				isDragging && styles.folderCardDiv3,
				selected && styles.folderCardDiv16,
			)}
			onClick={selectionActive && canSelect ? handleToggleSelect : undefined}
		>
			{selectionActive ? (
				<div
					className={cn(
						styles.folderCardDiv23,
						contentLeftPadding,
						contentRightPadding,
					)}
				>
					<FolderCardLabel folder={folder} />
				</div>
			) : (
				<Link
					to='/stories'
					search={{ folderId: folder.id }}
					className={cn(
						styles.folderCardDiv23,
						contentLeftPadding,
						contentRightPadding,
					)}
					onClick={handleLinkClick}
				>
					<FolderCardLabel folder={folder} />
				</Link>
			)}
			{!isSystemFolder(folder) && (
				<>
					{canSelect && (
						<div
							className={styles.folderCardDiv24}
							onPointerDown={(e) => e.stopPropagation()}
						>
							<FolderCheckbox
								selected={selected}
								visible={selected || selectionActive}
								onClick={handleToggleSelect}
							/>
						</div>
					)}
					{!selectionActive && (
						<>
							{!isViewer && (
								<div className={styles.folderCardDiv25}>
									<FolderKebab
										folder={folder}
										canManage={canManage}
										onModify={onModify}
										onMove={onMove}
										onDelete={onDelete}
										onArchive={onArchive}
										onRestore={onRestore}
									/>
								</div>
							)}
							<div
								className={cn(
									styles.folderCardDiv26,
									!isViewer &&
										styles.folderCardDiv14,
								)}
								onPointerDown={(e) => e.stopPropagation()}
							>
								<FolderFavoriteButton folder={folder} />
							</div>
						</>
					)}
				</>
			)}
		</div>
	);
}

function FolderCheckbox({
	selected,
	visible,
	onClick,
}: {
	selected: boolean;
	visible: boolean;
	onClick: (e: MouseEvent<HTMLElement>) => void;
}) {
	return (
		<button
			type='button'
			aria-label={selected ? 'Deselect folder' : 'Select folder'}
			aria-pressed={selected}
			onClick={onClick}
			className={cn(
				styles.folderCheckboxButton,
				styles.folderCheckboxButton2,
				visible ? styles.folderCheckboxButton3 : styles.folderCheckboxButton4,
				selected && styles.folderCheckboxButton5,
			)}
		>
			{selected ? <CircleCheck className={styles.folderCardLock} /> : <Circle className={styles.folderCardLock} />}
		</button>
	);
}

function FolderFavoriteButton({ folder }: { folder: FolderItem }) {
	const favorite = useToggleFavorite('folder');
	const isFavorited = favorite.isFavorited(folder.id);
	const tooltip = isFavorited ? 'Remove from favorites' : 'Add to favorites';

	function handleClick(e: MouseEvent<HTMLButtonElement>) {
		e.preventDefault();
		e.stopPropagation();
		favorite.toggle(folder.id);
	}

	return (
		<SimpleTooltip content={tooltip}>
			<button
				type='button'
				aria-label={tooltip}
				aria-pressed={isFavorited}
				onClick={handleClick}
				disabled={favorite.isPending}
				className={cn(
					styles.folderFavoriteButtonButton,
					isFavorited
						? styles.folderFavoriteButtonButton2
						: styles.folderFavoriteButtonButton3,
				)}
			>
				<Star className={styles.folderCardLock} />
			</button>
		</SimpleTooltip>
	);
}

function FolderCardLabel({ folder }: { folder: FolderItem }) {
	return (
		<>
			<FolderIcon folder={folder} />
			<span className={styles.folderCardLabelSpan}>{folder.name}</span>
			<FolderStoryCount count={folder.storyCount} />
		</>
	);
}

function FolderStoryCount({ count }: { count: number }) {
	return (
		<span className={styles.folderStoryCountSpan}>
			<span aria-hidden='true'>{count}</span>
			<span className='sr-only'>{`${count} ${count === 1 ? 'story' : 'stories'}`}</span>
		</span>
	);
}

function FolderIcon({ folder }: { folder: FolderItem }) {
	if (folder.systemType === 'shared_with_me' || folder.visibility === 'private') {
		return <FolderLock className={styles.folderIconFolderLock} />;
	}
	return <Folder className={styles.folderIconFolderLock} />;
}

function FolderKebab({
	folder,
	canManage,
	onModify,
	onMove,
	onDelete,
	onArchive,
	onRestore,
}: {
	folder: FolderItem;
	canManage: boolean;
	onModify: (folder: FolderItem) => void;
	onMove: (folder: FolderItem) => void;
	onDelete: (folder: FolderItem) => void;
	onArchive: (folder: FolderItem) => void;
	onRestore: (folder: FolderItem) => void;
}) {
	const isArchived = folder.archivedAt !== null;

	if (!canManage) {
		return null;
	}

	function stop(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type='button'
					onPointerDown={(e) => e.stopPropagation()}
					onClick={stop}
					aria-label='Folder options'
					className={styles.folderKebabButton}
				>
					<MoreHorizontal className={styles.folderCardLock} />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end' onClick={stop}>
				{isArchived ? (
					<DropdownMenuItem onClick={() => onRestore(folder)}>
						<ArchiveRestore />
						Restore folder
					</DropdownMenuItem>
				) : (
					<>
						<DropdownMenuItem onClick={() => onModify(folder)}>
							<Pencil />
							Modify
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => onMove(folder)}>
							<FolderInput />
							Move to…
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => onArchive(folder)}>
							<Archive />
							Archive
						</DropdownMenuItem>
						<DropdownMenuItem variant='destructive' onClick={() => onDelete(folder)}>
							<Trash2 />
							Delete
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
