import { Injectable } from '@nestjs/common';
import { extractQueryIds } from '@quarry/shared/story-segments';
import type { StorySharingInfo } from '@quarry/shared/types';

import { ChatRepository, type StoredSqlQuery } from '../../chats/chat.repository.js';
import { Prisma, type Story, type StoryDataCache, type StoryVersion } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { DbExecutor } from '../../prisma/prisma.types.js';
import type { StoryCachedQueryData, StoryDataCacheRow, StoryQuerySources } from '../types/story-cache.js';
import { sharedStoryGrantsUser } from './shared-story.repository.js';
import { andAll, anyOf, inList, insertNextStoryVersion, LATEST_VERSIONS } from './story-sql.js';

export type UserStoryRow = Pick<
	Story,
	| 'id'
	| 'chatId'
	| 'projectId'
	| 'userId'
	| 'slug'
	| 'title'
	| 'isLive'
	| 'isLiveTextDynamic'
	| 'cacheSchedule'
	| 'cacheScheduleDescription'
	| 'archivedAt'
	| 'certifiedAt'
	| 'format'
	| 'createdAt'
	| 'updatedAt'
> & {
	code: string;
	version: number;
	versionCreatedAt: StoryVersion['createdAt'];
	certifiedByName: string | null;
};

export type ChatStoryLatestVersion = Pick<Story, 'slug' | 'title' | 'format' | 'archivedAt'> & {
	storyId: string;
	version: number | null;
	code: string | null;
	source: StoryVersion['source'] | null;
};

export type StoryVersionWithStory = StoryVersion &
	Pick<
		Story,
		| 'title'
		| 'slug'
		| 'chatId'
		| 'isLive'
		| 'isLiveTextDynamic'
		| 'cacheSchedule'
		| 'cacheScheduleDescription'
		| 'archivedAt'
		| 'format'
	>;

type StoryVersionData = {
	code: string;
	action: 'create' | 'update' | 'replace';
	source: 'assistant' | 'user';
};

/** Matches `story` rows the user owns or that are shared with them within the project. */
export function storyVisibleToUser(userId: string, projectId: string): Prisma.Sql {
	return Prisma.sql`(
		exists (
			select 1 from chat
			where chat.id = story.chat_id and chat.user_id = ${userId}
		)
		or (story.chat_id is null and story.user_id = ${userId})
		or exists (
			select 1 from shared_story
			where shared_story.story_id = story.id
			  and shared_story.project_id = ${projectId}
			  and (
				shared_story.user_id = ${userId}
				or shared_story.visibility = 'project'
				or ${sharedStoryGrantsUser(userId)}
			  )
		)
	)`;
}

/** The user owns the story: through its chat, or as the author of a standalone story. */
function ownedBy(userId: string): Prisma.Sql {
	return Prisma.sql`(chat.user_id = ${userId} OR (story.chat_id IS NULL AND story.user_id = ${userId}))`;
}

function archivedStoryFilter(archived: boolean | undefined): Prisma.Sql {
	return archived ? Prisma.sql`story.archived_at IS NOT NULL` : Prisma.sql`story.archived_at IS NULL`;
}

const ANALYTICS_THROTTLE_MS = 2 * 60 * 1_000;

/** Port of upstream `queries/story.queries.ts`. */
@Injectable()
export class StoryRepository {
	constructor(
		private readonly prisma: PrismaService,
		private readonly chats: ChatRepository,
	) {}

	getStoryByChatAndSlug(chatId: string, slug: string, executor: DbExecutor = this.prisma): Promise<Story | null> {
		return executor.story.findFirst({ where: { chatId, slug } });
	}

	listCustomStoriesInChat(chatId: string, executor: DbExecutor = this.prisma): Promise<Story[]> {
		return executor.story.findMany({ where: { chatId, format: 'custom' }, orderBy: { slug: 'asc' } });
	}

	createCustomStory(
		data: { chatId: string; slug: string; title: string },
		executor: DbExecutor = this.prisma,
	): Promise<Story> {
		return executor.story.create({ data: { ...data, format: 'custom' } });
	}

	/** Upstream `activity.queries` `startStoryRefreshActivity`: a running `story.refreshed` activity. */
	startStoryRefreshActivity(input: {
		projectId: string;
		userId: string | null;
		storyId: string;
		chatId: string | null;
		trigger: 'manual' | 'schedule' | 'system';
	}): Promise<{ id: string }> {
		return this.prisma.activity.create({
			data: {
				projectId: input.projectId,
				userId: input.userId,
				type: 'story.refreshed',
				trigger: input.trigger,
				status: 'running',
				storyId: input.storyId,
				chatId: input.chatId,
				payload: { queriesRefreshed: 0 },
			},
			select: { id: true },
		});
	}

	/** Upstream `activity.queries` `completeActivity`. */
	async completeActivity(activityId: string, payload?: Record<string, unknown> | null): Promise<void> {
		await this.prisma.activity.updateMany({
			where: { id: activityId, status: 'running' },
			data: {
				status: 'completed',
				completedAt: new Date(),
				...(payload !== undefined && { payload: (payload ?? Prisma.DbNull) as Prisma.InputJsonValue }),
			},
		});
	}

	/** Upstream `activity.queries` `failActivity`. */
	async failActivity(activityId: string, errorMessage: string): Promise<void> {
		await this.prisma.activity.updateMany({
			where: { id: activityId, status: 'running' },
			data: { status: 'failed', completedAt: new Date(), errorMessage },
		});
	}

	/** Upstream `analytics-event.queries` `createEvent`. */
	async createAnalyticsEvent(input: Prisma.AnalyticsEventUncheckedCreateInput): Promise<void> {
		await this.prisma.analyticsEvent.create({ data: input });
	}

	/** Upstream `analytics-event.queries` `getLastEvent`: the same actor's event on the asset in the last 2 minutes. */
	async getLastAnalyticsEvent(input: {
		type: string;
		assetType: string;
		actorUserId: string | null;
		chatId?: string | null;
		storyId?: string | null;
	}): Promise<{ id: string } | null> {
		return this.prisma.analyticsEvent.findFirst({
			where: {
				type: input.type,
				assetType: input.assetType,
				actorUserId: input.actorUserId,
				...(input.chatId && { chatId: input.chatId }),
				...(input.storyId && { storyId: input.storyId }),
				createdAt: { gte: new Date(Date.now() - ANALYTICS_THROTTLE_MS) },
			},
			orderBy: { createdAt: 'desc' },
			select: { id: true },
		});
	}

	/** Upstream `activity.queries` `getLatestStoryRefreshFailure`: the latest refresh activity, when it failed. */
	async getLatestStoryRefreshFailure(storyId: string): Promise<{ errorMessage: string; failedAt: Date } | null> {
		const latestRefresh = await this.prisma.activity.findFirst({
			where: { storyId, type: 'story.refreshed' },
			orderBy: { startedAt: 'desc' },
			select: { status: true, errorMessage: true, startedAt: true, completedAt: true },
		});
		if (!latestRefresh || latestRefresh.status !== 'failed') {
			return null;
		}
		return {
			errorMessage: latestRefresh.errorMessage ?? 'Story refresh failed.',
			failedAt: latestRefresh.completedAt ?? latestRefresh.startedAt,
		};
	}

	getStoryById(storyId: string): Promise<Story | null> {
		return this.prisma.story.findUnique({ where: { id: storyId } });
	}

	async renameStory(storyId: string, title: string): Promise<void> {
		await this.prisma.story.updateMany({ where: { id: storyId }, data: { title } });
	}

	async getStoryProjectId(storyId: string): Promise<string | null> {
		const row = await this.prisma.story.findUnique({
			where: { id: storyId },
			select: { projectId: true, chat: { select: { projectId: true } } },
		});
		if (!row) {
			return null;
		}
		return row.chat?.projectId ?? row.projectId ?? null;
	}

	async getStoryOwnerId(storyId: string): Promise<string | undefined> {
		const row = await this.prisma.story.findUnique({
			where: { id: storyId },
			select: { userId: true, chat: { select: { userId: true } } },
		});
		return row?.chat?.userId ?? row?.userId ?? undefined;
	}

	async getStoryByIdForUser(storyId: string, userId: string): Promise<UserStoryRow | null> {
		const [row] = await this.queryStoriesWithLatestVersion(
			andAll(Prisma.sql`story.id = ${storyId}`, ownedBy(userId)),
			{ limit: 1, anyArchiveState: true },
		);
		return row ?? null;
	}

	getStandaloneStoryByUserAndSlug(userId: string, projectId: string, slug: string): Promise<Story | null> {
		return this.prisma.story.findFirst({ where: { projectId, userId, slug, chatId: null } });
	}

	listUserChatStories(userId: string, options?: { archived?: boolean; projectId?: string }): Promise<UserStoryRow[]> {
		const condition =
			options?.projectId !== undefined
				? andAll(Prisma.sql`chat.user_id = ${userId}`, Prisma.sql`chat.project_id = ${options.projectId}`)
				: Prisma.sql`chat.user_id = ${userId}`;
		return this.queryStoriesWithLatestVersion(condition, options);
	}

	listUserStandaloneStories(
		userId: string,
		projectId: string,
		options?: { archived?: boolean; limit?: number },
	): Promise<UserStoryRow[]> {
		const limit = Math.min(options?.limit ?? 50, 200);
		return this.queryStoriesWithLatestVersion(
			andAll(
				Prisma.sql`story.project_id = ${projectId}`,
				Prisma.sql`story.user_id = ${userId}`,
				Prisma.sql`story.chat_id IS NULL`,
			),
			{ ...options, limit },
		);
	}

	listAllUserStoriesInProject(
		userId: string,
		projectId: string,
		options?: { archived?: boolean; limit?: number },
	): Promise<UserStoryRow[]> {
		const limit = Math.min(options?.limit ?? 20, 100);
		return this.queryStoriesWithLatestVersion(
			anyOf(
				andAll(Prisma.sql`chat.project_id = ${projectId}`, Prisma.sql`chat.user_id = ${userId}`),
				andAll(
					Prisma.sql`story.project_id = ${projectId}`,
					Prisma.sql`story.user_id = ${userId}`,
					Prisma.sql`story.chat_id IS NULL`,
				),
			),
			{ ...options, limit },
		);
	}

	async listStoriesInChat(chatId: string): Promise<{ slug: string; title: string; latestVersion: number }[]> {
		const stories = await this.prisma.$queryRaw<{ slug: string; title: string; latestVersion: number | null }[]>`
			SELECT story.slug, story.title, max(story_version.version) AS "latestVersion"
			FROM story
			INNER JOIN story_version ON story_version.story_id = story.id
			WHERE story.chat_id = ${chatId}
			GROUP BY story.id`;

		return stories.map((row) => ({
			slug: row.slug,
			title: row.title,
			latestVersion: row.latestVersion ?? 1,
		}));
	}

	/** Every story of a chat, archived included, with its latest version; a never-published custom draft has none. */
	listLatestVersionsInChat(chatId: string): Promise<ChatStoryLatestVersion[]> {
		return this.prisma.$queryRaw<ChatStoryLatestVersion[]>`
			SELECT
				story.id AS "storyId",
				story.slug,
				story.title,
				story.format,
				story.archived_at AS "archivedAt",
				story_version.version,
				story_version.code,
				story_version.source
			FROM story
			LEFT JOIN (
				SELECT sv.story_id, max(sv.version) AS max_version
				FROM story_version sv
				INNER JOIN story s ON sv.story_id = s.id
				WHERE s.chat_id = ${chatId}
				GROUP BY sv.story_id
			) latest ON latest.story_id = story.id
			LEFT JOIN story_version
				ON story_version.story_id = story.id AND story_version.version = latest.max_version
			WHERE story.chat_id = ${chatId}
			ORDER BY story.created_at ASC`;
	}

	async createStoryVersion(
		data: { chatId: string; slug: string; title: string } & StoryVersionData,
		executor: DbExecutor = this.prisma,
	): Promise<StoryVersion & { title: string }> {
		const story = await this.getOrCreateStory(
			{ chatId: data.chatId, slug: data.slug, title: data.title },
			executor,
		);
		const created = await insertNextStoryVersion(executor, {
			storyId: story.id,
			code: data.code,
			action: data.action,
			source: data.source,
		});
		return { ...created, title: story.title };
	}

	async createStandaloneVersion(
		data: { userId: string; projectId: string; slug: string; title: string } & StoryVersionData,
	): Promise<StoryVersion & { title: string }> {
		const story = await this.getOrCreateStandaloneStory({
			userId: data.userId,
			projectId: data.projectId,
			slug: data.slug,
			title: data.title,
		});
		const created = await insertNextStoryVersion(this.prisma, {
			storyId: story.id,
			code: data.code,
			action: data.action,
			source: data.source,
		});
		return { ...created, title: story.title };
	}

	createStandaloneStory(data: {
		userId: string;
		projectId: string;
		slug: string;
		title: string;
		code: string;
		source: 'assistant' | 'user';
	}): Promise<{ id: string; slug: string; title: string; createdAt: Date; version: number } | null> {
		return this.prisma.$transaction(async (tx) => {
			const [story] = await tx.story.createManyAndReturn({
				data: [{ projectId: data.projectId, userId: data.userId, slug: data.slug, title: data.title }],
				skipDuplicates: true,
			});
			if (!story) {
				return null;
			}

			const version = await tx.storyVersion.create({
				data: { storyId: story.id, code: data.code, action: 'create', source: data.source, version: 1 },
			});

			return {
				id: story.id,
				slug: story.slug,
				title: story.title,
				createdAt: story.createdAt,
				version: version.version,
			};
		});
	}

	async deleteStory(storyId: string): Promise<void> {
		await this.prisma.story.deleteMany({ where: { id: storyId } });
	}

	async assignChatToStory(storyId: string, chatId: string): Promise<void> {
		await this.prisma.story.updateMany({ where: { id: storyId }, data: { chatId } });
	}

	async archiveStory(chatId: string, slug: string): Promise<void> {
		const matcher = { chatId, slug };
		await this.prisma.story.updateMany({ where: matcher, data: { archivedAt: new Date() } });
		const ids = await this.prisma.story.findMany({ where: matcher, select: { id: true } });
		await this.detachStoriesFromFolders(ids.map((row) => row.id));
	}

	async unarchiveStory(chatId: string, slug: string): Promise<void> {
		await this.prisma.story.updateMany({ where: { chatId, slug }, data: { archivedAt: null } });
	}

	async archiveByStoryId(storyId: string): Promise<void> {
		await this.prisma.story.updateMany({ where: { id: storyId }, data: { archivedAt: new Date() } });
		await this.detachStoriesFromFolders([storyId]);
	}

	async unarchiveByStoryId(storyId: string): Promise<void> {
		await this.prisma.story.updateMany({ where: { id: storyId }, data: { archivedAt: null } });
	}

	async setStoryCertification(storyId: string, certifiedBy: string | null): Promise<Date | null> {
		const certifiedAt = certifiedBy ? new Date() : null;
		await this.prisma.story.updateMany({ where: { id: storyId }, data: { certifiedAt, certifiedBy } });
		return certifiedAt;
	}

	async getStoryCertification(
		storyId: string,
	): Promise<{ certifiedAt: Date | null; certifiedByName: string | null }> {
		const row = await this.prisma.story.findUnique({
			where: { id: storyId },
			select: { certifiedAt: true, certifiedByUser: { select: { name: true } } },
		});
		if (!row) {
			return { certifiedAt: null, certifiedByName: null };
		}
		return { certifiedAt: row.certifiedAt, certifiedByName: row.certifiedByUser?.name ?? null };
	}

	async canUserAccessStory(storyId: string, userId: string): Promise<boolean> {
		const owned = await this.prisma.story.findFirst({
			where: { id: storyId, OR: [{ chat: { userId } }, { chatId: null, userId }] },
			select: { id: true },
		});
		if (owned) {
			return true;
		}

		// Upstream also admits its cloud "open projects" (the system example project); quarry has none.
		const [shared] = await this.prisma.$queryRaw<{ id: string }[]>`
			SELECT shared_story.id
			FROM shared_story
			INNER JOIN project ON project.id = shared_story.project_id
			WHERE shared_story.story_id = ${storyId}
				AND (
					shared_story.user_id = ${userId}
					OR (shared_story.visibility = 'project' AND (
						exists (
							select 1 from project_member
							where project_member.project_id = shared_story.project_id
							  and project_member.user_id = ${userId}
						)
						OR exists (
							select 1 from org_member
							where org_member.org_id = project.org_id
							  and org_member.user_id = ${userId}
						)
					))
					OR (shared_story.visibility = 'specific' AND ${sharedStoryGrantsUser(userId)})
				)
			LIMIT 1`;

		return !!shared;
	}

	async updateStoryLiveSettings(
		chatId: string,
		slug: string,
		settings: {
			isLive: boolean;
			isLiveTextDynamic: boolean;
			cacheSchedule: string | null;
			cacheScheduleDescription: string | null;
		},
	): Promise<void> {
		await this.prisma.story.updateMany({ where: { chatId, slug }, data: settings });
	}

	getLatestVersionByChatAndSlug(chatId: string, slug: string): Promise<StoryVersionWithStory | null> {
		return this.getStoryVersion({ story: { chatId, slug } }, { latest: true });
	}

	getLatestVersionByStoryId(storyId: string): Promise<StoryVersionWithStory | null> {
		return this.getStoryVersion({ storyId }, { latest: true });
	}

	getVersionByNumber(chatId: string, slug: string, versionNumber: number): Promise<StoryVersionWithStory | null> {
		return this.getStoryVersion({ story: { chatId, slug }, version: versionNumber });
	}

	listStoryVersions(chatId: string, slug: string): Promise<StoryVersion[]> {
		return this.prisma.storyVersion.findMany({
			where: { story: { chatId, slug } },
			orderBy: { version: 'asc' },
		});
	}

	async updateLatestVersionCode(chatId: string, slug: string, code: string): Promise<void> {
		const latest = await this.getLatestVersionByChatAndSlug(chatId, slug);
		if (!latest) {
			return;
		}
		await this.prisma.storyVersion.updateMany({
			where: { storyId: latest.storyId, version: latest.version },
			data: { code },
		});
	}

	async getStoryDataCacheByChatAndSlug(chatId: string, slug: string): Promise<StoryDataCacheRow | null> {
		return (await this.prisma.storyDataCache.findFirst({
			where: { story: { chatId, slug } },
		})) as StoryDataCacheRow | null;
	}

	async getStoryDataCacheByStoryId(storyId: string): Promise<StoryDataCacheRow | null> {
		return (await this.prisma.storyDataCache.findFirst({ where: { storyId } })) as StoryDataCacheRow | null;
	}

	async getStoryDataCachedAt(storyId: string): Promise<Date | null> {
		const row = await this.prisma.storyDataCache.findUnique({ where: { storyId }, select: { cachedAt: true } });
		return row?.cachedAt ?? null;
	}

	async getStoryQueryDataByStoryIds(storyIds: string[]): Promise<Map<string, StoryCachedQueryData>> {
		if (storyIds.length === 0) {
			return new Map();
		}
		const rows = await this.prisma.storyDataCache.findMany({
			where: { storyId: { in: storyIds } },
			select: { storyId: true, queryData: true },
		});
		return new Map(rows.map((row) => [row.storyId, row.queryData as StoryCachedQueryData]));
	}

	async upsertStoryDataCache(
		chatId: string,
		slug: string,
		queryData: Record<string, { data: unknown[]; columns: string[] }>,
		querySources: StoryQuerySources,
		analysisResults?: Record<string, string> | null,
	): Promise<StoryDataCache> {
		const story = await this.getStoryByChatAndSlug(chatId, slug);
		if (!story) {
			throw new Error(`Story not found: ${chatId}/${slug}`);
		}

		const values = {
			queryData: queryData as Prisma.InputJsonValue,
			querySources: querySources as unknown as Prisma.InputJsonValue,
			analysisResults: analysisResults ?? Prisma.DbNull,
			cachedAt: new Date(),
		};
		return this.prisma.storyDataCache.upsert({
			where: { storyId: story.id },
			create: { storyId: story.id, ...values },
			update: values,
		});
	}

	async upsertStoryDataCacheByStoryId(
		storyId: string,
		queryData: Record<string, { data: unknown[]; columns: string[] }>,
	): Promise<void> {
		const values = {
			queryData: queryData as Prisma.InputJsonValue,
			querySources: Prisma.DbNull,
			cachedAt: new Date(),
		};
		await this.prisma.storyDataCache.upsert({
			where: { storyId },
			create: { storyId, ...values },
			update: values,
		});
	}

	async getSqlQueriesFromCode(chatId: string, code: string): Promise<Record<string, StoredSqlQuery>> {
		const queryIds = extractQueryIds(code);
		if (queryIds.size === 0) {
			return {};
		}
		return this.chats.getLatestSqlQueriesByIds(chatId, queryIds);
	}

	getSqlQueriesByIds(
		chatId: string,
		queryIds: Set<string>,
	): Promise<Record<string, { sqlQuery: string; databaseId?: string; adminMode: boolean }>> {
		return this.chats.getLatestSqlQueriesByIds(chatId, queryIds);
	}

	async getSqlQueryById(
		chatId: string,
		queryId: string,
	): Promise<{ sqlQuery: string; databaseId?: string; adminMode: boolean } | null> {
		const part = await this.chats.getExecuteSqlPartByQueryIdInChat(chatId, queryId);
		if (!part) {
			return null;
		}
		return {
			sqlQuery: part.toolInput.sql_query,
			...(part.toolInput.database_id && { databaseId: part.toolInput.database_id }),
			adminMode: part.adminMode,
		};
	}

	async getStorySharingInfo(storyIds: string[]): Promise<Map<string, StorySharingInfo>> {
		if (storyIds.length === 0) {
			return new Map();
		}

		const rows = await this.prisma.$queryRaw<
			{
				storyId: string;
				visibility: StorySharingInfo['visibility'];
				isPinned: boolean;
				sharedWithCount: number;
				sharedWithGroupCount: number;
			}[]
		>`
			SELECT
				shared_story.story_id AS "storyId",
				shared_story.visibility,
				shared_story.is_pinned AS "isPinned",
				count(DISTINCT shared_story_access.user_id)::int AS "sharedWithCount",
				count(DISTINCT shared_story_group_access.group_id)::int AS "sharedWithGroupCount"
			FROM shared_story
			LEFT JOIN shared_story_access ON shared_story_access.shared_story_id = shared_story.id
			LEFT JOIN shared_story_group_access ON shared_story_group_access.shared_story_id = shared_story.id
			WHERE ${inList(Prisma.sql`shared_story.story_id`, storyIds)}
			GROUP BY shared_story.id`;

		const result = new Map<string, StorySharingInfo>();
		for (const row of rows) {
			result.set(row.storyId, {
				visibility: row.visibility,
				sharedWithCount: row.sharedWithCount,
				sharedWithGroupCount: row.sharedWithGroupCount,
				isPinned: row.isPinned,
			});
		}
		return result;
	}

	private async detachStoriesFromFolders(storyIds: string[]): Promise<void> {
		if (storyIds.length === 0) {
			return;
		}
		await this.prisma.storyFolderItem.deleteMany({ where: { storyId: { in: storyIds } } });
	}

	/** `anyArchiveState` leaves out the archive filter, as upstream `getStoryByIdForUser` (its own select). */
	private queryStoriesWithLatestVersion(
		whereCondition: Prisma.Sql,
		options?: { archived?: boolean; limit?: number; anyArchiveState?: boolean },
	): Promise<UserStoryRow[]> {
		const archived = options?.anyArchiveState ? undefined : archivedStoryFilter(options?.archived);
		const limit = options?.limit !== undefined ? Prisma.sql`LIMIT ${options.limit}` : Prisma.empty;
		return this.prisma.$queryRaw<UserStoryRow[]>`
			SELECT
				story.id,
				story.chat_id AS "chatId",
				coalesce(story.project_id, chat.project_id) AS "projectId",
				story.user_id AS "userId",
				story.slug,
				story.title,
				story.is_live AS "isLive",
				story.is_live_text_dynamic AS "isLiveTextDynamic",
				story.cache_schedule AS "cacheSchedule",
				story.cache_schedule_description AS "cacheScheduleDescription",
				story.archived_at AS "archivedAt",
				story.certified_at AS "certifiedAt",
				story_certifier.name AS "certifiedByName",
				story.format,
				story.created_at AS "createdAt",
				story.updated_at AS "updatedAt",
				story_version.code,
				story_version.version,
				story_version.created_at AS "versionCreatedAt"
			FROM story
			LEFT JOIN chat ON story.chat_id = chat.id
			LEFT JOIN "user" story_certifier ON story.certified_by = story_certifier.id
			INNER JOIN ${LATEST_VERSIONS} latest ON story.id = latest.story_id
			INNER JOIN story_version
				ON story_version.story_id = story.id AND story_version.version = latest.max_version
			WHERE ${andAll(whereCondition, archived)}
			ORDER BY story.created_at DESC
			${limit}`;
	}

	private async getOrCreateStory(
		data: { chatId: string; slug: string; title: string },
		executor: DbExecutor = this.prisma,
	): Promise<Story> {
		const existing = await this.getStoryByChatAndSlug(data.chatId, data.slug, executor);
		if (existing) {
			return existing;
		}

		await executor.story.createMany({
			data: [{ chatId: data.chatId, slug: data.slug, title: data.title }],
			skipDuplicates: true,
		});

		const row = await this.getStoryByChatAndSlug(data.chatId, data.slug, executor);
		if (!row) {
			throw new Error(`Failed to create or retrieve story: ${data.chatId}/${data.slug}`);
		}
		return row;
	}

	private async getOrCreateStandaloneStory(data: {
		userId: string;
		projectId: string;
		slug: string;
		title: string;
	}): Promise<Story> {
		const existing = await this.getStandaloneStoryByUserAndSlug(data.userId, data.projectId, data.slug);
		if (existing) {
			return existing;
		}

		await this.prisma.story.createMany({
			data: [{ projectId: data.projectId, userId: data.userId, slug: data.slug, title: data.title }],
			skipDuplicates: true,
		});

		const row = await this.getStandaloneStoryByUserAndSlug(data.userId, data.projectId, data.slug);
		if (!row) {
			throw new Error(
				`Failed to create or retrieve standalone story: ${data.userId}/${data.projectId}/${data.slug}`,
			);
		}
		return row;
	}

	private async getStoryVersion(
		where: Prisma.StoryVersionWhereInput,
		options?: { latest?: boolean },
	): Promise<StoryVersionWithStory | null> {
		const row = await this.prisma.storyVersion.findFirst({
			where,
			include: { story: true },
			...(options?.latest && { orderBy: { version: 'desc' } }),
		});
		if (!row) {
			return null;
		}
		const { story, ...version } = row;
		return {
			...version,
			title: story.title,
			slug: story.slug,
			chatId: story.chatId,
			isLive: story.isLive,
			isLiveTextDynamic: story.isLiveTextDynamic,
			cacheSchedule: story.cacheSchedule,
			cacheScheduleDescription: story.cacheScheduleDescription,
			archivedAt: story.archivedAt,
			format: story.format,
		};
	}
}
