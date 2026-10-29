import { Injectable } from '@nestjs/common';
import type { RepoProvider } from '@quarry/shared/types';

import type { Activity, ContextRecommendationConfig, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { OpenReviewRequestResult } from './git/review-request-provider.js';

const ACTIVITY_RUN_STALE_MS = 30 * 60 * 1_000;
const ACTIVITY_RUN_STALE_MESSAGE = 'Activity did not finish before the timeout.';
const CONTEXT_PULL_HISTORY_LIMIT = 100;

export interface ContextPullActivityRow {
	id: string;
	status: string;
	payload: Record<string, unknown> | null;
	errorMessage: string | null;
	startedAt: Date;
	completedAt: Date | null;
	actorName: string | null;
}

export interface ContextRepositoryConfigPatch {
	repoFullName?: string | null;
	repoProvider?: RepoProvider | null;
}

export interface ContextRulesPreviewGroup {
	id: string;
	name: string;
	isDefault: boolean;
}

/**
 * The context explorer's queries: upstream `queries/context-branch-ownership.queries.ts`, the repository columns of
 * `context-recommendation.queries.ts` (`getConfig` / `updateConfig`), and the `context.pulled` activities of
 * `activity.queries.ts`.
 */
@Injectable()
export class ContextExplorerRepository {
	constructor(private readonly prisma: PrismaService) {}

	listContextBranchOwnerships(): Promise<Array<{ id: string; projectId: string; branch: string; userId: string }>> {
		return this.prisma.contextBranchOwnership.findMany({
			select: { id: true, projectId: true, branch: true, userId: true },
		});
	}

	async claimContextBranch(projectId: string, branch: string, userId: string): Promise<boolean> {
		const claimed = await this.prisma.contextBranchOwnership.createMany({
			data: { projectId, branch, userId },
			skipDuplicates: true,
		});
		return claimed.count > 0;
	}

	async releaseContextBranch(projectId: string, branch: string, userId: string): Promise<void> {
		await this.prisma.contextBranchOwnership.deleteMany({ where: { projectId, branch, userId } });
	}

	async getOwnedContextBranches(projectId: string, userId: string): Promise<Set<string>> {
		const rows = await this.prisma.contextBranchOwnership.findMany({
			where: { projectId, userId },
			select: { branch: true },
		});
		return new Set(rows.map((row) => row.branch));
	}

	async isContextBranchOwnedByUser(projectId: string, branch: string, userId: string): Promise<boolean> {
		const row = await this.prisma.contextBranchOwnership.findFirst({
			where: { projectId, branch, userId },
			select: { id: true },
		});
		return row !== null;
	}

	async getContextBranchReviewRequest(
		projectId: string,
		branch: string,
		userId: string,
	): Promise<OpenReviewRequestResult | null> {
		const row = await this.prisma.contextBranchOwnership.findFirst({
			where: { projectId, branch, userId },
			select: { reviewRequestUrl: true, reviewRequestKind: true },
		});
		return row?.reviewRequestUrl && row.reviewRequestKind
			? { url: row.reviewRequestUrl, kind: row.reviewRequestKind as OpenReviewRequestResult['kind'] }
			: null;
	}

	async setContextBranchReviewRequest(
		projectId: string,
		branch: string,
		userId: string,
		reviewRequest: OpenReviewRequestResult,
	): Promise<void> {
		await this.prisma.contextBranchOwnership.updateMany({
			where: { projectId, branch, userId },
			data: { reviewRequestUrl: reviewRequest.url, reviewRequestKind: reviewRequest.kind },
		});
	}

	getConfig(projectId: string): Promise<ContextRecommendationConfig | null> {
		return this.prisma.contextRecommendationConfig.findUnique({ where: { projectId } });
	}

	updateConfig(projectId: string, patch: ContextRepositoryConfigPatch): Promise<ContextRecommendationConfig> {
		const cleanedPatch = Object.fromEntries(
			Object.entries(patch).filter(([, value]) => value !== undefined),
		) as ContextRepositoryConfigPatch;
		return this.prisma.contextRecommendationConfig.upsert({
			where: { projectId },
			create: { projectId, ...cleanedPatch },
			update: { ...cleanedPatch, updatedAt: new Date() },
		});
	}

	startContextPullActivity(projectId: string, userId: string): Promise<Activity> {
		return this.prisma.activity.create({
			data: { projectId, userId, type: 'context.pulled', trigger: 'manual', status: 'running' },
		});
	}

	async listContextPullActivities(projectId: string): Promise<ContextPullActivityRow[]> {
		await this.failStaleActivities();
		const rows = await this.prisma.activity.findMany({
			where: { projectId, type: 'context.pulled', trigger: 'manual' },
			select: {
				id: true,
				status: true,
				payload: true,
				errorMessage: true,
				startedAt: true,
				completedAt: true,
				user: { select: { name: true } },
			},
			orderBy: { startedAt: 'desc' },
			take: CONTEXT_PULL_HISTORY_LIMIT,
		});
		return rows.map(({ user, payload, ...row }) => ({
			...row,
			payload: (payload ?? null) as Record<string, unknown> | null,
			actorName: user?.name ?? null,
		}));
	}

	async completeActivity(activityId: string, payload?: Record<string, unknown> | null): Promise<void> {
		await this.prisma.activity.updateMany({
			where: { id: activityId, status: 'running' },
			data: {
				status: 'completed',
				completedAt: new Date(),
				...(payload !== undefined && { payload: (payload ?? undefined) as Prisma.InputJsonValue | undefined }),
			},
		});
	}

	async failActivity(activityId: string, errorMessage: string): Promise<void> {
		await this.prisma.activity.updateMany({
			where: { id: activityId, status: 'running' },
			data: { status: 'failed', completedAt: new Date(), errorMessage },
		});
	}

	/**
	 * Upstream `listActiveUserGroups` for the rules preview. Every group counts as active: upstream locks groups
	 * only past its license limits, and user-group management is Phase 6.
	 */
	listActiveUserGroups(projectId: string): Promise<ContextRulesPreviewGroup[]> {
		return this.prisma.userGroup.findMany({
			where: { projectId },
			select: { id: true, name: true, isDefault: true },
			orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
		});
	}

	private async failStaleActivities(): Promise<number> {
		const cutoff = new Date(Date.now() - ACTIVITY_RUN_STALE_MS);
		const result = await this.prisma.activity.updateMany({
			where: { status: 'running', startedAt: { lte: cutoff } },
			data: { status: 'failed', completedAt: new Date(), errorMessage: ACTIVITY_RUN_STALE_MESSAGE },
		});
		return result.count;
	}
}
