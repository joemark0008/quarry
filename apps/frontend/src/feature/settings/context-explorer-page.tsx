import { getRouteApi, useBlocker, useNavigate } from '@tanstack/react-router';
import { useCallback, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDefaultLayout } from 'react-resizable-panels';
import styles from './context-explorer-page.module.css';
import type { FileSelectionOptions } from '@/feature/settings/components/file-tree';
import { FileTree } from '@/feature/settings/components/file-tree';
import { FileViewer } from '@/feature/settings/components/file-viewer';
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
import { ResizablePanel, ResizablePanelGroup, ResizableSeparator } from '@/components/ui/resizable';
import { Spinner } from '@/components/ui/spinner';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { createLocalStorage } from '@/lib/local-storage';
import { contextExplorerApi } from '@/lib/context-explorer-api';

const Route = getRouteApi('/_protected/settings/context-explorer');

const contentSearchStorage = createLocalStorage<boolean>('quarry-file-explorer-content-search', true);

type ViewerTarget = { path: string; openSource: boolean };
type SourceAutoOpenRequest = { path: string; id: number };

export function ContextExplorerPage() {
	const navigate = useNavigate();
	const { path: initialPath } = Route.useSearch();
	const [selectedPath, setSelectedPath] = useState<string | null>(() => initialPath ?? null);
	const [pendingViewerTarget, setPendingViewerTarget] = useState<ViewerTarget | null>(null);
	const [sourceAutoOpenRequest, setSourceAutoOpenRequest] = useState<SourceAutoOpenRequest | null>(null);
	const [isViewerDirty, setIsViewerDirty] = useState(false);
	const [search, setSearch] = useState('');
	const [isContentSearchEnabled, setIsContentSearchEnabled] = useLocalStorage(contentSearchStorage);
	const trimmedSearch = search.trim();
	const contentSearchQuery = trimmedSearch.slice(0, 200);
	const debouncedSearch = useDebouncedValue(contentSearchQuery, 250);
	const isLiveContentSearchEligible = isContentSearchEnabled && trimmedSearch.length >= 2;
	const shouldSearchContent = isContentSearchEnabled && debouncedSearch.length >= 2;
	const { defaultLayout, onLayoutChanged } = useDefaultLayout({
		id: 'context-explorer',
		storage: localStorage,
	});
	const shouldBlockNavigation = useCallback(() => isViewerDirty, [isViewerDirty]);
	const navigationBlocker = useBlocker({
		shouldBlockFn: shouldBlockNavigation,
		enableBeforeUnload: isViewerDirty,
		disabled: !isViewerDirty,
		withResolver: true,
	});

	const fileTree = useQuery(contextExplorerApi.contextExplorer.getFileTree.queryOptions());
	const rulesPreviewGroups = useQuery(contextExplorerApi.contextExplorer.getRulesPreviewGroups.queryOptions());
	const rulesPreviewGroupsState = rulesPreviewGroups.isLoading
		? ({ status: 'loading' } as const)
		: rulesPreviewGroups.isError || !rulesPreviewGroups.data
			? ({ status: 'error' } as const)
			: ({ status: 'ready', ...rulesPreviewGroups.data } as const);
	const fileContent = useQuery({
		...contextExplorerApi.contextExplorer.readFile.queryOptions({ path: selectedPath! }),
		enabled: !!selectedPath,
	});
	const contentSearch = useQuery({
		...contextExplorerApi.contextExplorer.searchContent.queryOptions({ query: debouncedSearch }),
		enabled: shouldSearchContent,
		placeholderData: keepPreviousData,
	});
	const isContentSearchPending =
		isLiveContentSearchEligible && (contentSearchQuery !== debouncedSearch || contentSearch.isFetching);
	const contentMatches = useMemo(() => {
		if (!isLiveContentSearchEligible || !shouldSearchContent) {
			return new Map();
		}
		return new Map(
			(contentSearch.data?.results ?? []).map((match) => [
				match.path,
				{ count: match.count, line: match.line, text: match.text },
			]),
		);
	}, [contentSearch.data?.results, isLiveContentSearchEligible, shouldSearchContent]);

	const requestSourceAutoOpen = (path: string) => {
		setSourceAutoOpenRequest((current) => ({ path, id: (current?.id ?? 0) + 1 }));
	};

	const applyViewerTarget = (target: ViewerTarget) => {
		setSelectedPath(target.path);
		if (target.openSource) {
			requestSourceAutoOpen(target.path);
		} else {
			setSourceAutoOpenRequest(null);
		}
	};

	const requestViewerTarget = (target: ViewerTarget) => {
		if (isViewerDirty) {
			setPendingViewerTarget(target);
			return;
		}
		applyViewerTarget(target);
	};

	const handleSelectFile = (path: string, options: FileSelectionOptions) => {
		if (path === selectedPath) {
			if (options.isContentMatch) {
				requestSourceAutoOpen(path);
			}
			return;
		}
		requestViewerTarget({ path, openSource: options.isContentMatch });
	};

	const handleDiscardAndChangeView = () => {
		if (!pendingViewerTarget) {
			return;
		}
		setIsViewerDirty(false);
		applyViewerTarget(pendingViewerTarget);
		setPendingViewerTarget(null);
	};

	const handleDiscardAndNavigate = () => {
		if (navigationBlocker.status !== 'blocked') {
			return;
		}
		setIsViewerDirty(false);
		navigationBlocker.proceed();
	};

	return (
		<div className={styles.contextExplorerPageDiv}>
			<ResizablePanelGroup
				orientation='horizontal'
				className={styles.contextExplorerPageResizablePanelGroup}
				defaultLayout={defaultLayout ?? { tree: 1.1, viewer: 5 }}
				onLayoutChanged={onLayoutChanged}
			>
				<ResizablePanel id='tree' minSize={180}>
					<div className={styles.contextExplorerPageDiv2}>
						{fileTree.isLoading ? (
							<div className={styles.contextExplorerPageDiv3}>
								<Spinner />
							</div>
						) : fileTree.isError ? (
							<div className={styles.contextExplorerPageDiv4}>
								<p>Failed to load files</p>
								<Button variant='outline' size='sm' onClick={() => fileTree.refetch()}>
									Retry
								</Button>
							</div>
						) : (
							<div className={styles.contextExplorerPageDiv5}>
								<FileTree
									entries={fileTree.data?.entries ?? []}
									selectedPath={selectedPath}
									onSelectFile={handleSelectFile}
									search={search}
									onSearchChange={setSearch}
									isContentSearchEnabled={isContentSearchEnabled}
									onContentSearchEnabledChange={setIsContentSearchEnabled}
									contentMatches={contentMatches}
									isContentSearchPending={isContentSearchPending}
									contentSearchFailed={shouldSearchContent && contentSearch.isError}
									contentSearchTruncated={
										isLiveContentSearchEligible &&
										shouldSearchContent &&
										!isContentSearchPending &&
										!contentSearch.isPlaceholderData &&
										contentSearch.data?.truncated === true
									}
								/>
							</div>
						)}
					</div>
				</ResizablePanel>

				<ResizableSeparator />

				<ResizablePanel id='viewer' minSize={300}>
					<div className={styles.contextExplorerPageDiv6}>
						<FileViewer
							key={selectedPath ?? 'empty'}
							filePath={selectedPath}
							content={fileContent.data?.content}
							hash={fileContent.data?.hash}
							isLoading={fileContent.isLoading && fileContent.fetchStatus !== 'idle'}
							isError={fileContent.isError && !fileContent.data}
							isEditable={fileContent.data?.isEditable === true}
							editabilityGuidance={fileContent.data?.guidance ?? null}
							searchQuery={shouldSearchContent ? debouncedSearch : ''}
							sourceAutoOpenRequestId={
								sourceAutoOpenRequest?.path === selectedPath ? sourceAutoOpenRequest.id : null
							}
							onDirtyChange={setIsViewerDirty}
							onOpenGuidancePath={(path, kind) => {
								if (kind === 'route') {
									void navigate({ to: path });
									return;
								}
								requestViewerTarget({ path, openSource: false });
							}}
							onReload={async () => {
								const result = await fileContent.refetch();
								if (result.error) {
									throw result.error;
								}
								return result.data;
							}}
							rulesPreviewGroups={rulesPreviewGroupsState}
						/>
					</div>
				</ResizablePanel>
			</ResizablePanelGroup>
			<DiscardChangesDialog
				open={pendingViewerTarget !== null}
				onOpenChange={(open) => {
					if (!open) {
						setPendingViewerTarget(null);
					}
				}}
				onDiscard={handleDiscardAndChangeView}
			/>
			<DiscardChangesDialog
				open={navigationBlocker.status === 'blocked'}
				onOpenChange={(open) => {
					if (!open && navigationBlocker.status === 'blocked') {
						navigationBlocker.reset();
					}
				}}
				onDiscard={handleDiscardAndNavigate}
			/>
		</div>
	);
}

function DiscardChangesDialog({
	open,
	onOpenChange,
	onDiscard,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDiscard: () => void;
}) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
					<AlertDialogDescription>
						Continuing will discard the changes you made to this file.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Keep editing</AlertDialogCancel>
					<AlertDialogAction
						variant='destructive'
						onClick={(event) => {
							event.preventDefault();
							onDiscard();
						}}
					>
						Discard changes
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
