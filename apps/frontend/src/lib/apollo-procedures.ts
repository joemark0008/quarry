import { CombinedGraphQLErrors } from '@apollo/client';
import { skipToken } from '@tanstack/react-query';
import type { DocumentNode, TypedDocumentNode } from '@apollo/client';
import type {
	DataTag,
	QueryFunction,
	QueryKey,
	SkipToken,
	UseMutationOptions,
	UseQueryOptions,
} from '@tanstack/react-query';

import { apolloClient } from '@/lib/apollo-client';

/**
 * Builders for procedures moved from upstream tRPC to apps/api, shaped like the tRPC options proxy
 * (`queryOptions`, `queryKey`, `mutationOptions`, `pathFilter`) so call sites only swap the `trpc` prefix.
 *
 * Requests go through Apollo Client without its cache; results stay in TanStack Query (the chat view rewrites
 * its cached chat on every streamed chunk). Query keys keep tRPC's `[path, { input, type }]` shape so prefix
 * invalidations such as `[['chat', 'listGrouped']]` keep working.
 */
type Path = readonly [string, string];

export function query<TInput, TOutput>(path: Path, fetch: (input: TInput) => Promise<TOutput>) {
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

export function mutation<TInput, TOutput>(path: Path, run: (input: TInput) => Promise<TOutput>) {
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
export async function runQuery<TData, TVariables extends Record<string, unknown>>(
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

export async function runMutation<TData, TVariables extends Record<string, unknown>>(
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
