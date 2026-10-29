import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { UserRole } from '@quarry/shared/types';
import { trpc } from '@/main';
import { useCurrentProject } from '@/hooks/use-current-project';

export function usePermissions() {
	const project = useCurrentProject();
	const org = useQuery(trpc.organization.get.queryOptions());
	const role = project.data?.userRole as UserRole | undefined;

	return useMemo(
		() => ({
			role,
			isAdmin: role === 'admin',
			isUser: role === 'user',
			isViewer: role === 'viewer',
			isContextAdmin: role === 'context_admin',
			isOrgAdmin: org.data?.role === 'admin',
			canSendMessages: role === 'admin' || role === 'user' || role === 'context_admin',
			canShare: role === 'admin' || role === 'user' || role === 'context_admin',
			canEditSettings: role === 'admin',
			canInvite: role === 'admin',
			canViewUsage: role === 'admin' || role === 'user' || role === 'context_admin',
			canViewAllUsage: role === 'admin',
			canViewChatReplay: role === 'admin' || role === 'context_admin',
			canViewRecommendations: role === 'admin' || role === 'context_admin',
			canChatWithQuarryData: role === 'admin' || role === 'context_admin',
			canStartNewChat: role !== 'viewer' && !!role,
			canViewSharedObjects: !!role,
		}),
		[role, org.data?.role],
	);
}

export type Permissions = ReturnType<typeof usePermissions>;
export type PermissionKey = keyof Omit<Permissions, 'role'>;
