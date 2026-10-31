import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Lock, Search, TextSearch } from 'lucide-react';
import type { FileTreeEntry } from '@quarry/shared/types';
import { FileExplorerIcon } from '@/components/settings/file-explorer-icon';
import { Spinner } from '@/components/ui/spinner';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { matchesOrderedTerms } from '@/lib/path-search';
import { getAutoExpandKeys, getTreeNodePadding, removeExpandedSubtree } from '@/lib/tree-expansion';
import { cn } from '@/lib/utils';
import styles from './file-tree.module.css';

export type ContentMatch = {
	count: number;
	line: number;
	text: string;
};

export interface FileSelectionOptions {
	isContentMatch: boolean;
}

interface FileTreeProps {
	entries: FileTreeEntry[];
	selectedPath: string | null;
	onSelectFile: (path: string, options: FileSelectionOptions) => void;
	search: string;
	onSearchChange: (value: string) => void;
	isContentSearchEnabled: boolean;
	onContentSearchEnabledChange: (enabled: boolean) => void;
	contentMatches: Map<string, ContentMatch>;
	isContentSearchPending: boolean;
	contentSearchFailed: boolean;
	contentSearchTruncated: boolean;
}

export function FileTree({
	entries,
	selectedPath,
	onSelectFile,
	search,
	onSearchChange,
	isContentSearchEnabled,
	onContentSearchEnabledChange,
	contentMatches,
	isContentSearchPending,
	contentSearchFailed,
	contentSearchTruncated,
}: FileTreeProps) {
	const isSearching = search.trim().length > 0;
	const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set());
	const filteredEntries = useMemo(() => {
		const terms = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
		return terms.length > 0 ? filterTree(entries, terms, contentMatches) : entries;
	}, [contentMatches, entries, search]);

	useEffect(() => {
		if (isSearching) {
			setExpandedPaths(new Set(getDirectoryPaths(entries)));
		}
	}, [entries, isSearching]);

	useEffect(() => {
		if (!isSearching) {
			setExpandedPaths(new Set());
		}
	}, [isSearching]);

	const handleToggleDirectory = (entry: FileTreeEntry) => {
		setExpandedPaths((currentPaths) => {
			const nextPaths = new Set(currentPaths);

			if (currentPaths.has(entry.path)) {
				removeExpandedSubtree(nextPaths, entry.path, '/');
			} else {
				for (const path of getAutoExpandKeys(entry, FILE_TREE_EXPANSION_ADAPTER)) {
					nextPaths.add(path);
				}
			}

			return nextPaths;
		});
	};

	return (
		<div className={styles.fileTreeDiv}>
			<div className={styles.fileTreeDiv2}>
				<div className={styles.fileTreeDiv3}>
					{isContentSearchPending ? (
						<Spinner className={styles.fileTreeSpinner} />
					) : (
						<Search className={styles.fileTreeSearch} />
					)}
					<input
						type='text'
						value={search}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder='Search files...'
						className={styles.fileTreeInput}
					/>
					<SimpleTooltip
						content={
							<div className={styles.fileTreeDiv4}>
								<span>{isContentSearchEnabled ? 'Searching inside files' : 'Search inside files'}</span>
								<span>Turn off if your project is very large.</span>
							</div>
						}
					>
						<button
							type='button'
							onClick={() => onContentSearchEnabledChange(!isContentSearchEnabled)}
							aria-pressed={isContentSearchEnabled}
							aria-label='Search inside files'
							className={cn(
								styles.fileTreeButton,
								isContentSearchEnabled
									? styles.fileTreeButton2
									: styles.fileTreeButton3,
							)}
						>
							<TextSearch className={styles.fileTreeTextSearch} />
						</button>
					</SimpleTooltip>
				</div>
				<SearchStatusNote
					contentSearchFailed={contentSearchFailed}
					contentSearchTruncated={contentSearchTruncated}
				/>
			</div>
			<div className={styles.fileTreeDiv5}>
				{filteredEntries.length === 0 ? (
					<TreeEmptyState
						contentSearchFailed={contentSearchFailed}
						isContentSearchPending={isContentSearchPending}
					/>
				) : (
					filteredEntries.map((entry) => (
						<FileTreeNode
							key={entry.path}
							entry={entry}
							depth={0}
							selectedPath={selectedPath}
							onSelectFile={onSelectFile}
							contentMatches={contentMatches}
							expandedPaths={expandedPaths}
							onToggleDirectory={handleToggleDirectory}
						/>
					))
				)}
			</div>
		</div>
	);
}

const FILE_TREE_EXPANSION_ADAPTER = {
	getKey: (entry: FileTreeEntry) => entry.path,
	getChildren: (entry: FileTreeEntry) => entry.children ?? [],
	isFolder: (entry: FileTreeEntry) => entry.type === 'directory',
};

function TreeEmptyState({
	contentSearchFailed,
	isContentSearchPending,
}: Pick<FileTreeProps, 'contentSearchFailed' | 'isContentSearchPending'>) {
	if (contentSearchFailed) {
		return null;
	}

	return (
		<div className={styles.treeEmptyStateDiv}>
			{isContentSearchPending ? 'Searching…' : 'No files found'}
		</div>
	);
}

function SearchStatusNote({
	contentSearchFailed,
	contentSearchTruncated,
}: Pick<FileTreeProps, 'contentSearchFailed' | 'contentSearchTruncated'>) {
	const message = contentSearchFailed
		? "Couldn't search file contents."
		: contentSearchTruncated
			? 'Showing partial results.'
			: null;

	return message ? <div className={styles.searchStatusNoteDiv}>{message}</div> : null;
}

interface FileTreeNodeProps {
	entry: FileTreeEntry;
	depth: number;
	selectedPath: string | null;
	onSelectFile: (path: string, options: FileSelectionOptions) => void;
	contentMatches: Map<string, ContentMatch>;
	expandedPaths: Set<string>;
	onToggleDirectory: (entry: FileTreeEntry) => void;
}

function FileTreeNode({
	entry,
	depth,
	selectedPath,
	onSelectFile,
	contentMatches,
	expandedPaths,
	onToggleDirectory,
}: FileTreeNodeProps) {
	const isDirectory = entry.type === 'directory';
	const isExpanded = expandedPaths.has(entry.path);
	const isSelected = entry.path === selectedPath;
	const contentMatch = contentMatches.get(entry.path);

	const handleClick = () => {
		if (isDirectory) {
			onToggleDirectory(entry);
		} else {
			onSelectFile(entry.path, { isContentMatch: contentMatch !== undefined });
		}
	};

	return (
		<div>
			<button
				onClick={handleClick}
				title={contentMatch ? `Line ${contentMatch.line}: ${contentMatch.text}` : undefined}
				className={cn(
					styles.fileTreeNodeButton,
					styles.fileTreeNodeButton2,
					isSelected && styles.fileTreeNodeButton3,
				)}
				style={{ paddingLeft: `${getTreeNodePadding(depth)}px` }}
			>
				{isDirectory ? (
					<>
						<ChevronRight
							className={cn(
								styles.fileTreeNodeChevronRight,
								isExpanded && styles.fileTreeNodeChevronRight2,
							)}
						/>
						<FileExplorerIcon name={entry.name} type='directory' />
					</>
				) : (
					<>
						<span className={styles.fileTreeNodeSpan} />
						<FileExplorerIcon name={entry.name} type='file' />
					</>
				)}
				<span className={styles.fileTreeNodeSpan2}>{entry.name}</span>
				{entry.readOnly && (
					<SimpleTooltip content='Read-only'>
						<Lock className={styles.fileTreeNodeLock} aria-label='Read-only' />
					</SimpleTooltip>
				)}
				{contentMatch && (
					<span className={styles.fileTreeNodeSpan3}>
						{contentMatch.count}
					</span>
				)}
			</button>

			{isDirectory && isExpanded && entry.children && (
				<div>
					{entry.children.map((child) => (
						<FileTreeNode
							key={child.path}
							entry={child}
							depth={depth + 1}
							selectedPath={selectedPath}
							onSelectFile={onSelectFile}
							contentMatches={contentMatches}
							expandedPaths={expandedPaths}
							onToggleDirectory={onToggleDirectory}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function getDirectoryPaths(entries: FileTreeEntry[]): string[] {
	const paths: string[] = [];

	for (const entry of entries) {
		if (entry.type !== 'directory') {
			continue;
		}
		paths.push(entry.path);
		paths.push(...getDirectoryPaths(entry.children ?? []));
	}

	return paths;
}

function filterTree(
	entries: FileTreeEntry[],
	terms: string[],
	contentMatches: Map<string, ContentMatch>,
): FileTreeEntry[] {
	const result: FileTreeEntry[] = [];

	for (const entry of entries) {
		const pathMatch = matchesOrderedTerms(entry.path, terms);

		if (entry.type === 'directory' && entry.children) {
			if (pathMatch) {
				result.push(entry);
			} else {
				const filteredChildren = filterTree(entry.children, terms, contentMatches);
				if (filteredChildren.length > 0) {
					result.push({ ...entry, children: filteredChildren });
				}
			}
		} else if (pathMatch || contentMatches.has(entry.path)) {
			result.push(entry);
		}
	}

	return result;
}
