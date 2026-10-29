import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import type { StoryStateScope } from '@quarry/shared/story-app';

import { Prisma, type StoryAppState } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface StoryAppStateKey {
	storyId: string;
	scope: StoryStateScope;
	userId: string | null;
	key: string;
}

/** Port of upstream `queries/story-app-state.queries.ts`. */
@Injectable()
export class StoryAppStateRepository {
	constructor(private readonly prisma: PrismaService) {}

	listUserStoryAppState(storyId: string, userId: string): Promise<StoryAppState[]> {
		return this.prisma.storyAppState.findMany({ where: { storyId, scope: 'user', userId } });
	}

	listProjectStoryAppState(storyId: string): Promise<StoryAppState[]> {
		return this.prisma.storyAppState.findMany({ where: { storyId, scope: 'project' } });
	}

	async hasStoryAppStateKey(stateKey: StoryAppStateKey): Promise<boolean> {
		const row = await this.prisma.storyAppState.findFirst({ where: matchesKey(stateKey), select: { id: true } });
		return row !== null;
	}

	countStoryAppStateKeys(storyId: string, scope: StoryStateScope, userId: string | null): Promise<number> {
		return this.prisma.storyAppState.count({ where: { storyId, scope, userId } });
	}

	/** Upserts on the partial unique index of the scope (`story_app_state_{project,user}_key_unique`). */
	async upsertStoryAppState(stateKey: StoryAppStateKey, value: unknown, updatedBy: string): Promise<void> {
		const conflictTarget =
			stateKey.scope === 'project'
				? Prisma.sql`(story_id, key) WHERE scope = 'project'`
				: Prisma.sql`(story_id, user_id, key) WHERE scope = 'user'`;
		const json = JSON.stringify(value);
		const now = new Date();
		await this.prisma.$executeRaw`
			INSERT INTO story_app_state (id, story_id, scope, user_id, key, value, updated_by, updated_at)
			VALUES (
				${randomUUID()},
				${stateKey.storyId},
				${stateKey.scope},
				${stateKey.userId},
				${stateKey.key},
				${json}::jsonb,
				${updatedBy},
				${now}
			)
			ON CONFLICT ${conflictTarget}
			DO UPDATE SET value = ${json}::jsonb, updated_by = ${updatedBy}, updated_at = ${now}`;
	}

	async deleteStoryAppState(stateKey: StoryAppStateKey): Promise<void> {
		await this.prisma.storyAppState.deleteMany({ where: matchesKey(stateKey) });
	}
}

/** `userId: null` matches `IS NULL`, as upstream `matchesUser`. */
function matchesKey({ storyId, scope, userId, key }: StoryAppStateKey): Prisma.StoryAppStateWhereInput {
	return { storyId, scope, key, userId };
}
