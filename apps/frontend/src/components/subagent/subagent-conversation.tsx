import { Link } from '@tanstack/react-router';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import type { UIMessage, UIToolPart } from '@quarry/api/agent/types/chat';
import type { Chat } from '@/queries/use-chat-query';
import { taskTitle } from '@/components/tool-calls/task';
import { UserMessageBubble } from '@/components/chat-messages/user-message';
import { SubagentReport } from '@/components/subagent/subagent-report';
import { SubagentWork } from '@/components/subagent/subagent-work';
import { Button } from '@/components/ui/button';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ui/conversation';
import { Spinner } from '@/components/ui/spinner';
import { TextShimmer } from '@/components/ui/text-shimmer';
import { useAgentContext, useAgentMessagesSelector } from '@/contexts/agent.provider';
import { isToolSettled } from '@/lib/ai';
import { useChatQuery } from '@/queries/use-chat-query';
import styles from './subagent-conversation.module.css';

export type SubagentPart = UIToolPart<'task'>;

/** A subagent run shown as its own conversation: the prompt it received, its work and its report. */
export function SubagentConversation({ chatId, toolCallId }: { chatId: string; toolCallId: string }) {
	const { data: chatTitle } = useChatQuery({ chatId, select: selectChatTitle });
	const { isLoadingMessages, isRunning } = useAgentContext();
	const part = useAgentMessagesSelector((messages) => findSubagentPart(messages, toolCallId));
	const title = taskTitle(part?.input);
	const isSettled = !!part && (isToolSettled(part) || !isRunning);

	return (
		<div className={styles.subagentConversationDiv}>
			<Header chatId={chatId} chatTitle={chatTitle} title={title} />
			{isLoadingMessages ? (
				<div className={styles.subagentConversationDiv2}>
					<Spinner />
				</div>
			) : !part ? (
				<NotFound chatId={chatId} />
			) : (
				<SubagentConversationBody part={part} isSettled={isSettled} />
			)}
		</div>
	);
}

function selectChatTitle(chat: Chat): string {
	return chat.title;
}

function Header({ chatId, chatTitle, title }: { chatId: string; chatTitle: string | undefined; title: string }) {
	return (
		<div className={styles.headerDiv}>
			<nav aria-label='Conversation navigation' className={styles.headerNav}>
				<Link
					to='/$chatId'
					params={{ chatId }}
					className={styles.headerLink}
				>
					{chatTitle ?? 'Conversation'}
				</Link>
				<ChevronRight className={styles.headerChevronRight} />
				<span className={styles.headerSpan}>{title}</span>
			</nav>
			<Button variant='ghost' size='sm' asChild>
				<Link to='/$chatId' params={{ chatId }}>
					<ArrowLeft />
					Back to conversation
				</Link>
			</Button>
		</div>
	);
}

export function SubagentConversationBody({ part, isSettled }: { part: SubagentPart; isSettled: boolean }) {
	const promptMessage = useMemo(() => toPromptMessage(part), [part]);
	const report = part.output?.report;

	return (
		<Conversation initial={false}>
			<ConversationContent className={styles.subagentConversationBodyConversationContent} data-selection-container>
				<div className={styles.subagentConversationBodyDiv}>
					<UserMessageBubble message={promptMessage} />
				</div>
				<div className={styles.subagentConversationBodyDiv2}>
					<SubagentWork output={part.output} isSettled={isSettled} />
					{part.errorText ? (
						<pre className={styles.subagentConversationBodyPre}>
							{part.errorText}
						</pre>
					) : isSettled && report ? (
						<SubagentReport report={report} />
					) : (
						!isSettled && <TextShimmer showLogo />
					)}
				</div>
			</ConversationContent>
			<ConversationScrollButton />
		</Conversation>
	);
}

function NotFound({ chatId }: { chatId: string }) {
	return (
		<div className={styles.notFoundDiv}>
			<span>This subagent run is not part of the conversation.</span>
			<Button variant='outline' size='sm' asChild>
				<Link to='/$chatId' params={{ chatId }}>
					<ArrowLeft />
					Back to conversation
				</Link>
			</Button>
		</div>
	);
}

export function findSubagentPart(messages: UIMessage[], toolCallId: string): SubagentPart | undefined {
	for (const message of messages) {
		for (const part of message.parts) {
			if (part.type === 'tool-task' && part.toolCallId === toolCallId) {
				return part;
			}
		}
	}
	return undefined;
}

function toPromptMessage(part: SubagentPart): UIMessage {
	return {
		id: part.toolCallId,
		role: 'user',
		parts: [{ type: 'text', text: part.input?.prompt ?? '' }],
	};
}
