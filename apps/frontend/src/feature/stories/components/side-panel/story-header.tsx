import {
	Activity,
	ChevronDown,
	Code,
	Ellipsis,
	Eye,
	Loader2,
	Maximize2,
	Pencil,
	RotateCcw,
	Save,
	X,
} from 'lucide-react';
import { memo, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ShareSource } from '@quarry/shared/types';
import type { StorySummary } from '@/lib/story.utils';
import type { StoryViewMode } from './story-viewer.types.ts';
import type { StoryRefreshFailure } from '@/feature/stories/components/story-page-header';
import type { StoryDownloadOptions } from '@/feature/stories/components/story-download';
import type { CustomStoryViewModeControls } from '@/feature/stories/components/custom-story/custom-story-view-mode';
import { CustomStoryViewModeToggle, isCustomStoryViewMode } from '@/feature/stories/components/custom-story/custom-story-view-mode';
import { useMentionedStoriesContext } from '@/contexts/mentioned-stories';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { StoryDownloadMenu, canDownloadStory } from '@/feature/stories/components/story-download';
import {
	ShareButton,
	StoryFavoriteMenuItem,
	StoryFavoritedButton,
	StoryFeedbackButtons,
} from '@/feature/stories/components/story-header-actions';
import { describeViewedVersion, StoryVersionNav } from '@/feature/stories/components/story-version-nav';
import { EditableStoryTitle } from '@/feature/stories/components/editable-story-title';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SwitchIndicator } from '@/components/ui/switch';
import { LiveStoryTimestamp, StoryRefreshButton, StoryRefreshFailureBanner } from '@/feature/stories/components/story-page-header';
import { cn } from '@/lib/utils';
import { storyApi } from '@/lib/story-api';
import styles from './story-header.module.css';

interface StoryViewModeControls {
	viewMode: StoryViewMode;
	onViewModeChange: (mode: StoryViewMode) => void;
}

interface StoryHeaderBaseProps {
	title: string;
	chatId: string;
	storySlug: string;
	storyId?: string | null;
	shareSource?: ShareSource | null;
	allStories: StorySummary[];
	onSwitchStory: (id: string) => void;
	currentVersion: number;
	versionDates: (string | Date)[];
	versionNumber?: number;
	versionDate?: string | Date | null;
	onSelectVersion: (version: number) => void;
	isViewingLatest: boolean;
	onRestore: () => void;
	onSave?: () => void;
	onCancel?: () => void;
	onShare: () => void;
	onEnlarge: () => void;
	isShared: boolean;
	isAgentRunning: boolean;
	isStoryUpdating: boolean;
	isSaving?: boolean;
	isReadonlyMode: boolean;
	isReplay?: boolean;
	isLive: boolean;
	isLiveUpdating: boolean;
	isRefreshing: boolean;
	onRefreshData: () => void;
	onOpenLiveSettings: () => void;
	onClose: () => void;
	isCodeDirty?: boolean;
	isCodeValid?: boolean;
	cachedAt?: string | Date | null;
	lastRefreshFailure?: StoryRefreshFailure | null;
	onDownload?: StoryDownloadOptions['onDownload'];
}

export type StoryHeaderProps = StoryHeaderBaseProps & (StoryViewModeControls | CustomStoryViewModeControls);

function mergeStorySummaries(
	messageStories: StorySummary[],
	persistedStories: { storySlug: string; title: string }[],
): StorySummary[] {
	const storiesBySlug = new Map(messageStories.map((story) => [story.id, story]));

	for (const story of persistedStories) {
		storiesBySlug.set(story.storySlug, { id: story.storySlug, title: story.title });
	}

	return Array.from(storiesBySlug.values());
}

export const StoryHeader = memo(function StoryHeader({
	title,
	chatId,
	storySlug,
	storyId,
	shareSource,
	allStories,
	onSwitchStory,
	currentVersion,
	versionDates,
	versionNumber,
	versionDate,
	onSelectVersion,
	isViewingLatest,
	onRestore,
	onSave,
	onCancel,
	onShare,
	onEnlarge,
	isShared,
	isAgentRunning,
	isStoryUpdating,
	isSaving = false,
	isReadonlyMode,
	isReplay = false,
	isLive,
	isLiveUpdating,
	isRefreshing,
	onRefreshData,
	onOpenLiveSettings,
	onClose,
	isCodeDirty = false,
	isCodeValid = true,
	cachedAt,
	lastRefreshFailure,
	onDownload,
	...viewModeControls
}: StoryHeaderProps) {
	const { viewMode } = viewModeControls;
	const isMobile = useIsMobile();
	const { otherStories, switchToStory, mentionedStories, openMentionedStory } = useSwitchableStories({
		chatId,
		storySlug,
		allStories,
		onSwitchStory,
		isReadonlyMode,
	});
	const hasMultiple = otherStories.length > 0 || mentionedStories.length > 0;
	const isEditingCode = viewMode === 'code' && isCodeDirty && !isReadonlyMode;
	const showSubHeader = viewMode === 'edit' || isEditingCode || !isViewingLatest;

	const titleElement = hasMultiple ? (
		<div className={styles.titleElementDiv}>
			<EditableStoryTitle
				storyId={storyId}
				title={title}
				canEdit={!isReadonlyMode}
				heading='h3'
				className={styles.titleElementEditableStoryTitle}
				inputClassName={styles.titleElementEditableStoryTitle2}
			/>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						type='button'
						variant='ghost-muted'
						className={styles.titleElementButton}
						size='icon-sm'
						aria-label='Switch story'
					>
						<ChevronDown className={styles.titleElementChevronDown} strokeWidth={2.25} />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='start'>
					{otherStories.map((story) => (
						<DropdownMenuItem key={story.id} onClick={() => switchToStory(story.id)}>
							<span className={styles.titleElementSpan}>{story.title}</span>
						</DropdownMenuItem>
					))}
					{mentionedStories.length > 0 && (
						<>
							{otherStories.length > 0 && <DropdownMenuSeparator />}
							<DropdownMenuLabel className={styles.titleElementDropdownMenuLabel}>Mention</DropdownMenuLabel>
							{mentionedStories.map((story) => (
								<DropdownMenuItem key={story.storyId} onClick={() => openMentionedStory(story)}>
									<span className={styles.titleElementSpan}>{story.title}</span>
								</DropdownMenuItem>
							))}
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	) : (
		<div className={styles.titleElementDiv2}>
			<EditableStoryTitle
				storyId={storyId}
				title={title}
				canEdit={!isReadonlyMode}
				heading='h3'
				className={styles.titleElementEditableStoryTitle3}
				inputClassName={styles.titleElementEditableStoryTitle2}
			/>
		</div>
	);

	const updatingIndicator = isStoryUpdating && (
		<div className={styles.updatingIndicatorDiv} role='status'>
			<Loader2 className={styles.updatingIndicatorLoader2} strokeWidth={2.25} />
			<span>Updating…</span>
		</div>
	);

	const versionNav = (
		<StoryVersionNav
			currentVersion={currentVersion}
			versionDates={versionDates}
			onSelectVersion={onSelectVersion}
		/>
	);

	const viewModeToggle = (
		<ViewModeToggle
			controls={viewModeControls}
			isReadonlyMode={isReadonlyMode}
			isAgentRunning={isAgentRunning}
			isSaving={isSaving}
		/>
	);

	const shareButton = !isReadonlyMode && (
		<ShareButton isShared={isShared} onShare={onShare} disabled={isAgentRunning} />
	);

	const liveControls = (!isReadonlyMode || isReplay) && (
		<>
			<Tooltip>
				<TooltipTrigger asChild>
					<span className={styles.liveControlsSpan} tabIndex={isLiveUpdating ? 0 : undefined}>
						<button
							type='button'
							onClick={onOpenLiveSettings}
							disabled={isReadonlyMode || isAgentRunning || isLiveUpdating}
							className={cn(
								styles.liveControlsButton,
								isLiveUpdating && styles.liveControlsButton2,
							)}
						>
							<Activity className={styles.liveControlsActivity} strokeWidth={2.25} />
							<span className={styles.liveControlsSpan2}>Live story</span>
							{isLiveUpdating ? (
								<Loader2 className={styles.liveControlsLoader2} strokeWidth={2.25} />
							) : (
								<SwitchIndicator checked={isLive} />
							)}
						</button>
					</span>
				</TooltipTrigger>
				<TooltipContent>
					{isLiveUpdating
						? 'Updating...'
						: isReadonlyMode
							? isLive
								? 'Live mode on'
								: 'Live mode off'
							: isLive
								? 'Live story settings'
								: 'Enable live mode'}
				</TooltipContent>
			</Tooltip>
			{isLive && (
				<>
					{cachedAt && <LiveStoryTimestamp cachedAt={cachedAt} />}
					{!isReadonlyMode && <StoryRefreshButton isRefreshing={isRefreshing} onRefresh={onRefreshData} />}
				</>
			)}
		</>
	);

	const downloadOptions = {
		chatId,
		storySlug,
		shareSource: shareSource ?? undefined,
		isOwner: !isReadonlyMode,
		versionNumber,
		onDownload,
	};
	const showActionsMenu = !isReadonlyMode || canDownloadStory(downloadOptions);
	const canFavorite = !isReadonlyMode && !!storyId;

	const feedbackButtons = storyId ? <StoryFeedbackButtons storyId={storyId} /> : null;
	const favoritedButton = canFavorite && <StoryFavoritedButton storyId={storyId} />;

	const actionButtons = showActionsMenu && (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant='ghost' size='icon-sm' className={styles.titleElementButton} aria-label='More actions'>
					<Ellipsis className={styles.titleElementChevronDown} strokeWidth={2.25} />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end' className={styles.actionButtonsDropdownMenuContent}>
				<StoryDownloadMenu {...downloadOptions} isAgentRunning={isAgentRunning} isSaving={isSaving} />
				{canFavorite && <StoryFavoriteMenuItem storyId={storyId} />}
				{!isReadonlyMode && (
					<>
						<DropdownMenuItem onSelect={onEnlarge} disabled={!storyId}>
							<Maximize2 strokeWidth={2.25} />
							<span>Expand</span>
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);

	return (
		<div className={styles.storyHeaderDiv} data-selection-ignore>
			{isMobile ? (
				<>
					<div className={styles.storyHeaderDiv2}>
						<Button
							variant='ghost'
							size='icon-md'
							className={styles.titleElementButton}
							onClick={onClose}
							aria-label='Close'
						>
							<X className={styles.storyHeaderX} strokeWidth={2.25} />
						</Button>
						<div className={styles.storyHeaderDiv3} />
						{viewModeToggle}
						{liveControls}
						{feedbackButtons}
						{favoritedButton}
						{shareButton}
						{actionButtons}
					</div>
					<div className={styles.storyHeaderDiv4}>
						{titleElement}
						{updatingIndicator}
						{versionNav}
					</div>
				</>
			) : (
				<div className={styles.storyHeaderDiv4}>
					<Button
						variant='ghost'
						size='icon-sm'
						className={styles.storyHeaderButton}
						onClick={onClose}
						aria-label='Close'
					>
						<X className={styles.titleElementChevronDown} strokeWidth={2.25} />
					</Button>
					{titleElement}
					{updatingIndicator}
					{versionNav}
					{viewModeToggle}
					{liveControls}
					{feedbackButtons}
					{favoritedButton}
					{shareButton}
					{actionButtons}
				</div>
			)}

			{lastRefreshFailure && <StoryRefreshFailureBanner failure={lastRefreshFailure} isRetrying={isRefreshing} />}
			{showSubHeader && (
				<div className={styles.storyHeaderDiv5}>
					{viewMode === 'edit' ? (
						<>
							<span className={styles.titleElementDropdownMenuLabel}>Editing</span>
							<div className={styles.storyHeaderDiv6}>
								<Button variant='outline' size='sm' onClick={onCancel} disabled={isSaving}>
									Cancel
								</Button>
								<Button
									variant='primary-gradient'
									size='sm'
									onClick={onSave}
									disabled={isSaving}
									isLoading={isSaving}
									className={styles.storyHeaderButton2}
								>
									<Save className={styles.storyHeaderSave} strokeWidth={2.25} />
									<span>Save</span>
									<kbd className={styles.storyHeaderKbd}>⌘S</kbd>
								</Button>
							</div>
						</>
					) : isEditingCode ? (
						<>
							<span className={styles.titleElementDropdownMenuLabel}>
								{isCodeValid ? 'Editing code' : 'Fix validation errors to save'}
							</span>
							<div className={styles.storyHeaderDiv6}>
								<Button variant='outline' size='sm' onClick={onCancel} disabled={isSaving}>
									Cancel
								</Button>
								<Button
									variant='primary-gradient'
									size='sm'
									onClick={onSave}
									disabled={isSaving || !isCodeValid}
									isLoading={isSaving}
									className={styles.storyHeaderButton2}
								>
									<Save className={styles.storyHeaderSave} strokeWidth={2.25} />
									<span>Save</span>
									<kbd className={styles.storyHeaderKbd}>⌘S</kbd>
								</Button>
							</div>
						</>
					) : (
						<>
							<span className={styles.titleElementDropdownMenuLabel}>
								{describeViewedVersion(versionDate, currentVersion)}
							</span>
							<Button
								variant='outline'
								size='sm'
								onClick={onRestore}
								disabled={isSaving}
								className={styles.storyHeaderButton3}
							>
								<RotateCcw className={styles.storyHeaderSave} strokeWidth={2.25} />
								<span>Restore</span>
							</Button>
						</>
					)}
				</div>
			)}
		</div>
	);
});

interface SwitchableStoriesParams {
	chatId: string;
	storySlug: string;
	allStories: StorySummary[];
	onSwitchStory: (id: string) => void;
	isReadonlyMode: boolean;
}

/** The stories of the conversation and the ones it mentions, even when the viewed story comes from another chat. */
function useSwitchableStories({
	chatId,
	storySlug,
	allStories,
	onSwitchStory,
	isReadonlyMode,
}: SwitchableStoriesParams) {
	const mentioned = useMentionedStoriesContext();
	const conversationChatId = mentioned.conversationChatId ?? chatId;
	const isConversationStory = conversationChatId === chatId;
	const { data: persistedStories = [] } = useQuery({
		...storyApi.story.listStories.queryOptions({ chatId: conversationChatId }),
		enabled: !isReadonlyMode,
	});
	const messageStories = isConversationStory ? allStories : mentioned.conversationStories;
	const otherStories = useMemo(() => {
		const stories = mergeStorySummaries(messageStories, persistedStories);
		return isConversationStory ? stories.filter((story) => story.id !== storySlug) : stories;
	}, [messageStories, persistedStories, isConversationStory, storySlug]);
	const mentionedStories = useMemo(
		() => mentioned.stories.filter((story) => story.chatId !== chatId || story.slug !== storySlug),
		[mentioned.stories, chatId, storySlug],
	);

	return {
		otherStories,
		switchToStory: isConversationStory ? onSwitchStory : mentioned.openConversationStory,
		mentionedStories,
		openMentionedStory: mentioned.open,
	};
}

interface ViewModeToggleProps {
	controls: StoryViewModeControls | CustomStoryViewModeControls;
	isReadonlyMode: boolean;
	isAgentRunning: boolean;
	isSaving: boolean;
}

function ViewModeToggle({ controls, isReadonlyMode, isAgentRunning, isSaving }: ViewModeToggleProps) {
	if (isCustomStoryViewModeControls(controls)) {
		return <CustomStoryViewModeToggle {...controls} />;
	}

	const { viewMode, onViewModeChange } = controls;

	return (
		<div className={styles.viewModeToggleDiv}>
			<Button
				variant='ghost'
				className={cn(
					styles.viewModeToggleButton,
					viewMode === 'preview' && styles.viewModeToggleButton2,
					styles.titleElementButton,
				)}
				onClick={() => onViewModeChange('preview')}
				disabled={isSaving}
			>
				<Eye className={styles.storyHeaderSave} strokeWidth={2.25} />
			</Button>
			{!isReadonlyMode && (
				<Button
					variant='ghost'
					className={cn(
						styles.viewModeToggleButton,
						viewMode === 'edit' && styles.viewModeToggleButton2,
						styles.titleElementButton,
					)}
					onClick={() => onViewModeChange('edit')}
					disabled={isAgentRunning || isSaving}
				>
					<Pencil className={styles.storyHeaderSave} strokeWidth={2.25} />
				</Button>
			)}
			<Button
				variant='ghost'
				className={cn(styles.viewModeToggleButton, viewMode === 'code' && styles.viewModeToggleButton2, styles.titleElementButton)}
				onClick={() => onViewModeChange('code')}
				disabled={isSaving}
			>
				<Code className={styles.storyHeaderSave} strokeWidth={2.25} />
			</Button>
		</div>
	);
}

function isCustomStoryViewModeControls(
	controls: StoryViewModeControls | CustomStoryViewModeControls,
): controls is CustomStoryViewModeControls {
	return isCustomStoryViewMode(controls.viewMode);
}
