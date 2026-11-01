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

export type CreateProjectQueryToolInput = {
  databaseId?: string | null | undefined;
  description: string;
  enabled?: boolean | null | undefined;
  name: string;
  parameters?: Array<QueryToolParameterInput>;
  sqlTemplate: string;
};

export type CreateSharedChatInput = {
  allowedUserIds?: Array<string> | null | undefined;
  chatId: string | number;
  /** Also notify recipients outside the app (Phase 5 notifications). */
  notify?: boolean;
  /** project or specific. */
  visibility?: string;
};

export type CreateSkillInput = {
  body: string;
  description: string;
  name: string;
};

export type DeleteSkillInput = {
  expectedHash: string;
  name: string;
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

export type PreviewProjectQueryToolInput = {
  databaseId?: string | null | undefined;
  parameters?: Array<QueryToolParameterInput>;
  sqlTemplate: string;
  /** Argument values by parameter name. */
  values?: unknown;
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

export type QueryToolParameterInput = {
  default?: unknown;
  description?: string | null | undefined;
  name: string;
  required: boolean;
  type: string;
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

export type UpdateProjectQueryToolInput = {
  databaseId?: string | null | undefined;
  description?: string | null | undefined;
  enabled?: boolean | null | undefined;
  id: string | number;
  name?: string | null | undefined;
  parameters?: Array<QueryToolParameterInput> | null | undefined;
  sqlTemplate?: string | null | undefined;
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

export type UpdateSkillInput = {
  body: string;
  description: string;
  /** Hash from `skillDetail`, so an edit never overwrites a newer version of the file. */
  expectedHash: string;
  name: string;
};

export type UpdateUserPreferencesInput = {
  /** compact or detailed */
  toolCallDensity?: string | null | undefined;
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

export type ChatDownloadQueryVariables = Exact<{
  input?: unknown;
}>;


export type ChatDownloadQuery = { chatDownload: unknown };

export type ChatShareMembersQueryVariables = Exact<{
  chatId: string | number;
}>;


export type ChatShareMembersQuery = { chatShareMembers: Array<{ id: string, name: string, email: string, role: string }> };

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

export type DatabaseObjectsQueryVariables = Exact<{ [key: string]: never; }>;


export type DatabaseObjectsQuery = { databaseObjects: Array<{ type: string, database: string, schema: string, table: string, fqdn: string }> };

export type DisplaySettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type DisplaySettingsQuery = { displaySettings: unknown };

export type UpdateDisplaySettingsMutationVariables = Exact<{
  input: unknown;
}>;


export type UpdateDisplaySettingsMutation = { updateDisplaySettings: unknown };

export type ProjectQueryToolFieldsFragment = { id: string, name: string, agentToolName: string, description: string, sqlTemplate: string, databaseId: string | null, enabled: boolean, createdBy: string | null, canEdit: boolean, createdAt: string, updatedAt: string, parameters: Array<{ name: string, type: string, description: string | null, required: boolean, default: unknown }> };

export type ProjectQueryToolsQueryVariables = Exact<{ [key: string]: never; }>;


export type ProjectQueryToolsQuery = { projectQueryTools: Array<{ id: string, name: string, agentToolName: string, description: string, sqlTemplate: string, databaseId: string | null, enabled: boolean, createdBy: string | null, canEdit: boolean, createdAt: string, updatedAt: string, parameters: Array<{ name: string, type: string, description: string | null, required: boolean, default: unknown }> }> };

export type QueryToolTableColumnsQueryVariables = Exact<{
  type: string;
  database: string;
  schema: string;
  table: string;
}>;


export type QueryToolTableColumnsQuery = { queryToolTableColumns: Array<{ name: string, type: string }> };

export type CreateProjectQueryToolMutationVariables = Exact<{
  input: CreateProjectQueryToolInput;
}>;


export type CreateProjectQueryToolMutation = { createProjectQueryTool: { id: string, name: string, agentToolName: string, description: string, sqlTemplate: string, databaseId: string | null, enabled: boolean, createdBy: string | null, canEdit: boolean, createdAt: string, updatedAt: string, parameters: Array<{ name: string, type: string, description: string | null, required: boolean, default: unknown }> } };

export type UpdateProjectQueryToolMutationVariables = Exact<{
  input: UpdateProjectQueryToolInput;
}>;


export type UpdateProjectQueryToolMutation = { updateProjectQueryTool: { id: string, name: string, agentToolName: string, description: string, sqlTemplate: string, databaseId: string | null, enabled: boolean, createdBy: string | null, canEdit: boolean, createdAt: string, updatedAt: string, parameters: Array<{ name: string, type: string, description: string | null, required: boolean, default: unknown }> } };

export type DeleteProjectQueryToolMutationVariables = Exact<{
  id: string | number;
}>;


export type DeleteProjectQueryToolMutation = { deleteProjectQueryTool: boolean };

export type PreviewProjectQueryToolMutationVariables = Exact<{
  input: PreviewProjectQueryToolInput;
}>;


export type PreviewProjectQueryToolMutation = { previewProjectQueryTool: { columns: Array<string>, rows: unknown, rowCount: number, truncated: boolean, sql: string } };

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

export type SkillSaveStatusQueryVariables = Exact<{ [key: string]: never; }>;


export type SkillSaveStatusQuery = { skillSaveStatus: { mode: string, message: string | null } };

export type SkillDetailQueryVariables = Exact<{
  name: string;
}>;


export type SkillDetailQuery = { skillDetail: { name: string, description: string, body: string, hash: string } };

export type CreateSkillMutationVariables = Exact<{
  input: CreateSkillInput;
}>;


export type CreateSkillMutation = { createSkill: { name: string, location: string, mode: string } };

export type UpdateSkillMutationVariables = Exact<{
  input: UpdateSkillInput;
}>;


export type UpdateSkillMutation = { updateSkill: { name: string, hash: string } };

export type DeleteSkillMutationVariables = Exact<{
  input: DeleteSkillInput;
}>;


export type DeleteSkillMutation = { deleteSkill: boolean };

export type StorageConfigQueryVariables = Exact<{ [key: string]: never; }>;


export type StorageConfigQuery = { storageConfig: unknown };

export type StorageHealthQueryVariables = Exact<{ [key: string]: never; }>;


export type StorageHealthQuery = { storageHealth: unknown };

export type StorageUploadLimitsQueryVariables = Exact<{ [key: string]: never; }>;


export type StorageUploadLimitsQuery = { storageUploadLimits: unknown };

export type StorageUsageQueryVariables = Exact<{ [key: string]: never; }>;


export type StorageUsageQuery = { storageUsage: unknown };

export type ChatForkAskStoryMutationVariables = Exact<{
  input?: unknown;
}>;


export type ChatForkAskStoryMutation = { chatForkAskStory: unknown };

export type ChatForkForkStoryMutationVariables = Exact<{
  input?: unknown;
}>;


export type ChatForkForkStoryMutation = { chatForkForkStory: unknown };

export type ChatForkOpenStandaloneMutationVariables = Exact<{
  input?: unknown;
}>;


export type ChatForkOpenStandaloneMutation = { chatForkOpenStandalone: unknown };

export type CustomStoryViewerDownloadMutationVariables = Exact<{
  input?: unknown;
}>;


export type CustomStoryViewerDownloadMutation = { customStoryViewerDownload: unknown };

export type CustomStoryViewerGetFileQueryVariables = Exact<{
  input?: unknown;
}>;


export type CustomStoryViewerGetFileQuery = { customStoryViewerGetFile: unknown };

export type CustomStoryViewerGetFormatQueryVariables = Exact<{
  input?: unknown;
}>;


export type CustomStoryViewerGetFormatQuery = { customStoryViewerGetFormat: unknown };

export type CustomStoryViewerGetNarrativesQueryVariables = Exact<{
  input?: unknown;
}>;


export type CustomStoryViewerGetNarrativesQuery = { customStoryViewerGetNarratives: unknown };

export type CustomStoryViewerGetQueryDataQueryVariables = Exact<{
  input?: unknown;
}>;


export type CustomStoryViewerGetQueryDataQuery = { customStoryViewerGetQueryData: unknown };

export type CustomStoryViewerGetQuerySqlQueryVariables = Exact<{
  input?: unknown;
}>;


export type CustomStoryViewerGetQuerySqlQuery = { customStoryViewerGetQuerySql: unknown };

export type CustomStoryViewerGetStateQueryVariables = Exact<{
  input?: unknown;
}>;


export type CustomStoryViewerGetStateQuery = { customStoryViewerGetState: unknown };

export type CustomStoryViewerGetThemeQueryVariables = Exact<{
  input?: unknown;
}>;


export type CustomStoryViewerGetThemeQuery = { customStoryViewerGetTheme: unknown };

export type CustomStoryViewerGetVersionQueryVariables = Exact<{
  input?: unknown;
}>;


export type CustomStoryViewerGetVersionQuery = { customStoryViewerGetVersion: unknown };

export type CustomStoryViewerSetStateMutationVariables = Exact<{
  input?: unknown;
}>;


export type CustomStoryViewerSetStateMutation = { customStoryViewerSetState: unknown };

export type EmbedDownloadStoryMutationVariables = Exact<{
  input?: unknown;
}>;


export type EmbedDownloadStoryMutation = { embedDownloadStory: unknown };

export type EmbedGetChartQueryVariables = Exact<{
  input?: unknown;
}>;


export type EmbedGetChartQuery = { embedGetChart: unknown };

export type EmbedGetMapQueryVariables = Exact<{
  input?: unknown;
}>;


export type EmbedGetMapQuery = { embedGetMap: unknown };

export type EmbedGetStoryQueryVariables = Exact<{
  input?: unknown;
}>;


export type EmbedGetStoryQuery = { embedGetStory: unknown };

export type FavoriteListQueryVariables = Exact<{
  input?: unknown;
}>;


export type FavoriteListQuery = { favoriteList: unknown };

export type FavoriteToggleMutationVariables = Exact<{
  input?: unknown;
}>;


export type FavoriteToggleMutation = { favoriteToggle: unknown };

export type FeedbackGetStoryFeedbackQueryVariables = Exact<{
  input?: unknown;
}>;


export type FeedbackGetStoryFeedbackQuery = { feedbackGetStoryFeedback: unknown };

export type FeedbackSubmitStoryFeedbackMutationVariables = Exact<{
  input?: unknown;
}>;


export type FeedbackSubmitStoryFeedbackMutation = { feedbackSubmitStoryFeedback: unknown };

export type SharedChatDownloadStoryQueryVariables = Exact<{
  input?: unknown;
}>;


export type SharedChatDownloadStoryQuery = { sharedChatDownloadStory: unknown };

export type SharedStoryCreateMutationVariables = Exact<{
  input?: unknown;
}>;


export type SharedStoryCreateMutation = { sharedStoryCreate: unknown };

export type SharedStoryDeleteMutationVariables = Exact<{
  input?: unknown;
}>;


export type SharedStoryDeleteMutation = { sharedStoryDelete: unknown };

export type SharedStoryDownloadQueryVariables = Exact<{
  input?: unknown;
}>;


export type SharedStoryDownloadQuery = { sharedStoryDownload: unknown };

export type SharedStoryDownloadCustomMutationVariables = Exact<{
  input?: unknown;
}>;


export type SharedStoryDownloadCustomMutation = { sharedStoryDownloadCustom: unknown };

export type SharedStoryGetQueryVariables = Exact<{
  input?: unknown;
}>;


export type SharedStoryGetQuery = { sharedStoryGet: unknown };

export type SharedStoryGetCustomStoryNarrativesQueryVariables = Exact<{
  input?: unknown;
}>;


export type SharedStoryGetCustomStoryNarrativesQuery = { sharedStoryGetCustomStoryNarratives: unknown };

export type SharedStoryGetCustomStoryQueryDataQueryVariables = Exact<{
  input?: unknown;
}>;


export type SharedStoryGetCustomStoryQueryDataQuery = { sharedStoryGetCustomStoryQueryData: unknown };

export type SharedStoryGetCustomStoryQuerySqlQueryVariables = Exact<{
  input?: unknown;
}>;


export type SharedStoryGetCustomStoryQuerySqlQuery = { sharedStoryGetCustomStoryQuerySql: unknown };

export type SharedStoryGetCustomStoryStateQueryVariables = Exact<{
  input?: unknown;
}>;


export type SharedStoryGetCustomStoryStateQuery = { sharedStoryGetCustomStoryState: unknown };

export type SharedStoryGetCustomVersionQueryVariables = Exact<{
  input?: unknown;
}>;


export type SharedStoryGetCustomVersionQuery = { sharedStoryGetCustomVersion: unknown };

export type SharedStoryGetFilterOptionsQueryVariables = Exact<{
  input?: unknown;
}>;


export type SharedStoryGetFilterOptionsQuery = { sharedStoryGetFilterOptions: unknown };

export type SharedStoryGetFilteredQueryDataQueryVariables = Exact<{
  input?: unknown;
}>;


export type SharedStoryGetFilteredQueryDataQuery = { sharedStoryGetFilteredQueryData: unknown };

export type SharedStoryGetLiveQueryDataQueryVariables = Exact<{
  input?: unknown;
}>;


export type SharedStoryGetLiveQueryDataQuery = { sharedStoryGetLiveQueryData: unknown };

export type SharedStoryGetQuerySqlQueryVariables = Exact<{
  input?: unknown;
}>;


export type SharedStoryGetQuerySqlQuery = { sharedStoryGetQuerySql: unknown };

export type SharedStoryGetSharedStoryInfoQueryVariables = Exact<{
  input?: unknown;
}>;


export type SharedStoryGetSharedStoryInfoQuery = { sharedStoryGetSharedStoryInfo: unknown };

export type SharedStoryGetStoryIdByShareIdQueryVariables = Exact<{
  input?: unknown;
}>;


export type SharedStoryGetStoryIdByShareIdQuery = { sharedStoryGetStoryIdByShareId: unknown };

export type SharedStoryGetVersionQueryDataQueryVariables = Exact<{
  input?: unknown;
}>;


export type SharedStoryGetVersionQueryDataQuery = { sharedStoryGetVersionQueryData: unknown };

export type SharedStoryListQueryVariables = Exact<{
  input?: unknown;
}>;


export type SharedStoryListQuery = { sharedStoryList: unknown };

export type SharedStoryListShareableGroupsQueryVariables = Exact<{
  input?: unknown;
}>;


export type SharedStoryListShareableGroupsQuery = { sharedStoryListShareableGroups: unknown };

export type SharedStoryRefreshDataMutationVariables = Exact<{
  input?: unknown;
}>;


export type SharedStoryRefreshDataMutation = { sharedStoryRefreshData: unknown };

export type SharedStorySetCustomStoryStateMutationVariables = Exact<{
  input?: unknown;
}>;


export type SharedStorySetCustomStoryStateMutation = { sharedStorySetCustomStoryState: unknown };

export type SharedStoryTogglePinMutationVariables = Exact<{
  input?: unknown;
}>;


export type SharedStoryTogglePinMutation = { sharedStoryTogglePin: unknown };

export type SharedStoryUpdateAccessMutationVariables = Exact<{
  input?: unknown;
}>;


export type SharedStoryUpdateAccessMutation = { sharedStoryUpdateAccess: unknown };

export type StoryArchiveMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryArchiveMutation = { storyArchive: unknown };

export type StoryArchiveSharedMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryArchiveSharedMutation = { storyArchiveShared: unknown };

export type StoryArchiveStandaloneMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryArchiveStandaloneMutation = { storyArchiveStandalone: unknown };

export type StoryBulkArchiveMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryBulkArchiveMutation = { storyBulkArchive: unknown };

export type StoryBulkUnarchiveMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryBulkUnarchiveMutation = { storyBulkUnarchive: unknown };

export type StoryCreateVersionMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryCreateVersionMutation = { storyCreateVersion: unknown };

export type StoryDownloadQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryDownloadQuery = { storyDownload: unknown };

export type StoryDownloadCustomMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryDownloadCustomMutation = { storyDownloadCustom: unknown };

export type StoryDownloadStandaloneQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryDownloadStandaloneQuery = { storyDownloadStandalone: unknown };

export type StoryDeletePermanentlyMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryDeletePermanentlyMutation = { storyDeletePermanently: unknown };

export type StoryEditCustomStoryBlockMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryEditCustomStoryBlockMutation = { storyEditCustomStoryBlock: unknown };

export type StoryFolderArchiveMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryFolderArchiveMutation = { storyFolderArchive: unknown };

export type StoryFolderBulkArchiveMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryFolderBulkArchiveMutation = { storyFolderBulkArchive: unknown };

export type StoryFolderBulkMoveMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryFolderBulkMoveMutation = { storyFolderBulkMove: unknown };

export type StoryFolderBulkUnarchiveMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryFolderBulkUnarchiveMutation = { storyFolderBulkUnarchive: unknown };

export type StoryFolderCreateMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryFolderCreateMutation = { storyFolderCreate: unknown };

export type StoryFolderDeleteMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryFolderDeleteMutation = { storyFolderDelete: unknown };

export type StoryFolderListItemsQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryFolderListItemsQuery = { storyFolderListItems: unknown };

export type StoryFolderListTreeQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryFolderListTreeQuery = { storyFolderListTree: unknown };

export type StoryFolderMoveMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryFolderMoveMutation = { storyFolderMove: unknown };

export type StoryFolderMoveStoryMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryFolderMoveStoryMutation = { storyFolderMoveStory: unknown };

export type StoryFolderRenameMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryFolderRenameMutation = { storyFolderRename: unknown };

export type StoryFolderUnarchiveMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryFolderUnarchiveMutation = { storyFolderUnarchive: unknown };

export type StoryGetCertificationQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryGetCertificationQuery = { storyGetCertification: unknown };

export type StoryGetCustomStoryNarrativesQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryGetCustomStoryNarrativesQuery = { storyGetCustomStoryNarratives: unknown };

export type StoryGetCustomStoryQueryDataQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryGetCustomStoryQueryDataQuery = { storyGetCustomStoryQueryData: unknown };

export type StoryGetCustomStoryQuerySqlQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryGetCustomStoryQuerySqlQuery = { storyGetCustomStoryQuerySql: unknown };

export type StoryGetCustomStoryStateQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryGetCustomStoryStateQuery = { storyGetCustomStoryState: unknown };

export type StoryGetCustomVersionQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryGetCustomVersionQuery = { storyGetCustomVersion: unknown };

export type StoryGetCustomVersionFileQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryGetCustomVersionFileQuery = { storyGetCustomVersionFile: unknown };

export type StoryGetDeliveryQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryGetDeliveryQuery = { storyGetDelivery: unknown };

export type StoryGetFilterOptionsQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryGetFilterOptionsQuery = { storyGetFilterOptions: unknown };

export type StoryGetFilteredQueryDataQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryGetFilteredQueryDataQuery = { storyGetFilteredQueryData: unknown };

export type StoryGetIdByChatAndSlugQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryGetIdByChatAndSlugQuery = { storyGetIdByChatAndSlug: unknown };

export type StoryGetLatestQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryGetLatestQuery = { storyGetLatest: unknown };

export type StoryGetLiveQueryDataQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryGetLiveQueryDataQuery = { storyGetLiveQueryData: unknown };

export type StoryGetQuerySqlQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryGetQuerySqlQuery = { storyGetQuerySql: unknown };

export type StoryGetStandaloneQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryGetStandaloneQuery = { storyGetStandalone: unknown };

export type StoryGetVersionQueryDataQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryGetVersionQueryDataQuery = { storyGetVersionQueryData: unknown };

export type StoryListAllQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryListAllQuery = { storyListAll: unknown };

export type StoryListArchivedQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryListArchivedQuery = { storyListArchived: unknown };

export type StoryListDeliveryRecipientGroupsQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryListDeliveryRecipientGroupsQuery = { storyListDeliveryRecipientGroups: unknown };

export type StoryListDeliveryRecipientsQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryListDeliveryRecipientsQuery = { storyListDeliveryRecipients: unknown };

export type StoryListMentioningChatsQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryListMentioningChatsQuery = { storyListMentioningChats: unknown };

export type StoryListMostViewedQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryListMostViewedQuery = { storyListMostViewed: unknown };

export type StoryListQuickQuestionsQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryListQuickQuestionsQuery = { storyListQuickQuestions: unknown };

export type StoryListReferenceableQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryListReferenceableQuery = { storyListReferenceable: unknown };

export type StoryListSharedArchivedQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryListSharedArchivedQuery = { storyListSharedArchived: unknown };

export type StoryListStandaloneQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryListStandaloneQuery = { storyListStandalone: unknown };

export type StoryListStandaloneArchivedQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryListStandaloneArchivedQuery = { storyListStandaloneArchived: unknown };

export type StoryListStoriesQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryListStoriesQuery = { storyListStories: unknown };

export type StoryListVersionsQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryListVersionsQuery = { storyListVersions: unknown };

export type StoryParseCronFromTextMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryParseCronFromTextMutation = { storyParseCronFromText: unknown };

export type StoryRefreshDataMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryRefreshDataMutation = { storyRefreshData: unknown };

export type StoryRenameMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryRenameMutation = { storyRename: unknown };

export type StoryResolveQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryResolveQuery = { storyResolve: unknown };

export type StoryRestoreCustomVersionMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryRestoreCustomVersionMutation = { storyRestoreCustomVersion: unknown };

export type StorySaveCustomStoryFilesMutationVariables = Exact<{
  input?: unknown;
}>;


export type StorySaveCustomStoryFilesMutation = { storySaveCustomStoryFiles: unknown };

export type StorySetCustomStoryStateMutationVariables = Exact<{
  input?: unknown;
}>;


export type StorySetCustomStoryStateMutation = { storySetCustomStoryState: unknown };

export type StoryThemeGenerateMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryThemeGenerateMutation = { storyThemeGenerate: unknown };

export type StoryThemeGetActiveQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryThemeGetActiveQuery = { storyThemeGetActive: unknown };

export type StoryThemeGetStateQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryThemeGetStateQuery = { storyThemeGetState: unknown };

export type StoryThemeListVersionsQueryVariables = Exact<{
  input?: unknown;
}>;


export type StoryThemeListVersionsQuery = { storyThemeListVersions: unknown };

export type StoryThemeRestoreVersionMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryThemeRestoreVersionMutation = { storyThemeRestoreVersion: unknown };

export type StoryThemeSaveMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryThemeSaveMutation = { storyThemeSave: unknown };

export type StoryThemeSetEnabledMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryThemeSetEnabledMutation = { storyThemeSetEnabled: unknown };

export type StoryToggleCertificationMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryToggleCertificationMutation = { storyToggleCertification: unknown };

export type StoryUnarchiveMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryUnarchiveMutation = { storyUnarchive: unknown };

export type StoryUnarchiveSharedMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryUnarchiveSharedMutation = { storyUnarchiveShared: unknown };

export type StoryUnarchiveStandaloneMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryUnarchiveStandaloneMutation = { storyUnarchiveStandalone: unknown };

export type StoryUpdateDeliveryMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryUpdateDeliveryMutation = { storyUpdateDelivery: unknown };

export type StoryUpdateLiveSettingsMutationVariables = Exact<{
  input?: unknown;
}>;


export type StoryUpdateLiveSettingsMutation = { storyUpdateLiveSettings: unknown };

export type PublicConfigQueryVariables = Exact<{ [key: string]: never; }>;


export type PublicConfigQuery = { publicConfig: { quarryMode: string, enableUserLogin: boolean, emailVerificationEnabled: boolean, betaAutomationsEnabled: boolean, betaContextRecommendationsEnabled: boolean, betaStoryFiltersEnabled: boolean, betaSubagentsEnabled: boolean, betaCustomStoriesEnabled: boolean, version: string, authProviders: { google: boolean, github: boolean, gitlab: boolean, smtp: boolean } } };

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

export type UserPreferencesQueryVariables = Exact<{ [key: string]: never; }>;


export type UserPreferencesQuery = { userPreferences: unknown };

export type UpdateUserPreferencesMutationVariables = Exact<{
  input: UpdateUserPreferencesInput;
}>;


export type UpdateUserPreferencesMutation = { updateUserPreferences: unknown };

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
export const ProjectQueryToolFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectQueryToolFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ProjectQueryTool"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"agentToolName"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"sqlTemplate"}},{"kind":"Field","name":{"kind":"Name","value":"parameters"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"required"}},{"kind":"Field","name":{"kind":"Name","value":"default"}}]}},{"kind":"Field","name":{"kind":"Name","value":"databaseId"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"canEdit"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<ProjectQueryToolFieldsFragment, unknown>;
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
export const ChatDownloadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ChatDownload"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chatDownload"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<ChatDownloadQuery, ChatDownloadQueryVariables>;
export const ChatShareMembersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ChatShareMembers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"chatId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chatShareMembers"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"chatId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"chatId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"role"}}]}}]}}]} as unknown as DocumentNode<ChatShareMembersQuery, ChatShareMembersQueryVariables>;
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
export const DatabaseObjectsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DatabaseObjects"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"databaseObjects"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"database"}},{"kind":"Field","name":{"kind":"Name","value":"schema"}},{"kind":"Field","name":{"kind":"Name","value":"table"}},{"kind":"Field","name":{"kind":"Name","value":"fqdn"}}]}}]}}]} as unknown as DocumentNode<DatabaseObjectsQuery, DatabaseObjectsQueryVariables>;
export const DisplaySettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DisplaySettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displaySettings"}}]}}]} as unknown as DocumentNode<DisplaySettingsQuery, DisplaySettingsQueryVariables>;
export const UpdateDisplaySettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateDisplaySettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateDisplaySettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<UpdateDisplaySettingsMutation, UpdateDisplaySettingsMutationVariables>;
export const ProjectQueryToolsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProjectQueryTools"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"projectQueryTools"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectQueryToolFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectQueryToolFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ProjectQueryTool"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"agentToolName"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"sqlTemplate"}},{"kind":"Field","name":{"kind":"Name","value":"parameters"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"required"}},{"kind":"Field","name":{"kind":"Name","value":"default"}}]}},{"kind":"Field","name":{"kind":"Name","value":"databaseId"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"canEdit"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<ProjectQueryToolsQuery, ProjectQueryToolsQueryVariables>;
export const QueryToolTableColumnsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"QueryToolTableColumns"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"type"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"database"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"schema"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"table"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"queryToolTableColumns"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"type"},"value":{"kind":"Variable","name":{"kind":"Name","value":"type"}}},{"kind":"Argument","name":{"kind":"Name","value":"database"},"value":{"kind":"Variable","name":{"kind":"Name","value":"database"}}},{"kind":"Argument","name":{"kind":"Name","value":"schema"},"value":{"kind":"Variable","name":{"kind":"Name","value":"schema"}}},{"kind":"Argument","name":{"kind":"Name","value":"table"},"value":{"kind":"Variable","name":{"kind":"Name","value":"table"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}}]}}]}}]} as unknown as DocumentNode<QueryToolTableColumnsQuery, QueryToolTableColumnsQueryVariables>;
export const CreateProjectQueryToolDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateProjectQueryTool"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateProjectQueryToolInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createProjectQueryTool"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectQueryToolFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectQueryToolFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ProjectQueryTool"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"agentToolName"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"sqlTemplate"}},{"kind":"Field","name":{"kind":"Name","value":"parameters"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"required"}},{"kind":"Field","name":{"kind":"Name","value":"default"}}]}},{"kind":"Field","name":{"kind":"Name","value":"databaseId"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"canEdit"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<CreateProjectQueryToolMutation, CreateProjectQueryToolMutationVariables>;
export const UpdateProjectQueryToolDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateProjectQueryTool"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateProjectQueryToolInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProjectQueryTool"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ProjectQueryToolFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ProjectQueryToolFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ProjectQueryTool"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"agentToolName"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"sqlTemplate"}},{"kind":"Field","name":{"kind":"Name","value":"parameters"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"required"}},{"kind":"Field","name":{"kind":"Name","value":"default"}}]}},{"kind":"Field","name":{"kind":"Name","value":"databaseId"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"createdBy"}},{"kind":"Field","name":{"kind":"Name","value":"canEdit"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<UpdateProjectQueryToolMutation, UpdateProjectQueryToolMutationVariables>;
export const DeleteProjectQueryToolDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteProjectQueryTool"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteProjectQueryTool"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}]}]}}]} as unknown as DocumentNode<DeleteProjectQueryToolMutation, DeleteProjectQueryToolMutationVariables>;
export const PreviewProjectQueryToolDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PreviewProjectQueryTool"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PreviewProjectQueryToolInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"previewProjectQueryTool"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"columns"}},{"kind":"Field","name":{"kind":"Name","value":"rows"}},{"kind":"Field","name":{"kind":"Name","value":"rowCount"}},{"kind":"Field","name":{"kind":"Name","value":"truncated"}},{"kind":"Field","name":{"kind":"Name","value":"sql"}}]}}]}}]} as unknown as DocumentNode<PreviewProjectQueryToolMutation, PreviewProjectQueryToolMutationVariables>;
export const SandboxSecretsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SandboxSecrets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sandboxSecrets"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SandboxSecretFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SandboxSecretFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SandboxSecret"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<SandboxSecretsQuery, SandboxSecretsQueryVariables>;
export const SetSandboxSecretDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetSandboxSecret"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SetSandboxSecretInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setSandboxSecret"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SandboxSecretFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SandboxSecretFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SandboxSecret"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<SetSandboxSecretMutation, SetSandboxSecretMutationVariables>;
export const UpdateSandboxSecretDescriptionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSandboxSecretDescription"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateSandboxSecretDescriptionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSandboxSecretDescription"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SandboxSecretFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SandboxSecretFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"SandboxSecret"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<UpdateSandboxSecretDescriptionMutation, UpdateSandboxSecretDescriptionMutationVariables>;
export const DeleteSandboxSecretDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteSandboxSecret"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"secretId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteSandboxSecret"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"secretId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"secretId"}}}]}]}}]} as unknown as DocumentNode<DeleteSandboxSecretMutation, DeleteSandboxSecretMutationVariables>;
export const SkillsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Skills"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"skills"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SkillFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SkillFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Skill"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"location"}}]}}]} as unknown as DocumentNode<SkillsQuery, SkillsQueryVariables>;
export const SkillCatalogDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SkillCatalog"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"skillCatalog"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"SkillFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"SkillFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Skill"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"location"}}]}}]} as unknown as DocumentNode<SkillCatalogQuery, SkillCatalogQueryVariables>;
export const SkillLoadErrorsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SkillLoadErrors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"skillLoadErrors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<SkillLoadErrorsQuery, SkillLoadErrorsQueryVariables>;
export const SkillSaveStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SkillSaveStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"skillSaveStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<SkillSaveStatusQuery, SkillSaveStatusQueryVariables>;
export const SkillDetailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SkillDetail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"skillDetail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}}]}}]}}]} as unknown as DocumentNode<SkillDetailQuery, SkillDetailQueryVariables>;
export const CreateSkillDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateSkill"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateSkillInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createSkill"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}}]}}]}}]} as unknown as DocumentNode<CreateSkillMutation, CreateSkillMutationVariables>;
export const UpdateSkillDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateSkill"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateSkillInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateSkill"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"hash"}}]}}]}}]} as unknown as DocumentNode<UpdateSkillMutation, UpdateSkillMutationVariables>;
export const DeleteSkillDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeleteSkill"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DeleteSkillInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deleteSkill"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<DeleteSkillMutation, DeleteSkillMutationVariables>;
export const StorageConfigDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StorageConfig"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storageConfig"}}]}}]} as unknown as DocumentNode<StorageConfigQuery, StorageConfigQueryVariables>;
export const StorageHealthDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StorageHealth"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storageHealth"}}]}}]} as unknown as DocumentNode<StorageHealthQuery, StorageHealthQueryVariables>;
export const StorageUploadLimitsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StorageUploadLimits"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storageUploadLimits"}}]}}]} as unknown as DocumentNode<StorageUploadLimitsQuery, StorageUploadLimitsQueryVariables>;
export const StorageUsageDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StorageUsage"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storageUsage"}}]}}]} as unknown as DocumentNode<StorageUsageQuery, StorageUsageQueryVariables>;
export const ChatForkAskStoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ChatForkAskStory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chatForkAskStory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<ChatForkAskStoryMutation, ChatForkAskStoryMutationVariables>;
export const ChatForkForkStoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ChatForkForkStory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chatForkForkStory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<ChatForkForkStoryMutation, ChatForkForkStoryMutationVariables>;
export const ChatForkOpenStandaloneDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ChatForkOpenStandalone"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chatForkOpenStandalone"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<ChatForkOpenStandaloneMutation, ChatForkOpenStandaloneMutationVariables>;
export const CustomStoryViewerDownloadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CustomStoryViewerDownload"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"customStoryViewerDownload"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<CustomStoryViewerDownloadMutation, CustomStoryViewerDownloadMutationVariables>;
export const CustomStoryViewerGetFileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CustomStoryViewerGetFile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"customStoryViewerGetFile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<CustomStoryViewerGetFileQuery, CustomStoryViewerGetFileQueryVariables>;
export const CustomStoryViewerGetFormatDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CustomStoryViewerGetFormat"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"customStoryViewerGetFormat"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<CustomStoryViewerGetFormatQuery, CustomStoryViewerGetFormatQueryVariables>;
export const CustomStoryViewerGetNarrativesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CustomStoryViewerGetNarratives"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"customStoryViewerGetNarratives"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<CustomStoryViewerGetNarrativesQuery, CustomStoryViewerGetNarrativesQueryVariables>;
export const CustomStoryViewerGetQueryDataDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CustomStoryViewerGetQueryData"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"customStoryViewerGetQueryData"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<CustomStoryViewerGetQueryDataQuery, CustomStoryViewerGetQueryDataQueryVariables>;
export const CustomStoryViewerGetQuerySqlDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CustomStoryViewerGetQuerySql"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"customStoryViewerGetQuerySql"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<CustomStoryViewerGetQuerySqlQuery, CustomStoryViewerGetQuerySqlQueryVariables>;
export const CustomStoryViewerGetStateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CustomStoryViewerGetState"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"customStoryViewerGetState"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<CustomStoryViewerGetStateQuery, CustomStoryViewerGetStateQueryVariables>;
export const CustomStoryViewerGetThemeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CustomStoryViewerGetTheme"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"customStoryViewerGetTheme"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<CustomStoryViewerGetThemeQuery, CustomStoryViewerGetThemeQueryVariables>;
export const CustomStoryViewerGetVersionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CustomStoryViewerGetVersion"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"customStoryViewerGetVersion"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<CustomStoryViewerGetVersionQuery, CustomStoryViewerGetVersionQueryVariables>;
export const CustomStoryViewerSetStateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CustomStoryViewerSetState"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"customStoryViewerSetState"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<CustomStoryViewerSetStateMutation, CustomStoryViewerSetStateMutationVariables>;
export const EmbedDownloadStoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"EmbedDownloadStory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"embedDownloadStory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<EmbedDownloadStoryMutation, EmbedDownloadStoryMutationVariables>;
export const EmbedGetChartDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"EmbedGetChart"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"embedGetChart"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<EmbedGetChartQuery, EmbedGetChartQueryVariables>;
export const EmbedGetMapDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"EmbedGetMap"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"embedGetMap"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<EmbedGetMapQuery, EmbedGetMapQueryVariables>;
export const EmbedGetStoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"EmbedGetStory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"embedGetStory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<EmbedGetStoryQuery, EmbedGetStoryQueryVariables>;
export const FavoriteListDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"FavoriteList"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"favoriteList"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<FavoriteListQuery, FavoriteListQueryVariables>;
export const FavoriteToggleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"FavoriteToggle"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"favoriteToggle"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<FavoriteToggleMutation, FavoriteToggleMutationVariables>;
export const FeedbackGetStoryFeedbackDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"FeedbackGetStoryFeedback"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"feedbackGetStoryFeedback"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<FeedbackGetStoryFeedbackQuery, FeedbackGetStoryFeedbackQueryVariables>;
export const FeedbackSubmitStoryFeedbackDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"FeedbackSubmitStoryFeedback"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"feedbackSubmitStoryFeedback"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<FeedbackSubmitStoryFeedbackMutation, FeedbackSubmitStoryFeedbackMutationVariables>;
export const SharedChatDownloadStoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SharedChatDownloadStory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedChatDownloadStory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SharedChatDownloadStoryQuery, SharedChatDownloadStoryQueryVariables>;
export const SharedStoryCreateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SharedStoryCreate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedStoryCreate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SharedStoryCreateMutation, SharedStoryCreateMutationVariables>;
export const SharedStoryDeleteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SharedStoryDelete"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedStoryDelete"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SharedStoryDeleteMutation, SharedStoryDeleteMutationVariables>;
export const SharedStoryDownloadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SharedStoryDownload"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedStoryDownload"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SharedStoryDownloadQuery, SharedStoryDownloadQueryVariables>;
export const SharedStoryDownloadCustomDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SharedStoryDownloadCustom"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedStoryDownloadCustom"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SharedStoryDownloadCustomMutation, SharedStoryDownloadCustomMutationVariables>;
export const SharedStoryGetDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SharedStoryGet"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedStoryGet"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SharedStoryGetQuery, SharedStoryGetQueryVariables>;
export const SharedStoryGetCustomStoryNarrativesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SharedStoryGetCustomStoryNarratives"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedStoryGetCustomStoryNarratives"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SharedStoryGetCustomStoryNarrativesQuery, SharedStoryGetCustomStoryNarrativesQueryVariables>;
export const SharedStoryGetCustomStoryQueryDataDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SharedStoryGetCustomStoryQueryData"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedStoryGetCustomStoryQueryData"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SharedStoryGetCustomStoryQueryDataQuery, SharedStoryGetCustomStoryQueryDataQueryVariables>;
export const SharedStoryGetCustomStoryQuerySqlDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SharedStoryGetCustomStoryQuerySql"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedStoryGetCustomStoryQuerySql"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SharedStoryGetCustomStoryQuerySqlQuery, SharedStoryGetCustomStoryQuerySqlQueryVariables>;
export const SharedStoryGetCustomStoryStateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SharedStoryGetCustomStoryState"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedStoryGetCustomStoryState"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SharedStoryGetCustomStoryStateQuery, SharedStoryGetCustomStoryStateQueryVariables>;
export const SharedStoryGetCustomVersionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SharedStoryGetCustomVersion"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedStoryGetCustomVersion"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SharedStoryGetCustomVersionQuery, SharedStoryGetCustomVersionQueryVariables>;
export const SharedStoryGetFilterOptionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SharedStoryGetFilterOptions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedStoryGetFilterOptions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SharedStoryGetFilterOptionsQuery, SharedStoryGetFilterOptionsQueryVariables>;
export const SharedStoryGetFilteredQueryDataDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SharedStoryGetFilteredQueryData"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedStoryGetFilteredQueryData"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SharedStoryGetFilteredQueryDataQuery, SharedStoryGetFilteredQueryDataQueryVariables>;
export const SharedStoryGetLiveQueryDataDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SharedStoryGetLiveQueryData"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedStoryGetLiveQueryData"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SharedStoryGetLiveQueryDataQuery, SharedStoryGetLiveQueryDataQueryVariables>;
export const SharedStoryGetQuerySqlDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SharedStoryGetQuerySql"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedStoryGetQuerySql"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SharedStoryGetQuerySqlQuery, SharedStoryGetQuerySqlQueryVariables>;
export const SharedStoryGetSharedStoryInfoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SharedStoryGetSharedStoryInfo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedStoryGetSharedStoryInfo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SharedStoryGetSharedStoryInfoQuery, SharedStoryGetSharedStoryInfoQueryVariables>;
export const SharedStoryGetStoryIdByShareIdDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SharedStoryGetStoryIdByShareId"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedStoryGetStoryIdByShareId"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SharedStoryGetStoryIdByShareIdQuery, SharedStoryGetStoryIdByShareIdQueryVariables>;
export const SharedStoryGetVersionQueryDataDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SharedStoryGetVersionQueryData"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedStoryGetVersionQueryData"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SharedStoryGetVersionQueryDataQuery, SharedStoryGetVersionQueryDataQueryVariables>;
export const SharedStoryListDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SharedStoryList"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedStoryList"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SharedStoryListQuery, SharedStoryListQueryVariables>;
export const SharedStoryListShareableGroupsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SharedStoryListShareableGroups"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedStoryListShareableGroups"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SharedStoryListShareableGroupsQuery, SharedStoryListShareableGroupsQueryVariables>;
export const SharedStoryRefreshDataDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SharedStoryRefreshData"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedStoryRefreshData"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SharedStoryRefreshDataMutation, SharedStoryRefreshDataMutationVariables>;
export const SharedStorySetCustomStoryStateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SharedStorySetCustomStoryState"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedStorySetCustomStoryState"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SharedStorySetCustomStoryStateMutation, SharedStorySetCustomStoryStateMutationVariables>;
export const SharedStoryTogglePinDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SharedStoryTogglePin"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedStoryTogglePin"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SharedStoryTogglePinMutation, SharedStoryTogglePinMutationVariables>;
export const SharedStoryUpdateAccessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SharedStoryUpdateAccess"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sharedStoryUpdateAccess"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<SharedStoryUpdateAccessMutation, SharedStoryUpdateAccessMutationVariables>;
export const StoryArchiveDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryArchive"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyArchive"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryArchiveMutation, StoryArchiveMutationVariables>;
export const StoryArchiveSharedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryArchiveShared"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyArchiveShared"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryArchiveSharedMutation, StoryArchiveSharedMutationVariables>;
export const StoryArchiveStandaloneDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryArchiveStandalone"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyArchiveStandalone"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryArchiveStandaloneMutation, StoryArchiveStandaloneMutationVariables>;
export const StoryBulkArchiveDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryBulkArchive"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyBulkArchive"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryBulkArchiveMutation, StoryBulkArchiveMutationVariables>;
export const StoryBulkUnarchiveDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryBulkUnarchive"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyBulkUnarchive"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryBulkUnarchiveMutation, StoryBulkUnarchiveMutationVariables>;
export const StoryCreateVersionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryCreateVersion"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyCreateVersion"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryCreateVersionMutation, StoryCreateVersionMutationVariables>;
export const StoryDownloadDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryDownload"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyDownload"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryDownloadQuery, StoryDownloadQueryVariables>;
export const StoryDownloadCustomDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryDownloadCustom"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyDownloadCustom"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryDownloadCustomMutation, StoryDownloadCustomMutationVariables>;
export const StoryDownloadStandaloneDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryDownloadStandalone"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyDownloadStandalone"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryDownloadStandaloneQuery, StoryDownloadStandaloneQueryVariables>;
export const StoryDeletePermanentlyDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryDeletePermanently"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyDeletePermanently"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryDeletePermanentlyMutation, StoryDeletePermanentlyMutationVariables>;
export const StoryEditCustomStoryBlockDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryEditCustomStoryBlock"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyEditCustomStoryBlock"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryEditCustomStoryBlockMutation, StoryEditCustomStoryBlockMutationVariables>;
export const StoryFolderArchiveDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryFolderArchive"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyFolderArchive"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryFolderArchiveMutation, StoryFolderArchiveMutationVariables>;
export const StoryFolderBulkArchiveDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryFolderBulkArchive"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyFolderBulkArchive"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryFolderBulkArchiveMutation, StoryFolderBulkArchiveMutationVariables>;
export const StoryFolderBulkMoveDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryFolderBulkMove"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyFolderBulkMove"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryFolderBulkMoveMutation, StoryFolderBulkMoveMutationVariables>;
export const StoryFolderBulkUnarchiveDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryFolderBulkUnarchive"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyFolderBulkUnarchive"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryFolderBulkUnarchiveMutation, StoryFolderBulkUnarchiveMutationVariables>;
export const StoryFolderCreateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryFolderCreate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyFolderCreate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryFolderCreateMutation, StoryFolderCreateMutationVariables>;
export const StoryFolderDeleteDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryFolderDelete"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyFolderDelete"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryFolderDeleteMutation, StoryFolderDeleteMutationVariables>;
export const StoryFolderListItemsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryFolderListItems"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyFolderListItems"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryFolderListItemsQuery, StoryFolderListItemsQueryVariables>;
export const StoryFolderListTreeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryFolderListTree"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyFolderListTree"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryFolderListTreeQuery, StoryFolderListTreeQueryVariables>;
export const StoryFolderMoveDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryFolderMove"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyFolderMove"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryFolderMoveMutation, StoryFolderMoveMutationVariables>;
export const StoryFolderMoveStoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryFolderMoveStory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyFolderMoveStory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryFolderMoveStoryMutation, StoryFolderMoveStoryMutationVariables>;
export const StoryFolderRenameDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryFolderRename"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyFolderRename"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryFolderRenameMutation, StoryFolderRenameMutationVariables>;
export const StoryFolderUnarchiveDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryFolderUnarchive"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyFolderUnarchive"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryFolderUnarchiveMutation, StoryFolderUnarchiveMutationVariables>;
export const StoryGetCertificationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryGetCertification"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyGetCertification"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryGetCertificationQuery, StoryGetCertificationQueryVariables>;
export const StoryGetCustomStoryNarrativesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryGetCustomStoryNarratives"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyGetCustomStoryNarratives"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryGetCustomStoryNarrativesQuery, StoryGetCustomStoryNarrativesQueryVariables>;
export const StoryGetCustomStoryQueryDataDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryGetCustomStoryQueryData"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyGetCustomStoryQueryData"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryGetCustomStoryQueryDataQuery, StoryGetCustomStoryQueryDataQueryVariables>;
export const StoryGetCustomStoryQuerySqlDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryGetCustomStoryQuerySql"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyGetCustomStoryQuerySql"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryGetCustomStoryQuerySqlQuery, StoryGetCustomStoryQuerySqlQueryVariables>;
export const StoryGetCustomStoryStateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryGetCustomStoryState"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyGetCustomStoryState"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryGetCustomStoryStateQuery, StoryGetCustomStoryStateQueryVariables>;
export const StoryGetCustomVersionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryGetCustomVersion"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyGetCustomVersion"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryGetCustomVersionQuery, StoryGetCustomVersionQueryVariables>;
export const StoryGetCustomVersionFileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryGetCustomVersionFile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyGetCustomVersionFile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryGetCustomVersionFileQuery, StoryGetCustomVersionFileQueryVariables>;
export const StoryGetDeliveryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryGetDelivery"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyGetDelivery"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryGetDeliveryQuery, StoryGetDeliveryQueryVariables>;
export const StoryGetFilterOptionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryGetFilterOptions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyGetFilterOptions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryGetFilterOptionsQuery, StoryGetFilterOptionsQueryVariables>;
export const StoryGetFilteredQueryDataDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryGetFilteredQueryData"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyGetFilteredQueryData"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryGetFilteredQueryDataQuery, StoryGetFilteredQueryDataQueryVariables>;
export const StoryGetIdByChatAndSlugDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryGetIdByChatAndSlug"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyGetIdByChatAndSlug"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryGetIdByChatAndSlugQuery, StoryGetIdByChatAndSlugQueryVariables>;
export const StoryGetLatestDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryGetLatest"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyGetLatest"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryGetLatestQuery, StoryGetLatestQueryVariables>;
export const StoryGetLiveQueryDataDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryGetLiveQueryData"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyGetLiveQueryData"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryGetLiveQueryDataQuery, StoryGetLiveQueryDataQueryVariables>;
export const StoryGetQuerySqlDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryGetQuerySql"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyGetQuerySql"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryGetQuerySqlQuery, StoryGetQuerySqlQueryVariables>;
export const StoryGetStandaloneDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryGetStandalone"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyGetStandalone"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryGetStandaloneQuery, StoryGetStandaloneQueryVariables>;
export const StoryGetVersionQueryDataDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryGetVersionQueryData"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyGetVersionQueryData"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryGetVersionQueryDataQuery, StoryGetVersionQueryDataQueryVariables>;
export const StoryListAllDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryListAll"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyListAll"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryListAllQuery, StoryListAllQueryVariables>;
export const StoryListArchivedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryListArchived"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyListArchived"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryListArchivedQuery, StoryListArchivedQueryVariables>;
export const StoryListDeliveryRecipientGroupsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryListDeliveryRecipientGroups"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyListDeliveryRecipientGroups"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryListDeliveryRecipientGroupsQuery, StoryListDeliveryRecipientGroupsQueryVariables>;
export const StoryListDeliveryRecipientsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryListDeliveryRecipients"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyListDeliveryRecipients"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryListDeliveryRecipientsQuery, StoryListDeliveryRecipientsQueryVariables>;
export const StoryListMentioningChatsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryListMentioningChats"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyListMentioningChats"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryListMentioningChatsQuery, StoryListMentioningChatsQueryVariables>;
export const StoryListMostViewedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryListMostViewed"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyListMostViewed"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryListMostViewedQuery, StoryListMostViewedQueryVariables>;
export const StoryListQuickQuestionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryListQuickQuestions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyListQuickQuestions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryListQuickQuestionsQuery, StoryListQuickQuestionsQueryVariables>;
export const StoryListReferenceableDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryListReferenceable"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyListReferenceable"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryListReferenceableQuery, StoryListReferenceableQueryVariables>;
export const StoryListSharedArchivedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryListSharedArchived"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyListSharedArchived"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryListSharedArchivedQuery, StoryListSharedArchivedQueryVariables>;
export const StoryListStandaloneDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryListStandalone"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyListStandalone"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryListStandaloneQuery, StoryListStandaloneQueryVariables>;
export const StoryListStandaloneArchivedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryListStandaloneArchived"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyListStandaloneArchived"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryListStandaloneArchivedQuery, StoryListStandaloneArchivedQueryVariables>;
export const StoryListStoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryListStories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyListStories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryListStoriesQuery, StoryListStoriesQueryVariables>;
export const StoryListVersionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryListVersions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyListVersions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryListVersionsQuery, StoryListVersionsQueryVariables>;
export const StoryParseCronFromTextDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryParseCronFromText"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyParseCronFromText"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryParseCronFromTextMutation, StoryParseCronFromTextMutationVariables>;
export const StoryRefreshDataDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryRefreshData"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyRefreshData"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryRefreshDataMutation, StoryRefreshDataMutationVariables>;
export const StoryRenameDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryRename"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyRename"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryRenameMutation, StoryRenameMutationVariables>;
export const StoryResolveDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryResolve"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyResolve"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryResolveQuery, StoryResolveQueryVariables>;
export const StoryRestoreCustomVersionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryRestoreCustomVersion"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyRestoreCustomVersion"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryRestoreCustomVersionMutation, StoryRestoreCustomVersionMutationVariables>;
export const StorySaveCustomStoryFilesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StorySaveCustomStoryFiles"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storySaveCustomStoryFiles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StorySaveCustomStoryFilesMutation, StorySaveCustomStoryFilesMutationVariables>;
export const StorySetCustomStoryStateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StorySetCustomStoryState"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storySetCustomStoryState"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StorySetCustomStoryStateMutation, StorySetCustomStoryStateMutationVariables>;
export const StoryThemeGenerateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryThemeGenerate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyThemeGenerate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryThemeGenerateMutation, StoryThemeGenerateMutationVariables>;
export const StoryThemeGetActiveDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryThemeGetActive"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyThemeGetActive"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryThemeGetActiveQuery, StoryThemeGetActiveQueryVariables>;
export const StoryThemeGetStateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryThemeGetState"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyThemeGetState"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryThemeGetStateQuery, StoryThemeGetStateQueryVariables>;
export const StoryThemeListVersionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StoryThemeListVersions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyThemeListVersions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryThemeListVersionsQuery, StoryThemeListVersionsQueryVariables>;
export const StoryThemeRestoreVersionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryThemeRestoreVersion"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyThemeRestoreVersion"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryThemeRestoreVersionMutation, StoryThemeRestoreVersionMutationVariables>;
export const StoryThemeSaveDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryThemeSave"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyThemeSave"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryThemeSaveMutation, StoryThemeSaveMutationVariables>;
export const StoryThemeSetEnabledDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryThemeSetEnabled"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyThemeSetEnabled"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryThemeSetEnabledMutation, StoryThemeSetEnabledMutationVariables>;
export const StoryToggleCertificationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryToggleCertification"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyToggleCertification"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryToggleCertificationMutation, StoryToggleCertificationMutationVariables>;
export const StoryUnarchiveDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryUnarchive"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyUnarchive"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryUnarchiveMutation, StoryUnarchiveMutationVariables>;
export const StoryUnarchiveSharedDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryUnarchiveShared"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyUnarchiveShared"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryUnarchiveSharedMutation, StoryUnarchiveSharedMutationVariables>;
export const StoryUnarchiveStandaloneDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryUnarchiveStandalone"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyUnarchiveStandalone"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryUnarchiveStandaloneMutation, StoryUnarchiveStandaloneMutationVariables>;
export const StoryUpdateDeliveryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryUpdateDelivery"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyUpdateDelivery"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryUpdateDeliveryMutation, StoryUpdateDeliveryMutationVariables>;
export const StoryUpdateLiveSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"StoryUpdateLiveSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"JSON"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"storyUpdateLiveSettings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<StoryUpdateLiveSettingsMutation, StoryUpdateLiveSettingsMutationVariables>;
export const PublicConfigDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PublicConfig"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"publicConfig"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"quarryMode"}},{"kind":"Field","name":{"kind":"Name","value":"enableUserLogin"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerificationEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"betaAutomationsEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"betaContextRecommendationsEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"betaStoryFiltersEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"betaSubagentsEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"betaCustomStoriesEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"authProviders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"google"}},{"kind":"Field","name":{"kind":"Name","value":"github"}},{"kind":"Field","name":{"kind":"Name","value":"gitlab"}},{"kind":"Field","name":{"kind":"Name","value":"smtp"}}]}}]}}]}}]} as unknown as DocumentNode<PublicConfigQuery, PublicConfigQueryVariables>;
export const AppVersionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AppVersion"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"version"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"version"}},{"kind":"Field","name":{"kind":"Name","value":"commit"}},{"kind":"Field","name":{"kind":"Name","value":"buildDate"}}]}}]}}]} as unknown as DocumentNode<AppVersionQuery, AppVersionQueryVariables>;
export const CheckUpdateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CheckUpdate"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"checkUpdate"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currentVersion"}},{"kind":"Field","name":{"kind":"Name","value":"latestVersion"}},{"kind":"Field","name":{"kind":"Name","value":"updateAvailable"}}]}}]}}]} as unknown as DocumentNode<CheckUpdateQuery, CheckUpdateQueryVariables>;
export const HasUsersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"HasUsers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasUsers"}}]}}]} as unknown as DocumentNode<HasUsersQuery, HasUsersQueryVariables>;
export const MeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"me"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"image"}},{"kind":"Field","name":{"kind":"Name","value":"emailVerified"}},{"kind":"Field","name":{"kind":"Name","value":"requiresPasswordReset"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]} as unknown as DocumentNode<MeQuery, MeQueryVariables>;
export const UpdateProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateProfile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateProfileInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateProfile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<UpdateProfileMutation, UpdateProfileMutationVariables>;
export const ModifyPasswordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ModifyPassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ModifyPasswordInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"modifyPassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<ModifyPasswordMutation, ModifyPasswordMutationVariables>;
export const UserPreferencesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UserPreferences"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userPreferences"}}]}}]} as unknown as DocumentNode<UserPreferencesQuery, UserPreferencesQueryVariables>;
export const UpdateUserPreferencesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateUserPreferences"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateUserPreferencesInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateUserPreferences"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}]}]}}]} as unknown as DocumentNode<UpdateUserPreferencesMutation, UpdateUserPreferencesMutationVariables>;
export const WarehouseConnectionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"WarehouseConnections"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"warehouseConnections"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"supported"}},{"kind":"Field","name":{"kind":"Name","value":"host"}},{"kind":"Field","name":{"kind":"Name","value":"port"}},{"kind":"Field","name":{"kind":"Name","value":"database"}},{"kind":"Field","name":{"kind":"Name","value":"user"}},{"kind":"Field","name":{"kind":"Name","value":"schemaName"}},{"kind":"Field","name":{"kind":"Name","value":"ssl"}},{"kind":"Field","name":{"kind":"Name","value":"allowListedOnly"}},{"kind":"Field","name":{"kind":"Name","value":"hasPassword"}}]}}]}}]} as unknown as DocumentNode<WarehouseConnectionsQuery, WarehouseConnectionsQueryVariables>;
export const ConnectWarehouseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ConnectWarehouse"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"WarehouseConnectionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"connectWarehouse"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"fields"}}]}}]}}]} as unknown as DocumentNode<ConnectWarehouseMutation, ConnectWarehouseMutationVariables>;
export const TestWarehouseConnectionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"TestWarehouseConnection"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"testWarehouseConnection"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]} as unknown as DocumentNode<TestWarehouseConnectionMutation, TestWarehouseConnectionMutationVariables>;
export const DisconnectWarehouseDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DisconnectWarehouse"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"disconnectWarehouse"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}]}]}}]} as unknown as DocumentNode<DisconnectWarehouseMutation, DisconnectWarehouseMutationVariables>;
export const ContextSyncStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ContextSyncStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contextSyncStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContextSyncStatusFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContextSyncStatusFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContextSyncStatus"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"finishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"databases"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"databaseName"}},{"kind":"Field","name":{"kind":"Name","value":"schemasSynced"}},{"kind":"Field","name":{"kind":"Name","value":"tablesSynced"}},{"kind":"Field","name":{"kind":"Name","value":"renderErrors"}},{"kind":"Field","name":{"kind":"Name","value":"removedPaths"}}]}},{"kind":"Field","name":{"kind":"Name","value":"log"}}]}}]} as unknown as DocumentNode<ContextSyncStatusQuery, ContextSyncStatusQueryVariables>;
export const SyncContextDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SyncContext"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"select"}},"type":{"kind":"ListType","type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"syncContext"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"select"},"value":{"kind":"Variable","name":{"kind":"Name","value":"select"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContextSyncStatusFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContextSyncStatusFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ContextSyncStatus"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"startedAt"}},{"kind":"Field","name":{"kind":"Name","value":"finishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"databases"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"databaseName"}},{"kind":"Field","name":{"kind":"Name","value":"schemasSynced"}},{"kind":"Field","name":{"kind":"Name","value":"tablesSynced"}},{"kind":"Field","name":{"kind":"Name","value":"renderErrors"}},{"kind":"Field","name":{"kind":"Name","value":"removedPaths"}}]}},{"kind":"Field","name":{"kind":"Name","value":"log"}}]}}]} as unknown as DocumentNode<SyncContextMutation, SyncContextMutationVariables>;