import type { TrpcRouter } from '@quarry/shared/backend/trpc';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

import {
	AgentSettingsDocument,
	CreateSavedPromptDocument,
	DefaultChatModelDocument,
	DefaultModelsDocument,
	DeleteLlmConfigDocument,
	DeleteSavedPromptDocument,
	KnownModelsDocument,
	LlmConfigsDocument,
	ProjectSavedPromptsDocument,
	SavedPromptsDocument,
	UpdateAgentSettingsDocument,
	UpdateDefaultModelsDocument,
	UpdateSavedPromptDocument,
	UpsertLlmConfigDocument,
} from '@/graphql/generated/graphql';
import { mutation, query, runMutation, runQuery } from '@/lib/apollo-procedures';

type Inputs = inferRouterInputs<TrpcRouter>['project'];
type Outputs = inferRouterOutputs<TrpcRouter>['project'];

/**
 * Saved prompts and model/agent settings moved to apps/api (`lib/apollo-procedures.ts`): call sites swap
 * `trpc.project.*` for `projectApi.project.*`. The other `project.*` procedures stay on upstream tRPC.
 */
export const projectApi = {
	project: {
		getSavedPrompts: query<void, Outputs['getSavedPrompts']>(['project', 'getSavedPrompts'], async () =>
			(await runQuery(SavedPromptsDocument, {})).savedPrompts.map(toSavedPrompt),
		),
		getProjectSavedPrompts: query<Inputs['getProjectSavedPrompts'], Outputs['getProjectSavedPrompts']>(
			['project', 'getProjectSavedPrompts'],
			async ({ projectId }) =>
				(await runQuery(ProjectSavedPromptsDocument, { projectId })).projectSavedPrompts.map(toSavedPrompt),
		),
		createSavedPrompt: mutation<Inputs['createSavedPrompt'], Outputs['createSavedPrompt']>(
			['project', 'createSavedPrompt'],
			async (input) => toSavedPrompt((await runMutation(CreateSavedPromptDocument, { input })).createSavedPrompt),
		),
		updateSavedPrompt: mutation<Inputs['updateSavedPrompt'], Outputs['updateSavedPrompt']>(
			['project', 'updateSavedPrompt'],
			async ({ id, title, prompt }) =>
				toSavedPrompt(
					(await runMutation(UpdateSavedPromptDocument, { input: { promptId: id, title, prompt } }))
						.updateSavedPrompt,
				),
		),
		deleteSavedPrompt: mutation<Inputs['deleteSavedPrompt'], void>(
			['project', 'deleteSavedPrompt'],
			async ({ promptId }) => {
				await runMutation(DeleteSavedPromptDocument, { promptId });
			},
		),
		getLlmConfigs: query<void, Outputs['getLlmConfigs']>(['project', 'getLlmConfigs'], async () => {
			const { llmConfigs } = await runQuery(LlmConfigsDocument, {});
			const configs = llmConfigs as Outputs['getLlmConfigs'];
			return {
				...configs,
				projectConfigs: configs.projectConfigs.map((config) => ({
					...config,
					createdAt: new Date(config.createdAt),
					updatedAt: new Date(config.updatedAt),
				})),
			};
		}),
		upsertLlmConfig: mutation<Inputs['upsertLlmConfig'], Outputs['upsertLlmConfig']>(
			['project', 'upsertLlmConfig'],
			async (input) =>
				(await runMutation(UpsertLlmConfigDocument, { input })).upsertLlmConfig as Outputs['upsertLlmConfig'],
		),
		deleteLlmConfig: mutation<Inputs['deleteLlmConfig'], Outputs['deleteLlmConfig']>(
			['project', 'deleteLlmConfig'],
			async ({ provider }) => ({
				success: (await runMutation(DeleteLlmConfigDocument, { provider })).deleteLlmConfig,
			}),
		),
		getKnownModels: query<void, Outputs['getKnownModels']>(
			['project', 'getKnownModels'],
			async () => (await runQuery(KnownModelsDocument, {})).knownModels as Outputs['getKnownModels'],
		),
		getDefaultModels: query<void, Outputs['getDefaultModels']>(
			['project', 'getDefaultModels'],
			async () => (await runQuery(DefaultModelsDocument, {})).defaultModels as Outputs['getDefaultModels'],
		),
		updateDefaultModels: mutation<Inputs['updateDefaultModels'], Outputs['updateDefaultModels']>(
			['project', 'updateDefaultModels'],
			async (settings) =>
				(await runMutation(UpdateDefaultModelsDocument, { settings }))
					.updateDefaultModels as Outputs['updateDefaultModels'],
		),
		getDefaultChatModel: query<void, Outputs['getDefaultChatModel']>(
			['project', 'getDefaultChatModel'],
			async () =>
				(await runQuery(DefaultChatModelDocument, {})).defaultChatModel as Outputs['getDefaultChatModel'],
		),
		getAgentSettings: query<void, Outputs['getAgentSettings']>(
			['project', 'getAgentSettings'],
			async () => (await runQuery(AgentSettingsDocument, {})).agentSettings as Outputs['getAgentSettings'],
		),
		updateAgentSettings: mutation<Inputs['updateAgentSettings'], Outputs['updateAgentSettings']>(
			['project', 'updateAgentSettings'],
			async (input) =>
				(await runMutation(UpdateAgentSettingsDocument, { input }))
					.updateAgentSettings as Outputs['updateAgentSettings'],
		),
	},
};

function toSavedPrompt<T extends { createdAt: string; updatedAt: string }>(prompt: T) {
	return { ...prompt, createdAt: new Date(prompt.createdAt), updatedAt: new Date(prompt.updatedAt) } as never;
}
