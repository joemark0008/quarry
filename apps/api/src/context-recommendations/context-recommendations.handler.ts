import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';

import {
	CONTEXT_RECOMMENDATION_FREQUENCY_CRON,
	type ContextRecommendationFrequency,
	DEFAULT_CONTEXT_RECOMMENDATION_FREQUENCY,
} from '../agent/types/context-recommendation.js';
import { ConfigService } from '../config/config.service.js';
import { Job } from '../jobs/job.decorator.js';
import { JobsService } from '../jobs/jobs.service.js';
import { ContextRecommendationRepository } from './context-recommendation.repository.js';
import { ContextRecommendationsService } from './context-recommendations.service.js';

export const CONTEXT_RECOMMENDATIONS_JOB_NAME = 'context.recommendations';

interface ContextRecommendationsJobPayload {
	projectId?: unknown;
}

const BOSS_READY_POLL_MS = 500;
const BOSS_READY_TIMEOUT_MS = 60_000;

/**
 * Port of upstream `handlers/context-recommendations.handler.ts` on pg-boss: one schedule per project on the
 * `context.recommendations` queue (pg-boss schedule `key` = project id, upstream's per-project `uniqueKey`), cron
 * from the project's configured frequency, registered for every project at boot.
 */
@Injectable()
export class ContextRecommendationsHandler implements OnApplicationBootstrap {
	private readonly logger = new Logger(ContextRecommendationsHandler.name);

	constructor(
		private readonly recommendations: ContextRecommendationsService,
		private readonly repository: ContextRecommendationRepository,
		private readonly jobs: JobsService,
		private readonly config: ConfigService,
	) {}

	/**
	 * A run records its own failure (`context_recommendation_run.status`) and costs a full agent run, so a failed
	 * job is not retried: the next scheduled run (or a manual one) picks the window up again.
	 */
	@Job(CONTEXT_RECOMMENDATIONS_JOB_NAME, { retryLimit: 0, expireInSeconds: 3600 })
	async handle(payload: ContextRecommendationsJobPayload): Promise<void> {
		const projectId = resolveContextRecommendationsProjectId(payload);
		const latestRun = await this.repository.getLatestRun(projectId);
		if (latestRun?.status === 'running') {
			this.logger.warn(
				`Skipping scheduled context recommendations for project ${projectId}: a run is already in progress.`,
			);
			return;
		}
		await this.recommendations.runContextRecommendations(projectId);
	}

	/** Registers the schedules once pg-boss is up, without holding up the rest of the boot. */
	onApplicationBootstrap(): void {
		if (!this.config.env.BETA_CONTEXT_RECOMMENDATIONS_ENABLED || this.config.isTest) {
			return;
		}
		void this.whenBossReady()
			.then(() => this.ensureContextRecommendationsSchedules())
			.catch((error) => {
				this.logger.error(
					`Failed to register context recommendations schedules: ${error instanceof Error ? error.message : String(error)}`,
				);
			});
	}

	/**
	 * Register (or update) the recurring analysis job for the given frequency. pg-boss replaces a schedule's cron in
	 * place, so upstream's `reset` (move the next run to the new cadence now) is what always happens here.
	 */
	async ensureContextRecommendationsSchedule(
		projectId: string,
		frequency: ContextRecommendationFrequency,
		_options?: { reset?: boolean },
	): Promise<void> {
		await this.jobs
			.getBoss()
			.schedule(
				CONTEXT_RECOMMENDATIONS_JOB_NAME,
				CONTEXT_RECOMMENDATION_FREQUENCY_CRON[frequency],
				{ projectId },
				{ tz: 'UTC', key: contextRecommendationsJobUniqueKey(projectId) },
			);
	}

	/**
	 * Registers the default schedule for a project created after server startup, so
	 * it does not have to wait for a restart (or a manual frequency change) to get
	 * analyzed. Best-effort: a scheduling failure must not fail project creation.
	 */
	async ensureContextRecommendationsScheduleForNewProject(projectId: string): Promise<void> {
		if (!this.config.env.BETA_CONTEXT_RECOMMENDATIONS_ENABLED) {
			return;
		}
		try {
			await this.ensureContextRecommendationsSchedule(projectId, DEFAULT_CONTEXT_RECOMMENDATION_FREQUENCY);
		} catch (err) {
			this.logger.error(
				`Failed to register context recommendations schedule for project ${projectId}: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	}

	/** Upstream also deleted the legacy global job; its pg-boss counterpart is the schedule without a key. */
	async ensureContextRecommendationsSchedules(): Promise<void> {
		await this.jobs.getBoss().unschedule(CONTEXT_RECOMMENDATIONS_JOB_NAME);

		const configs = await this.repository.listProjectRecommendationScheduleConfigs();
		for (const config of configs) {
			await this.ensureContextRecommendationsSchedule(
				config.projectId,
				config.frequency ?? DEFAULT_CONTEXT_RECOMMENDATION_FREQUENCY,
			);
		}
	}

	private async whenBossReady(): Promise<void> {
		const deadline = Date.now() + BOSS_READY_TIMEOUT_MS;
		for (;;) {
			try {
				this.jobs.getBoss();
				return;
			} catch (error) {
				if (Date.now() > deadline) {
					throw error;
				}
				await new Promise((resolve) => setTimeout(resolve, BOSS_READY_POLL_MS));
			}
		}
	}
}

export function resolveContextRecommendationsProjectId(payload: ContextRecommendationsJobPayload): string {
	if (typeof payload.projectId !== 'string') {
		throw new Error('Context recommendations job is missing a projectId payload.');
	}
	return payload.projectId;
}

/** The project's schedule key. pg-boss keys can't contain upstream's `:` separator, so it is `/`. */
export function contextRecommendationsJobUniqueKey(projectId: string): string {
	return `${CONTEXT_RECOMMENDATIONS_JOB_NAME}/${projectId}`;
}
