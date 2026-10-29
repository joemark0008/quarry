import { Module } from '@nestjs/common';

import { ChatsCoreModule } from '../chats/chats-core.module.js';
import { ProjectsCoreModule } from '../projects/projects-core.module.js';
import { WarehouseModule } from '../warehouse/warehouse.module.js';
import { AgentController } from './agent.controller.js';
import { AgentService } from './agent.service.js';
import { LlmService } from './llm/llm.service.js';
import { ProjectLlmConfigRepository } from './llm/project-llm-config.repository.js';

/** The chat agent: `POST /api/agent`, model resolution and the tool registry (PLAN.md §6 `agent`). */
@Module({
	imports: [ProjectsCoreModule, WarehouseModule, ChatsCoreModule],
	controllers: [AgentController],
	providers: [AgentService, LlmService, ProjectLlmConfigRepository],
	exports: [AgentService, LlmService, ProjectLlmConfigRepository],
})
export class AgentModule {}
