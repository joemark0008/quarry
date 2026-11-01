/**
 * Inputs and outputs of the apps/api procedures the frontend calls, in the shape upstream's tRPC router had
 * (`inferRouterInputs` / `inferRouterOutputs`), so call sites read `ApiInputs['chat']['get']` as they read the
 * router's types before the cut-over (Phase 8).
 *
 * - The story routers (`story`, `storyFolder`, `storyTheme`, `customStoryViewer`, `storyShare`, `embed`, `favorite`
 *   and the story procedures of `chatFork`, `feedback`, `sharedChat`) are inferred from apps/api's procedure objects.
 * - The other procedures are GraphQL fields whose `JSON` results the `lib/*-api.ts` modules cast; their types were
 *   generated once from upstream's router at the cut-over and point at quarry's own type modules. Keep them in step
 *   with apps/api by hand.
 */
import type { AgentSettings } from '@quarry/api/agent/types/agent-settings';
import type {
	PreviewProjectQueryToolMutation,
	ProjectQueryToolFieldsFragment,
	QueryToolTableColumnsQuery,
} from '@/graphql/generated/graphql';
import type { ForkMetadata, UIChat } from '@quarry/api/agent/types/chat';
import type {
	LinkedContextRepo,
	ProposedEdit,
	RecommendationImpact,
	RecommendationInsight,
} from '@quarry/api/agent/types/context-recommendation';
import type { StorageConfigSummary } from '@quarry/api/attachments/storage/index';
import type { StorageUsage } from '@quarry/api/attachments/storage/usage';
import type { SearchChatResult } from '@quarry/api/chats/chat.repository';
import type { QueryRowsPage } from '@quarry/api/chats/query-rows.service';
import type { SharedChatWithDetails } from '@quarry/api/chats/shared-chat.repository';
import type { RecommendationRepo } from '@quarry/api/context-recommendations/context-recommendation-repo';
import type { FeedbackLink } from '@quarry/api/context-recommendations/context-recommendation.types';
import type { ModelSettingsService } from '@quarry/api/model-settings/model-settings.service';
import type { SandboxSecretSummary } from '@quarry/api/sandbox/sandbox-secret.repository';
import type { Skill, SkillLoadError } from '@quarry/api/skills/skill.service';
import type { DefaultModelSettings } from '@quarry/shared/background-models';
import type { QueryToolParameter } from '@quarry/shared/query-tools';
import type { ChartPluginManifestEntry } from '@quarry/shared/chart-plugin';
import type { ColumnLineageNode } from '@quarry/shared/citation';
import type { DisplaySettings } from '@quarry/shared/date';
import type { CustomBoundarySet } from '@quarry/shared/map';
import type { displayChart, displayMap } from '@quarry/shared/tools';
import type {
	FileContentSearchResult,
	FileEditabilityGuidance,
	FileEditabilityReason,
	FileTreeEntry,
	GroupedChatListResponse,
	LlmProvider,
	LlmSelectedModel,
	UserRole,
} from '@quarry/shared/types';
import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';
import type { chatForkStoryRoutes } from '@quarry/api/stories/procedures/chat-fork-story.procedures';
import type { customStoryViewerRoutes } from '@quarry/api/stories/procedures/custom-story-viewer.procedures';
import type { storyRoutes } from '@quarry/api/stories/procedures/story.procedures';
import type { storyFolderRoutes } from '@quarry/api/stories/procedures/story-folder.procedures';
import type { storyThemeRoutes } from '@quarry/api/stories/procedures/story-theme.procedures';
import type { favoriteRoutes } from '@quarry/api/stories/favorites/favorite.procedures';
import type { feedbackRoutes } from '@quarry/api/stories/feedback/feedback.procedures';
import type { embedRoutes } from '@quarry/api/stories/sharing/embed.procedures';
import type { sharedChatStoryRoutes } from '@quarry/api/stories/sharing/shared-chat-story.procedures';
import type { sharedStoryRoutes } from '@quarry/api/stories/sharing/shared-story.procedures';
import type { chatDownloadRoutes } from '@quarry/api/stories/sharing/chat-download.procedures';

interface Procedure<Input, Output> {
	input: Input;
	output: Output;
}

/** A procedure without `.input()` takes nothing, and an optional input may be left out (tRPC's `void`). */
type ClientInput<T> = unknown extends T ? void : undefined extends T ? T | void : T;

/** `{ procedure: { input, output } }` of an apps/api router built on `stories/procedure.ts`. */
type InferRouter<R> = {
	[P in keyof R]: R[P] extends {
		run: (...args: never[]) => Promise<infer Output>;
		_types?: { clientInput: infer Input };
	}
		? Procedure<ClientInput<Input>, Output>
		: never;
};

type CreatePullRequestResult = { url: string; branch: string };

/** apps/api's GraphQL `ProjectQueryTool`, dates revived and parameters typed. */
export type ProjectQueryTool = Omit<ProjectQueryToolFieldsFragment, 'createdAt' | 'updatedAt' | 'parameters'> & {
	createdAt: Date;
	updatedAt: Date;
	parameters: QueryToolParameter[];
};
export type QueryToolPreview = PreviewProjectQueryToolMutation['previewProjectQueryTool'] & {
	rows: Record<string, unknown>[];
};
export type QueryToolColumn = QueryToolTableColumnsQuery['queryToolTableColumns'][number];

/** What the query tool editor saves (apps/api `CreateProjectQueryToolInput`). */
export type QueryToolDraft = {
	name: string;
	description: string;
	sqlTemplate: string;
	parameters: QueryToolParameter[];
	databaseId?: string | null;
	enabled?: boolean;
};

/** Upstream `types/saved-prompt.ts` (apps/api's GraphQL `SavedPrompt` with dates revived). */
export type SavedPrompt = { id: string; createdAt: Date; updatedAt: Date; prompt: string; title: string };

interface GraphQLProcedures {
	chart: {
		download: Procedure<{ toolCallId: string }, string>;
		updateConfig: Procedure<{ toolCallId: string; config: displayChart.Input }, { success: true }>;
	};
	chartPlugin: {
		list: Procedure<void, ChartPluginManifestEntry[]>;
		source: Procedure<{ type: string; version: string }, { source: string; version: string }>;
	};
	chat: {
		cancel: Procedure<{ chatId: string }, { outcome: 'deleted' | 'kept'; chatDeleted: boolean }>;
		delete: Procedure<{ chatId: string }, void>;
		deleteAllNonStarred: Procedure<void, { count: number }>;
		get: Procedure<{ chatId: string }, UIChat>;
		getContextUsage: Procedure<
			{ chatId: string; model?: { provider: LlmProvider; modelId: string } | undefined },
			{ tokensUsed: number; contextWindow: number | null }
		>;
		getForkMetadata: Procedure<{ chatId: string }, ForkMetadata | null>;
		getQueryRows: Procedure<
			{
				chatId: string;
				toolCallId: string;
				queryId: string;
				offset?: number | undefined;
				limit?: number | undefined;
				sort?: { column: string; direction: 'asc' | 'desc' } | undefined;
			},
			QueryRowsPage
		>;
		listGrouped: Procedure<
			{
				groupBy?: 'date' | 'none' | 'project' | 'star' | 'ownership' | 'sourcePlatform' | undefined;
				filters?: ('all' | 'mine' | 'starred' | 'shared' | 'shared_with_me')[] | undefined;
			},
			GroupedChatListResponse
		>;
		rename: Procedure<{ chatId: string; title: string }, void>;
		search: Procedure<{ query: string; limit?: number | undefined }, SearchChatResult[]>;
		stop: Procedure<{ chatId: string }, void>;
		switchMessageVersion: Procedure<{ chatId: string; messageId: string }, void>;
		toggleStarred: Procedure<{ chatId: string; isStarred: boolean }, void>;
	};
	chatFork: {
		askSharedChat: Procedure<
			{ shareId: string; selection?: { start: number; end: number; text: string } | undefined },
			{ chatId: string }
		>;
		fork: Procedure<
			{
				source: { type: 'chat'; shareId: string } | { type: 'story'; storyId: string };
				selection?: { start: number; end: number; text: string } | undefined;
			},
			{ chatId: string }
		>;
		listSharedChatQuickQuestions: Procedure<
			{ shareId: string },
			{ chatId: string; title: string; updatedAt: Date }[]
		>;
	};
	citation: {
		get: Procedure<
			{ queryId: string; column: string },
			{ sql_query: string; database_id: string; tables: { name: string }[]; column_lineage: ColumnLineageNode }
		>;
	};
	contextExplorer: {
		getFileTree: Procedure<void, { entries: FileTreeEntry[] }>;
		getRulesPreviewGroups: Procedure<
			void,
			{ enforced: true; groups: { id: string; name: string; isDefault: boolean }[] }
		>;
		readFile: Procedure<
			{ path: string },
			{
				content: string;
				hash: string;
				isEditable: boolean;
				reason: FileEditabilityReason | null;
				guidance?: FileEditabilityGuidance | undefined;
			}
		>;
		searchContent: Procedure<{ query: string }, { results: FileContentSearchResult[]; truncated: boolean }>;
		writeFile: Procedure<{ path: string; content: string; expectedHash: string }, { hash: string }>;
	};
	contextRecommendation: {
		cancelRun: Procedure<
			{ runId: string },
			{
				alreadyTerminal: boolean;
				id: string;
				chatId: string | null;
				status: 'running' | 'failed' | 'completed' | 'cancelled';
				projectId: string;
				startedAt: Date;
				completedAt: Date | null;
				errorMessage: string | null;
				trigger: 'schedule' | 'manual';
				llmProvider: LlmProvider | null;
				llmModelId: string | null;
				windowStart: Date | null;
				windowEnd: Date | null;
				inputTotalTokens: number | null;
				outputTotalTokens: number | null;
				totalTokens: number | null;
			}
		>;
		createBatchPullRequest: Procedure<{ ids: string[] }, CreatePullRequestResult>;
		createPullRequest: Procedure<{ id: string }, CreatePullRequestResult>;
		getAgentPrompt: Procedure<{ ids: string[] }, string>;
		getConfig: Procedure<
			void,
			{
				createdAt: Date;
				updatedAt: Date;
				projectId: string;
				repoFullName: string | null;
				frequency: 'monthly' | 'daily' | 'weekly' | null;
				customSystemPromptInstructions: string | null;
				repoProvider: 'github' | 'gitlab' | null;
				autoCreatePrs: boolean | null;
				maxAutoPrsPerRun: number | null;
			} | null
		>;
		getPrStatus: Procedure<
			{ id: string },
			{ state: 'open' | 'closed' | 'merged'; mergedAt: string | null; htmlUrl: string } | null
		>;
		getRepo: Procedure<void, RecommendationRepo | null>;
		latestRun: Procedure<
			void,
			{
				id: string;
				chatId: string | null;
				status: 'running' | 'failed' | 'completed' | 'cancelled';
				projectId: string;
				startedAt: Date;
				completedAt: Date | null;
				errorMessage: string | null;
				trigger: 'schedule' | 'manual';
				llmProvider: LlmProvider | null;
				llmModelId: string | null;
				windowStart: Date | null;
				windowEnd: Date | null;
				inputTotalTokens: number | null;
				outputTotalTokens: number | null;
				totalTokens: number | null;
			} | null
		>;
		latestSuccessfulRun: Procedure<
			void,
			{
				id: string;
				chatId: string | null;
				status: 'running' | 'failed' | 'completed' | 'cancelled';
				projectId: string;
				startedAt: Date;
				completedAt: Date | null;
				errorMessage: string | null;
				trigger: 'schedule' | 'manual';
				llmProvider: LlmProvider | null;
				llmModelId: string | null;
				windowStart: Date | null;
				windowEnd: Date | null;
				inputTotalTokens: number | null;
				outputTotalTokens: number | null;
				totalTokens: number | null;
			} | null
		>;
		list: Procedure<
			void | { status?: 'open' | 'applied' | 'dismissed' | undefined } | undefined,
			{
				feedbacks: FeedbackLink[];
				id: string;
				createdAt: Date;
				title: string;
				status: 'open' | 'applied' | 'dismissed';
				projectId: string;
				category:
					'other' | 'tool_error' | 'hallucination' | 'semantic_missing' | 'context_bloat' | 'skills' | null;
				runId: string;
				fingerprint: string;
				suggestedFile: string;
				subjectKey: string;
				impactScore: number;
				impact: RecommendationImpact | null;
				insights: RecommendationInsight[];
				summary: string;
				suggestedAction: string;
				fixKind: 'manual' | 'patch' | null;
				fixTarget: 'rules' | 'data_model' | 'doc' | 'skill' | 'metric' | null;
				rootCause: string | null;
				rootCauseKind: 'context_missing' | 'context_wrong' | 'context_not_retrieved' | null;
				proposedEdits: ProposedEdit[] | null;
				fixGuidance: string | null;
				fixPrompt: string | null;
				prUrl: string | null;
				prBranch: string | null;
				prCreatedAt: Date | null;
				llmProvider: LlmProvider | null;
				llmModelId: string | null;
				firstSeenAt: Date;
				lastSeenAt: Date;
				occurrenceCount: number;
				statusChangedAt: Date | null;
				statusChangedBy: string | null;
			}[]
		>;
		listAvailableModels: Procedure<
			void,
			{ provider: LlmProvider; modelId: string; name: string; baseUrl: string | null }[]
		>;
		listLinkedRepos: Procedure<void, LinkedContextRepo[]>;
		listRecoTriggerChatMetadata: Procedure<
			{ chatIds: string[] },
			{ chatId: string; title: string; userId: string; userName: string }[]
		>;
		run: Procedure<void, { started: boolean }>;
		setConfig: Procedure<
			{
				modelProvider?: LlmProvider | undefined;
				modelId?: string | undefined;
				frequency?: 'monthly' | 'daily' | 'weekly' | undefined;
				customSystemPromptInstructions?: string | undefined;
				autoCreatePrs?: boolean | undefined;
				maxAutoPrsPerRun?: number | undefined;
			},
			void
		>;
		setStatus: Procedure<{ id: string; status: 'open' | 'applied' | 'dismissed' }, void>;
	};
	feedback: {
		submit: Procedure<
			{ chatId: string; messageId: string; vote: 'up' | 'down'; explanation?: string | undefined },
			{ createdAt: Date; updatedAt: Date; messageId: string; vote: 'up' | 'down'; explanation: string | null }
		>;
	};
	map: {
		updateConfig: Procedure<{ mapId: string; config: displayMap.Input }, { success: true }>;
	};
	memory: {
		delete: Procedure<{ memoryId: string }, void>;
		edit: Procedure<
			{ memoryId: string; content: string },
			{
				id: string;
				createdAt: Date;
				updatedAt: Date;
				userId: string;
				chatId: string | null;
				category: 'global_rule' | 'personal_fact';
				content: string;
				supersededBy: string | null;
			}
		>;
		setEnabled: Procedure<{ memoryEnabled: boolean }, { memoryEnabled: boolean }>;
	};
	onboarding: {
		getWarehouseProvisioningStatus: Procedure<
			{ jobId: string },
			{
				error: string | null;
				id: string;
				provider:
					| 'mysql'
					| 'athena'
					| 'bigquery'
					| 'clickhouse'
					| 'databricks'
					| 'fabric'
					| 'motherduck'
					| 'mssql'
					| 'postgres'
					| 'redshift'
					| 'snowflake'
					| 'starrocks'
					| 'trino';
				status:
					| 'failed'
					| 'cancelled'
					| 'queued'
					| 'initializing'
					| 'debugging'
					| 'syncing'
					| 'registering'
					| 'awaiting_context'
					| 'finalizing'
					| 'publishing'
					| 'ready';
				projectId: string | null;
				projectName: string;
				logs: string | null;
			}
		>;
	};
	project: {
		addMapBoundary: Procedure<
			{
				key: string;
				label: string;
				url: string;
				joinProperty: string;
				regionKeyHint: string;
				featureCount?: number | undefined;
			},
			CustomBoundarySet[]
		>;
		createSavedPrompt: Procedure<
			{ title: string; prompt: string },
			{ id: string; createdAt: Date; updatedAt: Date; prompt: string; title: string; projectId: string }
		>;
		deleteLlmConfig: Procedure<{ provider: LlmProvider }, { success: boolean }>;
		deleteMapBoundary: Procedure<{ key: string }, CustomBoundarySet[]>;
		deleteSavedPrompt: Procedure<{ promptId: string }, void>;
		getAgentSettings: Procedure<
			void,
			{
				capabilities: { pythonSandbox: boolean; sandbox: boolean; semanticLayer: boolean };
				memoryEnabled?: boolean | undefined;
				mapEnabled?: boolean | undefined;
				experimental?: { pythonSandboxing?: boolean | undefined; sandboxes?: boolean | undefined } | undefined;
				transcribe?:
					| { enabled?: boolean | undefined; provider?: string | undefined; modelId?: string | undefined }
					| undefined;
				sql?:
					| {
							dangerouslyWritePermEnabled?: boolean | undefined;
							enforceExcludedColumns?: boolean | undefined;
					  }
					| undefined;
				pythonExecution?: { maxDurationSecs?: number | undefined } | undefined;
				webSearch?: { enabled?: boolean | undefined; mode?: 'provider' | undefined } | undefined;
				semanticLayer?: { mode?: 'disabled' | 'exclusive' | 'prioritized' | undefined } | undefined;
				subagent?: { model?: LlmSelectedModel | null | undefined } | undefined;
			} | null
		>;
		getDatabaseObjects: Procedure<
			void,
			{ type: string; database: string; schema: string; table: string; fqdn: string }[]
		>;
		getDefaultChatModel: Procedure<void, LlmSelectedModel | null>;
		getDefaultModels: Procedure<void, Awaited<ReturnType<ModelSettingsService['getDefaultModels']>>>;
		getDisplaySettings: Procedure<void, DisplaySettings>;
		getKnownModels: Procedure<void, ReturnType<ModelSettingsService['getKnownModels']>>;
		getKnownTranscribeModels: Procedure<
			void,
			{
				[x: string]: {
					models: {
						id: string;
						name: string;
						default?: boolean | undefined;
						pricePerMinute?: number | undefined;
					}[];
					hasKey: boolean;
				};
			}
		>;
		getLlmConfigs: Procedure<
			void,
			{
				projectConfigs: {
					id: string;
					provider: LlmProvider;
					apiKeyPreview: string | null;
					credentialPreviews: Record<string, string> | null;
					enabledModels: string[] | null;
					customModels: {
						id: string;
						displayName?: string | undefined;
						costPerM?:
							| {
									inputNoCache?: number | undefined;
									inputCacheRead?: number | undefined;
									inputCacheWrite?: number | undefined;
									output?: number | undefined;
							  }
							| undefined;
					}[];
					modelSettings: Record<
						string,
						{
							temperature?: number | undefined;
							topP?: number | undefined;
							topK?: number | undefined;
							maxOutputTokens?: number | undefined;
							reasoningEffort?: 'max' | 'off' | 'minimal' | 'low' | 'medium' | 'high' | undefined;
							thinkingBudgetTokens?: number | undefined;
							thinkingDisplay?: 'omitted' | 'updates' | 'summarized' | undefined;
							textVerbosity?: 'low' | 'medium' | 'high' | undefined;
							reasoningSummary?: 'auto' | 'detailed' | undefined;
							parallelToolCalls?: boolean | undefined;
							maxToolCalls?: number | undefined;
							serviceTier?:
								'default' | 'auto' | 'standard' | 'flex' | 'priority' | 'reserved' | undefined;
							speed?: 'standard' | 'fast' | undefined;
							inferenceGeo?: 'us' | 'global' | undefined;
							sendReasoning?: boolean | undefined;
							includeThoughts?: boolean | undefined;
							safetyThreshold?:
								| 'HARM_BLOCK_THRESHOLD_UNSPECIFIED'
								| 'BLOCK_LOW_AND_ABOVE'
								| 'BLOCK_MEDIUM_AND_ABOVE'
								| 'BLOCK_ONLY_HIGH'
								| 'BLOCK_NONE'
								| 'OFF'
								| undefined;
							mediaResolution?:
								| 'MEDIA_RESOLUTION_UNSPECIFIED'
								| 'MEDIA_RESOLUTION_LOW'
								| 'MEDIA_RESOLUTION_MEDIUM'
								| 'MEDIA_RESOLUTION_HIGH'
								| undefined;
							safePrompt?: boolean | undefined;
							documentImageLimit?: number | undefined;
							documentPageLimit?: number | undefined;
						}
					>;
					baseUrl: string | null;
					createdAt: Date;
					updatedAt: Date;
				}[];
				configProviders: {
					provider: LlmProvider;
					apiKeyPreview: string | null;
					credentialPreviews: Record<string, string> | null;
					enabledModels: string[];
					customModels: {
						id: string;
						displayName?: string | undefined;
						costPerM?:
							| {
									inputNoCache?: number | undefined;
									inputCacheRead?: number | undefined;
									inputCacheWrite?: number | undefined;
									output?: number | undefined;
							  }
							| undefined;
					}[];
					modelSettings: Record<
						string,
						{
							temperature?: number | undefined;
							topP?: number | undefined;
							topK?: number | undefined;
							maxOutputTokens?: number | undefined;
							reasoningEffort?: 'max' | 'off' | 'minimal' | 'low' | 'medium' | 'high' | undefined;
							thinkingBudgetTokens?: number | undefined;
							thinkingDisplay?: 'omitted' | 'updates' | 'summarized' | undefined;
							textVerbosity?: 'low' | 'medium' | 'high' | undefined;
							reasoningSummary?: 'auto' | 'detailed' | undefined;
							parallelToolCalls?: boolean | undefined;
							maxToolCalls?: number | undefined;
							serviceTier?:
								'default' | 'auto' | 'standard' | 'flex' | 'priority' | 'reserved' | undefined;
							speed?: 'standard' | 'fast' | undefined;
							inferenceGeo?: 'us' | 'global' | undefined;
							sendReasoning?: boolean | undefined;
							includeThoughts?: boolean | undefined;
							safetyThreshold?:
								| 'HARM_BLOCK_THRESHOLD_UNSPECIFIED'
								| 'BLOCK_LOW_AND_ABOVE'
								| 'BLOCK_MEDIUM_AND_ABOVE'
								| 'BLOCK_ONLY_HIGH'
								| 'BLOCK_NONE'
								| 'OFF'
								| undefined;
							mediaResolution?:
								| 'MEDIA_RESOLUTION_UNSPECIFIED'
								| 'MEDIA_RESOLUTION_LOW'
								| 'MEDIA_RESOLUTION_MEDIUM'
								| 'MEDIA_RESOLUTION_HIGH'
								| undefined;
							safePrompt?: boolean | undefined;
							documentImageLimit?: number | undefined;
							documentPageLimit?: number | undefined;
						}
					>;
					baseUrl: string | null;
				}[];
				envProviders: LlmProvider[];
				envBaseUrls: Record<string, string>;
			}
		>;
		getMapBoundaries: Procedure<void, CustomBoundarySet[]>;
		getMemorySettings: Procedure<void, { memoryEnabled: boolean }>;
		getProjectSavedPrompts: Procedure<{ projectId: string }, SavedPrompt[]>;
		getSavedPrompts: Procedure<void, SavedPrompt[]>;
		listAvailableTranscribeModels: Procedure<
			void,
			{ provider: LlmProvider; modelId: string; name: string; baseUrl: string | null }[]
		>;
		updateAgentSettings: Procedure<
			{
				experimental?: { pythonSandboxing?: boolean | undefined; sandboxes?: boolean | undefined } | undefined;
				mapEnabled?: boolean | undefined;
				transcribe?:
					| { enabled?: boolean | undefined; provider?: string | undefined; modelId?: string | undefined }
					| undefined;
				sql?:
					| {
							dangerouslyWritePermEnabled?: boolean | undefined;
							enforceExcludedColumns?: boolean | undefined;
					  }
					| undefined;
				pythonExecution?: { maxDurationSecs?: number | undefined } | undefined;
				memoryEnabled?: boolean | undefined;
				webSearch?: { enabled?: boolean | undefined; mode?: 'provider' | undefined } | undefined;
				semanticLayer?: { mode?: 'disabled' | 'exclusive' | 'prioritized' | undefined } | undefined;
				subagent?: { model?: { provider: LlmProvider; modelId: string } | null | undefined } | undefined;
			},
			AgentSettings
		>;
		updateDefaultModels: Procedure<
			{
				mode: 'single' | 'perCategory';
				chat?: { provider: LlmProvider; modelId: string } | undefined;
				single?: { provider: LlmProvider; modelId: string } | undefined;
				categories?:
					| {
							title?: { provider: LlmProvider; modelId: string } | undefined;
							other?: { provider: LlmProvider; modelId: string } | undefined;
							context_recommendation?: { provider: LlmProvider; modelId: string } | undefined;
							compaction?: { provider: LlmProvider; modelId: string } | undefined;
							live_story?: { provider: LlmProvider; modelId: string } | undefined;
					  }
					| undefined;
			},
			DefaultModelSettings
		>;
		updateDisplaySettings: Procedure<
			{
				dateFormat?:
					| { preset: 'custom' | 'european' | 'american' | 'iso'; customFormat?: string | undefined }
					| undefined;
			},
			DisplaySettings
		>;
		updateMapBoundary: Procedure<
			{
				key: string;
				newKey?: string | undefined;
				label?: string | undefined;
				url?: string | undefined;
				joinProperty?: string | undefined;
				regionKeyHint?: string | undefined;
				featureCount?: number | undefined;
			},
			CustomBoundarySet[]
		>;
		updateSavedPrompt: Procedure<
			{ id: string; title?: string | undefined; prompt?: string | undefined },
			{ id: string; createdAt: Date; updatedAt: Date; prompt: string; title: string; projectId: string }
		>;
		upsertLlmConfig: Procedure<
			{
				provider: LlmProvider;
				apiKey?: string | undefined;
				credentials?: Record<string, string> | undefined;
				enabledModels?: string[] | undefined;
				customModels?:
					| {
							id: string;
							displayName?: string | undefined;
							costPerM?:
								| {
										inputNoCache?: number | undefined;
										inputCacheRead?: number | undefined;
										inputCacheWrite?: number | undefined;
										output?: number | undefined;
								  }
								| undefined;
					  }[]
					| undefined;
				modelSettings?:
					| Record<
							string,
							{
								temperature?: number | undefined;
								topP?: number | undefined;
								topK?: number | undefined;
								maxOutputTokens?: number | undefined;
								reasoningEffort?: 'max' | 'off' | 'minimal' | 'low' | 'medium' | 'high' | undefined;
								thinkingBudgetTokens?: number | undefined;
								thinkingDisplay?: 'omitted' | 'updates' | 'summarized' | undefined;
								textVerbosity?: 'low' | 'medium' | 'high' | undefined;
								reasoningSummary?: 'auto' | 'detailed' | undefined;
								parallelToolCalls?: boolean | undefined;
								maxToolCalls?: number | undefined;
								serviceTier?:
									'default' | 'auto' | 'standard' | 'flex' | 'priority' | 'reserved' | undefined;
								speed?: 'standard' | 'fast' | undefined;
								inferenceGeo?: 'us' | 'global' | undefined;
								sendReasoning?: boolean | undefined;
								includeThoughts?: boolean | undefined;
								safetyThreshold?:
									| 'HARM_BLOCK_THRESHOLD_UNSPECIFIED'
									| 'BLOCK_LOW_AND_ABOVE'
									| 'BLOCK_MEDIUM_AND_ABOVE'
									| 'BLOCK_ONLY_HIGH'
									| 'BLOCK_NONE'
									| 'OFF'
									| undefined;
								mediaResolution?:
									| 'MEDIA_RESOLUTION_UNSPECIFIED'
									| 'MEDIA_RESOLUTION_LOW'
									| 'MEDIA_RESOLUTION_MEDIUM'
									| 'MEDIA_RESOLUTION_HIGH'
									| undefined;
								safePrompt?: boolean | undefined;
								documentImageLimit?: number | undefined;
								documentPageLimit?: number | undefined;
							}
					  >
					| undefined;
				baseUrl?: string | undefined;
			},
			{
				id: string;
				provider: LlmProvider;
				enabledModels: string[] | null;
				customModels: {
					id: string;
					displayName?: string | undefined;
					costPerM?:
						| {
								inputNoCache?: number | undefined;
								inputCacheRead?: number | undefined;
								inputCacheWrite?: number | undefined;
								output?: number | undefined;
						  }
						| undefined;
				}[];
				modelSettings: Record<
					string,
					{
						temperature?: number | undefined;
						topP?: number | undefined;
						topK?: number | undefined;
						maxOutputTokens?: number | undefined;
						reasoningEffort?: 'max' | 'off' | 'minimal' | 'low' | 'medium' | 'high' | undefined;
						thinkingBudgetTokens?: number | undefined;
						thinkingDisplay?: 'omitted' | 'updates' | 'summarized' | undefined;
						textVerbosity?: 'low' | 'medium' | 'high' | undefined;
						reasoningSummary?: 'auto' | 'detailed' | undefined;
						parallelToolCalls?: boolean | undefined;
						maxToolCalls?: number | undefined;
						serviceTier?: 'default' | 'auto' | 'standard' | 'flex' | 'priority' | 'reserved' | undefined;
						speed?: 'standard' | 'fast' | undefined;
						inferenceGeo?: 'us' | 'global' | undefined;
						sendReasoning?: boolean | undefined;
						includeThoughts?: boolean | undefined;
						safetyThreshold?:
							| 'HARM_BLOCK_THRESHOLD_UNSPECIFIED'
							| 'BLOCK_LOW_AND_ABOVE'
							| 'BLOCK_MEDIUM_AND_ABOVE'
							| 'BLOCK_ONLY_HIGH'
							| 'BLOCK_NONE'
							| 'OFF'
							| undefined;
						mediaResolution?:
							| 'MEDIA_RESOLUTION_UNSPECIFIED'
							| 'MEDIA_RESOLUTION_LOW'
							| 'MEDIA_RESOLUTION_MEDIUM'
							| 'MEDIA_RESOLUTION_HIGH'
							| undefined;
						safePrompt?: boolean | undefined;
						documentImageLimit?: number | undefined;
						documentPageLimit?: number | undefined;
					}
				>;
				baseUrl: string | null;
				apiKeyPreview: string | null;
				credentialPreviews: Record<string, string> | null;
			}
		>;
		validateMapBoundaryUrl: Procedure<
			{ url: string },
			{ propertyKeys: string[]; featureCount: number; geojson: FeatureCollection<Geometry, GeoJsonProperties> }
		>;
	};
	/** quarry: saved query tools (no upstream router). */
	queryTool: {
		list: Procedure<void, ProjectQueryTool[]>;
		tableColumns: Procedure<{ type: string; database: string; schema: string; table: string }, QueryToolColumn[]>;
		create: Procedure<QueryToolDraft, ProjectQueryTool>;
		update: Procedure<Partial<QueryToolDraft> & { id: string }, ProjectQueryTool>;
		delete: Procedure<{ id: string }, void>;
		preview: Procedure<
			{
				sqlTemplate: string;
				parameters: QueryToolParameter[];
				values?: Record<string, unknown>;
				databaseId?: string | null;
			},
			QueryToolPreview
		>;
	};
	sandboxSecret: {
		delete: Procedure<{ secretId: string }, void>;
		list: Procedure<void, SandboxSecretSummary[]>;
		set: Procedure<
			{ name: string; value: string; description?: string | null | undefined },
			{ id: string; createdAt: Date; updatedAt: Date; name: string; description: string | null }
		>;
		updateDescription: Procedure<
			{ secretId: string; description?: string | null | undefined },
			{ id: string; createdAt: Date; updatedAt: Date; name: string; description: string | null }
		>;
	};
	sharedChat: {
		create: Procedure<
			{
				chatId: string;
				visibility?: 'project' | 'specific' | undefined;
				allowedUserIds?: string[] | undefined;
				notify?: boolean | undefined;
			},
			{ id: string; createdAt: Date; chatId: string; visibility: 'project' | 'specific' }
		>;
		delete: Procedure<{ shareId: string }, void>;
		getShareOptionsByChatId: Procedure<
			{ chatId: string },
			| { shareId: null; visibility: null; allowedUserIds: never[] }
			| { shareId: string; visibility: string; allowedUserIds: string[] }
		>;
		getSharedChat: Procedure<
			{ shareId: string },
			{ share: SharedChatWithDetails; chat: UIChat; userRole: UserRole | null }
		>;
		list: Procedure<void, SharedChatWithDetails[]>;
		updateAccess: Procedure<{ shareId: string; allowedUserIds: string[] }, void>;
	};
	skill: {
		catalog: Procedure<void, Skill[]>;
		list: Procedure<void, Skill[]>;
		listLoadErrors: Procedure<void, SkillLoadError[]>;
		saveStatus: Procedure<void, { mode: string; message?: string | null }>;
		detail: Procedure<{ name: string }, { name: string; description: string; body: string; hash: string }>;
		create: Procedure<{ name: string; description: string; body: string }, { name: string; location: string }>;
		update: Procedure<
			{ name: string; description: string; body: string; expectedHash: string },
			{ name: string; hash: string }
		>;
		delete: Procedure<{ name: string; expectedHash: string }, void>;
	};
	sql: {
		previewQuery: Procedure<
			{
				queryId: string;
				sql_query: string;
				database_id?: string | null | undefined;
				name?: string | null | undefined;
			},
			{
				id: `query_${string}`;
				data: any[];
				columns: string[];
				row_count: number;
				dialect?: string | undefined;
				_version?: '1' | undefined;
				applied_limit?: number | undefined;
				template_warnings?: string[] | undefined;
				superseded?: boolean | undefined;
				revision?: number | undefined;
				is_preview?: boolean | undefined;
			}
		>;
		updateQuery: Procedure<
			{
				queryId: string;
				sql_query: string;
				database_id?: string | null | undefined;
				name?: string | null | undefined;
			},
			{
				input: {
					sql_query: string;
					name?: string | undefined;
					query_id?: `query_${string}` | undefined;
					database_id?: string | undefined;
				};
				output: {
					id: `query_${string}`;
					data: any[];
					columns: string[];
					row_count: number;
					dialect?: string | undefined;
					_version?: '1' | undefined;
					applied_limit?: number | undefined;
					template_warnings?: string[] | undefined;
					superseded?: boolean | undefined;
					revision?: number | undefined;
					is_preview?: boolean | undefined;
				};
				toolCallId: string;
				chatId: string;
			}
		>;
	};
	storage: {
		getConfig: Procedure<void, StorageConfigSummary>;
		getHealth: Procedure<void, { checkedAt: Date; ok: boolean; error?: string | undefined }>;
		getUploadLimits: Procedure<void, { enabled: boolean; maxFileSizeMb: number }>;
		getUsage: Procedure<
			void,
			{
				own: StorageUsage;
				byUser: { name: string; userId: string; fileCount: number; totalBytes: number }[] | null;
			}
		>;
	};
	user: {
		getMemories: Procedure<
			void,
			{
				id: string;
				createdAt: Date;
				updatedAt: Date;
				userId: string;
				chatId: string | null;
				category: 'global_rule' | 'personal_fact';
				content: string;
				supersededBy: string | null;
			}[]
		>;
		getMemorySettings: Procedure<void, { memoryEnabled: boolean }>;
	};
}

type StoryProcedures = {
	story: InferRouter<typeof storyRoutes>;
	storyFolder: InferRouter<typeof storyFolderRoutes>;
	storyTheme: InferRouter<typeof storyThemeRoutes>;
	customStoryViewer: InferRouter<typeof customStoryViewerRoutes>;
	storyShare: InferRouter<typeof sharedStoryRoutes>;
	embed: InferRouter<typeof embedRoutes>;
	favorite: InferRouter<typeof favoriteRoutes>;
};

/** The GraphQL types win where both sides name a procedure (`chatFork.fork` takes a chat or a story source). */
type Merge<G, S> = G & Omit<S, keyof G>;

/** Routers whose procedures are split between the GraphQL modules and the story procedures. */
type MixedProcedures = {
	chat: GraphQLProcedures['chat'] & InferRouter<typeof chatDownloadRoutes>;
	chatFork: Merge<GraphQLProcedures['chatFork'], InferRouter<typeof chatForkStoryRoutes>>;
	feedback: Merge<GraphQLProcedures['feedback'], InferRouter<typeof feedbackRoutes>>;
	sharedChat: Merge<GraphQLProcedures['sharedChat'], InferRouter<typeof sharedChatStoryRoutes>>;
};

type ApiProcedures = Omit<GraphQLProcedures, keyof MixedProcedures> & StoryProcedures & MixedProcedures;

export type ApiInputs = {
	[R in keyof ApiProcedures]: {
		[P in keyof ApiProcedures[R]]: ApiProcedures[R][P] extends Procedure<infer I, unknown> ? I : never;
	};
};
export type ApiOutputs = {
	[R in keyof ApiProcedures]: {
		[P in keyof ApiProcedures[R]]: ApiProcedures[R][P] extends Procedure<unknown, infer O> ? O : never;
	};
};
