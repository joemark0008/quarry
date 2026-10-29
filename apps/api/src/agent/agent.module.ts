import { Module } from '@nestjs/common';

import { AttachmentsModule } from '../attachments/attachments.module.js';
import { ChatsCoreModule } from '../chats/chats-core.module.js';
import { MemoryModule } from '../memory/memory.module.js';
import { OnboardingModule } from '../onboarding/onboarding.module.js';
import { ProjectsCoreModule } from '../projects/projects-core.module.js';
import { QueryToolsModule } from '../query-tools/query-tools.module.js';
import { SandboxModule } from '../sandbox/sandbox.module.js';
import { SkillsModule } from '../skills/skills.module.js';
import { StoriesCoreModule } from '../stories/stories-core.module.js';
import { WarehouseModule } from '../warehouse/warehouse.module.js';
import { AgentController } from './agent.controller.js';
import { AgentService } from './agent.service.js';
import { AgentCoreModule } from './agent-core.module.js';
import { AppDbRepository } from './app-db/app-db.repository.js';
import { CompactionService } from './services/compaction.js';

/** The chat agent: `POST /api/agent`, model resolution and the tool registry (PLAN.md §6 `agent`). */
@Module({
	imports: [
		AgentCoreModule,
		ProjectsCoreModule,
		WarehouseModule,
		ChatsCoreModule,
		SandboxModule,
		AttachmentsModule,
		SkillsModule,
		MemoryModule,
		OnboardingModule,
		StoriesCoreModule,
		QueryToolsModule,
	],
	controllers: [AgentController],
	providers: [AgentService, CompactionService, AppDbRepository],
	exports: [AgentService, AgentCoreModule, CompactionService, AppDbRepository],
})
export class AgentModule {}
