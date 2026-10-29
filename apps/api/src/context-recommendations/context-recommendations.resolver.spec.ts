import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthUser } from '../auth/auth.service.js';
import type { Project } from '../generated/prisma/client.js';
import type { ContextRecommendationsHandler } from './context-recommendations.handler.js';
import { ContextRecommendationsResolver } from './context-recommendations.resolver.js';
import { ContextRecommendationsService } from './context-recommendations.service.js';

/**
 * Port of upstream `context-recommendation.routes.test.ts`. Its two cloud-billing cases ("blocks protected
 * mutations through the shared cloud billing gate", "keeps reads available when billing access is restricted")
 * are not ported: billing is dropped. The beta flag gate takes their place.
 */
const mocks = {
	getLatestRun: vi.fn(),
	getProjectAvailableModels: vi.fn(),
	ensureContextRecommendationsSchedule: vi.fn(),
};

const project = { id: 'project-id' } as Project;
const user = { id: 'user-id' } as AuthUser;

function createResolver(enabled = true) {
	const service = new ContextRecommendationsService(
		{ getLatestRun: mocks.getLatestRun, updateConfig: vi.fn() } as never,
		{} as never,
		{ get: vi.fn() } as never,
		{ getProjectAvailableModels: mocks.getProjectAvailableModels } as never,
		{} as never,
		{} as never,
		{} as never,
		{ env: { BETA_CONTEXT_RECOMMENDATIONS_ENABLED: enabled } } as never,
	);
	const runContextRecommendations = vi
		.spyOn(service, 'runContextRecommendations')
		.mockResolvedValue({ runId: 'run-id' });
	const handler = { ensureContextRecommendationsSchedule: mocks.ensureContextRecommendationsSchedule };
	const resolver = new ContextRecommendationsResolver(service, handler as unknown as ContextRecommendationsHandler);
	return { resolver, runContextRecommendations };
}

describe('context recommendation resolver', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getLatestRun.mockResolvedValue(null);
		mocks.getProjectAvailableModels.mockResolvedValue([]);
	});

	it('lists models for the project', async () => {
		await createResolver().resolver.contextRecommendationAvailableModels(project);

		expect(mocks.getProjectAvailableModels).toHaveBeenCalledWith('project-id');
	});

	it('attributes manual runs to the user who triggered them', async () => {
		const { resolver, runContextRecommendations } = createResolver();

		await expect(resolver.runContextRecommendations(project, user)).resolves.toEqual({ started: true });

		expect(runContextRecommendations).toHaveBeenCalledWith('project-id', {
			trigger: 'manual',
			triggeredByUserId: 'user-id',
		});
	});

	it('refuses a manual run while one is in progress', async () => {
		mocks.getLatestRun.mockResolvedValue({ id: 'run-id', status: 'running' });
		const { resolver, runContextRecommendations } = createResolver();

		await expect(resolver.runContextRecommendations(project, user)).rejects.toMatchObject({
			codeMessage: 'CONFLICT',
		});
		expect(runContextRecommendations).not.toHaveBeenCalled();
	});

	it('returns the latest run', async () => {
		const latestRun = { id: 'run-id', status: 'completed' };
		mocks.getLatestRun.mockResolvedValue(latestRun);

		await expect(createResolver().resolver.latestContextRecommendationRun(project)).resolves.toEqual(latestRun);
	});

	it('reschedules the project when its frequency changes', async () => {
		await createResolver().resolver.setContextRecommendationConfig(project, { frequency: 'daily' });

		expect(mocks.ensureContextRecommendationsSchedule).toHaveBeenCalledWith('project-id', 'daily', {
			reset: true,
		});
	});

	it('rejects every procedure when the instance disables recommendations', () => {
		expect(() => createResolver(false).resolver.latestContextRecommendationRun(project)).toThrow(
			'Context recommendations are disabled on this instance.',
		);
	});

	it('explains that pull requests are not available yet', () => {
		expect(() => createResolver().resolver.createContextRecommendationPullRequest('rec-id')).toThrow(
			/GitHub or GitLab connection/,
		);
	});
});
