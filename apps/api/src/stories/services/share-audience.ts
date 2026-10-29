import { HandlerError } from '../../common/errors/handler-error.js';
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

/** Upstream `project-sharing.service` `assertCanShareToProject`. */
export async function assertCanShareToProject(projectId: string, userId: string): Promise<void> {
	assertAudienceIncludesProject(await getShareAudience(projectId, userId));
}

/** Upstream `project-sharing.service` `assertCanShareWith`. */
export async function assertCanShareWith(
	projectId: string,
	userId: string,
	recipients: ShareRecipients,
): Promise<void> {
	const { userIds = [], groupIds = [] } = recipients;
	if (userIds.length === 0 && groupIds.length === 0) {
		return;
	}
	assertAudienceIncludes(await getShareAudience(projectId, userId), recipients);
}

/**
 * Upstream `shareable-user-groups.service` `filterShareableUserGroupIds`: no user group is shareable until Phase 6,
 * so none of the ids passes.
 */
export async function filterShareableUserGroupIds(_projectId: string, _groupIds: string[]): Promise<string[]> {
	return [];
}

/** Upstream `assertShareableUserGroupIds`: any group id is refused until user groups exist (Phase 6). */
export async function assertShareableUserGroupIds(projectId: string, groupIds: string[]): Promise<void> {
	const shareableGroupIds = await filterShareableUserGroupIds(projectId, groupIds);
	if (shareableGroupIds.length !== groupIds.length) {
		throw new HandlerError('BAD_REQUEST', 'One or more user groups cannot be shared with.');
	}
}

/**
 * Upstream `user-group-feature-access.service` `hasUserGroupFeature`: without user groups every project member has
 * every feature (upstream's default group).
 */
export async function hasUserGroupFeature(projectId: string, userId: string, _feature: string): Promise<boolean> {
	return (await projectQueries.getUserRoleInProject(projectId, userId)) !== null;
}
