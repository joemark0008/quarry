/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type CreateProjectInput = {
  name: string;
};

export type ModifyPasswordInput = {
  confirmPassword: string;
  newPassword: string;
};

export type RenameProjectInput = {
  name: string;
  projectId: string | number;
};

export type SavedPromptInput = {
  prompt: string;
  title: string;
};

export type UpdateProfileInput = {
  name: string;
};

export type UpdateSavedPromptInput = {
  prompt?: string | null | undefined;
  promptId: string | number;
  title?: string | null | undefined;
};

export type WarehouseConnectionInput = {
  database: string;
  host: string;
  /** Connection name, used for the context folder when two connections share a database. */
  name: string;
  /** Leave empty to keep the stored password. */
  password?: string | null | undefined;
  port?: number;
  /** Limit the connection to one schema. */
  schemaName?: string | null | undefined;
  ssl?: boolean | null | undefined;
  user: string;
};

export type ProjectSummaryFieldsFragment = { id: string, name: string, type: string, path: string | null, orgId: string | null, userRole: string, createdAt: string, updatedAt: string };

export type CurrentProjectQueryVariables = Exact<{ [key: string]: never; }>;


export type CurrentProjectQuery = { currentProject: { id: string, name: string, type: string, path: string | null, orgId: string | null, userRole: string, createdAt: string, updatedAt: string } | null };

export type ProjectsQueryVariables = Exact<{ [key: string]: never; }>;


export type ProjectsQuery = { projects: Array<{ id: string, name: string, type: string, path: string | null, orgId: string | null, userRole: string, createdAt: string, updatedAt: string }> };

export type CreateProjectMutationVariables = Exact<{
  input: CreateProjectInput;
}>;


export type CreateProjectMutation = { createProject: { id: string, name: string, type: string, path: string | null, orgId: string | null, userRole: string, createdAt: string, updatedAt: string } };

export type RenameProjectMutationVariables = Exact<{
  input: RenameProjectInput;
}>;


export type RenameProjectMutation = { renameProject: { id: string, name: string, type: string, path: string | null, orgId: string | null, userRole: string, createdAt: string, updatedAt: string } };

export type DeleteProjectMutationVariables = Exact<{
  projectId: string | number;
}>;


export type DeleteProjectMutation = { deleteProject: boolean };

export type SavedPromptsQueryVariables = Exact<{ [key: string]: never; }>;


export type SavedPromptsQuery = { savedPrompts: Array<{ id: string, title: string, prompt: string, createdAt: string, updatedAt: string }> };

export type CreateSavedPromptMutationVariables = Exact<{
  input: SavedPromptInput;
}>;


export type CreateSavedPromptMutation = { createSavedPrompt: { id: string } };

export type UpdateSavedPromptMutationVariables = Exact<{
  input: UpdateSavedPromptInput;
}>;


export type UpdateSavedPromptMutation = { updateSavedPrompt: { id: string } };

export type DeleteSavedPromptMutationVariables = Exact<{
  promptId: string | number;
}>;


export type DeleteSavedPromptMutation = { deleteSavedPrompt: boolean };

export type PublicConfigQueryVariables = Exact<{ [key: string]: never; }>;


export type PublicConfigQuery = { publicConfig: { quarryMode: string, enableUserLogin: boolean, enableUserSignup: boolean, emailVerificationEnabled: boolean, betaAutomationsEnabled: boolean, betaContextRecommendationsEnabled: boolean, betaStoryFiltersEnabled: boolean, betaSubagentsEnabled: boolean, betaCustomStoriesEnabled: boolean, version: string, authProviders: { google: boolean, github: boolean, gitlab: boolean, smtp: boolean } } };

export type AppVersionQueryVariables = Exact<{ [key: string]: never; }>;


export type AppVersionQuery = { version: { version: string, commit: string, buildDate: string } };

export type CheckUpdateQueryVariables = Exact<{ [key: string]: never; }>;


export type CheckUpdateQuery = { checkUpdate: { currentVersion: string, latestVersion: string | null, updateAvailable: boolean } };

export type HasUsersQueryVariables = Exact<{ [key: string]: never; }>;


export type HasUsersQuery = { hasUsers: boolean };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { me: { id: string, name: string, email: string, image: string | null, emailVerified: boolean, requiresPasswordReset: boolean, isActive: boolean } };

export type UpdateProfileMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;


export type UpdateProfileMutation = { updateProfile: { id: string, name: string } };

export type ModifyPasswordMutationVariables = Exact<{
  input: ModifyPasswordInput;
}>;


export type ModifyPasswordMutation = { modifyPassword: boolean };

export type WarehouseConnectionsQueryVariables = Exact<{ [key: string]: never; }>;


export type WarehouseConnectionsQuery = { warehouseConnections: Array<{ name: string, type: string, supported: boolean, host: string | null, port: number | null, database: string | null, user: string | null, schemaName: string | null, ssl: boolean, allowListedOnly: boolean, hasPassword: boolean }> };

export type ConnectWarehouseMutationVariables = Exact<{
  input: WarehouseConnectionInput;
}>;


export type ConnectWarehouseMutation = { connectWarehouse: { success: boolean, message: string, fields: Array<string> } };

export type TestWarehouseConnectionMutationVariables = Exact<{
  name?: string | null | undefined;
}>;


export type TestWarehouseConnectionMutation = { testWarehouseConnection: { success: boolean, message: string } };

export type DisconnectWarehouseMutationVariables = Exact<{
  name: string;
}>;


export type DisconnectWarehouseMutation = { disconnectWarehouse: boolean };

export type ContextSyncStatusFieldsFragment = { state: string, requestedAt: string | null, startedAt: string | null, finishedAt: string | null, message: string | null, log: Array<string>, databases: Array<{ databaseName: string, schemasSynced: number, tablesSynced: number, renderErrors: number, removedPaths: number }> };

export type ContextSyncStatusQueryVariables = Exact<{ [key: string]: never; }>;


export type ContextSyncStatusQuery = { contextSyncStatus: { state: string, requestedAt: string | null, startedAt: string | null, finishedAt: string | null, message: string | null, log: Array<string>, databases: Array<{ databaseName: string, schemasSynced: number, tablesSynced: number, renderErrors: number, removedPaths: number }> } };

export type SyncContextMutationVariables = Exact<{
  select?: Array<string> | string | null | undefined;
}>;


export type SyncContextMutation = { syncContext: { state: string, requestedAt: string | null, startedAt: string | null, finishedAt: string | null, message: string | null, log: Array<string>, databases: Array<{ databaseName: string, schemasSynced: number, tablesSynced: number, renderErrors: number, removedPaths: number }> } };

export const ProjectSummaryFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectSummaryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ProjectSummary"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"orgId"}},{"kind":"Field","name":{"kind":"Name","value":"userRole"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<ProjectSummaryFieldsFragment, unknown>;
export const ContextSyncStatusFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContextSyncStatusFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContextSyncStatus"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"finishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"databases"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"databaseName"}},{"kind":"Field","name":{"kind":"Name","value":"schemasSynced"}},{"kind":"Field","name":{"kind":"Name","value":"tablesSynced"}},{"kind":"Field","name":{"kind":"Name","value":"renderErrors"}},{"kind":"Field","name":{"kind":"Name","value":"removedPaths"}}]}},{"kind":"Field","name":{"kind":"Name","value":"log"}}]}}]} as unknown as DocumentNode<ContextSyncStatusFieldsFragment, unknown>;
export const CurrentProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CurrentProject"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currentProject"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectSummaryFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectSummaryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ProjectSummary"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"orgId"}},{"kind":"Field","name":{"kind":"Name","value":"userRole"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<CurrentProjectQuery, CurrentProjectQueryVariables>;
export const ProjectsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Projects"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"projects"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectSummaryFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectSummaryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ProjectSummary"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"orgId"}},{"kind":"Field","name":{"kind":"Name","value":"userRole"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<ProjectsQuery, ProjectsQueryVariables>;
export const CreateProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateProjectInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectSummaryFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectSummaryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ProjectSummary"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"orgId"}},{"kind":"Field","name":{"kind":"Name","value":"userRole"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<CreateProjectMutation, CreateProjectMutationVariables>;
export const RenameProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RenameProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RenameProjectInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"renameProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectSummaryFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectSummaryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ProjectSummary"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"orgId"}},{"kind":"Field","name":{"kind":"Name","value":"userRole"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<RenameProjectMutation, RenameProjectMutationVariables>;
export const DeleteProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}]}]}}]} as unknown as DocumentNode<DeleteProjectMutation, DeleteProjectMutationVariables>;
export const SavedPromptsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SavedPrompts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"savedPrompts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"prompt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<SavedPromptsQuery, SavedPromptsQueryVariables>;
export const CreateSavedPromptDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateSavedPrompt"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SavedPromptInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSavedPrompt"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<CreateSavedPromptMutation, CreateSavedPromptMutationVariables>;
export const UpdateSavedPromptDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSavedPrompt"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateSavedPromptInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSavedPrompt"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}}]}}]} as unknown as DocumentNode<UpdateSavedPromptMutation, UpdateSavedPromptMutationVariables>;
export const DeleteSavedPromptDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteSavedPrompt"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"promptId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteSavedPrompt"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"promptId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"promptId"}}}]}]}}]} as unknown as DocumentNode<DeleteSavedPromptMutation, DeleteSavedPromptMutationVariables>;
export const PublicConfigDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PublicConfig"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publicConfig"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"quarryMode"}},{"kind":"Field","name":{"kind":"Name","value":"enableUserLogin"}},{"kind":"Field","name":{"kind":"Name","value":"enableUserSignup"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerificationEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"betaAutomationsEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"betaContextRecommendationsEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"betaStoryFiltersEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"betaSubagentsEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"betaCustomStoriesEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"authProviders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"google"}},{"kind":"Field","name":{"kind":"Name","value":"github"}},{"kind":"Field","name":{"kind":"Name","value":"gitlab"}},{"kind":"Field","name":{"kind":"Name","value":"smtp"}}]}}]}}]}}]} as unknown as DocumentNode<PublicConfigQuery, PublicConfigQueryVariables>;
export const AppVersionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AppVersion"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"version"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"buildDate"}}]}}]}}]} as unknown as DocumentNode<AppVersionQuery, AppVersionQueryVariables>;
export const CheckUpdateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CheckUpdate"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"checkUpdate"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currentVersion"}},{"kind":"Field","name":{"kind":"Name","value":"latestVersion"}},{"kind":"Field","name":{"kind":"Name","value":"updateAvailable"}}]}}]}}]} as unknown as DocumentNode<CheckUpdateQuery, CheckUpdateQueryVariables>;
export const HasUsersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"HasUsers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasUsers"}}]}}]} as unknown as DocumentNode<HasUsersQuery, HasUsersQueryVariables>;
export const MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"image"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"requiresPasswordReset"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]} as unknown as DocumentNode<MeQuery, MeQueryVariables>;
export const UpdateProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateProfile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateProfileInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProfile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<UpdateProfileMutation, UpdateProfileMutationVariables>;
export const ModifyPasswordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ModifyPassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ModifyPasswordInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"modifyPassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<ModifyPasswordMutation, ModifyPasswordMutationVariables>;
export const WarehouseConnectionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"WarehouseConnections"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"warehouseConnections"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"supported"}},{"kind":"Field","name":{"kind":"Name","value":"host"}},{"kind":"Field","name":{"kind":"Name","value":"port"}},{"kind":"Field","name":{"kind":"Name","value":"database"}},{"kind":"Field","name":{"kind":"Name","value":"user"}},{"kind":"Field","name":{"kind":"Name","value":"schemaName"}},{"kind":"Field","name":{"kind":"Name","value":"ssl"}},{"kind":"Field","name":{"kind":"Name","value":"allowListedOnly"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}}]}}]}}]} as unknown as DocumentNode<WarehouseConnectionsQuery, WarehouseConnectionsQueryVariables>;
export const ConnectWarehouseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ConnectWarehouse"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"WarehouseConnectionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"connectWarehouse"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"fields"}}]}}]}}]} as unknown as DocumentNode<ConnectWarehouseMutation, ConnectWarehouseMutationVariables>;
export const TestWarehouseConnectionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"TestWarehouseConnection"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"testWarehouseConnection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<TestWarehouseConnectionMutation, TestWarehouseConnectionMutationVariables>;
export const DisconnectWarehouseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DisconnectWarehouse"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"disconnectWarehouse"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}]}]}}]} as unknown as DocumentNode<DisconnectWarehouseMutation, DisconnectWarehouseMutationVariables>;
export const ContextSyncStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ContextSyncStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contextSyncStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContextSyncStatusFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContextSyncStatusFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContextSyncStatus"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"finishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"databases"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"databaseName"}},{"kind":"Field","name":{"kind":"Name","value":"schemasSynced"}},{"kind":"Field","name":{"kind":"Name","value":"tablesSynced"}},{"kind":"Field","name":{"kind":"Name","value":"renderErrors"}},{"kind":"Field","name":{"kind":"Name","value":"removedPaths"}}]}},{"kind":"Field","name":{"kind":"Name","value":"log"}}]}}]} as unknown as DocumentNode<ContextSyncStatusQuery, ContextSyncStatusQueryVariables>;
export const SyncContextDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SyncContext"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"select"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"syncContext"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"select"},"value":{"kind":"Variable","name":{"kind":"Name","value":"select"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContextSyncStatusFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContextSyncStatusFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContextSyncStatus"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"finishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"databases"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"databaseName"}},{"kind":"Field","name":{"kind":"Name","value":"schemasSynced"}},{"kind":"Field","name":{"kind":"Name","value":"tablesSynced"}},{"kind":"Field","name":{"kind":"Name","value":"renderErrors"}},{"kind":"Field","name":{"kind":"Name","value":"removedPaths"}}]}},{"kind":"Field","name":{"kind":"Name","value":"log"}}]}}]} as unknown as DocumentNode<SyncContextMutation, SyncContextMutationVariables>;