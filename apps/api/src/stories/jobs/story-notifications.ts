import type { NotificationCategory, NotificationChannel } from '@quarry/shared/types';

import { logger } from '../../agent/utils/logger.js';
import { notificationQueries } from './story-job-queries.js';

/** Upstream `types/email` `EmailAttachment`. */
export interface EmailAttachment {
	filename: string;
	content: Buffer | string;
	contentType?: string;
	cid?: string;
}

/** Upstream `types/notification` `ChannelDeliveryAttempt`. */
export type ChannelDeliveryAttempt = {
	userId: string;
	channel: NotificationChannel;
};

/** Upstream `types/notification` `NotifyInput`, without the per-user `userId` and the email override. */
export interface StoryNotifyInput {
	category: NotificationCategory;
	title: string;
	body?: string;
	linkUrl?: string;
	ctaLabel?: string;
	payload?: Record<string, unknown>;
	projectId: string;
	channels?: NotificationChannel[];
	emailAttachments?: EmailAttachment[];
	emailBodyHtml?: string;
}

export interface StoryNotifyOptions {
	throwOnChannelError?: boolean;
	skipDeliveries?: ChannelDeliveryAttempt[];
}

/** Upstream `notification.service` `NotificationChannelDeliveryError`. */
export class NotificationChannelDeliveryError extends Error {
	readonly succeeded: ChannelDeliveryAttempt[];
	readonly failed: ChannelDeliveryAttempt[];

	constructor(succeeded: ChannelDeliveryAttempt[], failed: ChannelDeliveryAttempt[]) {
		super(
			`Failed to deliver notification on ${failed.length} channel(s): ${failed
				.map((attempt) => `${attempt.userId}:${attempt.channel}`)
				.join('; ')}`,
		);
		this.name = 'NotificationChannelDeliveryError';
		this.succeeded = succeeded;
		this.failed = failed;
	}
}

/**
 * Stand-in for upstream `notification.service` `notifyUsers` until the notifications module (Phase 5): the
 * `in_app` channel records a `notification` row per recipient (what upstream's in-app channel stores), email and
 * Slack are only logged, with the attachment names, since there is no mailer or Slack integration yet. Channels in
 * `skipDeliveries` (already delivered by an earlier attempt) are skipped, as upstream.
 */
export async function notifyUsers(
	userIds: string[],
	input: StoryNotifyInput,
	options: StoryNotifyOptions = {},
): Promise<ChannelDeliveryAttempt[]> {
	if (userIds.length === 0) {
		return [];
	}
	const channels = input.channels && input.channels.length > 0 ? input.channels : (['in_app'] as const);
	const skipped = new Set((options.skipDeliveries ?? []).map((attempt) => `${attempt.userId}:${attempt.channel}`));
	const attempts: ChannelDeliveryAttempt[] = [];
	for (const userId of new Set(userIds)) {
		for (const channel of channels) {
			if (!skipped.has(`${userId}:${channel}`)) {
				attempts.push({ userId, channel });
			}
		}
	}

	const inApp = attempts.filter((attempt) => attempt.channel === 'in_app');
	await notificationQueries.createNotifications(
		inApp.map((attempt) => ({
			userId: attempt.userId,
			projectId: input.projectId,
			category: input.category,
			title: input.title,
			body: input.body ?? null,
			linkUrl: input.linkUrl ?? null,
			payload: input.payload ?? null,
		})),
	);

	const external = attempts.filter((attempt) => attempt.channel !== 'in_app');
	if (external.length > 0) {
		const attachments = (input.emailAttachments ?? []).map((attachment) => attachment.filename);
		logger.info(
			`Notification "${input.title}" not sent on ${external.map((a) => `${a.userId}:${a.channel}`).join(', ')}: email and Slack delivery come with the notifications module.`,
			{ source: 'system', projectId: input.projectId, context: { category: input.category, attachments } },
		);
	}
	return attempts;
}
