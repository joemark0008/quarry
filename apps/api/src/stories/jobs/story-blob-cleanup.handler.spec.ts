import { afterEach, beforeEach, expect, it, vi } from 'vitest';

/**
 * The handler half of upstream `tests/story-blob-cleanup.test.ts`; the query itself
 * (`deleteUnreferencedFileBlobs`) is covered on Postgres by `test/stories-story-file.e2e-spec.ts`.
 */
const mocks = vi.hoisted(() => ({ deleteUnreferencedFileBlobs: vi.fn(async () => 0) }));

vi.mock('../story-queries.js', () => ({
	storyFileQueries: { deleteUnreferencedFileBlobs: mocks.deleteUnreferencedFileBlobs },
}));

import { JOB_HANDLER_KEY, type JobHandlerMetadata } from '../../jobs/job.decorator.js';
import { runStoryBlobCleanup, STORY_BLOB_CLEANUP_JOB_NAME, StoryBlobCleanupJob } from './story-blob-cleanup.handler.js';

const NOW = new Date('2026-10-29T04:30:00Z');

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
});

afterEach(() => {
	vi.useRealTimers();
	vi.clearAllMocks();
});

it('deletes unreferenced blobs older than a day', async () => {
	await runStoryBlobCleanup();

	expect(mocks.deleteUnreferencedFileBlobs).toHaveBeenCalledWith(new Date('2026-10-28T04:30:00Z'));
});

it('runs daily at 04:30 like upstream', async () => {
	const metadata = Reflect.getMetadata(JOB_HANDLER_KEY, StoryBlobCleanupJob.prototype.handle) as JobHandlerMetadata;
	expect(metadata).toMatchObject({ name: STORY_BLOB_CLEANUP_JOB_NAME, cron: '30 4 * * *' });

	await new StoryBlobCleanupJob().handle();
	expect(mocks.deleteUnreferencedFileBlobs).toHaveBeenCalledOnce();
});
