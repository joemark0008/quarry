import type { ApiInputs, ApiOutputs } from '@/lib/api-types';

import {
	CancelContextRecommendationRunDocument,
	ContextRecommendationAgentPromptDocument,
	ContextRecommendationAvailableModelsDocument,
	ContextRecommendationConfigDocument,
	ContextRecommendationLinkedReposDocument,
	ContextRecommendationPrStatusDocument,
	ContextRecommendationRepoDocument,
	ContextRecommendationsDocument,
	ContextRecommendationTriggerChatsDocument,
	CreateContextRecommendationBatchPullRequestDocument,
	CreateContextRecommendationPullRequestDocument,
	LatestContextRecommendationRunDocument,
	LatestSuccessfulContextRecommendationRunDocument,
	RunContextRecommendationsDocument,
	SetContextRecommendationConfigDocument,
	SetContextRecommendationStatusDocument,
} from '@/graphql/generated/graphql';
import { mutation, query, reviveDates, runMutation, runQuery } from '@/lib/apollo-procedures';

type Inputs = ApiInputs['contextRecommendation'];
type Outputs = ApiOutputs['contextRecommendation'];

const path = (name: string) => ['contextRecommendation', name] as const;

/**
 * Context recommendations moved to apps/api (`lib/apollo-procedures.ts`): call sites swap
 * `contextRecommendation.*` for `contextRecommendationApi.contextRecommendation.*`. Pull requests are Phase 7
 * (`git-providers`): their mutations answer with an error until then.
 */
export const contextRecommendationApi = {
	contextRecommendation: {
		list: query<Inputs['list'], Outputs['list']>(path('list'), async (input) =>
			reviveDates(
				(await runQuery(ContextRecommendationsDocument, { status: input?.status ?? null }))
					.contextRecommendations,
			),
		),
		latestRun: query<void, Outputs['latestRun']>(path('latestRun'), async () =>
			reviveDates((await runQuery(LatestContextRecommendationRunDocument, {})).latestContextRecommendationRun),
		),
		latestSuccessfulRun: query<void, Outputs['latestSuccessfulRun']>(path('latestSuccessfulRun'), async () =>
			reviveDates(
				(await runQuery(LatestSuccessfulContextRecommendationRunDocument, {}))
					.latestSuccessfulContextRecommendationRun,
			),
		),
		listAvailableModels: query<void, Outputs['listAvailableModels']>(path('listAvailableModels'), async () =>
			reviveDates(
				(await runQuery(ContextRecommendationAvailableModelsDocument, {})).contextRecommendationAvailableModels,
			),
		),
		getConfig: query<void, Outputs['getConfig']>(path('getConfig'), async () =>
			reviveDates((await runQuery(ContextRecommendationConfigDocument, {})).contextRecommendationConfig),
		),
		getRepo: query<void, Outputs['getRepo']>(path('getRepo'), async () =>
			reviveDates((await runQuery(ContextRecommendationRepoDocument, {})).contextRecommendationRepo),
		),
		listLinkedRepos: query<void, Outputs['listLinkedRepos']>(path('listLinkedRepos'), async () =>
			reviveDates(
				(await runQuery(ContextRecommendationLinkedReposDocument, {})).contextRecommendationLinkedRepos,
			),
		),
		getPrStatus: query<Inputs['getPrStatus'], Outputs['getPrStatus']>(path('getPrStatus'), async ({ id }) =>
			reviveDates((await runQuery(ContextRecommendationPrStatusDocument, { id })).contextRecommendationPrStatus),
		),
		getAgentPrompt: query<Inputs['getAgentPrompt'], Outputs['getAgentPrompt']>(
			path('getAgentPrompt'),
			async ({ ids }) =>
				(await runQuery(ContextRecommendationAgentPromptDocument, { input: { ids } }))
					.contextRecommendationAgentPrompt,
		),
		listRecoTriggerChatMetadata: query<
			Inputs['listRecoTriggerChatMetadata'],
			Outputs['listRecoTriggerChatMetadata']
		>(path('listRecoTriggerChatMetadata'), async ({ chatIds }) =>
			reviveDates(
				(await runQuery(ContextRecommendationTriggerChatsDocument, { input: { chatIds } }))
					.contextRecommendationTriggerChats,
			),
		),
		run: mutation<void, Outputs['run']>(path('run'), async () =>
			reviveDates((await runMutation(RunContextRecommendationsDocument, {})).runContextRecommendations),
		),
		cancelRun: mutation<Inputs['cancelRun'], Outputs['cancelRun']>(path('cancelRun'), async ({ runId }) =>
			reviveDates(
				(await runMutation(CancelContextRecommendationRunDocument, { runId })).cancelContextRecommendationRun,
			),
		),
		setConfig: mutation<Inputs['setConfig'], Outputs['setConfig']>(path('setConfig'), async (input) =>
			reviveDates(
				(await runMutation(SetContextRecommendationConfigDocument, { input: input as never }))
					.setContextRecommendationConfig,
			),
		),
		setStatus: mutation<Inputs['setStatus'], Outputs['setStatus']>(path('setStatus'), async (input) =>
			reviveDates(
				(await runMutation(SetContextRecommendationStatusDocument, { input })).setContextRecommendationStatus,
			),
		),
		createPullRequest: mutation<Inputs['createPullRequest'], Outputs['createPullRequest']>(
			path('createPullRequest'),
			async ({ id }) =>
				reviveDates(
					(await runMutation(CreateContextRecommendationPullRequestDocument, { id }))
						.createContextRecommendationPullRequest,
				),
		),
		createBatchPullRequest: mutation<Inputs['createBatchPullRequest'], Outputs['createBatchPullRequest']>(
			path('createBatchPullRequest'),
			async ({ ids }) =>
				reviveDates(
					(await runMutation(CreateContextRecommendationBatchPullRequestDocument, { input: { ids } }))
						.createContextRecommendationBatchPullRequest,
				),
		),
	},
};
