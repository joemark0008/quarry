import type { ApiInputs, ApiOutputs } from '@/lib/api-types';
import type { DocumentNode, TypedDocumentNode } from '@apollo/client';

import {
	ChatForkAskStoryDocument,
	ChatForkForkStoryDocument,
	ChatForkOpenStandaloneDocument,
	CustomStoryViewerDownloadDocument,
	EmbedDownloadStoryDocument,
	EmbedGetChartDocument,
	EmbedGetMapDocument,
	EmbedGetStoryDocument,
	FavoriteListDocument,
	FavoriteToggleDocument,
	FeedbackGetStoryFeedbackDocument,
	FeedbackSubmitStoryFeedbackDocument,
	SharedChatDownloadStoryDocument,
	SharedStoryCreateDocument,
	SharedStoryDeleteDocument,
	SharedStoryDownloadCustomDocument,
	SharedStoryDownloadDocument,
	SharedStoryGetCustomStoryNarrativesDocument,
	SharedStoryGetCustomStoryQueryDataDocument,
	SharedStoryGetCustomStoryQuerySqlDocument,
	SharedStoryGetCustomStoryStateDocument,
	SharedStoryGetCustomVersionDocument,
	SharedStoryGetDocument,
	SharedStoryGetFilteredQueryDataDocument,
	SharedStoryGetFilterOptionsDocument,
	SharedStoryGetLiveQueryDataDocument,
	SharedStoryGetQuerySqlDocument,
	SharedStoryGetSharedStoryInfoDocument,
	SharedStoryGetStoryIdByShareIdDocument,
	SharedStoryGetVersionQueryDataDocument,
	SharedStoryListDocument,
	SharedStoryListShareableGroupsDocument,
	SharedStoryRefreshDataDocument,
	SharedStorySetCustomStoryStateDocument,
	SharedStoryTogglePinDocument,
	SharedStoryUpdateAccessDocument,
	StoryDownloadCustomDocument,
	StoryDownloadDocument,
	StoryDownloadStandaloneDocument,
	StoryThemeGenerateDocument,
	CustomStoryViewerGetFileDocument,
	CustomStoryViewerGetFormatDocument,
	CustomStoryViewerGetNarrativesDocument,
	CustomStoryViewerGetQueryDataDocument,
	CustomStoryViewerGetQuerySqlDocument,
	CustomStoryViewerGetStateDocument,
	CustomStoryViewerGetThemeDocument,
	CustomStoryViewerGetVersionDocument,
	CustomStoryViewerSetStateDocument,
	StoryArchiveDocument,
	StoryArchiveSharedDocument,
	StoryArchiveStandaloneDocument,
	StoryBulkArchiveDocument,
	StoryBulkUnarchiveDocument,
	StoryCreateVersionDocument,
	StoryDeletePermanentlyDocument,
	StoryEditCustomStoryBlockDocument,
	StoryFolderArchiveDocument,
	StoryFolderBulkArchiveDocument,
	StoryFolderBulkMoveDocument,
	StoryFolderBulkUnarchiveDocument,
	StoryFolderCreateDocument,
	StoryFolderDeleteDocument,
	StoryFolderListItemsDocument,
	StoryFolderListTreeDocument,
	StoryFolderMoveDocument,
	StoryFolderMoveStoryDocument,
	StoryFolderRenameDocument,
	StoryFolderUnarchiveDocument,
	StoryGetCertificationDocument,
	StoryGetCustomStoryNarrativesDocument,
	StoryGetCustomStoryQueryDataDocument,
	StoryGetCustomStoryQuerySqlDocument,
	StoryGetCustomStoryStateDocument,
	StoryGetCustomVersionDocument,
	StoryGetCustomVersionFileDocument,
	StoryGetDeliveryDocument,
	StoryGetFilterOptionsDocument,
	StoryGetFilteredQueryDataDocument,
	StoryGetIdByChatAndSlugDocument,
	StoryGetLatestDocument,
	StoryGetLiveQueryDataDocument,
	StoryGetQuerySqlDocument,
	StoryGetStandaloneDocument,
	StoryGetVersionQueryDataDocument,
	StoryListAllDocument,
	StoryListArchivedDocument,
	StoryListDeliveryRecipientGroupsDocument,
	StoryListDeliveryRecipientsDocument,
	StoryListMentioningChatsDocument,
	StoryListMostViewedDocument,
	StoryListQuickQuestionsDocument,
	StoryListReferenceableDocument,
	StoryListSharedArchivedDocument,
	StoryListStandaloneArchivedDocument,
	StoryListStandaloneDocument,
	StoryListStoriesDocument,
	StoryListVersionsDocument,
	StoryParseCronFromTextDocument,
	StoryRefreshDataDocument,
	StoryRenameDocument,
	StoryResolveDocument,
	StoryRestoreCustomVersionDocument,
	StorySaveCustomStoryFilesDocument,
	StorySetCustomStoryStateDocument,
	StoryThemeGetActiveDocument,
	StoryThemeGetStateDocument,
	StoryThemeListVersionsDocument,
	StoryThemeRestoreVersionDocument,
	StoryThemeSaveDocument,
	StoryThemeSetEnabledDocument,
	StoryToggleCertificationDocument,
	StoryUnarchiveDocument,
	StoryUnarchiveSharedDocument,
	StoryUnarchiveStandaloneDocument,
	StoryUpdateDeliveryDocument,
	StoryUpdateLiveSettingsDocument,
} from '@/graphql/generated/graphql';
import { mutation, query, reviveDates, runMutation, runQuery } from '@/lib/apollo-procedures';

type Inputs = ApiInputs;
type Outputs = ApiOutputs;

type StoryRouter =
	| 'story'
	| 'storyFolder'
	| 'storyTheme'
	| 'customStoryViewer'
	| 'chatFork'
	| 'storyShare'
	| 'embed'
	| 'favorite'
	| 'feedback'
	| 'sharedChat';
type Procedure<R extends StoryRouter> = keyof Inputs[R] & keyof Outputs[R] & string;

/** Whether an output carries `Date`s (superjson upstream), which the `JSON` scalar sends as ISO strings. */
type HasDate<T, Depth extends unknown[] = []> = Depth['length'] extends 8
	? false
	: T extends Date
		? true
		: T extends readonly (infer Item)[]
			? HasDate<Item, [...Depth, 1]>
			: T extends object
				? true extends { [K in keyof T]-?: HasDate<T[K], [...Depth, 1]> }[keyof T]
					? true
					: false
				: false;

/** Warehouse rows: upstream sent the cached ones as strings, so a `createdAt` column stays as it came. */
const ROW_KEYS = ['queryData'] as const;

/**
 * Every story field is `<router><Procedure>(input: JSON): JSON` with upstream's input and output unchanged
 * (`docs/stories-api.md`). `dates` must be `true` exactly when the output type carries `Date`s.
 */
function storyQuery<R extends StoryRouter, P extends Procedure<R>>(
	router: R,
	procedure: P,
	document: DocumentNode,
	dates: HasDate<Outputs[R][P]>,
) {
	return query<Inputs[R][P], Outputs[R][P]>([router, procedure], async (input) =>
		toOutput<Outputs[R][P]>(await runQuery(document, toVariables(input)), router, procedure, dates),
	);
}

function storyMutation<R extends StoryRouter, P extends Procedure<R>>(
	router: R,
	procedure: P,
	document: DocumentNode,
	dates: HasDate<Outputs[R][P]>,
) {
	return mutation<Inputs[R][P], Outputs[R][P]>([router, procedure], async (input) =>
		toOutput<Outputs[R][P]>(
			await runMutation(document as TypedDocumentNode<unknown, { input?: unknown }>, toVariables(input)),
			router,
			procedure,
			dates,
		),
	);
}

function toVariables(input: unknown): { input?: unknown } {
	return input === undefined ? {} : { input };
}

/** Upstream's `storyShare` router is `sharedStory*` in the GraphQL schema (its upstream file name). */
const FIELD_PREFIX: Partial<Record<StoryRouter, string>> = { storyShare: 'sharedStory' };

function toOutput<T>(data: unknown, router: StoryRouter, procedure: string, dates: boolean): T {
	const field = `${FIELD_PREFIX[router] ?? router}${procedure[0].toUpperCase()}${procedure.slice(1)}`;
	const value = (data as Record<string, unknown>)[field];
	return (dates ? reviveDates<T>(value, ROW_KEYS) : value) as T;
}

/**
 * The story procedures moved to apps/api (`docs/stories-api.md`): call sites swap upstream tRPC's `story.*`,
 * `storyFolder.*`, `storyTheme.*` and `customStoryViewer.*` for `storyApi.*`; the story
 * procedures of `chatFork` are on `chatApi.chatFork`. Story sharing (`storyShare`, `sharedStory*` fields),
 * embeds, favorites, story feedback and the story downloads (`{ data (base64), filename, mimeType }`) are here too.
 */
export const storyApi = {
	story: {
		archive: storyMutation('story', 'archive', StoryArchiveDocument, false),
		archiveShared: storyMutation('story', 'archiveShared', StoryArchiveSharedDocument, false),
		archiveStandalone: storyMutation('story', 'archiveStandalone', StoryArchiveStandaloneDocument, false),
		bulkArchive: storyMutation('story', 'bulkArchive', StoryBulkArchiveDocument, false),
		bulkUnarchive: storyMutation('story', 'bulkUnarchive', StoryBulkUnarchiveDocument, false),
		createVersion: storyMutation('story', 'createVersion', StoryCreateVersionDocument, true),
		deletePermanently: storyMutation('story', 'deletePermanently', StoryDeletePermanentlyDocument, false),
		download: storyQuery('story', 'download', StoryDownloadDocument, false),
		downloadCustom: storyMutation('story', 'downloadCustom', StoryDownloadCustomDocument, false),
		downloadStandalone: storyQuery('story', 'downloadStandalone', StoryDownloadStandaloneDocument, false),
		editCustomStoryBlock: storyMutation('story', 'editCustomStoryBlock', StoryEditCustomStoryBlockDocument, false),
		getCertification: storyQuery('story', 'getCertification', StoryGetCertificationDocument, true),
		getCustomStoryNarratives: storyQuery(
			'story',
			'getCustomStoryNarratives',
			StoryGetCustomStoryNarrativesDocument,
			false,
		),
		getCustomStoryQueryData: storyQuery(
			'story',
			'getCustomStoryQueryData',
			StoryGetCustomStoryQueryDataDocument,
			false,
		),
		getCustomStoryQuerySql: storyQuery(
			'story',
			'getCustomStoryQuerySql',
			StoryGetCustomStoryQuerySqlDocument,
			false,
		),
		getCustomStoryState: storyQuery('story', 'getCustomStoryState', StoryGetCustomStoryStateDocument, false),
		getCustomVersion: storyQuery('story', 'getCustomVersion', StoryGetCustomVersionDocument, true),
		getCustomVersionFile: storyQuery('story', 'getCustomVersionFile', StoryGetCustomVersionFileDocument, false),
		getDelivery: storyQuery('story', 'getDelivery', StoryGetDeliveryDocument, false),
		getFilterOptions: storyQuery('story', 'getFilterOptions', StoryGetFilterOptionsDocument, false),
		getFilteredQueryData: storyQuery('story', 'getFilteredQueryData', StoryGetFilteredQueryDataDocument, false),
		getIdByChatAndSlug: storyQuery('story', 'getIdByChatAndSlug', StoryGetIdByChatAndSlugDocument, false),
		getLatest: storyQuery('story', 'getLatest', StoryGetLatestDocument, true),
		getLiveQueryData: storyQuery('story', 'getLiveQueryData', StoryGetLiveQueryDataDocument, false),
		getQuerySql: storyQuery('story', 'getQuerySql', StoryGetQuerySqlDocument, false),
		getStandalone: storyQuery('story', 'getStandalone', StoryGetStandaloneDocument, true),
		getVersionQueryData: storyQuery('story', 'getVersionQueryData', StoryGetVersionQueryDataDocument, false),
		listAll: storyQuery('story', 'listAll', StoryListAllDocument, true),
		listArchived: storyQuery('story', 'listArchived', StoryListArchivedDocument, true),
		listDeliveryRecipientGroups: storyQuery(
			'story',
			'listDeliveryRecipientGroups',
			StoryListDeliveryRecipientGroupsDocument,
			false,
		),
		listDeliveryRecipients: storyQuery(
			'story',
			'listDeliveryRecipients',
			StoryListDeliveryRecipientsDocument,
			false,
		),
		listMentioningChats: storyQuery('story', 'listMentioningChats', StoryListMentioningChatsDocument, true),
		listMostViewed: storyQuery('story', 'listMostViewed', StoryListMostViewedDocument, false),
		listQuickQuestions: storyQuery('story', 'listQuickQuestions', StoryListQuickQuestionsDocument, true),
		listReferenceable: storyQuery('story', 'listReferenceable', StoryListReferenceableDocument, false),
		listSharedArchived: storyQuery('story', 'listSharedArchived', StoryListSharedArchivedDocument, true),
		listStandalone: storyQuery('story', 'listStandalone', StoryListStandaloneDocument, true),
		listStandaloneArchived: storyQuery(
			'story',
			'listStandaloneArchived',
			StoryListStandaloneArchivedDocument,
			true,
		),
		listStories: storyQuery('story', 'listStories', StoryListStoriesDocument, false),
		listVersions: storyQuery('story', 'listVersions', StoryListVersionsDocument, true),
		parseCronFromText: storyMutation('story', 'parseCronFromText', StoryParseCronFromTextDocument, false),
		refreshData: storyMutation('story', 'refreshData', StoryRefreshDataDocument, true),
		rename: storyMutation('story', 'rename', StoryRenameDocument, false),
		resolve: storyQuery('story', 'resolve', StoryResolveDocument, false),
		restoreCustomVersion: storyMutation('story', 'restoreCustomVersion', StoryRestoreCustomVersionDocument, false),
		saveCustomStoryFiles: storyMutation('story', 'saveCustomStoryFiles', StorySaveCustomStoryFilesDocument, false),
		setCustomStoryState: storyMutation('story', 'setCustomStoryState', StorySetCustomStoryStateDocument, false),
		toggleCertification: storyMutation('story', 'toggleCertification', StoryToggleCertificationDocument, true),
		unarchive: storyMutation('story', 'unarchive', StoryUnarchiveDocument, false),
		unarchiveShared: storyMutation('story', 'unarchiveShared', StoryUnarchiveSharedDocument, false),
		unarchiveStandalone: storyMutation('story', 'unarchiveStandalone', StoryUnarchiveStandaloneDocument, false),
		updateDelivery: storyMutation('story', 'updateDelivery', StoryUpdateDeliveryDocument, false),
		updateLiveSettings: storyMutation('story', 'updateLiveSettings', StoryUpdateLiveSettingsDocument, false),
	},
	storyFolder: {
		archive: storyMutation('storyFolder', 'archive', StoryFolderArchiveDocument, false),
		bulkArchive: storyMutation('storyFolder', 'bulkArchive', StoryFolderBulkArchiveDocument, false),
		bulkMove: storyMutation('storyFolder', 'bulkMove', StoryFolderBulkMoveDocument, false),
		bulkUnarchive: storyMutation('storyFolder', 'bulkUnarchive', StoryFolderBulkUnarchiveDocument, false),
		create: storyMutation('storyFolder', 'create', StoryFolderCreateDocument, true),
		delete: storyMutation('storyFolder', 'delete', StoryFolderDeleteDocument, false),
		listItems: storyQuery('storyFolder', 'listItems', StoryFolderListItemsDocument, false),
		listTree: storyQuery('storyFolder', 'listTree', StoryFolderListTreeDocument, true),
		move: storyMutation('storyFolder', 'move', StoryFolderMoveDocument, false),
		moveStory: storyMutation('storyFolder', 'moveStory', StoryFolderMoveStoryDocument, false),
		rename: storyMutation('storyFolder', 'rename', StoryFolderRenameDocument, false),
		unarchive: storyMutation('storyFolder', 'unarchive', StoryFolderUnarchiveDocument, false),
	},
	storyTheme: {
		generate: storyMutation('storyTheme', 'generate', StoryThemeGenerateDocument, false),
		getActive: storyQuery('storyTheme', 'getActive', StoryThemeGetActiveDocument, false),
		getState: storyQuery('storyTheme', 'getState', StoryThemeGetStateDocument, true),
		listVersions: storyQuery('storyTheme', 'listVersions', StoryThemeListVersionsDocument, true),
		restoreVersion: storyMutation('storyTheme', 'restoreVersion', StoryThemeRestoreVersionDocument, false),
		save: storyMutation('storyTheme', 'save', StoryThemeSaveDocument, false),
		setEnabled: storyMutation('storyTheme', 'setEnabled', StoryThemeSetEnabledDocument, false),
	},
	customStoryViewer: {
		download: storyMutation('customStoryViewer', 'download', CustomStoryViewerDownloadDocument, false),
		getFile: storyQuery('customStoryViewer', 'getFile', CustomStoryViewerGetFileDocument, false),
		getFormat: storyQuery('customStoryViewer', 'getFormat', CustomStoryViewerGetFormatDocument, false),
		getNarratives: storyQuery('customStoryViewer', 'getNarratives', CustomStoryViewerGetNarrativesDocument, false),
		getQueryData: storyQuery('customStoryViewer', 'getQueryData', CustomStoryViewerGetQueryDataDocument, false),
		getQuerySql: storyQuery('customStoryViewer', 'getQuerySql', CustomStoryViewerGetQuerySqlDocument, false),
		getState: storyQuery('customStoryViewer', 'getState', CustomStoryViewerGetStateDocument, false),
		getTheme: storyQuery('customStoryViewer', 'getTheme', CustomStoryViewerGetThemeDocument, false),
		getVersion: storyQuery('customStoryViewer', 'getVersion', CustomStoryViewerGetVersionDocument, true),
		setState: storyMutation('customStoryViewer', 'setState', CustomStoryViewerSetStateDocument, false),
	},
	storyShare: {
		create: storyMutation('storyShare', 'create', SharedStoryCreateDocument, false),
		delete: storyMutation('storyShare', 'delete', SharedStoryDeleteDocument, false),
		download: storyQuery('storyShare', 'download', SharedStoryDownloadDocument, false),
		downloadCustom: storyMutation('storyShare', 'downloadCustom', SharedStoryDownloadCustomDocument, false),
		get: storyQuery('storyShare', 'get', SharedStoryGetDocument, true),
		getCustomStoryNarratives: storyQuery(
			'storyShare',
			'getCustomStoryNarratives',
			SharedStoryGetCustomStoryNarrativesDocument,
			false,
		),
		getCustomStoryQueryData: storyQuery(
			'storyShare',
			'getCustomStoryQueryData',
			SharedStoryGetCustomStoryQueryDataDocument,
			false,
		),
		getCustomStoryQuerySql: storyQuery(
			'storyShare',
			'getCustomStoryQuerySql',
			SharedStoryGetCustomStoryQuerySqlDocument,
			false,
		),
		getCustomStoryState: storyQuery(
			'storyShare',
			'getCustomStoryState',
			SharedStoryGetCustomStoryStateDocument,
			false,
		),
		getCustomVersion: storyQuery('storyShare', 'getCustomVersion', SharedStoryGetCustomVersionDocument, true),
		getFilteredQueryData: storyQuery(
			'storyShare',
			'getFilteredQueryData',
			SharedStoryGetFilteredQueryDataDocument,
			false,
		),
		getFilterOptions: storyQuery('storyShare', 'getFilterOptions', SharedStoryGetFilterOptionsDocument, false),
		getLiveQueryData: storyQuery('storyShare', 'getLiveQueryData', SharedStoryGetLiveQueryDataDocument, false),
		getQuerySql: storyQuery('storyShare', 'getQuerySql', SharedStoryGetQuerySqlDocument, false),
		getSharedStoryInfo: storyQuery(
			'storyShare',
			'getSharedStoryInfo',
			SharedStoryGetSharedStoryInfoDocument,
			false,
		),
		getStoryIdByShareId: storyQuery(
			'storyShare',
			'getStoryIdByShareId',
			SharedStoryGetStoryIdByShareIdDocument,
			false,
		),
		getVersionQueryData: storyQuery(
			'storyShare',
			'getVersionQueryData',
			SharedStoryGetVersionQueryDataDocument,
			false,
		),
		list: storyQuery('storyShare', 'list', SharedStoryListDocument, true),
		listShareableGroups: storyQuery(
			'storyShare',
			'listShareableGroups',
			SharedStoryListShareableGroupsDocument,
			false,
		),
		refreshData: storyMutation('storyShare', 'refreshData', SharedStoryRefreshDataDocument, true),
		setCustomStoryState: storyMutation(
			'storyShare',
			'setCustomStoryState',
			SharedStorySetCustomStoryStateDocument,
			false,
		),
		togglePin: storyMutation('storyShare', 'togglePin', SharedStoryTogglePinDocument, false),
		updateAccess: storyMutation('storyShare', 'updateAccess', SharedStoryUpdateAccessDocument, false),
	},
	embed: {
		downloadStory: storyMutation('embed', 'downloadStory', EmbedDownloadStoryDocument, false),
		getChart: storyQuery('embed', 'getChart', EmbedGetChartDocument, false),
		getMap: storyQuery('embed', 'getMap', EmbedGetMapDocument, false),
		getStory: storyQuery('embed', 'getStory', EmbedGetStoryDocument, false),
	},
	favorite: {
		list: storyQuery('favorite', 'list', FavoriteListDocument, false),
		toggle: storyMutation('favorite', 'toggle', FavoriteToggleDocument, false),
	},
	feedback: {
		getStoryFeedback: storyQuery('feedback', 'getStoryFeedback', FeedbackGetStoryFeedbackDocument, false),
		submitStoryFeedback: storyMutation(
			'feedback',
			'submitStoryFeedback',
			FeedbackSubmitStoryFeedbackDocument,
			true,
		),
	},
	sharedChat: {
		downloadStory: storyQuery('sharedChat', 'downloadStory', SharedChatDownloadStoryDocument, false),
	},
};

/** The story procedures of `chatFork`, spread into `chatApi.chatFork`. */
export const storyChatFork = {
	askStory: storyMutation('chatFork', 'askStory', ChatForkAskStoryDocument, false),
	forkStory: storyMutation('chatFork', 'forkStory', ChatForkForkStoryDocument, false),
	openStandalone: storyMutation('chatFork', 'openStandalone', ChatForkOpenStandaloneDocument, false),
};
