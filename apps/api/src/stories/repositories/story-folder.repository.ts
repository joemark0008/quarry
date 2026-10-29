import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { SHARED_WITH_ME_FOLDER_ID } from '@quarry/shared';
import type { FolderVisibility } from '@quarry/shared/types';

import { Prisma, type StoryFolder } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { DbExecutor } from '../../prisma/prisma.types.js';
import { sharedStoryGrantsUser } from './shared-story.repository.js';
import type { ReferenceableStoryFilters } from './story-reference.repository.js';

type FolderStoryFilters = Pick<ReferenceableStoryFilters, 'folderIds' | 'sharedWithMeOnly'>;

type FolderMoveTx = Prisma.TransactionClient;

export class MoveFolderCycleError extends Error {
	constructor() {
		super('Moving this folder would create a cycle.');
		this.name = 'MoveFolderCycleError';
	}
}

export class SystemFolderError extends Error {
	constructor() {
		super('System folders cannot be modified.');
		this.name = 'SystemFolderError';
	}
}

export type StoryFolderWithCount = StoryFolder & { storyCount: number };

export type VirtualSharedWithMeFolder = {
	id: '__shared_with_me__';
	ownerId: null;
	projectId: string;
	parentId: null;
	name: 'Shared with me';
	visibility: 'public';
	systemType: 'shared_with_me';
	archivedAt: null;
	createdAt: Date;
	updatedAt: Date;
	storyCount: number;
};

export type FolderTreeEntry = StoryFolderWithCount | VirtualSharedWithMeFolder;

/** Port of upstream `queries/story-folder.queries.ts` (PostgreSQL only, so moves always take the advisory lock). */
@Injectable()
export class StoryFolderRepository {
	constructor(private readonly prisma: PrismaService) {}

	async listFolderTree(
		userId: string,
		projectId: string,
		options?: { archived?: boolean; isViewer?: boolean },
	): Promise<FolderTreeEntry[]> {
		const archivedFilter = options?.archived
			? Prisma.sql`story_folder.archived_at IS NOT NULL`
			: Prisma.sql`story_folder.archived_at IS NULL`;
		const visibilityFilter = options?.isViewer
			? Prisma.sql`story_folder.visibility = 'public'`
			: Prisma.sql`(story_folder.visibility = 'public' OR story_folder.owner_id = ${userId})`;

		const folders = await this.prisma.$queryRaw<StoryFolderWithCount[]>`
			SELECT
				story_folder.id,
				story_folder.owner_id AS "ownerId",
				story_folder.project_id AS "projectId",
				story_folder.parent_id AS "parentId",
				story_folder.name,
				story_folder.visibility,
				story_folder.system_type AS "systemType",
				story_folder.archived_at AS "archivedAt",
				story_folder.created_at AS "createdAt",
				story_folder.updated_at AS "updatedAt",
				coalesce(item_counts.cnt, 0)::int AS "storyCount"
			FROM story_folder
			LEFT JOIN (
				SELECT story_folder_item.folder_id, count(story_folder_item.story_id) AS cnt
				FROM story_folder_item
				GROUP BY story_folder_item.folder_id
			) item_counts ON item_counts.folder_id = story_folder.id
			WHERE story_folder.project_id = ${projectId} AND ${archivedFilter} AND ${visibilityFilter}
			ORDER BY story_folder.name ASC`;

		if (options?.archived) {
			return folders;
		}

		const sharedWithMeCount = await this.countSharedWithMeStories(userId, projectId);
		if (sharedWithMeCount > 0) {
			const virtual: VirtualSharedWithMeFolder = {
				id: '__shared_with_me__',
				ownerId: null,
				projectId,
				parentId: null,
				name: 'Shared with me',
				visibility: 'public',
				systemType: 'shared_with_me',
				archivedAt: null,
				createdAt: new Date(0),
				updatedAt: new Date(0),
				storyCount: sharedWithMeCount,
			};
			return [virtual, ...folders];
		}

		return folders;
	}

	/**
	 * The filters selecting the stories of a folder and of its subfolders, null when the folder is archived or
	 * out of the user's reach. The stories themselves still have to be checked for access.
	 */
	async findReferencedFolder(
		userId: string,
		projectId: string,
		folderId: string,
	): Promise<{ name: string; filters: FolderStoryFilters } | null> {
		if (folderId === SHARED_WITH_ME_FOLDER_ID) {
			return { name: 'Shared with me', filters: { sharedWithMeOnly: true } };
		}
		const folder = await this.getFolderById(folderId);
		if (!folder || folder.projectId !== projectId || folder.archivedAt !== null || !isVisibleTo(folder, userId)) {
			return null;
		}
		return { name: folder.name, filters: { folderIds: await this.listDescendantFolderIds(folderId) } };
	}

	getFolderById(id: string, executor: DbExecutor = this.prisma): Promise<StoryFolder | null> {
		return executor.storyFolder.findUnique({ where: { id } });
	}

	async ensurePrivateRoot(userId: string, projectId: string, executor: DbExecutor = this.prisma): Promise<string> {
		const [folder] = await executor.$queryRaw<{ id: string }[]>`
			INSERT INTO story_folder (id, owner_id, project_id, name, visibility, system_type, parent_id)
			VALUES (${randomUUID()}, ${userId}, ${projectId}, 'My private folder', 'private', 'private_folder', NULL)
			ON CONFLICT (project_id, owner_id) WHERE system_type = 'private_folder'
			DO UPDATE SET owner_id = ${userId}
			RETURNING id`;

		return folder!.id;
	}

	async saveStoryInPrivateRoot(
		userId: string,
		projectId: string,
		storyId: string,
		executor: DbExecutor = this.prisma,
	): Promise<void> {
		const folderId = await this.ensurePrivateRoot(userId, projectId, executor);
		await executor.storyFolderItem.createMany({ data: [{ storyId, folderId }], skipDuplicates: true });
	}

	async rehomeUnarchivedStory(userId: string, projectId: string, storyId: string): Promise<void> {
		const share = await this.prisma.sharedStory.findFirst({
			where: { storyId, projectId },
			select: { visibility: true },
		});

		if (share?.visibility === 'project') {
			await this.prisma.storyFolderItem.deleteMany({ where: { storyId } });
			return;
		}
		await this.saveStoryInPrivateRoot(userId, projectId, storyId);
	}

	async createFolder(data: {
		ownerId: string;
		projectId: string;
		name: string;
		parentId?: string | null;
	}): Promise<StoryFolder> {
		const parentVisibility = await this.resolveFolderVisibility(data.parentId ?? null);

		return this.prisma.storyFolder.create({
			data: {
				ownerId: data.ownerId,
				projectId: data.projectId,
				name: data.name,
				parentId: data.parentId ?? null,
				visibility: parentVisibility,
				systemType: null,
			},
		});
	}

	async updateFolder(id: string, data: { name?: string }): Promise<void> {
		await this.assertNotSystemFolder(id);
		const update: { name?: string } = {};
		if (data.name !== undefined) {
			update.name = data.name;
		}
		if (Object.keys(update).length === 0) {
			return;
		}
		await this.prisma.storyFolder.updateMany({ where: { id }, data: update });
	}

	async deleteFolderMovingContentsToParent(folderId: string): Promise<void> {
		await this.assertNotSystemFolder(folderId);
		const folder = await this.getFolderById(folderId);
		if (!folder) {
			return;
		}
		const newParentId = folder.parentId;

		if (newParentId === null) {
			await this.prisma.storyFolderItem.deleteMany({ where: { folderId } });
		} else {
			await this.prisma.storyFolderItem.updateMany({ where: { folderId }, data: { folderId: newParentId } });
		}

		await this.prisma.storyFolder.updateMany({ where: { parentId: folderId }, data: { parentId: newParentId } });

		await this.prisma.storyFolder.deleteMany({ where: { id: folderId } });
	}

	async archiveFolder(folderId: string, executor: DbExecutor = this.prisma): Promise<void> {
		await this.assertNotSystemFolder(folderId, executor);
		const folderIds = await this.listDescendantFolderIds(folderId, executor);
		const now = new Date();

		await executor.storyFolder.updateMany({ where: { id: { in: folderIds } }, data: { archivedAt: now } });

		await executor.storyFolder.updateMany({ where: { id: folderId }, data: { parentId: null } });

		const storyIds = await this.getStoryIdsInFolders(folderIds, executor);
		if (storyIds.length > 0) {
			await executor.story.updateMany({ where: { id: { in: storyIds } }, data: { archivedAt: now } });
		}
	}

	async unarchiveFolder(
		userId: string,
		projectId: string,
		folderId: string,
		executor: DbExecutor = this.prisma,
	): Promise<void> {
		const folderIds = await this.listDescendantFolderIds(folderId, executor);

		await executor.storyFolder.updateMany({ where: { id: { in: folderIds } }, data: { archivedAt: null } });

		const storyIds = await this.getStoryIdsInFolders(folderIds, executor);
		if (storyIds.length > 0) {
			await executor.story.updateMany({ where: { id: { in: storyIds } }, data: { archivedAt: null } });
		}

		const folder = await this.getFolderById(folderId, executor);
		if (!folder) {
			return;
		}
		const parentId =
			folder.visibility === 'private' ? await this.ensurePrivateRoot(userId, projectId, executor) : null;
		await executor.storyFolder.updateMany({ where: { id: folderId }, data: { parentId } });
	}

	async moveFolder(userId: string, projectId: string, id: string, newParentId: string | null): Promise<void> {
		await this.assertNotSystemFolder(id);

		await this.prisma.$transaction(async (tx) => {
			await serializeFolderMovesInProject(tx, projectId);
			await this.relocateFolder(userId, projectId, id, newParentId, tx);
		});
	}

	/** All-or-nothing, so a failing item never leaves part of the selection moved. */
	async moveItemsToFolder(
		userId: string,
		projectId: string,
		items: { folderIds: string[]; stories: { storyId: string; storyOwnerId: string }[] },
		targetFolderId: string | null,
	): Promise<void> {
		for (const folderId of items.folderIds) {
			await this.assertNotSystemFolder(folderId);
		}

		await this.prisma.$transaction(async (tx) => {
			await serializeFolderMovesInProject(tx, projectId);
			for (const folderId of items.folderIds) {
				await this.relocateFolder(userId, projectId, folderId, targetFolderId, tx);
			}
			for (const { storyId, storyOwnerId } of items.stories) {
				await this.placeStoryInFolder(storyId, targetFolderId, { storyOwnerId, projectId }, tx);
			}
		});
	}

	async ensureStoryPrivate(storyId: string, options: { storyOwnerId: string; projectId: string }): Promise<void> {
		await this.prisma.$transaction(async (tx) => {
			const current = await this.getStoryFolderItem(storyId, tx);
			const currentVisibility = await this.resolveFolderVisibility(current?.folderId ?? null, tx);
			if (currentVisibility === 'private') {
				return;
			}
			const privateFolderId = await this.ensurePrivateRoot(options.storyOwnerId, options.projectId, tx);
			await this.placeStoryInFolder(storyId, privateFolderId, options, tx);
		});
	}

	async moveStoryToFolder(
		storyId: string,
		folderId: string | null,
		options: { storyOwnerId: string; projectId: string },
	): Promise<void> {
		await this.prisma.$transaction((tx) => this.placeStoryInFolder(storyId, folderId, options, tx));
	}

	getStoryFolderItem(storyId: string, executor: DbExecutor = this.prisma): Promise<{ folderId: string } | null> {
		return executor.storyFolderItem.findUnique({ where: { storyId }, select: { folderId: true } });
	}

	listFolderItemsForProject(
		userId: string,
		projectId: string,
		options?: { isViewer?: boolean },
	): Promise<{ storyId: string; folderId: string }[]> {
		const visibilityFilter: Prisma.StoryFolderWhereInput = options?.isViewer
			? { visibility: 'public' }
			: { OR: [{ visibility: 'public' }, { ownerId: userId }] };

		return this.prisma.storyFolderItem.findMany({
			where: { storyFolder: { projectId, ...visibilityFilter } },
			select: { storyId: true, folderId: true },
		});
	}

	async proposedParentChainContains(
		startParentId: string,
		folderId: string,
		executor: DbExecutor = this.prisma,
	): Promise<boolean> {
		let currentId: string | null = startParentId;
		const visited = new Set<string>();

		while (currentId) {
			if (currentId === folderId || visited.has(currentId)) {
				return true;
			}
			visited.add(currentId);

			const row: { parentId: string | null } | null = await executor.storyFolder.findUnique({
				where: { id: currentId },
				select: { parentId: true },
			});

			currentId = row?.parentId ?? null;
		}

		return false;
	}

	private async countSharedWithMeStories(userId: string, projectId: string): Promise<number> {
		const [row] = await this.prisma.$queryRaw<{ cnt: number }[]>`
			SELECT count(shared_story.id)::int AS cnt
			FROM shared_story
			WHERE shared_story.project_id = ${projectId}
				AND shared_story.visibility = 'specific'
				AND ${sharedStoryGrantsUser(userId)}`;
		return row?.cnt ?? 0;
	}

	private async relocateFolder(
		userId: string,
		projectId: string,
		id: string,
		newParentId: string | null,
		tx: FolderMoveTx,
	): Promise<void> {
		if (newParentId !== null && (await this.proposedParentChainContains(newParentId, id, tx))) {
			throw new MoveFolderCycleError();
		}

		const newVisibility = await this.resolveFolderVisibility(newParentId, tx);
		const oldFolder = await this.getFolderById(id, tx);
		const oldVisibility = oldFolder?.visibility ?? 'public';

		await tx.storyFolder.updateMany({ where: { id }, data: { parentId: newParentId, visibility: newVisibility } });

		if (oldVisibility !== newVisibility) {
			const descendantIds = await this.listDescendantFolderIds(id, tx);
			if (descendantIds.length > 0) {
				await tx.storyFolder.updateMany({
					where: { id: { in: descendantIds } },
					data: { visibility: newVisibility },
				});
			}

			const storyIds = await this.getStoryIdsInFolders([id, ...descendantIds], tx);
			if (storyIds.length > 0) {
				await this.propagateShareChange(storyIds, projectId, userId, newVisibility, tx);
			}
		}
	}

	/** Folder placement and share visibility must change together, otherwise a story can sit in a public folder unshared. */
	private async placeStoryInFolder(
		storyId: string,
		folderId: string | null,
		options: { storyOwnerId: string; projectId: string },
		executor: DbExecutor,
	): Promise<void> {
		await executor.storyFolderItem.deleteMany({ where: { storyId } });

		if (folderId) {
			await executor.storyFolderItem.create({ data: { storyId, folderId } });
		}

		const newVisibility = await this.resolveFolderVisibility(folderId, executor);
		await this.propagateShareChange([storyId], options.projectId, options.storyOwnerId, newVisibility, executor);
	}

	private async propagateShareChange(
		storyIds: string[],
		projectId: string,
		ownerId: string,
		newVisibility: FolderVisibility,
		executor: DbExecutor = this.prisma,
	): Promise<void> {
		if (storyIds.length === 0) {
			return;
		}

		if (newVisibility === 'public') {
			const existing = await executor.sharedStory.findMany({
				where: { storyId: { in: storyIds }, projectId },
				select: { storyId: true, id: true, visibility: true },
			});
			const byStoryId = new Map(existing.map((row) => [row.storyId, row]));

			for (const storyId of storyIds) {
				const row = byStoryId.get(storyId);
				if (!row) {
					await executor.sharedStory.create({
						data: { storyId, projectId, userId: ownerId, visibility: 'project' },
					});
				} else if (row.visibility === 'specific') {
					await executor.sharedStory.updateMany({ where: { id: row.id }, data: { visibility: 'project' } });
					await executor.sharedStoryAccess.deleteMany({ where: { sharedStoryId: row.id } });
					await executor.sharedStoryGroupAccess.deleteMany({ where: { sharedStoryId: row.id } });
				}
			}
		} else {
			await executor.sharedStory.deleteMany({ where: { storyId: { in: storyIds }, visibility: 'project' } });
		}
	}

	private async resolveFolderVisibility(
		folderId: string | null,
		executor: DbExecutor = this.prisma,
	): Promise<FolderVisibility> {
		if (folderId === null) {
			return 'public';
		}
		const folder = await this.getFolderById(folderId, executor);
		return (folder?.visibility ?? 'public') as FolderVisibility;
	}

	private async assertNotSystemFolder(folderId: string, executor: DbExecutor = this.prisma): Promise<void> {
		const folder = await this.getFolderById(folderId, executor);
		if (folder?.systemType != null) {
			throw new SystemFolderError();
		}
	}

	private async listDescendantFolderIds(rootFolderId: string, executor: DbExecutor = this.prisma): Promise<string[]> {
		const visited = new Set<string>([rootFolderId]);
		let frontier: string[] = [rootFolderId];

		while (frontier.length > 0) {
			const children = await executor.storyFolder.findMany({
				where: { parentId: { in: frontier } },
				select: { id: true },
			});

			const nextFrontier: string[] = [];
			for (const { id } of children) {
				if (!visited.has(id)) {
					visited.add(id);
					nextFrontier.push(id);
				}
			}
			frontier = nextFrontier;
		}

		return Array.from(visited);
	}

	private async getStoryIdsInFolders(folderIds: string[], executor: DbExecutor = this.prisma): Promise<string[]> {
		if (folderIds.length === 0) {
			return [];
		}

		const rows = await executor.storyFolderItem.findMany({
			where: { folderId: { in: folderIds } },
			select: { storyId: true },
		});

		return rows.map((r) => r.storyId);
	}
}

function isVisibleTo(folder: StoryFolder, userId: string): boolean {
	return folder.visibility === 'public' || folder.ownerId === userId;
}

async function serializeFolderMovesInProject(tx: FolderMoveTx, projectId: string): Promise<void> {
	const lockKey = `story-folder-move:${projectId}`;
	await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
}
