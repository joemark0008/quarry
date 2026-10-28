import { Module } from '@nestjs/common';

import { ProjectRepository } from './project.repository.js';

/** Grows into the full projects module in Phase 2; for now project lookup and membership for access checks. */
@Module({
	providers: [ProjectRepository],
	exports: [ProjectRepository],
})
export class ProjectsModule {}
