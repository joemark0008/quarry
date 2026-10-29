import type { StoryDelivery as DBStoryDelivery } from '../../generated/prisma/client.js';
import { projectQueries, sharedStoryQueries, storyDeliveryQueries, storyQueries } from '../story-queries.js';

/** Users subscribed to a story's scheduled delivery. Empty when delivery is disabled or unconfigured. */
export async function resolveDeliverySubscriberIds(storyId: string): Promise<string[]> {
	const delivery = await storyDeliveryQueries.getByStoryId(storyId);
	if (!delivery || !delivery.enabled) {
		return [];
	}
	const projectId = delivery.projectId ?? (await storyQueries.getStoryProjectId(storyId));
	if (!projectId) {
		return [];
	}
	const ownerId = (await storyQueries.getStoryOwnerId(storyId)) ?? null;
	return resolveDeliveryRecipientUserIds(delivery, storyId, projectId, ownerId);
}

export async function resolveDeliveryRecipientUserIds(
	delivery: DBStoryDelivery,
	storyId: string,
	projectId: string,
	ownerId: string | null,
): Promise<string[]> {
	const accessibleIds = await currentProjectAccessIds(projectId);

	if (delivery.recipientMode !== 'all') {
		const recipientIds = await resolveSpecificRecipientUserIds(
			projectId,
			delivery.recipientUserIds as string[],
			delivery.recipientGroupIds as string[],
		);
		return recipientIds.filter((id) => accessibleIds.has(id));
	}

	const access = await sharedStoryQueries.getStoryShareAccess(storyId, projectId);
	if (!access) {
		return excludeOwner([...accessibleIds], ownerId);
	}

	if (access.visibility === 'specific') {
		return excludeOwner(
			access.recipientUserIds.filter((id) => accessibleIds.has(id)),
			ownerId,
		);
	}

	return excludeOwner([...accessibleIds], ownerId);
}

/** Users picked directly plus the current members of every picked user group. */
export async function resolveSpecificRecipientUserIds(
	projectId: string,
	userIds: string[],
	groupIds: string[],
): Promise<string[]> {
	const groupMemberIds = await listShareableUserGroupMemberIds(projectId, groupIds);
	return dedupe([...userIds, ...groupMemberIds]);
}

async function currentProjectAccessIds(projectId: string): Promise<Set<string>> {
	const members = await projectQueries.listUsersWithProjectAccess(projectId);
	return new Set(members.map((member) => member.id));
}

function excludeOwner(ids: string[], ownerId: string | null): string[] {
	return dedupe(ids.filter((id) => id !== ownerId));
}

function dedupe(ids: string[]): string[] {
	return [...new Set(ids)];
}

/** quarry: user groups are Phase 6, so no group is shareable yet (upstream `shareable-user-groups.service`). */
async function listShareableUserGroupMemberIds(_projectId: string, _groupIds: string[]): Promise<string[]> {
	return [];
}
