import { Fragment } from 'react';
import { FolderPlus } from 'lucide-react';
import { FolderCard } from './stories-folder-card';
import { CertifiedStoriesEmptyState, StoryCard, StoriesEmptyState, StoriesNoResults } from './stories-groups';
import styles from './stories-explorer.module.css';
import type { StoryPanelDisplayMode } from '@quarry/shared/types';
import type { ExplorerEntry, FolderItem, StoriesFilters, StoryItem } from '@/lib/stories-page';
import { countActiveFilters, DEFAULT_FILTERS, isSystemFolder } from '@/lib/stories-page';
import { usePermissions } from '@/hooks/use-permissions';
import { cn } from '@/lib/utils';

const GRID_CLASS = `${styles.gRIDCLASS} 2xl:grid-cols-6`;

export function StoriesExplorer({
	entries,
	displayMode,
	showArchived,
	filters = DEFAULT_FILTERS,
	searchQuery,
	currentFolderId,
	currentUserName,
	onMoveToFolder,
	onModifyFolder,
	onMoveFolder,
	onDeleteFolder,
	onArchiveFolder,
	onRestoreFolder,
	onNewFolder,
	selectedStoryIds,
	selectedFolderIds,
	onToggleStory,
	onToggleFolder,
	selectionMode = false,
}: {
	entries: ExplorerEntry[];
	displayMode: StoryPanelDisplayMode;
	showArchived: boolean;
	filters?: StoriesFilters;
	searchQuery: string;
	currentFolderId: string | null;
	currentUserName: string;
	onMoveToFolder: (item: StoryItem) => void;
	onModifyFolder: (folder: FolderItem) => void;
	onMoveFolder: (folder: FolderItem) => void;
	onDeleteFolder: (folder: FolderItem) => void;
	onArchiveFolder: (folder: FolderItem) => void;
	onRestoreFolder: (folder: FolderItem) => void;
	onNewFolder: () => void;
	selectedStoryIds: Set<string>;
	selectedFolderIds: Set<string>;
	onToggleStory: (storyId: string) => void;
	onToggleFolder: (folderId: string) => void;
	selectionMode?: boolean;
}) {
	const { isViewer } = usePermissions();
	const isInSharedWithMe = currentFolderId === '__shared_with_me__';
	const hasSearch = searchQuery.trim() !== '';
	const activeFilterCount = countActiveFilters(filters);
	const isShowingResults = hasSearch || activeFilterCount > 0;
	const canCreateFolder = !showArchived && !isViewer && !isInSharedWithMe && !isShowingResults;
	const moveToFolderHandler = isViewer || isInSharedWithMe ? undefined : onMoveToFolder;
	const selectionActive = selectionMode || selectedStoryIds.size + selectedFolderIds.size > 0;

	if (entries.length === 0) {
		if (!hasSearch && !showArchived && !currentFolderId && activeFilterCount === 1 && filters.certifiedOnly) {
			return <CertifiedStoriesEmptyState />;
		}
		if (isShowingResults) {
			return <StoriesNoResults query={searchQuery} />;
		}
		if (!showArchived) {
			return (
				<FolderEmptyState
					onNewFolder={onNewFolder}
					displayMode={displayMode}
					canCreateFolder={canCreateFolder}
					isRoot={!currentFolderId}
				/>
			);
		}
		return <StoriesEmptyState />;
	}

	const folders = entries.filter((e) => e.kind === 'folder');
	const stories = entries.filter((e) => e.kind === 'story');

	if (displayMode === 'lines') {
		const lastSystemFolderIndex = entries.reduce(
			(acc, entry, index) => (entry.kind === 'folder' && isSystemFolder(entry.folder) ? index : acc),
			-1,
		);
		return (
			<div className={styles.storiesExplorerDiv}>
				{canCreateFolder && lastSystemFolderIndex === -1 && <NewFolderRow onClick={onNewFolder} />}
				{entries.map((entry, index) => {
					const newFolderRow = canCreateFolder && index === lastSystemFolderIndex && (
						<NewFolderRow onClick={onNewFolder} />
					);
					if (entry.kind === 'folder') {
						return (
							<Fragment key={`f-${entry.folder.id}`}>
								<FolderCard
									folder={entry.folder}
									displayMode='lines'
									currentUserName={currentUserName}
									onModify={onModifyFolder}
									onMove={onMoveFolder}
									onDelete={onDeleteFolder}
									onArchive={onArchiveFolder}
									onRestore={onRestoreFolder}
									selected={selectedFolderIds.has(entry.folder.id)}
									selectionActive={selectionActive}
									onToggleSelect={onToggleFolder}
								/>
								{newFolderRow}
							</Fragment>
						);
					}
					return (
						<Fragment key={`s-${entry.story.storyId}`}>
							<StoryCard
								item={entry.story}
								displayMode='lines'
								showArchived={showArchived}
								onMoveToFolder={moveToFolderHandler}
								selected={selectedStoryIds.has(entry.story.storyId)}
								selectionActive={selectionActive}
								onToggleSelect={onToggleStory}
							/>
							{newFolderRow}
						</Fragment>
					);
				})}
			</div>
		);
	}

	return (
		<div className={styles.storiesExplorerDiv2}>
			{(folders.length > 0 || canCreateFolder) && (
				<section>
					<SectionLabel label='Folders' count={folders.length} />
					<div className={GRID_CLASS}>
						{folders.map((entry) => (
							<FolderCard
								key={`f-${entry.folder.id}`}
								folder={entry.folder}
								displayMode='grid'
								currentUserName={currentUserName}
								onModify={onModifyFolder}
								onMove={onMoveFolder}
								onDelete={onDeleteFolder}
								onArchive={onArchiveFolder}
								onRestore={onRestoreFolder}
								selected={selectedFolderIds.has(entry.folder.id)}
								selectionActive={selectionActive}
								onToggleSelect={onToggleFolder}
							/>
						))}
						{canCreateFolder && <NewFolderCard onClick={onNewFolder} />}
					</div>
				</section>
			)}
			{stories.length > 0 && (
				<section>
					<SectionLabel label={isShowingResults ? 'Results' : 'Stories'} count={stories.length} />
					<div className={GRID_CLASS}>
						{stories.map((entry) => (
							<StoryCard
								key={`s-${entry.story.storyId}`}
								item={entry.story}
								displayMode='grid'
								showArchived={showArchived}
								onMoveToFolder={moveToFolderHandler}
								selected={selectedStoryIds.has(entry.story.storyId)}
								selectionActive={selectionActive}
								onToggleSelect={onToggleStory}
							/>
						))}
					</div>
				</section>
			)}
		</div>
	);
}

function SectionLabel({ label, count }: { label: string; count: number }) {
	return (
		<h2 className={styles.sectionLabelH2}>
			{label}
			{count > 0 && <span className={styles.sectionLabelSpan}>{count}</span>}
		</h2>
	);
}

function NewFolderCard({ onClick }: { onClick: () => void }) {
	return (
		<button
			type='button'
			onClick={onClick}
			className={cn(styles.newFolderCardButton, styles.newFolderCardButton2, styles.newFolderCardButton3)}
		>
			<FolderPlus className={styles.newFolderCardFolderPlus} />
			<span className={styles.newFolderCardSpan}>New folder</span>
		</button>
	);
}

function NewFolderRow({ onClick }: { onClick: () => void }) {
	return (
		<button type='button' onClick={onClick} className={styles.newFolderRowButton}>
			<div className={styles.newFolderRowDiv}>
				<FolderPlus className={styles.newFolderCardFolderPlus} />
				<span className={styles.newFolderRowSpan}>New folder</span>
			</div>
		</button>
	);
}

function FolderEmptyState({
	onNewFolder,
	displayMode,
	canCreateFolder,
	isRoot,
}: {
	onNewFolder: () => void;
	displayMode: StoryPanelDisplayMode;
	canCreateFolder: boolean;
	isRoot: boolean;
}) {
	if (!canCreateFolder) {
		return <StoriesEmptyState />;
	}
	const action =
		displayMode === 'grid' ? (
			<div className={GRID_CLASS}>
				<NewFolderCard onClick={onNewFolder} />
			</div>
		) : (
			<div className={styles.actionDiv}>
				<NewFolderRow onClick={onNewFolder} />
			</div>
		);
	if (isRoot) {
		return (
			<div className={styles.folderEmptyStateDiv}>
				<StoriesEmptyState />
				{action}
			</div>
		);
	}
	return action;
}
