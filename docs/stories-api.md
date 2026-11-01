# Stories API (Phase 4)

The story routers of upstream (`trpc.story`, `trpc.storyFolder`, `trpc.storyTheme`, `trpc.customStoryViewer`, and the story
procedures of `trpc.chatFork`) as GraphQL, for the frontend migration.

## Conventions

- **One field per procedure**, named `<router><Procedure>`: `trpc.story.getLatest` → `storyGetLatest`,
  `trpc.storyFolder.bulkMove` → `storyFolderBulkMove`. tRPC queries are GraphQL queries, mutations are mutations.
- **Input**: one optional `input: JSON` argument carrying upstream's input object unchanged
  (`storyGetLatest(input: { chatId, storySlug })`). It is validated with upstream's zod schema; a validation error is
  `BAD_REQUEST` with zod's message. Procedures without input take no `input`.
- **Output**: `JSON` (nullable), upstream's return value unchanged. Dates are ISO strings (use `reviveDates` in
  `apollo-procedures.ts`, as for the other JSON-scalar modules). Procedures returning nothing return `null`.
- **Errors**: `extensions.code` is upstream's tRPC code (`BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`,
  `CONFLICT`); messages are upstream's.
- **Selected project**: procedures upstream built on `projectProtectedProcedure` (and `canSend`/`admin`/story-theme
  procedures) read the project from the `x-quarry-project-id` header, like the rest of the API. A user outside that project gets
  `BAD_REQUEST` "No project configured" (upstream's behaviour). The others find the project from the chat or story id in
  their input.
- Implementation: `apps/api/src/stories/procedures/*.procedures.ts` are the upstream routers ported nearly verbatim on a
  small tRPC-like builder (`stories/procedure.ts`); `stories.resolver.ts` is generated-style, one thin field per procedure.

## Not available yet

| tRPC procedure                        | Why                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `chatFork.fork` with a `story` source | Forks of shared stories: not ported yet; the chat source is `forkSharedChat` in the chats module |

Behaviour differences: `storyTheme.getState` always returns `whiteLabelIdentity: null` (no branding service); refresh and
delivery schedules are saved but nothing is scheduled until stage 3 binds the pg-boss scheduler (`story-schedule.ts`); user
groups don't exist yet, so `listDeliveryRecipientGroups` is empty and group recipients are refused; notifications (Phase 5)
are not sent.

## Mapping

### `trpc.story`

| tRPC procedure                      | GraphQL                                  | Selected project |
| ----------------------------------- | ---------------------------------------- | ---------------- |
| `story.listAll`                     | query `storyListAll`                     |                  |
| `story.listArchived`                | query `storyListArchived`                |                  |
| `story.listStandalone`              | query `storyListStandalone`              | yes              |
| `story.listStandaloneArchived`      | query `storyListStandaloneArchived`      | yes              |
| `story.listReferenceable`           | query `storyListReferenceable`           | yes              |
| `story.listMostViewed`              | query `storyListMostViewed`              | yes              |
| `story.resolve`                     | query `storyResolve`                     |                  |
| `story.listQuickQuestions`          | query `storyListQuickQuestions`          |                  |
| `story.listMentioningChats`         | query `storyListMentioningChats`         |                  |
| `story.getIdByChatAndSlug`          | query `storyGetIdByChatAndSlug`          |                  |
| `story.getStandalone`               | query `storyGetStandalone`               |                  |
| `story.getLatest`                   | query `storyGetLatest`                   |                  |
| `story.listVersions`                | query `storyListVersions`                |                  |
| `story.getVersionQueryData`         | query `storyGetVersionQueryData`         |                  |
| `story.getCustomVersion`            | query `storyGetCustomVersion`            |                  |
| `story.getCustomVersionFile`        | query `storyGetCustomVersionFile`        |                  |
| `story.getCustomStoryQueryData`     | query `storyGetCustomStoryQueryData`     |                  |
| `story.getCustomStoryQuerySql`      | query `storyGetCustomStoryQuerySql`      |                  |
| `story.getCustomStoryNarratives`    | query `storyGetCustomStoryNarratives`    |                  |
| `story.getCustomStoryState`         | query `storyGetCustomStoryState`         |                  |
| `story.setCustomStoryState`         | mutation `storySetCustomStoryState`      |                  |
| `story.editCustomStoryBlock`        | mutation `storyEditCustomStoryBlock`     |                  |
| `story.saveCustomStoryFiles`        | mutation `storySaveCustomStoryFiles`     |                  |
| `story.restoreCustomVersion`        | mutation `storyRestoreCustomVersion`     |                  |
| `story.listStories`                 | query `storyListStories`                 |                  |
| `story.rename`                      | mutation `storyRename`                   |                  |
| `story.getCertification`            | query `storyGetCertification`            | yes              |
| `story.toggleCertification`         | mutation `storyToggleCertification`      | yes              |
| `story.createVersion`               | mutation `storyCreateVersion`            |                  |
| `story.updateLiveSettings`          | mutation `storyUpdateLiveSettings`       |                  |
| `story.getDelivery`                 | query `storyGetDelivery`                 |                  |
| `story.listDeliveryRecipients`      | query `storyListDeliveryRecipients`      |                  |
| `story.listDeliveryRecipientGroups` | query `storyListDeliveryRecipientGroups` |                  |
| `story.updateDelivery`              | mutation `storyUpdateDelivery`           |                  |
| `story.refreshData`                 | mutation `storyRefreshData`              |                  |
| `story.getLiveQueryData`            | query `storyGetLiveQueryData`            |                  |
| `story.getFilterOptions`            | query `storyGetFilterOptions`            |                  |
| `story.getFilteredQueryData`        | query `storyGetFilteredQueryData`        |                  |
| `story.getQuerySql`                 | query `storyGetQuerySql`                 |                  |
| `story.parseCronFromText`           | mutation `storyParseCronFromText`        | yes              |
| `story.archive`                     | mutation `storyArchive`                  |                  |
| `story.unarchive`                   | mutation `storyUnarchive`                |                  |
| `story.archiveStandalone`           | mutation `storyArchiveStandalone`        |                  |
| `story.unarchiveStandalone`         | mutation `storyUnarchiveStandalone`      |                  |
| `story.listSharedArchived`          | query `storyListSharedArchived`          | yes              |
| `story.archiveShared`               | mutation `storyArchiveShared`            | yes              |
| `story.unarchiveShared`             | mutation `storyUnarchiveShared`          | yes              |
| `story.bulkArchive`                 | mutation `storyBulkArchive`              | yes              |
| `story.bulkUnarchive`               | mutation `storyBulkUnarchive`            | yes              |

### `trpc.storyFolder`

| tRPC procedure              | GraphQL                             | Selected project |
| --------------------------- | ----------------------------------- | ---------------- |
| `storyFolder.listTree`      | query `storyFolderListTree`         | yes              |
| `storyFolder.listItems`     | query `storyFolderListItems`        | yes              |
| `storyFolder.create`        | mutation `storyFolderCreate`        | yes              |
| `storyFolder.rename`        | mutation `storyFolderRename`        | yes              |
| `storyFolder.delete`        | mutation `storyFolderDelete`        | yes              |
| `storyFolder.archive`       | mutation `storyFolderArchive`       | yes              |
| `storyFolder.unarchive`     | mutation `storyFolderUnarchive`     | yes              |
| `storyFolder.bulkArchive`   | mutation `storyFolderBulkArchive`   | yes              |
| `storyFolder.bulkUnarchive` | mutation `storyFolderBulkUnarchive` | yes              |
| `storyFolder.move`          | mutation `storyFolderMove`          | yes              |
| `storyFolder.moveStory`     | mutation `storyFolderMoveStory`     | yes              |
| `storyFolder.bulkMove`      | mutation `storyFolderBulkMove`      | yes              |

### `trpc.storyTheme`

| tRPC procedure              | GraphQL                             | Selected project |
| --------------------------- | ----------------------------------- | ---------------- |
| `storyTheme.getActive`      | query `storyThemeGetActive`         | yes              |
| `storyTheme.getState`       | query `storyThemeGetState`          | yes              |
| `storyTheme.listVersions`   | query `storyThemeListVersions`      | yes              |
| `storyTheme.save`           | mutation `storyThemeSave`           | yes              |
| `storyTheme.restoreVersion` | mutation `storyThemeRestoreVersion` | yes              |
| `storyTheme.setEnabled`     | mutation `storyThemeSetEnabled`     | yes              |

### `trpc.customStoryViewer`

| tRPC procedure                    | GraphQL                                | Selected project |
| --------------------------------- | -------------------------------------- | ---------------- |
| `customStoryViewer.getFormat`     | query `customStoryViewerGetFormat`     |                  |
| `customStoryViewer.getTheme`      | query `customStoryViewerGetTheme`      |                  |
| `customStoryViewer.getVersion`    | query `customStoryViewerGetVersion`    |                  |
| `customStoryViewer.getFile`       | query `customStoryViewerGetFile`       |                  |
| `customStoryViewer.getQueryData`  | query `customStoryViewerGetQueryData`  |                  |
| `customStoryViewer.getQuerySql`   | query `customStoryViewerGetQuerySql`   |                  |
| `customStoryViewer.getState`      | query `customStoryViewerGetState`      |                  |
| `customStoryViewer.setState`      | mutation `customStoryViewerSetState`   |                  |
| `customStoryViewer.getNarratives` | query `customStoryViewerGetNarratives` |                  |

### `trpc.chatFork`

| tRPC procedure            | GraphQL                           | Selected project |
| ------------------------- | --------------------------------- | ---------------- |
| `chatFork.askStory`       | mutation `chatForkAskStory`       |                  |
| `chatFork.forkStory`      | mutation `chatForkForkStory`      |                  |
| `chatFork.openStandalone` | mutation `chatForkOpenStandalone` | yes              |

### `trpc.favorite` and story `trpc.feedback` (stage 3b)

| tRPC procedure                 | GraphQL                                | Selected project |
| ------------------------------ | -------------------------------------- | ---------------- |
| `favorite.toggle`              | mutation `favoriteToggle`              | yes              |
| `favorite.list`                | query `favoriteList`                   | yes              |
| `feedback.getStoryFeedback`    | query `feedbackGetStoryFeedback`       | yes              |
| `feedback.submitStoryFeedback` | mutation `feedbackSubmitStoryFeedback` | yes              |

Story jobs: `story.refresh` and `story.deliver` run on pg-boss schedules keyed `story-refresh-<id>` /
`story-delivery-<id>` (UTC), created and removed by `storyUpdateLiveSettings` / `storyUpdateDelivery`;
`story.blob-cleanup` runs daily at 04:30 UTC. Until Phase 5, deliveries and feedback notifications only record in-app
`notification` rows (email/Slack are logged).

### `trpc.sharedStory`, `trpc.embed`, story exports and `storyTheme.generate` (stage 3a)

| tRPC procedure                         | GraphQL                                     | Selected project |
| -------------------------------------- | ------------------------------------------- | ---------------- |
| `sharedStory.list`                     | query `sharedStoryList`                     |                  |
| `sharedStory.create`                   | mutation `sharedStoryCreate`                | yes              |
| `sharedStory.getStoryIdByShareId`      | query `sharedStoryGetStoryIdByShareId`      |                  |
| `sharedStory.get`                      | query `sharedStoryGet`                      |                  |
| `sharedStory.getCustomVersion`         | query `sharedStoryGetCustomVersion`         |                  |
| `sharedStory.getCustomStoryQuerySql`   | query `sharedStoryGetCustomStoryQuerySql`   |                  |
| `sharedStory.getCustomStoryQueryData`  | query `sharedStoryGetCustomStoryQueryData`  |                  |
| `sharedStory.getCustomStoryNarratives` | query `sharedStoryGetCustomStoryNarratives` |                  |
| `sharedStory.getCustomStoryState`      | query `sharedStoryGetCustomStoryState`      |                  |
| `sharedStory.setCustomStoryState`      | mutation `sharedStorySetCustomStoryState`   |                  |
| `sharedStory.downloadCustom`           | mutation `sharedStoryDownloadCustom`        |                  |
| `sharedStory.getVersionQueryData`      | query `sharedStoryGetVersionQueryData`      |                  |
| `sharedStory.getLiveQueryData`         | query `sharedStoryGetLiveQueryData`         |                  |
| `sharedStory.getFilterOptions`         | query `sharedStoryGetFilterOptions`         |                  |
| `sharedStory.getFilteredQueryData`     | query `sharedStoryGetFilteredQueryData`     |                  |
| `sharedStory.getQuerySql`              | query `sharedStoryGetQuerySql`              |                  |
| `sharedStory.refreshData`              | mutation `sharedStoryRefreshData`           |                  |
| `sharedStory.getSharedStoryInfo`       | query `sharedStoryGetSharedStoryInfo`       | yes              |
| `sharedStory.listShareableGroups`      | query `sharedStoryListShareableGroups`      | yes              |
| `sharedStory.updateAccess`             | mutation `sharedStoryUpdateAccess`          |                  |
| `sharedStory.togglePin`                | mutation `sharedStoryTogglePin`             | yes              |
| `sharedStory.delete`                   | mutation `sharedStoryDelete`                |                  |
| `sharedStory.download`                 | query `sharedStoryDownload`                 |                  |
| `embed.getStory` (public)              | query `embedGetStory`                       |                  |
| `embed.getChart` (public)              | query `embedGetChart`                       |                  |
| `embed.getMap` (public)                | query `embedGetMap`                         |                  |
| `embed.downloadStory` (public)         | mutation `embedDownloadStory`               |                  |
| `story.download`                       | query `storyDownload`                       |                  |
| `story.downloadStandalone`             | query `storyDownloadStandalone`             |                  |
| `story.downloadCustom`                 | mutation `storyDownloadCustom`              |                  |
| `customStoryViewer.download`           | mutation `customStoryViewerDownload`        |                  |
| `sharedChat.downloadStory`             | query `sharedChatDownloadStory`             |                  |
| `storyTheme.generate`                  | mutation `storyThemeGenerate`               | yes              |

Downloads return upstream's `{ data (base64), filename, mimeType }`. REST: `GET /api/stories/:storyId/thumbnail?mode=light|dark`
(session; WebP, `ETag`/304, 404 until rendered) and `GET /api/embed/story/:storyId/download?token&format=pdf|html`
(public, embed token). PDFs, thumbnails and `storyTheme.generate` use a headless Chrome (`PUPPETEER_EXECUTABLE_PATH`,
`CHROME_PATH`, or the usual install paths); embeds need the project's MCP endpoint enabled (`project.mcp_endpoint_settings`,
default `MCP_ENDPOINT_ENABLED`). Differences: share audiences keep the stage-2 stand-in (no user groups until Phase 6:
group ids are refused, `listShareableGroups` is empty, everyone has `storyCreation`); no activity log or share
notifications (Phase 5); no white-label brand in `storyTheme.generate`; oversized `generate` payloads are `BAD_REQUEST`
(upstream `PAYLOAD_TOO_LARGE`).
