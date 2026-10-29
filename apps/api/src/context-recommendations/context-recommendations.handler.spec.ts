import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConfigService } from '../config/config.service.js';
import type { JobsService } from '../jobs/jobs.service.js';
import type { ContextRecommendationRepository } from './context-recommendation.repository.js';
import {
	CONTEXT_RECOMMENDATIONS_JOB_NAME,
	ContextRecommendationsHandler,
	contextRecommendationsJobUniqueKey,
} from './context-recommendations.handler.js';
import type { ContextRecommendationsService } from './context-recommendations.service.js';

/**
 * Port of upstream `context-recommendations.handler.test.ts`. Upstream's `ensureRecurring` (its own scheduler
 * table) is pg-boss `schedule()` keyed per project here, and the legacy global job is the unkeyed schedule.
 */
const mocks = {
	schedule: vi.fn(),
	unschedule: vi.fn(),
	getLatestRun: vi.fn(),
	listProjectRecommendationScheduleConfigs: vi.fn(),
	runContextRecommendations: vi.fn(),
};

function createHandler() {
	const service = { runContextRecommendations: mocks.runContextRecommendations };
	const repository = {
		getLatestRun: mocks.getLatestRun,
		listProjectRecommendationScheduleConfigs: mocks.listProjectRecommendationScheduleConfigs,
	};
	const jobs = { getBoss: () => ({ schedule: mocks.schedule, unschedule: mocks.unschedule }) };
	const config = { env: { BETA_CONTEXT_RECOMMENDATIONS_ENABLED: true }, isTest: true };
	return new ContextRecommendationsHandler(
		service as unknown as ContextRecommendationsService,
		repository as unknown as ContextRecommendationRepository,
		jobs as unknown as JobsService,
		config as unknown as ConfigService,
	);
}

describe('context recommendations scheduling', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getLatestRun.mockResolvedValue(null);
	});

	it('uses one recurring job key per project', async () => {
		const handler = createHandler();

		await handler.ensureContextRecommendationsSchedule('project-daily', 'daily', { reset: true });
		await handler.ensureContextRecommendationsSchedule('project-monthly', 'monthly');

		expect(mocks.schedule).toHaveBeenCalledTimes(2);
		expect(mocks.schedule).toHaveBeenNthCalledWith(
			1,
			CONTEXT_RECOMMENDATIONS_JOB_NAME,
			'0 3 * * *',
			{ projectId: 'project-daily' },
			{ tz: 'UTC', key: contextRecommendationsJobUniqueKey('project-daily') },
		);
		expect(mocks.schedule).toHaveBeenNthCalledWith(
			2,
			CONTEXT_RECOMMENDATIONS_JOB_NAME,
			'0 3 1 * *',
			{ projectId: 'project-monthly' },
			{ tz: 'UTC', key: contextRecommendationsJobUniqueKey('project-monthly') },
		);
	});

	it('uses schedule keys pg-boss accepts', () => {
		expect(contextRecommendationsJobUniqueKey('a1b2-c3')).toMatch(/^[\w.\-/]+$/);
	});

	it('registers every project schedule on startup and removes the legacy global job', async () => {
		mocks.listProjectRecommendationScheduleConfigs.mockResolvedValue([
			{ projectId: 'project-default', frequency: null },
			{ projectId: 'project-monthly', frequency: 'monthly' },
		]);

		await createHandler().ensureContextRecommendationsSchedules();

		expect(mocks.unschedule).toHaveBeenCalledWith(CONTEXT_RECOMMENDATIONS_JOB_NAME);
		expect(mocks.schedule).toHaveBeenCalledTimes(2);
		expect(mocks.schedule).toHaveBeenNthCalledWith(
			1,
			CONTEXT_RECOMMENDATIONS_JOB_NAME,
			'0 3 * * 1',
			{ projectId: 'project-default' },
			expect.objectContaining({ key: contextRecommendationsJobUniqueKey('project-default') }),
		);
		expect(mocks.schedule).toHaveBeenNthCalledWith(
			2,
			CONTEXT_RECOMMENDATIONS_JOB_NAME,
			'0 3 1 * *',
			{ projectId: 'project-monthly' },
			expect.objectContaining({ key: contextRecommendationsJobUniqueKey('project-monthly') }),
		);
	});

	it('runs recommendations only for the project in the job payload', async () => {
		await createHandler().handle({ projectId: 'project-1' });

		// quarry: upstream also passed `billingAccessVerifiedProjectId` (billing dropped).
		expect(mocks.runContextRecommendations).toHaveBeenCalledWith('project-1');
	});

	it('rejects legacy global jobs without a project payload', async () => {
		await expect(createHandler().handle({})).rejects.toThrow(
			'Context recommendations job is missing a projectId payload.',
		);
		expect(mocks.runContextRecommendations).not.toHaveBeenCalled();
	});

	it('skips the scheduled run when one is already in progress', async () => {
		mocks.getLatestRun.mockResolvedValue({ status: 'running' });

		await createHandler().handle({ projectId: 'project-1' });

		expect(mocks.runContextRecommendations).not.toHaveBeenCalled();
	});
});
