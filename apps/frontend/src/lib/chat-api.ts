import { CombinedGraphQLErrors } from '@apollo/client';
import { skipToken } from '@tanstack/react-query';
import type {
	DataTag,
	QueryFunction,
	QueryKey,
	SkipToken,
	UseMutationOptions,
	UseQueryOptions,
} from '@tanstack/react-query';
import type { TrpcRouter } from '@quarry/shared/backend/trpc';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { DocumentNode, TypedDocumentNode } from '@apollo/client';

import type { ChatFieldsFragment, SharedChatFieldsFragment } from '@/graphql/generated/graphql';
import {
	AskSharedChatDocument,
	CancelChatDocument,
	ChatContextUsageDocument,
	ChatDocument,
	ChatForkMetadataDocument,
	ChatListDocument,
	ChatShareOptionsDocument,
	CitationDocument,
	CreateSharedChatDocument,
	DeleteAllNonStarredChatsDocument,
	DeleteChatDocument,
	DeleteSharedChatDocument,
	ForkSharedChatDocument,
	PreviewSqlQueryDocument,
	QueryRowsDocument,
	RenameChatDocument,
	SearchChatsDocument,
	SetChatStarredDocument,
	SharedChatDocument,
	SharedChatQuickQuestionsDocument,
	SharedChatsDocument,
	StopChatDocument,
	SubmitMessageFeedbackDocument,
	SwitchMessageVersionDocument,
	UpdateSharedChatAccessDocument,
	UpdateSqlQueryDocument,
} from '@/graphql/generated/graphql';
import { apolloClient } from '@/lib/apollo-client';

type Inputs = inferRouterInputs<TrpcRouter>;
type Outputs = inferRouterOutputs<TrpcRouter>;

/**
 * The chat procedures moved to apps/api, shaped like the tRPC options proxy (`queryOptions`, `queryKey`,
 * `mutationOptions`, `pathFilter`) so call sites only swap `trpc.chat.*` for `chatApi.chat.*`.
 *
 * Requests go through Apollo Client; results stay in TanStack Query, because the chat view rewrites the
 * cached chat on every streamed chunk (`useSetChat`). Query keys keep tRPC's `[path, { input, type }]` shape
 * so prefix invalidations such as `[['chat', 'listGrouped']]` keep working. Types are upstream's router types
 * until the shared bridge goes away (Phase 8).
 */
export const chatApi = {
	chat: {
		get: query<Inputs['chat']['get'], Outputs['chat']['get']>(['chat', 'get'], async ({ chatId }) =>
			toUIChat((await runQuery(ChatDocument, { chatId })).chat),
		),
		listGrouped: query<Inputs['chat']['listGrouped'], Outputs['chat']['listGrouped']>(
			['chat', 'listGrouped'],
			async (input) => {
				const { chatList } = await runQuery(ChatListDocument, { input });
				return chatList as Outputs['chat']['listGrouped'];
			},
		),
		search: query<Inputs['chat']['search'], Outputs['chat']['search']>(['chat', 'search'], async (input) => {
			const { searchChats } = await runQuery(SearchChatsDocument, input);
			return searchChats.map((result) => ({ ...result, matchedText: result.matchedText ?? undefined }));
		}),
		getForkMetadata: query<Inputs['chat']['getForkMetadata'], Outputs['chat']['getForkMetadata']>(
			['chat', 'getForkMetadata'],
			async ({ chatId }) =>
				(await runQuery(ChatForkMetadataDocument, { chatId }))
					.chatForkMetadata as Outputs['chat']['getForkMetadata'],
		),
		getContextUsage: query<Inputs['chat']['getContextUsage'], Outputs['chat']['getContextUsage']>(
			['chat', 'getContextUsage'],
			async (input) => (await runQuery(ChatContextUsageDocument, { input })).chatContextUsage,
		),
		getQueryRows: query<Inputs['chat']['getQueryRows'], Outputs['chat']['getQueryRows']>(
			['chat', 'getQueryRows'],
			async (input) =>
				(await runQuery(QueryRowsDocument, { input })).queryRows as Outputs['chat']['getQueryRows'],
		),
		delete: mutation<Inputs['chat']['delete'], void>(['chat', 'delete'], async ({ chatId }) => {
			await runMutation(DeleteChatDocument, { chatId });
		}),
		stop: mutation<Inputs['chat']['stop'], void>(['chat', 'stop'], async ({ chatId }) => {
			await runMutation(StopChatDocument, { chatId });
		}),
		cancel: mutation<Inputs['chat']['cancel'], Outputs['chat']['cancel']>(
			['chat', 'cancel'],
			async ({ chatId }) =>
				(await runMutation(CancelChatDocument, { chatId })).cancelChat as Outputs['chat']['cancel'],
		),
		rename: mutation<Inputs['chat']['rename'], void>(['chat', 'rename'], async (input) => {
			await runMutation(RenameChatDocument, { input });
		}),
		deleteAllNonStarred: mutation<void, Outputs['chat']['deleteAllNonStarred']>(
			['chat', 'deleteAllNonStarred'],
			async () => ({ count: (await runMutation(DeleteAllNonStarredChatsDocument, {})).deleteAllNonStarredChats }),
		),
		toggleStarred: mutation<Inputs['chat']['toggleStarred'], void>(['chat', 'toggleStarred'], async (input) => {
			await runMutation(SetChatStarredDocument, input);
		}),
		switchMessageVersion: mutation<Inputs['chat']['switchMessageVersion'], void>(
			['chat', 'switchMessageVersion'],
			async (input) => {
				await runMutation(SwitchMessageVersionDocument, input);
			},
		),
	},
	citation: {
		get: query<Inputs['citation']['get'], Outputs['citation']['get']>(
			['citation', 'get'],
			async (input) => (await runQuery(CitationDocument, input)).citation as Outputs['citation']['get'],
		),
	},
	feedback: {
		submit: mutation<Inputs['feedback']['submit'], Outputs['feedback']['submit']>(
			['feedback', 'submit'],
			async (input) => {
				const { submitMessageFeedback } = await runMutation(SubmitMessageFeedbackDocument, { input });
				return {
					...submitMessageFeedback,
					createdAt: new Date(submitMessageFeedback.createdAt),
				} as Outputs['feedback']['submit'];
			},
		),
	},
	sharedChat: {
		list: query<void, Outputs['sharedChat']['list']>(['sharedChat', 'list'], async () =>
			(await runQuery(SharedChatsDocument, {})).sharedChats.map(toSharedChat),
		),
		getSharedChat: query<Inputs['sharedChat']['getSharedChat'], Outputs['sharedChat']['getSharedChat']>(
			['sharedChat', 'getSharedChat'],
			async ({ shareId }) => {
				const { sharedChat } = await runQuery(SharedChatDocument, { shareId });
				return {
					share: toSharedChat(sharedChat.share),
					chat: toUIChat(sharedChat.chat),
					userRole: sharedChat.userRole,
				} as Outputs['sharedChat']['getSharedChat'];
			},
		),
		getShareOptionsByChatId: query<
			Inputs['sharedChat']['getShareOptionsByChatId'],
			Outputs['sharedChat']['getShareOptionsByChatId']
		>(['sharedChat', 'getShareOptionsByChatId'], async ({ chatId }) => {
			const { chatShareOptions } = await runQuery(ChatShareOptionsDocument, { chatId });
			return chatShareOptions as Outputs['sharedChat']['getShareOptionsByChatId'];
		}),
		create: mutation<Inputs['sharedChat']['create'], Outputs['sharedChat']['create']>(
			['sharedChat', 'create'],
			async (input) => {
				const { createSharedChat } = await runMutation(CreateSharedChatDocument, { input });
				return toSharedChat(createSharedChat) as Outputs['sharedChat']['create'];
			},
		),
		updateAccess: mutation<Inputs['sharedChat']['updateAccess'], void>(
			['sharedChat', 'updateAccess'],
			async (input) => {
				await runMutation(UpdateSharedChatAccessDocument, input);
			},
		),
		delete: mutation<Inputs['sharedChat']['delete'], void>(['sharedChat', 'delete'], async ({ shareId }) => {
			await runMutation(DeleteSharedChatDocument, { shareId });
		}),
	},
	chatFork: {
		/** Forks of a shared chat; story forks come with stories (Phase 4). */
		fork: mutation<Inputs['chatFork']['fork'], Outputs['chatFork']['fork']>(
			['chatFork', 'fork'],
			async ({ source, selection }) => {
				if (source.type !== 'chat') {
					throw new Error('Forking a story is not available yet.');
				}
				const input = { shareId: source.shareId, selection };
				return (await runMutation(ForkSharedChatDocument, { input })).forkSharedChat;
			},
		),
		askSharedChat: mutation<Inputs['chatFork']['askSharedChat'], Outputs['chatFork']['askSharedChat']>(
			['chatFork', 'askSharedChat'],
			async (input) => (await runMutation(AskSharedChatDocument, { input })).askSharedChat,
		),
		listSharedChatQuickQuestions: query<
			Inputs['chatFork']['listSharedChatQuickQuestions'],
			Outputs['chatFork']['listSharedChatQuickQuestions']
		>(['chatFork', 'listSharedChatQuickQuestions'], async ({ shareId }) => {
			const { sharedChatQuickQuestions } = await runQuery(SharedChatQuickQuestionsDocument, { shareId });
			return sharedChatQuickQuestions.map((question) => ({
				chatId: question.chatId,
				title: question.title,
				updatedAt: new Date(question.updatedAt),
			}));
		}),
	},
	sql: {
		previewQuery: mutation<Inputs['sql']['previewQuery'], Outputs['sql']['previewQuery']>(
			['sql', 'previewQuery'],
			async (input) =>
				(await runMutation(PreviewSqlQueryDocument, { input: toSqlEditInput(input) }))
					.previewSqlQuery as Outputs['sql']['previewQuery'],
		),
		updateQuery: mutation<Inputs['sql']['updateQuery'], Outputs['sql']['updateQuery']>(
			['sql', 'updateQuery'],
			async (input) =>
				(await runMutation(UpdateSqlQueryDocument, { input: toSqlEditInput(input) }))
					.updateSqlQuery as Outputs['sql']['updateQuery'],
		),
	},
};

type Path = readonly [string, string];

function query<TInput, TOutput>(path: Path, fetch: (input: TInput) => Promise<TOutput>) {
	type Key = DataTag<QueryKey, TOutput, Error>;
	const keyOf = (input: TInput | undefined) =>
		(input === undefined ? [path, { type: 'query' }] : [path, { input, type: 'query' }]) as unknown as Key;
	return {
		queryKey: (input: TInput) => keyOf(input),
		queryOptions: <TData = TOutput>(
			input: TInput | SkipToken,
			opts?: Omit<UseQueryOptions<TOutput, Error, TData, Key>, 'queryKey' | 'queryFn'>,
		): UseQueryOptions<TOutput, Error, TData, Key> & { queryKey: Key } => {
			const queryFn: QueryFunction<TOutput, Key> | SkipToken =
				input === skipToken ? skipToken : () => fetch(input as TInput);
			return { ...opts, queryKey: keyOf(input === skipToken ? undefined : input), queryFn };
		},
		pathFilter: () => ({ queryKey: [path] as QueryKey }),
	};
}

function mutation<TInput, TOutput>(path: Path, run: (input: TInput) => Promise<TOutput>) {
	return {
		mutationOptions: <TContext = unknown>(
			opts?: Omit<UseMutationOptions<TOutput, Error, TInput, TContext>, 'mutationFn' | 'mutationKey'>,
		): UseMutationOptions<TOutput, Error, TInput, TContext> => ({
			...opts,
			mutationKey: [path],
			mutationFn: run,
		}),
	};
}

/** No Apollo caching: TanStack Query holds the results (and the streamed updates of a chat). */
async function runQuery<TData, TVariables extends Record<string, unknown>>(
	document: TypedDocumentNode<TData, TVariables> | DocumentNode,
	variables: TVariables,
): Promise<TData> {
	try {
		const { data } = await apolloClient.query<TData, TVariables>({
			query: document,
			variables,
			fetchPolicy: 'no-cache',
		} as never);
		return data as TData;
	} catch (error) {
		throw toCodedError(error);
	}
}

async function runMutation<TData, TVariables extends Record<string, unknown>>(
	document: TypedDocumentNode<TData, TVariables>,
	variables: TVariables,
): Promise<TData> {
	try {
		const { data } = await apolloClient.mutate({ mutation: document, variables } as never);
		return data as TData;
	} catch (error) {
		throw toCodedError(error);
	}
}

/** Errors carry the GraphQL code as `data.code`, like tRPC's, so `lib/trpc-error.ts` keeps classifying them. */
function toCodedError(error: unknown): unknown {
	if (CombinedGraphQLErrors.is(error)) {
		const [first] = error.errors;
		const coded = new Error(first?.message ?? error.message) as Error & { data: { code?: string } };
		coded.data = { code: first?.extensions?.code as string | undefined };
		return coded;
	}
	return error;
}

function toUIChat(chat: ChatFieldsFragment): Outputs['chat']['get'] {
	return {
		...chat,
		forkMetadata: chat.forkMetadata ?? undefined,
		automationRun: chat.automationRun ?? undefined,
	} as Outputs['chat']['get'];
}

function toSharedChat(share: SharedChatFieldsFragment): Outputs['sharedChat']['list'][number] {
	return {
		...share,
		createdAt: new Date(share.createdAt),
		forkMetadata: share.forkMetadata ?? undefined,
		messageBubbles: share.messageBubbles ?? undefined,
	} as Outputs['sharedChat']['list'][number];
}

function toSqlEditInput(input: Inputs['sql']['previewQuery']) {
	return {
		queryId: input.queryId,
		sqlQuery: input.sql_query,
		databaseId: input.database_id ?? null,
		name: input.name ?? null,
	};
}
