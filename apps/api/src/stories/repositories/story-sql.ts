import { randomUUID } from 'node:crypto';

import { Prisma, type StoryVersion } from '../../generated/prisma/client.js';
import type { DbExecutor } from '../../prisma/prisma.types.js';

/**
 * SQL fragments the story repositories share (upstream repeats them per query file as Drizzle builders:
 * `latestVersionsSubquery`, the `coalesce(max(version), 0) + 1` next-version subselect).
 */

/** `(story_id, max_version)` of every story, joined as `latest` (upstream `latestVersionsSubquery`). */
export const LATEST_VERSIONS = Prisma.sql`(
	SELECT story_version.story_id, max(story_version.version) AS max_version
	FROM story_version
	GROUP BY story_version.story_id
)`;

/** `IN (…)` that is false for an empty list, as Drizzle's `inArray`. */
export function inList(column: Prisma.Sql, values: readonly string[]): Prisma.Sql {
	return values.length === 0 ? Prisma.sql`false` : Prisma.sql`${column} IN (${Prisma.join(values)})`;
}

/** `a AND b AND …`, skipping the undefined parts, as Drizzle's `and`. */
export function andAll(...parts: (Prisma.Sql | undefined)[]): Prisma.Sql {
	const defined = parts.filter((part): part is Prisma.Sql => part !== undefined);
	return defined.length === 0 ? Prisma.sql`true` : Prisma.sql`(${Prisma.join(defined, ' AND ')})`;
}

/** `a OR b OR …`, skipping the undefined parts, as Drizzle's `or`. */
export function anyOf(...parts: (Prisma.Sql | undefined)[]): Prisma.Sql {
	const defined = parts.filter((part): part is Prisma.Sql => part !== undefined);
	return defined.length === 0 ? Prisma.sql`false` : Prisma.sql`(${Prisma.join(defined, ' OR ')})`;
}

/** Inserts the version after the story's latest in one statement (upstream `version: sql\`(${nextVersion})\``). */
export async function insertNextStoryVersion(
	executor: DbExecutor,
	data: { storyId: string; code: string; action: string; source: string; versionNumber?: number },
): Promise<StoryVersion> {
	const version =
		data.versionNumber ??
		Prisma.sql`(SELECT coalesce(max(story_version.version), 0) + 1 FROM story_version WHERE story_version.story_id = ${data.storyId})`;
	const [created] = await executor.$queryRaw<StoryVersion[]>`
		INSERT INTO story_version (id, story_id, code, action, source, version)
		VALUES (${randomUUID()}, ${data.storyId}, ${data.code}, ${data.action}, ${data.source}, ${version})
		RETURNING id, story_id AS "storyId", version, code, action, source, created_at AS "createdAt"`;
	return created;
}
