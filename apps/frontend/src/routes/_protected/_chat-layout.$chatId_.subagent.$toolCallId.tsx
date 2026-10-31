import { createFileRoute } from '@tanstack/react-router';
import { RouteComponent } from '@/feature/chat/subagent-page';

export const Route = createFileRoute('/_protected/_chat-layout/$chatId_/subagent/$toolCallId')({
	component: RouteComponent,
});
