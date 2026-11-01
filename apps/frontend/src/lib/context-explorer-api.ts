import type { ApiInputs, ApiOutputs } from '@/lib/api-types';

import {
	ContextFileDocument,
	ContextFileTreeDocument,
	ContextRulesPreviewGroupsDocument,
	ContextSearchDocument,
	WriteContextFileDocument,
} from '@/graphql/generated/graphql';
import { mutation, query, reviveDates, runMutation, runQuery } from '@/lib/apollo-procedures';

type Inputs = ApiInputs['contextExplorer'];
type Outputs = ApiOutputs['contextExplorer'];

const path = (name: string) => ['contextExplorer', name] as const;

/**
 * The context explorer moved to apps/api (`lib/apollo-procedures.ts`): call sites swap upstream tRPC's `contextExplorer.*` for
 * `contextExplorerApi.contextExplorer.*`. The API returns upstream's shapes through the `JSON` scalar.
 */
export const contextExplorerApi = {
	contextExplorer: {
		getFileTree: query<void, Outputs['getFileTree']>(path('getFileTree'), async () =>
			reviveDates((await runQuery(ContextFileTreeDocument, {})).contextFileTree),
		),
		getRulesPreviewGroups: query<void, Outputs['getRulesPreviewGroups']>(path('getRulesPreviewGroups'), async () =>
			reviveDates((await runQuery(ContextRulesPreviewGroupsDocument, {})).contextRulesPreviewGroups),
		),
		readFile: query<Inputs['readFile'], Outputs['readFile']>(path('readFile'), async ({ path: filePath }) =>
			reviveDates((await runQuery(ContextFileDocument, { path: filePath })).contextFile),
		),
		searchContent: query<Inputs['searchContent'], Outputs['searchContent']>(
			path('searchContent'),
			async ({ query: text }) =>
				reviveDates((await runQuery(ContextSearchDocument, { query: text })).contextSearch),
		),
		writeFile: mutation<Inputs['writeFile'], Outputs['writeFile']>(path('writeFile'), async (input) =>
			reviveDates((await runMutation(WriteContextFileDocument, { input })).writeContextFile),
		),
	},
};
