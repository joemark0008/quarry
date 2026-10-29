import { Module } from '@nestjs/common';

import { AgentModule } from '../agent/agent.module.js';
import { AgentCoreModule } from '../agent/agent-core.module.js';
import { ChatsCoreModule } from '../chats/chats-core.module.js';
import { ProjectsCoreModule } from '../projects/projects-core.module.js';
import { ContextRecommendationRepository } from './context-recommendation.repository.js';
import { ContextRecommendationFeedbackCoverage } from './context-recommendations.feedback-coverage.js';
import { ContextRecommendationsHandler } from './context-recommendations.handler.js';
import { ContextRecommendationsResolver } from './context-recommendations.resolver.js';
import { ContextRecommendationsService } from './context-recommendations.service.js';

/**
 * Context recommendations (upstream `context-recommendation`): the settings API, the analysis run and its
 * `context.recommendations` pg-boss job, scheduled per project.
 */
@Module({
	imports: [AgentModule, AgentCoreModule, ChatsCoreModule, ProjectsCoreModule],
	providers: [
		ContextRecommendationRepository,
		ContextRecommendationFeedbackCoverage,
		ContextRecommendationsService,
		ContextRecommendationsHandler,
		ContextRecommendationsResolver,
	],
	exports: [ContextRecommendationsService, ContextRecommendationsHandler, ContextRecommendationRepository],
})
export class ContextRecommendationsModule {}
