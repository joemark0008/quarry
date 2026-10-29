import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryToolApi } from '@/lib/query-tool-api';

export function useQueryToolsQuery() {
	return useQuery(queryToolApi.queryTool.list.queryOptions());
}

/** Mutations refetch the list (scoped to the active project on the server) instead of patching the cache. */
export function useQueryToolMutations() {
	const queryClient = useQueryClient();
	const invalidateList = () => queryClient.invalidateQueries({ queryKey: queryToolApi.queryTool.list.queryKey() });

	const createMutation = useMutation(queryToolApi.queryTool.create.mutationOptions({ onSuccess: invalidateList }));
	const updateMutation = useMutation(queryToolApi.queryTool.update.mutationOptions({ onSuccess: invalidateList }));
	const deleteMutation = useMutation(queryToolApi.queryTool.delete.mutationOptions({ onSuccess: invalidateList }));
	const previewMutation = useMutation(queryToolApi.queryTool.preview.mutationOptions());

	return { createMutation, updateMutation, deleteMutation, previewMutation };
}
