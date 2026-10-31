import { useEffect } from 'react';
import { useNavigate, useRouter, useRouterState } from '@tanstack/react-router';

import { useSession } from '@/lib/auth-client';
import { invalidateSession } from '@/lib/session';
import { useAuthRoute } from '@/hooks/use-auth-route';
import { getSafeRedirectPath } from '@/lib/safe-redirect';
import { usePublicConfig } from '@/hooks/use-public-config';

const AUTH_ENTRY_ROUTES = ['/login', '/forgot-password', '/reset-password'];
const PUBLIC_AUTH_ROUTES = [...AUTH_ENTRY_ROUTES, '/email-verified'];

export const useSessionOrNavigateToIndexPage = () => {
	const navigate = useNavigate();
	const router = useRouter();
	const session = useSession();
	const navigation = useAuthRoute();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const searchStr = useRouterState({ select: (s) => s.location.searchStr });
	const config = usePublicConfig();
	const isUserSignupEnabled = config.data?.enableUserSignup === true;

	useEffect(() => {
		if (session.isPending || config.isPending) {
			return;
		}

		const canStayUnauthenticated =
			PUBLIC_AUTH_ROUTES.includes(pathname) || (pathname === '/signup' && isUserSignupEnabled);

		if (!session.data) {
			invalidateSession();
		}

		if (!session.data && !canStayUnauthenticated) {
			const redirect = getSafeRedirectPath(`${pathname}${searchStr ?? ''}`) ?? undefined;
			if (pathname === '/signup') {
				navigate({ to: '/login', search: { error: 'Sign up is disabled.', redirect } });
			} else {
				navigate({ to: navigation, search: { redirect } });
			}
		}

		// The _public guard handles login, signup and forgot-password, without racing a sign-out in progress.
		if (session.data && pathname === '/reset-password') {
			const redirect = getSafeRedirectPath(new URLSearchParams(searchStr ?? '').get('redirect'));
			if (redirect) {
				router.history.push(redirect);
			} else {
				navigate({ to: '/' });
			}
		}
	}, [
		session.isPending,
		session.data,
		config.isPending,
		navigate,
		router,
		navigation,
		pathname,
		searchStr,
		isUserSignupEnabled,
	]);

	return {
		...session,
		isPending: session.isPending || config.isPending,
	};
};
