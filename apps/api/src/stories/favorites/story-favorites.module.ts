import { Module, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { bindStoryJobQueries, unbindStoryJobQueries } from '../jobs/story-job-queries.js';
import { FavoriteRepository } from '../repositories/favorite.repository.js';
import { StoriesService } from '../stories.service.js';
import { StoriesCoreModule } from '../stories-core.module.js';
import { FavoriteResolver } from './favorite.resolver.js';

/** Favorite stories and story folders (upstream `trpc.favorite.*`) on the stage-1 `FavoriteRepository`. */
@Module({
	imports: [StoriesCoreModule],
	providers: [StoriesService, FavoriteResolver],
})
export class StoryFavoritesModule implements OnModuleInit, OnModuleDestroy {
	constructor(private readonly favorites: FavoriteRepository) {}

	onModuleInit(): void {
		bindStoryJobQueries({ favorite: this.favorites });
	}

	onModuleDestroy(): void {
		unbindStoryJobQueries('favorite');
	}
}
