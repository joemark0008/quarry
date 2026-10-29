import { randomUUID } from 'node:crypto';

import {
	getSchemaKeyFromMentionId,
	isSchemaMentionId,
	isStoryFolderMentionId,
	isStoryReferenceMentionId,
	normalizeCitationMarkers,
} from '@quarry/shared';
import { markSupersededExecuteSqlParts } from '@quarry/shared/execute-sql-parts';
import type { CitationData, LlmProvider, LlmSelectedModel } from '@quarry/shared/types';
import {
	convertToModelMessages,
	createUIMessageStream,
	generateText,
	type InferUIMessageChunk,
	type ModelMessage,
	pruneMessages,
	stepCountIs,
	type StopCondition,
	type StreamTextResult,
	ToolLoopAgent,
	type UIMessageStreamWriter,
} from 'ai';

import type { ChatRepository } from '../chats/chat.repository.js';
import type { LlmService } from './llm/llm.service.js';
import {
	disableModelReasoning,
	fitThinkingBudget,
	getProviderMeta,
	type ProviderModelResult,
} from './providers/providers.js';
import { interactiveStopConditions } from './stop-conditions.js';
import { llmTelemetry } from './telemetry.js';
import type { AgentTools, ForkMetadata, Mention, MessageCustomDataParts, TokenUsage, UIMessage } from './types/chat.js';
import type { QueryResult, ToolContext } from './types/tools.js';
import { getTableColumnsContent, listSchemaTableFqdns } from './user-rules.js';
import { convertToTokenUsage, findLastUserMessage, getLastUserMessageText, settleToolParts } from './utils/ai.js';
import { normalizeCitationMarkersStream } from './utils/citation-markers-stream.js';
import { logger } from './utils/logger.js';
import { sanitizeToolCalls } from './utils/model-message.js';
import { addPromptCache, cachedSystemInstructions } from './utils/prompt-cache.js';
import { sanitizeTitle, TITLE_MAX_OUTPUT_TOKENS, titleFromPrompt, titleGenerationUserMessage } from './utils/title.js';
import { formatErrorMessageForUI } from './utils/utils.js';

export const MAX_OUTPUT_TOKENS = 16_000;
const MAX_SCHEMA_TABLES_WITH_COLUMNS = 15;
const MAX_SCHEMA_TABLES_NAMED = 200;

export interface AgentChat {
	id: string;
	projectId: string;
	userId: string;
	forkMetadata?: ForkMetadata | null;
}

/** How a run is set up (upstream `AgentProfile`, the web chat's `defaultProfile`). */
export interface AgentProfile {
	source?: UIMessage['source'];
	maxSteps?: number;
}

export interface AgentManagerDependencies {
	chats: ChatRepository;
	llm: LlmService;
	/** Renders the project system prompt for the run (`_buildDefaultSystemPrompt`). */
	buildSystemPrompt: (args: { toolNames: string[]; timezone?: string }) => Promise<string>;
}

/**
 * Port of upstream `services/agent.ts` `AgentManager`: one agent run on a chat. It streams the answer as an AI SDK
 * UI message stream, persists the assistant message when the run ends (stopped or not), and generates the chat
 * title for a new chat. Not ported yet: compaction, memory extraction, skills and story mentions, attachments
 * resolution, PostHog tracking.
 */
export class AgentManager {
	private readonly _agent: ToolLoopAgent<never, AgentTools, never>;
	private readonly _finished: Promise<void>;
	private _resolveFinished: (() => void) | undefined;
	private _streamWriter?: UIMessageStreamWriter<UIMessage>;
	private _systemPrompt = '';

	constructor(
		readonly chat: AgentChat,
		private readonly _profile: AgentProfile,
		private readonly _modelConfig: ProviderModelResult,
		private readonly _modelSelection: LlmSelectedModel,
		private readonly _onDispose: () => void,
		private readonly _abortController: AbortController,
		private readonly _agentTools: AgentTools,
		private readonly _toolContext: ToolContext,
		private readonly _deps: AgentManagerDependencies,
	) {
		this._finished = new Promise((resolve) => {
			this._resolveFinished = resolve;
		});
		const callSettings = this._modelConfig.callSettings ?? {};
		const providerOptions = fitThinkingBudget(this._modelConfig.providerOptions, this._maxOutputTokens);
		this._agent = new ToolLoopAgent({
			model: this._modelConfig.model,
			providerOptions,
			tools: this._agentTools,
			maxOutputTokens: this._maxOutputTokens,
			...(callSettings.temperature !== undefined && { temperature: callSettings.temperature }),
			...(callSettings.topP !== undefined && { topP: callSettings.topP }),
			...(callSettings.topK !== undefined && { topK: callSettings.topK }),
			prepareCall: async (args) => ({
				...args,
				instructions: cachedSystemInstructions(this._systemPrompt, this._modelSelection),
			}),
			prepareStep: async ({ messages }) => ({ messages: this._addCache(this._pruneMessages(messages)) }),
			stopWhen: this._stopConditions,
			experimental_context: this._toolContext,
			experimental_telemetry: llmTelemetry('quarry-agent', {
				sessionId: this.chat.id,
				userId: this.chat.userId,
				tags: [this._modelSelection.provider],
				projectId: this.chat.projectId,
				model: this._modelSelection.modelId,
			}),
		});
	}

	private get _maxOutputTokens(): number {
		return this._modelConfig.callSettings?.maxOutputTokens ?? MAX_OUTPUT_TOKENS;
	}

	private get _stopConditions(): StopCondition<AgentTools>[] {
		return this._profile.maxSteps ? [stepCountIs(this._profile.maxSteps)] : interactiveStopConditions;
	}

	get generatedArtifacts(): ToolContext['generatedArtifacts'] {
		return this._toolContext.generatedArtifacts;
	}

	getQueryResult(queryId: string): QueryResult | undefined {
		return this._toolContext.queryResults.get(queryId);
	}

	stream(
		uiMessages: UIMessage[],
		opts: { events?: Partial<MessageCustomDataParts>; mentions?: Mention[]; timezone?: string } = {},
	): ReadableStream<InferUIMessageChunk<UIMessage>> {
		let error: unknown = undefined;
		let result: StreamTextResult<AgentTools, never> | undefined;
		const assistantMessageId = randomUUID();
		const handleError = (err: unknown): string => {
			error = err;
			logger.error(`Agent stream error: ${String(err)}`, {
				source: 'agent',
				projectId: this.chat.projectId,
				context: { chatId: this.chat.id, modelId: this._modelSelection.modelId },
			});
			return formatErrorMessageForUI(err);
		};

		return createUIMessageStream<UIMessage>({
			execute: async ({ writer }) => {
				writer.write({ type: 'start', messageId: assistantMessageId });
				if (opts.events?.newChat) {
					writer.write({ type: 'data-newChat', data: opts.events.newChat });
				}
				if (opts.events?.newUserMessage) {
					writer.write({ type: 'data-newUserMessage', data: opts.events.newUserMessage });
				}

				this._streamWriter = writer;
				const messages = await this._buildModelMessages(uiMessages, opts.mentions, opts.timezone);
				result = await this._agent.stream({
					messages,
					abortSignal: this._abortController.signal,
					experimental_transform: normalizeCitationMarkersStream(),
				});

				if (opts.events?.newChat) {
					this._scheduleTitleGeneration(getLastUserMessageText(uiMessages));
				}

				writer.merge(result.toUIMessageStream({ sendStart: false, onError: handleError }));
			},
			onError: handleError,
			onFinish: async (event) => {
				try {
					const stopReason = event.isAborted ? 'interrupted' : event.finishReason;
					const tokenUsage = await this._getTotalUsage(result);
					const [settledMessage] = await settleToolParts([event.responseMessage]);
					await this._deps.chats.upsertMessage({
						...settledMessage,
						chatId: this.chat.id,
						senderUserId: this.chat.userId,
						source: this._profile.source,
						stopReason,
						error,
						tokenUsage,
						llmProvider: this._modelSelection.provider,
						llmModelId: this._modelSelection.modelId,
					});
				} catch (persistError) {
					logger.error(`Failed to save the assistant message: ${String(persistError)}`, {
						source: 'agent',
						projectId: this.chat.projectId,
						context: { chatId: this.chat.id },
					});
				} finally {
					this._finish();
				}
			},
		});
	}

	/** Runs the agent to completion without streaming (subagents, automations). */
	async generate(uiMessages: UIMessage[], opts: { timezone?: string } = {}) {
		const messages = await this._buildModelMessages(uiMessages, undefined, opts.timezone);
		try {
			const result = await this._agent.generate({ messages, abortSignal: this._abortController.signal });
			return {
				text: normalizeCitationMarkers(result.text),
				usage: convertToTokenUsage(result.totalUsage),
				finishReason: result.finishReason ?? 'stop',
				responseMessages: result.response.messages,
				queryResults: this._toolContext.queryResults,
			};
		} finally {
			this._finish();
		}
	}

	checkIsUserOwner(userId: string): boolean {
		return this.chat.userId === userId;
	}

	stop(): void {
		this._abortController.abort();
	}

	get isStopped(): boolean {
		return this._abortController.signal.aborted;
	}

	waitUntilFinished(): Promise<void> {
		return this._finished;
	}

	getModelId(): string {
		return this._modelSelection.modelId;
	}

	/** Prepares the UI messages and converts them to model messages (`_buildModelMessages`). */
	private async _buildModelMessages(
		uiMessages: UIMessage[],
		mentions?: Mention[],
		timezone?: string,
	): Promise<ModelMessage[]> {
		const settled = await settleToolParts(uiMessages);
		const withoutStaleQueries = markSupersededExecuteSqlParts(settled);
		const withCitation = this._addCitationContext(withoutStaleQueries);
		const withDbContext = this._addDatabaseContext(withCitation, mentions);

		this._systemPrompt = await this._deps.buildSystemPrompt({ toolNames: Object.keys(this._agentTools), timezone });
		const conversation = withDbContext.filter((message) => message.role !== 'system');
		const modelMessages = await convertToModelMessages<UIMessage>(conversation, { tools: this._agentTools });
		return sanitizeToolCalls(modelMessages, this._modelSelection.provider);
	}

	private _scheduleTitleGeneration(userMessageText: string): void {
		this._generateTitle(userMessageText).catch((err) => {
			logger.error(`Title generation failed: ${String(err)}`, {
				source: 'agent',
				projectId: this.chat.projectId,
				context: { chatId: this.chat.id },
			});
		});
	}

	private async _generateTitle(userMessageText: string): Promise<void> {
		const { llm, chats } = this._deps;
		const pinned = await llm.resolveDefaultModelSelection(this.chat.projectId, 'title');
		const provider: LlmProvider = pinned?.provider ?? this._modelSelection.provider;
		const summaryModelId =
			pinned?.modelId ??
			(await llm.resolveAnnotationModelId(
				this.chat.projectId,
				this._modelSelection,
				getProviderMeta(provider).summaryModelId,
			));
		const modelResult = await llm.resolveProviderModel(this.chat.projectId, provider, summaryModelId, false);
		if (!modelResult) {
			return;
		}

		const { text } = await generateText({
			...disableModelReasoning(provider, modelResult),
			system: 'Generate a short, descriptive title (3-8 words) for this conversation based on the user message. Always generate a title, no matter the input. Only capitalize the first letter of the title and nouns. Answer with the title alone, without quotes or any other text.',
			messages: [{ role: 'user', content: titleGenerationUserMessage(userMessageText) }],
			maxOutputTokens: TITLE_MAX_OUTPUT_TOKENS,
			experimental_telemetry: llmTelemetry('quarry-generate-title', {
				sessionId: this.chat.id,
				userId: this.chat.userId,
				tags: [provider],
			}),
		});

		const title = sanitizeTitle(text) || titleFromPrompt(userMessageText);
		if (!title) {
			return;
		}
		await chats.renameChat(this.chat.id, title);
		try {
			this._streamWriter?.write({ type: 'data-chatTitleUpdate', data: { title } });
		} catch {
			// The stream may already be closed: the database is updated regardless.
		}
	}

	private async _getTotalUsage(
		result: StreamTextResult<AgentTools, never> | undefined,
	): Promise<TokenUsage | undefined> {
		if (!result) {
			return undefined;
		}
		try {
			return convertToTokenUsage(await result.totalUsage);
		} catch {
			return undefined;
		}
	}

	private _markFinished(): void {
		this._resolveFinished?.();
		this._resolveFinished = undefined;
	}

	private _finish(): void {
		try {
			this._onDispose();
		} finally {
			this._markFinished();
		}
	}

	private _addCitationContext(messages: UIMessage[]): UIMessage[] {
		const [lastUserMessage] = findLastUserMessage(messages);
		if (!lastUserMessage?.citation) {
			return messages;
		}
		const context = describeCitation(lastUserMessage.citation);
		return this._transformLastUserMessageText(messages, (text) => (text ? `${context}\n\n${text}` : context));
	}

	private _addDatabaseContext(messages: UIMessage[], mentions?: Mention[]): UIMessage[] {
		const mentionIds = mentions?.filter((mention) => mention.trigger === '@').map((mention) => mention.id) ?? [];
		const schemaKeys = mentionIds.map(getSchemaKeyFromMentionId).filter((key): key is string => key !== null);
		const contextParts = [
			...mentionIds.filter(isTableMentionId).map((fqdn) => this._tableContext(fqdn)),
			...schemaKeys.map((schemaKey) => this._schemaContext(schemaKey)),
		].filter((part): part is string => part !== undefined);
		if (contextParts.length === 0) {
			return messages;
		}
		const dbContext = contextParts.join('\n\n');
		return this._transformLastUserMessageText(
			messages,
			(text) => `${text}\n\n---\nReferenced tables:\n${dbContext}`,
		);
	}

	private _tableContext(fqdn: string): string | undefined {
		const content = getTableColumnsContent(
			this._toolContext.projectFolder,
			fqdn,
			this._toolContext.warehouseTableAccess,
		);
		return content ? `[Table: ${fqdn}]\n${content}` : undefined;
	}

	/** Only the first tables of a large schema come with their columns, the next ones are named, the rest counted. */
	private _schemaContext(schemaKey: string): string | undefined {
		const fqdns = listSchemaTableFqdns(
			this._toolContext.projectFolder,
			schemaKey,
			this._toolContext.warehouseTableAccess,
		);
		if (fqdns.length === 0) {
			return undefined;
		}
		const detailedTables = fqdns.slice(0, MAX_SCHEMA_TABLES_WITH_COLUMNS).map((fqdn) => this._tableContext(fqdn));
		const otherTables = fqdns.slice(MAX_SCHEMA_TABLES_WITH_COLUMNS, MAX_SCHEMA_TABLES_NAMED);
		const unnamedCount = Math.max(fqdns.length - MAX_SCHEMA_TABLES_NAMED, 0);
		return [
			`[Schema: ${schemaKey}] ${fqdns.length} tables`,
			...detailedTables,
			otherTables.length > 0 ? `Other tables of ${schemaKey}: ${otherTables.join(', ')}` : undefined,
			unnamedCount > 0
				? `${unnamedCount} more tables of ${schemaKey} are not listed: search the context for them.`
				: undefined,
		]
			.filter((part): part is string => part !== undefined)
			.join('\n\n');
	}

	private _transformLastUserMessageText(messages: UIMessage[], transform: (text: string) => string): UIMessage[] {
		const [lastUserMessage, lastUserMessageIndex] = findLastUserMessage(messages);
		if (!lastUserMessage) {
			return messages;
		}
		const textPartIndex = lastUserMessage.parts.findIndex((part) => part.type === 'text');
		if (textPartIndex === -1) {
			return messages;
		}
		const textPart = lastUserMessage.parts[textPartIndex] as { type: 'text'; text: string };
		const updated = [...messages];
		const parts = [...lastUserMessage.parts];
		parts[textPartIndex] = { type: 'text', text: transform(textPart.text) };
		updated[lastUserMessageIndex] = { ...lastUserMessage, parts };
		return updated;
	}

	/** Anthropic cache breakpoints (direct, Vertex and Bedrock Claude). */
	private _addCache(messages: ModelMessage[]): ModelMessage[] {
		return addPromptCache(messages, this._modelSelection);
	}

	/** Drops old reasoning and follow-up suggestions from the conversation. */
	private _pruneMessages(messages: ModelMessage[]): ModelMessage[] {
		return pruneMessages({
			messages,
			reasoning: 'before-last-message',
			toolCalls: [{ tools: ['suggest_follow_ups'], type: 'all' }],
			emptyMessages: 'remove',
		});
	}
}

function describeCitation({ start, end, text, storySlug, block }: CitationData): string {
	if (!block) {
		return `[The user is referring to the following text selection (chars ${start}–${end}):\n"${text}"]`;
	}
	const title = block.title ? ` "${block.title}"` : '';
	const query = block.queryId ? `, reading ${block.queryId}` : '';
	return `[The user is referring to the ${block.kind} block${title}${query} of the custom story "${storySlug}". Apply their request to that block in the story's source and publish again.]`;
}

function isTableMentionId(mentionId: string): boolean {
	return !isStoryReferenceMentionId(mentionId) && !isStoryFolderMentionId(mentionId) && !isSchemaMentionId(mentionId);
}
