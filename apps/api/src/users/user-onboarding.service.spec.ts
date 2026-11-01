import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrganizationRepository } from '../organizations/organization.repository.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { UserOnboardingService } from './user-onboarding.service.js';

/** Port of upstream `tests/auth-user-onboarding.service.test.ts`, minus the enterprise SSO cases. */
const tx = {};
const mocks = {
	addDefaultProject: vi.fn(),
	initializeDefaultOrganization: vi.fn(),
};

const service = new UserOnboardingService(
	{
		addUserToDefaultProjectIfExists: mocks.addDefaultProject,
		initializeDefaultOrganization: mocks.initializeDefaultOrganization,
	} as unknown as OrganizationRepository,
	{
		$transaction: (fn: (tx: unknown) => unknown) => fn(tx),
	} as unknown as PrismaService,
);

beforeEach(() => {
	mocks.addDefaultProject.mockReset().mockResolvedValue(undefined);
	mocks.initializeDefaultOrganization.mockReset().mockResolvedValue(undefined);
});

describe('initializeSelfHostedUserAfterCreation', () => {
	it.each(['google', 'github', 'gitlab'])('preserves default project onboarding for %s', async (providerId) => {
		await service.initializeSelfHostedUserAfterCreation('user-1', providerId);

		expect(mocks.initializeDefaultOrganization).toHaveBeenCalledWith('user-1', tx);
		expect(mocks.addDefaultProject).toHaveBeenCalledWith('user-1');
	});

	it('does not add an email and password user to the default project', async () => {
		await service.initializeSelfHostedUserAfterCreation('user-1', undefined);

		expect(mocks.initializeDefaultOrganization).toHaveBeenCalledWith('user-1', tx);
		expect(mocks.addDefaultProject).not.toHaveBeenCalled();
	});
});
