import { useIsCloud } from '@/hooks/use-nao-mode';
import { useHasUsers, usePublicConfig } from '@/hooks/use-public-config';

export function useAuthRoute(): string {
	const hasUsers = useHasUsers();
	const config = usePublicConfig();

	const isCloud = useIsCloud();
	const isUserSignupEnabled = config.data?.enableUserSignup === true;
	const hasExistingUsers = hasUsers.data ?? true;

	if (isUserSignupEnabled && (isCloud || !hasExistingUsers)) {
		return '/signup';
	}
	return '/login';
}
