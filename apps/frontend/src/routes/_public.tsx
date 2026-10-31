import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import { fetchSession } from '@/lib/session';
import { getSafeRedirectPath } from '@/lib/safe-redirect';

export const Route = createFileRoute('/_public')({
	beforeLoad: async ({ location }) => {
		if (await fetchSession()) {
			const target = getSafeRedirectPath((location.search as { redirect?: string }).redirect);
			throw redirect({ href: target ?? '/' });
		}
	},
	component: Outlet,
});
