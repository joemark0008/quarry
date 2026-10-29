import { Injectable } from '@nestjs/common';
import { STORY_REFERENCE_TAG } from '@quarry/shared';
import type { StoryFormat } from '@quarry/shared/types';

import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { sharedStoryGrantsUser } from './shared-story.repository.js';
import { andAll, anyOf, inList, LATEST_VERSIONS } from './story-sql.js';

export type ReferenceableStoryListing = {
	storyId: string;
	chatId: string | null;
	chatTitle: string | null;
	slug: string;
	title: string;
	format: StoryFormat;
	authorName: string | null;
	ownerId: string | null;
	isPinned: boolean;
	isCertified: boolean;
	isSharedWithMe: boolean;
	updatedAt: Date;
};

export type ReferenceableStory = ReferenceableStoryListing & {
	versionId: string;
	version: number;
	code: string;
};

export type ReferenceableStoryFilters = {
	trustedOnly?: boolean;
	storyIds?: string[];
	folderIds?: string[];
	sharedWithMeOnly?: boolean;
	limit?: number;
	offset?: number;
};

export type MentioningChat = {
	chatId: string;
	title: string;
	updatedAt: Date;
	isOrigin: boolean;
};

type ListingRow = Omit<ReferenceableStoryListing, 'isPinned' | 'isCertified' | 'isSharedWithMe'> & {
	isPinned: boolean | null;
	shareVisibility: string | null;
	certifiedAt: Date | null;
};

const DEFAULT_LIMIT = 20;
export const MAX_REFERENCEABLE_STORIES_LIMIT = 200;
const MAX_MENTIONING_CHATS = 10;

/** Upstream `QUICK_QUESTION_FORK_TYPES` of `chat.queries`: quick-question forks never count as mentioning chats. */
const QUICK_QUESTION_FORK_TYPES = ['story_question', 'story_selection', 'chat_question', 'chat_selection'];

const LISTING_COLUMNS = Prisma.sql`
	story.id AS "storyId",
	story.chat_id AS "chatId",
	chat.title AS "chatTitle",
	story.slug,
	story.title,
	story.format,
	story_owner.name AS "authorName",
	story_owner.id AS "ownerId",
	shared_story.is_pinned AS "isPinned",
	shared_story.visibility AS "shareVisibility",
	story.certified_at AS "certifiedAt",
	story.updated_at AS "updatedAt"`;

/** Pinned first, then certified, then the most recently updated (upstream `trustedThenRecent`). */
const TRUSTED_THEN_RECENT = Prisma.sql`
	CASE WHEN shared_story.is_pinned = true THEN 0 ELSE 1 END,
	CASE WHEN story.certified_at IS NOT NULL THEN 0 ELSE 1 END,
	story.updated_at DESC,
	story.id ASC`;

/** Port of upstream `queries/story-reference.queries.ts`. */
@Injectable()
export class StoryReferenceRepository {
	constructor(private readonly prisma: PrismaService) {}

	/** Lists stories pinned first, then certified, then the most recently updated and shared with the user. */
	async listReferenceableStories(
		userId: string,
		projectId: string,
		filters: ReferenceableStoryFilters = {},
	): Promise<ReferenceableStory[]> {
		const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_REFERENCEABLE_STORIES_LIMIT);
		const rows = await this.prisma.$queryRaw<(ListingRow & { versionId: string; version: number; code: string })[]>`
			SELECT
				${LISTING_COLUMNS},
				story_version.id AS "versionId",
				story_version.version,
				story_version.code
			FROM story
			${listingJoins(projectId)}
			INNER JOIN ${LATEST_VERSIONS} latest ON latest.story_id = story.id
			INNER JOIN story_version
				ON story_version.story_id = story.id AND story_version.version = latest.max_version
			WHERE ${isReferenceable(userId, projectId, filters)}
			ORDER BY ${TRUSTED_THEN_RECENT}
			LIMIT ${limit}
			OFFSET ${filters.offset ?? 0}`;

		return rows.map((row) => toReferenceableStory(row, userId));
	}

	/** Every story the user can mention, in the same order, without the content of their latest version. */
	async listAllReferenceableStoryListings(userId: string, projectId: string): Promise<ReferenceableStoryListing[]> {
		const rows = await this.prisma.$queryRaw<ListingRow[]>`
			SELECT ${LISTING_COLUMNS}
			FROM story
			${listingJoins(projectId)}
			WHERE ${isReferenceable(userId, projectId)}
				AND exists (SELECT story_version.id FROM story_version WHERE story_version.story_id = story.id)
			ORDER BY ${TRUSTED_THEN_RECENT}`;

		return rows.map((row) => toReferenceableStory(row, userId));
	}

	async getReferenceableStory(
		userId: string,
		projectId: string,
		storyId: string,
	): Promise<ReferenceableStory | null> {
		const [story] = await this.listReferenceableStories(userId, projectId, { storyIds: [storyId], limit: 1 });
		return story ?? null;
	}

	/** Lists the chats that created the story then visibly referenced by mention or card. */
	async listMentioningChats(
		userId: string,
		projectId: string,
		storyId: string,
		originChatId: string | null,
	): Promise<MentioningChat[]> {
		const rows = await this.prisma.$queryRaw<{ chatId: string; title: string; updatedAt: Date }[]>`
			SELECT chat.id AS "chatId", chat.title, chat.updated_at AS "updatedAt"
			FROM chat
			WHERE chat.user_id = ${userId}
				AND chat.project_id = ${projectId}
				AND chat.deleted_at IS NULL
				AND coalesce(chat.fork_metadata->>'type', '') NOT IN (${Prisma.join(QUICK_QUESTION_FORK_TYPES)})
				AND ${anyOf(originChatId ? Prisma.sql`chat.id = ${originChatId}` : undefined, mentioningMessageParts(storyId))}
			ORDER BY CASE WHEN chat.id = ${originChatId} THEN 0 ELSE 1 END, chat.updated_at DESC
			LIMIT ${MAX_MENTIONING_CHATS}`;
		return rows.map((row) => ({ ...row, isOrigin: row.chatId === originChatId }));
	}
}

function listingJoins(projectId: string): Prisma.Sql {
	return Prisma.sql`
		LEFT JOIN chat ON story.chat_id = chat.id
		LEFT JOIN shared_story ON shared_story.story_id = story.id AND shared_story.project_id = ${projectId}
		LEFT JOIN "user" story_owner ON story_owner.id = coalesce(chat.user_id, story.user_id)`;
}

function toReferenceableStory<Row extends ListingRow>(
	{ isPinned, certifiedAt, shareVisibility, ...row }: Row,
	userId: string,
) {
	return {
		...row,
		isPinned: isPinned === true,
		isCertified: certifiedAt !== null,
		isSharedWithMe: shareVisibility === 'specific' && row.ownerId !== userId,
	};
}

function isReferenceable(userId: string, projectId: string, filters: ReferenceableStoryFilters = {}): Prisma.Sql {
	return andAll(
		Prisma.sql`coalesce(story.project_id, chat.project_id) = ${projectId}`,
		Prisma.sql`story.archived_at IS NULL`,
		anyOf(isOwnedBy(userId), isSharedWith(userId)),
		filters.trustedOnly ? isTrusted() : undefined,
		filters.storyIds ? inList(Prisma.sql`story.id`, filters.storyIds) : undefined,
		filters.folderIds ? isInFolders(filters.folderIds) : undefined,
		filters.sharedWithMeOnly ? isSharedSpecificallyWith(userId) : undefined,
	);
}

function isOwnedBy(userId: string): Prisma.Sql {
	return Prisma.sql`(chat.user_id = ${userId} OR (story.chat_id IS NULL AND story.user_id = ${userId}))`;
}

function isSharedWith(userId: string): Prisma.Sql {
	return andAll(
		Prisma.sql`shared_story.id IS NOT NULL`,
		anyOf(
			Prisma.sql`shared_story.visibility = 'project'`,
			Prisma.sql`shared_story.user_id = ${userId}`,
			sharedStoryGrantsUser(userId),
		),
	);
}

function isTrusted(): Prisma.Sql {
	return Prisma.sql`(shared_story.is_pinned = true OR story.certified_at IS NOT NULL)`;
}

function isInFolders(folderIds: string[]): Prisma.Sql {
	return Prisma.sql`story.id IN (
		SELECT story_folder_item.story_id FROM story_folder_item
		WHERE ${inList(Prisma.sql`story_folder_item.folder_id`, folderIds)}
	)`;
}

function isSharedSpecificallyWith(userId: string): Prisma.Sql {
	return andAll(Prisma.sql`shared_story.visibility = 'specific'`, sharedStoryGrantsUser(userId));
}

function mentioningMessageParts(storyId: string): Prisma.Sql {
	const id = escapeLikePattern(storyId);
	return Prisma.sql`exists (
		SELECT message_part.id
		FROM message_part
		INNER JOIN chat_message ON chat_message.id = message_part.message_id
		WHERE chat_message.chat_id = chat.id
			AND chat_message.superseded_at IS NULL
			AND message_part.type = 'text'
			AND (
				(chat_message.role = 'user' AND message_part.text LIKE ${`%@[story:${id}]%`} ESCAPE '\\')
				OR (
					chat_message.role = 'assistant'
					AND message_part.text LIKE ${`%<${STORY_REFERENCE_TAG} id="${id}"%`} ESCAPE '\\'
				)
			)
	)`;
}

function escapeLikePattern(value: string): string {
	return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
