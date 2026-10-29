import { Injectable, Logger } from '@nestjs/common';
import { markSupersededExecuteSqlParts } from '@quarry/shared/execute-sql-parts';
import type { LlmProvider, LlmSelectedModel } from '@quarry/shared/types';
import { convertToModelMessages, type InferUIMessageChunk, type Tool } from 'ai';

import { ChatRepository } from '../chats/chat.repository.js';
import { HandlerError } from '../common/errors/handler-error.js';
import type { Project } from '../generated/prisma/client.js';
import { ProjectRepository } from '../projects/project.repository.js';
import { WarehouseCredentialsService } from '../warehouse/warehouse-credentials.service.js';
import { WarehouseSqlService } from '../warehouse/warehouse-sql.service.js';
import { type AgentChat, AgentManager, type AgentProfile } from './agent-manager.js';
import { LlmService } from './llm/llm.service.js';
import { ProjectLlmConfigRepository } from './llm/project-llm-config.repository.js';
import { renderSystemPrompt } from './prompts/render-system-prompt.js';
import { getContextWindow } from './providers/providers.js';
import { listChartPlugins } from './services/chart-plugin.js';
import { tokenCounter } from './services/token-counter.js';
import { fullProjectContextAccess } from './services/user-group-context-access.service.js';
import { getSystemPromptOverride, hasNaoPromptPlaceholder, injectNaoPrompt } from './system-prompts.js';
import { getTools } from './tools/index.js';
import type { AgentSettings } from './types/agent-settings.js';
import type { AgentRequest, AgentTools, ContextUsage, UIMessage, UIMessagePart } from './types/chat.js';
import type { ToolContext } from './types/tools.js';
import { getConnections, getUserRules } from './user-rules.js';
import { createChatTitle } from './utils/ai.js';
import { extractConfiguredDatabases, readProjectContext } from './utils/nao-config.js';

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
		const agentSettings = (await this.llmConfigs.getAgentSettings(chat.projectId)) as AgentSettings | null;
		const toolContext = await this.buildToolContext({
			projectId: chat.projectId,
			chatId: chat.id,
			userId: chat.userId,
			agentSettings,
			modelSelection,
		});
		const tools = getTools(agentSettings, {}, { semanticLayerMode: toolContext.semanticLayerMode }) as AgentTools;
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
		const defaultPrompt = renderSystemPrompt({
			userRules: getUserRules(toolContext.projectFolder, toolContext.userRulesGroupAccess),
			connections: getConnections(toolContext.projectFolder),
			configuredDatabases: extractConfiguredDatabases(toolContext.projectFolder),
			customCharts: toolContext.supportsCustomCharts ? listChartPlugins(toolContext.projectFolder) : [],
			semanticLayerMode: toolContext.semanticLayerMode,
			templates,
			repoNames: repos.map((repo) => repo.name),
			contextPresence: presence,
			timezone,
			toolNames,
			options: { savedFilesEnabled: false, canGrepSavedFiles: false, customStoriesEnabled: false },
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
		if (message.images?.length || message.documents?.length) {
			throw new HandlerError('BAD_REQUEST', 'Attachments are not supported yet.');
		}
		const source = analyticsAgent.source;
		const attachmentParts: UIMessagePart[] = [];
		let chatId = body.chatId;
		let newMessageId: string;
		const isNewChat = !chatId;
		if (!chatId) {
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

	private disposeAgent(chatId: string): void {
		const agent = this.agents.get(chatId);
		if (agent) {
			this.logger.debug(`Stopping the previous run of chat ${chatId}`);
			agent.stop();
			this.agents.delete(chatId);
		}
	}
}
