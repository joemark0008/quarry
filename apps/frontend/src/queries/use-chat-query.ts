import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { Updater } from '@tanstack/react-query';
import type { inferRouterOutputs } from '@trpc/server';
import type { TrpcRouter } from '@quarry/shared/backend/trpc';
import { isRetryableTrpcError } from '@/lib/trpc-error';
import { chatApi } from '@/lib/chat-api';

export type Chat = inferRouterOutputs<TrpcRouter>['chat']['get'];

/**
 * The chat cache is rewritten on every streamed chunk, so components that only need a few
 * fields should pass a `select` to avoid re-rendering for each chunk.
 */
export const useChatQuery = <TSelected = Chat>({
	chatId,
	select,
}: {
	chatId?: string;
	select?: (chat: Chat) => TSelected;
}) => {
	return useQuery({
		...chatApi.chat.get.queryOptions(
			{ chatId: chatId ?? '' },
			{
				enabled: !!chatId,
				refetchInterval: (query) => (query.state.data?.automationRun?.status === 'running' ? 1_500 : false),
				retry: (failureCount, error) => failureCount < 3 && isRetryableTrpcError(error),
				retryDelay: 500,
			},
		),
		select,
	});
};

/** Writes the cached chat (streamed messages, renames, feedback…). */
export const useSetChat = () => {
	const queryClient = useQueryClient();
	return useCallback(
		(input: { chatId?: string }, updater: Updater<Chat | undefined, Chat | undefined>) => {
			queryClient.setQueryData(chatApi.chat.get.queryKey(input as { chatId: string }), updater);
		},
		[queryClient],
	);
};
