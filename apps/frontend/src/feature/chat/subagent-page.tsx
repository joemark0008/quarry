import { getRouteApi } from '@tanstack/react-router';
import { SubagentConversation } from '@/feature/chat/components/subagent/subagent-conversation';

const Route = getRouteApi('/_protected/_chat-layout/$chatId_/subagent/$toolCallId');


export function RouteComponent() {
	const { chatId, toolCallId } = Route.useParams();
	return <SubagentConversation chatId={chatId} toolCallId={toolCallId} />;
}
