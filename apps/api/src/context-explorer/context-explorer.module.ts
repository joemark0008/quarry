import { Module, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { ProjectsCoreModule } from '../projects/projects-core.module.js';
import { ContextBranchCleanupHandler } from './context-branch-cleanup.handler.js';
import { bindContextExplorerRepository } from './context-explorer.queries.js';
import { ContextExplorerRepository } from './context-explorer.repository.js';
import { ContextExplorerResolver } from './context-explorer.resolver.js';
import { ContextExplorerService } from './context-explorer.service.js';

/**
 * The context explorer (upstream `contextExplorer.*`): browse, read, edit and search the project context, and its
 * Git workflow (per-user worktrees, branches, commits, push, live context pulls). The Git and file services are
 * upstream's module-level code under `git/` and `files/`; the repository is bound for them at boot.
 */
@Module({
	imports: [ProjectsCoreModule],
	providers: [
		ContextExplorerRepository,
		ContextExplorerService,
		ContextExplorerResolver,
		ContextBranchCleanupHandler,
	],
	exports: [ContextExplorerService, ContextExplorerRepository],
})
export class ContextExplorerModule implements OnModuleInit, OnModuleDestroy {
	constructor(private readonly repository: ContextExplorerRepository) {}

	onModuleInit(): void {
		bindContextExplorerRepository(this.repository);
	}

	onModuleDestroy(): void {
		bindContextExplorerRepository(null);
	}
}
