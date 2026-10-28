import { Module } from '@nestjs/common';

import { ProjectsModule } from '../projects/projects.module.js';
import { OrganizationRepository } from './organization.repository.js';

/** Grows into the full organizations module in Phase 6; for now membership and first-user setup. */
@Module({
	imports: [ProjectsModule],
	providers: [OrganizationRepository],
	exports: [OrganizationRepository],
})
export class OrganizationsModule {}
