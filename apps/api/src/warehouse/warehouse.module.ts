import { Module } from '@nestjs/common';

import { SqlEngineModule } from '../sql-engine/sql-engine.module.js';
import { WarehouseResolver } from './warehouse.resolver.js';
import { WarehouseConnectionService } from './warehouse-connection.service.js';
import { WarehouseCredentialsRepository } from './warehouse-credentials.repository.js';
import { WarehouseCredentialsService } from './warehouse-credentials.service.js';
import { WarehouseSqlService } from './warehouse-sql.service.js';

/** Warehouse connection and credentials (upstream `warehouse-*.ts`, `project-warehouse-credentials.queries.ts`). */
@Module({
	imports: [SqlEngineModule],
	providers: [
		WarehouseCredentialsRepository,
		WarehouseCredentialsService,
		WarehouseConnectionService,
		WarehouseSqlService,
		WarehouseResolver,
	],
	exports: [WarehouseCredentialsService, WarehouseConnectionService, WarehouseSqlService, SqlEngineModule],
})
export class WarehouseModule {}
