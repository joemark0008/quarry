import { Module } from '@nestjs/common';

import { OrganizationsModule } from '../organizations/organizations.module.js';
import { UserRepository } from './user.repository.js';

/** The user repository, shared by the auth module and the users module (no resolvers). */
@Module({
	imports: [OrganizationsModule],
	providers: [UserRepository],
	exports: [UserRepository],
})
export class UsersCoreModule {}
