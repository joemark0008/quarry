import { Module } from '@nestjs/common';

import { LlmService } from './llm/llm.service.js';
import { ProjectLlmConfigRepository } from './llm/project-llm-config.repository.js';

/** Model resolution, shared by the agent and the modules it calls back into (memory, onboarding, recommendations). */
@Module({
	providers: [LlmService, ProjectLlmConfigRepository],
	exports: [LlmService, ProjectLlmConfigRepository],
})
export class AgentCoreModule {}
