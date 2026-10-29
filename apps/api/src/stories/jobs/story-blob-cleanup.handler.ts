import { Injectable } from '@nestjs/common';

import { Job } from '../../jobs/job.decorator.js';
import { storyFileQueries } from '../story-queries.js';

const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

export const STORY_BLOB_CLEANUP_JOB_NAME = 'story.blob-cleanup';

/** Port of upstream `handlers/story-blob-cleanup.handler.ts`: drops file blobs no story file uses after a day. */
export async function runStoryBlobCleanup(): Promise<void> {
	await storyFileQueries.deleteUnreferencedFileBlobs(new Date(Date.now() - GRACE_PERIOD_MS));
}

/** Upstream registered it with `ensureRecurring({ cron: '30 4 * * *' })`. */
@Injectable()
export class StoryBlobCleanupJob {
	@Job(STORY_BLOB_CLEANUP_JOB_NAME, { cron: '30 4 * * *' })
	async handle(): Promise<void> {
		await runStoryBlobCleanup();
	}
}
