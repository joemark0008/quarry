import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { ContextWorktreeUpdateDialog, isDirtyWorktreeConflict } from './context-worktree-update-dialog';
import styles from './live-context-update-settings.module.css';
import type { QueryClient } from '@tanstack/react-query';
import type { LiveContextRepository } from '@/lib/live-context-links';

import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { ErrorMessage } from '@/components/ui/error-message';
import { SettingsCard } from '@/components/ui/settings-card';
import {
	formatChangedFileCount,
	getHiddenPullFileCount,
	getVisiblePullFiles,
	hasHistoricalPullRange,
} from '@/lib/live-context-history';
import { buildCommitUrl } from '@/lib/live-context-links';
import { contextExplorerApi } from '@/lib/context-explorer-api';

interface LiveContextUpdateStatus {
	enabled: boolean;
	available: boolean;
	configuredBranch: string;
	unavailableReason: string | null;
	configurationError: string | null;
}

interface LiveContextUpdateSettingsProps {
	status: LiveContextUpdateStatus;
	repository: LiveContextRepository | null;
	isAdmin: boolean;
}

interface PullHistoryEntry {
	id: string;
	status: string;
	startedAt: Date;
	completedAt: Date | null;
	changed: boolean | null;
	oldCommit: string | null;
	newCommit: string | null;
	fileCount: number;
	files: Array<{ path: string; additions: number | null; deletions: number | null }>;
	errorMessage: string | null;
	fileExplorerAction: HistoricalDiffAction;
}

type HistoricalDiffAction = 'open' | 'switch' | 'update' | 'blocked';

export function LiveContextUpdateSettings({ status, repository, isAdmin }: LiveContextUpdateSettingsProps) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const [pendingHistoricalDiff, setPendingHistoricalDiff] = useState<{
		path: string;
		from: string;
		to: string;
	} | null>(null);
	const [historicalDiffError, setHistoricalDiffError] = useState<string | null>(null);
	const [isDirtyWorktreeDialogOpen, setIsDirtyWorktreeDialogOpen] = useState(false);
	const [isWorktreeUpdateBlocked, setIsWorktreeUpdateBlocked] = useState(false);
	const [isCheckingHistoricalDiff, setIsCheckingHistoricalDiff] = useState(false);
	const history = useQuery(contextExplorerApi.contextExplorer.getLiveContextPullHistory.queryOptions());
	const pullContext = useMutation(
		contextExplorerApi.contextExplorer.pullLiveContext.mutationOptions({
			onSettled: async () => {
				await invalidateContextQueries(queryClient);
			},
		}),
	);
	const updateWorktree = useMutation(contextExplorerApi.contextExplorer.updateWorktree.mutationOptions());
	const latestRecordedError = history.data?.[0]?.status === 'failed' ? history.data[0].errorMessage : null;

	const navigateToHistoricalDiff = (input: { path: string; from: string; to: string }) => {
		queryClient.removeQueries({
			queryKey: contextExplorerApi.contextExplorer.getFileDiff.queryKey(input),
			exact: true,
		});
		return navigate({
			to: '/settings/context-explorer',
			search: input,
		});
	};

	const openHistoricalDiff = async (input: { path: string; from: string; to: string }) => {
		setHistoricalDiffError(null);
		setIsCheckingHistoricalDiff(true);
		let action: HistoricalDiffAction;
		try {
			action = await queryClient.fetchQuery({
				...contextExplorerApi.contextExplorer.getHistoricalDiffAction.queryOptions({
					from: input.from,
					to: input.to,
				}),
				staleTime: 0,
			});
		} catch (error) {
			setHistoricalDiffError(error instanceof Error ? error.message : 'This historical change is unavailable.');
			setIsCheckingHistoricalDiff(false);
			return;
		}
		setIsCheckingHistoricalDiff(false);
		if (action === 'open') {
			void navigateToHistoricalDiff(input);
		} else if (action === 'switch') {
			void switchAndOpenHistoricalDiff(input);
		} else if (action === 'blocked') {
			setIsDirtyWorktreeDialogOpen(true);
		} else {
			updateWorktree.reset();
			setIsWorktreeUpdateBlocked(false);
			setPendingHistoricalDiff(input);
		}
	};

	const switchAndOpenHistoricalDiff = async (input: { path: string; from: string; to: string }) => {
		updateWorktree.reset();
		try {
			await updateWorktree.mutateAsync({ requiredCommits: [input.from, input.to] });
			await navigateToHistoricalDiff(input);
			void invalidateContextQueries(queryClient);
		} catch (error) {
			if (isDirtyWorktreeConflict(error)) {
				setIsDirtyWorktreeDialogOpen(true);
				return;
			}
			setHistoricalDiffError(error instanceof Error ? error.message : 'Unable to open this historical change.');
		}
	};

	const confirmWorktreeUpdate = async () => {
		if (!pendingHistoricalDiff) {
			return;
		}
		try {
			await updateWorktree.mutateAsync({
				requiredCommits: [pendingHistoricalDiff.from, pendingHistoricalDiff.to],
			});
			const target = pendingHistoricalDiff;
			setPendingHistoricalDiff(null);
			setIsWorktreeUpdateBlocked(false);
			await navigateToHistoricalDiff(target);
			void invalidateContextQueries(queryClient);
		} catch (error) {
			if (isDirtyWorktreeConflict(error)) {
				setIsWorktreeUpdateBlocked(true);
			}
			return;
		}
	};

	return (
		<SettingsCard
			title='Update context files'
			icon={<RefreshCw className={styles.liveContextUpdateSettingsRefreshCw} />}
			description={`Pull the latest changes from ${status.configuredBranch}`}
			rootClassName={styles.liveContextUpdateSettingsSettingsCard}
			action={
				<Button
					size='sm'
					variant='primary-gradient'
					isLoading={pullContext.isPending}
					disabled={!isAdmin || !status.available || pullContext.isPending}
					onClick={() => {
						pullContext.reset();
						pullContext.mutate();
					}}
				>
					Pull latest
				</Button>
			}
			className={styles.liveContextUpdateSettingsSettingsCard2}
		>
			{!isAdmin && (
				<p className={styles.liveContextUpdateSettingsP}>Only a project admin can update live context files.</p>
			)}
			{isAdmin && !status.available && status.unavailableReason && (
				<p className={styles.liveContextUpdateSettingsP}>{status.unavailableReason}</p>
			)}
			{pullContext.error && latestRecordedError !== pullContext.error.message && (
				<ErrorMessage message={pullContext.error.message} />
			)}
			{historicalDiffError && <ErrorMessage message={historicalDiffError} />}
			{history.isLoading ? (
				<p className={styles.liveContextUpdateSettingsP}>Loading pull history…</p>
			) : history.error ? (
				<ErrorMessage message={history.error.message} />
			) : history.data?.length === 0 ? (
				<p className={styles.liveContextUpdateSettingsP}>
					No pulls yet. Pull the latest version to check for updates.
				</p>
			) : (
				<div className={styles.liveContextUpdateSettingsDiv}>
					{history.data?.map((activity) => (
						<HistoryEntry
							key={activity.id}
							activity={activity}
							repository={repository}
							isOpeningHistoricalDiff={
								isCheckingHistoricalDiff ||
								pendingHistoricalDiff !== null ||
								isDirtyWorktreeDialogOpen ||
								updateWorktree.isPending
							}
							onOpenHistoricalDiff={openHistoricalDiff}
						/>
					))}
				</div>
			)}
			<ContextWorktreeUpdateDialog
				open={pendingHistoricalDiff !== null}
				branch={status.configuredBranch}
				isPending={updateWorktree.isPending}
				isBlocked={isWorktreeUpdateBlocked}
				error={updateWorktree.error?.message}
				onOpenChange={(open) => {
					if (!open && !updateWorktree.isPending) {
						setPendingHistoricalDiff(null);
						setIsWorktreeUpdateBlocked(false);
						updateWorktree.reset();
					}
				}}
				onConfirm={confirmWorktreeUpdate}
				onBlockedAction={() => navigate({ to: '/settings/context-explorer' })}
			/>
			<ConfirmationDialog
				open={isDirtyWorktreeDialogOpen}
				title='Finish your changes first'
				description='File Explorer has uncommitted changes. Commit or discard them before viewing these changes.'
				confirmLabel='Open File Explorer'
				confirmVariant='primary-gradient'
				onOpenChange={setIsDirtyWorktreeDialogOpen}
				onConfirm={() => {
					setIsDirtyWorktreeDialogOpen(false);
					void navigate({ to: '/settings/context-explorer' });
				}}
			/>
		</SettingsCard>
	);
}

function HistoryEntry({
	activity,
	repository,
	isOpeningHistoricalDiff,
	onOpenHistoricalDiff,
}: {
	activity: PullHistoryEntry;
	repository: LiveContextRepository | null;
	isOpeningHistoricalDiff: boolean;
	onOpenHistoricalDiff: (input: { path: string; from: string; to: string }) => Promise<void>;
}) {
	const [isExpanded, setIsExpanded] = useState(false);
	const timestamp = activity.completedAt ?? activity.startedAt;
	const hasCompletedDiff = activity.status === 'completed' && activity.changed !== null;

	return (
		<div className={styles.historyEntryDiv}>
			<div className={styles.historyEntryDiv2}>
				<div className={styles.historyEntryDiv3}>
					<span>{getStatusText(activity)}</span>
					{hasCompletedDiff && activity.newCommit && (
						<CommitReference repository={repository} commit={activity.newCommit} />
					)}
				</div>
				<time dateTime={new Date(timestamp).toISOString()} className={styles.historyEntryTime}>
					{new Date(timestamp).toLocaleString()}
				</time>
			</div>
			{hasCompletedDiff && activity.fileCount > 0 ? (
				<p className={styles.historyEntryP}>{formatChangedFileCount(activity.fileCount)}</p>
			) : hasCompletedDiff ? (
				<div className={styles.historyEntryDiv4} aria-hidden='true' />
			) : null}
			{activity.status === 'failed' && activity.errorMessage && (
				<p className={styles.historyEntryP2}>{activity.errorMessage}</p>
			)}
			{hasCompletedDiff && activity.files.length > 0 && (
				<PullFileList
					files={activity.files}
					from={activity.oldCommit}
					to={activity.newCommit}
					isExpanded={isExpanded}
					onExpandedChange={setIsExpanded}
					isOpeningHistoricalDiff={isOpeningHistoricalDiff}
					onOpenHistoricalDiff={onOpenHistoricalDiff}
				/>
			)}
		</div>
	);
}

function getStatusText(activity: PullHistoryEntry): string {
	if (activity.status === 'failed') {
		return 'Pull failed';
	}
	if (activity.status === 'running') {
		return 'Pull in progress';
	}
	if (activity.status === 'cancelled') {
		return 'Pull cancelled';
	}
	if (activity.changed === null) {
		return 'Pull completed';
	}
	return activity.changed ? 'Pulled latest commit' : 'Already up to date';
}

function CommitReference({ repository, commit }: { repository: LiveContextRepository | null; commit: string }) {
	const shortCommit = commit.slice(0, 7);
	const url = repository ? buildCommitUrl(repository, commit) : null;
	const className = styles.className;
	if (!url) {
		return <span className={className}>{shortCommit}</span>;
	}
	return (
		<a
			href={url}
			target='_blank'
			rel='noreferrer'
			className={`${className} ${styles.commitReferenceA}`}
			aria-label={`View commit ${shortCommit}`}
		>
			{shortCommit}
		</a>
	);
}

function PullFileList({
	files,
	from,
	to,
	isExpanded,
	onExpandedChange,
	isOpeningHistoricalDiff,
	onOpenHistoricalDiff,
}: {
	files: Array<{ path: string; additions: number | null; deletions: number | null }>;
	from: string | null;
	to: string | null;
	isExpanded: boolean;
	onExpandedChange: (expanded: boolean) => void;
	isOpeningHistoricalDiff: boolean;
	onOpenHistoricalDiff: (input: { path: string; from: string; to: string }) => Promise<void>;
}) {
	const visibleFiles = getVisiblePullFiles(files, isExpanded);
	const hiddenFileCount = getHiddenPullFileCount(files.length);

	return (
		<div className={styles.pullFileListDiv}>
			<ul className={styles.pullFileListUl}>
				{visibleFiles.map((file) => (
					<li key={file.path} className={styles.pullFileListLi}>
						{hasHistoricalPullRange(from, to) && from && to ? (
							<button
								type='button'
								className={styles.pullFileListButton}
								aria-label={`Open ${file.path} in File Explorer`}
								disabled={isOpeningHistoricalDiff}
								onClick={() => {
									void onOpenHistoricalDiff({ path: file.path, from, to });
								}}
							>
								{file.path}
							</button>
						) : (
							<span className={styles.pullFileListSpan}>{file.path}</span>
						)}
						<span className={styles.pullFileListSpan2}>
							{file.additions === null || file.deletions === null ? (
								<span className={styles.pullFileListSpan3}>binary</span>
							) : (
								<>
									<span className={styles.pullFileListSpan4}>+{file.additions}</span>{' '}
									<span className={styles.pullFileListSpan5}>−{file.deletions}</span>
								</>
							)}
						</span>
					</li>
				))}
			</ul>
			{hiddenFileCount > 0 && (
				<button
					type='button'
					className={styles.pullFileListButton2}
					aria-expanded={isExpanded}
					onClick={() => {
						onExpandedChange(!isExpanded);
					}}
				>
					{isExpanded ? 'Show less' : `Show ${hiddenFileCount} more`}
				</button>
			)}
		</div>
	);
}

async function invalidateContextQueries(queryClient: QueryClient): Promise<void> {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: contextExplorerApi.contextExplorer.getRepositoryStatus.queryKey() }),
		queryClient.invalidateQueries({ queryKey: contextExplorerApi.contextExplorer.getFileTree.queryKey() }),
		queryClient.invalidateQueries({ queryKey: contextExplorerApi.contextExplorer.getChangedFiles.queryKey() }),
		queryClient.invalidateQueries({ queryKey: contextExplorerApi.contextExplorer.readFile.queryKey() }),
		queryClient.invalidateQueries({ queryKey: contextExplorerApi.contextExplorer.getFileDiff.queryKey() }),
		queryClient.invalidateQueries({ queryKey: contextExplorerApi.contextExplorer.searchContent.queryKey() }),
		queryClient.invalidateQueries({
			queryKey: contextExplorerApi.contextExplorer.getLiveContextPullHistory.queryKey(),
		}),
	]);
}
