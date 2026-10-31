import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	Check,
	ChevronRight,
	Circle,
	CircleCheck,
	Copy,
	ExternalLink,
	GitMerge,
	GitPullRequest,
	GitPullRequestClosed,
	Loader2,
	MessageCircleX,
	ScrollText,
	ThumbsDown,
	Users,
	Wand2,
	X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
	CONTEXT_RECOMMENDATION_CATEGORY_LABELS,
	normalizeContextRecommendationCategory,
} from '@quarry/shared/context-recommendation';
import type { MouseEvent } from 'react';
import type { ApiOutputs } from '@/lib/api-types';

import type { ContextRecommendationSignalType } from '@quarry/api/agent/types/context-recommendation';
import { RecommendationDiffPanel } from '@/components/side-panel/recommendation-diff-panel';
import { RecommendationManualFixPanel } from '@/components/side-panel/recommendation-manual-fix-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSidePanel } from '@/contexts/side-panel';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { useRecommendationCollapsed } from '@/hooks/use-recommendation-collapsed';
import { useTimeAgo } from '@/hooks/use-time-ago';
import { computeLineDiff } from '@/lib/line-diff';
import { RecommendationText } from '@/lib/recommendation-text';
import { cn } from '@/lib/utils';
import { contextRecommendationApi } from '@/lib/context-recommendation-api';
import styles from './recommendation-card.module.css';

type RouterOutputs = ApiOutputs;
type Recommendation = RouterOutputs['contextRecommendation']['list'][number];
type RecommendationStatus = 'applied' | 'dismissed';

const CONTEXT_RECOMMENDATION_CATEGORY_BADGE_VARIANT = {
	tool_error: styles.cONTEXTRECOMMENDATIONCATEGORYBADGEVARIANTToolError,
	hallucination: styles.cONTEXTRECOMMENDATIONCATEGORYBADGEVARIANTHallucination,
	semantic_missing: styles.cONTEXTRECOMMENDATIONCATEGORYBADGEVARIANTSemanticMissing,
	context_bloat: styles.cONTEXTRECOMMENDATIONCATEGORYBADGEVARIANTContextBloat,
	skills: styles.cONTEXTRECOMMENDATIONCATEGORYBADGEVARIANTSkills,
	other: styles.cONTEXTRECOMMENDATIONCATEGORYBADGEVARIANTOther,
} as const;

/** What a trigger chat's replay would highlight; the replay itself comes back with Phase 6. */
type ReplayHighlight = 'tool-error' | 'feedback';

interface ChatLink {
	chatId: string;
	targetId?: string;
	highlight?: ReplayHighlight;
}

function replayHighlightFor(
	signalType: ContextRecommendationSignalType | null | undefined,
): ReplayHighlight | undefined {
	if (signalType === 'tool_error') {
		return 'tool-error';
	}
	if (
		signalType === 'downvote_theme' ||
		signalType === 'repeated_correction' ||
		signalType === 'friction' ||
		signalType === 'coverage_gap'
	) {
		return 'feedback';
	}
	return undefined;
}

type InsightLike = {
	signalType: ContextRecommendationSignalType;
	triggerRefs?: { chatId: string; targetId?: string }[];
};

function chatLinks(insights: InsightLike[] | null): ChatLink[] {
	const seen = new Set<string>();
	const links: ChatLink[] = [];
	for (const insight of insights ?? []) {
		const highlight = replayHighlightFor(insight.signalType);
		for (const ref of insight.triggerRefs ?? []) {
			if (!seen.has(ref.chatId)) {
				seen.add(ref.chatId);
				links.push({ chatId: ref.chatId, targetId: ref.targetId, highlight });
			}
		}
	}
	return links;
}

type FeedbackItem = Recommendation['feedbacks'][number];

type CardRow =
	| { kind: 'feedback'; key: string; chatId: string; messageId: string; userName: string; explanation: string | null }
	| { kind: 'chat'; key: string; chatId: string; targetId?: string; highlight?: ReplayHighlight };

function buildRows(links: ChatLink[], feedbacks: FeedbackItem[]): CardRow[] {
	const feedbackRows: CardRow[] = feedbacks.map((f) => ({
		kind: 'feedback',
		key: `fb:${f.messageId}`,
		chatId: f.chatId,
		messageId: f.messageId,
		userName: f.userName,
		explanation: f.explanation,
	}));
	const covered = new Set(feedbacks.map((f) => f.chatId));
	const chatRows: CardRow[] = links
		.filter((link) => !covered.has(link.chatId))
		.map((link) => ({
			kind: 'chat',
			key: `chat:${link.chatId}`,
			chatId: link.chatId,
			targetId: link.targetId,
			highlight: link.highlight,
		}));
	return [...feedbackRows, ...chatRows];
}

function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) {
		return '?';
	}
	if (parts.length === 1) {
		return parts[0].slice(0, 1).toUpperCase();
	}
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface RecommendationCardProps {
	recommendation: Recommendation;
	onChangeStatus: (id: string, status: RecommendationStatus) => void;
	isPending: boolean;
	defaultCollapsed?: boolean;
	readOnly?: boolean;
	highlightOpen?: boolean;
	isSelected?: boolean;
	selectionActive?: boolean;
	onSelect?: (id: string, checked: boolean, shiftKey?: boolean) => void;
}

export function RecommendationCard({
	recommendation: rec,
	onChangeStatus,
	isPending,
	defaultCollapsed = false,
	readOnly = false,
	highlightOpen = false,
	isSelected = false,
	selectionActive = false,
	onSelect,
}: RecommendationCardProps) {
	const allLinks = useMemo(() => chatLinks(rec.insights), [rec.insights]);
	const feedbacks = useMemo(() => rec.feedbacks ?? [], [rec.feedbacks]);
	const rows = useMemo(() => buildRows(allLinks, feedbacks), [allLinks, feedbacks]);
	const visibleRows = useMemo(() => rows.slice(0, 5), [rows]);
	const hiddenCount = rows.length - visibleRows.length;
	const metaChatIds = useMemo(() => [...new Set(visibleRows.map((r) => r.chatId))], [visibleRows]);
	const totalChatCount = useMemo(
		() => new Set([...allLinks.map((l) => l.chatId), ...feedbacks.map((f) => f.chatId)]).size,
		[allLinks, feedbacks],
	);
	const queryClient = useQueryClient();
	const sidePanel = useSidePanel();
	const [collapsed, setCollapsed] = useRecommendationCollapsed(rec.id, defaultCollapsed);
	const [chatsExpanded, setChatsExpanded] = useState(false);
	const [isFetchingPrompt, setIsFetchingPrompt] = useState(false);
	const [promptError, setPromptError] = useState<string | null>(null);
	const createdAgo = useTimeAgo(new Date(rec.createdAt).getTime());
	const cardRef = useRef<HTMLDivElement>(null);
	const { isCopied, copy } = useCopyToClipboard();

	useEffect(() => {
		if (!highlightOpen) {
			return;
		}
		setCollapsed(false);
		setChatsExpanded(true);
		const frame = requestAnimationFrame(() => {
			cardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		});
		return () => cancelAnimationFrame(frame);
	}, [highlightOpen, setCollapsed]);

	const chatMetadata = useQuery({
		...contextRecommendationApi.contextRecommendation.listRecoTriggerChatMetadata.queryOptions({
			chatIds: metaChatIds,
		}),
		enabled: metaChatIds.length > 0 && !collapsed,
		staleTime: 60_000,
	});

	const distinctUserCount = useMemo(() => {
		const names = new Set<string>();
		for (const meta of chatMetadata.data ?? []) {
			if (meta.userName) {
				names.add(meta.userName);
			}
		}
		for (const feedback of feedbacks) {
			if (feedback.userName) {
				names.add(feedback.userName);
			}
		}
		return names.size;
	}, [chatMetadata.data, feedbacks]);

	const createPr = useMutation(
		contextRecommendationApi.contextRecommendation.createPullRequest.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: contextRecommendationApi.contextRecommendation.list.queryKey({}),
				});
			},
		}),
	);

	const prStatus = useQuery({
		...contextRecommendationApi.contextRecommendation.getPrStatus.queryOptions({ id: rec.id }),
		enabled: !!rec.prUrl,
		staleTime: 30_000,
	});

	const edits = useMemo(() => rec.proposedEdits ?? [], [rec.proposedEdits]);
	const hasPatch = rec.fixKind === 'patch' && edits.length > 0;
	const hasManualFix = rec.fixKind === 'manual' && (!!rec.fixGuidance || !!rec.fixPrompt);

	const diffTotals = useMemo(() => {
		if (!hasPatch) {
			return null;
		}
		return edits.reduce(
			(totals, edit) => {
				const diff = computeLineDiff(edit.oldContent, edit.newContent);
				return { additions: totals.additions + diff.additions, deletions: totals.deletions + diff.deletions };
			},
			{ additions: 0, deletions: 0 },
		);
	}, [edits, hasPatch]);

	const handleCopyPrompt = async () => {
		setIsFetchingPrompt(true);
		setPromptError(null);
		try {
			const prompt = await queryClient.fetchQuery(
				contextRecommendationApi.contextRecommendation.getAgentPrompt.queryOptions({ ids: [rec.id] }),
			);
			await copy(prompt);
		} catch (err) {
			setPromptError(err instanceof Error ? err.message : 'Failed to copy prompt');
		} finally {
			setIsFetchingPrompt(false);
		}
	};

	const selectable = !!onSelect && !readOnly;

	const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
		if (!onSelect || readOnly) {
			return;
		}
		if ((event.target as HTMLElement).closest('button, a')) {
			return;
		}
		if (window.getSelection()?.toString()) {
			return;
		}
		onSelect(rec.id, !isSelected, event.shiftKey);
	};

	return (
		<Card
			ref={cardRef}
			onClick={selectable ? handleCardClick : undefined}
			className={cn(
				`${styles.recommendationCardCard} group`,
				selectable && styles.recommendationCardCard2,
				isSelected && styles.recommendationCardCard3,
			)}
		>
			<div className={`${styles.recommendationCardDiv} items-top`}>
				{onSelect && !readOnly && (
					<span
						className={cn(
							styles.recommendationCardSpan,
							selectionActive && styles.recommendationCardSpan2,
						)}
					>
						<RecommendationCheckbox
							selected={isSelected}
							visible={isSelected || selectionActive}
							onClick={(e) => {
								e.stopPropagation();
								onSelect(rec.id, !isSelected, e.shiftKey);
							}}
						/>
					</span>
				)}
				<span className={styles.recommendationCardSpan3}>
					<button
						type='button'
						onClick={() => setCollapsed((value) => !value)}
						className={styles.recommendationCardButton}
						aria-expanded={!collapsed}
						aria-label={collapsed ? 'Expand recommendation' : 'Collapse recommendation'}
					>
						<ChevronRight className={cn(styles.recommendationCardChevronRight, !collapsed && styles.recommendationCardChevronRight2)} />
					</button>
				</span>
				<div className={styles.recommendationCardDiv2}>
					<span className={`${styles.recommendationCardSpan4} text-md`}>{rec.title}</span>
					<div className={styles.recommendationCardDiv3}>
						{collapsed && diffTotals && (
							<span className={styles.recommendationCardSpan5}>
								<span className={styles.recommendationCardSpan6}>+{diffTotals.additions}</span>
								<span className={styles.recommendationCardSpan7}>−{diffTotals.deletions}</span>
							</span>
						)}
					</div>
				</div>
				<div className={styles.recommendationCardDiv4}>
					<TooltipProvider delayDuration={150}>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									size='icon'
									variant='ghost'
									className={cn(
										styles.recommendationCardButton2,
										isFetchingPrompt && styles.recommendationCardButton3,
									)}
									onClick={handleCopyPrompt}
									disabled={isFetchingPrompt}
								>
									{isCopied ? (
										<Check className={styles.recommendationCardCheck} />
									) : isFetchingPrompt ? (
										<Loader2 className={styles.recommendationCardLoader2} />
									) : (
										<Copy className={styles.recommendationCardCheck} />
									)}
									<span className='sr-only'>Copy prompt</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent>{isCopied ? 'Copied' : 'Copy prompt'}</TooltipContent>
						</Tooltip>
					</TooltipProvider>
					<Badge
						className={
							CONTEXT_RECOMMENDATION_CATEGORY_BADGE_VARIANT[
								normalizeContextRecommendationCategory(rec.category)
							]
						}
					>
						{CONTEXT_RECOMMENDATION_CATEGORY_LABELS[normalizeContextRecommendationCategory(rec.category)]}
					</Badge>
				</div>
				<div className={`${styles.recommendationCardDiv5} items-top`}>
					{!readOnly && (
						<TooltipProvider delayDuration={150}>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size='icon'
										variant='ghost'
										className={styles.recommendationCardButton4}
										onClick={() => onChangeStatus(rec.id, 'dismissed')}
										disabled={isPending || rec.status === 'dismissed'}
									>
										<X className={styles.recommendationCardCheck} />
										<span className='sr-only'>Dismiss</span>
									</Button>
								</TooltipTrigger>
								<TooltipContent>Dismiss</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size='icon'
										variant='ghost'
										className={styles.recommendationCardButton5}
										onClick={() => onChangeStatus(rec.id, 'applied')}
										disabled={isPending || rec.status === 'applied'}
									>
										<Check className={styles.recommendationCardCheck} />
										<span className='sr-only'>Mark applied</span>
									</Button>
								</TooltipTrigger>
								<TooltipContent>Mark applied</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)}
				</div>
			</div>
			{promptError && <div className={styles.recommendationCardDiv6}>{promptError}</div>}
			<div
				className={cn(
					styles.recommendationCardDiv7,
					collapsed ? styles.recommendationCardDiv8 : styles.recommendationCardDiv9,
				)}
			>
				<div className={styles.recommendationCardDiv10}>
					<div className={styles.recommendationCardDiv11}>
						<div className={styles.recommendationCardDiv12}>
							<p>
								<RecommendationText text={rec.summary} />
								{rec.rootCause && (
									<>
										{' '}
										<RecommendationText text={rec.rootCause} />
									</>
								)}
							</p>
						</div>
						{rows.length > 0 && (
							<div className={styles.recommendationCardDiv10}>
								<div className={styles.recommendationCardDiv13}>
									<button
										type='button'
										onClick={() => setChatsExpanded((value) => !value)}
										aria-expanded={chatsExpanded}
										className={cn(
											styles.recommendationCardButton6,
											!chatsExpanded && styles.recommendationCardButton7,
										)}
									>
										<MessageCircleX className={styles.recommendationCardMessageCircleX} />
										{totalChatCount}
										<Users className={styles.recommendationCardMessageCircleX} />
										{distinctUserCount}
										{feedbacks.length > 0 && (
											<>
												<ThumbsDown className={styles.recommendationCardThumbsDown} />
												{feedbacks.length}
											</>
										)}
									</button>
								</div>
								<div
									className={cn(
										styles.recommendationCardDiv14,
										chatsExpanded ? styles.recommendationCardDiv9 : styles.recommendationCardDiv8,
									)}
								>
									<div className={styles.recommendationCardDiv10}>
										<div className={styles.recommendationCardDiv15}>
											{visibleRows.map((row) => {
												const meta = chatMetadata.data?.find((m) => m.chatId === row.chatId);
												const title = meta?.title || row.chatId.slice(0, 8);
												const userName = meta?.userName ?? 'Unknown user';
												return (
													<div
														key={row.key}
														className={styles.recommendationCardDiv16}
													>
														<span className={styles.recommendationCardSpan8}>
															{meta?.userName ? initials(meta.userName) : '?'}
														</span>
														<span className={styles.recommendationCardSpan9}>
															{userName}
														</span>
														<span className={styles.recommendationCardSpan10}>{title}</span>
														{row.kind === 'feedback' && (
															<>
																<ThumbsDown className={styles.recommendationCardThumbsDown2} />
																{row.explanation && (
																	<span className={styles.recommendationCardSpan11}>
																		&ldquo;{row.explanation}&rdquo;
																	</span>
																)}
															</>
														)}
														<ExternalLink className={styles.recommendationCardExternalLink} />
													</div>
												);
											})}
											{hiddenCount > 0 && (
												<div className={styles.recommendationCardDiv17}>
													+{hiddenCount} more
												</div>
											)}
										</div>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
			{!collapsed && (
				<div className={styles.recommendationCardDiv18}>
					<div
						className={cn(
							styles.recommendationCardDiv19,
							sidePanel.isVisible ? styles.recommendationCardDiv20 : styles.recommendationCardDiv21,
							!hasManualFix && !hasPatch && styles.recommendationCardDiv22,
						)}
					>
						<TooltipProvider delayDuration={150}>
							<Tooltip>
								<TooltipTrigger asChild>
									<span className={styles.recommendationCardSpan12}>Detected {createdAgo.humanReadable}</span>
								</TooltipTrigger>
								<TooltipContent>
									{new Date(rec.createdAt).toLocaleString()}
									{rec.llmModelId && <span aria-hidden> · {rec.llmModelId}</span>}
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
					{(hasPatch || hasManualFix) && (
						<div className={styles.recommendationCardDiv23}>
							{hasPatch && (
								<>
									<Button
										size='sm'
										variant='outline'
										onClick={() =>
											sidePanel.open(<RecommendationDiffPanel title={rec.title} edits={edits} />)
										}
									>
										<ScrollText className={styles.recommendationCardCheck} />
										{edits.length} suggested change{edits.length === 1 ? '' : 's'}
										{diffTotals && (
											<span className={styles.recommendationCardSpan13}>
												<span className={styles.recommendationCardSpan6}>
													+{diffTotals.additions}
												</span>{' '}
												<span className={styles.recommendationCardSpan7}>
													−{diffTotals.deletions}
												</span>
											</span>
										)}
									</Button>
									{rec.prUrl ? (
										<Button size='sm' variant='outline' asChild>
											<a href={rec.prUrl} target='_blank' rel='noopener noreferrer'>
												<PrStatusIcon state={prStatus.data?.state} />
												{PR_STATUS_LABEL[prStatus.data?.state ?? 'open']}
											</a>
										</Button>
									) : (
										<Button
											size='sm'
											onClick={() => createPr.mutate({ id: rec.id })}
											disabled={createPr.isPending}
											variant='outline'
										>
											{createPr.isPending ? (
												<Loader2 className={styles.recommendationCardLoader2} />
											) : (
												<GitPullRequest className={styles.recommendationCardCheck} />
											)}
											Create PR
										</Button>
									)}
								</>
							)}
							{hasManualFix && (
								<Button
									size='sm'
									variant='outline'
									onClick={() =>
										sidePanel.open(
											<RecommendationManualFixPanel
												title={rec.title}
												guidance={rec.fixGuidance}
												prompt={rec.fixPrompt}
											/>,
										)
									}
								>
									<Wand2 className={styles.recommendationCardCheck} />
									How to fix
								</Button>
							)}
						</div>
					)}
					{createPr.error && (
						<span className={styles.recommendationCardSpan14}>{createPr.error.message}</span>
					)}
				</div>
			)}
		</Card>
	);
}

function RecommendationCheckbox({
	selected,
	visible,
	onClick,
}: {
	selected: boolean;
	visible: boolean;
	onClick: (e: MouseEvent<HTMLElement>) => void;
}) {
	return (
		<button
			type='button'
			aria-label={selected ? 'Deselect recommendation' : 'Select recommendation'}
			aria-pressed={selected}
			onClick={onClick}
			className={cn(
				styles.recommendationCheckboxButton,
				styles.recommendationCheckboxButton2,
				visible ? styles.recommendationCheckboxButton3 : styles.recommendationCheckboxButton4,
				selected && styles.recommendationCheckboxButton5,
			)}
		>
			{selected ? <CircleCheck className={styles.recommendationCardCheck} /> : <Circle className={styles.recommendationCardCheck} />}
		</button>
	);
}

type PrState = 'open' | 'closed' | 'merged';

const PR_STATUS_LABEL: Record<PrState, string> = {
	open: 'View PR',
	merged: 'PR merged',
	closed: 'PR closed',
};

function PrStatusIcon({ state }: { state: PrState | undefined }) {
	if (state === 'merged') {
		return <GitMerge className={styles.recommendationCardCheck} />;
	}
	if (state === 'closed') {
		return <GitPullRequestClosed className={styles.recommendationCardCheck} />;
	}
	return <ExternalLink className={styles.recommendationCardCheck} />;
}
