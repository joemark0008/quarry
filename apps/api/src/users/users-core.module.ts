import { Module } from '@nestjs/common';

import { OrganizationsModule } from '../organizations/organizations.module.js';
import { UserRepository } from './user.repository.js';
import { UserOnboardingService } from './user-onboarding.service.js';

/** The user repository and onboarding, shared by the auth module and the users module (no resolvers). */
@Module({
	imports: [OrganizationsModule],
	providers: [UserRepository, UserOnboardingService],
	exports: [UserRepository, UserOnboardingService],
})
export class UsersCoreModule {}
