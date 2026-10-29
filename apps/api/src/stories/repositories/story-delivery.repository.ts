import { Injectable } from '@nestjs/common';
import type { NotificationChannel, RecipientMode } from '@quarry/shared/types';

import { Prisma, type StoryDelivery } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/** A `story_delivery` row with its JSON columns typed (upstream Drizzle's `DBStoryDelivery`). */
export type StoryDeliveryRow = Omit<
	StoryDelivery,
	'channels' | 'recipientMode' | 'recipientUserIds' | 'recipientGroupIds'
> & {
	channels: NotificationChannel[];
	recipientMode: RecipientMode;
	recipientUserIds: string[];
	recipientGroupIds: string[];
};

/**
 * Port of upstream `queries/story-delivery.queries.ts`. Upstream `setScheduledJobId` is not ported:
 * quarry dropped the `scheduled_job` table (and `story_delivery.scheduled_job_id`) for pg-boss.
 */
@Injectable()
export class StoryDeliveryRepository {
	constructor(private readonly prisma: PrismaService) {}

	async getByStoryId(storyId: string): Promise<StoryDeliveryRow | null> {
		return (await this.prisma.storyDelivery.findUnique({ where: { storyId } })) as StoryDeliveryRow | null;
	}

	upsert(input: Prisma.StoryDeliveryUncheckedCreateInput): Promise<StoryDelivery> {
		return this.prisma.storyDelivery.upsert({
			where: { storyId: input.storyId },
			create: input,
			update: {
				enabled: input.enabled,
				cron: input.cron,
				scheduleDescription: input.scheduleDescription,
				channels: input.channels,
				recipientMode: input.recipientMode,
				recipientUserIds: input.recipientUserIds,
				recipientGroupIds: input.recipientGroupIds,
				projectId: input.projectId,
				updatedAt: new Date(),
			},
		});
	}

	async setEnabled(storyId: string, enabled: boolean): Promise<void> {
		await this.prisma.storyDelivery.updateMany({ where: { storyId }, data: { enabled, updatedAt: new Date() } });
	}

	async disableAndResetRecipients(storyId: string): Promise<void> {
		await this.prisma.storyDelivery.updateMany({
			where: { storyId },
			data: {
				enabled: false,
				recipientMode: 'specific',
				recipientUserIds: [],
				recipientGroupIds: [],
				updatedAt: new Date(),
			},
		});
	}
}
