import { Module, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { FeedbackRepository } from '../../chats/feedback.repository.js';
import { bindStoryJobQueries, unbindStoryJobQueries } from '../jobs/story-job-queries.js';
import { StoriesService } from '../stories.service.js';
import { StoriesCoreModule } from '../stories-core.module.js';
import { StoryFeedbackResolver } from './story-feedback.resolver.js';

/**
 * Story feedback (upstream `trpc.feedback.getStoryFeedback` / `submitStoryFeedback`) on the chats module's
 * `FeedbackRepository` (upstream's `feedback.queries` holds message and story feedback). The owner's notification
 * needs `StoryJobsModule` (the notifications stand-in).
 */
@Module({
	imports: [StoriesCoreModule],
	providers: [FeedbackRepository, StoriesService, StoryFeedbackResolver],
})
export class StoryFeedbackModule implements OnModuleInit, OnModuleDestroy {
	constructor(private readonly feedback: FeedbackRepository) {}

	onModuleInit(): void {
		bindStoryJobQueries({ feedback: this.feedback });
	}

	onModuleDestroy(): void {
		unbindStoryJobQueries('feedback');
	}
}
