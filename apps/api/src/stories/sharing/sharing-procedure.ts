import type { UserRole } from '@quarry/shared/types';

import { HandlerError } from '../../common/errors/handler-error.js';
import { ProcedureBuilder, protectedProcedure } from '../procedure.js';
import { projectQueries } from '../story-queries.js';

/**
 * Upstream `trpc.ts` `resourceProjectProcedure`: loads the resource named by the input's `inputField`, requires the
 * user to belong to its project and, optionally, to pass `checkAccess`. Adds `resource` and `userRole` to the context.
 */
export function resourceProjectProcedure<T extends { projectId: string }>(
	inputField: string,
	fetch: (id: string) => Promise<T | null>,
	label: string,
	checkAccess?: (resource: T, userId: string) => Promise<boolean>,
) {
	return protectedProcedure.use<{ resource: T; userRole: UserRole }>(async ({ ctx, getRawInput, next }) => {
		const rawInput = (await getRawInput()) as Record<string, unknown>;
		const resourceId = rawInput[inputField];
		if (typeof resourceId !== 'string') {
			throw new HandlerError('BAD_REQUEST', `${inputField} is required.`);
		}

		const resource = await fetch(resourceId);
		if (!resource) {
			throw new HandlerError('NOT_FOUND', `${label} not found.`);
		}

		const userRole: UserRole | null = await projectQueries.getUserRoleInProject(resource.projectId, ctx.user.id);
		if (!userRole) {
			throw new HandlerError('FORBIDDEN', 'You do not have access to this project.');
		}

		if (checkAccess) {
			const canAccess = await checkAccess(resource, ctx.user.id);
			if (!canAccess) {
				throw new HandlerError('FORBIDDEN', `You do not have access to this ${label.toLowerCase()}.`);
			}
		}

		return next({ ctx: { ...ctx, resource, userRole } });
	});
}

/** Upstream `trpc.ts` `publicProcedure`: no session needed (embeds authenticate with their token). */
export const publicProcedure = new ProcedureBuilder<Record<string, unknown>, unknown>();

/** Upstream `services/activity` `logActivity`: the activity log is Phase 5, so nothing is recorded. */
export async function logActivity(_input: Record<string, unknown>): Promise<void> {}

/** Upstream `notification.service` `notifySharedItem`: notifications are Phase 5. */
export async function notifySharedItem(_input: Record<string, unknown>): Promise<void> {}
