import { Module, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { bindStoryDeliveryRenderer } from '../jobs/story-delivery-renderer.js';
import { StoriesCoreModule } from '../stories-core.module.js';
import { closeBrowser } from '../utils/headless-browser.js';
import { bindStorySharingQueries } from './sharing-queries.js';
import { storyDeliveryRendering } from './story-delivery-rendering.js';
import { EmbedStoryDownloadController, StoryThumbnailController } from './story-sharing.controller.js';
import { StorySharingRepository } from './story-sharing.repository.js';
import {
	CustomStoryViewerDownloadResolver,
	EmbedResolver,
	SharedChatStoryResolver,
	SharedStoryResolver,
	StoryDownloadResolver,
	StoryThemeGenerateResolver,
} from './story-sharing.resolver.js';
import { StorySharingService } from './story-sharing.service.js';

/**
 * Story sharing (Phase 4 stage 3a): `trpc.sharedStory.*`, `trpc.embed.*`, story exports (`story.download*`,
 * `customStoryViewer.download`, `sharedChat.downloadStory`), `storyTheme.generate`, and the REST routes
 * `GET /api/stories/:storyId/thumbnail` and `GET /api/embed/story/:storyId/download`. Rendering runs in a shared
 * headless Chrome (`utils/headless-browser.ts`), closed with the module. The story repositories and the story
 * runtime (models for `generate`) are bound by `StoriesCoreModule` and `StoriesModule`.
 */
@Module({
	imports: [StoriesCoreModule],
	controllers: [StoryThumbnailController, EmbedStoryDownloadController],
	providers: [
		StorySharingRepository,
		StorySharingService,
		SharedStoryResolver,
		EmbedResolver,
		StoryDownloadResolver,
		CustomStoryViewerDownloadResolver,
		SharedChatStoryResolver,
		StoryThemeGenerateResolver,
	],
})
export class StorySharingModule implements OnModuleInit, OnModuleDestroy {
	constructor(private readonly repository: StorySharingRepository) {}

	onModuleInit(): void {
		bindStorySharingQueries({ mcpEndpoint: this.repository });
		bindStoryDeliveryRenderer(storyDeliveryRendering);
	}

	async onModuleDestroy(): Promise<void> {
		bindStorySharingQueries(null);
		bindStoryDeliveryRenderer(null);
		await closeBrowser();
	}
}
