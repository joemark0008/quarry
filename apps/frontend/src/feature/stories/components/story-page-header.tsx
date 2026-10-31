import {
	Activity,
	CircleAlert,
	Code,
	Ellipsis,
	Eye,
	Loader2,
	Mail,
	Pencil,
	RefreshCw,
	RotateCcw,
	Save,
} from 'lucide-react';

import type { StoryViewMode } from '@/feature/stories/components/side-panel/story-viewer.types.ts';
import type { StoryDownloadOptions } from './story-download';
import type { CustomStoryViewModeControls } from '@/feature/stories/components/custom-story/custom-story-view-mode';
import type { StoryChatControls } from './story-chat-button';
import { CustomStoryViewModeToggle, isCustomStoryViewMode } from '@/feature/stories/components/custom-story/custom-story-view-mode';
import { EditableStoryTitle } from './editable-story-title';
import { StoryChatButton } from './story-chat-button';
import { StoryDownloadMenu, canDownloadStory } from './story-download';
import {
	ShareButton,
	StoryCertifyMenuItem,
	StoryDuplicateMenuItem,
	StoryFavoriteMenuItem,
	StoryFavoritedButton,
	StoryFeedbackButtons,
} from './story-header-actions';
import { describeViewedVersion, StoryVersionNav } from './story-version-nav';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SwitchIndicator } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTimeAgo } from '@/hooks/use-time-ago';
import { cn } from '@/lib/utils';
import styles from './story-page-header.module.css';

interface LiveControls {
	isLive: boolean;
	cachedAt?: string | Date | null;
	lastRefreshFailure?: StoryRefreshFailure | null;
	isRefreshing?: boolean;
	canRefresh?: boolean;
	isUpdating?: boolean;
	onRefresh?: () => void;
	/** When provided, clicking the badge opens settings. Otherwise the badge is read-only. */
	onOpenSettings?: () => void;
	/** Viewers of a shared story get the live actions in the actions menu instead of the header badge. */
	isInActionsMenu?: boolean;
	onManageNotifications?: () => void;
}

export interface StoryRefreshFailure {
	errorMessage: string;
	failedAt: string | Date;
}

interface ClassicViewModeControls {
	viewMode: StoryViewMode;
	onViewModeChange: (mode: StoryViewMode) => void;
	canEdit?: boolean;
	isAgentRunning?: boolean;
	isCodeDirty?: boolean;
	isCodeValid?: boolean;
	onSave?: () => void;
	onCancel?: () => void;
	isSaving?: boolean;
}

type ViewModeControls = ClassicViewModeControls | CustomStoryViewModeControls;

interface VersionControls {
	currentVersion: number;
	versionDates: (string | Date)[];
	versionDate?: string | Date | null;
	isViewingLatest: boolean;
	onSelectVersion: (version: number) => void;
	onRestore: () => void;
}

export interface StoryPageHeaderProps {
	title: string;
	authorName?: string;
	storyChat?: StoryChatControls;
	/** Offers to copy the story into a new chat of the user. */
	canDuplicate?: boolean;
	live?: LiveControls;
	download?: StoryDownloadOptions;
	storyId?: string | null;
	canRename?: boolean;
	isShared?: boolean;
	onShare?: () => void;
	viewModeControls?: ViewModeControls;
	versionControls?: VersionControls;
}

export function StoryPageHeader({
	title,
	authorName,
	storyChat,
	canDuplicate = false,
	live,
	download,
	storyId,
	canRename = false,
	isShared = false,
	onShare,
	viewModeControls,
	versionControls,
}: StoryPageHeaderProps) {
	const liveMenu = live?.isLive && live.isInActionsMenu ? live : undefined;
	const showActionsMenu = (download && canDownloadStory(download)) || !!storyId || !!liveMenu;

	return (
		<div className={styles.storyPageHeaderDiv}>
			<header className={styles.storyPageHeaderHeader}>
				<EditableStoryTitle
					storyId={storyId}
					title={title}
					canEdit={canRename}
					heading='h1'
					className={styles.storyPageHeaderEditableStoryTitle}
					inputClassName={styles.storyPageHeaderEditableStoryTitle2}
				/>
				{authorName && (
					<span className={styles.storyPageHeaderSpan}>by {authorName}</span>
				)}

				<div className={styles.storyPageHeaderDiv2}>
					{versionControls && (
						<StoryVersionNav
							currentVersion={versionControls.currentVersion}
							versionDates={versionControls.versionDates}
							onSelectVersion={versionControls.onSelectVersion}
						/>
					)}
					{viewModeControls && <ViewModeToggle controls={viewModeControls} />}

					{storyChat && <StoryChatButton {...storyChat} />}

					{live && !live.isInActionsMenu && <LiveStoryControls live={live} />}
					{liveMenu?.cachedAt && <LiveStoryTimestamp cachedAt={liveMenu.cachedAt} />}

					{storyId && <StoryFeedbackButtons storyId={storyId} />}

					{storyId && <StoryFavoritedButton storyId={storyId} />}

					{onShare && <ShareButton isShared={isShared} onShare={onShare} />}

					{showActionsMenu && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant='ghost'
									size='icon-sm'
									className={styles.storyPageHeaderButton}
									aria-label='More actions'
								>
									<Ellipsis className={styles.storyPageHeaderEllipsis} strokeWidth={2.25} />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align='end' className={styles.storyPageHeaderDropdownMenuContent}>
								{download && <StoryDownloadMenu {...download} />}
								{storyId && <StoryCertifyMenuItem storyId={storyId} />}
								{storyId && <StoryFavoriteMenuItem storyId={storyId} />}
								{liveMenu && <LiveStoryMenuItems live={liveMenu} />}
								{canDuplicate && storyId && <StoryDuplicateMenuItem storyId={storyId} />}
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
			</header>

			{live?.lastRefreshFailure && (
				<StoryRefreshFailureBanner failure={live.lastRefreshFailure} isRetrying={live.isRefreshing} />
			)}
			<StorySubHeader viewModeControls={viewModeControls} versionControls={versionControls} />
		</div>
	);
}

function ViewModeToggle({ controls }: { controls: ViewModeControls }) {
	if (isCustomStoryViewModeControls(controls)) {
		return <CustomStoryViewModeToggle {...controls} />;
	}

	const { viewMode, onViewModeChange, canEdit = false, isAgentRunning = false, isSaving = false } = controls;

	return (
		<div className={styles.viewModeToggleDiv}>
			<Button
				variant='ghost'
				className={cn(
					styles.viewModeToggleButton,
					viewMode === 'preview' && styles.viewModeToggleButton2,
					styles.storyPageHeaderButton,
				)}
				onClick={() => onViewModeChange('preview')}
				disabled={isSaving}
				aria-label='Preview'
			>
				<Eye className={styles.viewModeToggleEye} strokeWidth={2.25} />
			</Button>
			{canEdit && (
				<Button
					variant='ghost'
					className={cn(
						styles.viewModeToggleButton,
						viewMode === 'edit' && styles.viewModeToggleButton2,
						styles.storyPageHeaderButton,
					)}
					onClick={() => onViewModeChange('edit')}
					disabled={isAgentRunning || isSaving}
					aria-label='Edit'
				>
					<Pencil className={styles.viewModeToggleEye} strokeWidth={2.25} />
				</Button>
			)}
			<Button
				variant='ghost'
				className={cn(styles.viewModeToggleButton, viewMode === 'code' && styles.viewModeToggleButton2, styles.storyPageHeaderButton)}
				onClick={() => onViewModeChange('code')}
				disabled={isSaving}
				aria-label='Code'
			>
				<Code className={styles.viewModeToggleEye} strokeWidth={2.25} />
			</Button>
		</div>
	);
}

function StorySubHeader({
	viewModeControls,
	versionControls,
}: {
	viewModeControls?: ViewModeControls;
	versionControls?: VersionControls;
}) {
	const classicControls =
		viewModeControls && !isCustomStoryViewModeControls(viewModeControls) ? viewModeControls : undefined;
	const viewMode = classicControls?.viewMode ?? 'preview';
	const isCodeDirty = classicControls?.isCodeDirty ?? false;
	const isEditing = viewMode === 'edit' || (viewMode === 'code' && isCodeDirty);

	if (classicControls && isEditing) {
		const { onViewModeChange, onCancel, isCodeValid = true, onSave, isSaving = false } = classicControls;
		const isEditingCode = viewMode === 'code' && isCodeDirty;
		return (
			<div className={styles.storySubHeaderDiv}>
				<span className={styles.storySubHeaderSpan}>
					{viewMode === 'edit' ? 'Editing' : isCodeValid ? 'Editing code' : 'Fix validation errors to save'}
				</span>
				<div className={styles.storySubHeaderDiv2}>
					<Button
						variant='outline'
						size='sm'
						onClick={onCancel ?? (() => onViewModeChange('preview'))}
						disabled={isSaving}
					>
						Cancel
					</Button>
					<Button
						variant='primary-gradient'
						size='sm'
						onClick={onSave}
						disabled={isSaving || (isEditingCode && !isCodeValid)}
						isLoading={isSaving}
						className={styles.storySubHeaderButton}
					>
						<Save className={styles.viewModeToggleEye} strokeWidth={2.25} />
						<span>Save</span>
						<kbd className={styles.storySubHeaderKbd}>⌘S</kbd>
					</Button>
				</div>
			</div>
		);
	}

	if (versionControls && !versionControls.isViewingLatest) {
		return (
			<div className={styles.storySubHeaderDiv}>
				<span className={styles.storySubHeaderSpan}>
					{describeViewedVersion(versionControls.versionDate, versionControls.currentVersion)}
				</span>
				<Button
					variant='outline'
					size='sm'
					onClick={versionControls.onRestore}
					className={styles.storySubHeaderButton2}
				>
					<RotateCcw className={styles.viewModeToggleEye} strokeWidth={2.25} />
					<span>Restore</span>
				</Button>
			</div>
		);
	}

	return null;
}

function isCustomStoryViewModeControls(controls: ViewModeControls): controls is CustomStoryViewModeControls {
	return isCustomStoryViewMode(controls.viewMode);
}

function LiveStoryControls({ live }: { live: LiveControls }) {
	const {
		isLive,
		cachedAt,
		isRefreshing = false,
		canRefresh = Boolean(live.onRefresh),
		isUpdating = false,
		onRefresh,
		onOpenSettings,
	} = live;

	if (!onOpenSettings) {
		if (!isLive) {
			return null;
		}
		return (
			<>
				<Tooltip>
					<TooltipTrigger asChild>
						<div className={styles.liveStoryControlsDiv}>
							<Activity className={styles.liveStoryControlsActivity} strokeWidth={2.25} />
							<span className={styles.liveStoryControlsSpan}>Live story</span>
							<SwitchIndicator checked={isLive} />
						</div>
					</TooltipTrigger>
					<TooltipContent>Live story</TooltipContent>
				</Tooltip>
				{cachedAt && <LiveStoryTimestamp cachedAt={cachedAt} />}
				{canRefresh && onRefresh && <StoryRefreshButton isRefreshing={isRefreshing} onRefresh={onRefresh} />}
			</>
		);
	}

	return (
		<>
			<Tooltip>
				<TooltipTrigger asChild>
					<span className={styles.liveStoryControlsSpan2} tabIndex={isUpdating ? 0 : undefined}>
						<button
							type='button'
							onClick={onOpenSettings}
							disabled={isUpdating}
							className={cn(
								styles.liveStoryControlsButton,
								isUpdating && styles.liveStoryControlsButton2,
							)}
						>
							<>
								<Activity className={styles.liveStoryControlsActivity} strokeWidth={2.25} />
								<span className={styles.liveStoryControlsSpan}>Live story</span>
								{isUpdating ? (
									<Loader2 className={styles.liveStoryControlsLoader2} strokeWidth={2.25} />
								) : (
									<SwitchIndicator checked={isLive} />
								)}
							</>
						</button>
					</span>
				</TooltipTrigger>
				<TooltipContent>
					{isLive ? (isUpdating ? 'Updating...' : 'Live story settings') : 'Enable live mode'}
				</TooltipContent>
			</Tooltip>
			{isLive && cachedAt && <LiveStoryTimestamp cachedAt={cachedAt} />}
			{isLive && canRefresh && onRefresh && (
				<StoryRefreshButton isRefreshing={isRefreshing} onRefresh={onRefresh} />
			)}
		</>
	);
}

function LiveStoryMenuItems({ live }: { live: LiveControls }) {
	const { isRefreshing = false, canRefresh = Boolean(live.onRefresh), onRefresh, onManageNotifications } = live;

	return (
		<>
			{onManageNotifications && (
				<DropdownMenuItem onSelect={onManageNotifications}>
					<Mail strokeWidth={2.25} />
					<span>Notifications</span>
				</DropdownMenuItem>
			)}
			{canRefresh && onRefresh && (
				<DropdownMenuItem onSelect={onRefresh} disabled={isRefreshing}>
					{isRefreshing ? (
						<Loader2 className={styles.liveStoryMenuItemsLoader2} strokeWidth={2.25} />
					) : (
						<RefreshCw strokeWidth={2.25} />
					)}
					<span>{isRefreshing ? 'Refreshing…' : 'Refresh data'}</span>
				</DropdownMenuItem>
			)}
		</>
	);
}

/** Stays hoverable while refreshing (no `disabled`) so its tooltip can say the refresh is in progress. */
export function StoryRefreshButton({ isRefreshing, onRefresh }: { isRefreshing: boolean; onRefresh: () => void }) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant='ghost'
					size='icon-sm'
					className={styles.storyRefreshButtonButton}
					onClick={isRefreshing ? undefined : onRefresh}
					aria-disabled={isRefreshing}
					aria-label='Refresh data'
				>
					{isRefreshing ? (
						<Loader2 className={styles.storyRefreshButtonLoader2} strokeWidth={2.25} />
					) : (
						<RefreshCw className={styles.viewModeToggleEye} strokeWidth={2.25} />
					)}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{isRefreshing ? 'Story is refreshing' : 'Refresh data'}</TooltipContent>
		</Tooltip>
	);
}

export function LiveStoryTimestamp({ cachedAt }: { cachedAt: string | Date }) {
	const timestampMs = new Date(cachedAt).getTime();
	const timeAgo = useTimeAgo(timestampMs);

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<div className={styles.liveStoryTimestampDiv}>
					<span>{timeAgo.humanReadable.toLowerCase()}</span>
				</div>
			</TooltipTrigger>
			<TooltipContent>Updated {new Date(cachedAt).toLocaleString()}</TooltipContent>
		</Tooltip>
	);
}

export function StoryRefreshFailureBanner({
	failure,
	isRetrying = false,
}: {
	failure: StoryRefreshFailure;
	isRetrying?: boolean;
}) {
	const failedAt = new Date(failure.failedAt);
	const timeAgo = useTimeAgo(failedAt.getTime());

	return (
		<div
			role={isRetrying ? 'status' : 'alert'}
			className={styles.storyRefreshFailureBannerDiv}
		>
			{isRetrying ? (
				<Loader2 className={styles.storyRefreshFailureBannerLoader2} />
			) : (
				<CircleAlert className={styles.storyRefreshFailureBannerCircleAlert} />
			)}
			<div className={styles.storyRefreshFailureBannerDiv2}>
				<span className={styles.storyRefreshFailureBannerSpan}>
					{isRetrying ? 'Retrying story refresh… Last attempt failed:' : 'Story refresh failed.'}
				</span>{' '}
				<span className={styles.storyRefreshFailureBannerSpan2}>{failure.errorMessage}</span>
				<span className={styles.storyRefreshFailureBannerSpan3} title={failedAt.toLocaleString()}>
					{timeAgo.humanReadable}
				</span>
			</div>
		</div>
	);
}
