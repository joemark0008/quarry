import { Module } from '@nestjs/common';

import { ChatsCoreModule } from '../chats/chats-core.module.js';
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

/** Story persistence (ports of upstream `queries/story*.queries.ts`, favorites, MCP embeds), shared by the story modules. */
@Module({
	imports: [ChatsCoreModule],
	providers: REPOSITORIES,
	exports: REPOSITORIES,
})
export class StoriesCoreModule {}
