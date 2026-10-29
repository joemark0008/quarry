import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { ProjectAccess, ProjectAdmin } from '../common/decorators/access.decorator.js';
import { CurrentProject } from '../common/decorators/current.decorator.js';
import type { Project } from '../generated/prisma/client.js';
import { ContextSyncService } from './context-sync.service.js';
import { ContextSyncStatus } from './models/context-sync-status.model.js';

@Resolver(() => ContextSyncStatus)
export class ContextSyncResolver {
	constructor(private readonly contextSync: ContextSyncService) {}

	@ProjectAccess()
	@Query(() => ContextSyncStatus)
	contextSyncStatus(@CurrentProject() project: Project): Promise<ContextSyncStatus> {
		return this.contextSync.getStatus(project);
	}

	@ProjectAdmin()
	@Mutation(() => ContextSyncStatus, {
		description: 'Queues a `context.sync` job that writes the warehouse schemas and table previews to the context.',
	})
	syncContext(
		@CurrentProject() project: Project,
		@Args('select', { type: () => [String], nullable: true }) select?: string[] | null,
	): Promise<ContextSyncStatus> {
		return this.contextSync.requestSync(project, select);
	}
}
