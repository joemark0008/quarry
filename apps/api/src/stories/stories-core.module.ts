import { Module, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { ChartRepository } from '../charts/chart.repository.js';
import { ChatRepository } from '../chats/chat.repository.js';
import { ChatsCoreModule } from '../chats/chats-core.module.js';
import { SharedChatRepository } from '../chats/shared-chat.repository.js';
import { ProjectRepository } from '../projects/project.repository.js';
import { ProjectsCoreModule } from '../projects/projects-core.module.js';
import { ExampleStoryRepository } from './repositories/example-story.repository.js';
import { FavoriteRepository } from './repositories/favorite.repository.js';
import { McpEmbedRepository } from './repositories/mcp-embed.repository.js';
import { SharedStoryRepository } from './repositories/shared-story.repository.js';
import { StoryRepository } from './repositories/story.repository.js';
import { StoryAppStateRepository } from './repositories/story-app-state.repository.js';
import { StoryDeliveryRepository } from './repositories/story-delivery.repository.js';
import { StoryFileRepository } from './repositories/story-file.repository.js';
import { StoryFolderRepository } from './repositories/story-folder.repository.js';
import { StoryReferenceRepository } from './repositories/story-reference.repository.js';
import { StoryThemeRepository } from './repositories/story-theme.repository.js';
import { bindStoryQueries } from './story-queries.js';

const REPOSITORIES = [
	StoryRepository,
	SharedStoryRepository,
	StoryFileRepository,
	StoryFolderRepository,
	StoryThemeRepository,
	StoryReferenceRepository,
	StoryDeliveryRepository,
	StoryAppStateRepository,
	FavoriteRepository,
	ExampleStoryRepository,
	McpEmbedRepository,
];

/**
 * Story persistence (ports of upstream `queries/story*.queries.ts`, favorites, MCP embeds), shared by the story
 * modules and the agent. Upstream's story services, the `story` tool and the story mounts stay module-level, so the
 * repositories are bound for them at boot (`story-queries.ts`).
 */
@Module({
	imports: [ChatsCoreModule, ProjectsCoreModule],
	providers: [...REPOSITORIES, ChartRepository, SharedChatRepository],
	exports: REPOSITORIES,
})
export class StoriesCoreModule implements OnModuleInit, OnModuleDestroy {
	constructor(
		private readonly story: StoryRepository,
		private readonly storyFile: StoryFileRepository,
		private readonly storyFolder: StoryFolderRepository,
		private readonly storyTheme: StoryThemeRepository,
		private readonly storyReference: StoryReferenceRepository,
		private readonly sharedStory: SharedStoryRepository,
		private readonly storyDelivery: StoryDeliveryRepository,
		private readonly storyAppState: StoryAppStateRepository,
		private readonly mcpEmbed: McpEmbedRepository,
		private readonly chart: ChartRepository,
		private readonly chat: ChatRepository,
		private readonly sharedChat: SharedChatRepository,
		private readonly project: ProjectRepository,
	) {}

	onModuleInit(): void {
		bindStoryQueries({
			story: this.story,
			storyFile: this.storyFile,
			storyFolder: this.storyFolder,
			storyTheme: this.storyTheme,
			storyReference: this.storyReference,
			sharedStory: this.sharedStory,
			storyDelivery: this.storyDelivery,
			storyAppState: this.storyAppState,
			mcpEmbed: this.mcpEmbed,
			chart: this.chart,
			chat: this.chat,
			sharedChat: this.sharedChat,
			project: this.project,
		});
	}

	onModuleDestroy(): void {
		bindStoryQueries(null);
	}
}
