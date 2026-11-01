import { Module } from '@nestjs/common';

import { ProjectsCoreModule } from '../projects/projects-core.module.js';
import { WarehouseModule } from '../warehouse/warehouse.module.js';
import { ContextSyncHandler } from './context-sync.handler.js';
import { ContextSyncResolver } from './context-sync.resolver.js';
import { ContextSyncService } from './context-sync.service.js';

/** In-app context sync: port of `upstream_core/commands/sync` run as the `context.sync` pg-boss job. */
@Module({
	imports: [ProjectsCoreModule, WarehouseModule],
	providers: [ContextSyncService, ContextSyncHandler, ContextSyncResolver],
	exports: [ContextSyncService],
})
export class ContextSyncModule {}
