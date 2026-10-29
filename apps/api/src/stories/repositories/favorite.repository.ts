import { Injectable } from '@nestjs/common';
import { z } from 'zod/v4';

import { PrismaService } from '../../prisma/prisma.service.js';

export const favoriteTargetSchema = z.object({
	type: z.enum(['story', 'folder']),
	id: z.string(),
});

export type FavoriteTarget = z.infer<typeof favoriteTargetSchema>;

/** Port of upstream `queries/favorite.queries.ts`. */
@Injectable()
export class FavoriteRepository {
	constructor(private readonly prisma: PrismaService) {}

	toggleFavorite(userId: string, target: FavoriteTarget): Promise<boolean> {
		const condition = target.type === 'story' ? { userId, storyId: target.id } : { userId, folderId: target.id };

		const values =
			target.type === 'story'
				? { userId, storyId: target.id, folderId: null }
				: { userId, storyId: null, folderId: target.id };

		return this.prisma.$transaction(async (tx) => {
			const { count } = await tx.favorite.deleteMany({ where: condition });
			if (count > 0) {
				return false;
			}

			await tx.favorite.createMany({ data: [values], skipDuplicates: true });
			return true;
		});
	}

	async listFavorites(userId: string, projectId: string): Promise<{ storyIds: string[]; folderIds: string[] }> {
		const [storyRows, folderRows] = await Promise.all([
			this.prisma.$queryRaw<{ storyId: string | null }[]>`
				SELECT favorite.story_id AS "storyId"
				FROM favorite
				INNER JOIN story ON story.id = favorite.story_id
				LEFT JOIN chat ON chat.id = story.chat_id
				WHERE favorite.user_id = ${userId} AND coalesce(chat.project_id, story.project_id) = ${projectId}`,
			this.prisma.favorite.findMany({
				where: { userId, storyFolder: { projectId } },
				select: { folderId: true },
			}),
		]);

		const storyIds = storyRows.map((row) => row.storyId).filter((id): id is string => id !== null);
		const folderIds = folderRows.map((row) => row.folderId).filter((id): id is string => id !== null);

		return { storyIds, folderIds };
	}
}
