import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

interface SubagentLinkProps {
	chatId: string;
	toolCallId: string;
	className?: string;
	children: ReactNode;
}

/** Opens a subagent run as its own conversation. */
export function SubagentLink({ chatId, toolCallId, className, children }: SubagentLinkProps) {
	return (
		<Link to='/$chatId/subagent/$toolCallId' params={{ chatId, toolCallId }} className={className}>
			{children}
		</Link>
	);
}
