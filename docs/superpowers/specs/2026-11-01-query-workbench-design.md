# Query workbench design

## Goal

Turn `/settings/project/query-tools` into a place to write and run a query first, and save it afterwards. Today the editor opens on a form asking for a name and description, defaults to a Builder tab, and treats running a query as a last step before saving.

**The flow:** pick a warehouse connection, ask an assistant for a query in plain English, edit the SQL by hand, run it, see the results, then save it as a query tool. Creating a skill from the result comes with the skill builder.

**Success looks like:**

- A user with a connected warehouse can write and run SQL without entering a name first.
- A user can ask for a query in plain English, get SQL the assistant tested, apply it, edit it and run it.
- The assistant builds on the user's manual edits rather than its own last draft.
- The assistant never changes the editor or saves anything without a click.
- Existing saved tools keep working, and the agent's use of them doesn't change.

## Decisions

| Decision           | Choice                                         | Why                                                                          |
| ------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| Editor             | Keep the existing `@monaco-editor/react` setup | `QueryToolSqlEditor` already has highlighting and ⌘↵                         |
| Run                | Reuse `previewProjectQueryTool`                | Already read-only, limited to 200 rows and takes parameters                  |
| Assistant          | The existing agent, embedded beside the editor | Can read the context, test its query and fix errors, and later draft a skill |
| Embedding          | `AgentProvider disableNavigation`              | Same pattern as `ask-bar.tsx`                                                |
| Filling the editor | A `propose_sql` tool with an Apply button      | A person stays in control of what enters the editor                          |
| Builder tab        | Removed                                        | The assistant replaces it, and it is not what the page should lead with      |
| Chat history       | Workbench chats are hidden from the sidebar    | They are working sessions, and would otherwise crowd normal chats            |

## Page

The URL stays the same. A `tool` search param chooses the view:

| URL                 | View                                         |
| ------------------- | -------------------------------------------- |
| No `tool`           | Saved tools list, as today                   |
| `?tool=new`         | Workbench with an empty draft                |
| `?tool=<id>`        | Workbench with that saved tool loaded        |
| `?tool=new&sql=...` | Workbench seeded by **Save as tool** in chat |

`ProjectPage` drops its width limit when `tool` is present, so the workbench can use the full width.

```
┌ Assistant ────────┬ Connection: warehouse ▾  ▸ Schema ──┐
│ > top 10 customers│ SELECT ...                          │
│   by revenue      │ (Monaco editor, ⌘↵ to run)          │
│                   │                                     │
│ Tested, 10 rows:  │ Parameters (only if {{ x }} is used)│
│ SELECT ...        │ [Run]                   [Save ▾]    │
│ [Apply to editor] ├─────────────────────────────────────┤
│                   │ Results (read-only, up to 200 rows) │
│ [Ask…]            │ name | revenue                      │
└───────────────────┴─────────────────────────────────────┘
```

Below the `lg` breakpoint, the assistant and editor become two tabs. Components follow `docs/frontend-design.md` (Mantine, CSS Modules, shared `components/ui`).

### Components

All under `feature/settings/components/query-tools/workbench/`:

| Component                    | Responsibility                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `query-workbench.tsx`        | Layout, and provides draft state through `QueryWorkbenchContext`                   |
| `use-workbench-draft.ts`     | Draft state (SQL, parameters, values, connection, chat id) and browser persistence |
| `workbench-assistant.tsx`    | Embedded agent messages and input, in `query_workbench` mode                       |
| `workbench-toolbar.tsx`      | Connection selector, schema toggle, Run and Save                                   |
| `workbench-schema.tsx`       | Collapsible list of synced tables and columns                                      |
| `workbench-results.tsx`      | Results table, row count, truncation notice and run errors                         |
| `save-query-tool-dialog.tsx` | Name, description, enabled switch and validation                                   |

`QueryToolSqlEditor` and `QueryToolParameters` are reused.

### Connection

- The selector is always visible, and lists `warehouseConnections` plus the default connection.
- With no connection, the workbench shows an empty state linking to `/settings/project/warehouse`. The assistant and Run are disabled.

### Run

- **Run** and ⌘↵ call `previewProjectQueryTool` with the SQL, parameters, values and connection.
- Results use the existing `TableDisplay`, with a notice when results are truncated at 200 rows.
- A failed run shows the error in the results area, with **Ask assistant to fix**. That sends the SQL and error as a message.

### Parameters

The panel only appears once the SQL contains a `{{ placeholder }}`. It behaves as it does today.

### Schema panel

- Lists tables and columns using the same data the Builder used: `projectApi` objects and `queryToolTableColumns`. Both read synced context.
- Clicking a table or column inserts its name at the cursor.
- If nothing has been synced, it links to the warehouse settings to run a sync.

### Save

- **New draft:** Save opens the dialog for name, description and the enabled switch, with the existing name validation.
- **Saved tool:** the Save menu offers **Update** and **Save as new tool**. **Update** skips the name and description unless they are changed through **Edit details**.
- A user whose `canEdit` is false can run the tool but only **Save as new tool**.
- After saving, the workbench stays open, now showing the saved tool.

### Draft persistence

Drafts are kept in `localStorage` under `quarry.workbench.<projectId>.<toolId or new>`, holding the SQL, parameters, values, connection and chat id, and are cleared on save. **New draft** in the toolbar clears the draft and starts a new conversation. For a saved tool, a stored draft that differs from the saved SQL shows a notice with **Discard changes**.

## Assistant

### Agent mode

Add `query_workbench` to the `mode` enum in `AgentRequestSchema` and to the frontend's `AgentMode`.

In this mode the run uses:

- **Tools:** `builtinToolAllowlist` of `execute_sql`, `read_query_result`, `read`, `grep`, `list`, `search`, `clarification` and `load_skill`, plus the new `propose_sql`. No charts, maps, stories, file writes or subagents.
- **Prompt:** the normal system prompt with an added workbench section, telling the agent to read the context for the schema, test its query with `execute_sql`, fix any error, and finish with `propose_sql` rather than pasting SQL as the answer. Saved query tools (`qt_*`) are left out, because the goal is SQL the user can edit.
- **Memory:** no memory extraction for these chats, using the existing `skipMemoryExtraction`.

Viewers are already refused by the agent and by the route.

### Editor context

The request gets an optional field, accepted only in this mode:

```ts
workbench: z.object({ sql: z.string().max(64_000), databaseId: z.string().nullable() }).optional();
```

`AgentManager` adds it to the latest user message, like the existing citation context, so the agent always sees the current editor contents and connection. It is not stored as message text shown to the user.

### `propose_sql` tool

- **Files:** `shared/src/tools/propose-sql.ts`, `agent/tools/propose-sql.ts`, and a card in `feature/chat/components/tool-calls/propose-sql.tsx`. Only available in `query_workbench` mode.
- **Input:** `sql`, `database_id` (optional), `summary` (what the query returns).
- **Execute:** no side effects. It returns `tested`, which is true only if that exact SQL succeeded on the warehouse through `execute_sql` during this run, as recorded in the tool context's `queryResults`. The label comes from the server, so the agent cannot claim a test that did not happen.
- **Model output:** "Query shown to the user. Stop and wait for their reply."

**Card:** shows the summary, the SQL, and **Tested** or **Not tested**. **Apply to editor** replaces the editor contents and sets the connection, and ⌘Z restores the earlier SQL, because `@monaco-editor/react` applies value changes as undoable edits. Outside the workbench context, the card is read-only with Copy.

In `exclusive` semantic layer mode, `execute_sql` cannot reach the warehouse, so proposals show **Not tested**.

### Chat history

Add `surface String @default("chat")` to `Chat`, with a Prisma migration. Workbench chats are created with `surface: 'query_workbench'`.

- The chat lists in `chat.repository.ts`, including the raw queries, return only `surface = 'chat'`.
- Fetching a chat by id is unchanged, so a workbench conversation can be resumed from the stored chat id.
- A stored chat id that no longer loads starts a new conversation.
- Workbench chats count towards usage like any other chat.

### No model configured

If the project has no usable model, the assistant panel explains this and links to `/settings/project/models`. The editor, Run and Save still work.

## Removed

- `query-tool-editor.tsx`, `query-builder-panel.tsx`, `lib/query-builder.ts`, `lib/query-builder.test.ts` and their CSS Modules.

Kept: `queryToolTableColumns`, the query tool API, the agent's `qt_*` tools, and **Save as tool** in chat, which now opens `?tool=new&sql=...`.

## Safety

- **Read-only:** Run and the assistant's `execute_sql` both go through the existing guards.
- **Human control:** the agent can't change the editor or save. Text reaching the agent from warehouse data or documents can only influence a proposal the user sees in full before applying.
- **Credentials:** warehouse credentials never reach the browser or the agent's context, as today.

## Tests

Backend:

- `AgentRequestSchema`: accepts the mode, and rejects `workbench` in other modes.
- Tool set in `query_workbench` mode: includes `propose_sql` and excludes charts, stories, writes and `qt_*`. Other modes don't get `propose_sql`.
- `propose_sql`: `tested` is true only for SQL that succeeded; false for failed, changed or never-run SQL.
- Editor context reaches the model but isn't shown as message text.
- Chat lists exclude workbench chats, and fetching one by id still works.
- e2e with the mock model: a workbench chat runs and proposes SQL.

Frontend:

- Draft persistence and clearing; a run success and failure; **Ask assistant to fix**; each Save path, including `canEdit: false`.
- Card: Apply fills the editor and ⌘Z restores it; **Tested** and **Not tested**; read-only outside the workbench.
- Empty states: no connection, no sync, no model.
- `e2e/flows.spec.ts`: replace the query tools flow with type SQL, Run, see results, save, and find it in the list. Add one assistant flow with a real LLM call, like the existing chat flow.

Verify with `npm run lint`, `npm test`, `npm run format:check` and `npm run test:e2e -w @quarry/frontend`.

## Out of scope

- **Create skill from this.** It comes with the skill builder, using `propose_skill`. Add it to that spec's scope when this ships.
- Schema-aware autocomplete in Monaco.
- AI drafting of the tool's name and description.
- Saving queries without making them tools.
- A list of past workbench conversations.

## Docs

Update `README.md`'s saved query tools line and `PHASES.md`.
