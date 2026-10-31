import { getRouteApi } from '@tanstack/react-router';
import { DndContext, DragOverlay, KeyboardSensor, pointerWithin, PointerSensor, rectIntersection, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { getEventCoordinates } from '@dnd-kit/utilities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Archive, Folder, Home } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BULK_ITEMS_LIMIT, SYSTEM_EXAMPLE_PROJECT_ID } from '@quarry/shared';
import type { BulkStoryItem, StoryPanelDisplayMode } from '@quarry/shared/types';
import type { CollisionDetection, DragEndEvent, DragStartEvent, Modifier } from '@dnd-kit/core';
import type { FolderItem, SortState, StoriesFilters, StoryItem } from '@/lib/stories-page';
import type { BreadcrumbNode } from '@/feature/stories/components/stories-folder-breadcrumb';
import type { PointerPosition } from '@/hooks/use-drag-pointer';
import type { StoryReferences } from '@/lib/story-reference';
import { FolderBreadcrumb } from '@/feature/stories/components/stories-folder-breadcrumb';
import { StoriesSelectionBar } from '@/feature/stories/components/stories-selection-bar';
import { FolderCreateDialog } from '@/feature/stories/components/stories-folder-create-dialog';
import { FolderDeleteDialog } from '@/feature/stories/components/stories-folder-delete-dialog';
import { FolderPickerDialog } from '@/feature/stories/components/stories-folder-picker-dialog';
import { MobileHeader } from '@/layout/mobile-header';
import { ProjectSwitcher } from '@/components/project-selector';
import { SortHeader } from '@/feature/stories/components/stories-sort-header';
import { StoriesExplorer } from '@/feature/stories/components/stories-explorer';
import { PromotedSections } from '@/feature/stories/components/stories-pinned-favorites';
import { StoriesToolbar } from '@/feature/stories/components/stories-toolbar';
import { useIsCloud } from '@/hooks/use-quarry-mode';
import { useRunningChatIds } from '@/hooks/use-chat-activity';
import { usePermissions } from '@/hooks/use-permissions';
import { useProjectSwitch } from '@/hooks/use-project-switch';
import { useDragPointer } from '@/hooks/use-drag-pointer';
import { useStartChatWithStories } from '@/hooks/use-start-chat-with-stories';
import { useSession } from '@/lib/auth-client';
import { hasAnyStoryReference, isOverNewChatDropTarget, NO_STORY_REFERENCES } from '@/lib/story-reference';
import { buildCurrentLevelEntries, buildStoryItems, countActiveFilters, DEFAULT_FILTERS, filterStories, getFolderSubtreeIds, getStoredSetting, isSystemFolder, readStoredSort, STORIES_DISPLAY_KEY, writeStoredSort } from '@/lib/stories-page';
import { invalidateStoryArchiveCaches, invalidateStoryPlacementCaches } from '@/lib/stories-cache';
import { cn } from '@/lib/utils';
import { selectedStoryReferencesStore, storyDragOverNewChatStore } from '@/stores/story-references';
import { useCurrentProject, useProjects } from '@/hooks/use-current-project';
import { storyApi } from '@/lib/story-api';
import styles from './stories-page.module.css';

const Route = getRouteApi('/_protected/stories/');


const snapCenterToCursor: Modifier = ({ activatorEvent, draggingNodeRect, transform }) => {
	if (!draggingNodeRect || !activatorEvent) {
		return transform;
	}
	const coords = getEventCoordinates(activatorEvent);
	if (!coords) {
		return transform;
	}
	const offsetX = coords.x - draggingNodeRect.left;
	const offsetY = coords.y - draggingNodeRect.top;
	return {
		...transform,
		x: transform.x + offsetX - draggingNodeRect.width / 2,
		y: transform.y + offsetY - draggingNodeRect.height / 2,
	};
};

const pointerWithinFallbackToRect: CollisionDetection = (args) => {
	const byPointer = pointerWithin(args);
	if (byPointer.length > 0) {
		return byPointer;
	}
	return rectIntersection(args);
};

/** The sidebar is outside of the drag context, so the "New chat" target is found under the pointer. */
function isDragOverNewChat(pointer: PointerPosition | null): boolean {
	return !!pointer && isOverNewChatDropTarget(pointer.x, pointer.y);
}

/** A dragged folder references its stories, like its @-mention. */
function toDraggedReferences(activeId: string): StoryReferences {
	if (activeId.startsWith('drag-story-')) {
		return { storyIds: [parseDragStoryId(activeId)], folderIds: [] };
	}
	if (activeId.startsWith('drag-folder-')) {
		return { storyIds: [], folderIds: [parseDragFolderId(activeId)] };
	}
	return NO_STORY_REFERENCES;
}

type DialogState =
	| { kind: 'create' }
	| { kind: 'modify'; folder: FolderItem }
	| { kind: 'delete'; folder: FolderItem }
	| { kind: 'picker-story'; item: StoryItem }
	| { kind: 'picker-folder'; folder: FolderItem }
	| { kind: 'picker-selection'; selection: StoryReferences }
	| null;

export function StoriesPage() {
	const { data: session } = useSession();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const startChatWithStories = useStartChatWithStories();
	const { isAdmin } = usePermissions();

	const { folderId: currentFolderId } = Route.useSearch();

	const [displayMode, setDisplayMode] = useState<StoryPanelDisplayMode>(() =>
		getStoredSetting(STORIES_DISPLAY_KEY, ['grid', 'lines'], 'grid'),
	);
	const [sort, setSort] = useState<SortState>(() => readStoredSort());
	const [searchQuery, setSearchQuery] = useState('');
	const [filters, setFilters] = useState<StoriesFilters>(DEFAULT_FILTERS);
	const [showArchived, setShowArchived] = useState(false);
	const [dialog, setDialog] = useState<DialogState>(null);
	const [activeId, setActiveId] = useState<string | null>(null);
	const dragPointerRef = useDragPointer(activeId !== null);

	const [selectedStoryIds, setSelectedStoryIds] = useState<Set<string>>(new Set());
	const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
	const [selectionMode, setSelectionMode] = useState(false);
	const selectionActive = selectionMode || selectedStoryIds.size + selectedFolderIds.size > 0;

	const project = useCurrentProject();
	const projects = useProjects();
	const activeProjectId = project.data?.id;
	const isTrial = useIsCloud() && project.isSuccess && project.data === null;
	const storiesProjectId = activeProjectId ?? (isTrial ? SYSTEM_EXAMPLE_PROJECT_ID : undefined);
	const switchProject = useProjectSwitch(activeProjectId);

	const userStories = useQuery({
		...storyApi.story.listAll.queryOptions({ projectId: storiesProjectId }),
		enabled: !!storiesProjectId,
	});
	const standaloneStories = useQuery({
		...storyApi.story.listStandalone.queryOptions(),
		enabled: !!activeProjectId,
	});
	const sharedStories = useQuery({
		...storyApi.storyShare.list.queryOptions({ projectId: storiesProjectId ?? '' }),
		enabled: !!storiesProjectId,
	});
	const favorites = useQuery({ ...storyApi.favorite.list.queryOptions(), enabled: !!activeProjectId });
	const archivedStories = useQuery({
		...storyApi.story.listArchived.queryOptions({ projectId: activeProjectId }),
		enabled: showArchived && !!activeProjectId,
	});
	const archivedStandaloneStories = useQuery({
		...storyApi.story.listStandaloneArchived.queryOptions(),
		enabled: showArchived && !!activeProjectId,
	});
	const archivedSharedStories = useQuery({
		...storyApi.story.listSharedArchived.queryOptions(),
		enabled: showArchived && !!activeProjectId,
	});

	const folderTree = useQuery({
		...storyApi.storyFolder.listTree.queryOptions({ archived: false }),
		enabled: !!activeProjectId,
	});
	const archivedFolderTree = useQuery({
		...storyApi.storyFolder.listTree.queryOptions({ archived: true }),
		enabled: showArchived && !!activeProjectId,
	});
	const folderItems = useQuery({
		...storyApi.storyFolder.listItems.queryOptions(),
		enabled: !!activeProjectId,
	});

	const currentUserName = session?.user?.name ?? 'Me';

	const folderItemMap = useMemo(() => {
		const map = new Map<string, string>();
		for (const item of folderItems.data ?? []) {
			map.set(item.storyId, item.folderId);
		}
		return map;
	}, [folderItems.data]);

	const allItems = useMemo(() => {
		if (showArchived) {
			return buildStoryItems({
				userStories: archivedStories.data ?? [],
				standaloneStories: archivedStandaloneStories.data,
				sharedStories: archivedSharedStories.data ?? [],
				currentUserName,
				favoriteStoryIds: favorites.data?.storyIds,
				folderItemMap,
				folders: folderTree.data ?? [],
			});
		}
		return buildStoryItems({
			userStories: userStories.data ?? [],
			standaloneStories: standaloneStories.data,
			sharedStories: sharedStories.data ?? [],
			currentUserName,
			favoriteStoryIds: favorites.data?.storyIds,
			folderItemMap,
			folders: folderTree.data ?? [],
		});
	}, [
		showArchived,
		userStories.data,
		standaloneStories.data,
		sharedStories.data,
		archivedStories.data,
		archivedStandaloneStories.data,
		archivedSharedStories.data,
		currentUserName,
		favorites.data,
		folderItemMap,
		folderTree.data,
	]);

	const filteredItems = useMemo(
		() => filterStories(allItems, searchQuery, filters),
		[allItems, searchQuery, filters],
	);

	const folders = useMemo(
		() => (showArchived ? archivedFolderTree.data : folderTree.data) ?? [],
		[folderTree.data, archivedFolderTree.data, showArchived],
	);

	useEffect(() => {
		const treeLoaded = showArchived ? archivedFolderTree.data !== undefined : folderTree.data !== undefined;
		if (!currentFolderId || !treeLoaded) {
			return;
		}
		const exists = folders.some((f) => f.id === currentFolderId);
		if (!exists) {
			navigate({ to: '/stories', search: { folderId: null }, replace: true });
		}
	}, [currentFolderId, folderTree.data, archivedFolderTree.data, folders, navigate, showArchived]);

	useEffect(() => {
		clearSelection();
	}, [currentFolderId, activeProjectId, filters, searchQuery]);

	const selectedStoryReferences = useMemo(
		(): StoryReferences => ({ storyIds: [...selectedStoryIds], folderIds: [...selectedFolderIds] }),
		[selectedStoryIds, selectedFolderIds],
	);

	const selectedChatIds = allItems.flatMap((item) =>
		selectedStoryIds.has(item.storyId) && item.chatId ? [item.chatId] : [],
	);
	const runningChatIds = useRunningChatIds(selectedChatIds);

	useEffect(() => {
		selectedStoryReferencesStore.set(selectedStoryReferences);
		return () => selectedStoryReferencesStore.set(NO_STORY_REFERENCES);
	}, [selectedStoryReferences]);

	const {
		pinned,
		favorites: promotedFavorites,
		entries,
	} = useMemo(() => {
		const levelEntries = buildCurrentLevelEntries({
			items: filteredItems,
			folders,
			currentFolderId: currentFolderId ?? null,
			sort,
			currentUserName,
			favoriteFolderIds: favorites.data?.folderIds,
			searchQuery,
			filters,
		});
		if (showArchived) {
			return { pinned: [], favorites: [], entries: levelEntries.entries };
		}
		return levelEntries;
	}, [
		filteredItems,
		folders,
		currentFolderId,
		sort,
		currentUserName,
		showArchived,
		favorites.data,
		searchQuery,
		filters,
	]);

	const breadcrumbPath = useMemo((): BreadcrumbNode[] => {
		const root: BreadcrumbNode = { id: null, name: showArchived ? 'Archived' : 'Root' };
		if (!currentFolderId) {
			return [root];
		}

		const path: BreadcrumbNode[] = [];
		let id: string | null = currentFolderId;
		while (id) {
			const folder = folders.find((f) => f.id === id);
			if (!folder) {
				break;
			}
			path.unshift({
				id: folder.id,
				name: folder.name,
				isPrivate: folder.visibility === 'private' || folder.systemType === 'shared_with_me',
			});
			id = 'parentId' in folder ? (folder.parentId ?? null) : null;
		}
		return [root, ...path];
	}, [currentFolderId, folders, showArchived]);

	const isLoading = showArchived
		? project.isLoading || archivedStories.isLoading || archivedStandaloneStories.isLoading
		: project.isLoading || userStories.isLoading || standaloneStories.isLoading || sharedStories.isLoading;
	const isEmpty = allItems.length === 0 && folders.length === 0 && !isLoading;

	function handleDisplayChange(mode: StoryPanelDisplayMode) {
		setDisplayMode(mode);
		localStorage.setItem(STORIES_DISPLAY_KEY, mode);
	}

	function handleSortChange(next: SortState) {
		setSort(next);
		writeStoredSort(next);
	}

	function handleShowArchivedChange(value: boolean) {
		setShowArchived(value);
		clearSelection();
		if (value) {
			navigate({ to: '/stories', search: { folderId: null } });
		}
	}

	async function handleProjectChange(projectId: string) {
		const didSwitch = await switchProject(projectId);
		if (didSwitch) {
			navigate({ to: '/stories', search: { folderId: null } });
		}
	}

	function clearSelection() {
		setSelectedStoryIds(new Set());
		setSelectedFolderIds(new Set());
		setSelectionMode(false);
	}

	function toggleSelectionMode() {
		if (selectionActive) {
			clearSelection();
		} else {
			setSelectionMode(true);
		}
	}

	function deselectStoryIds(storyIds: string[]) {
		setSelectedStoryIds((prev) => {
			const next = new Set(prev);
			for (const id of storyIds) {
				next.delete(id);
			}
			return next;
		});
	}

	function deselectFolderIds(folderIds: string[]) {
		setSelectedFolderIds((prev) => {
			const next = new Set(prev);
			for (const id of folderIds) {
				next.delete(id);
			}
			return next;
		});
	}

	function toggleStorySelection(storyId: string) {
		setSelectedStoryIds((prev) => {
			const next = new Set(prev);
			if (next.has(storyId)) {
				next.delete(storyId);
			} else if (next.size < BULK_ITEMS_LIMIT) {
				next.add(storyId);
			}
			return next;
		});
	}

	function toggleFolderSelection(folderId: string) {
		setSelectedFolderIds((prev) => {
			const next = new Set(prev);
			if (next.has(folderId)) {
				next.delete(folderId);
			} else if (next.size < BULK_ITEMS_LIMIT) {
				next.add(folderId);
			}
			return next;
		});
	}

	const moveStoryMutation = useMutation(
		storyApi.storyFolder.moveStory.mutationOptions({
			onMutate: async ({ storyId, folderId }) => {
				const queryKey = storyApi.storyFolder.listItems.queryKey();
				await queryClient.cancelQueries({ queryKey });
				const previous = queryClient.getQueryData<{ storyId: string; folderId: string }[]>(queryKey);
				queryClient.setQueryData<{ storyId: string; folderId: string }[]>(queryKey, (old) => {
					const filtered = (old ?? []).filter((i) => i.storyId !== storyId);
					return folderId ? [...filtered, { storyId, folderId }] : filtered;
				});
				return { previous };
			},
			onError: (_err, _vars, ctx) => {
				if (ctx?.previous !== undefined) {
					queryClient.setQueryData(storyApi.storyFolder.listItems.queryKey(), ctx.previous);
				}
			},
			onSettled: () => invalidateStoryPlacementCaches(queryClient),
		}),
	);

	const moveFolderMutation = useMutation(
		storyApi.storyFolder.move.mutationOptions({
			onSuccess: () => invalidateStoryPlacementCaches(queryClient),
		}),
	);

	const archiveFolderMutation = useMutation(
		storyApi.storyFolder.archive.mutationOptions({
			onSuccess: () => invalidateStoryArchiveCaches(queryClient),
		}),
	);

	const unarchiveFolderMutation = useMutation(
		storyApi.storyFolder.unarchive.mutationOptions({
			onSuccess: () => invalidateStoryArchiveCaches(queryClient),
		}),
	);

	function handleArchiveFolder(folder: FolderItem) {
		archiveFolderMutation.mutate({ id: folder.id });
	}

	function handleRestoreFolder(folder: FolderItem) {
		unarchiveFolderMutation.mutate({ id: folder.id });
	}

	const bulkArchiveStoryMutation = useMutation(
		storyApi.story.bulkArchive.mutationOptions({
			onSuccess: (_data, variables) => {
				invalidateStoryArchiveCaches(queryClient);
				deselectStoryIds(variables.items.map((item) => item.storyId));
			},
		}),
	);

	const bulkUnarchiveStoryMutation = useMutation(
		storyApi.story.bulkUnarchive.mutationOptions({
			onSuccess: (_data, variables) => {
				invalidateStoryArchiveCaches(queryClient);
				deselectStoryIds(variables.items.map((item) => item.storyId));
			},
		}),
	);

	const bulkArchiveFolderMutation = useMutation(
		storyApi.storyFolder.bulkArchive.mutationOptions({
			onSuccess: (_data, variables) => {
				invalidateStoryArchiveCaches(queryClient);
				deselectFolderIds(variables.ids);
			},
		}),
	);

	const bulkUnarchiveFolderMutation = useMutation(
		storyApi.storyFolder.bulkUnarchive.mutationOptions({
			onSuccess: (_data, variables) => {
				invalidateStoryArchiveCaches(queryClient);
				deselectFolderIds(variables.ids);
			},
		}),
	);

	function buildBulkStoryItems(): BulkStoryItem[] {
		const storyItems = allItems.filter((item) => selectedStoryIds.has(item.storyId));
		const result: BulkStoryItem[] = [];
		for (const item of storyItems) {
			if (item.kind === 'own' || item.kind === 'own-standalone') {
				result.push({ kind: 'own', storyId: item.storyId });
			} else if (item.kind === 'shared-project') {
				result.push({ kind: 'shared-project', storyId: item.storyId });
			}
		}
		return result;
	}

	function handleBulkArchive() {
		const bulkItems = buildBulkStoryItems();
		const folderIds = [...selectedFolderIds];

		if (bulkItems.length > 0) {
			bulkArchiveStoryMutation.mutate({ items: bulkItems });
		}
		if (folderIds.length > 0) {
			bulkArchiveFolderMutation.mutate({ ids: folderIds });
		}
		if (bulkItems.length === 0 && folderIds.length === 0) {
			clearSelection();
		}
	}

	function handleBulkUnarchive() {
		const bulkItems = buildBulkStoryItems();
		const folderIds = [...selectedFolderIds];

		if (bulkItems.length > 0) {
			bulkUnarchiveStoryMutation.mutate({ items: bulkItems });
		}
		if (folderIds.length > 0) {
			bulkUnarchiveFolderMutation.mutate({ ids: folderIds });
		}
		if (bulkItems.length === 0 && folderIds.length === 0) {
			clearSelection();
		}
	}

	const bulkMoveMutation = useMutation(
		storyApi.storyFolder.bulkMove.mutationOptions({
			onMutate: async ({ storyIds, targetFolderId }) => {
				const queryKey = storyApi.storyFolder.listItems.queryKey();
				await queryClient.cancelQueries({ queryKey });
				const previous = queryClient.getQueryData<{ storyId: string; folderId: string }[]>(queryKey);
				queryClient.setQueryData<{ storyId: string; folderId: string }[]>(queryKey, (old) => {
					const remaining = (old ?? []).filter((i) => !storyIds.includes(i.storyId));
					const moved = targetFolderId
						? storyIds.map((storyId) => ({ storyId, folderId: targetFolderId }))
						: [];
					return [...remaining, ...moved];
				});
				return { previous };
			},
			onSuccess: clearSelection,
			onError: (_err, _vars, ctx) => {
				if (ctx?.previous !== undefined) {
					queryClient.setQueryData(storyApi.storyFolder.listItems.queryKey(), ctx.previous);
				}
			},
			onSettled: () => invalidateStoryPlacementCaches(queryClient),
		}),
	);

	/** Only the selected items the user can move right now, so one forbidden item doesn't block the whole move. */
	function buildMovableSelection(): StoryReferences {
		const storyIds = allItems
			.filter((item) => selectedStoryIds.has(item.storyId))
			.filter((item) => item.kind !== 'shared-with-me' && (isOwnStory(item) || isAdmin))
			.filter((item) => !item.chatId || !runningChatIds.has(item.chatId))
			.map((item) => item.storyId);
		const folderIds = folders
			.filter((folder) => selectedFolderIds.has(folder.id))
			.filter((folder) => !isSystemFolder(folder) && (folder.ownerId === session?.user?.id || isAdmin))
			.map((folder) => folder.id);
		return { storyIds, folderIds };
	}

	function handleBulkMoveToFolder(targetFolderId: string | null) {
		const { storyIds, folderIds } = buildMovableSelection();
		if (targetFolderId && getFolderSubtreeIds(folderIds, folders).has(targetFolderId)) {
			return;
		}
		if (storyIds.length === 0 && folderIds.length === 0) {
			return;
		}
		bulkMoveMutation.mutate({ storyIds, folderIds, targetFolderId });
	}

	function isSelectionDrag(activeStr: string): boolean {
		if (activeStr.startsWith('drag-story-')) {
			return selectedStoryIds.has(parseDragStoryId(activeStr));
		}
		if (activeStr.startsWith('drag-folder-')) {
			return selectedFolderIds.has(parseDragFolderId(activeStr));
		}
		return false;
	}

	const movableSelection = buildMovableSelection();

	const isBulkPending =
		bulkMoveMutation.isPending ||
		bulkArchiveStoryMutation.isPending ||
		bulkUnarchiveStoryMutation.isPending ||
		bulkArchiveFolderMutation.isPending ||
		bulkUnarchiveFolderMutation.isPending;

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	function handleDragStart(event: DragStartEvent) {
		setActiveId(String(event.active.id));
	}

	function handleDragMove() {
		storyDragOverNewChatStore.set(!showArchived && isDragOverNewChat(dragPointerRef.current));
	}

	function handleDragCancel() {
		setActiveId(null);
		storyDragOverNewChatStore.set(false);
	}

	function handleDragEnd(event: DragEndEvent) {
		setActiveId(null);
		storyDragOverNewChatStore.set(false);
		const { active, over } = event;
		const activeStr = String(active.id);

		const draggingSelection = isSelectionDrag(activeStr);

		if (!showArchived && isDragOverNewChat(dragPointerRef.current)) {
			startChatWithStories(draggingSelection ? selectedStoryReferences : toDraggedReferences(activeStr));
			return;
		}
		if (!over) {
			return;
		}

		const overStr = String(over.id);

		const isStory = activeStr.startsWith('drag-story-');
		const isFolder = activeStr.startsWith('drag-folder-');

		const targetFolderId = parseDropFolderId(overStr);

		if (draggingSelection) {
			handleBulkMoveToFolder(targetFolderId);
		} else if (isStory) {
			const storyId = parseDragStoryId(activeStr);
			moveStoryMutation.mutate({ storyId, folderId: targetFolderId });
		} else if (isFolder) {
			const folderId = parseDragFolderId(activeStr);
			if (targetFolderId === folderId) {
				return;
			}
			moveFolderMutation.mutate({ id: folderId, newParentId: targetFolderId });
		}
	}

	const activeDragItem = useMemo(() => {
		if (!activeId) {
			return null;
		}
		if (activeId.startsWith('drag-story-')) {
			const storyId = parseDragStoryId(activeId);
			return allItems.find((i) => i.storyId === storyId) ?? null;
		}
		if (activeId.startsWith('drag-folder-')) {
			const folderId = parseDragFolderId(activeId);
			return folders.find((f) => f.id === folderId) ?? null;
		}
		return null;
	}, [activeId, allItems, folders]);

	const isShowingResults = searchQuery.trim() !== '' || countActiveFilters(filters) > 0;
	const currentFolderName = breadcrumbPath.length > 1 ? breadcrumbPath[breadcrumbPath.length - 1].name : null;
	const searchPlaceholder = currentFolderName
		? `Search in ${currentFolderName}...`
		: 'Search stories by title, author, content or ID...';

	return (
		<div className={styles.storiesPageDiv}>
			<MobileHeader />
			<DndContext
				sensors={sensors}
				collisionDetection={pointerWithinFallbackToRect}
				modifiers={[snapCenterToCursor]}
				onDragStart={handleDragStart}
				onDragMove={handleDragMove}
				onDragEnd={handleDragEnd}
				onDragCancel={handleDragCancel}
			>
				<div className={styles.storiesPageDiv2}>
					<div className={styles.storiesPageDiv3}>
						<div className={styles.storiesPageDiv4}>
							<h1 className={styles.storiesPageH1}>
								<FolderBreadcrumb path={breadcrumbPath} rootIcon={showArchived ? Archive : Home} />
							</h1>
						</div>
						{project.data && (
							<ProjectSwitcher
								projects={projects.data ?? []}
								currentProjectId={project.data.id}
								onChange={handleProjectChange}
								variant='inline'
							/>
						)}
					</div>

					{(!isEmpty || showArchived) && (
						<StoriesToolbar
							searchQuery={searchQuery}
							onSearchChange={setSearchQuery}
							searchPlaceholder={searchPlaceholder}
							filters={filters}
							onFiltersChange={setFilters}
							showArchived={showArchived}
							onShowArchivedChange={handleShowArchivedChange}
							sort={sort}
							onSortChange={handleSortChange}
							displayMode={displayMode}
							onDisplayModeChange={handleDisplayChange}
							selectionActive={selectionActive}
							onToggleSelection={toggleSelectionMode}
							className={styles.storiesPageStoriesToolbar}
						/>
					)}

					{!showArchived && !isShowingResults && (
						<PromotedSections
							pinned={pinned}
							favorites={promotedFavorites}
							currentUserName={currentUserName}
							onModifyFolder={(folder) => setDialog({ kind: 'modify', folder })}
							onMoveFolder={(folder) => setDialog({ kind: 'picker-folder', folder })}
							onDeleteFolder={(folder) => setDialog({ kind: 'delete', folder })}
							onArchiveFolder={handleArchiveFolder}
							onRestoreFolder={handleRestoreFolder}
							className={styles.storiesPagePromotedSections}
							selectedStoryIds={selectedStoryIds}
							selectedFolderIds={selectedFolderIds}
							onToggleStory={toggleStorySelection}
							onToggleFolder={toggleFolderSelection}
							selectionMode={selectionMode}
						/>
					)}

					{displayMode === 'lines' && entries.length > 0 && (
						<SortHeader value={sort} onChange={handleSortChange} />
					)}

					<StoriesExplorer
						entries={entries}
						displayMode={displayMode}
						showArchived={showArchived}
						filters={filters}
						searchQuery={searchQuery}
						currentFolderId={currentFolderId ?? null}
						currentUserName={currentUserName}
						onMoveToFolder={(item) => setDialog({ kind: 'picker-story', item })}
						onModifyFolder={(folder) => setDialog({ kind: 'modify', folder })}
						onMoveFolder={(folder) => setDialog({ kind: 'picker-folder', folder })}
						onDeleteFolder={(folder) => setDialog({ kind: 'delete', folder })}
						onArchiveFolder={handleArchiveFolder}
						onRestoreFolder={handleRestoreFolder}
						onNewFolder={() => setDialog({ kind: 'create' })}
						selectedStoryIds={selectedStoryIds}
						selectedFolderIds={selectedFolderIds}
						onToggleStory={toggleStorySelection}
						onToggleFolder={toggleFolderSelection}
						selectionMode={selectionMode}
					/>

					<DragOverlay>
						{activeDragItem && (
							<DragOverlayCard
								item={activeDragItem}
								count={
									activeId && isSelectionDrag(activeId)
										? selectedStoryIds.size + selectedFolderIds.size
										: 1
								}
							/>
						)}
					</DragOverlay>
				</div>
			</DndContext>

			<StoriesSelectionBar
				selectedCount={selectedStoryIds.size + selectedFolderIds.size}
				limitReached={selectedStoryIds.size >= BULK_ITEMS_LIMIT || selectedFolderIds.size >= BULK_ITEMS_LIMIT}
				showArchived={showArchived}
				isPending={isBulkPending}
				canMove={hasAnyStoryReference(movableSelection)}
				onArchive={handleBulkArchive}
				onUnarchive={handleBulkUnarchive}
				onMove={() => setDialog({ kind: 'picker-selection', selection: movableSelection })}
				onStartChat={() => startChatWithStories(selectedStoryReferences)}
				onCancel={clearSelection}
			/>

			<FolderCreateDialog
				open={dialog?.kind === 'create' || dialog?.kind === 'modify'}
				onOpenChange={(open) => {
					if (!open) {
						setDialog(null);
					}
				}}
				mode={dialog?.kind === 'modify' ? 'modify' : 'create'}
				initialName={dialog?.kind === 'modify' ? dialog.folder.name : undefined}
				folderId={dialog?.kind === 'modify' ? dialog.folder.id : undefined}
				parentId={currentFolderId}
			/>

			{dialog?.kind === 'delete' && (
				<FolderDeleteDialog
					open
					onOpenChange={(open) => {
						if (!open) {
							setDialog(null);
						}
					}}
					folderId={dialog.folder.id}
					folderName={dialog.folder.name}
					parentName={
						dialog.folder.parentId
							? (folders.find((f) => f.id === dialog.folder.parentId)?.name ?? 'parent folder')
							: 'Root'
					}
					hasChildren={
						folders.some((f) => f.parentId === dialog.folder.id) ||
						(folderItems.data ?? []).some((i) => i.folderId === dialog.folder.id)
					}
				/>
			)}

			{dialog?.kind === 'picker-story' && (
				<FolderPickerDialog
					open
					onOpenChange={(open) => {
						if (!open) {
							setDialog(null);
						}
					}}
					target={{ type: 'story', storyId: dialog.item.storyId }}
					isOwner={dialog.item.kind === 'own' || dialog.item.kind === 'own-standalone'}
				/>
			)}

			{dialog?.kind === 'picker-selection' && (
				<FolderPickerDialog
					open
					onOpenChange={(open) => {
						if (!open) {
							setDialog(null);
						}
					}}
					target={{ type: 'selection', ...dialog.selection }}
					isOwner={allItems
						.filter((item) => dialog.selection.storyIds.includes(item.storyId))
						.every(isOwnStory)}
					onMoved={clearSelection}
				/>
			)}

			{dialog?.kind === 'picker-folder' && (
				<FolderPickerDialog
					open
					onOpenChange={(open) => {
						if (!open) {
							setDialog(null);
						}
					}}
					target={{ type: 'folder', folderId: dialog.folder.id, currentVisibility: dialog.folder.visibility }}
					isOwner={dialog.folder.ownerId === session?.user?.id}
				/>
			)}
		</div>
	);
}

function parseDropFolderId(overStr: string): string | null {
	if (overStr === 'drop-folder-root') {
		return null;
	}
	const withoutPrefix = overStr.replace(/^drop-folder-/, '');
	const match = withoutPrefix.match(/^(?:grid-large|grid|lines)-(.+)$/);
	return match ? match[1] : withoutPrefix;
}

function parseDragFolderId(activeStr: string): string {
	const withoutPrefix = activeStr.replace(/^drag-folder-/, '');
	const match = withoutPrefix.match(/^(?:grid-large|grid|lines)-(.+)$/);
	return match ? match[1] : withoutPrefix;
}

function parseDragStoryId(activeStr: string): string {
	const withoutPrefix = activeStr.replace(/^drag-story-/, '');
	const match = withoutPrefix.match(/^(?:pinned|favorites)-(.+)$/);
	return match ? match[1] : withoutPrefix;
}

function isOwnStory(item: StoryItem): boolean {
	return item.kind === 'own' || item.kind === 'own-standalone';
}

function DragOverlayCard({ item, count }: { item: StoryItem | FolderItem; count: number }) {
	const isFolder = 'storyCount' in item;
	return (
		<div
			className={cn(
				styles.dragOverlayCardDiv,
				styles.dragOverlayCardDiv2,
			)}
		>
			{isFolder ? (
				<Folder className={styles.dragOverlayCardFolder} />
			) : (
				<span className={styles.dragOverlayCardSpan} />
			)}
			<span className={styles.dragOverlayCardSpan2}>{isFolder ? item.name : item.title}</span>
			{count > 1 && (
				<span className={styles.dragOverlayCardSpan3}>
					{count}
				</span>
			)}
		</div>
	);
}
