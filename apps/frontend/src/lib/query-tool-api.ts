import type { ApiInputs, ApiOutputs } from '@/lib/api-types';

import type { ProjectQueryToolFieldsFragment } from '@/graphql/generated/graphql';
import {
	CreateProjectQueryToolDocument,
	DeleteProjectQueryToolDocument,
	PreviewProjectQueryToolDocument,
	ProjectQueryToolsDocument,
	QueryToolTableColumnsDocument,
	UpdateProjectQueryToolDocument,
} from '@/graphql/generated/graphql';
import { mutation, query, runMutation, runQuery } from '@/lib/apollo-procedures';

type Inputs = ApiInputs['queryTool'];
type Outputs = ApiOutputs['queryTool'];

/** Saved query tools of the selected project (Settings → Query tools), on apps/api's `query-tools` module. */
export const queryToolApi = {
	queryTool: {
		list: query<void, Outputs['list']>(['queryTool', 'list'], async () =>
			(await runQuery(ProjectQueryToolsDocument, {})).projectQueryTools.map(toQueryTool),
		),
		tableColumns: query<Inputs['tableColumns'], Outputs['tableColumns']>(
			['queryTool', 'tableColumns'],
			async (input) => (await runQuery(QueryToolTableColumnsDocument, input)).queryToolTableColumns,
		),
		create: mutation<Inputs['create'], Outputs['create']>(['queryTool', 'create'], async (input) =>
			toQueryTool((await runMutation(CreateProjectQueryToolDocument, { input })).createProjectQueryTool),
		),
		update: mutation<Inputs['update'], Outputs['update']>(['queryTool', 'update'], async (input) =>
			toQueryTool((await runMutation(UpdateProjectQueryToolDocument, { input })).updateProjectQueryTool),
		),
		delete: mutation<Inputs['delete'], void>(['queryTool', 'delete'], async ({ id }) => {
			await runMutation(DeleteProjectQueryToolDocument, { id });
		}),
		preview: mutation<Inputs['preview'], Outputs['preview']>(
			['queryTool', 'preview'],
			async (input) =>
				(await runMutation(PreviewProjectQueryToolDocument, { input }))
					.previewProjectQueryTool as Outputs['preview'],
		),
	},
};

function toQueryTool(tool: ProjectQueryToolFieldsFragment): Outputs['list'][number] {
	return {
		...tool,
		parameters: tool.parameters as Outputs['list'][number]['parameters'],
		createdAt: new Date(tool.createdAt),
		updatedAt: new Date(tool.updatedAt),
	};
}
