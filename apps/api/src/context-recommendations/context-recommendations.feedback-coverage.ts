import { createHash } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import type { LlmSelectedModel } from '@quarry/shared/types';
import { generateText, Output } from 'ai';
import { z } from 'zod';

import { LlmService } from '../agent/llm/llm.service.js';
import type { ExistingRecommendation } from '../agent/services/context-recommendations.reconcile.js';
import { fingerprintFor } from '../agent/services/context-recommendations.reconcile.js';
import { llmTelemetry } from '../agent/telemetry.js';
import type { RecommendationInsight } from '../agent/types/context-recommendation.js';
import { ContextRecommendationRepository } from './context-recommendation.repository.js';
import type { FeedbackOwnershipRow, UnlinkedFeedback } from './context-recommendation.types.js';

const FeedbackClusterSchema = z.object({
	clusters: z.array(
		z.object({
			title: z.string().describe('Short title for this group of related feedback (max 80 chars).'),
			summary: z
				.string()
				.describe(
					'One paragraph describing the shared pattern behind these downvotes and why the context needs improvement.',
				),
			suggestedAction: z.string().describe('Concrete first step to address the issue in the context files.'),
			suggestedFile: z
				.string()
				.describe(
					'Project-relative path of the context file most relevant to fix (e.g. RULES.md, semantics/revenue.md).',
				),
			subjectKey: z
				.string()
				.describe(
					'Stable machine-readable identifier for the subject within the file (table, column, or normalized rule slug).',
				),
			memberMessageIds: z.array(z.string()).min(1).describe('IDs of the downvoted messages in this cluster.'),
		}),
	),
});

type FeedbackCluster = z.infer<typeof FeedbackClusterSchema>['clusters'][number];

const FALLBACK_SUGGESTED_FILE = 'RULES.md';
const FALLBACK_SUBJECT_KEY = 'unclustered_downvotes';

/**
 * Port of upstream `services/context-recommendations.feedback-coverage.ts`: every downvote ends up linked to one
 * recommendation, clustered by the model when no recommendation of the run covers it.
 */
@Injectable()
export class ContextRecommendationFeedbackCoverage {
	private readonly logger = new Logger(ContextRecommendationFeedbackCoverage.name);

	constructor(
		private readonly recommendations: ContextRecommendationRepository,
		private readonly llm: LlmService,
	) {}

	async ensureFeedbackCoverage(
		projectId: string,
		runId: string,
		model: LlmSelectedModel,
		context: { existing: ExistingRecommendation[]; dismissedFingerprints: string[]; userId: string },
	): Promise<void> {
		const unlinked = await this.recommendations.getUnlinkedNegativeFeedbacks(projectId);
		if (unlinked.length === 0) {
			return;
		}

		const remaining = await this.attachFeedbackToExistingRecommendations(projectId, unlinked);
		if (remaining.length === 0) {
			return;
		}

		const dismissedSet = new Set(context.dismissedFingerprints);
		const existingByFingerprint = new Map(context.existing.map((r) => [r.fingerprint, r]));

		const clusters = await this.clusterFeedbacks(projectId, runId, context.userId, model, remaining);
		if (clusters.length > 0) {
			await this.applyFeedbackClusters(projectId, runId, clusters, { dismissedSet, existingByFingerprint });
		} else {
			await this.applyFallbackRecos(projectId, runId, remaining, { dismissedSet, existingByFingerprint });
		}
	}

	async normalizeFeedbackLinks(projectId: string): Promise<void> {
		const links = await this.recommendations.listAllFeedbackLinks(projectId);
		const linksByMessage = new Map<string, FeedbackOwnershipRow[]>();
		for (const link of links) {
			const group = linksByMessage.get(link.messageId) ?? [];
			group.push(link);
			linksByMessage.set(link.messageId, group);
		}

		const staleLinks: { recommendationId: string; messageId: string }[] = [];
		for (const [messageId, group] of linksByMessage) {
			if (group.length <= 1) {
				continue;
			}
			const owner = this.pickFeedbackOwner(messageId, group);
			for (const link of group) {
				if (link.recommendationId !== owner.recommendationId) {
					staleLinks.push({ recommendationId: link.recommendationId, messageId });
				}
			}
		}
		await this.recommendations.deleteFeedbackLinks(staleLinks);
	}

	private pickFeedbackOwner(messageId: string, group: FeedbackOwnershipRow[]): FeedbackOwnershipRow {
		const active = group.filter((link) => link.status !== 'dismissed');
		const candidates = active.length > 0 ? active : group;
		const origins = candidates.filter((link) => this.insightsReferenceTarget(link.insights, messageId));
		const pool = origins.length > 0 ? origins : candidates;
		return pool.reduce((best, current) => (this.isStrongerOwner(current, best) ? current : best));
	}

	private insightsReferenceTarget(insights: RecommendationInsight[], messageId: string): boolean {
		return (insights ?? []).some((insight) => insight.triggerRefs?.some((ref) => ref.targetId === messageId));
	}

	private isStrongerOwner(a: FeedbackOwnershipRow, b: FeedbackOwnershipRow): boolean {
		if (a.impactScore !== b.impactScore) {
			return a.impactScore > b.impactScore;
		}
		return a.createdAt.getTime() > b.createdAt.getTime();
	}

	private async attachFeedbackToExistingRecommendations(
		projectId: string,
		unlinked: UnlinkedFeedback[],
	): Promise<UnlinkedFeedback[]> {
		const recommendations = await this.recommendations.getReconcilableRecommendations(projectId);
		const recIdByTarget = new Map<string, string>();
		const recIdsByChat = new Map<string, Set<string>>();
		for (const rec of recommendations) {
			for (const insight of rec.insights ?? []) {
				for (const ref of insight.triggerRefs ?? []) {
					if (ref.targetId && !recIdByTarget.has(ref.targetId)) {
						recIdByTarget.set(ref.targetId, rec.id);
					}
					const chatRecs = recIdsByChat.get(ref.chatId) ?? new Set<string>();
					chatRecs.add(rec.id);
					recIdsByChat.set(ref.chatId, chatRecs);
				}
			}
		}

		const remaining: UnlinkedFeedback[] = [];
		for (const feedback of unlinked) {
			const recId = this.resolveRecommendationForFeedback(feedback, recIdByTarget, recIdsByChat);
			if (recId) {
				await this.recommendations.linkFeedbackToRecommendation(projectId, recId, [feedback.messageId]);
			} else {
				remaining.push(feedback);
			}
		}
		return remaining;
	}

	private resolveRecommendationForFeedback(
		feedback: UnlinkedFeedback,
		recIdByTarget: Map<string, string>,
		recIdsByChat: Map<string, Set<string>>,
	): string | null {
		const strongMatch = recIdByTarget.get(feedback.messageId);
		if (strongMatch) {
			return strongMatch;
		}
		const chatRecs = recIdsByChat.get(feedback.chatId);
		if (chatRecs && chatRecs.size === 1) {
			return [...chatRecs][0];
		}
		return null;
	}

	private async clusterFeedbacks(
		projectId: string,
		runId: string,
		userId: string,
		model: LlmSelectedModel,
		unlinked: UnlinkedFeedback[],
	): Promise<FeedbackCluster[]> {
		// quarry: upstream passed the run's usage context (managed AI billing), dropped with billing.
		const providerModel = await this.llm.resolveProviderModel(projectId, model.provider, model.modelId, true);
		if (!providerModel) {
			this.logger.warn(`Feedback coverage: could not resolve model ${model.provider}/${model.modelId}`);
			return [];
		}

		const feedbackList = unlinked
			.map(
				(f) =>
					`- message_id: ${f.messageId} | chat_id: ${f.chatId} | user: ${f.userName}` +
					(f.explanation ? ` | explanation: ${f.explanation}` : ''),
			)
			.join('\n');

		try {
			const { output } = await generateText({
				model: providerModel.model,
				system:
					'You are an analyst helping improve an AI analytics agent by grouping user complaints into actionable context improvement recommendations. ' +
					'Group the downvoted messages below by shared root cause, then for each group output a recommendation pointing to the context file that should be fixed. ' +
					'Be conservative: only group messages that share a clear pattern. Isolated complaints become their own cluster. ' +
					'Respond ONLY with the JSON schema — no extra text.',
				messages: [
					{
						role: 'user',
						content: `These ${unlinked.length} downvoted messages are not yet covered by any recommendation:\n\n${feedbackList}\n\nGroup them and return the clusters.`,
					},
				],
				output: Output.object({ schema: FeedbackClusterSchema }),
				maxOutputTokens: 2000,
				experimental_telemetry: llmTelemetry('quarry-feedback-coverage', { projectId }),
			});

			return output?.clusters ?? [];
		} catch (err) {
			this.logger.warn(`Feedback coverage: LLM clustering failed — ${String(err)}`);
			return [];
		}
	}

	private async applyFeedbackClusters(
		projectId: string,
		runId: string,
		clusters: FeedbackCluster[],
		context: { dismissedSet: Set<string>; existingByFingerprint: Map<string, ExistingRecommendation> },
	): Promise<void> {
		const { dismissedSet, existingByFingerprint } = context;
		const allLinked = clusters.flatMap((c) => c.memberMessageIds);
		const dismissedMemberIds = new Set<string>();

		for (const cluster of clusters) {
			const fingerprint = fingerprintFor(cluster.suggestedFile, cluster.subjectKey);
			if (dismissedSet.has(fingerprint)) {
				for (const messageId of cluster.memberMessageIds) {
					dismissedMemberIds.add(messageId);
				}
				continue;
			}
			const recId = await this.upsertBackfillRecommendation(
				projectId,
				runId,
				fingerprint,
				cluster,
				existingByFingerprint,
			);
			await this.recommendations.linkFeedbackToRecommendation(projectId, recId, cluster.memberMessageIds);
		}

		const unaccountedIds = (await this.getStillUnlinked(projectId, allLinked)).filter(
			(messageId) => !dismissedMemberIds.has(messageId),
		);
		if (unaccountedIds.length > 0) {
			const unlinked = await this.recommendations.getUnlinkedNegativeFeedbacks(projectId);
			const remaining = unlinked.filter((f) => unaccountedIds.includes(f.messageId));
			await this.applyFallbackRecos(projectId, runId, remaining, context);
		}
	}

	private async applyFallbackRecos(
		projectId: string,
		runId: string,
		unlinked: UnlinkedFeedback[],
		context: { dismissedSet: Set<string>; existingByFingerprint: Map<string, ExistingRecommendation> },
	): Promise<void> {
		if (unlinked.length === 0) {
			return;
		}
		const { dismissedSet, existingByFingerprint } = context;
		const memberMessageIds = unlinked.map((f) => f.messageId);
		const subjectKey = this.fallbackSubjectKey(memberMessageIds);
		const fingerprint = fingerprintFor(FALLBACK_SUGGESTED_FILE, subjectKey);
		if (dismissedSet.has(fingerprint)) {
			return;
		}

		const cluster: FeedbackCluster = {
			title: 'Downvoted responses awaiting review',
			summary:
				`${memberMessageIds.length} downvoted ${memberMessageIds.length === 1 ? 'response has' : 'responses have'} ` +
				'no matching recommendation yet. Review the linked chats to find the shared gap in the context.',
			suggestedAction:
				'Open the linked chats and update RULES.md or the relevant semantics file to address the recurring complaints.',
			suggestedFile: FALLBACK_SUGGESTED_FILE,
			subjectKey,
			memberMessageIds,
		};
		const recId = await this.upsertBackfillRecommendation(
			projectId,
			runId,
			fingerprint,
			cluster,
			existingByFingerprint,
		);
		await this.recommendations.linkFeedbackToRecommendation(projectId, recId, memberMessageIds);
	}

	private fallbackSubjectKey(messageIds: string[]): string {
		const digest = createHash('sha256')
			.update([...messageIds].sort().join(','))
			.digest('hex');
		return `${FALLBACK_SUBJECT_KEY}:${digest}`;
	}

	private async upsertBackfillRecommendation(
		projectId: string,
		runId: string,
		fingerprint: string,
		cluster: FeedbackCluster,
		existingByFingerprint: Map<string, ExistingRecommendation>,
	): Promise<string> {
		const existing = existingByFingerprint.get(fingerprint);
		if (existing) {
			return existing.id;
		}

		const byFingerprint = await this.recommendations.getRecommendationByFingerprint(projectId, fingerprint);
		if (byFingerprint) {
			return byFingerprint.id;
		}

		const rec = await this.recommendations.insertRecommendation({
			projectId,
			runId,
			fingerprint,
			suggestedFile: cluster.suggestedFile,
			subjectKey: cluster.subjectKey,
			title: cluster.title,
			summary: cluster.summary,
			suggestedAction: cluster.suggestedAction,
			category: 'other',
			insights: [
				{
					signalType: 'downvote_theme',
					metric: 'unaddressed_downvotes',
					count: cluster.memberMessageIds.length,
				},
			],
			impactScore: 0,
		});
		return rec.id;
	}

	private async getStillUnlinked(projectId: string, messageIds: string[]): Promise<string[]> {
		if (messageIds.length === 0) {
			return [];
		}
		const unlinked = await this.recommendations.getUnlinkedNegativeFeedbacks(projectId);
		const unlinkedSet = new Set(unlinked.map((f) => f.messageId));
		return messageIds.filter((id) => unlinkedSet.has(id));
	}
}
