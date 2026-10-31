import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, PencilRuler, Database, Library, Paperclip, Shield, Check } from 'lucide-react';
import { ALLOWED_IMAGE_MEDIA_TYPES, ATTACHMENT_ACCEPT } from '@quarry/shared/attachments';
import { toStoryReferenceMentionId } from '@quarry/shared';
import { story } from '@quarry/shared/tools';
import { Button, ChatButton, MicButton } from './ui/button';
import { SlidingWaveform } from './chat-input-sliding-waveform';
import {
	ChatPrompt,
	DATABASE_MENTION_TRIGGER,
	openMentionMenuAtEnd,
	openReferenceMenuAtEnd,
	SKILL_MENTION_TRIGGER,
	STORY_REFERENCE_MENTION_TRIGGER,
	useStoryMentionOptions,
	useStoryReferenceOptions,
} from './chat-input-prompt';
import { ChatInputAnimatedBorder } from './chat-input-animated-border';
import { ChatInputModelSelect } from './chat-input-model-select';
import { ChatInputMessageQueue } from './chat-input-message-queue';
import { ChatInputAttachmentPreview } from './chat-input-attachment-preview';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from './ui/dropdown-menu';
import type { MentionOption, PromptHandle, SelectedMention } from 'prompt-mentions';
import type { FormEvent } from 'react';
import type { AgentHelpers } from '@/hooks/use-agent';
import type { StoryReferences } from '@/lib/story-reference';
import { ContextWindowRing } from '@/components/ui/chat-input-context-window-ring';
import { SimpleTooltip } from '@/components/ui/tooltip';

import { InputGroup, InputGroupAddon } from '@/components/ui/input-group';
import { skillApi } from '@/lib/skill-api';
import { useAgentContext, useAgentMessagesSelector } from '@/contexts/agent.provider';
import { useRegisterSetChatInputCallback } from '@/contexts/set-chat-input-callback';
import { useTranscribe } from '@/hooks/use-transcribe';
import { useAttachmentUpload } from '@/hooks/use-attachment-upload';
import { cn } from '@/lib/utils';
import { useChatId } from '@/hooks/use-chat-id';
import { useModelSelection } from '@/hooks/use-model-selection';
import { usePermissions } from '@/hooks/use-permissions';
import { getShortcut } from '@/lib/keyboard-shortcuts';
import { matchesShortcut } from '@/lib/platform';
import {
	STORIES_ROOT_ID,
	TABLES_ROOT_ID,
	toStoryFolderReferenceOption,
	toStoryReferenceOption,
} from '@/lib/reference-mention-menu';
import { hasAnyStoryReference, mayCarryStories, readDroppedReferences } from '@/lib/story-reference';
import { takePendingStoryReferences, usePendingStoryReferences } from '@/stores/story-references';
import { messageQueueStore } from '@/stores/chat-message-queue';
import { chatInputRestoreStore, useChatInputRestore } from '@/stores/chat-input-restore';
import { chatPendingCitationStore } from '@/stores/chat-pending-citation';
import { useChatPendingCitation } from '@/hooks/use-chat-pending-citation';
import { useEffectiveUserGroupFeatures } from '@/hooks/use-effective-user-group-features';
import { SelectionCitationBanner } from '@/components/selection-citation-banner';
import { ChatInputSuggestions } from '@/components/chat-input-suggestions';
import { runWithStoryBeforeAgentSend, useStoryBeforeAgentSend } from '@/contexts/story-before-agent-send';
import { useIsCloud } from '@/hooks/use-quarry-mode';
import { useCurrentProject } from '@/hooks/use-current-project';
import { projectApi } from '@/lib/project-api';
import { storageApi } from '@/lib/storage-api';
import { storyApi } from '@/lib/story-api';
import styles from './chat-input.module.css';

const cycleModelShortcut = getShortcut('cycle-model').shortcut;
const TRIAL_ATTACHMENT_ACCEPT = ALLOWED_IMAGE_MEDIA_TYPES.join(',');
const TRIAL_DOCUMENTS_DISABLED_REASON = 'Documents can be attached once your project is set up. Images work now.';

type ChatInputVariant = 'default' | 'onboarding';

type ChatInputBaseProps = {
	promptRef: React.RefObject<PromptHandle | null>;
	className?: string;
	variant?: ChatInputVariant;
	placeholder?: string;
	initialText?: string;
	onCancel?: () => void;
	onSubmitMessage: AgentHelpers['queueOrSendMessage'];
	allowQueueing?: boolean;
	acceptsPendingStoryReferences?: boolean;
};

type ChatInputInlineProps = {
	className?: string;
	initialText: string;
	onCancel?: () => void;
	onSubmitMessage: AgentHelpers['queueOrSendMessage'];
};

export function ChatInput({
	variant = 'default',
	acceptsPendingStoryReferences = false,
}: {
	variant?: ChatInputVariant;
	acceptsPendingStoryReferences?: boolean;
}) {
	const promptRef = useRef<PromptHandle>(null);
	const { queueOrSendMessage } = useAgentContext();

	useRegisterSetChatInputCallback((text) => {
		promptRef.current?.clear();
		if (text) {
			promptRef.current?.insertText(text);
		}
		requestAnimationFrame(() => promptRef.current?.focus());
	});

	return (
		<ChatInputBase
			promptRef={promptRef}
			variant={variant}
			onSubmitMessage={queueOrSendMessage}
			allowQueueing
			acceptsPendingStoryReferences={acceptsPendingStoryReferences}
		/>
	);
}

export function ChatInputInline({ className, initialText, onCancel, onSubmitMessage }: ChatInputInlineProps) {
	const promptRef = useRef<PromptHandle>(null);

	return (
		<ChatInputBase
			promptRef={promptRef}
			className={className}
			initialText={initialText}
			onCancel={onCancel}
			onSubmitMessage={onSubmitMessage}
		/>
	);
}

function ChatInputBase({
	promptRef,
	className,
	variant = 'default',
	placeholder,
	initialText,
	onCancel,
	onSubmitMessage,
	allowQueueing,
	acceptsPendingStoryReferences = false,
}: ChatInputBaseProps) {
	const [inputText, setInputText] = useState('');
	const {
		isRunning,
		cancelAgent,
		isLoadingMessages,
		adminMode,
		setAdminMode,
		setMentions,
		submitQueuedMessageNow,
		mode,
	} = useAgentContext();
	const navigate = useNavigate();
	const { canChatWithQuarryData } = usePermissions();
	const { storyCreationEnabled } = useEffectiveUserGroupFeatures();
	const storyMentionOptions = useStoryMentionOptions(storyCreationEnabled);
	const { options: storyReferenceOptions, isLoaded: areReferenceableStoriesLoaded } = useStoryReferenceOptions({
		excludeCurrentChat: true,
	});
	const chatId = useChatId();
	const storyBeforeAgentSend = useStoryBeforeAgentSend();

	const isAdminMode = canChatWithQuarryData && adminMode;
	const adminModeLocked = useAgentMessagesSelector((messages) => messages.some((message) => message.role === 'user'));
	const handleSelectAdminMode = useCallback(() => {
		if (!adminModeLocked) {
			setAdminMode(!isAdminMode);
			return;
		}
		if (isAdminMode) {
			return;
		}
		navigate({ to: '/', search: { admin: true } });
	}, [adminModeLocked, isAdminMode, setAdminMode, navigate]);
	const { canCycleModels, cycleModel } = useModelSelection();
	const project = useCurrentProject();
	const hasProject = project.data != null;
	const isTrial = useIsCloud() && project.data === null;
	const uploadLimits = useQuery({
		...storageApi.storage.getUploadLimits.queryOptions(),
		enabled: hasProject,
	});
	const attachmentUpload = useAttachmentUpload({
		documentsEnabled: isTrial ? false : uploadLimits.data?.enabled,
		documentsDisabledReason: isTrial ? TRIAL_DOCUMENTS_DISABLED_REASON : undefined,
		maxDocumentSizeMb: uploadLimits.data?.maxFileSizeMb ?? 0,
	});
	const chatInputRestore = useChatInputRestore(!!allowQueueing);

	const agentSettings = useQuery({
		...projectApi.project.getAgentSettings.queryOptions(),
		enabled: hasProject,
	});
	const transcribeModels = useQuery({
		...projectApi.project.getKnownTranscribeModels.queryOptions(),
		enabled: hasProject,
	});
	const isTranscribeEnabled = hasProject && (agentSettings.data?.transcribe?.enabled ?? false);
	const hasTranscribeProvider = Object.values(transcribeModels.data ?? {}).some((p) => p.hasKey);
	const isTranscribeReady = isTranscribeEnabled && hasTranscribeProvider;

	const [micWarning, setMicWarning] = useState(false);
	const micWarningTimer = useRef(0);
	const dropZoneRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);

	useEffect(() => promptRef.current?.focus(), [chatId, promptRef]);

	const queryClient = useQueryClient();
	const currentProjectId = project.data?.id;

	/** Stories past the referenceable list, such as older ones in a large project, are resolved one by one. */
	const findStoryReferenceOption = useCallback(
		async (storyId: string): Promise<MentionOption | null> => {
			const option = storyReferenceOptions.find(
				(storyOption) => storyOption.id === toStoryReferenceMentionId(storyId),
			);
			if (option) {
				return option;
			}
			const resolved = await queryClient
				.fetchQuery(storyApi.story.resolve.queryOptions({ storyId }))
				.catch(() => null);
			return resolved &&
				!resolved.isArchived &&
				resolved.chatId !== chatId &&
				resolved.projectId === currentProjectId
				? toStoryReferenceOption(resolved)
				: null;
		},
		[storyReferenceOptions, queryClient, chatId, currentProjectId],
	);

	const storyFolders = useQuery(storyApi.storyFolder.listTree.queryOptions({ archived: false }));

	const findFolderReferenceOption = useCallback(
		(folderId: string): MentionOption | null => {
			const folder = storyFolders.data?.find((storyFolder) => storyFolder.id === folderId);
			return folder ? toStoryFolderReferenceOption(folder) : null;
		},
		[storyFolders.data],
	);

	const addStoryReferences = useCallback(
		async ({ storyIds, folderIds }: StoryReferences) => {
			const storyOptions = await Promise.all(storyIds.map(findStoryReferenceOption));
			for (const option of [...storyOptions, ...folderIds.map(findFolderReferenceOption)]) {
				if (option) {
					promptRef.current?.appendMention(option, STORY_REFERENCE_MENTION_TRIGGER);
				}
			}
			requestAnimationFrame(() => promptRef.current?.focus());
		},
		[findStoryReferenceOption, findFolderReferenceOption, promptRef],
	);

	const pendingStoryReferences = usePendingStoryReferences();

	const areReferencesLoaded = areReferenceableStoriesLoaded && storyFolders.isSuccess;

	useEffect(() => {
		if (!acceptsPendingStoryReferences || !hasAnyStoryReference(pendingStoryReferences) || !areReferencesLoaded) {
			return;
		}
		const references = takePendingStoryReferences();
		if (hasAnyStoryReference(references)) {
			addStoryReferences(references);
		}
	}, [acceptsPendingStoryReferences, pendingStoryReferences, areReferencesLoaded, addStoryReferences]);

	useEffect(() => {
		if (!allowQueueing || !chatInputRestore) {
			return;
		}

		chatInputRestoreStore.clear();
		promptRef.current?.clear();
		promptRef.current?.insertText(chatInputRestore.text);
		setInputText(chatInputRestore.text);
		attachmentUpload.clearAttachments();
		attachmentUpload.restoreDocuments(chatInputRestore.documents);

		if (chatInputRestore.citation && chatId) {
			chatPendingCitationStore.set({ ...chatInputRestore.citation, chatId });
		}

		const restoreImages = async () => {
			const files = await Promise.all(
				chatInputRestore.images.map(({ url, mediaType }, index) =>
					dataUrlToFile(url, mediaType, `image-${index + 1}`),
				),
			);
			await attachmentUpload.addFiles(files);
			requestAnimationFrame(() => promptRef.current?.focus());
		};
		restoreImages();
	}, [allowQueueing, chatInputRestore]); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		const el = dropZoneRef.current;
		if (!el) {
			return;
		}

		let dragCounter = 0;

		const handleDragEnter = (e: DragEvent) => {
			e.preventDefault();
			dragCounter++;
			if (e.dataTransfer?.types.includes('Files') || mayCarryStories(e.dataTransfer)) {
				setIsDragging(true);
			}
		};

		const handleDragLeave = (e: DragEvent) => {
			e.preventDefault();
			dragCounter--;
			if (dragCounter === 0) {
				setIsDragging(false);
			}
		};

		const handleDragOver = (e: DragEvent) => {
			e.preventDefault();
		};

		const handleDrop = (e: DragEvent) => {
			e.preventDefault();
			dragCounter = 0;
			setIsDragging(false);
			const references = readDroppedReferences(e.dataTransfer);
			if (hasAnyStoryReference(references)) {
				addStoryReferences(references);
				return;
			}
			if (e.dataTransfer?.files) {
				attachmentUpload.addFiles(e.dataTransfer.files);
			}
		};

		el.addEventListener('dragenter', handleDragEnter);
		el.addEventListener('dragleave', handleDragLeave);
		el.addEventListener('dragover', handleDragOver);
		el.addEventListener('drop', handleDrop);
		return () => {
			el.removeEventListener('dragenter', handleDragEnter);
			el.removeEventListener('dragleave', handleDragLeave);
			el.removeEventListener('dragover', handleDragOver);
			el.removeEventListener('drop', handleDrop);
		};
	}, [attachmentUpload.addFiles, addStoryReferences]); // eslint-disable-line

	useEffect(() => {
		const handler = (e: ClipboardEvent) => {
			if (dropZoneRef.current?.contains(e.target as Node)) {
				attachmentUpload.handlePaste(e);
			}
		};
		document.addEventListener('paste', handler);
		return () => document.removeEventListener('paste', handler);
	}, [attachmentUpload.handlePaste]); // eslint-disable-line

	const showMicWarning = useCallback(() => {
		setMicWarning(true);
		window.clearTimeout(micWarningTimer.current);
		micWarningTimer.current = window.setTimeout(() => setMicWarning(false), 5000);
	}, []);

	const runGuardedAgentSend = useCallback(
		(send: () => Promise<void>) =>
			runWithStoryBeforeAgentSend({
				beforeSend: () => (chatId ? storyBeforeAgentSend.run(chatId) : Promise.resolve({ canSend: true })),
				send,
			}),
		[chatId, storyBeforeAgentSend],
	);

	const submitQueuedMessageWithGuard = useCallback(
		async (messageId: string) => {
			await runGuardedAgentSend(() => submitQueuedMessageNow(messageId));
		},
		[runGuardedAgentSend, submitQueuedMessageNow],
	);

	const submitMessage = useCallback(
		async (text: string, currentMentions: SelectedMention[] = []) => {
			const trimmedInput = text.trim();
			const citationSnapshot = chatPendingCitationStore.getSnapshot();
			const hasCitation = !!citationSnapshot && citationSnapshot.chatId === chatId;

			if (!trimmedInput && !attachmentUpload.hasAttachments && !hasCitation) {
				if (isRunning && allowQueueing) {
					const queue = messageQueueStore.getSnapshot(chatId);
					if (queue?.length) {
						await submitQueuedMessageWithGuard(queue[0].id);
					}
				}
				return;
			}

			if ((isRunning && !allowQueueing) || attachmentUpload.isPreparing || attachmentUpload.hasErrors) {
				return;
			}

			await runGuardedAgentSend(() => {
				const citation = hasCitation
					? {
							start: citationSnapshot.start,
							end: citationSnapshot.end,
							text: citationSnapshot.text,
							storySlug: citationSnapshot.storySlug,
							block: citationSnapshot.block,
						}
					: undefined;
				if (hasCitation) {
					chatPendingCitationStore.clear();
				}

				setMentions(currentMentions.map((m) => ({ id: m.id, label: m.label, trigger: m.trigger })));
				promptRef.current?.clear();
				setInputText('');

				const { images, documents } = attachmentUpload.getPayload();
				attachmentUpload.clearAttachments();

				return onSubmitMessage({ text: trimmedInput, images, documents, citation });
			});
		},
		[
			onSubmitMessage,
			isRunning,
			allowQueueing,
			setMentions,
			promptRef,
			attachmentUpload,
			chatId,
			runGuardedAgentSend,
			submitQueuedMessageWithGuard,
		],
	);

	const {
		state: transcribeState,
		toggle: toggleRecording,
		isRecording,
		isTranscribing,
		analyserRef,
	} = useTranscribe({ onTranscribed: submitMessage });

	useEffect(() => {
		if (typeof initialText !== 'string') {
			return;
		}
		promptRef.current?.clear();
		promptRef.current?.insertText(initialText);
		setInputText(initialText);
		promptRef.current?.focus();
	}, [initialText, promptRef]);

	const handleSubmitMessage = async (e: FormEvent) => {
		e.preventDefault();
		const mentions = promptRef.current?.getMentions() ?? [];
		await submitMessage(inputText, mentions);
	};
	const pendingCitation = useChatPendingCitation(chatId);
	const isInputEmpty = !inputText.trim() && !attachmentUpload.hasAttachments && !pendingCitation;

	const skills = useQuery({ ...skillApi.skill.list.queryOptions(), enabled: hasProject });
	const databaseObjects = useQuery({ ...projectApi.project.getDatabaseObjects.queryOptions(), enabled: hasProject });
	const hasSkills = hasProject && Boolean(skills.data?.length);
	const hasDatabases = hasProject && Boolean(databaseObjects.data?.length);
	const shortcutPlaceholder = buildShortcutPlaceholder({
		hasContext: hasDatabases || storyReferenceOptions.length > 0,
		hasSkills,
		hasStoryMode: storyMentionOptions.length > 0,
	});
	const effectivePlaceholder =
		isRunning && allowQueueing
			? 'Add a follow-up...'
			: variant === 'onboarding'
				? 'Tell me where you are starting from...'
				: (placeholder ?? shortcutPlaceholder);

	const handleEditQueuedMessage = useCallback(
		(text: string) => {
			promptRef.current?.clear();
			promptRef.current?.insertText(text);
			promptRef.current?.focus();
		},
		[promptRef],
	);

	const openMentionMenu = useCallback(
		(trigger: string) => {
			if (promptRef.current) {
				openMentionMenuAtEnd(promptRef.current, trigger);
			}
		},
		[promptRef],
	);

	const openReferenceMenu = useCallback(
		(rootId: string) => {
			if (promptRef.current) {
				openReferenceMenuAtEnd(promptRef.current, rootId);
			}
		},
		[promptRef],
	);

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			const isTypingInPrompt = event.target instanceof HTMLElement && event.target.isContentEditable;
			if (!isTypingInPrompt || !canCycleModels || !matchesShortcut(event.nativeEvent, cycleModelShortcut)) {
				return;
			}
			event.preventDefault();
			cycleModel();
		},
		[canCycleModels, cycleModel],
	);

	return (
		<div ref={dropZoneRef} className={cn(styles.chatInputBaseDiv, className)}>
			<ChatInputMessageQueue onEditMessage={handleEditQueuedMessage} onSubmitNow={submitQueuedMessageWithGuard} />
			<SelectionCitationBanner />
			{allowQueueing && !isAdminMode && (
				<ChatInputSuggestions
					storyCreationEnabled={storyCreationEnabled}
					isHidden={inputText.trim().length > 0}
				/>
			)}
			{isAdminMode ? <ChatInputAdminBadge /> : null}

			<form onSubmit={handleSubmitMessage} onKeyDown={handleKeyDown} className={styles.chatInputBaseForm}>
				<InputGroup
					htmlFor='chat-input'
					className={cn(
						styles.chatInputBaseInputGroup,
						isDragging && styles.chatInputBaseInputGroup2,
						isAdminMode && styles.chatInputBaseInputGroup3,
					)}
				>
					{!isAdminMode && (variant === 'default' || variant === 'onboarding') && <ChatInputAnimatedBorder />}
					<ChatInputAttachmentPreview
						attachments={attachmentUpload.attachments}
						rejection={attachmentUpload.rejection}
						onRemove={attachmentUpload.removeAttachment}
					/>
					<ChatPrompt
						promptRef={promptRef}
						placeholder={effectivePlaceholder}
						storyCreationEnabled={storyCreationEnabled}
						onChange={(value) => setInputText(value)}
						onEnter={(value, mentions) => submitMessage(value, mentions)}
					/>

					<input
						ref={attachmentUpload.fileInputRef}
						type='file'
						accept={isTrial ? TRIAL_ATTACHMENT_ACCEPT : ATTACHMENT_ACCEPT}
						multiple
						className={styles.chatInputBaseInput}
						onChange={attachmentUpload.handleFileInputChange}
					/>

					<InputGroupAddon align='block-end'>
						{variant !== 'onboarding' && (!isTranscribeReady || (!isRecording && !isTranscribing)) && (
							<ChatInputModelSelect isExample={mode === 'example'} />
						)}

						{isTranscribeReady && isRecording && <SlidingWaveform analyserRef={analyserRef} />}

						<div className={styles.chatInputBaseDiv2}>
							{mode !== 'onboarding' && (
								<ChatInputPlusMenu
									hasDatabases={hasDatabases}
									hasStoryReferences={storyReferenceOptions.length > 0}
									hasSkills={hasSkills}
									storyMentions={storyMentionOptions}
									canChatWithQuarryData={canChatWithQuarryData}
									isAdminMode={isAdminMode}
									adminModeLocked={adminModeLocked}
									isTrial={isTrial}
									onSelectAdminMode={handleSelectAdminMode}
									onAddAttachment={attachmentUpload.openFilePicker}
									onAddStory={(mention) => {
										promptRef.current?.appendMention({ id: mention.id, label: mention.label }, '#');
									}}
									onOpenMentionMenu={openMentionMenu}
									onOpenReferenceMenu={openReferenceMenu}
									onFocusPrompt={() => promptRef.current?.focus()}
								/>
							)}

							{onCancel && (
								<Button variant='ghost' type='button' size='sm' onClick={onCancel}>
									Cancel
								</Button>
							)}

							<ContextWindowRing />

							{isTranscribeReady && isRecording && <RecordingTimer />}
							{hasTranscribeProvider && (
								<MicButton
									state={isTranscribeReady ? transcribeState : 'idle'}
									onClick={isTranscribeReady ? toggleRecording : showMicWarning}
									disabled={isRunning && !allowQueueing}
								/>
							)}
							{micWarning && <MicWarningBanner onDismiss={() => setMicWarning(false)} />}

							{allowQueueing && isRunning ? (
								<ChatButton
									showStop={isInputEmpty}
									onClick={isInputEmpty ? cancelAgent : handleSubmitMessage}
									type='button'
								/>
							) : (
								<ChatButton
									showStop={isRunning}
									disabled={isLoadingMessages || isInputEmpty}
									onClick={isRunning ? cancelAgent : handleSubmitMessage}
									type='button'
								/>
							)}
						</div>
					</InputGroupAddon>
				</InputGroup>
			</form>
		</div>
	);
}

async function dataUrlToFile(url: string, mediaType: string, name: string): Promise<File> {
	const response = await fetch(url);
	const blob = await response.blob();
	return new File([blob], name, { type: mediaType });
}

function ChatInputAdminBadge() {
	return (
		<div className={styles.chatInputAdminBadgeDiv}>
			<SimpleTooltip
				side='top'
				align='end'
				content='Chat with your internal quarry data to understand what users are doing.'
			>
				<span
					className={cn(
						styles.chatInputAdminBadgeSpan,
						styles.chatInputAdminBadgeSpan2,
						styles.chatInputAdminBadgeSpan3,
						styles.chatInputAdminBadgeSpan4,
					)}
				>
					<Shield className={styles.chatInputAdminBadgeShield} />
					Admin Mode
				</span>
			</SimpleTooltip>
		</div>
	);
}

function ChatInputPlusMenu({
	hasDatabases,
	hasStoryReferences,
	hasSkills,
	storyMentions,
	canChatWithQuarryData,
	isAdminMode,
	adminModeLocked,
	onSelectAdminMode,
	onAddAttachment,
	onAddStory,
	onOpenMentionMenu,
	onOpenReferenceMenu,
	onFocusPrompt,
}: {
	hasDatabases: boolean;
	hasStoryReferences: boolean;
	hasSkills: boolean;
	storyMentions: MentionOption[];
	canChatWithQuarryData: boolean;
	isAdminMode: boolean;
	adminModeLocked: boolean;
	isTrial: boolean;
	onSelectAdminMode: () => void;
	onAddAttachment: () => void;
	onAddStory: (mention: MentionOption) => void;
	onOpenMentionMenu: (trigger: string) => void;
	onOpenReferenceMenu: (rootId: string) => void;
	onFocusPrompt: () => void;
}) {
	const pendingMentionMenuRef = useRef<(() => void) | null>(null);

	/** The menu takes focus back while closing, so the mention menu is opened once the prompt has it again. */
	const deferMentionMenu = (openMentionMenu: () => void) => {
		pendingMentionMenuRef.current = openMentionMenu;
	};

	const restorePromptFocus = () => {
		const openPendingMentionMenu = pendingMentionMenuRef.current;
		pendingMentionMenuRef.current = null;
		if (openPendingMentionMenu) {
			openPendingMentionMenu();
		} else {
			onFocusPrompt();
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type='button'
					aria-label='Add context'
					className={styles.chatInputPlusMenuButton}
				>
					<Plus className={styles.chatInputPlusMenuPlus} />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				side='top'
				align='start'
				collisionPadding={12}
				className={styles.chatInputPlusMenuDropdownMenuContent}
				onCloseAutoFocus={(e) => {
					e.preventDefault();
					requestAnimationFrame(restorePromptFocus);
				}}
			>
				<DropdownMenuItem onSelect={onAddAttachment}>
					<Paperclip className={styles.chatInputPlusMenuPaperclip} />
					<span>Attach file</span>
				</DropdownMenuItem>
				{hasDatabases && (
					<DropdownMenuItem onSelect={() => deferMentionMenu(() => onOpenReferenceMenu(TABLES_ROOT_ID))}>
						<Database className={styles.chatInputPlusMenuPaperclip} />
						<span>Database tables</span>
					</DropdownMenuItem>
				)}
				{hasStoryReferences && (
					<DropdownMenuItem onSelect={() => deferMentionMenu(() => onOpenReferenceMenu(STORIES_ROOT_ID))}>
						<Library className={styles.chatInputPlusMenuPaperclip} />
						<span>Reference stories</span>
					</DropdownMenuItem>
				)}
				{storyMentions.map((mention) => (
					<DropdownMenuItem key={mention.id} onSelect={() => onAddStory(mention)}>
						{mention.icon}
						<span>{mention.label}</span>
					</DropdownMenuItem>
				))}
				{hasSkills && (
					<DropdownMenuItem onSelect={() => deferMentionMenu(() => onOpenMentionMenu(SKILL_MENTION_TRIGGER))}>
						<PencilRuler className={styles.chatInputPlusMenuPaperclip} />
						<span>Skills</span>
					</DropdownMenuItem>
				)}
				{canChatWithQuarryData && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onSelect={onSelectAdminMode}
							disabled={adminModeLocked && isAdminMode}
							title={adminModeLocked && !isAdminMode ? 'Start a new chat in admin mode' : undefined}
						>
							<Shield className={styles.chatInputPlusMenuPaperclip} />
							<span>Admin mode</span>
							{isAdminMode && <Check className={styles.chatInputPlusMenuCheck} />}
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function buildShortcutPlaceholder({
	hasContext,
	hasSkills,
	hasStoryMode,
}: {
	hasContext: boolean;
	hasSkills: boolean;
	hasStoryMode: boolean;
}): string {
	const shortcuts = [
		hasContext && `${DATABASE_MENTION_TRIGGER} context`,
		hasSkills && `${SKILL_MENTION_TRIGGER} skills`,
		hasStoryMode && `${story.MENTION_TRIGGER} story mode`,
	].filter(Boolean);
	const base = 'Ask anything about your data';
	return shortcuts.length > 0 ? `${base}, ${shortcuts.join(', ')}` : `${base}...`;
}

function RecordingTimer() {
	const [elapsed, setElapsed] = useState(0);

	useEffect(() => {
		const id = setInterval(() => setElapsed((s) => s + 1), 1000);
		return () => clearInterval(id);
	}, []);

	const mins = Math.floor(elapsed / 60);
	const secs = elapsed % 60;

	return (
		<span className={styles.recordingTimerSpan}>
			{mins}:{secs.toString().padStart(2, '0')}
		</span>
	);
}

function MicWarningBanner({ onDismiss }: { onDismiss: () => void }) {
	return (
		<div className={styles.micWarningBannerDiv}>
			<button
				type='button'
				onClick={onDismiss}
				className={styles.micWarningBannerButton}
			>
				&times;
			</button>
			<p className={styles.micWarningBannerP}>
				Voice input is disabled.{' '}
				<Link
					to='/settings/project/models'
					className={styles.micWarningBannerLink}
				>
					Go to Settings &rarr; Models
				</Link>{' '}
				to enable transcription. Ask your admin.
			</p>
		</div>
	);
}
