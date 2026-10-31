import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
	ArrowUp,
	ChevronDown,
	FilePen,
	FilePlus,
	FileX,
	GitBranch,
	GitPullRequest,
	Pencil,
	Plus,
	RefreshCw,
	X,
} from 'lucide-react';
import { ContextWorktreeUpdateDialog, isDirtyWorktreeConflict } from './context-worktree-update-dialog';
import styles from './context-git-panel.module.css';
import type { QueryClient } from '@tanstack/react-query';
import type { ContextChangedFile } from '@quarry/shared/types';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ErrorMessage } from '@/components/ui/error-message';
import { Expandable } from '@/components/ui/expandable';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useSidebarSectionOpen } from '@/hooks/use-sidebar-section-open';
import { cn } from '@/lib/utils';
import { contextExplorerApi } from '@/lib/context-explorer-api';

interface ContextGitPanelProps {
	selectedDiffPath: string | null;
	hasUnsavedFileChanges: boolean;
	onViewDiff: (path: string) => void;
	onCommitted: (paths: string[]) => Promise<void>;
	onDiscarded: (path: string) => Promise<void>;
	onDiscardAll: () => Promise<void>;
	onRepositoryChanged: () => void;
}

type ReviewRequestLink = { kind: 'created'; url: string } | { kind: 'link'; url: string; apiRefused?: boolean };

export function ContextGitPanel({
	selectedDiffPath,
	hasUnsavedFileChanges,
	onViewDiff,
	onCommitted,
	onDiscarded,
	onDiscardAll,
	onRepositoryChanged,
}: ContextGitPanelProps) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const { isOpen, setIsOpen } = useSidebarSectionOpen('context-explorer-git');
	const [selectedPaths, setSelectedPaths] = useState<Set<string>>(() => new Set());
	const [discardFile, setDiscardFile] = useState<ContextChangedFile | null>(null);
	const [isDiscardAllOpen, setIsDiscardAllOpen] = useState(false);
	const [isCreateBranchOpen, setIsCreateBranchOpen] = useState(false);
	const [isUpdateWorktreeOpen, setIsUpdateWorktreeOpen] = useState(false);
	const [isUpdateWorktreeBlocked, setIsUpdateWorktreeBlocked] = useState(false);
	const [newBranchName, setNewBranchName] = useState('');
	const [commitMessage, setCommitMessage] = useState('');
	const [fallbackBaseNotice, setFallbackBaseNotice] = useState(false);
	const [pushedReviewRequest, setPushedReviewRequest] = useState<ReviewRequestLink | null>(null);
	const knownChangedPathsRef = useRef<Set<string>>(new Set());

	const repositoryStatus = useQuery({
		...contextExplorerApi.contextExplorer.getRepositoryStatus.queryOptions(),
		staleTime: 30_000,
	});
	const status = repositoryStatus.data;
	const repo = status?.repo ?? null;
	const branches = status?.branches ?? null;
	const currentBranch = branches?.currentBranch ?? null;
	const defaultBranch = branches?.defaultBranch ?? null;
	const isGitAvailable = status?.gitUnavailableReason === null && branches !== null && repo !== null;

	const changedFiles = useQuery({
		...contextExplorerApi.contextExplorer.getChangedFiles.queryOptions(),
		enabled: isGitAvailable,
	});
	const suggestedBranchName = useQuery({
		...contextExplorerApi.contextExplorer.suggestBranchName.queryOptions(),
		enabled: isGitAvailable && currentBranch === defaultBranch,
	});
	const changedFileList = changedFiles.data ?? [];
	const hasUncommittedChanges = changedFileList.length > 0;
	const hasKnownDirtyWorktree = hasUnsavedFileChanges || hasUncommittedChanges;
	const commitBranchName = suggestedBranchName.data?.trim() || branches?.suggestedBranch.trim() || null;

	useEffect(() => {
		if (!changedFiles.data) {
			return;
		}
		const changedPaths = new Set(changedFiles.data.map((file) => file.path));
		setSelectedPaths((selected) => {
			const next = new Set([...selected].filter((path) => changedPaths.has(path)));
			for (const path of changedPaths) {
				if (!knownChangedPathsRef.current.has(path)) {
					next.add(path);
				}
			}
			return areSetsEqual(selected, next) ? selected : next;
		});
		knownChangedPathsRef.current = changedPaths;
	}, [changedFiles.data]);

	useEffect(() => {
		setPushedReviewRequest(null);
	}, [currentBranch]);

	const refreshExplorer = async (resetViewer: boolean) => {
		await invalidateExplorerQueries(queryClient);
		if (resetViewer) {
			onRepositoryChanged();
		}
	};

	const switchBranch = useMutation(
		contextExplorerApi.contextExplorer.switchBranch.mutationOptions({
			onSuccess: async () => {
				await refreshExplorer(true);
			},
		}),
	);

	const updateWorktree = useMutation(
		contextExplorerApi.contextExplorer.updateWorktree.mutationOptions({
			onSuccess: () => {
				setIsUpdateWorktreeOpen(false);
				setIsUpdateWorktreeBlocked(false);
				onRepositoryChanged();
				void invalidateExplorerQueries(queryClient);
			},
			onError: (error) => {
				if (isDirtyWorktreeConflict(error)) {
					setIsUpdateWorktreeBlocked(true);
				}
			},
		}),
	);

	const createBranch = useMutation(
		contextExplorerApi.contextExplorer.createBranch.mutationOptions({
			onSuccess: async (result) => {
				setIsCreateBranchOpen(false);
				setNewBranchName('');
				setFallbackBaseNotice(result.usedFallbackBase);
				await refreshExplorer(true);
			},
		}),
	);

	const commitChanges = useMutation(
		contextExplorerApi.contextExplorer.commitChanges.mutationOptions({
			onSuccess: async (_result, variables) => {
				await handleCommitSuccess(variables.paths, currentBranch, false);
				await refreshExplorer(false);
			},
		}),
	);

	const createBranchAndCommit = useMutation(
		contextExplorerApi.contextExplorer.createBranchAndCommit.mutationOptions({
			onSuccess: async (result, variables) => {
				await handleCommitSuccess(variables.paths, result.branch, result.usedFallbackBase);
				await refreshExplorer(false);
			},
		}),
	);

	const pushBranch = useMutation(
		contextExplorerApi.contextExplorer.pushBranch.mutationOptions({
			onSuccess: async (result) => {
				setPushedReviewRequest(result.reviewRequest);
				await refreshExplorer(false);
			},
		}),
	);

	const discardChange = useMutation(
		contextExplorerApi.contextExplorer.discardLocalChange.mutationOptions({
			onSuccess: async (_result, variables) => {
				await Promise.all([invalidateExplorerQueries(queryClient), onDiscarded(variables.path)]);
				setDiscardFile(null);
			},
		}),
	);

	const discardAllChanges = useMutation(
		contextExplorerApi.contextExplorer.discardAllChanges.mutationOptions({
			onSuccess: async () => {
				await Promise.all([invalidateExplorerQueries(queryClient), onDiscardAll()]);
				setIsDiscardAllOpen(false);
			},
		}),
	);

	const handleCommitSuccess = async (paths: string[], branch: string | null, usedFallbackBase: boolean) => {
		await onCommitted(paths);
		if (!branch) {
			return;
		}
		setCommitMessage('');
		setSelectedPaths(new Set());
		setFallbackBaseNotice(usedFallbackBase);
	};

	const handleCommit = () => {
		const paths = changedFileList.filter((file) => selectedPaths.has(file.path)).map((file) => file.path);
		const message = commitMessage.trim();
		if (!message || paths.length === 0 || !currentBranch || !defaultBranch) {
			return;
		}
		setFallbackBaseNotice(false);
		commitChanges.reset();
		createBranchAndCommit.reset();
		if (currentBranch === defaultBranch) {
			createBranchAndCommit.mutate({
				branch: commitBranchName || undefined,
				paths,
				message,
			});
			return;
		}
		commitChanges.mutate({ paths, message });
	};

	const handlePush = () => {
		setPushedReviewRequest(null);
		pushBranch.reset();
		pushBranch.mutate();
	};

	const openGitSettings = () => navigate({ to: '/settings/git' });

	const togglePath = (path: string) => {
		setSelectedPaths((current) => {
			const next = new Set(current);
			if (next.has(path)) {
				next.delete(path);
			} else {
				next.add(path);
			}
			return next;
		});
	};

	const toggleAllPaths = () => {
		const changedPaths = changedFileList.map((file) => file.path);
		setSelectedPaths((current) => {
			const allSelected = changedPaths.length > 0 && changedPaths.every((path) => current.has(path));
			return allSelected ? new Set() : new Set(changedPaths);
		});
	};

	const selectedChangedPaths = changedFileList
		.filter((file) => selectedPaths.has(file.path))
		.map((file) => file.path);
	const commitPending = commitChanges.isPending || createBranchAndCommit.isPending;
	const commitError = commitChanges.error?.message ?? createBranchAndCommit.error?.message;
	const branchChangeDisabled =
		changedFiles.isLoading ||
		changedFiles.isError ||
		hasUncommittedChanges ||
		hasUnsavedFileChanges ||
		switchBranch.isPending ||
		createBranch.isPending ||
		commitPending;
	const branchChangeReason = hasUnsavedFileChanges
		? 'Save or discard the open file before changing branches.'
		: changedFiles.isLoading
			? 'Checking for uncommitted changes before changing branches.'
			: changedFiles.isError
				? 'Reload changed files before changing branches.'
				: hasUncommittedChanges
					? 'Commit or discard changes before switching branches.'
					: null;
	const canCommit =
		selectedChangedPaths.length > 0 &&
		commitMessage.trim().length > 0 &&
		currentBranch !== null &&
		defaultBranch !== null;
	const openReviewRequest = status?.openReviewRequest ?? null;
	const aheadCommitCount = branches?.aheadCommitCount ?? 0;
	const unpushedCommitCount = branches?.unpushedCommitCount ?? 0;
	const isReviewBranch = currentBranch !== null && defaultBranch !== null && currentBranch !== defaultBranch;
	const canPush = isReviewBranch && (unpushedCommitCount > 0 || (aheadCommitCount > 0 && openReviewRequest === null));
	const reviewRequest = pushedReviewRequest ?? openReviewRequest;
	const reviewRequestUrl = reviewRequest?.url ?? null;
	const reviewRequestNumber = reviewRequestUrl ? getReviewRequestNumber(reviewRequestUrl) : null;
	const reviewRequestAbbreviation = repo?.platform === 'gitlab' ? 'MR' : 'PR';
	const reviewRequestName = repo?.platform === 'gitlab' ? 'merge request' : 'pull request';
	const reviewRequestLabel =
		reviewRequest?.kind === 'link'
			? `Open ${reviewRequestAbbreviation}`
			: reviewRequestNumber
				? `#${reviewRequestNumber}`
				: reviewRequestAbbreviation;
	const reviewRequestTitle =
		reviewRequest?.kind === 'link'
			? reviewRequest.apiRefused
				? `Open ${reviewRequestAbbreviation}. The git token cannot open ${reviewRequestName}s, so you can open it yourself.`
				: `Open ${reviewRequestAbbreviation}`
			: `View ${reviewRequestName}${reviewRequestNumber ? ` #${reviewRequestNumber}` : ''}`;
	const discardDisabledReason = hasUnsavedFileChanges
		? 'Save or discard the open file before discarding saved changes.'
		: null;
	const handleOpenReviewRequest = () => {
		if (reviewRequestUrl) {
			window.open(reviewRequestUrl, '_blank', 'noopener,noreferrer');
		}
	};

	return (
		<div className={styles.contextGitPanelDiv}>
			<Expandable
				title={
					<span className={styles.contextGitPanelSpan}>
						<GitBranch className={styles.contextGitPanelGitBranch} />
						Git
					</span>
				}
				titleAction={
					status?.fileExplorerUpdate?.updateNeeded === true ? (
						<Button
							type='button'
							variant='default'
							size='icon-sm'
							aria-label='Update File Explorer'
							title='Update File Explorer'
							onClick={(event) => {
								event.stopPropagation();
								updateWorktree.reset();
								setIsUpdateWorktreeBlocked(hasKnownDirtyWorktree);
								setIsUpdateWorktreeOpen(true);
							}}
						>
							<RefreshCw />
						</Button>
					) : null
				}
				trailingContent={
					<div className={styles.contextGitPanelDiv2}>
						{isGitAvailable && branches && (
							<BranchMenu
								branches={branches.branches}
								currentBranch={currentBranch}
								defaultBranch={branches.defaultBranch}
								disabled={branchChangeDisabled}
								reason={branchChangeReason}
								onSwitch={(branch) => {
									if (branch !== currentBranch) {
										switchBranch.mutate({ branch });
									}
								}}
								onCreate={() => {
									createBranch.reset();
									setIsCreateBranchOpen(true);
								}}
							/>
						)}
						<ChangedFilesSummary files={changedFileList} />
					</div>
				}
				expanded={isOpen}
				onExpandedChange={setIsOpen}
				variant='plain'
				isLoading={repositoryStatus.isLoading || changedFiles.isLoading}
			>
				<div className={styles.contextGitPanelDiv3}>
					{switchBranch.error && (
						<div className={styles.contextGitPanelDiv4}>
							<ErrorMessage message={switchBranch.error.message} />
						</div>
					)}
					{repositoryStatus.isLoading ? (
						<div className={styles.contextGitPanelDiv5}>
							<Spinner />
						</div>
					) : repositoryStatus.isError ? (
						<div className={styles.contextGitPanelDiv6}>
							<ErrorMessage
								message={repositoryStatus.error.message || 'Failed to load repository status'}
							/>
							<Button variant='outline' size='sm' onClick={() => repositoryStatus.refetch()}>
								Retry
							</Button>
						</div>
					) : !isGitAvailable ? (
						<div className={styles.contextGitPanelDiv4}>
							<UnavailableGit
								message={
									status?.gitUnavailableMessage ?? 'Git actions are unavailable for this project.'
								}
								onSetup={openGitSettings}
							/>
						</div>
					) : (
						<>
							<ChangedFiles
								files={changedFileList}
								selectedPaths={selectedPaths}
								selectedDiffPath={selectedDiffPath}
								actionsDisabledReason={discardDisabledReason}
								isLoading={changedFiles.isLoading}
								error={changedFiles.error?.message}
								onRetry={() => changedFiles.refetch()}
								onViewDiff={onViewDiff}
								onToggle={togglePath}
								onToggleAll={toggleAllPaths}
								onDiscard={(file) => {
									discardChange.reset();
									setDiscardFile(file);
								}}
								onDiscardAll={() => {
									discardAllChanges.reset();
									setIsDiscardAllOpen(true);
								}}
							/>

							{hasUncommittedChanges && (
								<div className={styles.contextGitPanelDiv7}>
									<div className={styles.contextGitPanelDiv8}>
										<div className={styles.contextGitPanelDiv9}>
											<Input
												value={commitMessage}
												onChange={(event) => setCommitMessage(event.target.value)}
												placeholder='Describe the context change'
												aria-label='Commit message'
												disabled={commitPending}
												className={styles.contextGitPanelInput}
											/>
											<Button
												size='sm'
												className={styles.contextGitPanelButton}
												disabled={!canCommit || commitPending}
												isLoading={commitPending}
												onClick={handleCommit}
											>
												Commit
											</Button>
										</div>
										{currentBranch === defaultBranch && commitBranchName && (
											<div className={styles.contextGitPanelDiv10}>
												<p className={styles.contextGitPanelP} title={commitBranchName}>
													Creates branch{' '}
													<span className={styles.contextGitPanelSpan2}>
														{commitBranchName}
													</span>
												</p>
												<Button
													variant='ghost-muted'
													size='icon-sm'
													className={styles.contextGitPanelButton2}
													aria-label='Edit branch name'
													disabled={createBranch.isPending || commitPending}
													onClick={() => {
														createBranch.reset();
														setNewBranchName(commitBranchName);
														setIsCreateBranchOpen(true);
													}}
												>
													<Pencil className={styles.contextGitPanelGitBranch} />
												</Button>
											</div>
										)}
									</div>
									{commitError && <ErrorMessage message={commitError} />}
									{fallbackBaseNotice && (
										<p className={styles.contextGitPanelP2}>
											This branch started from the current version and may need updating before
											review.
										</p>
									)}
								</div>
							)}
							<div className={styles.contextGitPanelDiv11}>
								<div className={styles.contextGitPanelDiv12}>
									<span className={styles.contextGitPanelSpan3}>
										{canPush
											? 'Send committed changes'
											: reviewRequestUrl
												? 'Everything is pushed'
												: 'Nothing to push'}
									</span>
									<div className={styles.contextGitPanelDiv13}>
										{reviewRequestUrl && (
											<Button
												variant='ghost-muted'
												size='sm'
												className={styles.contextGitPanelButton3}
												aria-label={reviewRequestTitle}
												onClick={handleOpenReviewRequest}
											>
												<GitPullRequest className={styles.contextGitPanelGitPullRequest} />
												{reviewRequestLabel}
											</Button>
										)}
										<Button
											variant='secondary'
											size='sm'
											className={styles.contextGitPanelButton3}
											aria-label='Push commits'
											disabled={!canPush || commitPending || pushBranch.isPending}
											isLoading={pushBranch.isPending}
											onClick={handlePush}
										>
											<ArrowUp className={styles.contextGitPanelGitPullRequest} />
											push
										</Button>
									</div>
								</div>
								{!hasUncommittedChanges && fallbackBaseNotice && (
									<p className={styles.contextGitPanelP2}>
										This branch started from the current version and may need updating before
										review.
									</p>
								)}
								{reviewRequest?.kind === 'link' && reviewRequest.apiRefused && (
									<p className={styles.contextGitPanelP2}>
										Branch pushed. The git provider could not create the {reviewRequestName}{' '}
										automatically — click Open {reviewRequestAbbreviation} to finish.
									</p>
								)}
								{pushBranch.error && <ErrorMessage message={pushBranch.error.message} />}
							</div>
						</>
					)}
				</div>
			</Expandable>

			<CreateBranchDialog
				open={isCreateBranchOpen}
				branchName={newBranchName}
				isPending={createBranch.isPending}
				error={createBranch.error?.message}
				onBranchNameChange={setNewBranchName}
				onOpenChange={setIsCreateBranchOpen}
				onCreate={() => createBranch.mutate({ branch: newBranchName.trim() })}
			/>
			<ContextWorktreeUpdateDialog
				open={isUpdateWorktreeOpen}
				branch={status?.fileExplorerUpdate?.branch ?? defaultBranch ?? 'the live branch'}
				isPending={updateWorktree.isPending}
				isBlocked={isUpdateWorktreeBlocked || (isUpdateWorktreeOpen && hasKnownDirtyWorktree)}
				error={updateWorktree.error?.message}
				onOpenChange={(open) => {
					if (!open && !updateWorktree.isPending) {
						setIsUpdateWorktreeOpen(false);
						setIsUpdateWorktreeBlocked(false);
						updateWorktree.reset();
					}
				}}
				onConfirm={() => {
					if (hasKnownDirtyWorktree) {
						setIsUpdateWorktreeBlocked(true);
						return;
					}
					updateWorktree.mutate({ requiredCommits: [] });
				}}
			/>
			<ConfirmationDialog
				open={discardFile !== null}
				title={getSingleDiscardTitle(discardFile)}
				description='Are you sure you want to discard the uncommitted changes to this file?'
				confirmLabel='Discard'
				isPending={discardChange.isPending}
				error={discardChange.error?.message}
				preventCloseWhilePending
				onOpenChange={(open) => {
					if (!open && !discardChange.isPending) {
						setDiscardFile(null);
					}
				}}
				onConfirm={() => {
					if (discardFile) {
						discardChange.mutate({ path: discardFile.path });
					}
				}}
			/>
			<ConfirmationDialog
				open={isDiscardAllOpen}
				title='Discard all changes?'
				description={getDiscardAllDescription(changedFileList.length)}
				confirmLabel='Discard all'
				isPending={discardAllChanges.isPending}
				error={discardAllChanges.error?.message}
				preventCloseWhilePending
				onOpenChange={(open) => {
					if (!open && !discardAllChanges.isPending) {
						setIsDiscardAllOpen(false);
					}
				}}
				onConfirm={() => discardAllChanges.mutate()}
			/>
		</div>
	);
}

function ChangedFilesSummary({ files }: { files: ContextChangedFile[] }) {
	if (files.length === 0) {
		return null;
	}
	let additions = 0;
	let deletions = 0;
	let hasKnownCounts = false;
	let hasUnknownCounts = false;
	for (const file of files) {
		if (file.additions === null || file.deletions === null) {
			hasUnknownCounts = true;
			continue;
		}
		additions += file.additions;
		deletions += file.deletions;
		hasKnownCounts = true;
	}
	return (
		<LineChangeSummary
			additions={hasKnownCounts ? additions : null}
			deletions={hasKnownCounts ? deletions : null}
			hasUnknownCounts={hasUnknownCounts}
		/>
	);
}

function LineChangeSummary({
	additions,
	deletions,
	hasUnknownCounts = additions === null || deletions === null,
}: {
	additions: number | null;
	deletions: number | null;
	hasUnknownCounts?: boolean;
}) {
	const hasKnownCounts = additions !== null && deletions !== null;
	const label = hasKnownCounts
		? `${additions} additions, ${deletions} deletions${hasUnknownCounts ? ', some line counts unavailable' : ''}`
		: 'Line counts unavailable';
	return (
		<span
			className={styles.lineChangeSummarySpan}
			aria-label={label}
			title={hasUnknownCounts ? 'Some line counts are unavailable.' : undefined}
		>
			{hasKnownCounts ? (
				<>
					<span className={styles.lineChangeSummarySpan2} aria-hidden='true'>
						+{additions}
					</span>
					<span className={styles.lineChangeSummarySpan3} aria-hidden='true'>
						−{deletions}
					</span>
					{hasUnknownCounts && (
						<span className={styles.lineChangeSummarySpan4} aria-hidden='true'>
							?
						</span>
					)}
				</>
			) : (
				<span className={styles.lineChangeSummarySpan4} aria-hidden='true'>
					±?
				</span>
			)}
		</span>
	);
}

function BranchMenu({
	branches,
	currentBranch,
	defaultBranch,
	disabled,
	reason,
	onSwitch,
	onCreate,
}: {
	branches: string[];
	currentBranch: string | null;
	defaultBranch: string;
	disabled: boolean;
	reason: string | null;
	onSwitch: (branch: string) => void;
	onCreate: () => void;
}) {
	return (
		<div
			className={styles.branchMenuDiv}
			onClick={(event) => {
				event.stopPropagation();
			}}
		>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant='ghost-muted'
						size='sm'
						className={styles.branchMenuButton}
						aria-label='Current repository branch'
					>
						<span className={styles.branchMenuSpan}>{currentBranch ?? 'Choose branch'}</span>
						<ChevronDown className={styles.branchMenuChevronDown} />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='end' sideOffset={0} className={styles.branchMenuDropdownMenuContent}>
					{branches.map((branch) => (
						<DropdownMenuCheckboxItem
							key={branch}
							checked={branch === currentBranch}
							disabled={disabled}
							onSelect={() => onSwitch(branch)}
						>
							<span className={styles.branchMenuSpan2}>{branch}</span>
							{branch === defaultBranch && <span className={styles.branchMenuSpan3}>(default)</span>}
						</DropdownMenuCheckboxItem>
					))}
					{reason && <div className={styles.branchMenuDiv2}>{reason}</div>}
					<DropdownMenuSeparator />
					<DropdownMenuItem disabled={disabled} onSelect={onCreate}>
						<Plus className={styles.contextGitPanelGitBranch} />
						New branch…
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

function ChangedFiles({
	files,
	selectedPaths,
	selectedDiffPath,
	actionsDisabledReason,
	isLoading,
	error,
	onRetry,
	onViewDiff,
	onToggle,
	onToggleAll,
	onDiscard,
	onDiscardAll,
}: {
	files: ContextChangedFile[];
	selectedPaths: Set<string>;
	selectedDiffPath: string | null;
	actionsDisabledReason: string | null;
	isLoading: boolean;
	error: string | undefined;
	onRetry: () => void;
	onViewDiff: (path: string) => void;
	onToggle: (path: string) => void;
	onToggleAll: () => void;
	onDiscard: (file: ContextChangedFile) => void;
	onDiscardAll: () => void;
}) {
	const allSelected = files.length > 0 && files.every((file) => selectedPaths.has(file.path));

	return (
		<section aria-label='Changed files' className={styles.changedFilesSection}>
			{files.length > 0 && (
				<div className={styles.changedFilesDiv}>
					<Button variant='ghost-muted' size='sm' className={styles.changedFilesButton} onClick={onToggleAll}>
						<span className={styles.branchMenuSpan}>{allSelected ? 'Select None' : 'Select All'}</span>
					</Button>
					<Button
						variant='ghost-muted'
						size='sm'
						className={styles.changedFilesButton2}
						disabled={actionsDisabledReason !== null}
						onClick={onDiscardAll}
					>
						Discard all
					</Button>
				</div>
			)}
			{files.length > 0 && actionsDisabledReason && (
				<p className={styles.changedFilesP}>{actionsDisabledReason}</p>
			)}
			{isLoading ? (
				<div className={styles.changedFilesDiv2}>
					<Spinner />
				</div>
			) : error ? (
				<div className={styles.contextGitPanelDiv6}>
					<ErrorMessage message={error} />
					<Button variant='outline' size='sm' onClick={onRetry}>
						Retry
					</Button>
				</div>
			) : files.length === 0 ? (
				<p className={styles.changedFilesP2}>Nothing to commit</p>
			) : (
				<div className={styles.changedFilesDiv3}>
					{files.map((file) => (
						<ChangedFileRow
							key={file.path}
							file={file}
							isSelected={selectedPaths.has(file.path)}
							isViewing={selectedDiffPath === file.path}
							discardDisabled={actionsDisabledReason !== null}
							onView={() => onViewDiff(file.path)}
							onToggle={() => onToggle(file.path)}
							onDiscard={() => onDiscard(file)}
						/>
					))}
				</div>
			)}
		</section>
	);
}

function ChangedFileRow({
	file,
	isSelected,
	isViewing,
	discardDisabled,
	onView,
	onToggle,
	onDiscard,
}: {
	file: ContextChangedFile;
	isSelected: boolean;
	isViewing: boolean;
	discardDisabled: boolean;
	onView: () => void;
	onToggle: () => void;
	onDiscard: () => void;
}) {
	const fileName = file.path.split('/').pop() ?? file.path;
	const change = getChangeDisplay(file.kind);
	const ChangeIcon = change.icon;

	return (
		<div className={cn(styles.changedFileRowDiv, isViewing && styles.changedFileRowDiv2)}>
			<Checkbox
				className={styles.changedFileRowCheckbox}
				checked={isSelected}
				onCheckedChange={onToggle}
				aria-label={`${isSelected ? 'Exclude' : 'Include'} ${fileName} in commit`}
			/>
			<button
				type='button'
				onClick={onView}
				aria-label={`View changes to ${fileName}`}
				title={file.path}
				className={styles.changedFileRowButton}
			>
				<ChangeIcon className={cn(styles.changedFileRowChangeIcon, change.color)} />
				<span className={styles.changedFileRowSpan}>{fileName}</span>
				<LineChangeSummary additions={file.additions} deletions={file.deletions} />
				<span className='sr-only'>{change.label}</span>
			</button>
			<Button
				variant='ghost-no-hover'
				size='icon-sm'
				className={styles.changedFileRowButton2}
				aria-label={`Discard changes to ${fileName}`}
				disabled={discardDisabled}
				onClick={onDiscard}
			>
				<X className={styles.changedFileRowX} />
			</Button>
		</div>
	);
}

function UnavailableGit({ message, onSetup }: { message: string; onSetup: () => void }) {
	return (
		<div className={styles.unavailableGitDiv}>
			<p className={styles.unavailableGitP}>{message}</p>
			<Button variant='secondary' size='sm' className={styles.unavailableGitButton} onClick={onSetup}>
				Set up git
			</Button>
		</div>
	);
}

function CreateBranchDialog({
	open,
	branchName,
	isPending,
	error,
	onBranchNameChange,
	onOpenChange,
	onCreate,
}: {
	open: boolean;
	branchName: string;
	isPending: boolean;
	error: string | undefined;
	onBranchNameChange: (value: string) => void;
	onOpenChange: (open: boolean) => void;
	onCreate: () => void;
}) {
	return (
		<Dialog open={open} onOpenChange={(nextOpen) => !isPending && onOpenChange(nextOpen)}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create a branch</DialogTitle>
					<DialogDescription>The new branch starts from the repository's default branch.</DialogDescription>
				</DialogHeader>
				<form
					className={styles.createBranchDialogForm}
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						if (!branchName.trim() || isPending) {
							return;
						}
						onCreate();
					}}
				>
					<div className={styles.createBranchDialogDiv}>
						<label htmlFor='branch-name' className={styles.createBranchDialogLabel}>
							Branch name
						</label>
						<Input
							id='branch-name'
							type='text'
							value={branchName}
							onChange={(event) => onBranchNameChange(event.target.value)}
							placeholder='quarry/context-edits'
							autoFocus
						/>
					</div>
					{error && <p className={styles.createBranchDialogP}>{error}</p>}
					<div className={styles.createBranchDialogDiv2}>
						<Button
							type='button'
							variant='outline'
							className={styles.createBranchDialogButton}
							disabled={isPending}
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type='submit'
							variant='primary-gradient'
							className={styles.createBranchDialogButton2}
							disabled={!branchName.trim() || isPending}
							isLoading={isPending}
						>
							Create branch
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function getSingleDiscardTitle(file: ContextChangedFile | null): string {
	if (!file) {
		return 'Discard changes?';
	}
	const fileName = file.path.split('/').pop() ?? file.path;
	return `Discard ${fileName}?`;
}

function getDiscardAllDescription(changeCount: number): string {
	const fileCount = `${changeCount} ${changeCount === 1 ? 'file' : 'files'}`;
	return `Are you sure you want to discard the uncommitted changes across ${fileCount}?`;
}

function getReviewRequestNumber(url: string): string | null {
	return url.match(/\/(?:pull|pull-requests|merge_requests)\/(\d+)\/?(?:[?#].*)?$/)?.[1] ?? null;
}

function getChangeDisplay(kind: ContextChangedFile['kind']) {
	if (kind === 'untracked') {
		return { icon: FilePlus, label: 'New', color: styles.getChangeDisplayColor };
	}
	if (kind === 'deleted') {
		return { icon: FileX, label: 'Removed', color: styles.getChangeDisplayColor2 };
	}
	return { icon: FilePen, label: 'Edited', color: styles.getChangeDisplayColor3 };
}

export async function invalidateExplorerQueries(queryClient: QueryClient): Promise<void> {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: contextExplorerApi.contextExplorer.getRepositoryStatus.queryKey() }),
		queryClient.invalidateQueries({ queryKey: contextExplorerApi.contextExplorer.getChangedFiles.queryKey() }),
		queryClient.invalidateQueries({ queryKey: contextExplorerApi.contextExplorer.suggestBranchName.queryKey() }),
		queryClient.invalidateQueries({
			queryKey: contextExplorerApi.contextExplorer.getLiveContextPullHistory.queryKey(),
		}),
		queryClient.invalidateQueries({ queryKey: contextExplorerApi.contextExplorer.getFileTree.queryKey() }),
		queryClient.invalidateQueries({ queryKey: contextExplorerApi.contextExplorer.readFile.queryKey() }),
		queryClient.invalidateQueries({ queryKey: contextExplorerApi.contextExplorer.getFileDiff.queryKey() }),
		queryClient.invalidateQueries({ queryKey: contextExplorerApi.contextExplorer.searchContent.queryKey() }),
	]);
}

function areSetsEqual(left: Set<string>, right: Set<string>): boolean {
	return left.size === right.size && [...left].every((value) => right.has(value));
}
