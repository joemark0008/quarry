import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { useCallback } from 'react';

import { useAuthRoute } from '@/hooks/use-auth-route';
import { clearApolloCache } from '@/lib/apollo-client';
import { signOut } from '@/lib/auth-client';
import { invalidateSession } from '@/lib/session';

export function useSignOut() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const router = useRouter();
	const authRoute = useAuthRoute();

	return useCallback(async () => {
		const { error } = await signOut();
		if (error) {
			throw new Error(error.message ?? 'Could not sign out');
		}
		invalidateSession();
		queryClient.clear();
		await clearApolloCache();
		await navigate({ to: authRoute, replace: true });
		await router.invalidate();
	}, [authRoute, navigate, queryClient, router]);
}
