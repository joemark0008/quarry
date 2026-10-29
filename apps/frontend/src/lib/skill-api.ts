import type { ApiOutputs } from '@/lib/api-types';

import { SkillCatalogDocument, SkillLoadErrorsDocument, SkillsDocument } from '@/graphql/generated/graphql';
import { query, runQuery } from '@/lib/apollo-procedures';

type Outputs = ApiOutputs['skill'];

/** Project skills moved to apps/api (`lib/apollo-procedures.ts`): call sites swap upstream tRPC's `skill.*` for `skillApi.skill.*`. */
export const skillApi = {
	skill: {
		list: query<void, Outputs['list']>(['skill', 'list'], async () => (await runQuery(SkillsDocument, {})).skills),
		catalog: query<void, Outputs['catalog']>(
			['skill', 'catalog'],
			async () => (await runQuery(SkillCatalogDocument, {})).skillCatalog,
		),
		listLoadErrors: query<void, Outputs['listLoadErrors']>(
			['skill', 'listLoadErrors'],
			async () => (await runQuery(SkillLoadErrorsDocument, {})).skillLoadErrors,
		),
	},
};
