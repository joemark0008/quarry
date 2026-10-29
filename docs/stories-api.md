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
  procedures) read the project from the `x-nao-project-id` header, like the rest of the API. A user outside that project gets
  `BAD_REQUEST` "No project configured" (upstream's behaviour). The others find the project from the chat or story id in
  their input.
- Implementation: `apps/api/src/stories/procedures/*.procedures.ts` are the upstream routers ported nearly verbatim on a
  small tRPC-like builder (`stories/procedure.ts`); `stories.resolver.ts` is generated-style, one thin field per procedure.

## Not available yet

| tRPC procedure                                                                                     | Why                                                                                                                       |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `story.download`, `story.downloadStandalone`, `story.downloadCustom`, `customStoryViewer.download` | PDF/PNG/HTML exports (headless Chrome): Phase 4 stage 3                                                                   |
| `storyTheme.generate`                                                                              | Theme generation from a website, images, PDFs or a ZIP: needs headless Chrome, `cheerio` and `colorthief` (not installed) |
| `chatFork.fork` with a `story` source                                                              | Forks of shared stories come with story sharing (stage 3); the chat source is `forkSharedChat` in the chats module        |
| `sharedStory.*`, `embed.*`, favorites, story feedback                                              | Stage 3 / later (not in these routers)                                                                                    |

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
