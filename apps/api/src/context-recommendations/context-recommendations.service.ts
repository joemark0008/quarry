import { Injectable, Logger } from '@nestjs/common';
import { type DefaultModelSettings, setBackgroundModelForCategory } from '@quarry/shared';
import type { LlmSelectedModel, RepoProvider } from '@quarry/shared/types';
import { readUIMessageStream } from 'ai';

import { AgentService } from '../agent/agent.service.js';
import { LlmService } from '../agent/llm/llm.service.js';
import { ProjectLlmConfigRepository } from '../agent/llm/project-llm-config.repository.js';
import { contextRecommendationsAgent } from '../agent/profiles/context-recommendations.js';
import { renderContextRecommendationsPrompt } from '../agent/prompts/context-recommendations-prompt.js';
import { renderContextRecommendationsSystemPrompt } from '../agent/prompts/context-recommendations-system-prompt.js';
import {
	collectTriggerChatIds,
	collectTriggerTargetIds,
	type ExistingRecommendation,
	fingerprintFor,
	type ProposedFinding,
	reconcile,
	type ReconcileAction,
	repairTriggerRefs,
} from '../agent/services/context-recommendations.reconcile.js';
import {
	createContextFixCollector,
	createQueryAppDbTool,
	createRecommendationCollector,
} from '../agent/tools/index.js';
import type { ContextFixCollector } from '../agent/tools/propose-context-fix.js';
import type { UIMessage } from '../agent/types/chat.js';
import type {
	ContextRecommendationFrequency,
	ContextRecommendationStatus,
	LinkedContextRepo,
	RecommendationInsight,
} from '../agent/types/context-recommendation.js';
import { readProjectContext } from '../agent/utils/quarry-config.js';
import { extractConfiguredRepos } from '../agent/utils/quarry-config.js';
import { ChatRepository } from '../chats/chat.repository.js';
import { HandlerError } from '../common/errors/handler-error.js';
import { ConfigService } from '../config/config.service.js';
import type { DbExecutor } from '../prisma/prisma.types.js';
import { ProjectRepository } from '../projects/project.repository.js';
import { ContextRecommendationRepository } from './context-recommendation.repository.js';
import type {
	ContextRecommendationConfigRecord,
	ContextRecommendationRecord,
	ContextRecommendationRunRecord,
	FeedbackLink,
	NewContextRecommendation,
} from './context-recommendation.types.js';
import { buildAgentPrompt } from './context-recommendation-prompt.js';
import { type RecommendationRepo, toRecommendationRepo } from './context-recommendation-repo.js';
import { ContextRecommendationFeedbackCoverage } from './context-recommendations.feedback-coverage.js';
import { flagExpensiveContextFiles } from './context-recommendations.file-costs.js';

const DEFAULT_LOOKBACK_DAYS = 90;
const IMPACT_FLOOR = 5;

/**
 * Port of upstream `services/context-recommendations.service.ts`: a background agent run reads the project's recent
 * chats (through `query_app_db`), records findings, and the reconciler merges them into the project's
 * recommendations. Dropped: managed-AI billing checks. Not ported (Phase 7, `git-providers`): the auto-created pull
 * requests of "YOLO mode" (`autoCreatePrs`), which need the GitHub/GitLab APIs.
 */
@Injectable()
export class ContextRecommendationsService {
	private readonly logger = new Logger(ContextRecommendationsService.name);

	constructor(
		private readonly recommendations: ContextRecommendationRepository,
		private readonly feedbackCoverage: ContextRecommendationFeedbackCoverage,
		private readonly agents: AgentService,
		private readonly llm: LlmService,
		private readonly chats: ChatRepository,
		private readonly projects: ProjectRepository,
		private readonly llmConfigs: ProjectLlmConfigRepository,
		private readonly config: ConfigService,
	) {}

	/** Upstream `assertContextRecommendationsEnabled`, applied to every procedure. */
	assertEnabled(): void {
		if (!this.config.env.BETA_CONTEXT_RECOMMENDATIONS_ENABLED) {
			throw new HandlerError('FORBIDDEN', 'Context recommendations are disabled on this instance.');
		}
	}

	/** `contextRecommendation.list`: recommendations (by impact) with their trigger refs repaired and their feedback. */
	async list(
		projectId: string,
		status?: ContextRecommendationStatus,
	): Promise<(ContextRecommendationRecord & { feedbacks: FeedbackLink[] })[]> {
		const recommendations = await this.recommendations.listRecommendations(projectId, status);
		const repaired = await this.repairRecommendationTriggerRefs(projectId, recommendations);
		const feedbackLinks = await this.recommendations.listFeedbacksForRecommendations(
			projectId,
			repaired.map((r) => r.id),
		);
		const feedbacksByRecId = feedbackLinks.reduce<Record<string, FeedbackLink[]>>((acc, link) => {
			(acc[link.recommendationId] ??= []).push(link);
			return acc;
		}, {});
		return repaired.map((rec) => ({ ...rec, feedbacks: feedbacksByRecId[rec.id] ?? [] }));
	}

	getLatestRun(projectId: string): Promise<ContextRecommendationRunRecord | null> {
		return this.recommendations.getLatestRun(projectId);
	}

	getLatestSuccessfulRun(projectId: string): Promise<ContextRecommendationRunRecord | null> {
		return this.recommendations.getLatestSuccessfulRun(projectId);
	}

	getConfig(projectId: string): Promise<ContextRecommendationConfigRecord | null> {
		return this.recommendations.getConfig(projectId);
	}

	/** `contextRecommendation.run`: starts a manual run in the background, attributed to the user. */
	async startManualRun(projectId: string, userId: string): Promise<{ started: true }> {
		const latestRun = await this.recommendations.getLatestRun(projectId);
		if (latestRun?.status === 'running') {
			throw new HandlerError('CONFLICT', 'A recommendations run is already in progress.');
		}
		void this.runContextRecommendations(projectId, { trigger: 'manual', triggeredByUserId: userId }).catch(
			(err) => {
				this.logger.error(`Manual context recommendations run failed: ${String(err)}`);
			},
		);
		return { started: true };
	}

	/** `contextRecommendation.cancelRun`: stops the run's agent and marks the run cancelled. */
	async cancelRun(
		projectId: string,
		runId: string,
	): Promise<ContextRecommendationRunRecord & { alreadyTerminal: boolean }> {
		const run = await this.recommendations.getRunById(projectId, runId);
		if (!run) {
			throw new HandlerError('NOT_FOUND', `Recommendations run not found: ${runId}`);
		}
		if (run.status !== 'running') {
			return { ...run, alreadyTerminal: true };
		}
		if (run.chatId) {
			this.agents.get(run.chatId)?.stop();
		}
		const cancelled = await this.recommendations.cancelRun(runId);
		const fresh = await this.recommendations.getRunById(projectId, runId);
		if (!fresh) {
			throw new HandlerError('NOT_FOUND', `Recommendations run not found: ${runId}`);
		}
		return { ...fresh, alreadyTerminal: !cancelled };
	}

	listAvailableModels(projectId: string) {
		return this.llm.getProjectAvailableModels(projectId);
	}

	/** `contextRecommendation.setConfig`; rescheduling on a new frequency is the job handler's (see the resolver). */
	async setConfig(
		projectId: string,
		input: {
			modelProvider?: LlmSelectedModel['provider'];
			modelId?: string;
			frequency?: ContextRecommendationFrequency;
			customSystemPromptInstructions?: string;
			autoCreatePrs?: boolean;
			maxAutoPrsPerRun?: number;
		},
	): Promise<void> {
		const customSystemPromptInstructions =
			input.customSystemPromptInstructions !== undefined
				? input.customSystemPromptInstructions.trim() || null
				: undefined;
		await this.recommendations.updateConfig(projectId, {
			frequency: input.frequency,
			customSystemPromptInstructions,
			autoCreatePrs: input.autoCreatePrs,
			maxAutoPrsPerRun: input.maxAutoPrsPerRun,
		});
		if (input.modelProvider && input.modelId) {
			await this.setContextRecommendationModel(projectId, {
				provider: input.modelProvider,
				modelId: input.modelId,
			});
		}
	}

	async setRepo(projectId: string, repoFullName: string | null, provider?: RepoProvider): Promise<void> {
		await this.recommendations.updateConfig(projectId, {
			repoFullName,
			repoProvider: repoFullName ? (provider ?? 'github') : null,
		});
	}

	async listLinkedRepos(projectId: string): Promise<LinkedContextRepo[]> {
		const project = await this.projects.getProjectById(projectId);
		return project?.path ? extractConfiguredRepos(project.path) : [];
	}

	setStatus(projectId: string, id: string, status: ContextRecommendationStatus, userId: string): Promise<void> {
		return this.recommendations.setRecommendationStatus({ id, projectId, status, userId });
	}

	/** `contextRecommendation.getAgentPrompt`: a prompt applying the selected recommendations, for a coding agent. */
	async getAgentPrompt(projectId: string, ids: string[]): Promise<string> {
		const results = await Promise.all(ids.map((id) => this.recommendations.getRecommendationById(projectId, id)));
		const recs = results.filter((r): r is NonNullable<typeof r> => r !== null);
		if (recs.length < ids.length) {
			throw new HandlerError(
				'NOT_FOUND',
				`Only ${recs.length} of ${ids.length} selected recommendations could be found. Some may have been deleted or changed since you selected them; refresh and try again.`,
			);
		}
		const repo = await this.resolveRecommendationRepo(projectId);
		return buildAgentPrompt(recs, repo?.subPath ?? '');
	}

	getRecommendationChatMetadata(projectId: string, chatIds: string[]) {
		return this.recommendations.getRecommendationChatMetadata(projectId, chatIds);
	}

	/**
	 * `getPrStatus`, `createPullRequest`, `createBatchPullRequest` call the GitHub/GitLab APIs (upstream
	 * `context-pr.service`, `services/github`, `services/gitlab`), which are Phase 7 (`git-providers`).
	 */
	assertPullRequestsAvailable(): never {
		throw new HandlerError(
			'BAD_REQUEST',
			'Pull requests for context recommendations need a GitHub or GitLab connection, which is not available yet. Copy the agent prompt instead.',
		);
	}

	private async setContextRecommendationModel(projectId: string, selection: LlmSelectedModel): Promise<void> {
		const settings = (await this.llmConfigs.getDefaultModelSettings(projectId)) as DefaultModelSettings | null;
		await this.llmConfigs.updateDefaultModelSettings(
			projectId,
			setBackgroundModelForCategory(settings, 'context_recommendation', selection) as never,
		);
	}

	async runContextRecommendations(
		projectId: string,
		options?: {
			trigger?: 'schedule' | 'manual';
			triggeredByUserId?: string;
			period?: { start?: Date; end?: Date };
		},
	): Promise<{ runId: string }> {
		const period = options?.period;
		const now = new Date();
		const periodEnd = period?.end ?? now;
		const periodStart = period?.start ?? (await this.resolvePeriodStart(projectId, periodEnd));

		const userId = options?.triggeredByUserId ?? (await this.recommendations.getFirstProjectAdminUserId(projectId));
		const config = await this.recommendations.getConfig(projectId);
		const configuredModel = await this.llm.resolveDefaultModelSelection(projectId, 'context_recommendation');
		const model = await this.agents.resolveModelSelection(projectId, configuredModel ?? undefined);

		const run = await this.recommendations.createRun({
			projectId,
			trigger: options?.trigger ?? 'schedule',
			windowStart: periodStart,
			windowEnd: periodEnd,
			llmProvider: model.provider,
			llmModelId: model.modelId,
		});

		try {
			const project = await this.projects.getProjectById(projectId);
			const projectContext = project?.path ? readProjectContext(project.path) : undefined;
			const linkedRepos = projectContext?.repos ?? [];
			const templates = projectContext?.templates;
			const contextPresence = projectContext?.presence;
			const contextRepo = await this.resolveRecommendationRepo(projectId);
			const proposeFixes = !!project?.path && (!!contextRepo || linkedRepos.some((repo) => repo.repoFullName));
			const fixCollector = proposeFixes
				? createContextFixCollector(project!.path!, linkedRepos, { allowContextEdits: !!contextRepo })
				: null;

			const existing = await this.recommendations.getReconcilableRecommendations(projectId);
			const dismissedFingerprints = await this.recommendations.getDismissedFingerprints(projectId);
			const totals = await this.recommendations.getWindowTotals(projectId, periodStart, periodEnd);
			const fileReadCosts = flagExpensiveContextFiles(
				await this.recommendations.getContextFileReadCosts(projectId, periodStart, periodEnd),
			);

			const [chat] = await this.chats.createChat(
				{ title: 'Context recommendations run', userId, projectId },
				{
					text: renderContextRecommendationsPrompt({
						windowStart: periodStart,
						windowEnd: periodEnd,
						existing,
						fileReadCosts,
						proposeFixes,
						linkedRepos,
						templates,
						contextPresence,
						contextRepoConnected: !!contextRepo,
					}),
					source: 'contextRecommendations',
				},
			);
			await this.recommendations.setRunChat(run.id, chat.id);

			const [uiChat] = await this.chats.getChat(chat.id);
			if (!uiChat) {
				throw new Error(`Failed to load run chat ${chat.id}`);
			}

			const collector = createRecommendationCollector();
			const systemPrompt = renderContextRecommendationsSystemPrompt({
				proposeFixes,
				linkedRepos,
				templates,
				contextPresence,
				contextRepoConnected: !!contextRepo,
				customInstructions: config?.customSystemPromptInstructions ?? undefined,
			});
			const recommendationTools = {
				query_app_db: createQueryAppDbTool(projectId),
				record_recommendation: collector.recordTool,
				resolve_recommendation: collector.resolveTool,
				...(fixCollector && {
					edit_file: fixCollector.editTool,
					propose_manual_fix: fixCollector.manualFixTool,
				}),
			};
			const agent = await this.agents.create(
				{ id: chat.id, projectId, userId, forkMetadata: null },
				model,
				contextRecommendationsAgent(systemPrompt, recommendationTools),
			);

			const stream = agent.stream(uiChat.messages ?? [], {});
			for await (const message of readUIMessageStream<UIMessage>({ stream, terminateOnError: true })) {
				void message; // drain; the agent persists its own messages, tools mutate the collector by reference
			}

			const recorded = await this.repairRecommendationTriggerRefs(projectId, collector.recorded);

			const actions = reconcile({
				existing: existing.map(toExistingRec),
				recorded,
				resolvedFingerprints: collector.resolvedFingerprints,
				dismissedFingerprints,
				totals,
				impactFloor: IMPACT_FLOOR,
			});

			const tokens = await this.recommendations.getChatTokenTotals(chat.id);
			await this.recommendations.transaction((tx) =>
				this.applyActions({ projectId, runId: run.id, model, actions, existing, fixCollector }, tx),
			);

			await this.feedbackCoverage.ensureFeedbackCoverage(projectId, run.id, model, {
				existing: existing.map(toExistingRec),
				dismissedFingerprints,
				userId,
			});

			await this.feedbackCoverage.normalizeFeedbackLinks(projectId);

			// quarry: upstream's YOLO mode (`config.autoCreatePrs`) opens pull requests here; that needs the
			// GitHub/GitLab APIs of Phase 7 (`git-providers`), so the setting is stored but has no effect yet.

			await this.recommendations.completeRun(run.id, {
				...tokens,
				llmProvider: model.provider,
				llmModelId: model.modelId,
			});
			return { runId: run.id };
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			this.logger.error(`Context recommendations run failed: ${message}`);
			await this.recommendations.failRun(run.id, message);
			throw err;
		}
	}

	async repairRecommendationTriggerRefs<T extends { insights: RecommendationInsight[] }>(
		projectId: string,
		items: T[],
	): Promise<T[]> {
		const targetIds = collectTriggerTargetIds(items);
		const chatIds = collectTriggerChatIds(items);
		if (targetIds.length === 0 && chatIds.length === 0) {
			return items;
		}
		const [resolvedByTarget, validChatIds] = await Promise.all([
			this.recommendations.resolveTriggerTargetChatIds(projectId, targetIds),
			this.recommendations.filterExistingProjectChatIds(projectId, chatIds),
		]);
		return repairTriggerRefs(items, resolvedByTarget, validChatIds);
	}

	/** Upstream `context-pr.service` `resolveRecommendationRepo` (see `context-recommendation-repo.ts`). */
	async resolveRecommendationRepo(projectId: string): Promise<RecommendationRepo | null> {
		return toRecommendationRepo(await this.recommendations.getConfig(projectId));
	}

	private async resolvePeriodStart(projectId: string, end: Date): Promise<Date> {
		const lastCompletedAt = await this.recommendations.getLastCompletedRunAt(projectId);
		if (lastCompletedAt) {
			return lastCompletedAt;
		}
		return new Date(end.getTime() - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
	}

	private async applyActions(
		args: {
			projectId: string;
			runId: string;
			model: LlmSelectedModel;
			actions: ReconcileAction[];
			existing: ContextRecommendationRecord[];
			fixCollector: ContextFixCollector | null;
		},
		executor: DbExecutor,
	): Promise<void> {
		const byId = new Map(args.existing.map((r) => [r.id, r]));
		for (const action of args.actions) {
			if (action.kind === 'insert') {
				const rec = await this.recommendations.insertRecommendation(
					{
						projectId: args.projectId,
						fingerprint: action.fingerprint,
						suggestedFile: action.finding.suggestedFile,
						subjectKey: action.finding.subjectKey,
						...upsertFields(action, args),
					},
					executor,
				);
				await this.recommendations.linkFeedbackToRecommendation(
					args.projectId,
					rec.id,
					action.feedbackMessageIds,
					executor,
				);
			} else if (action.kind === 'update') {
				const prev = byId.get(action.id);
				const patch: Partial<NewContextRecommendation> = {
					...upsertFields(action, args),
					occurrenceCount: (prev?.occurrenceCount ?? 1) + 1,
				};
				if (action.reopen) {
					patch.status = 'open';
				}
				await this.recommendations.updateRecommendation(action.id, patch, executor);
				await this.recommendations.linkFeedbackToRecommendation(
					args.projectId,
					action.id,
					action.feedbackMessageIds,
					executor,
				);
			} else if (action.kind === 'resolve') {
				await this.recommendations.updateRecommendation(
					action.id,
					{ status: 'applied', statusChangedAt: new Date() },
					executor,
				);
			}
		}
	}
}

/** Resolves the fix persisted with a proposed finding. */
function resolveFix(
	collector: ContextFixCollector | null,
	finding: ProposedFinding,
): Partial<NewContextRecommendation> {
	const fix = collector?.getFix(fingerprintFor(finding.suggestedFile, finding.subjectKey));
	if (!fix) {
		return manualFixFallback(finding);
	}
	return {
		fixKind: fix.fixKind,
		proposedEdits: fix.proposedEdits,
		fixGuidance: fix.fixGuidance,
		fixPrompt: fix.fixPrompt,
	};
}

/** Turns a finding's diagnosis into a ready-to-apply manual fix when the agent left no concrete one. */
function manualFixFallback(finding: ProposedFinding): Partial<NewContextRecommendation> {
	const guidance = finding.rootCause
		? `${finding.suggestedAction}\n\nWhy: ${finding.rootCause}`
		: finding.suggestedAction;
	const prompt = [
		`Update the quarry project context file \`${finding.suggestedFile}\` to fix the following issue.`,
		'',
		`Problem: ${finding.rootCause || finding.summary}`,
		'',
		`Required change: ${finding.suggestedAction}`,
	].join('\n');
	return { fixKind: 'manual', proposedEdits: null, fixGuidance: guidance, fixPrompt: prompt };
}

function toExistingRec(r: ContextRecommendationRecord): ExistingRecommendation {
	return {
		id: r.id,
		fingerprint: r.fingerprint,
		status: r.status,
		occurrenceCount: r.occurrenceCount,
	};
}

/** Fields written identically whether a finding is inserted or updated. */
function upsertFields(
	action: Extract<ReconcileAction, { kind: 'insert' | 'update' }>,
	args: { runId: string; model: LlmSelectedModel; fixCollector: ContextFixCollector | null },
) {
	return {
		runId: args.runId,
		category: action.finding.category,
		rootCause: action.finding.rootCause,
		rootCauseKind: action.finding.rootCauseKind ?? null,
		fixTarget: action.finding.fixTarget ?? null,
		impactScore: action.impactScore,
		impact: action.impact,
		insights: action.finding.insights,
		title: action.finding.title,
		summary: action.finding.summary,
		suggestedAction: action.finding.suggestedAction,
		...resolveFix(args.fixCollector, action.finding),
		llmProvider: args.model.provider,
		llmModelId: args.model.modelId,
	};
}
