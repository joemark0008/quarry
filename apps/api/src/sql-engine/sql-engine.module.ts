import { Module } from '@nestjs/common';

import { SqlEngineService } from './sql-engine.service.js';

@Module({
	providers: [SqlEngineService],
	exports: [SqlEngineService],
})
export class SqlEngineModule {}
