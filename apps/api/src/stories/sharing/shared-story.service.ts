import type { SharedStory } from '../../generated/prisma/client.js';
import { syncStoryDeliveryJob } from '../services/story-schedule.js';
import { sharedStoryQueries, storyDeliveryQueries, storyFolderQueries, storyQueries } from '../story-queries.js';

/** Port of upstream `services/shared-story.service.ts`. */

type StoryShare = Pick<SharedStory, 'id' | 'storyId' | 'projectId' | 'userId'>;

/** Delivery is torn down first: an enabled delivery without a share would reach every project member. */
export async function unshareStory(share: StoryShare): Promise<void> {
	await teardownStoryDelivery(share.storyId);
	await sharedStoryQueries.deleteSharedStory(share.id);
	await makeStoryPrivate(share);
}

/** Keeps the share if it was limited to specific people after being listed for revocation. */
export async function unshareProjectWideStory(share: StoryShare): Promise<void> {
	await teardownStoryDelivery(share.storyId);
	if (await sharedStoryQueries.deleteProjectWideSharedStory(share.id)) {
		await makeStoryPrivate(share);
	}
}

/**
 * Upstream `story-delivery.service` `teardownStoryDelivery`, minus the notification unsubscribes (notifications are
 * Phase 5).
 */
async function teardownStoryDelivery(storyId: string): Promise<void> {
	await syncStoryDeliveryJob(storyId, false, null);
	await storyDeliveryQueries.disableAndResetRecipients(storyId);
}

async function makeStoryPrivate(share: StoryShare): Promise<void> {
	const storyOwnerId = (await storyQueries.getStoryOwnerId(share.storyId)) ?? share.userId;
	await storyFolderQueries.ensureStoryPrivate(share.storyId, { storyOwnerId, projectId: share.projectId });
}
