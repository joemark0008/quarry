import { createFileRoute, redirect } from '@tanstack/react-router';

import { AppLayout } from '@/layout/app-layout';
import { fetchSession } from '@/lib/session';
import { getSafeRedirectPath } from '@/lib/safe-redirect';

export const Route = createFileRoute('/_protected')({
	beforeLoad: async ({ location }) => {
		const session = await fetchSession();
		if (!session) {
			throw redirect({
				to: '/login',
				search: { error: undefined, redirect: getSafeRedirectPath(location.href) ?? undefined },
			});
		}
		return { session };
	},
	component: AppLayout,
});
