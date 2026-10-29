import { Injectable } from '@nestjs/common';
import {
	NOTIFICATION_CHANNELS,
	type NotificationChannel,
	type StoryRefreshNotificationPayload,
} from '@quarry/shared/types';
import type { Job as BossJob } from 'pg-boss';

import { withKeyedLock } from '../../agent/utils/keyed-lock.js';
import { logger } from '../../agent/utils/logger.js';
import type { Story as DBStory } from '../../generated/prisma/client.js';
import { Job } from '../../jobs/job.decorator.js';
import { JOB_DEFAULTS } from '../../jobs/jobs.service.js';
import type { StoryShareAccess } from '../repositories/shared-story.repository.js';
import type {
	StoryDeliveryRow as DBStoryDelivery,
	StoryDeliveryRow,
} from '../repositories/story-delivery.repository.js';
import { refreshStoryData } from '../services/live-story.js';
import { resolveDeliveryRecipientUserIds } from '../services/story-recipients.js';
import { enqueueOnce, STORY_DELIVERY_JOB_NAME } from '../services/story-schedule.js';
import { sharedStoryQueries, storyDeliveryQueries, storyQueries } from '../story-queries.js';
import { storyPath } from '../utils/story-links.js';
import {
	buildStoryEmailHtml,
	buildStoryPdfAttachment,
	renderCustomStoryPdf,
	type StoryDeliveryQueryData,
} from './story-delivery-renderer.js';
import { userQueries } from './story-job-queries.js';
import {
	type ChannelDeliveryAttempt,
	type EmailAttachment,
	NotificationChannelDeliveryError,
	notifyUsers,
} from './story-notifications.js';

export { STORY_DELIVERY_JOB_NAME };

type StoryQueryData = StoryDeliveryQueryData;

export type StoryDeliveryJobPayload = {
	storyId?: string;
	skipDeliveries?: ChannelDeliveryAttempt[];
	/** quarry: how many channel-error retries came before this job (see `storyDeliveryHandler`). */
	channelRetry?: number;
};

type DeliveryContext = {
	delivery: DBStoryDelivery;
	story: DBStory;
	projectId: string;
	recipientUserIds: string[];
};

/**
 * Port of upstream `handlers/story-delivery.handler.ts` (`story.deliver`). Upstream's scheduler stored the channels
 * that already went out in the job's payload before its retry; a pg-boss job's payload can't change, so a
 * channel-level failure queues a follow-up `story.deliver` job carrying the merged `skipDeliveries` (on upstream's
 * backoff, up to its retry limit) instead of failing the job and having pg-boss resend everything. Notifications
 * themselves are a stand-in until Phase 5 (`story-notifications.ts`), and rendering comes through
 * `story-delivery-renderer.ts`.
 */
export async function storyDeliveryHandler(
	payload: StoryDeliveryJobPayload,
	job?: Pick<BossJob<object>, 'id'>,
): Promise<void> {
	if (!payload.storyId) {
		throw new Error('storyId is required.');
	}
	const storyId = payload.storyId;
	const previousSkips = parseSkipDeliveries(payload.skipDeliveries);
	try {
		await runScheduledStoryDelivery(storyId, previousSkips);
	} catch (error) {
		const channelRetry = typeof payload.channelRetry === 'number' ? payload.channelRetry : 0;
		if (job && error instanceof NotificationChannelDeliveryError && channelRetry < JOB_DEFAULTS.retryLimit) {
			await enqueueOnce({
				name: STORY_DELIVERY_JOB_NAME,
				payload: {
					storyId,
					skipDeliveries: mergeSkipDeliveries(previousSkips, error.succeeded),
					channelRetry: channelRetry + 1,
				},
				uniqueKey: `story-delivery-retry-${job.id}`,
				startAfterSeconds: Math.min(JOB_DEFAULTS.retryDelay * 2 ** channelRetry, JOB_DEFAULTS.retryDelayMax),
			});
			logger.warn(`Story delivery failed on some channels; retry queued: ${error.message}`, {
				source: 'system',
				context: { storyId },
			});
			return;
		}
		throw error;
	}
}

export async function resolveStoryDeliveryProjectId(payload: StoryDeliveryJobPayload): Promise<string | null> {
	if (!payload.storyId) {
		throw new Error('storyId is required.');
	}
	const story = await storyQueries.getStoryById(payload.storyId);
	if (!story) {
		return null;
	}
	const projectId = story.projectId ?? (await storyQueries.getStoryProjectId(story.id));
	if (!projectId) {
		throw new Error(`Story ${payload.storyId} is missing a project; cannot deliver.`);
	}
	return projectId;
}

export async function runScheduledStoryDelivery(
	storyId: string,
	skipDeliveries: ChannelDeliveryAttempt[] = [],
): Promise<void> {
	await withKeyedLock(`story:${storyId}`, async () => {
		const context = await loadDeliveryContext(storyId);
		if (!context) {
			return;
		}
		const { queryData } = await refreshStoryData(context.story.chatId!, context.story.slug, {
			billingAccessVerifiedProjectId: context.projectId,
		});
		await deliver(context, queryData, skipDeliveries);
	});
}

export async function deliverStoryOnRefresh(
	storyId: string,
	refreshCron: string | null,
	queryData: StoryQueryData,
): Promise<void> {
	const delivery = await storyDeliveryQueries.getByStoryId(storyId);
	if (!delivery || !delivery.enabled) {
		return;
	}
	const deliversOnRefresh = delivery.cron === null || delivery.cron === refreshCron;
	if (!deliversOnRefresh) {
		return;
	}

	const context = await loadDeliveryContext(storyId);
	if (context) {
		await deliver(context, queryData);
	}
}

async function loadDeliveryContext(storyId: string): Promise<DeliveryContext | null> {
	const delivery = await storyDeliveryQueries.getByStoryId(storyId);
	if (!delivery || !delivery.enabled) {
		return null;
	}

	const story = await storyQueries.getStoryById(storyId);
	if (!story || story.archivedAt) {
		return null;
	}
	if (!story.chatId) {
		throw new Error(`Story ${storyId} has no chat to regenerate for delivery.`);
	}

	const projectId = story.projectId ?? (await storyQueries.getStoryProjectId(storyId));
	if (!projectId) {
		throw new Error(`Story ${storyId} is missing a project; cannot deliver.`);
	}

	const recipientUserIds = await resolveDeliveryRecipientUserIds(delivery, storyId, projectId, story.userId ?? null);
	if (recipientUserIds.length === 0) {
		return null;
	}

	return { delivery, story, projectId, recipientUserIds };
}

async function deliver(
	context: DeliveryContext,
	queryData: StoryQueryData,
	skipDeliveries: ChannelDeliveryAttempt[] = [],
): Promise<void> {
	const { delivery, story, projectId, recipientUserIds } = context;

	const version = await storyQueries.getLatestVersionByChatAndSlug(story.chatId!, story.slug);
	if (!version) {
		throw new Error(`Story ${story.id} has no version to deliver.`);
	}

	const ownerId = story.userId ?? (await storyQueries.getStoryOwnerId(story.id)) ?? null;
	const ownerName = ownerId ? await userQueries.getUserName(ownerId) : null;
	await ensureRecipientsCanOpenStory(story.id, projectId, ownerId, recipientUserIds);
	const linkUrl = storyPath(story.id);
	const isCustom = story.format === 'custom';
	const [attachments, storyEmail] = await Promise.all([
		isCustom
			? buildCustomStoryPdfAttachment(story, queryData, projectId)
			: buildStoryPdfAttachment(version.title, version.code, queryData, projectId),
		isCustom ? undefined : buildStoryEmailHtml(version.title, version.code, queryData, projectId),
	]);

	const payload: StoryRefreshNotificationPayload = {
		kind: 'story_refresh',
		storyId: story.id,
		status: 'refreshed',
		ownerName: ownerName ?? undefined,
		storyTitle: version.title,
	};

	await notifyUsers(
		recipientUserIds,
		{
			category: 'story_refresh',
			title: version.title,
			body: ownerName
				? `The latest version of "${version.title}" by ${ownerName} is ready.`
				: `The latest version of the story "${version.title}" is ready.`,
			linkUrl,
			ctaLabel: 'Open story',
			channels: (delivery as StoryDeliveryRow).channels,
			projectId,
			emailAttachments: storyEmail ? [...attachments, ...storyEmail.images] : attachments,
			emailBodyHtml: storyEmail?.html,
			payload,
		},
		{ throwOnChannelError: true, skipDeliveries },
	);

	logger.info(`Delivered story ${story.id} to ${recipientUserIds.length} recipient(s).`, {
		source: 'system',
		projectId,
		context: { storyId: story.id },
	});
}

async function buildCustomStoryPdfAttachment(
	story: DBStory,
	queryData: StoryQueryData,
	projectId: string,
): Promise<EmailAttachment[]> {
	try {
		const { filename, buffer } = await renderCustomStoryPdf(story.chatId!, story.slug, queryData);
		return [{ filename, content: buffer, contentType: 'application/pdf' }];
	} catch (error) {
		logger.error(`Failed to build custom story PDF attachment: ${String(error)}`, {
			source: 'system',
			projectId,
			context: { storyId: story.id },
		});
		return [];
	}
}

async function ensureRecipientsCanOpenStory(
	storyId: string,
	projectId: string,
	ownerId: string | null,
	recipientUserIds: string[],
): Promise<void> {
	const access = await sharedStoryQueries.getStoryShareAccess(storyId, projectId);
	if (access) {
		await grantShareAccessToRecipients(access, recipientUserIds);
		return;
	}
	if (!ownerId) {
		return;
	}
	await sharedStoryQueries.createSharedStory(
		{ storyId, projectId, userId: ownerId, visibility: 'specific' },
		{ userIds: recipientUserIds },
	);
}

async function grantShareAccessToRecipients(access: StoryShareAccess, recipientUserIds: string[]): Promise<void> {
	if (access.visibility !== 'specific') {
		return;
	}
	const missing = recipientUserIds.filter((id) => !access.allowedUserIds.includes(id));
	await sharedStoryQueries.addSharedStoryAllowedUsers(access.shareId, missing);
}

function parseSkipDeliveries(skipDeliveries: ChannelDeliveryAttempt[] | undefined): ChannelDeliveryAttempt[] {
	if (!Array.isArray(skipDeliveries)) {
		return [];
	}
	const channels = new Set<NotificationChannel>(NOTIFICATION_CHANNELS);
	return skipDeliveries.filter(
		(entry): entry is ChannelDeliveryAttempt =>
			!!entry && typeof entry === 'object' && typeof entry.userId === 'string' && channels.has(entry.channel),
	);
}

function mergeSkipDeliveries(
	previous: ChannelDeliveryAttempt[],
	newlySucceeded: ChannelDeliveryAttempt[],
): ChannelDeliveryAttempt[] {
	const key = (attempt: ChannelDeliveryAttempt): string => `${attempt.userId}:${attempt.channel}`;
	const merged = new Map<string, ChannelDeliveryAttempt>();
	for (const attempt of [...previous, ...newlySucceeded]) {
		merged.set(key(attempt), attempt);
	}
	return [...merged.values()];
}

/** The pg-boss worker of `story.deliver` (upstream `registerJob(STORY_DELIVERY_JOB_NAME, storyDeliveryHandler)`). */
@Injectable()
export class StoryDeliveryJob {
	@Job(STORY_DELIVERY_JOB_NAME)
	handle(payload: StoryDeliveryJobPayload, job: BossJob<object>): Promise<void> {
		return storyDeliveryHandler(payload ?? {}, job);
	}
}
