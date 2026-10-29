/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type ChatContextUsageInput = {
  chatId: string | number;
  model?: ModelSelectionInput | null | undefined;
};

export type ChatListInput = {
  /** all, mine, starred, shared, shared_with_me. */
  filters?: Array<string>;
  /** star, date, project, ownership, sourcePlatform or none. */
  groupBy?: string;
};

export type ContextRecommendationIdsInput = {
  ids: Array<string>;
};

export type ContextRecommendationTriggerChatsInput = {
  chatIds: Array<string>;
};

export type CreateProjectInput = {
  name: string;
};

export type CreateSharedChatInput = {
  allowedUserIds?: Array<string> | null | undefined;
  chatId: string | number;
  /** Also notify recipients outside the app (Phase 5 notifications). */
  notify?: boolean;
  /** project or specific. */
  visibility?: string;
};

export type EditMemoryInput = {
  content: string;
  memoryId: string | number;
};

export type ForkSharedChatInput = {
  selection?: SelectionInput | null | undefined;
  shareId: string | number;
};

export type GenerateOnboardingRulesInput = {
  /** What the business does; a public https URL in it is fetched for more context. */
  additionalContext?: string | null | undefined;
};

export type MessageFeedbackInput = {
  chatId: string | number;
  explanation?: string | null | undefined;
  messageId: string | number;
  /** up or down. */
  vote: string;
};

export type ModelSelectionInput = {
  modelId: string;
  provider: string;
};

export type ModifyPasswordInput = {
  confirmPassword: string;
  newPassword: string;
};

export type QueryRowsInput = {
  chatId: string | number;
  /** Every row from `offset` when omitted. */
  limit?: number | null | undefined;
  offset?: number;
  queryId: string;
  sort?: QuerySortInput | null | undefined;
  toolCallId: string;
};

export type QuerySortInput = {
  column: string;
  /** asc or desc. */
  direction: string;
};

export type RenameChatInput = {
  chatId: string | number;
  title: string;
};

export type RenameProjectInput = {
  name: string;
  projectId: string | number;
};

export type SavedPromptInput = {
  prompt: string;
  title: string;
};

export type SelectionInput = {
  end: number;
  start: number;
  text: string;
};

export type SetContextRecommendationConfigInput = {
  autoCreatePrs?: boolean | null | undefined;
  /** Trimmed; an empty value clears the instructions. Omit to keep them. */
  customSystemPromptInstructions?: string | null | undefined;
  frequency?: string | null | undefined;
  maxAutoPrsPerRun?: number | null | undefined;
  modelId?: string | null | undefined;
  modelProvider?: string | null | undefined;
};

export type SetContextRecommendationStatusInput = {
  id: string;
  status: string;
};

export type SetSandboxSecretInput = {
  description?: string | null | undefined;
  name: string;
  value: string;
};

export type SqlEditInput = {
  databaseId?: string | null | undefined;
  name?: string | null | undefined;
  queryId: string;
  sqlQuery: string;
};

export type UpdateProfileInput = {
  name: string;
};

export type UpdateSandboxSecretDescriptionInput = {
  description?: string | null | undefined;
  secretId: string | number;
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

export type ChartDownloadQueryVariables = Exact<{
  toolCallId: string;
}>;


export type ChartDownloadQuery = { chartDownload: string };

export type UpdateChartConfigMutationVariables = Exact<{
  toolCallId: string;
  config: unknown;
}>;


export type UpdateChartConfigMutation = { updateChartConfig: boolean };

export type UpdateMapConfigMutationVariables = Exact<{
  mapId: string;
  config: unknown;
}>;


export type UpdateMapConfigMutation = { updateMapConfig: boolean };

export type ChartPluginsQueryVariables = Exact<{ [key: string]: never; }>;


export type ChartPluginsQuery = { chartPlugins: unknown };

export type ChartPluginSourceQueryVariables = Exact<{
  type: string;
  version: string;
}>;


export type ChartPluginSourceQuery = { chartPluginSource: { source: string, version: string } };

export type ChatFieldsFragment = { id: string, projectId: string, title: string, isStarred: boolean, isOnboarding: boolean, createdAt: number, updatedAt: number, forkMetadata: unknown, automationRun: unknown, messages: Array<unknown> };

export type SharedChatFieldsFragment = { id: string, chatId: string, projectId: string, userId: string, visibility: string, createdAt: string, authorName: string, title: string, forkMetadata: unknown, messageBubbles: Array<{ role: string, charCount: number }> | null };

export type ChatQueryVariables = Exact<{
  chatId: string | number;
}>;


export type ChatQuery = { chat: { id: string, projectId: string, title: string, isStarred: boolean, isOnboarding: boolean, createdAt: number, updatedAt: number, forkMetadata: unknown, automationRun: unknown, messages: Array<unknown> } };

export type ChatListQueryVariables = Exact<{
  input?: ChatListInput | null | undefined;
}>;


export type ChatListQuery = { chatList: { groups: Array<{ label: string | null, chats: Array<{ id: string, projectId: string, title: string, isStarred: boolean, isOnboarding: boolean, createdAt: number, updatedAt: number, kind: string, shareId: string | null, ownerName: string }> }> } };

export type SearchChatsQueryVariables = Exact<{
  query: string;
  limit?: number | null | undefined;
}>;


export type SearchChatsQuery = { searchChats: Array<{ id: string, title: string, createdAt: number, updatedAt: number, matchedText: string | null }> };

export type ChatForkMetadataQueryVariables = Exact<{
  chatId: string | number;
}>;


export type ChatForkMetadataQuery = { chatForkMetadata: unknown };

export type ChatContextUsageQueryVariables = Exact<{
  input: ChatContextUsageInput;
}>;


export type ChatContextUsageQuery = { chatContextUsage: { tokensUsed: number, contextWindow: number | null } };

export type QueryRowsQueryVariables = Exact<{
  input: QueryRowsInput;
}>;


export type QueryRowsQuery = { queryRows: { columns: Array<string>, rows: Array<unknown>, totalRows: number } };

export type CitationQueryVariables = Exact<{
  queryId: string;
  column: string;
}>;


export type CitationQuery = { citation: unknown };

export type DeleteChatMutationVariables = Exact<{
  chatId: string | number;
}>;


export type DeleteChatMutation = { deleteChat: boolean };

export type StopChatMutationVariables = Exact<{
  chatId: string | number;
}>;


export type StopChatMutation = { stopChat: boolean };

export type CancelChatMutationVariables = Exact<{
  chatId: string | number;
}>;


export type CancelChatMutation = { cancelChat: { outcome: string, chatDeleted: boolean } };

export type RenameChatMutationVariables = Exact<{
  input: RenameChatInput;
}>;


export type RenameChatMutation = { renameChat: boolean };

export type DeleteAllNonStarredChatsMutationVariables = Exact<{ [key: string]: never; }>;


export type DeleteAllNonStarredChatsMutation = { deleteAllNonStarredChats: number };

export type SetChatStarredMutationVariables = Exact<{
  chatId: string | number;
  isStarred: boolean;
}>;


export type SetChatStarredMutation = { setChatStarred: boolean };

export type SwitchMessageVersionMutationVariables = Exact<{
  chatId: string | number;
  messageId: string | number;
}>;


export type SwitchMessageVersionMutation = { switchMessageVersion: boolean };

export type SubmitMessageFeedbackMutationVariables = Exact<{
  input: MessageFeedbackInput;
}>;


export type SubmitMessageFeedbackMutation = { submitMessageFeedback: { messageId: string, vote: string, explanation: string | null, createdAt: string } };

export type SharedChatsQueryVariables = Exact<{ [key: string]: never; }>;


export type SharedChatsQuery = { sharedChats: Array<{ id: string, chatId: string, projectId: string, userId: string, visibility: string, createdAt: string, authorName: string, title: string, forkMetadata: unknown, messageBubbles: Array<{ role: string, charCount: number }> | null }> };

export type SharedChatQueryVariables = Exact<{
  shareId: string | number;
}>;


export type SharedChatQuery = { sharedChat: { userRole: string | null, share: { id: string, chatId: string, projectId: string, userId: string, visibility: string, createdAt: string, authorName: string, title: string, forkMetadata: unknown, messageBubbles: Array<{ role: string, charCount: number }> | null }, chat: { id: string, projectId: string, title: string, isStarred: boolean, isOnboarding: boolean, createdAt: number, updatedAt: number, forkMetadata: unknown, automationRun: unknown, messages: Array<unknown> } } };

export type ChatShareOptionsQueryVariables = Exact<{
  chatId: string | number;
}>;


export type ChatShareOptionsQuery = { chatShareOptions: { shareId: string | null, visibility: string | null, allowedUserIds: Array<string> } };

export type CreateSharedChatMutationVariables = Exact<{
  input: CreateSharedChatInput;
}>;


export type CreateSharedChatMutation = { createSharedChat: { id: string, chatId: string, projectId: string, userId: string, visibility: string, createdAt: string, authorName: string, title: string, forkMetadata: unknown, messageBubbles: Array<{ role: string, charCount: number }> | null } };

export type UpdateSharedChatAccessMutationVariables = Exact<{
  shareId: string | number;
  allowedUserIds: Array<string> | string;
}>;


export type UpdateSharedChatAccessMutation = { updateSharedChatAccess: boolean };

export type DeleteSharedChatMutationVariables = Exact<{
  shareId: string | number;
}>;


export type DeleteSharedChatMutation = { deleteSharedChat: boolean };

export type ForkSharedChatMutationVariables = Exact<{
  input: ForkSharedChatInput;
}>;


export type ForkSharedChatMutation = { forkSharedChat: { chatId: string } };

export type AskSharedChatMutationVariables = Exact<{
  input: ForkSharedChatInput;
}>;


export type AskSharedChatMutation = { askSharedChat: { chatId: string } };

export type SharedChatQuickQuestionsQueryVariables = Exact<{
  shareId: string | number;
}>;


export type SharedChatQuickQuestionsQuery = { sharedChatQuickQuestions: Array<{ chatId: string, title: string, updatedAt: string }> };

export type PreviewSqlQueryMutationVariables = Exact<{
  input: SqlEditInput;
}>;


export type PreviewSqlQueryMutation = { previewSqlQuery: unknown };

export type UpdateSqlQueryMutationVariables = Exact<{
  input: SqlEditInput;
}>;


export type UpdateSqlQueryMutation = { updateSqlQuery: { input: unknown, output: unknown, toolCallId: string, chatId: string } };

export type ContextRepositoryStatusQueryVariables = Exact<{ [key: string]: never; }>;


export type ContextRepositoryStatusQuery = { contextRepositoryStatus: unknown };

export type ContextPullHistoryQueryVariables = Exact<{ [key: string]: never; }>;


export type ContextPullHistoryQuery = { contextPullHistory: unknown };

export type ContextFileTreeQueryVariables = Exact<{ [key: string]: never; }>;


export type ContextFileTreeQuery = { contextFileTree: unknown };

export type ContextRulesPreviewGroupsQueryVariables = Exact<{ [key: string]: never; }>;


export type ContextRulesPreviewGroupsQuery = { contextRulesPreviewGroups: unknown };

export type ContextFileQueryVariables = Exact<{
  path: string;
}>;


export type ContextFileQuery = { contextFile: unknown };

export type ContextSearchQueryVariables = Exact<{
  query: string;
}>;


export type ContextSearchQuery = { contextSearch: unknown };

export type ContextChangedFilesQueryVariables = Exact<{ [key: string]: never; }>;


export type ContextChangedFilesQuery = { contextChangedFiles: unknown };

export type ContextFileDiffQueryVariables = Exact<{
  input: unknown;
}>;


export type ContextFileDiffQuery = { contextFileDiff: unknown };

export type ContextHistoricalDiffActionQueryVariables = Exact<{
  input: unknown;
}>;


export type ContextHistoricalDiffActionQuery = { contextHistoricalDiffAction: unknown };

export type ContextBranchNameSuggestionQueryVariables = Exact<{ [key: string]: never; }>;


export type ContextBranchNameSuggestionQuery = { contextBranchNameSuggestion: unknown };

export type PullLiveContextMutationVariables = Exact<{ [key: string]: never; }>;


export type PullLiveContextMutation = { pullLiveContext: unknown };

export type ConnectContextRepositoryMutationVariables = Exact<{
  input: unknown;
}>;


export type ConnectContextRepositoryMutation = { connectContextRepository: unknown };

export type DisconnectContextRepositoryMutationVariables = Exact<{ [key: string]: never; }>;


export type DisconnectContextRepositoryMutation = { disconnectContextRepository: unknown };

export type WriteContextFileMutationVariables = Exact<{
  input: unknown;
}>;


export type WriteContextFileMutation = { writeContextFile: unknown };

export type UpdateContextWorktreeMutationVariables = Exact<{
  requiredCommits?: Array<string> | string | null | undefined;
}>;


export type UpdateContextWorktreeMutation = { updateContextWorktree: unknown };

export type SwitchContextBranchMutationVariables = Exact<{
  branch: string;
}>;


export type SwitchContextBranchMutation = { switchContextBranch: unknown };

export type CreateContextBranchMutationVariables = Exact<{
  branch: string;
}>;


export type CreateContextBranchMutation = { createContextBranch: unknown };

export type CreateContextBranchAndCommitMutationVariables = Exact<{
  input: unknown;
}>;


export type CreateContextBranchAndCommitMutation = { createContextBranchAndCommit: unknown };

export type CommitContextChangesMutationVariables = Exact<{
  input: unknown;
}>;


export type CommitContextChangesMutation = { commitContextChanges: unknown };

export type DiscardContextFileChangeMutationVariables = Exact<{
  path: string;
}>;


export type DiscardContextFileChangeMutation = { discardContextFileChange: unknown };

export type DiscardAllContextChangesMutationVariables = Exact<{ [key: string]: never; }>;


export type DiscardAllContextChangesMutation = { discardAllContextChanges: unknown };

export type PushContextBranchMutationVariables = Exact<{ [key: string]: never; }>;


export type PushContextBranchMutation = { pushContextBranch: unknown };

export type ContextRecommendationsQueryVariables = Exact<{
  status?: string | null | undefined;
}>;


export type ContextRecommendationsQuery = { contextRecommendations: unknown };

export type LatestContextRecommendationRunQueryVariables = Exact<{ [key: string]: never; }>;


export type LatestContextRecommendationRunQuery = { latestContextRecommendationRun: unknown };

export type LatestSuccessfulContextRecommendationRunQueryVariables = Exact<{ [key: string]: never; }>;


export type LatestSuccessfulContextRecommendationRunQuery = { latestSuccessfulContextRecommendationRun: unknown };

export type ContextRecommendationAvailableModelsQueryVariables = Exact<{ [key: string]: never; }>;


export type ContextRecommendationAvailableModelsQuery = { contextRecommendationAvailableModels: unknown };

export type ContextRecommendationConfigQueryVariables = Exact<{ [key: string]: never; }>;


export type ContextRecommendationConfigQuery = { contextRecommendationConfig: unknown };

export type ContextRecommendationRepoQueryVariables = Exact<{ [key: string]: never; }>;


export type ContextRecommendationRepoQuery = { contextRecommendationRepo: unknown };

export type ContextRecommendationLinkedReposQueryVariables = Exact<{ [key: string]: never; }>;


export type ContextRecommendationLinkedReposQuery = { contextRecommendationLinkedRepos: unknown };

export type ContextRecommendationPrStatusQueryVariables = Exact<{
  id: string;
}>;


export type ContextRecommendationPrStatusQuery = { contextRecommendationPrStatus: unknown };

export type ContextRecommendationAgentPromptQueryVariables = Exact<{
  input: ContextRecommendationIdsInput;
}>;


export type ContextRecommendationAgentPromptQuery = { contextRecommendationAgentPrompt: string };

export type ContextRecommendationTriggerChatsQueryVariables = Exact<{
  input: ContextRecommendationTriggerChatsInput;
}>;


export type ContextRecommendationTriggerChatsQuery = { contextRecommendationTriggerChats: unknown };

export type RunContextRecommendationsMutationVariables = Exact<{ [key: string]: never; }>;


export type RunContextRecommendationsMutation = { runContextRecommendations: unknown };

export type CancelContextRecommendationRunMutationVariables = Exact<{
  runId: string;
}>;


export type CancelContextRecommendationRunMutation = { cancelContextRecommendationRun: unknown };

export type SetContextRecommendationConfigMutationVariables = Exact<{
  input: SetContextRecommendationConfigInput;
}>;


export type SetContextRecommendationConfigMutation = { setContextRecommendationConfig: boolean };

export type SetContextRecommendationStatusMutationVariables = Exact<{
  input: SetContextRecommendationStatusInput;
}>;


export type SetContextRecommendationStatusMutation = { setContextRecommendationStatus: boolean };

export type CreateContextRecommendationPullRequestMutationVariables = Exact<{
  id: string;
}>;


export type CreateContextRecommendationPullRequestMutation = { createContextRecommendationPullRequest: unknown };

export type CreateContextRecommendationBatchPullRequestMutationVariables = Exact<{
  input: ContextRecommendationIdsInput;
}>;


export type CreateContextRecommendationBatchPullRequestMutation = { createContextRecommendationBatchPullRequest: unknown };

export type MapBoundariesQueryVariables = Exact<{ [key: string]: never; }>;


export type MapBoundariesQuery = { mapBoundaries: unknown };

export type ValidateMapBoundaryUrlMutationVariables = Exact<{
  url: string;
}>;


export type ValidateMapBoundaryUrlMutation = { validateMapBoundaryUrl: unknown };

export type AddMapBoundaryMutationVariables = Exact<{
  input: unknown;
}>;


export type AddMapBoundaryMutation = { addMapBoundary: unknown };

export type UpdateMapBoundaryMutationVariables = Exact<{
  input: unknown;
}>;


export type UpdateMapBoundaryMutation = { updateMapBoundary: unknown };

export type DeleteMapBoundaryMutationVariables = Exact<{
  key: string;
}>;


export type DeleteMapBoundaryMutation = { deleteMapBoundary: unknown };

export type MemoryFieldsFragment = { id: string, chatId: string | null, content: string, category: string, supersededBy: string | null, createdAt: string, updatedAt: string };

export type MemoriesQueryVariables = Exact<{ [key: string]: never; }>;


export type MemoriesQuery = { memories: Array<{ id: string, chatId: string | null, content: string, category: string, supersededBy: string | null, createdAt: string, updatedAt: string }> };

export type MemorySettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type MemorySettingsQuery = { memorySettings: { memoryEnabled: boolean } };

export type ProjectMemorySettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type ProjectMemorySettingsQuery = { projectMemorySettings: { memoryEnabled: boolean } };

export type SetMemoryEnabledMutationVariables = Exact<{
  memoryEnabled: boolean;
}>;


export type SetMemoryEnabledMutation = { setMemoryEnabled: { memoryEnabled: boolean } };

export type EditMemoryMutationVariables = Exact<{
  input: EditMemoryInput;
}>;


export type EditMemoryMutation = { editMemory: { id: string, chatId: string | null, content: string, category: string, supersededBy: string | null, createdAt: string, updatedAt: string } };

export type DeleteMemoryMutationVariables = Exact<{
  memoryId: string | number;
}>;


export type DeleteMemoryMutation = { deleteMemory: boolean };

export type LlmConfigsQueryVariables = Exact<{ [key: string]: never; }>;


export type LlmConfigsQuery = { llmConfigs: unknown };

export type UpsertLlmConfigMutationVariables = Exact<{
  input: unknown;
}>;


export type UpsertLlmConfigMutation = { upsertLlmConfig: unknown };

export type DeleteLlmConfigMutationVariables = Exact<{
  provider: string;
}>;


export type DeleteLlmConfigMutation = { deleteLlmConfig: boolean };

export type KnownModelsQueryVariables = Exact<{ [key: string]: never; }>;


export type KnownModelsQuery = { knownModels: unknown };

export type DefaultModelsQueryVariables = Exact<{ [key: string]: never; }>;


export type DefaultModelsQuery = { defaultModels: unknown };

export type UpdateDefaultModelsMutationVariables = Exact<{
  settings: unknown;
}>;


export type UpdateDefaultModelsMutation = { updateDefaultModels: unknown };

export type DefaultChatModelQueryVariables = Exact<{ [key: string]: never; }>;


export type DefaultChatModelQuery = { defaultChatModel: unknown };

export type AgentSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type AgentSettingsQuery = { agentSettings: unknown };

export type UpdateAgentSettingsMutationVariables = Exact<{
  input: unknown;
}>;


export type UpdateAgentSettingsMutation = { updateAgentSettings: unknown };

export type AvailableModelsQueryVariables = Exact<{ [key: string]: never; }>;


export type AvailableModelsQuery = { availableModels: unknown };

export type KnownTranscribeModelsQueryVariables = Exact<{ [key: string]: never; }>;


export type KnownTranscribeModelsQuery = { knownTranscribeModels: unknown };

export type GenerateOnboardingRulesMutationVariables = Exact<{
  input: GenerateOnboardingRulesInput;
}>;


export type GenerateOnboardingRulesMutation = { generateOnboardingRules: boolean };

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


export type CreateSavedPromptMutation = { createSavedPrompt: { id: string, title: string, prompt: string, createdAt: string, updatedAt: string } };

export type UpdateSavedPromptMutationVariables = Exact<{
  input: UpdateSavedPromptInput;
}>;


export type UpdateSavedPromptMutation = { updateSavedPrompt: { id: string, title: string, prompt: string, createdAt: string, updatedAt: string } };

export type DeleteSavedPromptMutationVariables = Exact<{
  promptId: string | number;
}>;


export type DeleteSavedPromptMutation = { deleteSavedPrompt: boolean };

export type ProjectSavedPromptsQueryVariables = Exact<{
  projectId: string | number;
}>;


export type ProjectSavedPromptsQuery = { projectSavedPrompts: Array<{ id: string, title: string, prompt: string, createdAt: string, updatedAt: string }> };

export type SandboxSecretFieldsFragment = { id: string, name: string, description: string | null, createdAt: string, updatedAt: string };

export type SandboxSecretsQueryVariables = Exact<{ [key: string]: never; }>;


export type SandboxSecretsQuery = { sandboxSecrets: Array<{ id: string, name: string, description: string | null, createdAt: string, updatedAt: string }> };

export type SetSandboxSecretMutationVariables = Exact<{
  input: SetSandboxSecretInput;
}>;


export type SetSandboxSecretMutation = { setSandboxSecret: { id: string, name: string, description: string | null, createdAt: string, updatedAt: string } };

export type UpdateSandboxSecretDescriptionMutationVariables = Exact<{
  input: UpdateSandboxSecretDescriptionInput;
}>;


export type UpdateSandboxSecretDescriptionMutation = { updateSandboxSecretDescription: { id: string, name: string, description: string | null, createdAt: string, updatedAt: string } };

export type DeleteSandboxSecretMutationVariables = Exact<{
  secretId: string | number;
}>;


export type DeleteSandboxSecretMutation = { deleteSandboxSecret: boolean };

export type SkillFieldsFragment = { name: string, description: string, location: string };

export type SkillsQueryVariables = Exact<{ [key: string]: never; }>;


export type SkillsQuery = { skills: Array<{ name: string, description: string, location: string }> };

export type SkillCatalogQueryVariables = Exact<{ [key: string]: never; }>;


export type SkillCatalogQuery = { skillCatalog: Array<{ name: string, description: string, location: string }> };

export type SkillLoadErrorsQueryVariables = Exact<{ [key: string]: never; }>;


export type SkillLoadErrorsQuery = { skillLoadErrors: Array<{ location: string, message: string }> };

export type StorageConfigQueryVariables = Exact<{ [key: string]: never; }>;


export type StorageConfigQuery = { storageConfig: unknown };

export type StorageHealthQueryVariables = Exact<{ [key: string]: never; }>;


export type StorageHealthQuery = { storageHealth: unknown };

export type StorageUploadLimitsQueryVariables = Exact<{ [key: string]: never; }>;


export type StorageUploadLimitsQuery = { storageUploadLimits: unknown };

export type StorageUsageQueryVariables = Exact<{ [key: string]: never; }>;


export type StorageUsageQuery = { storageUsage: unknown };

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

export const ChatFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ChatFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Chat"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"projectId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"isStarred"}},{"kind":"Field","name":{"kind":"Name","value":"isOnboarding"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"forkMetadata"}},{"kind":"Field","name":{"kind":"Name","value":"automationRun"}},{"kind":"Field","name":{"kind":"Name","value":"messages"}}]}}]} as unknown as DocumentNode<ChatFieldsFragment, unknown>;
export const SharedChatFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SharedChatFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SharedChat"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"chatId"}},{"kind":"Field","name":{"kind":"Name","value":"projectId"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"visibility"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"forkMetadata"}},{"kind":"Field","name":{"kind":"Name","value":"messageBubbles"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"charCount"}}]}}]}}]} as unknown as DocumentNode<SharedChatFieldsFragment, unknown>;
export const MemoryFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MemoryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Memory"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"chatId"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"supersededBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<MemoryFieldsFragment, unknown>;
export const ProjectSummaryFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectSummaryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ProjectSummary"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"orgId"}},{"kind":"Field","name":{"kind":"Name","value":"userRole"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<ProjectSummaryFieldsFragment, unknown>;
export const SandboxSecretFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SandboxSecretFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SandboxSecret"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<SandboxSecretFieldsFragment, unknown>;
export const SkillFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SkillFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Skill"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"location"}}]}}]} as unknown as DocumentNode<SkillFieldsFragment, unknown>;
export const ContextSyncStatusFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContextSyncStatusFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContextSyncStatus"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"finishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"databases"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"databaseName"}},{"kind":"Field","name":{"kind":"Name","value":"schemasSynced"}},{"kind":"Field","name":{"kind":"Name","value":"tablesSynced"}},{"kind":"Field","name":{"kind":"Name","value":"renderErrors"}},{"kind":"Field","name":{"kind":"Name","value":"removedPaths"}}]}},{"kind":"Field","name":{"kind":"Name","value":"log"}}]}}]} as unknown as DocumentNode<ContextSyncStatusFieldsFragment, unknown>;
export const ChartDownloadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ChartDownload"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"toolCallId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chartDownload"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"toolCallId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"toolCallId"}}}]}]}}]} as unknown as DocumentNode<ChartDownloadQuery, ChartDownloadQueryVariables>;
export const UpdateChartConfigDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateChartConfig"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"toolCallId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"config"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateChartConfig"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"toolCallId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"toolCallId"}}},{"kind":"Argument","name":{"kind":"Name","value":"config"},"value":{"kind":"Variable","name":{"kind":"Name","value":"config"}}}]}]}}]} as unknown as DocumentNode<UpdateChartConfigMutation, UpdateChartConfigMutationVariables>;
export const UpdateMapConfigDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateMapConfig"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"mapId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"config"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateMapConfig"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"mapId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"mapId"}}},{"kind":"Argument","name":{"kind":"Name","value":"config"},"value":{"kind":"Variable","name":{"kind":"Name","value":"config"}}}]}]}}]} as unknown as DocumentNode<UpdateMapConfigMutation, UpdateMapConfigMutationVariables>;
export const ChartPluginsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ChartPlugins"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chartPlugins"}}]}}]} as unknown as DocumentNode<ChartPluginsQuery, ChartPluginsQueryVariables>;
export const ChartPluginSourceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ChartPluginSource"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"type"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"version"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chartPluginSource"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"type"},"value":{"kind":"Variable","name":{"kind":"Name","value":"type"}}},{"kind":"Argument","name":{"kind":"Name","value":"version"},"value":{"kind":"Variable","name":{"kind":"Name","value":"version"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"source"}},{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]}}]} as unknown as DocumentNode<ChartPluginSourceQuery, ChartPluginSourceQueryVariables>;
export const ChatDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Chat"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"chatId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chat"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"chatId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"chatId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChatFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ChatFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Chat"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"projectId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"isStarred"}},{"kind":"Field","name":{"kind":"Name","value":"isOnboarding"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"forkMetadata"}},{"kind":"Field","name":{"kind":"Name","value":"automationRun"}},{"kind":"Field","name":{"kind":"Name","value":"messages"}}]}}]} as unknown as DocumentNode<ChatQuery, ChatQueryVariables>;
export const ChatListDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ChatList"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ChatListInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chatList"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"groups"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"chats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"projectId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"isStarred"}},{"kind":"Field","name":{"kind":"Name","value":"isOnboarding"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"shareId"}},{"kind":"Field","name":{"kind":"Name","value":"ownerName"}}]}}]}}]}}]}}]} as unknown as DocumentNode<ChatListQuery, ChatListQueryVariables>;
export const SearchChatsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SearchChats"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"searchChats"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"matchedText"}}]}}]}}]} as unknown as DocumentNode<SearchChatsQuery, SearchChatsQueryVariables>;
export const ChatForkMetadataDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ChatForkMetadata"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"chatId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chatForkMetadata"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"chatId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"chatId"}}}]}]}}]} as unknown as DocumentNode<ChatForkMetadataQuery, ChatForkMetadataQueryVariables>;
export const ChatContextUsageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ChatContextUsage"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ChatContextUsageInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chatContextUsage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tokensUsed"}},{"kind":"Field","name":{"kind":"Name","value":"contextWindow"}}]}}]}}]} as unknown as DocumentNode<ChatContextUsageQuery, ChatContextUsageQueryVariables>;
export const QueryRowsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"QueryRows"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"QueryRowsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"queryRows"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"columns"}},{"kind":"Field","name":{"kind":"Name","value":"rows"}},{"kind":"Field","name":{"kind":"Name","value":"totalRows"}}]}}]}}]} as unknown as DocumentNode<QueryRowsQuery, QueryRowsQueryVariables>;
export const CitationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Citation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"queryId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"column"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"citation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"queryId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"queryId"}}},{"kind":"Argument","name":{"kind":"Name","value":"column"},"value":{"kind":"Variable","name":{"kind":"Name","value":"column"}}}]}]}}]} as unknown as DocumentNode<CitationQuery, CitationQueryVariables>;
export const DeleteChatDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteChat"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"chatId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteChat"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"chatId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"chatId"}}}]}]}}]} as unknown as DocumentNode<DeleteChatMutation, DeleteChatMutationVariables>;
export const StopChatDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StopChat"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"chatId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stopChat"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"chatId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"chatId"}}}]}]}}]} as unknown as DocumentNode<StopChatMutation, StopChatMutationVariables>;
export const CancelChatDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CancelChat"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"chatId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cancelChat"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"chatId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"chatId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"outcome"}},{"kind":"Field","name":{"kind":"Name","value":"chatDeleted"}}]}}]}}]} as unknown as DocumentNode<CancelChatMutation, CancelChatMutationVariables>;
export const RenameChatDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RenameChat"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RenameChatInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"renameChat"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<RenameChatMutation, RenameChatMutationVariables>;
export const DeleteAllNonStarredChatsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteAllNonStarredChats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteAllNonStarredChats"}}]}}]} as unknown as DocumentNode<DeleteAllNonStarredChatsMutation, DeleteAllNonStarredChatsMutationVariables>;
export const SetChatStarredDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetChatStarred"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"chatId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isStarred"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setChatStarred"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"chatId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"chatId"}}},{"kind":"Argument","name":{"kind":"Name","value":"isStarred"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isStarred"}}}]}]}}]} as unknown as DocumentNode<SetChatStarredMutation, SetChatStarredMutationVariables>;
export const SwitchMessageVersionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SwitchMessageVersion"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"chatId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"messageId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"switchMessageVersion"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"chatId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"chatId"}}},{"kind":"Argument","name":{"kind":"Name","value":"messageId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"messageId"}}}]}]}}]} as unknown as DocumentNode<SwitchMessageVersionMutation, SwitchMessageVersionMutationVariables>;
export const SubmitMessageFeedbackDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SubmitMessageFeedback"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"MessageFeedbackInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"submitMessageFeedback"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"messageId"}},{"kind":"Field","name":{"kind":"Name","value":"vote"}},{"kind":"Field","name":{"kind":"Name","value":"explanation"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<SubmitMessageFeedbackMutation, SubmitMessageFeedbackMutationVariables>;
export const SharedChatsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SharedChats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedChats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SharedChatFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SharedChatFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SharedChat"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"chatId"}},{"kind":"Field","name":{"kind":"Name","value":"projectId"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"visibility"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"forkMetadata"}},{"kind":"Field","name":{"kind":"Name","value":"messageBubbles"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"charCount"}}]}}]}}]} as unknown as DocumentNode<SharedChatsQuery, SharedChatsQueryVariables>;
export const SharedChatDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SharedChat"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"shareId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedChat"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"shareId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"shareId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"share"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SharedChatFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"chat"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ChatFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userRole"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SharedChatFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SharedChat"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"chatId"}},{"kind":"Field","name":{"kind":"Name","value":"projectId"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"visibility"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"forkMetadata"}},{"kind":"Field","name":{"kind":"Name","value":"messageBubbles"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"charCount"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ChatFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Chat"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"projectId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"isStarred"}},{"kind":"Field","name":{"kind":"Name","value":"isOnboarding"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"forkMetadata"}},{"kind":"Field","name":{"kind":"Name","value":"automationRun"}},{"kind":"Field","name":{"kind":"Name","value":"messages"}}]}}]} as unknown as DocumentNode<SharedChatQuery, SharedChatQueryVariables>;
export const ChatShareOptionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ChatShareOptions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"chatId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chatShareOptions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"chatId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"chatId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"shareId"}},{"kind":"Field","name":{"kind":"Name","value":"visibility"}},{"kind":"Field","name":{"kind":"Name","value":"allowedUserIds"}}]}}]}}]} as unknown as DocumentNode<ChatShareOptionsQuery, ChatShareOptionsQueryVariables>;
export const CreateSharedChatDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateSharedChat"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateSharedChatInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSharedChat"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SharedChatFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SharedChatFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SharedChat"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"chatId"}},{"kind":"Field","name":{"kind":"Name","value":"projectId"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"visibility"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"authorName"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"forkMetadata"}},{"kind":"Field","name":{"kind":"Name","value":"messageBubbles"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"charCount"}}]}}]}}]} as unknown as DocumentNode<CreateSharedChatMutation, CreateSharedChatMutationVariables>;
export const UpdateSharedChatAccessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSharedChatAccess"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"shareId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"allowedUserIds"}},"type":{"kind":"NonNullType","type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSharedChatAccess"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"shareId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"shareId"}}},{"kind":"Argument","name":{"kind":"Name","value":"allowedUserIds"},"value":{"kind":"Variable","name":{"kind":"Name","value":"allowedUserIds"}}}]}]}}]} as unknown as DocumentNode<UpdateSharedChatAccessMutation, UpdateSharedChatAccessMutationVariables>;
export const DeleteSharedChatDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteSharedChat"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"shareId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteSharedChat"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"shareId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"shareId"}}}]}]}}]} as unknown as DocumentNode<DeleteSharedChatMutation, DeleteSharedChatMutationVariables>;
export const ForkSharedChatDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ForkSharedChat"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ForkSharedChatInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"forkSharedChat"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chatId"}}]}}]}}]} as unknown as DocumentNode<ForkSharedChatMutation, ForkSharedChatMutationVariables>;
export const AskSharedChatDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AskSharedChat"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ForkSharedChatInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"askSharedChat"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chatId"}}]}}]}}]} as unknown as DocumentNode<AskSharedChatMutation, AskSharedChatMutationVariables>;
export const SharedChatQuickQuestionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SharedChatQuickQuestions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"shareId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedChatQuickQuestions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"shareId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"shareId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chatId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<SharedChatQuickQuestionsQuery, SharedChatQuickQuestionsQueryVariables>;
export const PreviewSqlQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PreviewSqlQuery"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SqlEditInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"previewSqlQuery"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<PreviewSqlQueryMutation, PreviewSqlQueryMutationVariables>;
export const UpdateSqlQueryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSqlQuery"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SqlEditInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSqlQuery"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"input"}},{"kind":"Field","name":{"kind":"Name","value":"output"}},{"kind":"Field","name":{"kind":"Name","value":"toolCallId"}},{"kind":"Field","name":{"kind":"Name","value":"chatId"}}]}}]}}]} as unknown as DocumentNode<UpdateSqlQueryMutation, UpdateSqlQueryMutationVariables>;
export const ContextRepositoryStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ContextRepositoryStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contextRepositoryStatus"}}]}}]} as unknown as DocumentNode<ContextRepositoryStatusQuery, ContextRepositoryStatusQueryVariables>;
export const ContextPullHistoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ContextPullHistory"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contextPullHistory"}}]}}]} as unknown as DocumentNode<ContextPullHistoryQuery, ContextPullHistoryQueryVariables>;
export const ContextFileTreeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ContextFileTree"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contextFileTree"}}]}}]} as unknown as DocumentNode<ContextFileTreeQuery, ContextFileTreeQueryVariables>;
export const ContextRulesPreviewGroupsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ContextRulesPreviewGroups"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contextRulesPreviewGroups"}}]}}]} as unknown as DocumentNode<ContextRulesPreviewGroupsQuery, ContextRulesPreviewGroupsQueryVariables>;
export const ContextFileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ContextFile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contextFile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}}]}]}}]} as unknown as DocumentNode<ContextFileQuery, ContextFileQueryVariables>;
export const ContextSearchDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ContextSearch"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"query"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contextSearch"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"query"},"value":{"kind":"Variable","name":{"kind":"Name","value":"query"}}}]}]}}]} as unknown as DocumentNode<ContextSearchQuery, ContextSearchQueryVariables>;
export const ContextChangedFilesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ContextChangedFiles"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contextChangedFiles"}}]}}]} as unknown as DocumentNode<ContextChangedFilesQuery, ContextChangedFilesQueryVariables>;
export const ContextFileDiffDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ContextFileDiff"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contextFileDiff"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<ContextFileDiffQuery, ContextFileDiffQueryVariables>;
export const ContextHistoricalDiffActionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ContextHistoricalDiffAction"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contextHistoricalDiffAction"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<ContextHistoricalDiffActionQuery, ContextHistoricalDiffActionQueryVariables>;
export const ContextBranchNameSuggestionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ContextBranchNameSuggestion"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contextBranchNameSuggestion"}}]}}]} as unknown as DocumentNode<ContextBranchNameSuggestionQuery, ContextBranchNameSuggestionQueryVariables>;
export const PullLiveContextDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PullLiveContext"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pullLiveContext"}}]}}]} as unknown as DocumentNode<PullLiveContextMutation, PullLiveContextMutationVariables>;
export const ConnectContextRepositoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ConnectContextRepository"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"connectContextRepository"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<ConnectContextRepositoryMutation, ConnectContextRepositoryMutationVariables>;
export const DisconnectContextRepositoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DisconnectContextRepository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"disconnectContextRepository"}}]}}]} as unknown as DocumentNode<DisconnectContextRepositoryMutation, DisconnectContextRepositoryMutationVariables>;
export const WriteContextFileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"WriteContextFile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"writeContextFile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<WriteContextFileMutation, WriteContextFileMutationVariables>;
export const UpdateContextWorktreeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateContextWorktree"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"requiredCommits"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateContextWorktree"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"requiredCommits"},"value":{"kind":"Variable","name":{"kind":"Name","value":"requiredCommits"}}}]}]}}]} as unknown as DocumentNode<UpdateContextWorktreeMutation, UpdateContextWorktreeMutationVariables>;
export const SwitchContextBranchDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SwitchContextBranch"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"branch"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"switchContextBranch"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"branch"},"value":{"kind":"Variable","name":{"kind":"Name","value":"branch"}}}]}]}}]} as unknown as DocumentNode<SwitchContextBranchMutation, SwitchContextBranchMutationVariables>;
export const CreateContextBranchDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateContextBranch"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"branch"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createContextBranch"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"branch"},"value":{"kind":"Variable","name":{"kind":"Name","value":"branch"}}}]}]}}]} as unknown as DocumentNode<CreateContextBranchMutation, CreateContextBranchMutationVariables>;
export const CreateContextBranchAndCommitDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateContextBranchAndCommit"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createContextBranchAndCommit"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<CreateContextBranchAndCommitMutation, CreateContextBranchAndCommitMutationVariables>;
export const CommitContextChangesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CommitContextChanges"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"commitContextChanges"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<CommitContextChangesMutation, CommitContextChangesMutationVariables>;
export const DiscardContextFileChangeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DiscardContextFileChange"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"path"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"discardContextFileChange"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"path"},"value":{"kind":"Variable","name":{"kind":"Name","value":"path"}}}]}]}}]} as unknown as DocumentNode<DiscardContextFileChangeMutation, DiscardContextFileChangeMutationVariables>;
export const DiscardAllContextChangesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DiscardAllContextChanges"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"discardAllContextChanges"}}]}}]} as unknown as DocumentNode<DiscardAllContextChangesMutation, DiscardAllContextChangesMutationVariables>;
export const PushContextBranchDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PushContextBranch"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pushContextBranch"}}]}}]} as unknown as DocumentNode<PushContextBranchMutation, PushContextBranchMutationVariables>;
export const ContextRecommendationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ContextRecommendations"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"status"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contextRecommendations"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"status"},"value":{"kind":"Variable","name":{"kind":"Name","value":"status"}}}]}]}}]} as unknown as DocumentNode<ContextRecommendationsQuery, ContextRecommendationsQueryVariables>;
export const LatestContextRecommendationRunDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"LatestContextRecommendationRun"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latestContextRecommendationRun"}}]}}]} as unknown as DocumentNode<LatestContextRecommendationRunQuery, LatestContextRecommendationRunQueryVariables>;
export const LatestSuccessfulContextRecommendationRunDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"LatestSuccessfulContextRecommendationRun"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"latestSuccessfulContextRecommendationRun"}}]}}]} as unknown as DocumentNode<LatestSuccessfulContextRecommendationRunQuery, LatestSuccessfulContextRecommendationRunQueryVariables>;
export const ContextRecommendationAvailableModelsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ContextRecommendationAvailableModels"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contextRecommendationAvailableModels"}}]}}]} as unknown as DocumentNode<ContextRecommendationAvailableModelsQuery, ContextRecommendationAvailableModelsQueryVariables>;
export const ContextRecommendationConfigDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ContextRecommendationConfig"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contextRecommendationConfig"}}]}}]} as unknown as DocumentNode<ContextRecommendationConfigQuery, ContextRecommendationConfigQueryVariables>;
export const ContextRecommendationRepoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ContextRecommendationRepo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contextRecommendationRepo"}}]}}]} as unknown as DocumentNode<ContextRecommendationRepoQuery, ContextRecommendationRepoQueryVariables>;
export const ContextRecommendationLinkedReposDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ContextRecommendationLinkedRepos"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contextRecommendationLinkedRepos"}}]}}]} as unknown as DocumentNode<ContextRecommendationLinkedReposQuery, ContextRecommendationLinkedReposQueryVariables>;
export const ContextRecommendationPrStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ContextRecommendationPrStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contextRecommendationPrStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<ContextRecommendationPrStatusQuery, ContextRecommendationPrStatusQueryVariables>;
export const ContextRecommendationAgentPromptDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ContextRecommendationAgentPrompt"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ContextRecommendationIdsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contextRecommendationAgentPrompt"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<ContextRecommendationAgentPromptQuery, ContextRecommendationAgentPromptQueryVariables>;
export const ContextRecommendationTriggerChatsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ContextRecommendationTriggerChats"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ContextRecommendationTriggerChatsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contextRecommendationTriggerChats"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<ContextRecommendationTriggerChatsQuery, ContextRecommendationTriggerChatsQueryVariables>;
export const RunContextRecommendationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RunContextRecommendations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"runContextRecommendations"}}]}}]} as unknown as DocumentNode<RunContextRecommendationsMutation, RunContextRecommendationsMutationVariables>;
export const CancelContextRecommendationRunDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CancelContextRecommendationRun"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"runId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cancelContextRecommendationRun"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"runId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"runId"}}}]}]}}]} as unknown as DocumentNode<CancelContextRecommendationRunMutation, CancelContextRecommendationRunMutationVariables>;
export const SetContextRecommendationConfigDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetContextRecommendationConfig"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SetContextRecommendationConfigInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setContextRecommendationConfig"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SetContextRecommendationConfigMutation, SetContextRecommendationConfigMutationVariables>;
export const SetContextRecommendationStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetContextRecommendationStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SetContextRecommendationStatusInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setContextRecommendationStatus"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SetContextRecommendationStatusMutation, SetContextRecommendationStatusMutationVariables>;
export const CreateContextRecommendationPullRequestDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateContextRecommendationPullRequest"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createContextRecommendationPullRequest"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<CreateContextRecommendationPullRequestMutation, CreateContextRecommendationPullRequestMutationVariables>;
export const CreateContextRecommendationBatchPullRequestDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateContextRecommendationBatchPullRequest"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ContextRecommendationIdsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createContextRecommendationBatchPullRequest"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<CreateContextRecommendationBatchPullRequestMutation, CreateContextRecommendationBatchPullRequestMutationVariables>;
export const MapBoundariesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MapBoundaries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mapBoundaries"}}]}}]} as unknown as DocumentNode<MapBoundariesQuery, MapBoundariesQueryVariables>;
export const ValidateMapBoundaryUrlDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ValidateMapBoundaryUrl"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"url"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"validateMapBoundaryUrl"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"url"},"value":{"kind":"Variable","name":{"kind":"Name","value":"url"}}}]}]}}]} as unknown as DocumentNode<ValidateMapBoundaryUrlMutation, ValidateMapBoundaryUrlMutationVariables>;
export const AddMapBoundaryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AddMapBoundary"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"addMapBoundary"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<AddMapBoundaryMutation, AddMapBoundaryMutationVariables>;
export const UpdateMapBoundaryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateMapBoundary"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateMapBoundary"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<UpdateMapBoundaryMutation, UpdateMapBoundaryMutationVariables>;
export const DeleteMapBoundaryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteMapBoundary"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"key"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteMapBoundary"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"key"},"value":{"kind":"Variable","name":{"kind":"Name","value":"key"}}}]}]}}]} as unknown as DocumentNode<DeleteMapBoundaryMutation, DeleteMapBoundaryMutationVariables>;
export const MemoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Memories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"memories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MemoryFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MemoryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Memory"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"chatId"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"supersededBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<MemoriesQuery, MemoriesQueryVariables>;
export const MemorySettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MemorySettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"memorySettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"memoryEnabled"}}]}}]}}]} as unknown as DocumentNode<MemorySettingsQuery, MemorySettingsQueryVariables>;
export const ProjectMemorySettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProjectMemorySettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"projectMemorySettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"memoryEnabled"}}]}}]}}]} as unknown as DocumentNode<ProjectMemorySettingsQuery, ProjectMemorySettingsQueryVariables>;
export const SetMemoryEnabledDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetMemoryEnabled"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"memoryEnabled"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setMemoryEnabled"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"memoryEnabled"},"value":{"kind":"Variable","name":{"kind":"Name","value":"memoryEnabled"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"memoryEnabled"}}]}}]}}]} as unknown as DocumentNode<SetMemoryEnabledMutation, SetMemoryEnabledMutationVariables>;
export const EditMemoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"EditMemory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"EditMemoryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"editMemory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"MemoryFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"MemoryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Memory"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"chatId"}},{"kind":"Field","name":{"kind":"Name","value":"content"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"supersededBy"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<EditMemoryMutation, EditMemoryMutationVariables>;
export const DeleteMemoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteMemory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"memoryId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteMemory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"memoryId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"memoryId"}}}]}]}}]} as unknown as DocumentNode<DeleteMemoryMutation, DeleteMemoryMutationVariables>;
export const LlmConfigsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"LlmConfigs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"llmConfigs"}}]}}]} as unknown as DocumentNode<LlmConfigsQuery, LlmConfigsQueryVariables>;
export const UpsertLlmConfigDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpsertLlmConfig"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"upsertLlmConfig"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<UpsertLlmConfigMutation, UpsertLlmConfigMutationVariables>;
export const DeleteLlmConfigDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteLlmConfig"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"provider"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteLlmConfig"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"provider"},"value":{"kind":"Variable","name":{"kind":"Name","value":"provider"}}}]}]}}]} as unknown as DocumentNode<DeleteLlmConfigMutation, DeleteLlmConfigMutationVariables>;
export const KnownModelsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"KnownModels"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"knownModels"}}]}}]} as unknown as DocumentNode<KnownModelsQuery, KnownModelsQueryVariables>;
export const DefaultModelsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DefaultModels"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"defaultModels"}}]}}]} as unknown as DocumentNode<DefaultModelsQuery, DefaultModelsQueryVariables>;
export const UpdateDefaultModelsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateDefaultModels"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"settings"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateDefaultModels"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"settings"},"value":{"kind":"Variable","name":{"kind":"Name","value":"settings"}}}]}]}}]} as unknown as DocumentNode<UpdateDefaultModelsMutation, UpdateDefaultModelsMutationVariables>;
export const DefaultChatModelDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DefaultChatModel"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"defaultChatModel"}}]}}]} as unknown as DocumentNode<DefaultChatModelQuery, DefaultChatModelQueryVariables>;
export const AgentSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AgentSettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"agentSettings"}}]}}]} as unknown as DocumentNode<AgentSettingsQuery, AgentSettingsQueryVariables>;
export const UpdateAgentSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateAgentSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateAgentSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<UpdateAgentSettingsMutation, UpdateAgentSettingsMutationVariables>;
export const AvailableModelsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AvailableModels"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"availableModels"}}]}}]} as unknown as DocumentNode<AvailableModelsQuery, AvailableModelsQueryVariables>;
export const KnownTranscribeModelsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"KnownTranscribeModels"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"knownTranscribeModels"}}]}}]} as unknown as DocumentNode<KnownTranscribeModelsQuery, KnownTranscribeModelsQueryVariables>;
export const GenerateOnboardingRulesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GenerateOnboardingRules"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GenerateOnboardingRulesInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"generateOnboardingRules"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<GenerateOnboardingRulesMutation, GenerateOnboardingRulesMutationVariables>;
export const CurrentProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CurrentProject"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currentProject"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectSummaryFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectSummaryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ProjectSummary"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"orgId"}},{"kind":"Field","name":{"kind":"Name","value":"userRole"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<CurrentProjectQuery, CurrentProjectQueryVariables>;
export const ProjectsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Projects"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"projects"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectSummaryFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectSummaryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ProjectSummary"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"orgId"}},{"kind":"Field","name":{"kind":"Name","value":"userRole"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<ProjectsQuery, ProjectsQueryVariables>;
export const CreateProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateProjectInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectSummaryFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectSummaryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ProjectSummary"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"orgId"}},{"kind":"Field","name":{"kind":"Name","value":"userRole"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<CreateProjectMutation, CreateProjectMutationVariables>;
export const RenameProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RenameProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RenameProjectInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"renameProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectSummaryFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectSummaryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ProjectSummary"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"orgId"}},{"kind":"Field","name":{"kind":"Name","value":"userRole"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<RenameProjectMutation, RenameProjectMutationVariables>;
export const DeleteProjectDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteProject"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteProject"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}]}]}}]} as unknown as DocumentNode<DeleteProjectMutation, DeleteProjectMutationVariables>;
export const SavedPromptsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SavedPrompts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"savedPrompts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"prompt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<SavedPromptsQuery, SavedPromptsQueryVariables>;
export const CreateSavedPromptDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateSavedPrompt"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SavedPromptInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSavedPrompt"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"prompt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateSavedPromptMutation, CreateSavedPromptMutationVariables>;
export const UpdateSavedPromptDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSavedPrompt"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateSavedPromptInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSavedPrompt"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"prompt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateSavedPromptMutation, UpdateSavedPromptMutationVariables>;
export const DeleteSavedPromptDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteSavedPrompt"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"promptId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteSavedPrompt"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"promptId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"promptId"}}}]}]}}]} as unknown as DocumentNode<DeleteSavedPromptMutation, DeleteSavedPromptMutationVariables>;
export const ProjectSavedPromptsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProjectSavedPrompts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"projectSavedPrompts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"projectId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"projectId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"prompt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<ProjectSavedPromptsQuery, ProjectSavedPromptsQueryVariables>;
export const SandboxSecretsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SandboxSecrets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sandboxSecrets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SandboxSecretFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SandboxSecretFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SandboxSecret"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<SandboxSecretsQuery, SandboxSecretsQueryVariables>;
export const SetSandboxSecretDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetSandboxSecret"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SetSandboxSecretInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setSandboxSecret"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SandboxSecretFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SandboxSecretFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SandboxSecret"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<SetSandboxSecretMutation, SetSandboxSecretMutationVariables>;
export const UpdateSandboxSecretDescriptionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSandboxSecretDescription"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateSandboxSecretDescriptionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSandboxSecretDescription"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SandboxSecretFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SandboxSecretFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SandboxSecret"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<UpdateSandboxSecretDescriptionMutation, UpdateSandboxSecretDescriptionMutationVariables>;
export const DeleteSandboxSecretDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteSandboxSecret"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"secretId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteSandboxSecret"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"secretId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"secretId"}}}]}]}}]} as unknown as DocumentNode<DeleteSandboxSecretMutation, DeleteSandboxSecretMutationVariables>;
export const SkillsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Skills"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"skills"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SkillFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SkillFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Skill"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"location"}}]}}]} as unknown as DocumentNode<SkillsQuery, SkillsQueryVariables>;
export const SkillCatalogDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SkillCatalog"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"skillCatalog"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SkillFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SkillFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Skill"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"location"}}]}}]} as unknown as DocumentNode<SkillCatalogQuery, SkillCatalogQueryVariables>;
export const SkillLoadErrorsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SkillLoadErrors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"skillLoadErrors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<SkillLoadErrorsQuery, SkillLoadErrorsQueryVariables>;
export const StorageConfigDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StorageConfig"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storageConfig"}}]}}]} as unknown as DocumentNode<StorageConfigQuery, StorageConfigQueryVariables>;
export const StorageHealthDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StorageHealth"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storageHealth"}}]}}]} as unknown as DocumentNode<StorageHealthQuery, StorageHealthQueryVariables>;
export const StorageUploadLimitsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StorageUploadLimits"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storageUploadLimits"}}]}}]} as unknown as DocumentNode<StorageUploadLimitsQuery, StorageUploadLimitsQueryVariables>;
export const StorageUsageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StorageUsage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storageUsage"}}]}}]} as unknown as DocumentNode<StorageUsageQuery, StorageUsageQueryVariables>;
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