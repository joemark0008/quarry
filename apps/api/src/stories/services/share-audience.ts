import { projectQueries } from '../story-queries.js';

/**
 * Stand-in for upstream `services/project-sharing.service.ts` (share audiences), like `ProjectSharingService` in the
 * chats module: until user groups (Phase 6) every member may share with the whole project and with any member, and
 * no group is shareable. Stage 3 (story sharing) uses the same functions.
 */
export interface ShareAudience {
	canShareToProject: boolean;
	memberIds: Set<string>;
	groupIds: Set<string>;
}

export interface ShareRecipients {
	userIds?: string[];
	groupIds?: string[];
}

export async function getShareAudience(projectId: string, _userId: string): Promise<ShareAudience> {
	const users = await projectQueries.listUsersWithProjectAccess(projectId);
	return { canShareToProject: true, memberIds: new Set(users.map((user) => user.id)), groupIds: new Set() };
}

export async function listShareableGroups(
	_projectId: string,
	_userId: string,
): Promise<{ id: string; name: string; memberCount: number }[]> {
	return [];
}

export function assertAudienceIncludesProject(_audience: ShareAudience): void {}

export function assertAudienceIncludes(_audience: ShareAudience, _recipients: ShareRecipients): void {}
