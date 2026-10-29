import { Injectable } from '@nestjs/common';
import { readFile } from '@quarry/shared/tools';

import type {
	ContextFileReadCost,
	ContextRecommendationFrequency,
	ContextRecommendationRunTrigger,
	WindowTotals,
} from '../agent/types/context-recommendation.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { DbExecutor } from '../prisma/prisma.types.js';
import type {
	ContextRecommendationConfigPatch,
	ContextRecommendationConfigRecord,
	ContextRecommendationRecord,
	ContextRecommendationRunRecord,
	FeedbackLink,
	FeedbackOwnershipRow,
	MessageRecommendationLink,
	NewContextRecommendation,
	UnlinkedFeedback,
} from './context-recommendation.types.js';

const CONTEXT_RECOMMENDATION_RUN_STALE_MS = 10 * 60 * 1_000;
const CONTEXT_RECOMMENDATION_RUN_STALE_MESSAGE = 'Context recommendations run did not finish before the timeout.';
const CONTEXT_RECOMMENDATION_RUN_CANCELLED_MESSAGE = 'Cancelled by user.';

/**
 * Statuses the reconciler must see, i.e. everything except `dismissed` (handled
 * separately as fingerprints). `applied` rows must be included so a re-recorded
 * fingerprint reopens the row instead of inserting a duplicate.
 */
const RECONCILABLE_STATUSES = ['open', 'applied'] as const;

const CONTEXT_FILE_READ_COST_LIMIT = 25;
const CHARS_PER_TOKEN = 4;

/** Port of upstream `queries/context-recommendation.queries.ts` (PostgreSQL only). */
@Injectable()
export class ContextRecommendationRepository {
	constructor(private readonly prisma: PrismaService) {}

	async getConfig(projectId: string): Promise<ContextRecommendationConfigRecord | null> {
		const config = await this.prisma.contextRecommendationConfig.findUnique({ where: { projectId } });
		return config as ContextRecommendationConfigRecord | null;
	}

	async listProjectRecommendationScheduleConfigs(): Promise<
		{ projectId: string; frequency: ContextRecommendationFrequency | null }[]
	> {
		const projects = await this.prisma.project.findMany({
			where: { path: { not: null } },
			select: { id: true, contextRecommendationConfig: { select: { frequency: true } } },
		});
		return projects.map((project) => ({
			projectId: project.id,
			frequency: (project.contextRecommendationConfig?.frequency ??
				null) as ContextRecommendationFrequency | null,
		}));
	}

	async updateConfig(
		projectId: string,
		patch: ContextRecommendationConfigPatch,
	): Promise<ContextRecommendationConfigRecord> {
		const cleanedPatch = Object.fromEntries(
			Object.entries(patch).filter(([, value]) => value !== undefined),
		) as ContextRecommendationConfigPatch;
		const config = await this.prisma.contextRecommendationConfig.upsert({
			where: { projectId },
			create: { projectId, ...cleanedPatch },
			update: { ...cleanedPatch, updatedAt: new Date() },
		});
		return config as ContextRecommendationConfigRecord;
	}

	async createRun(input: {
		projectId: string;
		trigger: ContextRecommendationRunTrigger;
		windowStart?: Date;
		windowEnd?: Date;
		llmProvider?: string;
		llmModelId?: string;
	}): Promise<ContextRecommendationRunRecord> {
		const run = await this.prisma.contextRecommendationRun.create({ data: input });
		return run as ContextRecommendationRunRecord;
	}

	async setRunChat(runId: string, chatId: string, executor: DbExecutor = this.prisma): Promise<void> {
		await executor.contextRecommendationRun.update({ where: { id: runId }, data: { chatId } });
	}

	async completeRun(
		runId: string,
		patch: {
			inputTotalTokens?: number;
			outputTotalTokens?: number;
			totalTokens?: number;
			llmProvider?: string;
			llmModelId?: string;
		} = {},
		executor: DbExecutor = this.prisma,
	): Promise<void> {
		await executor.contextRecommendationRun.updateMany({
			where: { id: runId, status: 'running' },
			data: { status: 'completed', completedAt: new Date(), ...patch },
		});
	}

	async failRun(runId: string, errorMessage: string): Promise<void> {
		await this.prisma.contextRecommendationRun.updateMany({
			where: { id: runId, status: 'running' },
			data: { status: 'failed', completedAt: new Date(), errorMessage },
		});
	}

	/**
	 * Flips a running context recommendations run to `cancelled`. Guarded by
	 * `status = 'running'` so it's idempotent and safely no-ops on already-terminal
	 * runs (including those completed concurrently by the agent loop).
	 */
	async cancelRun(runId: string): Promise<boolean> {
		const { count } = await this.prisma.contextRecommendationRun.updateMany({
			where: { id: runId, status: 'running' },
			data: {
				status: 'cancelled',
				completedAt: new Date(),
				errorMessage: CONTEXT_RECOMMENDATION_RUN_CANCELLED_MESSAGE,
			},
		});
		return count > 0;
	}

	async failStaleRuns(projectId: string): Promise<number> {
		const cutoff = new Date(Date.now() - CONTEXT_RECOMMENDATION_RUN_STALE_MS);
		const { count } = await this.prisma.contextRecommendationRun.updateMany({
			where: { projectId, status: 'running', startedAt: { lte: cutoff } },
			data: { status: 'failed', completedAt: new Date(), errorMessage: CONTEXT_RECOMMENDATION_RUN_STALE_MESSAGE },
		});
		return count;
	}

	async getReconcilableRecommendations(projectId: string): Promise<ContextRecommendationRecord[]> {
		const rows = await this.prisma.contextRecommendation.findMany({
			where: { projectId, status: { in: [...RECONCILABLE_STATUSES] } },
		});
		return rows as unknown as ContextRecommendationRecord[];
	}

	async getDismissedFingerprints(projectId: string): Promise<string[]> {
		const rows = await this.prisma.contextRecommendation.findMany({
			where: { projectId, status: 'dismissed' },
			select: { fingerprint: true },
		});
		return rows.map((row) => row.fingerprint);
	}

	async insertRecommendation(
		value: NewContextRecommendation,
		executor: DbExecutor = this.prisma,
	): Promise<ContextRecommendationRecord> {
		const rec = await executor.contextRecommendation.create({ data: toRecommendationData(value) });
		return rec as unknown as ContextRecommendationRecord;
	}

	async updateRecommendation(
		id: string,
		patch: Partial<NewContextRecommendation>,
		executor: DbExecutor = this.prisma,
	): Promise<void> {
		await executor.contextRecommendation.update({
			where: { id },
			data: { ...toRecommendationData(patch), lastSeenAt: new Date() },
		});
	}

	async listRecommendations(
		projectId: string,
		status?: ContextRecommendationRecord['status'],
	): Promise<ContextRecommendationRecord[]> {
		const rows = await this.prisma.contextRecommendation.findMany({
			where: { projectId, ...(status && { status }) },
			orderBy: { impactScore: 'desc' },
		});
		return rows as unknown as ContextRecommendationRecord[];
	}

	async getRecommendationByFingerprint(
		projectId: string,
		fingerprint: string,
	): Promise<ContextRecommendationRecord | null> {
		const rec = await this.prisma.contextRecommendation.findFirst({ where: { projectId, fingerprint } });
		return rec as unknown as ContextRecommendationRecord | null;
	}

	async getRecommendationById(projectId: string, id: string): Promise<ContextRecommendationRecord | null> {
		const rec = await this.prisma.contextRecommendation.findFirst({ where: { id, projectId } });
		return rec as unknown as ContextRecommendationRecord | null;
	}

	async setRecommendationPr(id: string, pr: { prUrl: string; prBranch: string; prCreatedAt: Date }): Promise<void> {
		await this.prisma.contextRecommendation.update({ where: { id }, data: pr });
	}

	async getLatestRun(projectId: string): Promise<ContextRecommendationRunRecord | null> {
		await this.failStaleRuns(projectId);
		const run = await this.prisma.contextRecommendationRun.findFirst({
			where: { projectId },
			orderBy: { startedAt: 'desc' },
		});
		return run as ContextRecommendationRunRecord | null;
	}

	async getLatestSuccessfulRun(projectId: string): Promise<ContextRecommendationRunRecord | null> {
		const run = await this.prisma.contextRecommendationRun.findFirst({
			where: { projectId, status: 'completed' },
			orderBy: { completedAt: { sort: 'desc', nulls: 'last' } },
		});
		return run as ContextRecommendationRunRecord | null;
	}

	async getRunById(projectId: string, runId: string): Promise<ContextRecommendationRunRecord | null> {
		const run = await this.prisma.contextRecommendationRun.findFirst({ where: { id: runId, projectId } });
		return run as ContextRecommendationRunRecord | null;
	}

	async setRecommendationStatus(input: {
		id: string;
		projectId: string;
		status: ContextRecommendationRecord['status'];
		userId: string;
	}): Promise<void> {
		await this.prisma.contextRecommendation.updateMany({
			where: { id: input.id, projectId: input.projectId },
			data: { status: input.status, statusChangedAt: new Date(), statusChangedBy: input.userId },
		});
	}

	/** Total friction signals (errors, downvotes, regenerations) for a project over a window. */
	async getWindowTotals(projectId: string, start: Date, end: Date): Promise<WindowTotals> {
		const analysisChats = analysisChatIdsSql(projectId);
		const [[errors], [downvotes], [regenerations]] = await Promise.all([
			this.prisma.$queryRaw<{ n: bigint }[]>`
				SELECT count(*) AS n
				FROM message_part mp
				JOIN chat_message cm ON cm.id = mp.message_id
				JOIN chat c ON c.id = cm.chat_id
				WHERE c.project_id = ${projectId}
					AND c.id NOT IN (${analysisChats})
					AND mp.tool_state = 'output-error'
					AND mp.created_at >= ${start} AND mp.created_at < ${end}`,
			this.prisma.$queryRaw<{ n: bigint }[]>`
				SELECT count(*) AS n
				FROM message_feedback mf
				JOIN chat_message cm ON cm.id = mf.message_id
				JOIN chat c ON c.id = cm.chat_id
				WHERE c.project_id = ${projectId}
					AND c.id NOT IN (${analysisChats})
					AND mf.vote = 'down'
					AND mf.created_at >= ${start} AND mf.created_at < ${end}`,
			this.prisma.$queryRaw<{ n: bigint }[]>`
				SELECT count(*) AS n
				FROM chat_message cm
				JOIN chat c ON c.id = cm.chat_id
				WHERE c.project_id = ${projectId}
					AND c.id NOT IN (${analysisChats})
					AND cm.superseded_at IS NOT NULL
					AND cm.created_at >= ${start} AND cm.created_at < ${end}`,
		]);
		return {
			errors: Number(errors?.n ?? 0),
			downvotes: Number(downvotes?.n ?? 0),
			regenerations: Number(regenerations?.n ?? 0),
		};
	}

	/** Aggregated read-token cost of a single context file over the analysis window. */
	async getContextFileReadCosts(projectId: string, start: Date, end: Date): Promise<ContextFileReadCost[]> {
		const maxChars = readFile.MODEL_OUTPUT_MAX_CHARS;
		const rows = await this.prisma.$queryRaw<
			{ filePath: string | null; readCount: bigint; totalChars: bigint; maxChars: number; maxRawChars: number }[]
		>`
			SELECT
				mp.tool_input->>'file_path' AS "filePath",
				count(*) AS "readCount",
				coalesce(sum(least(length(mp.tool_output->>'content'), ${maxChars})), 0) AS "totalChars",
				coalesce(max(least(length(mp.tool_output->>'content'), ${maxChars})), 0) AS "maxChars",
				coalesce(max(length(mp.tool_output->>'content')), 0) AS "maxRawChars"
			FROM message_part mp
			JOIN chat_message cm ON cm.id = mp.message_id
			JOIN chat c ON c.id = cm.chat_id
			WHERE c.project_id = ${projectId}
				AND c.id NOT IN (${analysisChatIdsSql(projectId)})
				AND (cm."isForked" IS NULL OR cm."isForked" = false)
				AND mp.tool_name = 'read'
				AND mp.tool_state = 'output-available'
				AND mp.created_at >= ${start} AND mp.created_at < ${end}
			GROUP BY mp.tool_input->>'file_path'
			ORDER BY "totalChars" DESC
			LIMIT ${CONTEXT_FILE_READ_COST_LIMIT}`;

		return rows
			.filter((row): row is typeof row & { filePath: string } => Boolean(row.filePath))
			.map((row) => {
				const readCount = Number(row.readCount ?? 0);
				const totalTokens = Math.ceil(Number(row.totalChars ?? 0) / CHARS_PER_TOKEN);
				const maxTokens = Math.ceil(Number(row.maxChars ?? 0) / CHARS_PER_TOKEN);
				return {
					filePath: row.filePath,
					readCount,
					totalTokens,
					avgTokens: readCount > 0 ? Math.round(totalTokens / readCount) : 0,
					maxTokens,
					truncated: Number(row.maxRawChars ?? 0) > maxChars,
				};
			});
	}

	/** The earliest-created admin of a project, falling back to org admins, used to attribute scheduled runs. */
	async getFirstProjectAdminUserId(projectId: string): Promise<string> {
		const adminUserId =
			(await this.getFirstDirectProjectAdminUserId(projectId)) ??
			(await this.getFirstInheritedOrgAdminUserId(projectId));
		if (!adminUserId) {
			throw new Error(`No admin found for project ${projectId}`);
		}
		return adminUserId;
	}

	/** Returns title, owner id and owner name for a list of chat IDs, scoped to the project. */
	async getRecommendationChatMetadata(
		projectId: string,
		chatIds: string[],
	): Promise<{ chatId: string; title: string; userId: string; userName: string }[]> {
		if (chatIds.length === 0) {
			return [];
		}
		const chats = await this.prisma.chat.findMany({
			where: { projectId, id: { in: chatIds } },
			select: { id: true, title: true, userId: true, user: { select: { name: true } } },
		});
		return chats.map((chat) => ({
			chatId: chat.id,
			title: chat.title,
			userId: chat.userId,
			userName: chat.user?.name ?? '',
		}));
	}

	/**
	 * Resolves the canonical chatId for a set of trigger targets (message ids or tool
	 * call ids), scoped to the project. Recommendation runs record trigger refs from LLM
	 * output, which occasionally transcribes a chatId incorrectly; a targetId that maps to
	 * a real message is the reliable source of truth for which chat a finding belongs to.
	 */
	async resolveTriggerTargetChatIds(projectId: string, targetIds: string[]): Promise<Map<string, string>> {
		if (targetIds.length === 0) {
			return new Map();
		}
		const liveProjectChat = { projectId, deletedAt: null };
		const [byMessageId, byToolCallId] = await Promise.all([
			this.prisma.chatMessage.findMany({
				where: { id: { in: targetIds }, chat: liveProjectChat },
				select: { id: true, chatId: true },
			}),
			this.prisma.messagePart.findMany({
				where: { toolCallId: { in: targetIds }, chatMessage: { chat: liveProjectChat } },
				select: { toolCallId: true, chatMessage: { select: { chatId: true } } },
			}),
		]);
		const resolved = new Map<string, string>();
		for (const row of byMessageId) {
			resolved.set(row.id, row.chatId);
		}
		for (const row of byToolCallId) {
			if (row.toolCallId) {
				resolved.set(row.toolCallId, row.chatMessage.chatId);
			}
		}
		return resolved;
	}

	/** Returns the subset of the given chatIds that exist in the project. */
	async filterExistingProjectChatIds(projectId: string, chatIds: string[]): Promise<Set<string>> {
		if (chatIds.length === 0) {
			return new Set();
		}
		const rows = await this.prisma.chat.findMany({
			where: { projectId, deletedAt: null, id: { in: chatIds } },
			select: { id: true },
		});
		return new Set(rows.map((row) => row.id));
	}

	/** Sum of token usage across every message of a run's chat. */
	async getChatTokenTotals(
		chatId: string,
	): Promise<{ inputTotalTokens: number; outputTotalTokens: number; totalTokens: number }> {
		const { _sum } = await this.prisma.chatMessage.aggregate({
			where: { chatId },
			_sum: { inputTotalTokens: true, outputTotalTokens: true, totalTokens: true },
		});
		return {
			inputTotalTokens: Number(_sum.inputTotalTokens ?? 0),
			outputTotalTokens: Number(_sum.outputTotalTokens ?? 0),
			totalTokens: Number(_sum.totalTokens ?? 0),
		};
	}

	async linkFeedbackToRecommendation(
		projectId: string,
		recommendationId: string,
		messageIds: string[],
		executor: DbExecutor = this.prisma,
	): Promise<void> {
		const scopedMessageIds = await this.filterProjectMessageIds(projectId, messageIds, executor);
		if (scopedMessageIds.length === 0) {
			return;
		}
		const recommendation = await executor.contextRecommendation.findFirst({
			where: { id: recommendationId, projectId },
			select: { id: true },
		});
		if (!recommendation) {
			return;
		}
		await executor.contextRecommendationLinkedFeedback.createMany({
			data: scopedMessageIds.map((messageId) => ({ recommendationId, messageId })),
			skipDuplicates: true,
		});
	}

	async filterProjectMessageIds(
		projectId: string,
		messageIds: string[],
		executor: DbExecutor = this.prisma,
	): Promise<string[]> {
		if (messageIds.length === 0) {
			return [];
		}
		const rows = await executor.chatMessage.findMany({
			where: { id: { in: messageIds }, chat: { projectId, deletedAt: null } },
			select: { id: true },
		});
		return rows.map((row) => row.id);
	}

	async listAllFeedbackLinks(projectId: string): Promise<FeedbackOwnershipRow[]> {
		const links = await this.prisma.contextRecommendationLinkedFeedback.findMany({
			where: { contextRecommendation: { projectId } },
			select: {
				messageId: true,
				recommendationId: true,
				contextRecommendation: { select: { status: true, impactScore: true, createdAt: true, insights: true } },
			},
		});
		return links.map(({ messageId, recommendationId, contextRecommendation }) => ({
			messageId,
			recommendationId,
			...(contextRecommendation as unknown as Pick<
				FeedbackOwnershipRow,
				'status' | 'impactScore' | 'createdAt' | 'insights'
			>),
		}));
	}

	async deleteFeedbackLinks(
		links: { recommendationId: string; messageId: string }[],
		executor: DbExecutor = this.prisma,
	): Promise<void> {
		if (links.length === 0) {
			return;
		}
		await executor.contextRecommendationLinkedFeedback.deleteMany({
			where: {
				OR: links.map((link) => ({ recommendationId: link.recommendationId, messageId: link.messageId })),
			},
		});
	}

	async getUnlinkedNegativeFeedbacks(projectId: string): Promise<UnlinkedFeedback[]> {
		const feedbacks = await this.prisma.messageFeedback.findMany({
			where: {
				vote: 'down',
				chatMessage: {
					chat: { projectId, deletedAt: null },
					contextRecommendationLinkedFeedbacks: { none: {} },
				},
			},
			select: {
				messageId: true,
				explanation: true,
				createdAt: true,
				chatMessage: { select: { chatId: true, chat: { select: { user: { select: { name: true } } } } } },
			},
		});
		return feedbacks.map((feedback) => ({
			messageId: feedback.messageId,
			chatId: feedback.chatMessage.chatId,
			explanation: feedback.explanation,
			createdAt: feedback.createdAt,
			userName: feedback.chatMessage.chat.user.name,
		}));
	}

	async listFeedbacksForRecommendations(projectId: string, recIds: string[]): Promise<FeedbackLink[]> {
		if (recIds.length === 0) {
			return [];
		}
		const links = await this.prisma.contextRecommendationLinkedFeedback.findMany({
			where: {
				recommendationId: { in: recIds },
				chatMessage: { chat: { projectId }, messageFeedback: { isNot: null } },
			},
			select: {
				recommendationId: true,
				messageId: true,
				chatMessage: {
					select: {
						chatId: true,
						messageFeedback: { select: { vote: true, explanation: true } },
						chat: { select: { user: { select: { name: true } } } },
					},
				},
			},
		});
		return links.flatMap(({ recommendationId, messageId, chatMessage }) =>
			chatMessage.messageFeedback
				? [
						{
							recommendationId,
							messageId,
							chatId: chatMessage.chatId,
							vote: chatMessage.messageFeedback.vote as FeedbackLink['vote'],
							explanation: chatMessage.messageFeedback.explanation,
							userName: chatMessage.chat.user.name,
						},
					]
				: [],
		);
	}

	async getRecommendationLinksForMessages(
		projectId: string,
		messageIds: string[],
	): Promise<MessageRecommendationLink[]> {
		if (messageIds.length === 0) {
			return [];
		}
		const links = await this.prisma.contextRecommendationLinkedFeedback.findMany({
			where: { messageId: { in: messageIds }, contextRecommendation: { projectId } },
			select: {
				messageId: true,
				contextRecommendation: { select: { id: true, title: true, status: true, createdAt: true } },
			},
			orderBy: [{ contextRecommendation: { createdAt: 'desc' } }, { contextRecommendation: { id: 'asc' } }],
		});
		return links.map(({ messageId, contextRecommendation }) => ({
			messageId,
			recommendationId: contextRecommendation.id,
			title: contextRecommendation.title,
			status: contextRecommendation.status as MessageRecommendationLink['status'],
		}));
	}

	/** The run's period start: the end of the last completed run, else `fallback`. */
	async getLastCompletedRunAt(projectId: string): Promise<Date | null> {
		const last = await this.prisma.contextRecommendationRun.findFirst({
			where: { projectId, status: 'completed' },
			orderBy: { completedAt: { sort: 'desc', nulls: 'last' } },
			select: { completedAt: true },
		});
		return last?.completedAt ?? null;
	}

	/** Runs `work` in one transaction (upstream `db.transaction`), handing it the transaction client. */
	transaction<T>(work: (executor: DbExecutor) => Promise<T>): Promise<T> {
		return this.prisma.$transaction((tx) => work(tx));
	}

	private async getFirstDirectProjectAdminUserId(projectId: string): Promise<string | undefined> {
		const admin = await this.prisma.projectMember.findFirst({
			where: { projectId, role: 'admin' },
			orderBy: { createdAt: 'asc' },
			select: { userId: true },
		});
		return admin?.userId;
	}

	/** Org admins only inherit the admin role on projects where they have no explicit project role. */
	private async getFirstInheritedOrgAdminUserId(projectId: string): Promise<string | undefined> {
		const [admin] = await this.prisma.$queryRaw<{ userId: string }[]>`
			SELECT om.user_id AS "userId"
			FROM project p
			JOIN org_member om ON om.org_id = p.org_id AND om.role = 'admin'
			LEFT JOIN project_member pm ON pm.project_id = p.id AND pm.user_id = om.user_id
			WHERE p.id = ${projectId} AND pm.user_id IS NULL
			ORDER BY om.created_at ASC
			LIMIT 1`;
		return admin?.userId;
	}
}

function analysisChatIdsSql(projectId: string): Prisma.Sql {
	return Prisma.sql`SELECT chat_id FROM context_recommendation_run WHERE project_id = ${projectId} AND chat_id IS NOT NULL`;
}

/** JSON columns need Prisma's null sentinels; everything else maps 1:1. */
function toRecommendationData<T extends Partial<NewContextRecommendation>>(value: T) {
	const { impact, insights, proposedEdits, ...rest } = value;
	return {
		...rest,
		...(impact !== undefined && {
			impact: impact === null ? Prisma.DbNull : (impact as unknown as Prisma.InputJsonValue),
		}),
		...(insights !== undefined && { insights: insights as unknown as Prisma.InputJsonValue }),
		...(proposedEdits !== undefined && {
			proposedEdits: proposedEdits === null ? Prisma.DbNull : (proposedEdits as unknown as Prisma.InputJsonValue),
		}),
	};
}
