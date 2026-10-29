import { Module, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { UserRepository } from '../../users/user.repository.js';
import { UsersCoreModule } from '../../users/users-core.module.js';
import { bindStoryScheduler } from '../services/story-schedule.js';
import { StoriesCoreModule } from '../stories-core.module.js';
import { StoryBlobCleanupJob } from './story-blob-cleanup.handler.js';
import { StoryDeliveryJob } from './story-delivery.handler.js';
import { bindStoryJobQueries, unbindStoryJobQueries } from './story-job-queries.js';
import { StoryNotificationRepository } from './story-notification.repository.js';
import { StoryRefreshJob } from './story-refresh.handler.js';
import { PgBossStoryScheduler } from './story-scheduler.service.js';

/**
 * The story jobs (Phase 4 stage 3): `story.refresh`, `story.deliver` and `story.blob-cleanup` on pg-boss, and the
 * pg-boss scheduler behind `story-schedule.ts`, so saving a story's refresh or delivery schedule creates or removes
 * its pg-boss schedule. The handlers are upstream's module-level code; this module binds what they need at boot.
 */
@Module({
	imports: [StoriesCoreModule, UsersCoreModule],
	providers: [
		StoryRefreshJob,
		StoryDeliveryJob,
		StoryBlobCleanupJob,
		PgBossStoryScheduler,
		StoryNotificationRepository,
	],
	exports: [StoryNotificationRepository],
})
export class StoryJobsModule implements OnModuleInit, OnModuleDestroy {
	constructor(
		private readonly scheduler: PgBossStoryScheduler,
		private readonly users: UserRepository,
		private readonly notifications: StoryNotificationRepository,
	) {}

	onModuleInit(): void {
		bindStoryScheduler(this.scheduler);
		bindStoryJobQueries({ user: this.users, notification: this.notifications });
	}

	onModuleDestroy(): void {
		bindStoryScheduler(null);
		unbindStoryJobQueries('user', 'notification');
	}
}
