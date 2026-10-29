import { Injectable, Logger } from '@nestjs/common';
import { documentMediaType, type ImageUploadData } from '@quarry/shared/attachments';
import { markSupersededExecuteSqlParts } from '@quarry/shared/execute-sql-parts';
import type { LlmProvider, LlmSelectedModel } from '@quarry/shared/types';
import { convertToModelMessages, type InferUIMessageChunk, type Tool } from 'ai';

import { ImageRepository } from '../attachments/image.repository.js';
import { isStorageEnabled, type StorageScope } from '../attachments/storage/index.js';
import { canGrepUserFiles, statUserFile } from '../attachments/storage/user-files.js';
import { ChatRepository } from '../chats/chat.repository.js';
import { HandlerError } from '../common/errors/handler-error.js';
import { ConfigService } from '../config/config.service.js';
import type { Project } from '../generated/prisma/client.js';
import { ProjectRepository } from '../projects/project.repository.js';
import { SandboxSecretService } from '../sandbox/sandbox-secret.service.js';
import { WarehouseCredentialsService } from '../warehouse/warehouse-credentials.service.js';
import { WarehouseSqlService } from '../warehouse/warehouse-sql.service.js';
import { type AgentChat, AgentManager, type AgentProfile } from './agent-manager.js';
import { AppDbRepository } from './app-db/app-db.repository.js';
import { LlmService } from './llm/llm.service.js';
import { ProjectLlmConfigRepository } from './llm/project-llm-config.repository.js';
import { renderSystemPrompt } from './prompts/render-system-prompt.js';
import { getContextWindow } from './providers/providers.js';
import { listChartPlugins } from './services/chart-plugin.js';
import { CompactionService } from './services/compaction.js';
import { tokenCounter } from './services/token-counter.js';
import { fullProjectContextAccess } from './services/user-group-context-access.service.js';
import { getSystemPromptOverride, hasNaoPromptPlaceholder, injectNaoPrompt } from './system-prompts.js';
import { createWebSearchTools, getTools } from './tools/index.js';
import type { AgentSettings } from './types/agent-settings.js';
import type {
	AgentRequest,
	AgentRequestUserMessage,
	AgentTools,
	ContextUsage,
	UIMessage,
	UIMessagePart,
} from './types/chat.js';
import type { ToolContext } from './types/tools.js';
import { getConnections, getUserRules } from './user-rules.js';
import { createChatTitle } from './utils/ai.js';
import { buildImageUrl } from './utils/image.js';
import { extractConfiguredDatabases, readProjectContext } from './utils/nao-config.js';
import { isStoragePath, toStorageRelativePath, toStorageVirtualPath } from './utils/tools.js';

/** The web chat's analytics agent (upstream `agents/profiles/analytics.ts`). */
export const analyticsAgent: AgentProfile = { source: 'web' };

export interface AgentRequestResult {
	chatId: string;
	isNewChat: boolean;
	modelId: string;
	stream: ReadableStream<InferUIMessageChunk<UIMessage>>;
	agent: AgentManager;
}

/**
 * Port of upstream `services/agent.ts` (`AgentService`, `buildToolContext`), `services/agent-run.ts` and
 * `handlers/agent.ts`: authorizes a run, persists the user message, builds the tool context and starts the agent.
 * One running agent per chat; a new message on a chat stops the previous run.
 */
@Injectable()
export class AgentService {
	private readonly logger = new Logger(AgentService.name);
	private readonly agents = new Map<string, AgentManager>();

	constructor(
		private readonly chats: ChatRepository,
		private readonly projects: ProjectRepository,
		private readonly llm: LlmService,
		private readonly llmConfigs: ProjectLlmConfigRepository,
		private readonly warehouseSql: WarehouseSqlService,
		private readonly warehouseCredentials: WarehouseCredentialsService,
		private readonly compaction: CompactionService,
		private readonly appDb: AppDbRepository,
		private readonly config: ConfigService,
		private readonly sandboxSecrets: SandboxSecretService,
		private readonly images: ImageRepository,
	) {}

	/** `POST /api/agent`: `authorizeAgentRun` + `handleAgentRoute`. */
	async handleAgentRequest(
		userId: string,
		currentProject: Project | null,
		body: AgentRequest,
	): Promise<AgentRequestResult> {
		const projectId = await this.resolveProjectId(currentProject, body);
		if (body.mode !== 'default') {
			throw new HandlerError('FORBIDDEN', `Invalid ${body.mode} conversation`);
		}
		const userRole = await this.projects.getUserRoleInProject(projectId, userId);
		if (!userRole || userRole === 'viewer') {
			throw new HandlerError('FORBIDDEN', 'Viewers cannot send messages');
		}
		const model = await this.resolveModelSelection(projectId, body.model);

		const { chat, chatId, isNewChat, newMessageId } = await this.persistUserMessage(userId, projectId, body);
		const agent = await this.create(
			{ id: chatId, projectId, userId, forkMetadata: chat.forkMetadata },
			model,
			analyticsAgent,
		);
		const stream = agent.stream(chat.messages, {
			mentions: body.mentions,
			timezone: body.timezone,
			events: {
				newChat: isNewChat
					? {
							id: chatId,
							projectId,
							title: chat.title,
							isStarred: chat.isStarred,
							createdAt: chat.createdAt,
							updatedAt: chat.updatedAt,
						}
					: undefined,
				newUserMessage: { newId: newMessageId },
			},
		});
		return { chatId, isNewChat, modelId: agent.getModelId(), stream, agent };
	}

	/** Creates the agent of a chat, stopping the chat's previous run. */
	async create(chat: AgentChat, modelSelection: LlmSelectedModel, profile: AgentProfile): Promise<AgentManager> {
		this.disposeAgent(chat.id);
		const modelConfig = await this.llm.resolveProviderModel(
			chat.projectId,
			modelSelection.provider,
			modelSelection.modelId,
		);
		if (!modelConfig) {
			throw new HandlerError('BAD_REQUEST', 'The selected model could not be resolved.');
		}
		const [agentSettings, customBoundaries] = await Promise.all([
			this.llmConfigs.getAgentSettings(chat.projectId) as Promise<AgentSettings | null>,
			this.projects.getCustomBoundaries(chat.projectId),
		]);
		const toolContext = await this.buildToolContext({
			projectId: chat.projectId,
			chatId: chat.id,
			userId: chat.userId,
			agentSettings,
			modelSelection,
		});
		const webTools = await this.resolveWebTools(chat.projectId, modelSelection.provider, agentSettings);
		// The analytics profile's tool set (upstream `analyticsToolsExcluding([])`).
		const tools = getTools(agentSettings, webTools ?? {}, {
			customBoundaries,
			semanticLayerMode: toolContext.semanticLayerMode,
			subagentsEnabled: this.config.env.BETA_SUBAGENTS_ENABLED,
		}) as AgentTools;
		const agent = new AgentManager(
			chat,
			profile,
			modelConfig,
			modelSelection,
			() => this.agents.delete(chat.id),
			new AbortController(),
			tools,
			toolContext,
			{
				chats: this.chats,
				llm: this.llm,
				compaction: this.compaction,
				getImageById: (id) => this.images.getImageById(id),
				buildSystemPrompt: ({ toolNames, timezone }) =>
					this.buildProjectSystemPrompt(toolContext, toolNames, timezone),
			},
		);
		this.agents.set(chat.id, agent);
		return agent;
	}

	get(chatId: string): AgentManager | undefined {
		return this.agents.get(chatId);
	}

	/** Stops the running agent of a chat (the Stop button). Returns whether one was running. */
	stop(chatId: string, userId: string): boolean {
		const agent = this.agents.get(chatId);
		if (!agent) {
			return false;
		}
		if (!agent.checkIsUserOwner(userId)) {
			throw new HandlerError('FORBIDDEN', 'You can only stop your own chats.');
		}
		agent.stop();
		return true;
	}

	/**
	 * Port of upstream `utils/chat-context-usage.ts`: tokens the chat's next turn would send (system prompt,
	 * messages, tools). Memories, chat artifacts and compaction aren't ported yet, so they don't count.
	 */
	async getChatContextUsage(opts: {
		chatId: string;
		model?: { provider: LlmProvider; modelId: string };
	}): Promise<ContextUsage | null> {
		const projectId = await this.chats.getChatProjectId(opts.chatId);
		if (!projectId) {
			return null;
		}
		const agentSettings = (await this.llmConfigs.getAgentSettings(projectId)) as AgentSettings | null;
		const tools = getTools(agentSettings, undefined, { semanticLayerMode: null }) as Record<string, Tool>;
		const uiMessages = markSupersededExecuteSqlParts(await this.chats.getChatMessages(opts.chatId));
		const systemMessage: Omit<UIMessage, 'id'> = {
			role: 'system',
			parts: [{ type: 'text', text: renderSystemPrompt({}) }],
		};
		const messages = await convertToModelMessages<UIMessage>([systemMessage, ...uiMessages], { tools });
		const messageTokens = tokenCounter.estimateMessages(messages);
		const toolTokens = await tokenCounter.estimateTools(tools as AgentTools);
		return {
			tokensUsed: messageTokens + toolTokens,
			contextWindow: opts.model ? getContextWindow(opts.model.provider, opts.model.modelId) : null,
		};
	}

	/** Upstream `_resolveWebTools`: the provider's web search (and fetch) tools when the project enables them. */
	private async resolveWebTools(
		projectId: string,
		provider: LlmProvider,
		agentSettings: AgentSettings | null,
	): Promise<Record<string, unknown> | null> {
		if (!agentSettings?.webSearch?.enabled) {
			return null;
		}
		const settings = await this.llm.resolveProviderSettings(projectId, provider);
		if (!settings) {
			return null;
		}
		return createWebSearchTools(provider, settings);
	}

	/** The chat's model, else the project default (upstream `_getResolvedLlmSelectedModel`). */
	async resolveModelSelection(projectId: string, modelSelection?: LlmSelectedModel): Promise<LlmSelectedModel> {
		if (modelSelection) {
			return modelSelection;
		}
		const defaultModel = await this.llm.resolveDefaultChatModel(projectId);
		if (defaultModel) {
			return defaultModel;
		}
		throw new HandlerError('BAD_REQUEST', 'No model config found');
	}

	/** The tool context of a chat outside a run, with the project's agent settings (SQL edits from the UI). */
	async buildChatToolContext(opts: { projectId: string; userId: string; chatId: string }): Promise<ToolContext> {
		const agentSettings = (await this.llmConfigs.getAgentSettings(opts.projectId)) as AgentSettings | null;
		return this.buildToolContext({ ...opts, agentSettings });
	}

	/** Upstream `buildToolContext`. */
	async buildToolContext(opts: {
		projectId: string;
		userId: string;
		chatId: string;
		agentSettings: AgentSettings | null;
		modelSelection?: LlmSelectedModel;
	}): Promise<ToolContext> {
		const project = await this.projects.getProjectById(opts.projectId);
		if (!project?.path) {
			throw new HandlerError('BAD_REQUEST', 'Project path does not exist.');
		}
		const envVars = await this.warehouseCredentials.getProjectRuntimeEnvVars(opts.projectId);
		const access = fullProjectContextAccess();
		return {
			services: {
				executeWarehouseSql: (sql, options) => this.warehouseSql.executeWarehouseSql(sql, options),
				getExecuteSqlPartByQueryIdInChat: (chatId, queryId) =>
					this.chats.getExecuteSqlPartByQueryIdInChat(chatId, queryId),
				updateExecuteSqlPart: (toolCallId, input, output) =>
					this.chats.updateExecuteSqlPart(toolCallId, input, output),
				getQueryResultByQueryId: (chatId, queryId) => this.chats.getQueryResultByQueryId(chatId, queryId),
				runScopedAppDbQuery: (projectId, sql) => this.appDb.runScopedAppDbQuery(projectId, sql),
				getProjectAvailableModels: (projectId) => this.llm.getProjectAvailableModels(projectId),
				resolveProviderModel: (projectId, provider, modelId, applyUserSettings) =>
					this.llm.resolveProviderModel(projectId, provider, modelId, applyUserSettings),
				resolveSandboxSecrets: (userId, projectId) => this.sandboxSecrets.resolve(userId, projectId),
				getImagesByChatId: (chatId) => this.images.getImagesByChatId(chatId),
			},
			projectFolder: project.path,
			chatId: opts.chatId,
			userId: opts.userId,
			projectId: opts.projectId,
			supportsCustomCharts: true,
			agentSettings: opts.agentSettings,
			...(opts.modelSelection && { modelSelection: opts.modelSelection }),
			semanticLayerMode: null,
			envVars,
			warehouseTableAccess: access.warehouseTableAccess,
			warehouseRowSecurity: access.warehouseRowSecurity,
			docsContextAccess: access.docsContextAccess,
			filesContextAccess: access.filesContextAccess,
			mcpAccess: access.mcpAccess,
			skillsAccess: access.skillsAccess,
			userGroupFeatures: access.userGroupFeatures,
			userRulesGroupAccess: access.userRulesGroupAccess,
			preloadedSkillNames: access.preloadedSkillNames,
			azureAccessToken: null,
			queryResults: new Map(),
			generatedArtifacts: { charts: [], maps: [], stories: [] },
			adminMode: false,
		};
	}

	/** `_buildProjectSystemPrompt`: the project's prompt override, or quarry's prompt (with `{{nao}}` injection). */
	private async buildProjectSystemPrompt(
		toolContext: ToolContext,
		toolNames: string[],
		timezone?: string,
	): Promise<string> {
		const override = getSystemPromptOverride(toolContext.projectFolder);
		if (override && !hasNaoPromptPlaceholder(override)) {
			return override;
		}
		const { repos, templates, presence } = readProjectContext(toolContext.projectFolder);
		const sandboxSecrets = toolNames.includes('execute_sandboxed_code')
			? await this.sandboxSecrets.safeListDefinitions(toolContext.userId, toolContext.projectId)
			: [];
		const defaultPrompt = renderSystemPrompt({
			userRules: getUserRules(toolContext.projectFolder, toolContext.userRulesGroupAccess),
			connections: getConnections(toolContext.projectFolder),
			configuredDatabases: extractConfiguredDatabases(toolContext.projectFolder),
			customCharts: toolContext.supportsCustomCharts ? listChartPlugins(toolContext.projectFolder) : [],
			sandboxSecrets,
			semanticLayerMode: toolContext.semanticLayerMode,
			templates,
			repoNames: repos.map((repo) => repo.name),
			contextPresence: presence,
			timezone,
			toolNames,
			options: {
				savedFilesEnabled: isStorageEnabled(),
				canGrepSavedFiles: canGrepUserFiles(),
				customStoriesEnabled: false,
			},
		});
		return override ? injectNaoPrompt(override, defaultPrompt) : defaultPrompt;
	}

	private async resolveProjectId(currentProject: Project | null, body: AgentRequest): Promise<string> {
		if (body.chatId) {
			const chatProjectId = await this.chats.getChatProjectId(body.chatId);
			if (!chatProjectId) {
				throw new HandlerError('NOT_FOUND', `Chat with id ${body.chatId} not found.`);
			}
			return chatProjectId;
		}
		if (currentProject) {
			return currentProject.id;
		}
		throw new HandlerError('BAD_REQUEST', 'No project configured: create a project first.');
	}

	/** `persistUserMessage`: a new chat, or a message appended to (or replacing one of) an existing chat. */
	private async persistUserMessage(userId: string, projectId: string, body: AgentRequest) {
		const { message, messageToEditId } = body;
		const scope: StorageScope = { projectId, userId };
		const source = analyticsAgent.source;
		let chatId = body.chatId;
		let newMessageId: string;
		const isNewChat = !chatId;
		if (!chatId) {
			const attachmentParts = await this.buildAttachmentParts(message, scope);
			const [chat, firstMessage] = await this.chats.createChat(
				{ title: createChatTitle(message), userId, projectId },
				{ text: message.text, citation: message.citation, source },
				attachmentParts,
			);
			chatId = chat.id;
			newMessageId = firstMessage.id;
		} else {
			const ownerId = await this.chats.getChatOwnerId(chatId);
			if (!ownerId) {
				throw new HandlerError('NOT_FOUND', `Chat with id ${chatId} not found.`);
			}
			if (ownerId !== userId) {
				throw new HandlerError('FORBIDDEN', 'You are not authorized to access this chat.');
			}
			const attachmentParts = await this.buildAttachmentParts(message, scope);
			let versionGroupId: string | undefined;
			if (messageToEditId) {
				versionGroupId = await this.chats.resolveVersionGroupIdForEdit(chatId, messageToEditId);
				await this.chats.supersedeMessagesFrom(chatId, messageToEditId);
			}
			const saved = await this.chats.upsertMessage({
				role: 'user',
				parts: [{ type: 'text', text: message.text }, ...attachmentParts],
				chatId,
				senderUserId: userId,
				source,
				citation: message.citation,
				versionGroupId,
			});
			newMessageId = saved.messageId;
		}

		const [chat] = await this.chats.getChat(chatId);
		if (!chat) {
			throw new HandlerError('NOT_FOUND', `Chat with id ${chatId} not found.`);
		}
		return { chat, chatId, isNewChat, newMessageId };
	}

	/**
	 * Both kinds of attachment become a `file` part, but they get there differently: an image is stored in the
	 * database so it can be inlined for the model, while a document was already uploaded to permanent storage
	 * (`POST /api/attachments`) and is only referenced by its path.
	 */
	private async buildAttachmentParts(
		message: AgentRequestUserMessage,
		scope: StorageScope,
	): Promise<UIMessagePart[]> {
		const [imageParts, documentParts] = await Promise.all([
			this.buildImageParts(message.images),
			this.buildDocumentParts(message.documents, scope),
		]);
		return [...imageParts, ...documentParts];
	}

	private async buildImageParts(images: ImageUploadData[] | undefined): Promise<UIMessagePart[]> {
		if (!images?.length) {
			return [];
		}
		const savedImages = await this.images.saveImages(images);
		return savedImages.map(({ id, mediaType }) => ({ type: 'file' as const, mediaType, url: buildImageUrl(id) }));
	}

	private async buildDocumentParts(
		virtualPaths: string[] | undefined,
		scope: StorageScope,
	): Promise<UIMessagePart[]> {
		if (!virtualPaths?.length) {
			return [];
		}
		return Promise.all(virtualPaths.map((virtualPath) => this.buildDocumentPart(virtualPath, scope)));
	}

	private async buildDocumentPart(virtualPath: string, scope: StorageScope): Promise<UIMessagePart> {
		let relativePath = '';
		try {
			relativePath = isStoragePath(virtualPath) ? toStorageRelativePath(virtualPath) : '';
		} catch {
			throw new HandlerError('BAD_REQUEST', `Invalid attached file path: ${virtualPath}`);
		}
		const stored = relativePath ? await statUserFile(scope, relativePath) : null;
		if (!stored) {
			throw new HandlerError('BAD_REQUEST', `Attached file not found: ${virtualPath}`);
		}

		const filename = relativePath.split('/').pop()!;
		return {
			type: 'file' as const,
			mediaType: documentMediaType(filename) ?? 'application/octet-stream',
			filename,
			url: toStorageVirtualPath(relativePath),
		};
	}

	private disposeAgent(chatId: string): void {
		const agent = this.agents.get(chatId);
		if (agent) {
			this.logger.debug(`Stopping the previous run of chat ${chatId}`);
			agent.stop();
			this.agents.delete(chatId);
		}
	}
}
