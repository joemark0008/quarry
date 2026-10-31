import { isRootRulesPath, renderConditionalGroupBlocks } from '@quarry/shared/rules-template';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Code, File, Loader2, Save } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDefaultLayout } from 'react-resizable-panels';
import { Streamdown } from 'streamdown';
import { FileExplorerIcon } from './file-explorer-icon';
import { FileSourceEditor } from './file-source-editor';
import { UserGroupPicker } from './user-group-picker';
import styles from './file-viewer.module.css';
import type { UserRulesGroupAccess } from '@quarry/shared/rules-template';
import type { FileEditabilityGuidance } from '@quarry/shared/types';

import type { UserGroupPickerOption } from './user-group-picker';
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
import { ErrorMessage } from '@/components/ui/error-message';
import { ResizablePanel, ResizablePanelGroup, ResizableSeparator } from '@/components/ui/resizable';
import { Spinner } from '@/components/ui/spinner';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { usePreviewHighlights } from '@/hooks/use-preview-highlights';
import { createLocalStorage } from '@/lib/local-storage';
import { joinMarkdownFrontmatter, markdownPlugins, parseMarkdownFrontmatter } from '@/lib/markdown';
import { isMac } from '@/lib/platform';
import { isForbiddenError } from '@/lib/api-error';
import { cn } from '@/lib/utils';
import { contextExplorerApi } from '@/lib/context-explorer-api';
import { markdownLinkSafety } from '@/components/external-link-dialog';

export { isRootRulesPath } from '@quarry/shared/rules-template';

interface FileContents {
	content: string;
	hash: string;
}

export type RulesPreviewGroupsState =
	| { status: 'loading' }
	| { status: 'error' }
	| {
			status: 'ready';
			enforced: boolean;
			groups: UserGroupPickerOption[];
	  };

interface FileViewerProps {
	filePath: string | null;
	content: string | undefined;
	hash: string | undefined;
	isLoading: boolean;
	isError: boolean;
	isEditable: boolean;
	editabilityGuidance: FileEditabilityGuidance | null;
	searchQuery: string;
	sourceAutoOpenRequestId: number | null;
	onDirtyChange: (isDirty: boolean) => void;
	onOpenGuidancePath: (path: string, kind: 'file' | 'route') => void;
	onReload: () => Promise<FileContents | undefined>;
	rulesPreviewGroups: RulesPreviewGroupsState;
}

interface FileSaveError {
	message: string;
	isConflict: boolean;
}

const markdownSourceStorage = createLocalStorage<boolean>('quarry-file-viewer-markdown-source-open', false);

export function FileViewer({
	filePath,
	content,
	hash,
	isLoading,
	isError,
	isEditable,
	editabilityGuidance,
	searchQuery,
	sourceAutoOpenRequestId,
	onDirtyChange,
	onOpenGuidancePath,
	onReload,
	rulesPreviewGroups,
}: FileViewerProps) {
	if (!filePath) {
		return (
			<div className={styles.fileViewerDiv}>
				<File className={styles.fileViewerFile} />
				<p className={styles.fileViewerP}>Select a file to view its contents</p>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className={styles.fileViewerDiv2}>
				<Spinner />
			</div>
		);
	}

	if (isError || content === undefined || hash === undefined) {
		return (
			<div className={styles.fileViewerDiv}>
				<p className={styles.fileViewerP}>Failed to load file</p>
			</div>
		);
	}

	return (
		<EditableFileViewer
			key={filePath}
			filePath={filePath}
			content={content}
			hash={hash}
			isEditable={isEditable}
			editabilityGuidance={editabilityGuidance}
			searchQuery={searchQuery}
			sourceAutoOpenRequestId={sourceAutoOpenRequestId}
			onDirtyChange={onDirtyChange}
			onOpenGuidancePath={onOpenGuidancePath}
			onReload={onReload}
			rulesPreviewGroups={rulesPreviewGroups}
		/>
	);
}

function EditableFileViewer({
	filePath,
	content,
	hash,
	isEditable,
	editabilityGuidance,
	searchQuery,
	sourceAutoOpenRequestId,
	onDirtyChange,
	onOpenGuidancePath,
	onReload,
	rulesPreviewGroups,
}: Pick<
	FileViewerProps,
	| 'filePath'
	| 'content'
	| 'hash'
	| 'isEditable'
	| 'editabilityGuidance'
	| 'searchQuery'
	| 'sourceAutoOpenRequestId'
	| 'onDirtyChange'
	| 'onOpenGuidancePath'
	| 'onReload'
	| 'rulesPreviewGroups'
> & {
	filePath: string;
	content: string;
	hash: string;
}) {
	const queryClient = useQueryClient();
	const [isSourceOpenPreference, setIsSourceOpenPreference] = useLocalStorage(markdownSourceStorage);
	const [isSourceAutoOpened, setIsSourceAutoOpened] = useState(sourceAutoOpenRequestId !== null);
	const [draft, setDraft] = useState(content);
	const [savedContent, setSavedContent] = useState(content);
	const [expectedHash, setExpectedHash] = useState(hash);
	const [saveError, setSaveError] = useState<FileSaveError | null>(null);
	const [isReloadDialogOpen, setIsReloadDialogOpen] = useState(false);
	const [isReloading, setIsReloading] = useState(false);
	const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
	const activePathRef = useRef(filePath);
	const saveInProgressRef = useRef(false);
	activePathRef.current = filePath;

	const saveMutation = useMutation(contextExplorerApi.contextExplorer.writeFile.mutationOptions());
	const isMarkdown = isMarkdownPath(filePath);
	const isRootRules = isRootRulesPath(filePath);
	const isSourceOpen = isSourceOpenPreference || isSourceAutoOpened;
	const isDirty = isEditable && draft !== savedContent;
	const debouncedPreview = useDebouncedValue(draft, 250);
	const parsedMarkdownDraft = useMemo(() => parseMarkdownFrontmatter(draft), [draft]);
	const rulesGroupAccess = useMemo(
		() => getRulesGroupAccess(isRootRules, rulesPreviewGroups, selectedGroupIds),
		[isRootRules, rulesPreviewGroups, selectedGroupIds],
	);
	const preview = useMemo(
		() => renderRulesPreview(debouncedPreview, isRootRules, rulesGroupAccess),
		[debouncedPreview, isRootRules, rulesGroupAccess],
	);
	const tokenPreview = useMemo(
		() => renderRulesPreview(draft, isRootRules, rulesGroupAccess),
		[draft, isRootRules, rulesGroupAccess],
	);
	const estimatedTokenCount = useMemo(() => Math.ceil(tokenPreview.content.length / 4), [tokenPreview.content]);
	const { defaultLayout, onLayoutChanged } = useDefaultLayout({
		id: 'context-explorer-source',
		storage: localStorage,
	});

	useEffect(() => {
		if (isDirty) {
			return;
		}
		setDraft(content);
		setSavedContent(content);
		setExpectedHash(hash);
		setSaveError(null);
	}, [content, hash, isDirty]);

	useEffect(() => {
		if (sourceAutoOpenRequestId !== null) {
			setIsSourceAutoOpened(true);
		}
	}, [sourceAutoOpenRequestId]);

	useEffect(() => {
		if (searchQuery.length < 2) {
			setIsSourceAutoOpened(false);
		}
	}, [searchQuery]);

	useEffect(() => {
		onDirtyChange(isDirty);
		return () => {
			if (isDirty) {
				onDirtyChange(false);
			}
		};
	}, [isDirty, onDirtyChange]);

	const handleSave = useCallback(() => {
		if (!isEditable || !isDirty || saveMutation.isPending || saveInProgressRef.current) {
			return;
		}

		const pathToSave = filePath;
		const contentToSave = draft;
		saveInProgressRef.current = true;
		setSaveError(null);
		saveMutation.mutate(
			{ path: pathToSave, content: contentToSave, expectedHash },
			{
				onSuccess: (result) => {
					saveInProgressRef.current = false;
					queryClient.setQueryData(
						contextExplorerApi.contextExplorer.readFile.queryOptions({ path: pathToSave }).queryKey,
						(previous) =>
							previous ? { ...previous, content: contentToSave, hash: result.hash } : previous,
					);
					if (activePathRef.current === pathToSave) {
						setSavedContent(contentToSave);
						setExpectedHash(result.hash);
						setSaveError(null);
					}
					void queryClient.invalidateQueries({
						queryKey: contextExplorerApi.contextExplorer.getChangedFiles.queryKey(),
					});
				},
				onError: (error) => {
					saveInProgressRef.current = false;
					if (isForbiddenError(error)) {
						void queryClient.invalidateQueries({
							queryKey: contextExplorerApi.contextExplorer.readFile.queryOptions({ path: pathToSave })
								.queryKey,
						});
						return;
					}
					if (activePathRef.current === pathToSave) {
						setSaveError({
							message: getErrorMessage(error, 'Failed to save file'),
							isConflict: isConflictError(error),
						});
					}
				},
			},
		);
	}, [draft, expectedHash, filePath, isDirty, isEditable, queryClient, saveMutation]);

	const handleReload = useCallback(async () => {
		setIsReloading(true);
		try {
			const reloadedFile = await onReload();
			if (!reloadedFile) {
				throw new Error('Failed to reload file');
			}
			setDraft(reloadedFile.content);
			setSavedContent(reloadedFile.content);
			setExpectedHash(reloadedFile.hash);
			setSaveError(null);
			setIsReloadDialogOpen(false);
		} catch (error) {
			setSaveError({
				message: getErrorMessage(error, 'Failed to reload file'),
				isConflict: true,
			});
			setIsReloadDialogOpen(false);
		} finally {
			setIsReloading(false);
		}
	}, [onReload]);

	const handleSourceToggle = () => {
		setIsSourceOpenPreference(!isSourceOpen);
		setIsSourceAutoOpened(false);
	};

	const handleMarkdownChange = useCallback(
		(nextBody: string) => {
			setDraft(joinMarkdownFrontmatter(parsedMarkdownDraft.frontmatter, nextBody));
		},
		[parsedMarkdownDraft.frontmatter],
	);

	const fileName = getFileName(filePath);
	const showRulesPreviewToolbar = isRootRules && rulesPreviewGroups.status === 'ready' && rulesPreviewGroups.enforced;
	const rulesPreviewStatus =
		isRootRules && rulesPreviewGroups.status !== 'ready' ? rulesPreviewGroups.status : undefined;

	return (
		<div className={styles.editableFileViewerDiv}>
			<div className={styles.editableFileViewerDiv2}>
				<div className={styles.editableFileViewerDiv3}>
					<FileExplorerIcon
						name={fileName}
						type='file'
						className={styles.editableFileViewerFileExplorerIcon}
					/>
					<div className={styles.editableFileViewerDiv4}>
						<div className={styles.editableFileViewerDiv5}>
							<span className={styles.editableFileViewerSpan}>{fileName}</span>
							{rulesPreviewStatus === undefined && <TokenEstimate count={estimatedTokenCount} />}
						</div>
						<span className={styles.editableFileViewerSpan2}>{filePath}</span>
					</div>
				</div>
				{(isEditable || isMarkdown) && (
					<div className={styles.editableFileViewerDiv6}>
						{isEditable && isDirty && (
							<span className={styles.editableFileViewerSpan3}>
								<span className={styles.editableFileViewerSpan4} />
								Unsaved
							</span>
						)}
						{isMarkdown && parsedMarkdownDraft.label !== null && (
							<span className={styles.editableFileViewerSpan5}>{parsedMarkdownDraft.label}</span>
						)}
						{isMarkdown && <SourceToggle isOpen={isSourceOpen} onChange={handleSourceToggle} />}
						{isEditable && (
							<Button
								type='button'
								size='sm'
								className={styles.editableFileViewerButton}
								onClick={handleSave}
								disabled={!isDirty || saveMutation.isPending}
							>
								{saveMutation.isPending ? (
									<Loader2 className={styles.editableFileViewerLoader2} />
								) : (
									<Save className={styles.editableFileViewerSave} />
								)}
								Save
								<kbd className={styles.editableFileViewerKbd}>{isMac ? '⌘S' : 'Ctrl+S'}</kbd>
							</Button>
						)}
					</div>
				)}
			</div>
			{showRulesPreviewToolbar && (
				<RulesPreviewToolbar
					groups={rulesPreviewGroups.groups}
					selectedGroupIds={selectedGroupIds}
					onSelectedGroupIdsChange={setSelectedGroupIds}
				/>
			)}
			{!isEditable && editabilityGuidance && (
				<ReadOnlyNote guidance={editabilityGuidance} onOpenPath={onOpenGuidancePath} />
			)}
			{isEditable && saveError && (
				<div className={styles.editableFileViewerDiv7}>
					<div className={styles.editableFileViewerDiv4}>
						<ErrorMessage message={saveError.message} />
					</div>
					{saveError.isConflict && (
						<Button type='button' variant='outline' size='sm' onClick={() => setIsReloadDialogOpen(true)}>
							Reload file
						</Button>
					)}
				</div>
			)}
			<div className={styles.editableFileViewerDiv8}>
				{isMarkdown ? (
					isSourceOpen ? (
						<ResizablePanelGroup
							orientation='horizontal'
							defaultLayout={defaultLayout ?? { preview: 1, source: 1 }}
							onLayoutChanged={onLayoutChanged}
						>
							<ResizablePanel id='preview' minSize={180}>
								<MarkdownPreview
									content={preview.content}
									filePath={filePath}
									searchQuery={searchQuery}
									error={preview.error}
									status={rulesPreviewStatus}
								/>
							</ResizablePanel>
							<ResizableSeparator withHandle />
							<ResizablePanel id='source' minSize={180}>
								<FileSourceEditor
									key={isEditable ? 'editable' : 'read-only'}
									filePath={filePath}
									value={parsedMarkdownDraft.body}
									searchQuery={searchQuery}
									readOnly={!isEditable}
									onChange={handleMarkdownChange}
									onSave={isEditable ? handleSave : undefined}
								/>
							</ResizablePanel>
						</ResizablePanelGroup>
					) : (
						<MarkdownPreview
							content={preview.content}
							filePath={filePath}
							searchQuery={searchQuery}
							error={preview.error}
							status={rulesPreviewStatus}
						/>
					)
				) : (
					<FileSourceEditor
						key={isEditable ? 'editable' : 'read-only'}
						filePath={filePath}
						value={draft}
						searchQuery={searchQuery}
						readOnly={!isEditable}
						onChange={setDraft}
						onSave={isEditable ? handleSave : undefined}
					/>
				)}
			</div>
			<AlertDialog open={isReloadDialogOpen} onOpenChange={setIsReloadDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Reload this file?</AlertDialogTitle>
						<AlertDialogDescription>
							The file changed on disk. Reloading it will discard your unsaved changes.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isReloading}>Keep editing</AlertDialogCancel>
						<AlertDialogAction
							variant='destructive'
							isLoading={isReloading}
							disabled={isReloading}
							onClick={(event) => {
								event.preventDefault();
								void handleReload();
							}}
						>
							Discard and reload
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function ReadOnlyNote({
	guidance,
	onOpenPath,
}: {
	guidance: FileEditabilityGuidance;
	onOpenPath: (path: string, kind: 'file' | 'route') => void;
}) {
	const handleOpenPath = () => {
		if (guidance.actionPath) {
			onOpenPath(guidance.actionPath, guidance.actionKind);
		}
	};

	return (
		<div className={styles.readOnlyNoteDiv}>
			<span>{guidance.message}</span>
			{guidance.actionPath && (
				<button type='button' role='link' className={styles.readOnlyNoteButton} onClick={handleOpenPath}>
					{guidance.actionLabel ?? 'Open file'}
				</button>
			)}
		</div>
	);
}

function MarkdownPreview({
	content,
	filePath,
	searchQuery,
	error,
	status,
}: {
	content: string;
	filePath: string;
	searchQuery: string;
	error?: string;
	status?: 'loading' | 'error';
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const parsedMarkdown = useMemo(() => parseMarkdownFrontmatter(content), [content]);
	usePreviewHighlights({ containerRef, content: parsedMarkdown.body, filePath, searchQuery });

	return (
		<section aria-label='Markdown preview' className={styles.markdownPreviewSection}>
			<div ref={containerRef} className={styles.markdownPreviewDiv}>
				<div className={styles.markdownPreviewDiv2}>
					{status === 'loading' ? (
						<p className={styles.markdownPreviewP}>Loading RULES.md preview access...</p>
					) : status === 'error' ? (
						<ErrorMessage message='Failed to load RULES.md preview access.' />
					) : error ? (
						<ErrorMessage message={error} />
					) : (
						<Streamdown
							linkSafety={markdownLinkSafety}
							mode='static'
							controls={false}
							plugins={markdownPlugins}
						>
							{parsedMarkdown.body}
						</Streamdown>
					)}
				</div>
			</div>
		</section>
	);
}

function RulesPreviewToolbar({
	groups,
	selectedGroupIds,
	onSelectedGroupIdsChange,
}: {
	groups: UserGroupPickerOption[];
	selectedGroupIds: string[];
	onSelectedGroupIdsChange: (groupIds: string[]) => void;
}) {
	return (
		<div role='toolbar' aria-label='Rules preview options' className={styles.rulesPreviewToolbarDiv}>
			<span className={styles.rulesPreviewToolbarSpan}>Preview as</span>
			<UserGroupPicker
				groups={groups}
				selectedGroupIds={selectedGroupIds}
				compact
				onSelectedGroupIdsChange={onSelectedGroupIdsChange}
			/>
		</div>
	);
}

function SourceToggle({ isOpen, onChange }: { isOpen: boolean; onChange: () => void }) {
	return (
		<SimpleTooltip content={isOpen ? 'Hide markdown source' : 'Show markdown source'}>
			<Button
				type='button'
				variant='outline'
				size='sm'
				className={cn(styles.editableFileViewerButton, isOpen && styles.sourceToggleButton)}
				onClick={onChange}
				aria-pressed={isOpen}
				aria-label={isOpen ? 'Hide markdown source' : 'Show markdown source'}
			>
				<Code className={styles.editableFileViewerSave} />
				Source
			</Button>
		</SimpleTooltip>
	);
}

function TokenEstimate({ count }: { count: number }) {
	return (
		<SimpleTooltip content="Estimated tokens this file uses in the agent's context. It is approximated from the character count, not counted exactly.">
			<span className={styles.tokenEstimateSpan}>{formatTokenCount(count)} tokens</span>
		</SimpleTooltip>
	);
}

function isMarkdownPath(filePath: string): boolean {
	const extension = filePath.split('.').pop()?.toLowerCase();
	return extension === 'md' || extension === 'mdx' || extension === 'markdown';
}

function getRulesGroupAccess(
	isRootRules: boolean,
	rulesPreviewGroups: FileViewerProps['rulesPreviewGroups'],
	selectedGroupIds: string[],
): UserRulesGroupAccess | null {
	if (!isRootRules) {
		return { enforced: false };
	}
	if (rulesPreviewGroups.status !== 'ready') {
		return null;
	}
	if (!rulesPreviewGroups.enforced) {
		return { enforced: false };
	}
	return {
		enforced: true,
		groupNames: rulesPreviewGroups.groups
			.filter((group) => group.isDefault || selectedGroupIds.includes(group.id))
			.map((group) => group.name),
	};
}

function renderRulesPreview(
	content: string,
	isRootRules: boolean,
	groupAccess: UserRulesGroupAccess | null,
): { content: string; error?: string } {
	if (!isRootRules) {
		return { content };
	}
	if (!groupAccess) {
		return { content: '' };
	}
	try {
		return { content: renderConditionalGroupBlocks(content, groupAccess) };
	} catch (error) {
		return {
			content: '',
			error: error instanceof Error ? error.message : 'RULES.md preview could not be rendered.',
		};
	}
}

function getFileName(filePath: string): string {
	return filePath.replaceAll('\\', '/').split('/').pop() ?? filePath;
}

function formatTokenCount(count: number): string {
	if (count < 1_000) {
		return count.toLocaleString();
	}
	if (count < 1_000_000) {
		const thousands = Math.min(count / 1_000, 999.9);
		return `${thousands.toFixed(1).replace(/\.0$/, '')}k`;
	}
	return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

function getErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}
	return fallback;
}

function isConflictError(error: unknown): boolean {
	if (!error || typeof error !== 'object') {
		return false;
	}
	const apiError = error as {
		data?: { code?: string };
		shape?: { data?: { code?: string } };
		message?: string;
	};
	return (
		apiError.data?.code === 'CONFLICT' ||
		apiError.shape?.data?.code === 'CONFLICT' ||
		apiError.message === 'This file changed on disk. Reload it before saving your changes.'
	);
}
