import { Injectable } from '@nestjs/common';

import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface NewStoryNotification {
	userId: string;
	projectId: string;
	category: string;
	title: string;
	body?: string | null;
	linkUrl?: string | null;
	payload?: Record<string, unknown> | null;
}

/**
 * The in-app half of upstream `notification.queries` the story jobs and story feedback need until the
 * notifications module (Phase 5) owns it: one `notification` row per recipient.
 */
@Injectable()
export class StoryNotificationRepository {
	constructor(private readonly prisma: PrismaService) {}

	async createNotifications(rows: NewStoryNotification[]): Promise<number> {
		if (rows.length === 0) {
			return 0;
		}
		const { count } = await this.prisma.notification.createMany({
			data: rows.map((row) => ({
				userId: row.userId,
				projectId: row.projectId,
				category: row.category,
				title: row.title,
				body: row.body ?? null,
				linkUrl: row.linkUrl ?? null,
				payload: (row.payload ?? undefined) as Prisma.InputJsonValue | undefined,
			})),
		});
		return count;
	}
}
