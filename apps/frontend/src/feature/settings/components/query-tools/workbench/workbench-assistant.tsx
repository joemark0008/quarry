import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Plus, Square } from 'lucide-react';
import { useRef } from 'react';
import styles from './query-workbench.module.css';

import { Button } from '@/components/ui/button';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ui/conversation';
import { Empty } from '@/components/ui/empty';
import { useAgentContext, useAgentMessages } from '@/contexts/agent.provider';
import { AskInput } from '@/feature/chat/components/ask-bar';
import { ChatMessagesContent } from '@/feature/chat/components/chat-messages/chat-messages';
import { projectApi } from '@/lib/project-api';

/** The conversation beside the editor. The agent only offers queries, which the user applies from a card. */
export function WorkbenchAssistant({
	isDisabled,
	onNewConversation,
}: {
	/** No warehouse to write queries for. */
	isDisabled: boolean;
	onNewConversation: () => void;
}) {
	const defaultModel = useQuery(projectApi.project.getDefaultChatModel.queryOptions());
	const { queueOrSendMessage, isRunning, cancelAgent } = useAgentContext();
	const messages = useAgentMessages();
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const hasNoModel = defaultModel.isSuccess && !defaultModel.data;

	return (
		<section className={styles.assistant} aria-label='Assistant'>
			<header className={styles.assistantHeader}>
				<h2 className={styles.paneTitle}>Assistant</h2>
				{messages.length > 0 && (
					<Button variant='ghost-muted' size='sm' onClick={onNewConversation} disabled={isRunning}>
						<Plus />
						New conversation
					</Button>
				)}
			</header>
			{hasNoModel ? (
				<Empty>
					The assistant needs a model. <Link to='/settings/project/models'>Set one up</Link> to use it. The
					editor and Run work without it.
				</Empty>
			) : (
				<>
					<Conversation className={styles.assistantConversation}>
						<ConversationContent className={styles.assistantConversationContent}>
							{messages.length > 0 ? (
								<ChatMessagesContent />
							) : (
								<Empty>
									Describe the query you need, like “top 10 customers by revenue this year”. The
									assistant tests it, then you choose whether to apply it.
								</Empty>
							)}
						</ConversationContent>
						<ConversationScrollButton />
					</Conversation>
					<div className={styles.assistantInput}>
						{isRunning && (
							<Button variant='ghost-muted' size='sm' onClick={() => void cancelAgent()}>
								<Square />
								Stop
							</Button>
						)}
						{!isDisabled && (
							<AskInput
								inputRef={inputRef}
								placeholder='Ask for a query…'
								isSending={isRunning}
								onSubmit={(text) => void queueOrSendMessage({ text })}
							/>
						)}
					</div>
				</>
			)}
		</section>
	);
}
