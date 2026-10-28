import { Injectable } from '@nestjs/common';

import { OrganizationRepository } from '../organizations/organization.repository.js';

/** Social providers whose new users join the default project (upstream `auth-user-onboarding.service.ts`). */
const DEFAULT_PROJECT_PROVIDERS = new Set(['google', 'github', 'gitlab']);

@Injectable()
export class UserOnboardingService {
	constructor(private readonly organizations: OrganizationRepository) {}

	/**
	 * Runs after better-auth creates a user. The first user gets the default organization (and the
	 * default project when NAO_DEFAULT_PROJECT_PATH is set); later social sign-ups join the default
	 * project. Email and password users are added by an admin instead.
	 *
	 * Upstream also routes enterprise SSO users (OIDC, Microsoft) to the default organization only;
	 * quarry's own OIDC login (Phase 6) will add that branch back.
	 */
	async initializeSelfHostedUserAfterCreation(userId: string, providerId: string | undefined): Promise<void> {
		await this.organizations.initializeDefaultOrganizationForFirstUser(userId);

		if (providerId && DEFAULT_PROJECT_PROVIDERS.has(providerId)) {
			await this.organizations.addUserToDefaultProjectIfExists(userId);
		}
	}
}
