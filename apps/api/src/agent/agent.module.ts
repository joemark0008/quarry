import { Module } from '@nestjs/common';

import { ChatsCoreModule } from '../chats/chats-core.module.js';
import { ProjectsCoreModule } from '../projects/projects-core.module.js';
import { WarehouseModule } from '../warehouse/warehouse.module.js';
import { AgentController } from './agent.controller.js';
import { AgentService } from './agent.service.js';
import { AppDbRepository } from './app-db/app-db.repository.js';
import { LlmService } from './llm/llm.service.js';
import { ProjectLlmConfigRepository } from './llm/project-llm-config.repository.js';
import { CompactionService } from './services/compaction.js';

/** The chat agent: `POST /api/agent`, model resolution and the tool registry (PLAN.md §6 `agent`). */
@Module({
	imports: [ProjectsCoreModule, WarehouseModule, ChatsCoreModule],
	controllers: [AgentController],
	providers: [AgentService, LlmService, ProjectLlmConfigRepository, CompactionService, AppDbRepository],
	exports: [AgentService, LlmService, ProjectLlmConfigRepository, CompactionService],
})
export class AgentModule {}
