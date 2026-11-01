import { Module } from '@nestjs/common';

import { ProjectsCoreModule } from '../projects/projects-core.module.js';
import { ContextExplorerRepository } from './context-explorer.repository.js';
import { ContextExplorerResolver } from './context-explorer.resolver.js';
import { ContextExplorerService } from './context-explorer.service.js';

/**
 * The context explorer (upstream `contextExplorer.*`): browse, read, edit and search the project context files in
 * the project folder. The file services are upstream's module-level code under `files/`.
 */
@Module({
	imports: [ProjectsCoreModule],
	providers: [ContextExplorerRepository, ContextExplorerService, ContextExplorerResolver],
	exports: [ContextExplorerService],
})
export class ContextExplorerModule {}
