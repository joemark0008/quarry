import { Module } from '@nestjs/common';

import { OrganizationsModule } from '../organizations/organizations.module.js';
import { UsersCoreModule } from '../users/users-core.module.js';
import { SystemResolver } from './system.resolver.js';
import { SystemService } from './system.service.js';
import { VersionCheckService } from './version-check.service.js';

@Module({
	imports: [UsersCoreModule, OrganizationsModule],
	providers: [SystemResolver, SystemService, VersionCheckService],
})
export class SystemModule {}
