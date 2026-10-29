import { useQuery } from '@tanstack/react-query';

import { trpc } from '@/main';
import { useCurrentProject } from '@/hooks/use-current-project';

export function useCanSeeAdvancedSettings(): boolean {
	const project = useCurrentProject();
	const effectiveAccess = useQuery({
		...trpc.userGroup.effectiveAccess.queryOptions(),
		enabled: Boolean(project.data),
	});
	if (project.isSuccess && !project.data) {
		return true;
	}
	return effectiveAccess.data?.canSeeAdvancedSettings === true;
}
