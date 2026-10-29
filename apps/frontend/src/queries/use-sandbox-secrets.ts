import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { sandboxApi } from '@/lib/sandbox-api';

export function useSandboxSecretsQuery() {
	return useQuery(sandboxApi.sandboxSecret.list.queryOptions());
}

/**
 * Every mutation refetches the list instead of patching the cache: the list is scoped to the active
 * project on the server, so a patch could land in another project's entry after a switch.
 */
export function useSandboxSecretMutations() {
	const queryClient = useQueryClient();
	const invalidateList = () => queryClient.invalidateQueries({ queryKey: sandboxApi.sandboxSecret.list.queryKey() });

	const setMutation = useMutation(sandboxApi.sandboxSecret.set.mutationOptions({ onSuccess: invalidateList }));
	const updateDescriptionMutation = useMutation(
		sandboxApi.sandboxSecret.updateDescription.mutationOptions({ onSuccess: invalidateList }),
	);
	const deleteMutation = useMutation(sandboxApi.sandboxSecret.delete.mutationOptions({ onSuccess: invalidateList }));

	return { setMutation, updateDescriptionMutation, deleteMutation };
}
