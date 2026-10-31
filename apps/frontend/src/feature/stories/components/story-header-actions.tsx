import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { CopyPlus, Globe, ShieldCheck, Star, ThumbsDown, ThumbsUp, Upload } from 'lucide-react';
import { useState } from 'react';
import styles from './story-header-actions.module.css';
import type { LucideIcon } from 'lucide-react';
import type { FeedbackVote } from '@/feature/chat/components/chat-messages/assistant-message-actions';

import { FeedbackDialog } from '@/feature/chat/components/chat-messages/assistant-message-actions';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePermissions } from '@/hooks/use-permissions';
import { useProjectSwitch } from '@/hooks/use-project-switch';
import { useToggleFavorite } from '@/hooks/use-toggle-favorite';
import { useToggleStoryCertification } from '@/hooks/use-toggle-story-certification';
import { cn } from '@/lib/utils';
import { useCurrentProject } from '@/hooks/use-current-project';
import { storyApi } from '@/lib/story-api';
import { chatApi } from '@/lib/chat-api';

interface ShareButtonProps {
	isShared: boolean;
	onShare: () => void;
	disabled?: boolean;
}

export function ShareButton({ isShared, onShare, disabled = false }: ShareButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant='ghost'
					size='icon-sm'
					className={styles.shareButtonButton}
					onClick={onShare}
					disabled={disabled}
					aria-label='Share'
				>
					{isShared ? (
						<Globe className={styles.shareButtonGlobe} strokeWidth={2.25} />
					) : (
						<Upload className={styles.shareButtonUpload} strokeWidth={2.25} />
					)}
				</Button>
			</TooltipTrigger>
			<TooltipContent>Share</TooltipContent>
		</Tooltip>
	);
}

export function StoryDuplicateMenuItem({ storyId }: { storyId: string }) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data: currentProject } = useCurrentProject();
	const switchProject = useProjectSwitch(currentProject?.id);
	const { data: resolvedStory } = useQuery(storyApi.story.resolve.queryOptions({ storyId }));
	const duplicateMutation = useMutation(
		chatApi.chatFork.forkStory.mutationOptions({
			onSuccess: async ({ chatId }) => {
				if (resolvedStory?.projectId) {
					await switchProject(resolvedStory.projectId);
				}
				queryClient.invalidateQueries({ queryKey: [['chat', 'listGrouped']] });
				queryClient.invalidateQueries({ queryKey: storyApi.story.listAll.queryKey() });
				navigate({ to: '/$chatId', params: { chatId }, state: { openStorySlug: resolvedStory?.slug } });
			},
		}),
	);

	return (
		<DropdownMenuItem
			onSelect={() => duplicateMutation.mutate({ storyId })}
			disabled={!resolvedStory || duplicateMutation.isPending}
		>
			<CopyPlus strokeWidth={2.25} />
			<span>Duplicate</span>
		</DropdownMenuItem>
	);
}

export function StoryFavoriteMenuItem({ storyId }: { storyId: string }) {
	const { isFavorited, toggle, isPending } = useStoryFavorite(storyId);

	return (
		<DropdownMenuItem onSelect={toggle} disabled={isPending}>
			<Star className={cn(isFavorited && styles.storyFavoriteMenuItemStar)} strokeWidth={2.25} />
			<span>{isFavorited ? 'Unfavorite' : 'Favorite'}</span>
		</DropdownMenuItem>
	);
}

export function StoryCertifyMenuItem({ storyId }: { storyId: string }) {
	const { isAdmin } = usePermissions();
	const certification = useQuery({
		...storyApi.story.getCertification.queryOptions({ storyId }),
		enabled: isAdmin,
		retry: false,
	});
	const { toggle, isPending } = useToggleStoryCertification();

	if (!isAdmin || !certification.data) {
		return null;
	}

	const { certifiedAt, certifiedByName } = certification.data;
	const isCertified = certifiedAt !== null;

	return (
		<DropdownMenuItem
			onSelect={() => toggle(storyId)}
			disabled={isPending}
			title={isCertified && certifiedByName ? `Certified by ${certifiedByName}` : undefined}
		>
			<ShieldCheck className={cn(isCertified && styles.storyCertifyMenuItemShieldCheck)} strokeWidth={2.25} />
			<span>{isCertified ? 'Remove certification' : 'Certify'}</span>
		</DropdownMenuItem>
	);
}

export function StoryFavoritedButton({ storyId }: { storyId: string }) {
	const { isFavorited, toggle, isPending } = useStoryFavorite(storyId);

	if (!isFavorited) {
		return null;
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant='ghost'
					size='icon-sm'
					className={styles.shareButtonButton}
					onClick={toggle}
					disabled={isPending}
					aria-label='Unfavorite'
				>
					<Star className={styles.storyFavoritedButtonStar} strokeWidth={2.25} />
				</Button>
			</TooltipTrigger>
			<TooltipContent>Unfavorite</TooltipContent>
		</Tooltip>
	);
}

export function StoryFeedbackButtons({ storyId }: { storyId: string }) {
	const [dialogVote, setDialogVote] = useState<FeedbackVote>('down');
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const { data: feedback } = useQuery(storyApi.feedback.getStoryFeedback.queryOptions({ storyId }));
	const submitFeedback = useMutation(
		storyApi.feedback.submitStoryFeedback.mutationOptions({
			onSuccess: (data, _, __, ctx) => {
				ctx.client.setQueryData(storyApi.feedback.getStoryFeedback.queryKey({ storyId }), data);
			},
		}),
	);

	const openDialog = (vote: FeedbackVote) => {
		setDialogVote(vote);
		setIsDialogOpen(true);
	};

	const handleSubmit = (explanation?: string) => {
		submitFeedback.mutate({ storyId, vote: dialogVote, explanation });
		setIsDialogOpen(false);
	};

	return (
		<>
			<div className={styles.storyFeedbackButtonsDiv}>
				<StoryFeedbackButton
					Icon={ThumbsUp}
					label='Good story'
					isActive={feedback?.vote === 'up'}
					activeClassName={styles.storyFeedbackButtonsStoryFeedbackButton}
					disabled={submitFeedback.isPending}
					onClick={() => openDialog('up')}
				/>
				<StoryFeedbackButton
					Icon={ThumbsDown}
					label='Bad story'
					isActive={feedback?.vote === 'down'}
					activeClassName={styles.storyFeedbackButtonsStoryFeedbackButton2}
					disabled={submitFeedback.isPending}
					onClick={() => openDialog('down')}
				/>
			</div>

			<FeedbackDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				onSubmit={handleSubmit}
				isPending={submitFeedback.isPending}
				vote={dialogVote}
				subject='story'
			/>
		</>
	);
}

interface StoryFeedbackButtonProps {
	Icon: LucideIcon;
	label: string;
	isActive: boolean;
	activeClassName: string;
	disabled: boolean;
	onClick: () => void;
}

function StoryFeedbackButton({ Icon, label, isActive, activeClassName, disabled, onClick }: StoryFeedbackButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant='ghost'
					size='icon-sm'
					className={cn(styles.shareButtonButton, isActive && activeClassName)}
					onClick={onClick}
					disabled={disabled}
					aria-label={label}
					aria-pressed={isActive}
				>
					<Icon className={styles.storyFeedbackButtonIcon} strokeWidth={1.75} />
				</Button>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

function useStoryFavorite(storyId: string) {
	const { toggle, isPending } = useToggleFavorite('story');
	const { data: favorites } = useQuery(storyApi.favorite.list.queryOptions());
	const isFavorited = favorites?.storyIds.includes(storyId) ?? false;

	return {
		isFavorited,
		isPending,
		toggle: () => {
			toggle(storyId);
		},
	};
}
