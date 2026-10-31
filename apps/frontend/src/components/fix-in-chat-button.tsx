import { MessageSquare } from 'lucide-react';

import { useOptionalAgentContext } from '@/contexts/agent.provider';
import { Button } from '@/components/ui/button';
import styles from './fix-in-chat-button.module.css';

export function FixInChatButton({ message, className }: { message: string; className?: string }) {
	const agent = useOptionalAgentContext();
	if (!agent || agent.isReadonly || !message.trim()) {
		return null;
	}

	return (
		<Button
			type='button'
			variant='outline'
			size='sm'
			className={className}
			onClick={() => {
				void agent.queueOrSendMessage({ text: message });
			}}
		>
			<MessageSquare className={styles.fixInChatButtonMessageSquare} />
			Fix in chat
		</Button>
	);
}
