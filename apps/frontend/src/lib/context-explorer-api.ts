import type { ApiInputs, ApiOutputs } from '@/lib/api-types';

import {
	CommitContextChangesDocument,
	ConnectContextRepositoryDocument,
	ContextBranchNameSuggestionDocument,
	ContextChangedFilesDocument,
	ContextFileDiffDocument,
	ContextFileDocument,
	ContextFileTreeDocument,
	ContextHistoricalDiffActionDocument,
	ContextPullHistoryDocument,
	ContextRepositoryStatusDocument,
	ContextRulesPreviewGroupsDocument,
	ContextSearchDocument,
	CreateContextBranchAndCommitDocument,
	CreateContextBranchDocument,
	DisconnectContextRepositoryDocument,
	DiscardAllContextChangesDocument,
	DiscardContextFileChangeDocument,
	PullLiveContextDocument,
	PushContextBranchDocument,
	SwitchContextBranchDocument,
	UpdateContextWorktreeDocument,
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
		getRepositoryStatus: query<void, Outputs['getRepositoryStatus']>(path('getRepositoryStatus'), async () =>
			reviveDates((await runQuery(ContextRepositoryStatusDocument, {})).contextRepositoryStatus),
		),
		getLiveContextPullHistory: query<void, Outputs['getLiveContextPullHistory']>(
			path('getLiveContextPullHistory'),
			async () => reviveDates((await runQuery(ContextPullHistoryDocument, {})).contextPullHistory),
		),
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
		getChangedFiles: query<void, Outputs['getChangedFiles']>(path('getChangedFiles'), async () =>
			reviveDates((await runQuery(ContextChangedFilesDocument, {})).contextChangedFiles),
		),
		getFileDiff: query<Inputs['getFileDiff'], Outputs['getFileDiff']>(path('getFileDiff'), async (input) =>
			reviveDates((await runQuery(ContextFileDiffDocument, { input })).contextFileDiff),
		),
		getHistoricalDiffAction: query<Inputs['getHistoricalDiffAction'], Outputs['getHistoricalDiffAction']>(
			path('getHistoricalDiffAction'),
			async (input) =>
				reviveDates(
					(await runQuery(ContextHistoricalDiffActionDocument, { input })).contextHistoricalDiffAction,
				),
		),
		suggestBranchName: query<void, Outputs['suggestBranchName']>(path('suggestBranchName'), async () =>
			reviveDates((await runQuery(ContextBranchNameSuggestionDocument, {})).contextBranchNameSuggestion),
		),
		pullLiveContext: mutation<void, Outputs['pullLiveContext']>(path('pullLiveContext'), async () =>
			reviveDates((await runMutation(PullLiveContextDocument, {})).pullLiveContext),
		),
		connectRepository: mutation<Inputs['connectRepository'], Outputs['connectRepository']>(
			path('connectRepository'),
			async (input) =>
				reviveDates((await runMutation(ConnectContextRepositoryDocument, { input })).connectContextRepository),
		),
		disconnectRepository: mutation<void, Outputs['disconnectRepository']>(path('disconnectRepository'), async () =>
			reviveDates((await runMutation(DisconnectContextRepositoryDocument, {})).disconnectContextRepository),
		),
		writeFile: mutation<Inputs['writeFile'], Outputs['writeFile']>(path('writeFile'), async (input) =>
			reviveDates((await runMutation(WriteContextFileDocument, { input })).writeContextFile),
		),
		updateWorktree: mutation<Inputs['updateWorktree'], Outputs['updateWorktree']>(
			path('updateWorktree'),
			async ({ requiredCommits }) =>
				reviveDates(
					(await runMutation(UpdateContextWorktreeDocument, { requiredCommits })).updateContextWorktree,
				),
		),
		switchBranch: mutation<Inputs['switchBranch'], Outputs['switchBranch']>(
			path('switchBranch'),
			async ({ branch }) =>
				reviveDates((await runMutation(SwitchContextBranchDocument, { branch })).switchContextBranch),
		),
		createBranch: mutation<Inputs['createBranch'], Outputs['createBranch']>(
			path('createBranch'),
			async ({ branch }) =>
				reviveDates((await runMutation(CreateContextBranchDocument, { branch })).createContextBranch),
		),
		createBranchAndCommit: mutation<Inputs['createBranchAndCommit'], Outputs['createBranchAndCommit']>(
			path('createBranchAndCommit'),
			async (input) =>
				reviveDates(
					(await runMutation(CreateContextBranchAndCommitDocument, { input })).createContextBranchAndCommit,
				),
		),
		commitChanges: mutation<Inputs['commitChanges'], Outputs['commitChanges']>(
			path('commitChanges'),
			async (input) =>
				reviveDates((await runMutation(CommitContextChangesDocument, { input })).commitContextChanges),
		),
		discardLocalChange: mutation<Inputs['discardLocalChange'], Outputs['discardLocalChange']>(
			path('discardLocalChange'),
			async ({ path: filePath }) =>
				reviveDates(
					(await runMutation(DiscardContextFileChangeDocument, { path: filePath })).discardContextFileChange,
				),
		),
		discardAllChanges: mutation<void, Outputs['discardAllChanges']>(path('discardAllChanges'), async () =>
			reviveDates((await runMutation(DiscardAllContextChangesDocument, {})).discardAllContextChanges),
		),
		pushBranch: mutation<void, Outputs['pushBranch']>(path('pushBranch'), async () =>
			reviveDates((await runMutation(PushContextBranchDocument, {})).pushContextBranch),
		),
	},
};
