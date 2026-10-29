import { Module, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { AgentModule } from '../agent/agent.module.js';
import { AgentService } from '../agent/agent.service.js';
import { AppDbRepository } from '../agent/app-db/app-db.repository.js';
import { LlmService } from '../agent/llm/llm.service.js';
import {
	ChatForkStoryResolver,
	CustomStoryViewerResolver,
	StoryFolderResolver,
	StoryResolver,
	StoryThemeResolver,
} from './stories.resolver.js';
import { StoriesService } from './stories.service.js';
import { StoriesCoreModule } from './stories-core.module.js';
import { bindStoryRuntime } from './story-queries.js';

/**
 * Stories (Phase 4): the GraphQL API of upstream's `story`, `storyFolder`, `storyTheme` and `customStoryViewer`
 * routers. The story services are upstream's module-level code; this module binds what they need from the agent
 * (tool context, app-database queries, model resolution, running agents) at boot, next to the repositories that
 * `StoriesCoreModule` binds.
 */
@Module({
	imports: [StoriesCoreModule, AgentModule],
	providers: [
		StoriesService,
		StoryResolver,
		StoryFolderResolver,
		StoryThemeResolver,
		CustomStoryViewerResolver,
		ChatForkStoryResolver,
	],
	exports: [StoriesService],
})
export class StoriesModule implements OnModuleInit, OnModuleDestroy {
	constructor(
		private readonly agent: AgentService,
		private readonly appDb: AppDbRepository,
		private readonly llm: LlmService,
	) {}

	onModuleInit(): void {
		bindStoryRuntime({
			buildToolContext: (opts) => this.agent.buildChatToolContext(opts),
			runScopedAppDbQuery: (projectId, sql) => this.appDb.runScopedAppDbQuery(projectId, sql),
			isAgentRunning: (chatId) => this.agent.get(chatId) !== undefined,
			llm: this.llm,
		});
	}

	onModuleDestroy(): void {
		bindStoryRuntime(null);
	}
}
