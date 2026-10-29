import { Module } from '@nestjs/common';

import { WarehouseModule } from '../warehouse/warehouse.module.js';
import { QueryToolRepository } from './query-tool.repository.js';
import { QueryToolResolver } from './query-tool.resolver.js';
import { QueryToolService } from './query-tool.service.js';

/** Saved query tools: the settings API, and the definitions the agent turns into `qt_<name>` tools. */
@Module({
	imports: [WarehouseModule],
	providers: [QueryToolRepository, QueryToolService, QueryToolResolver],
	exports: [QueryToolService],
})
export class QueryToolsModule {}
