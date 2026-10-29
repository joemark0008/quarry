import { Injectable } from '@nestjs/common';
import { extractQueryIds } from '@quarry/shared/story-segments';
import type { StoryFormat } from '@quarry/shared/types';

import { ChatRepository } from '../../chats/chat.repository.js';
import { Prisma, type SharedStory } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { andAll, anyOf, LATEST_VERSIONS } from './story-sql.js';

export type SharedStoryWithLatest = SharedStory & {
	updatedAt: Date;
	authorName: string;
	chatId: string | null;
	slug: string;
	title: string;
	format: StoryFormat;
	code: string;
	version: number;
	isLive: boolean;
	certifiedAt: Date | null;
	certifiedByName: string | null;
	sharedWithCount: number;
	sharedWithGroupCount: number;
};

export type ShareRecipients = {
	userIds: string[];
	groupIds: string[];
};

export type StoryShareAccess = {
	shareId: string;
	visibility: string;
	allowedUserIds: string[];
	allowedGroupIds: string[];
	recipientUserIds: string[];
};

/**
 * Matches `shared_story` rows granted to the user directly or through one of their user groups.
 * `sharedStoryId` is the column holding the share's id in the outer query (`shared_story.id` by default).
 */
export function sharedStoryGrantsUser(userId: string, sharedStoryId = Prisma.raw('shared_story.id')): Prisma.Sql {
	return Prisma.sql`(exists (
		select 1 from shared_story_access
		where shared_story_access.shared_story_id = ${sharedStoryId}
		  and shared_story_access.user_id = ${userId}
	) or exists (
		select 1 from shared_story_group_access
		inner join user_group_member on user_group_member.group_id = shared_story_group_access.group_id
		where shared_story_group_access.shared_story_id = ${sharedStoryId}
		  and user_group_member.user_id = ${userId}
	))`;
}

/** Port of upstream `queries/shared-story.queries.ts`. */
@Injectable()
export class SharedStoryRepository {
	constructor(
		private readonly prisma: PrismaService,
		private readonly chats: ChatRepository,
	) {}

	async createSharedStory(
		data: Pick<SharedStory, 'storyId' | 'projectId' | 'userId' | 'visibility'>,
		recipients?: Partial<ShareRecipients>,
		options?: { pinned?: boolean },
	): Promise<SharedStory> {
		const pinned = options?.pinned === true;

		const existing = await this.prisma.sharedStory.findFirst({
			where: { projectId: data.projectId, storyId: data.storyId },
		});

		let saved: SharedStory;
		if (existing) {
			saved = await this.prisma.sharedStory.update({
				where: { id: existing.id },
				data: { visibility: data.visibility, ...(options?.pinned !== undefined ? { isPinned: pinned } : {}) },
			});
			await this.deleteSharedStoryRecipients(existing.id);
		} else {
			saved = await this.prisma.sharedStory.create({ data: { ...data, isPinned: pinned } });
		}

		if (data.visibility === 'specific') {
			await this.insertSharedStoryRecipients(saved.id, recipients);
		}

		return saved;
	}

	async getSharedStory(id: string): Promise<SharedStoryWithLatest | null> {
		const [row] = await this.querySharedStories(Prisma.sql`shared_story.id = ${id}`);
		return row ?? null;
	}

	async getSharedStoryByStoryId(storyId: string): Promise<SharedStoryWithLatest | null> {
		const [row] = await this.querySharedStories(Prisma.sql`shared_story.story_id = ${storyId}`);
		return row ?? null;
	}

	async canUserAccessSharedStory(sharedStoryId: string, userId: string): Promise<boolean> {
		const [row] = await this.prisma.$queryRaw<{ id: string }[]>`
			SELECT shared_story.id FROM shared_story
			WHERE shared_story.id = ${sharedStoryId} AND ${sharedStoryGrantsUser(userId)}
			LIMIT 1`;
		return !!row;
	}

	listUserSharedStories(projectId: string, userId: string): Promise<SharedStoryWithLatest[]> {
		return this.querySharedStories(
			andAll(
				Prisma.sql`shared_story.project_id = ${projectId}`,
				Prisma.sql`story.archived_at IS NULL`,
				anyOf(
					Prisma.sql`shared_story.visibility = 'project'`,
					Prisma.sql`shared_story.user_id = ${userId}`,
					sharedStoryGrantsUser(userId),
				),
			),
		);
	}

	listProjectArchivedSharedStories(projectId: string): Promise<SharedStoryWithLatest[]> {
		return this.querySharedStories(
			andAll(
				Prisma.sql`shared_story.project_id = ${projectId}`,
				Prisma.sql`shared_story.visibility = 'project'`,
				Prisma.sql`story.archived_at IS NOT NULL`,
			),
		);
	}

	async toggleSharedStoryPin(sharedStoryId: string): Promise<void> {
		const existing = await this.prisma.sharedStory.findUnique({
			where: { id: sharedStoryId },
			select: { isPinned: true },
		});
		if (!existing) {
			return;
		}
		await this.prisma.sharedStory.updateMany({
			where: { id: sharedStoryId },
			data: { isPinned: !existing.isPinned },
		});
	}

	async getQueryDataFromCode(
		chatId: string,
		code: string,
	): Promise<Record<string, { data: unknown[]; columns: string[] }> | null> {
		const queryIds = extractQueryIds(code);
		if (queryIds.size === 0) {
			return null;
		}

		const data = await this.chats.getLatestSqlQueryDataByIds(chatId, queryIds);
		return Object.keys(data).length > 0 ? data : null;
	}

	getSharedStoryInfo(storyId: string, projectId: string): Promise<{ id: string; visibility: string } | null> {
		return this.prisma.sharedStory.findFirst({
			where: { storyId, projectId },
			select: { id: true, visibility: true },
		});
	}

	async getStoryShareAccess(storyId: string, projectId: string): Promise<StoryShareAccess | null> {
		const info = await this.getSharedStoryInfo(storyId, projectId);
		if (!info) {
			return null;
		}
		if (info.visibility !== 'specific') {
			return {
				shareId: info.id,
				visibility: info.visibility,
				allowedUserIds: [],
				allowedGroupIds: [],
				recipientUserIds: [],
			};
		}
		const [allowedUserIds, allowedGroupIds, recipientUserIds] = await Promise.all([
			this.getSharedStoryAllowedUserIds(info.id),
			this.getSharedStoryAllowedGroupIds(info.id),
			this.getSharedStoryRecipientUserIds(info.id),
		]);
		return { shareId: info.id, visibility: info.visibility, allowedUserIds, allowedGroupIds, recipientUserIds };
	}

	async getSharedStoryAllowedUserIds(sharedStoryId: string): Promise<string[]> {
		const rows = await this.prisma.sharedStoryAccess.findMany({
			where: { sharedStoryId },
			select: { userId: true },
		});
		return rows.map((r) => r.userId);
	}

	async getSharedStoryAllowedGroupIds(sharedStoryId: string): Promise<string[]> {
		const rows = await this.prisma.sharedStoryGroupAccess.findMany({
			where: { sharedStoryId },
			select: { groupId: true },
		});
		return rows.map((r) => r.groupId);
	}

	/** Users granted directly plus the current members of every granted user group. */
	async getSharedStoryRecipientUserIds(sharedStoryId: string): Promise<string[]> {
		const [directUserIds, groupMembers] = await Promise.all([
			this.getSharedStoryAllowedUserIds(sharedStoryId),
			this.prisma.$queryRaw<{ userId: string }[]>`
				SELECT DISTINCT user_group_member.user_id AS "userId"
				FROM shared_story_group_access
				INNER JOIN user_group_member ON user_group_member.group_id = shared_story_group_access.group_id
				WHERE shared_story_group_access.shared_story_id = ${sharedStoryId}`,
		]);

		return [...new Set([...directUserIds, ...groupMembers.map((member) => member.userId)])];
	}

	async updateSharedStoryRecipients(sharedStoryId: string, recipients: ShareRecipients): Promise<void> {
		await this.deleteSharedStoryRecipients(sharedStoryId);
		await this.insertSharedStoryRecipients(sharedStoryId, recipients);
	}

	async addSharedStoryAllowedUsers(sharedStoryId: string, userIds: string[]): Promise<void> {
		if (userIds.length === 0) {
			return;
		}
		await this.prisma.sharedStoryAccess.createMany({
			data: userIds.map((userId) => ({ sharedStoryId, userId })),
			skipDuplicates: true,
		});
	}

	async deleteSharedStoryRecipients(sharedStoryId: string): Promise<void> {
		await this.prisma.sharedStoryAccess.deleteMany({ where: { sharedStoryId } });
		await this.prisma.sharedStoryGroupAccess.deleteMany({ where: { sharedStoryId } });
	}

	async deleteSharedStory(id: string): Promise<void> {
		await this.prisma.sharedStory.deleteMany({ where: { id } });
	}

	async deleteProjectWideSharedStory(id: string): Promise<boolean> {
		const { count } = await this.prisma.sharedStory.deleteMany({ where: { id, visibility: 'project' } });
		return count > 0;
	}

	async listProjectWideSharedStories(
		projectId: string,
		sharerIds: string[],
	): Promise<Array<Pick<SharedStory, 'id' | 'storyId' | 'projectId' | 'userId'>>> {
		if (sharerIds.length === 0) {
			return [];
		}
		return this.prisma.sharedStory.findMany({
			where: { projectId, visibility: 'project', userId: { in: sharerIds } },
			select: { id: true, storyId: true, projectId: true, userId: true },
		});
	}

	private async insertSharedStoryRecipients(
		sharedStoryId: string,
		recipients: Partial<ShareRecipients> | undefined,
	): Promise<void> {
		const userIds = [...new Set(recipients?.userIds ?? [])];
		const groupIds = [...new Set(recipients?.groupIds ?? [])];

		if (userIds.length > 0) {
			await this.prisma.sharedStoryAccess.createMany({
				data: userIds.map((userId) => ({ sharedStoryId, userId })),
			});
		}
		if (groupIds.length > 0) {
			await this.prisma.sharedStoryGroupAccess.createMany({
				data: groupIds.map((groupId) => ({ sharedStoryId, groupId })),
			});
		}
	}

	private querySharedStories(whereCondition: Prisma.Sql): Promise<SharedStoryWithLatest[]> {
		return this.prisma.$queryRaw<SharedStoryWithLatest[]>`
			SELECT
				shared_story.id,
				shared_story.story_id AS "storyId",
				shared_story.project_id AS "projectId",
				shared_story.user_id AS "userId",
				shared_story.visibility,
				shared_story.is_pinned AS "isPinned",
				shared_story.created_at AS "createdAt",
				story.updated_at AS "updatedAt",
				"user".name AS "authorName",
				story.chat_id AS "chatId",
				story.slug,
				story.title,
				story.format,
				story_version.code,
				story_version.version,
				story.is_live AS "isLive",
				story.certified_at AS "certifiedAt",
				story_certifier.name AS "certifiedByName",
				coalesce(access_counts.cnt, 0)::int AS "sharedWithCount",
				coalesce(group_access_counts.group_cnt, 0)::int AS "sharedWithGroupCount"
			FROM shared_story
			INNER JOIN story ON shared_story.story_id = story.id
			INNER JOIN "user" ON shared_story.user_id = "user".id
			LEFT JOIN "user" story_certifier ON story.certified_by = story_certifier.id
			INNER JOIN ${LATEST_VERSIONS} latest ON story.id = latest.story_id
			INNER JOIN story_version ON story_version.story_id = story.id AND story_version.version = latest.max_version
			LEFT JOIN (
				SELECT shared_story_access.shared_story_id, count(shared_story_access.user_id) AS cnt
				FROM shared_story_access
				GROUP BY shared_story_access.shared_story_id
			) access_counts ON access_counts.shared_story_id = shared_story.id
			LEFT JOIN (
				SELECT shared_story_group_access.shared_story_id, count(shared_story_group_access.group_id) AS group_cnt
				FROM shared_story_group_access
				GROUP BY shared_story_group_access.shared_story_id
			) group_access_counts ON group_access_counts.shared_story_id = shared_story.id
			WHERE ${whereCondition}
			ORDER BY shared_story.created_at DESC`;
	}
}
