import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrganizationRepository } from '../organizations/organization.repository.js';
import { UserOnboardingService } from './user-onboarding.service.js';

/** Port of upstream `tests/auth-user-onboarding.service.test.ts`, minus the enterprise SSO cases. */
const mocks = {
	addDefaultOrganization: vi.fn(),
	addDefaultProject: vi.fn(),
	initializeDefaultOrganization: vi.fn(),
};

const service = new UserOnboardingService({
	addUserToDefaultOrganizationIfExists: mocks.addDefaultOrganization,
	addUserToDefaultProjectIfExists: mocks.addDefaultProject,
	initializeDefaultOrganizationForFirstUser: mocks.initializeDefaultOrganization,
} as unknown as OrganizationRepository);

beforeEach(() => {
	mocks.addDefaultOrganization.mockReset().mockResolvedValue(undefined);
	mocks.addDefaultProject.mockReset().mockResolvedValue(undefined);
	mocks.initializeDefaultOrganization.mockReset().mockResolvedValue(undefined);
});

describe('initializeSelfHostedUserAfterCreation', () => {
	it.each(['google', 'github', 'gitlab'])('preserves default project onboarding for %s', async (providerId) => {
		await service.initializeSelfHostedUserAfterCreation('user-1', providerId);

		expect(mocks.initializeDefaultOrganization).toHaveBeenCalledWith('user-1');
		expect(mocks.addDefaultProject).toHaveBeenCalledWith('user-1');
		expect(mocks.addDefaultOrganization).not.toHaveBeenCalled();
	});

	it('does not add an email and password user to the default project', async () => {
		await service.initializeSelfHostedUserAfterCreation('user-1', undefined);

		expect(mocks.initializeDefaultOrganization).toHaveBeenCalledWith('user-1');
		expect(mocks.addDefaultOrganization).not.toHaveBeenCalled();
		expect(mocks.addDefaultProject).not.toHaveBeenCalled();
	});
});
