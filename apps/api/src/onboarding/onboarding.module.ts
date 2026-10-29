import { Module } from '@nestjs/common';

import { AgentCoreModule } from '../agent/agent-core.module.js';
import { ProjectsCoreModule } from '../projects/projects-core.module.js';
import { OnboardingResolver } from './onboarding.resolver.js';
import { OnboardingService } from './onboarding.service.js';
import { OnboardingRulesService } from './onboarding-rules.service.js';

/** Onboarding (upstream `onboarding`): RULES.md generation; the agent's `generate_onboarding_rules` calls it. */
@Module({
	imports: [AgentCoreModule, ProjectsCoreModule],
	providers: [OnboardingRulesService, OnboardingService, OnboardingResolver],
	exports: [OnboardingService],
})
export class OnboardingModule {}
