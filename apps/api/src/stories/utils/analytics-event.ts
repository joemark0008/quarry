import type { AnalyticsAssetType, AnalyticsEventMetadata, AnalyticsEventType } from '@quarry/shared/types';
import { ANALYTICS_ASSET_TYPES } from '@quarry/shared/types';
import { z } from 'zod/v4';

import { logger } from '../../agent/utils/logger.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { storyQueries } from '../story-queries.js';

/**
 * Port of upstream `utils/analytics-event.ts` for the story events (page views, downloads, refreshes): story page
 * views rank the most viewed stories. The analytics pages themselves move with the `usage` module (Phase 6).
 */
export interface LogAnalyticsEventInput {
	projectId: string;
	type: AnalyticsEventType;
	assetType: AnalyticsAssetType;
	actorUserId: string | null;
	chatId?: string | null;
	storyId?: string | null;
	sharedChatId?: string | null;
	sharedStoryId?: string | null;
	metadata?: AnalyticsEventMetadata | null;
}

const assetIdConsistencySchema = z
	.object({
		assetType: z.enum(ANALYTICS_ASSET_TYPES),
		chatId: z.string().nullish(),
		storyId: z.string().nullish(),
	})
	.refine((input) => (input.assetType === 'chat' ? input.chatId != null : input.storyId != null), {
		message: "assetType 'chat' requires chatId and assetType 'story' requires storyId",
	});

async function isThrottled(input: LogAnalyticsEventInput): Promise<boolean> {
	if (input.type !== 'page_view' || !input.actorUserId) {
		return false;
	}
	const last = await storyQueries.getLastAnalyticsEvent({
		type: input.type,
		assetType: input.assetType,
		actorUserId: input.actorUserId,
		chatId: input.chatId ?? null,
		storyId: input.storyId ?? null,
	});
	return last !== null;
}

/** Callers don't await it: an analytics failure is logged and never fails the request. */
export async function logAnalyticsEvent(input: LogAnalyticsEventInput): Promise<void> {
	try {
		const consistency = assetIdConsistencySchema.safeParse(input);
		if (!consistency.success) {
			logger.error(`Skipped inconsistent analytics event '${input.type}': ${consistency.error.message}`, {
				source: 'system',
				projectId: input.projectId,
			});
			return;
		}
		if (await isThrottled(input)) {
			return;
		}
		await storyQueries.createAnalyticsEvent({
			projectId: input.projectId,
			type: input.type,
			assetType: input.assetType,
			actorUserId: input.actorUserId,
			chatId: input.chatId ?? null,
			storyId: input.storyId ?? null,
			sharedChatId: input.sharedChatId ?? null,
			sharedStoryId: input.sharedStoryId ?? null,
			metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
		});
	} catch (error) {
		logger.error(`Failed to log analytics event '${input.type}': ${String(error)}`, {
			source: 'system',
			projectId: input.projectId,
		});
	}
}
