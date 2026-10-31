import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useRouterState } from '@tanstack/react-router';
import {
	ArchiveIcon,
	ArchiveRestoreIcon,
	Circle,
	CircleCheck,
	FolderInput,
	Pin,
	ShieldCheck,
	Star,
} from 'lucide-react';
import { useState } from 'react';
import type { DragEvent, MouseEvent, ReactNode } from 'react';
import type { StoryPanelDisplayMode } from '@quarry/shared/types';

import type { StoryItem } from '@/lib/stories-page';
import { invalidateStoryArchiveCaches } from '@/lib/stories-cache';
import {
	AuthorDateLabel,
	CertifiedBadge,
	GRID_CARD_CLASS,
	GRID_HOVER_ACTION_GRADIENT_CLASS,
	GRID_THUMBNAIL_CLASS,
	GridCardFooter,
	LINES_CARD_CLASS,
	LiveBadge,
	PrivateBadge,
	SharingBadge,
} from '@/components/item-card';
import { ShareStoryDialog } from '@/components/share-dialog.story';
import { CustomStoryThumbnail } from '@/components/custom-story-thumbnail';
import { StoryThumbnail } from '@/components/story-thumbnail';
import StoryIcon from '@/components/ui/story-icon';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { useToggleFavorite } from '@/hooks/use-toggle-favorite';
import { useToggleStoryCertification } from '@/hooks/use-toggle-story-certification';
import { useActiveStoryTheme } from '@/hooks/use-active-story-theme';
import { useChatActivity } from '@/hooks/use-chat-activity';
import { usePermissions } from '@/hooks/use-permissions';
import { hasAnyStoryReference, setStoryDragData } from '@/lib/story-reference';
import { selectedStoryReferencesStore } from '@/stores/story-references';
import { formatRelativeDate } from '@/lib/time-ago';
import { cn } from '@/lib/utils';
import { storyApi } from '@/lib/story-api';
import styles from './stories-groups.module.css';

const VIEW_COUNT_FORMAT = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });

export function StoriesNoResults({ query }: { query: string }) {
	return (
		<p className={styles.storiesNoResultsP}>
			{query.trim() ? <>No stories matching &ldquo;{query.trim()}&rdquo;</> : 'No stories match these filters'}
		</p>
	);
}

export function CertifiedStoriesEmptyState() {
	const { isAdmin } = usePermissions();
	return (
		<div className={styles.certifiedStoriesEmptyStateDiv}>
			<ShieldCheck className={styles.certifiedStoriesEmptyStateShieldCheck} />
			<p className={styles.certifiedStoriesEmptyStateP}>No certified stories yet.</p>
			<p className={styles.certifiedStoriesEmptyStateP2}>
				{isAdmin
					? 'Certify a story from its card to highlight it as a trusted source.'
					: 'Admins can certify stories to mark them as trusted sources.'}
			</p>
		</div>
	);
}

export function StoriesEmptyState() {
	const { isViewer } = usePermissions();
	return (
		<div className={styles.certifiedStoriesEmptyStateDiv}>
			<StoryIcon className={styles.certifiedStoriesEmptyStateShieldCheck} />
			<p className={styles.certifiedStoriesEmptyStateP}>No stories yet.</p>
			<p className={styles.certifiedStoriesEmptyStateP2}>
				{isViewer
					? 'Wait for someone to share a story with you.'
					: 'Stories will appear here as they are created in your chats.'}
			</p>
		</div>
	);
}

export function StoryCard({
	item,
	displayMode,
	showArchived,
	onMoveToFolder,
	dragIdPrefix,
	selected = false,
	selectionActive = false,
	onToggleSelect,
}: {
	item: StoryItem;
	displayMode: StoryPanelDisplayMode;
	showArchived: boolean;
	onMoveToFolder?: (item: StoryItem) => void;
	dragIdPrefix?: string;
	selected?: boolean;
	selectionActive?: boolean;
	onToggleSelect?: (storyId: string) => void;
}) {
	const { role, isAdmin, isViewer } = usePermissions();
	const [pinShareDialogOpen, setPinShareDialogOpen] = useState(false);
	const isHomePage = useRouterState({ select: (s) => s.location.pathname === '/' });
	const storyTheme = useActiveStoryTheme();
	const { running: isAgentEditingStory } = useChatActivity(item.chatId ?? '');

	const draggableId = `drag-story-${dragIdPrefix ? `${dragIdPrefix}-` : ''}${item.storyId}`;
	const isOwnedByUser = item.kind === 'own' || item.kind === 'own-standalone';
	const canMove = (isOwnedByUser || isAdmin) && !isAgentEditingStory;
	const isMoveDragDisabled = isViewer || !canMove || (selectionActive && !selected);
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
		id: draggableId,
		disabled: isMoveDragDisabled,
		data: { type: 'story', isOwnedByUser },
	});
	const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
	const moveHandler = canMove ? onMoveToFolder : undefined;

	const canOpenPinShareDialog = isAdmin && !item.isShared && item.kind === 'own' && !!item.chatId && !!item.storySlug;

	const canSelect =
		!!role &&
		!isViewer &&
		!isHomePage &&
		((item.kind === 'own' && !!item.chatId && !!item.storySlug) ||
			item.kind === 'own-standalone' ||
			item.kind === 'shared-project');

	function handleCardClick(e: MouseEvent<HTMLDivElement>) {
		if (!canSelect || !onToggleSelect) {
			return;
		}
		if (e.metaKey || e.ctrlKey || selectionActive) {
			e.preventDefault();
			onToggleSelect(item.storyId);
		}
	}

	function handleCheckboxClick(e: MouseEvent<HTMLButtonElement>) {
		e.preventDefault();
		e.stopPropagation();
		if (canSelect && onToggleSelect) {
			onToggleSelect(item.storyId);
		}
	}

	function handleNativeDragStart(e: DragEvent<HTMLDivElement>) {
		if (showArchived) {
			e.preventDefault();
			return;
		}
		const selection = selectedStoryReferencesStore.getSnapshot();
		setStoryDragData(
			e,
			selected && hasAnyStoryReference(selection) ? selection : { storyIds: [item.storyId], folderIds: [] },
		);
	}

	function handleLinkClick(e: MouseEvent<HTMLAnchorElement>) {
		if (canSelect && onToggleSelect && (e.metaKey || e.ctrlKey || selectionActive)) {
			e.preventDefault();
			e.stopPropagation();
			onToggleSelect(item.storyId);
			return;
		}
		e.stopPropagation();
	}

	if (displayMode === 'grid') {
		const certifiedBadge = item.isCertified && (
			<div className={styles.certifiedBadgeDiv}>
				<CertifiedBadge certifiedByName={item.certifiedByName} />
			</div>
		);
		const hasPersistentTopIcons = item.isCertified || (!selectionActive && (item.isPinned || item.isFavorited));

		return (
			<>
				<div
					ref={setNodeRef}
					style={style}
					{...attributes}
					{...listeners}
					className={cn(GRID_CARD_CLASS, isDragging && styles.storyCardDiv, selected && styles.storyCardDiv2)}
					onClick={handleCardClick}
					draggable={selectionActive && isMoveDragDisabled}
					onDragStart={handleNativeDragStart}
				>
					<div className={GRID_THUMBNAIL_CLASS}>
						{item.format === 'custom' ? (
							<CustomStoryThumbnail
								storyId={item.storyId}
								version={item.version}
								summary={item.summary}
								theme={storyTheme}
								queryData={item.kpiPreviewData}
							/>
						) : (
							<StoryThumbnail summary={item.summary} theme={storyTheme} queryData={item.kpiPreviewData} />
						)}
					</div>
					<div className={cn(GRID_HOVER_ACTION_GRADIENT_CLASS, hasPersistentTopIcons && styles.storyCardDiv3)} />

					{!selectionActive && (
						<Link
							{...item.link}
							onClick={handleLinkClick}
							className={styles.storyCardLink}
						>
							{certifiedBadge}
							<div className={styles.storyCardDiv4}>
								<GridCardFooter
									title={item.title}
									subtitle={<AuthorDateLabel author={item.author} createdAt={item.createdAt} />}
								/>
								<div className={styles.storyCardDiv5}>
									<StoryBadges item={item} mode='grid' />
								</div>
							</div>
						</Link>
					)}

					{selectionActive && (
						<div className={styles.storyCardDiv6}>
							{certifiedBadge}
							<div className={styles.storyCardDiv4}>
								<GridCardFooter
									title={item.title}
									subtitle={<AuthorDateLabel author={item.author} createdAt={item.createdAt} />}
								/>
								<div className={styles.storyCardDiv5}>
									<StoryBadges item={item} mode='grid' />
								</div>
							</div>
						</div>
					)}

					<div
						className={styles.storyCardDiv7}
						onPointerDown={(e) => e.stopPropagation()}
					>
						{canSelect && (
							<StoryCheckbox
								selected={selected}
								visible={selected || selectionActive}
								onClick={handleCheckboxClick}
							/>
						)}
						{!selectionActive && (
							<>
								<StoryQuickActions item={item} onRequestPinShare={() => setPinShareDialogOpen(true)} />
								<div className={styles.storyCardDiv8}>
									{!showArchived && moveHandler && (
										<StoryMoveToFolderButton item={item} onMoveToFolder={moveHandler} />
									)}
									<StoryArchiveButton item={item} showArchived={showArchived} />
								</div>
							</>
						)}
					</div>
				</div>
				{canOpenPinShareDialog && item.chatId && item.storySlug && (
					<ShareStoryDialog
						open={pinShareDialogOpen}
						onOpenChange={setPinShareDialogOpen}
						chatId={item.chatId}
						storySlug={item.storySlug}
						intent='pin'
					/>
				)}
			</>
		);
	}

	return (
		<>
			<div
				ref={setNodeRef}
				style={style}
				{...attributes}
				{...listeners}
				className={cn(LINES_CARD_CLASS, isDragging && styles.storyCardDiv, selected && styles.storyCardDiv9)}
				onClick={handleCardClick}
				onDragStart={handleNativeDragStart}
			>
				<div className={styles.storyCardDiv10}>
					{canSelect && (
						<div className={styles.storyCardDiv5} onPointerDown={(e) => e.stopPropagation()}>
							<StoryCheckbox
								selected={selected}
								visible={selected || selectionActive}
								onClick={handleCheckboxClick}
							/>
						</div>
					)}
					<Link {...item.link} onClick={handleLinkClick} className={styles.storyCardLink2}>
						<div className={styles.storyCardDiv11}>
							<span className={styles.storyCardSpan}>{item.title}</span>
							<div className={styles.storyCardDiv12}>
								<StoryBadges item={item} mode='lines' />
							</div>
						</div>
						<div className={styles.storyCardDiv13}>
							{item.author}
						</div>
						<div className={styles.storyCardDiv14}>
							{item.viewCount === null ? '—' : VIEW_COUNT_FORMAT.format(item.viewCount)}
						</div>
						<div className={styles.storyCardDiv15}>
							{formatRelativeDate(item.createdAt)}
						</div>
					</Link>
				</div>
				<div
					className={styles.storyCardDiv16}
					onPointerDown={(e) => e.stopPropagation()}
				>
					{!selectionActive && (
						<StoryActions
							item={item}
							showArchived={showArchived}
							onRequestPinShare={() => setPinShareDialogOpen(true)}
							onMoveToFolder={moveHandler}
						/>
					)}
				</div>
			</div>
			{canOpenPinShareDialog && item.chatId && item.storySlug && (
				<ShareStoryDialog
					open={pinShareDialogOpen}
					onOpenChange={setPinShareDialogOpen}
					chatId={item.chatId}
					storySlug={item.storySlug}
					intent='pin'
				/>
			)}
		</>
	);
}

function StoryCheckbox({
	selected,
	visible,
	onClick,
}: {
	selected: boolean;
	visible: boolean;
	onClick: (e: MouseEvent<HTMLButtonElement>) => void;
}) {
	return (
		<button
			type='button'
			aria-label={selected ? 'Deselect story' : 'Select story'}
			aria-pressed={selected}
			onClick={onClick}
			className={cn(
				styles.storyCheckboxButton,
				styles.storyCheckboxButton2,
				visible ? styles.storyCheckboxButton3 : styles.storyCheckboxButton4,
				selected && styles.storyCheckboxButton5,
			)}
		>
			{selected ? <CircleCheck className={styles.storyCheckboxCircleCheck} /> : <Circle className={styles.storyCheckboxCircleCheck} />}
		</button>
	);
}

function StoryActions({
	item,
	showArchived,
	onRequestPinShare,
	onMoveToFolder,
}: {
	item: StoryItem;
	showArchived: boolean;
	onRequestPinShare: () => void;
	onMoveToFolder?: (item: StoryItem) => void;
}) {
	return (
		<div className={styles.storyActionsDiv} onPointerDown={(e) => e.stopPropagation()}>
			<StoryQuickActions item={item} onRequestPinShare={onRequestPinShare} />
			<div className={styles.storyActionsDiv2}>
				{!showArchived && onMoveToFolder && (
					<StoryMoveToFolderButton item={item} onMoveToFolder={onMoveToFolder} />
				)}
				<StoryArchiveButton item={item} showArchived={showArchived} />
			</div>
		</div>
	);
}

function StoryMoveToFolderButton({
	item,
	onMoveToFolder,
}: {
	item: StoryItem;
	onMoveToFolder: (item: StoryItem) => void;
}) {
	function handleClick(e: MouseEvent<HTMLButtonElement>) {
		e.preventDefault();
		e.stopPropagation();
		onMoveToFolder(item);
	}

	return (
		<QuickActionButton
			active={false}
			interactive
			pending={false}
			onClick={handleClick}
			tooltip='Move to folder'
			fillOnHover={false}
		>
			<FolderInput className={styles.storyCheckboxCircleCheck} />
		</QuickActionButton>
	);
}

function StoryQuickActions({ item, onRequestPinShare }: { item: StoryItem; onRequestPinShare: () => void }) {
	const queryClient = useQueryClient();
	const { isAdmin } = usePermissions();

	const favorite = useToggleFavorite('story');

	const pinMutation = useMutation(
		storyApi.storyShare.togglePin.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: storyApi.storyShare.list.queryKey() });
				queryClient.invalidateQueries({ queryKey: storyApi.story.listAll.queryKey() });
			},
		}),
	);

	const certification = useToggleStoryCertification();

	const canOpenPinShareDialog = isAdmin && !item.isShared && item.kind === 'own' && !!item.chatId && !!item.storySlug;
	const canTogglePin = isAdmin && item.isShared;
	const canInteractWithPin = canTogglePin || canOpenPinShareDialog;
	const showPinSlot = canInteractWithPin || item.isPinned;

	function handleFavorite(e: MouseEvent<HTMLButtonElement>) {
		e.preventDefault();
		e.stopPropagation();
		favorite.toggle(item.storyId);
	}

	function handleCertify(e: MouseEvent<HTMLButtonElement>) {
		e.preventDefault();
		e.stopPropagation();
		certification.toggle(item.storyId);
	}

	function handlePin(e: MouseEvent<HTMLButtonElement>) {
		e.preventDefault();
		e.stopPropagation();
		if (canTogglePin) {
			pinMutation.mutate({ storyId: item.storyId });
			return;
		}
		if (canOpenPinShareDialog) {
			onRequestPinShare();
		}
	}

	return (
		<>
			{isAdmin && (
				<QuickActionButton
					active={item.isCertified}
					interactive
					pending={certification.isPending}
					onClick={handleCertify}
					tooltip={
						item.isCertified
							? `Remove certification${item.certifiedByName ? ` (by ${item.certifiedByName})` : ''}`
							: 'Certify story'
					}
				>
					<ShieldCheck className={styles.storyCheckboxCircleCheck} />
				</QuickActionButton>
			)}
			{showPinSlot && (
				<QuickActionButton
					active={item.isPinned}
					interactive={canInteractWithPin}
					pending={pinMutation.isPending}
					onClick={handlePin}
					tooltip={
						canInteractWithPin
							? item.isPinned
								? 'Unpin for shared members'
								: 'Pin for shared members'
							: 'Only admins can un.pin stories'
					}
				>
					<Pin className={styles.storyCheckboxCircleCheck} />
				</QuickActionButton>
			)}
			<QuickActionButton
				active={item.isFavorited}
				interactive
				pending={favorite.isPending}
				onClick={handleFavorite}
				tooltip={item.isFavorited ? 'Remove from favorites' : 'Add to favorites'}
			>
				<Star className={styles.storyCheckboxCircleCheck} />
			</QuickActionButton>
		</>
	);
}

function QuickActionButton({
	active,
	interactive,
	pending,
	onClick,
	tooltip,
	fillOnHover = true,
	children,
}: {
	active: boolean;
	interactive: boolean;
	pending: boolean;
	onClick: (e: MouseEvent<HTMLButtonElement>) => void;
	tooltip: string;
	fillOnHover?: boolean;
	children: ReactNode;
}) {
	if (!interactive && !active) {
		return null;
	}

	return (
		<SimpleTooltip content={tooltip}>
			<button
				type='button'
				aria-label={tooltip}
				aria-pressed={active}
				onClick={onClick}
				disabled={pending || !interactive}
				className={cn(
					styles.quickActionButtonButton,
					active
						? styles.quickActionButtonButton2
						: styles.quickActionButtonButton3,
					interactive && active && styles.quickActionButtonButton4,
					interactive && !active && styles.quickActionButtonButton5,
					interactive && !active && fillOnHover && styles.quickActionButtonButton6,
				)}
			>
				{children}
			</button>
		</SimpleTooltip>
	);
}

function StoryArchiveButton({ item, showArchived }: { item: StoryItem; showArchived: boolean }) {
	const queryClient = useQueryClient();
	const { isViewer, isAdmin } = usePermissions();

	function invalidateAfterArchive() {
		invalidateStoryArchiveCaches(queryClient);
	}

	const archiveChatStory = useMutation(storyApi.story.archive.mutationOptions({ onSuccess: invalidateAfterArchive }));

	const unarchiveChatStory = useMutation(
		storyApi.story.unarchive.mutationOptions({ onSuccess: invalidateAfterArchive }),
	);

	const archiveStandalone = useMutation(
		storyApi.story.archiveStandalone.mutationOptions({ onSuccess: invalidateAfterArchive }),
	);

	const unarchiveStandalone = useMutation(
		storyApi.story.unarchiveStandalone.mutationOptions({ onSuccess: invalidateAfterArchive }),
	);

	const archiveShared = useMutation(
		storyApi.story.archiveShared.mutationOptions({ onSuccess: invalidateAfterArchive }),
	);

	const unarchiveShared = useMutation(
		storyApi.story.unarchiveShared.mutationOptions({ onSuccess: invalidateAfterArchive }),
	);

	const canArchive =
		(item.kind === 'own' && item.chatId && item.storySlug) ||
		item.kind === 'own-standalone' ||
		(item.kind === 'shared-project' && isAdmin);

	if (!canArchive || isViewer) {
		return null;
	}

	const pending =
		archiveChatStory.isPending ||
		unarchiveChatStory.isPending ||
		archiveStandalone.isPending ||
		unarchiveStandalone.isPending ||
		archiveShared.isPending ||
		unarchiveShared.isPending;

	function handleArchiveToggle(e: MouseEvent<HTMLButtonElement>) {
		e.preventDefault();
		e.stopPropagation();
		if (item.kind === 'own' && item.chatId && item.storySlug) {
			if (showArchived) {
				unarchiveChatStory.mutate({ chatId: item.chatId, storySlug: item.storySlug });
			} else {
				archiveChatStory.mutate({ chatId: item.chatId, storySlug: item.storySlug });
			}
			return;
		}
		if (item.kind === 'own-standalone') {
			if (showArchived) {
				unarchiveStandalone.mutate({ storyId: item.storyId });
			} else {
				archiveStandalone.mutate({ storyId: item.storyId });
			}
			return;
		}
		if (item.kind === 'shared-project') {
			if (showArchived) {
				unarchiveShared.mutate({ storyId: item.storyId });
			} else {
				archiveShared.mutate({ storyId: item.storyId });
			}
		}
	}

	return (
		<QuickActionButton
			active={false}
			interactive
			pending={pending}
			onClick={handleArchiveToggle}
			tooltip={showArchived ? 'Unarchive' : 'Archive'}
			fillOnHover={false}
		>
			{showArchived ? <ArchiveRestoreIcon className={styles.storyCheckboxCircleCheck} /> : <ArchiveIcon className={styles.storyCheckboxCircleCheck} />}
		</QuickActionButton>
	);
}

function StoryBadges({ item, mode }: { item: StoryItem; mode: 'grid' | 'lines' }) {
	const certified = item.isCertified ? <CertifiedBadge certifiedByName={item.certifiedByName} /> : null;
	const live = item.isLive ? <LiveBadge iconOnly={mode === 'grid'} /> : null;
	const sharing = item.sharing ? (
		<SharingBadge
			visibility={item.sharing.visibility}
			sharedWithCount={item.sharing.sharedWithCount}
			sharedWithGroupCount={item.sharing.sharedWithGroupCount}
		/>
	) : null;

	if (mode === 'grid') {
		const isSharedWithSpecific = item.sharing?.visibility === 'specific';
		if (!live && !isSharedWithSpecific) {
			return null;
		}
		return (
			<div className={styles.storyBadgesDiv}>
				{live}
				{isSharedWithSpecific && sharing}
			</div>
		);
	}

	return (
		<>
			{certified}
			{item.isInPrivateContext && <PrivateBadge />}
			{live}
			{sharing}
		</>
	);
}
