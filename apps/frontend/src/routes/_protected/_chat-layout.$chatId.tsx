import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowRight, Folder, GitFork, Globe, Upload } from 'lucide-react';
import { SYSTEM_EXAMPLE_PROJECT_ID } from '@quarry/shared';
import type { ForkMetadata, UIMessage } from '@quarry/api/agent/types/chat';
import type { SelectionData } from '@/components/highlight-bubble';
import type { Chat } from '@/queries/use-chat-query';
import { NEW_CHAT_ID } from '@/lib/ai';
import { ChatStoryShortcut } from '@/components/chat-story-shortcut';
import { StoryViewer } from '@/components/side-panel/story-viewer';
import { ChatAccessError } from '@/components/chat-access-error';
import { ChatArtifactsMenu } from '@/components/chat-artifacts-menu';
import { ExampleProjectInfoCard } from '@/components/example-project-info-card';
import { ChatInput } from '@/components/chat-input';
import { ChatMessages } from '@/components/chat-messages/chat-messages';
import { HighlightBubble } from '@/components/highlight-bubble';
import { isOnboardingComplete, useOnboardingProgress } from '@/components/onboarding-progress';
import { SidePanel } from '@/components/side-panel/side-panel';
import { StoryBlockEditPanel } from '@/components/custom-story/story-block-edit-panel';
import { MobileHeader } from '@/components/mobile-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAgentContext, useAgentMessagesSelector } from '@/contexts/agent.provider';
import { useSidePanel } from '@/hooks/use-side-panel';
import { SidePanelProvider } from '@/contexts/side-panel';
import { EditableChatTitle } from '@/components/editable-chat-title';
import { useChatQuery } from '@/queries/use-chat-query';
import { useHeight } from '@/hooks/use-height';
import { ShareChatDialog } from '@/components/share-dialog.chat';
import { usePermissions } from '@/hooks/use-permissions';
import { SelectionProvider } from '@/contexts/text-selection';
import { chatPendingCitationStore } from '@/stores/chat-pending-citation';
import { storyBlockEditStore } from '@/stores/story-block-edit';
import { STORY_BLOCK_EDIT_PANEL_MIN_WIDTH } from '@/lib/side-panel';
import { useSetChatInputCallback } from '@/contexts/set-chat-input-callback';
import { getTextOffset } from '@/lib/selection-dom.utils';
import { findStories } from '@/lib/story.utils';
import { shouldShowChatAccessError } from '@/lib/api-error';
import { useCurrentProject, useProjects } from '@/hooks/use-current-project';
import { chatApi } from '@/lib/chat-api';
import styles from './_chat-layout.$chatId.module.css';

const SELECTION_FORK_TYPES: ForkMetadata['type'][] = ['chat_selection', 'chat_question', 'story_selection'];

export const Route = createFileRoute('/_protected/_chat-layout/$chatId')({
	component: RouteComponent,
});

function RouteComponent() {
	const { chatId } = Route.useParams();
	const { isViewer } = usePermissions();
	const router = useRouter();

	useEffect(() => {
		if (isViewer && chatId === NEW_CHAT_ID) {
			router.navigate({ to: '/' });
		}
	}, [isViewer, chatId, router]);

	if (isViewer && chatId === NEW_CHAT_ID) {
		return null;
	}

	return <ChatPage />;
}

function ChatPage() {
	const { isLoadingMessages, isRunning } = useAgentContext();
	const router = useRouter();
	const { chatId } = Route.useParams();
	const chat = useChatQuery({ chatId, select: selectChatHeader });
	const title = chat.data?.title;

	const shouldShowChatError = shouldShowChatAccessError(chat);

	const shareQuery = useQuery({
		...chatApi.sharedChat.getShareOptionsByChatId.queryOptions({ chatId }),
		enabled: !!chat.data && !shouldShowChatError,
	});
	const isShared = !!shareQuery.data?.shareId;
	const currentProject = useCurrentProject();
	const projects = useProjects();
	const onboardingProgress = useOnboardingProgress();
	const isExampleChat = chat.data?.projectId === SYSTEM_EXAMPLE_PROJECT_ID;
	const isInMultipleProjects = (projects.data?.length ?? 0) > 1;
	const chatProject = isInMultipleProjects ? projects.data?.find((p) => p.id === chat.data?.projectId) : undefined;
	const onboardingComplete = isOnboardingComplete(currentProject.data != null, onboardingProgress, false);

	const containerRef = useRef<HTMLDivElement>(null);
	const chatColumnRef = useRef<HTMLDivElement>(null);
	const sidePanelRef = useRef<HTMLDivElement>(null);
	const inputAreaRef = useRef<HTMLDivElement>(null);
	const inputAreaHeight = useHeight(inputAreaRef);

	const sidePanel = useSidePanel({ containerRef, sidePanelRef });
	const isEditingStoryBlock =
		useSyncExternalStore(storyBlockEditStore.subscribe, storyBlockEditStore.getSnapshot) !== null;
	const latestStorySlug = useAgentMessagesSelector(findLatestStorySlug);
	const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
	const chatInputCallback = useSetChatInputCallback();

	const handleSelectionAsk = useCallback(
		(data: SelectionData) => {
			const { range, ...selection } = data;
			const storyMeta = resolveStoryCitationMeta(sidePanel.currentStorySlug, range);
			chatPendingCitationStore.set({ chatId, ...selection, ...storyMeta });
			chatInputCallback.fire('');
		},
		[chatId, chatInputCallback, sidePanel.currentStorySlug],
	);

	const isSelectionFork = SELECTION_FORK_TYPES.includes(chat.data?.forkMetadata?.type ?? 'chat');
	const headerCitation = buildHeaderCitation(isSelectionFork ? chat.data?.forkMetadata : undefined);

	useEffect(() => {
		const openStorySlug = router.state.location.state.openStorySlug;
		if (shouldShowChatError || !openStorySlug || isLoadingMessages) {
			return;
		}

		sidePanel.open(<StoryViewer chatId={chatId} storySlug={openStorySlug} />, openStorySlug);

		const timer = setTimeout(() => {
			router.history.replace(router.state.location.href, {
				...router.state.location.state,
				openStorySlug: undefined,
			});
		});
		return () => clearTimeout(timer);
	}, [shouldShowChatError, isLoadingMessages]); // eslint-disable-line react-hooks/exhaustive-deps

	if (shouldShowChatError) {
		return <ChatAccessError error={chat.error} onRetry={() => chat.refetch()} chatId={chatId} />;
	}
	return (
		<SidePanelProvider
			isVisible={sidePanel.isVisible}
			currentStorySlug={sidePanel.currentStorySlug}
			setCurrentStorySlug={sidePanel.setCurrentStorySlug}
			currentStoryTabIndex={sidePanel.currentStoryTabIndex}
			setCurrentStoryTabIndex={sidePanel.setCurrentStoryTabIndex}
			chatId={chatId}
			open={sidePanel.open}
			close={sidePanel.close}
		>
			<ChatStoryShortcut chatId={chatId} latestStorySlug={latestStorySlug} />
			<SelectionProvider resetKey={chatId}>
				<div className={styles.chatPageDiv} ref={containerRef}>
					<div
						ref={chatColumnRef}
						className={styles.chatPageDiv2}
						style={{ '--chat-input-height': `${inputAreaHeight}px` } as React.CSSProperties}
					>
						<MobileHeader
							chatId={chatId}
							title={title}
							showExampleProjectInfo={isExampleChat && !chat.data?.isOnboarding}
						/>

						<div className={`${styles.chatPageDiv3} group/header`}>
							<div className={styles.chatPageDiv4}>
								{title && (
									<EditableChatTitle
										chatId={chatId}
										title={title}
										className={styles.chatPageEditableChatTitle}
									/>
								)}
								{chatProject && (
									<Badge variant='outline' className={styles.chatPageBadge}>
										<Folder />
										<span className={styles.chatPageSpan}>{chatProject.name}</span>
									</Badge>
								)}
								{chat.data?.forkMetadata && (
									<Badge variant='outline' className={styles.chatPageBadge}>
										<GitFork />
										<span className={styles.chatPageSpan}>
											{chat.data.forkMetadata.type === 'story' ||
											chat.data.forkMetadata.type === 'story_selection'
												? 'Story'
												: 'Chat'}{' '}
											thread from{' '}
										</span>
										<span className={styles.chatPageSpan2}>
											{chat.data.forkMetadata.authorName}
										</span>
										{headerCitation && (
											<span className={styles.chatPageSpan}>
												{' '}
												— {headerCitation.citation}: &ldquo;{headerCitation.text}&rdquo;
											</span>
										)}
									</Badge>
								)}
							</div>
							<div className={styles.chatPageDiv5}>
								{isExampleChat && !chat.data?.isOnboarding && <ExampleProjectInfoCard compact />}
								<Button
									variant='outline'
									size='icon-sm'
									className={styles.chatPageButton}
									onClick={() => setIsShareDialogOpen(true)}
									disabled={isRunning}
									aria-label='Share Chat'
								>
									{!isRunning && isShared ? (
										<>
											<Globe className={styles.chatPageGlobe} />
											<span className={styles.chatPageSpan3}>Chat shared</span>
										</>
									) : (
										<>
											<Upload className={styles.chatPageUpload} strokeWidth={2.25} />
											<span className={styles.chatPageSpan3}>Share chat</span>
										</>
									)}
								</Button>
								<ChatArtifactsMenu
									key={chatId}
									chatId={chatId}
									chatColumnRef={chatColumnRef}
									panelClassName={styles.chatPageChatArtifactsMenu}
								/>
							</div>
						</div>

						<div className={styles.chatPageDiv6}>
							<div className={styles.chatPageDiv7} />
							<div className={styles.chatPageDiv8} />
						</div>

						{isLoadingMessages ? (
							<div className={styles.chatPageDiv9}>
								<Spinner />
							</div>
						) : (
							<>
								<HighlightBubble onAsk={handleSelectionAsk} disabled={isRunning} />
								<ChatMessages />
							</>
						)}
						<StoryBlockEditPanel chatId={chatId} />
						<div className={styles.chatPageDiv10}>
							<div
								ref={inputAreaRef}
								className={styles.chatPageDiv11}
							>
								{chat.data?.isOnboarding ? (
									onboardingComplete ? (
										<div className={styles.chatPageDiv12}>
											<p className={styles.chatPageP}>
												Project setup successful!
											</p>
											<Button
												asChild
												className={styles.chatPageButton2}
											>
												<Link to='/'>
													Start chatting
													<ArrowRight className={styles.chatPageArrowRight} />
												</Link>
											</Button>
											<p className={styles.chatPageP2}>
												This onboarding conversation is complete.
											</p>
										</div>
									) : (
										<ChatInput variant='onboarding' />
									)
								) : (
									<ChatInput />
								)}
							</div>
						</div>
					</div>

					{sidePanel.content && (
						<SidePanel
							containerRef={containerRef}
							isAnimating={sidePanel.isAnimating}
							sidePanelRef={sidePanelRef}
							resizeHandleRef={sidePanel.resizeHandleRef}
							chatPanelMinWidth={isEditingStoryBlock ? STORY_BLOCK_EDIT_PANEL_MIN_WIDTH : undefined}
						>
							{sidePanel.content}
						</SidePanel>
					)}
				</div>
			</SelectionProvider>
			<ShareChatDialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen} chatId={chatId} />
		</SidePanelProvider>
	);
}

function selectChatHeader(chat: Chat) {
	return {
		title: chat.title,
		projectId: chat.projectId,
		isOnboarding: chat.isOnboarding,
		forkMetadata: chat.forkMetadata,
		automationRun: chat.automationRun,
	};
}

function findLatestStorySlug(messages: UIMessage[]): string | undefined {
	return findStories(messages).at(-1)?.id;
}

function resolveStoryCitationMeta(
	currentStorySlug: string | null,
	range: Range,
): { storySlug: string; start: number; end: number } | null {
	if (!currentStorySlug) {
		return null;
	}

	const storyContainer = document.querySelector('[data-story-content]');
	if (!storyContainer || !storyContainer.contains(range.commonAncestorContainer)) {
		return null;
	}

	const start = getTextOffset(storyContainer, range.startContainer, range.startOffset);
	const end = getTextOffset(storyContainer, range.endContainer, range.endOffset);
	if (start < 0 || end < 0) {
		return null;
	}

	return { storySlug: currentStorySlug, start, end };
}

function buildHeaderCitation(meta: ForkMetadata | undefined): { citation: string; text: string } | null {
	if (!meta?.selectionText) {
		return null;
	}
	const text = meta.selectionText.length > 20 ? `${meta.selectionText.slice(0, 20)}\u2026` : meta.selectionText;
	const citation = `@chars ${meta.selectionStart}–${meta.selectionEnd}`;
	return { citation, text };
}
