# Handoff — 2026-10-29

Context carried over from Claude Code sessions run under another account (transcripts in `~/.claude/projects/-Users-jjgimeno-Documents-Projects-personal-nao{,-quarry}/`). Read this, then [PLAN.md](../PLAN.md) and [PHASES.md](../PHASES.md).

## How we work

- One **master session** plans and coordinates; **each phase runs in its own new session**, on branch `phase-N-…`, and reports back. Phases aren't implemented in the master session.
- Phase sessions may use the `reverse-engineer-anything` (REA) skill, mainly to observe the running upstream app and compare behaviour. Ordinary porting is plain code reading.
- `../fork-reference` is the upstream getnao/nao clone (remote `upstream`), read-only.
- GitHub remote: `origin` → https://github.com/advancedlocal/explore-joe-ai-tools

## Decisions (why the stack looks like this)

| Topic           | Decision                                                                                                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Approach        | Full rewrite, not a NestJS wrapper around upstream; drop parts later (Phases 3–7 are optional)                                                                                    |
| Server          | NestJS 11 on **Express** (not Fastify: latency is dominated by LLM/warehouse calls; Express has better Nest ecosystem fit)                                                        |
| API             | GraphQL code-first + Apollo, one server, no federation; REST only for agent streaming, auth/OAuth, webhooks, uploads, MCP                                                         |
| ORM             | Prisma on Postgres; schema from upstream migrations → `db pull` → cleanup (73 of 87 tables kept)                                                                                  |
| Frontend        | Keep upstream React app; **Apollo Client** + GraphQL Code Generator (matches `sda-graphql-crm`)                                                                                   |
| Jobs            | pg-boss (no Redis)                                                                                                                                                                |
| Billing         | Dropped (Stripe, credits, trials, budgets, license); its screens were removed at the cut-over (Phase 8)                                                                           |
| Python          | None. FastAPI sidecar + `nao_core` ported to Node as `sql-engine`; Python CLI dropped; `nao sync` → in-app **Sync** button (`context.sync` job)                                   |
| Warehouses      | Postgres only for now; more drivers later behind `WarehouseDriver`                                                                                                                |
| SSO             | Own OIDC on better-auth generic OAuth (Phase 6), no upstream enterprise code                                                                                                      |
| Enterprise code | Never ported                                                                                                                                                                      |
| Brand           | Name **quarry**; logo = faceted hexagon mark (teal `#0F6E56`, gold facet `#EF9F27`), wordmark in Poppins SemiBold outlined to paths; assets in `brand/` (`build.mjs` regenerates) |

## Status

| Phase                                                | State                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 0 Setup                                              | Done, merged to `main`                                                                                 |
| 1 API skeleton + auth + frontend on Apollo + rebrand | Done, merged to `main` (`d7f70d4`)                                                                     |
| 2a SQL engine                                        | Committed on `phase-2-core` (`7791b57`) — `pgsql-parser` instead of `node-sql-parser`, 122 tests       |
| 2b Projects, warehouse, context sync                 | Committed on `phase-2-core` (`5c35aa6`)                                                                |
| **2c Chats + agent**                                 | **In progress** — agent + tests committed on `phase-2-core`, see below                                 |
| 2d Attachments, charts, transcribe, sandbox          | Committed on `phase-2-core` — Phase 2 complete, see PHASES.md 2d                                       |
| 3 Context                                            | Done on `phase-3-context` (not merged) — see PHASES.md Phase 3 and "Phase 3 notes" below               |
| 4 Stories                                            | Done on `phase-4-stories` (not merged) — see PHASES.md Phase 4 and "Phase 4 notes" below               |
| 5–7                                                  | Deferred (2026-10-29): screens removed, sources listed in [deferred-features.md](deferred-features.md) |
| 8 Cut-over                                           | Done on `phase-8-cutover` (built on `phase-4-stories`, not merged) — see "Phase 8 notes" below         |

### Where 2c stopped

The Phase 2 session hit its usage limit at 10:56 (Manila) on 2026-10-29 mid-2c. State checked afterwards:

- `apps/api` **typechecks** (`tsc --noEmit` clean), and every relative import has its ESM `.js` extension.
- Done (uncommitted):
    - `src/agent/`: upstream agent sources copied and adapted — `agent-manager.ts` (no memory/skills/stories/compaction/billing), `agent.service.ts`, `agent.controller.ts` (`POST /api/agent`, SSE with keep-alive, query-result previews, disconnect tracking), `llm/` (LLM resolution, project LLM config repository), providers, system prompts, stop conditions, user rules, telemetry.
    - Tools registered (only those whose modules exist): `execute_sql`, `read_query_result`, `display_chart`, `clarification`, `suggest_follow_ups`, `grep`, `list`, `read`, `search`.
    - Stand-ins for later-phase services (stories, storage, skills, MCP, semantic layer, memory, gitlab, user-group access) under `src/agent/services/` and `types/`, so copied tools stay unchanged.
    - `src/chats/chat.repository.ts` (Prisma port of `chat.queries.ts` + `execute-sql.queries.ts`) and `chats-core.module.ts`.
    - `src/warehouse/warehouse-sql.service.ts`, exported from `WarehouseModule`; `AgentModule` added to `AppModule`.
    - AI SDK + provider packages added to `apps/api/package.json` (pinned to upstream's versions); `tsconfig` gets `jsx: react-jsx` and DOM libs, Vitest SWC gets the automatic React runtime (for the markdown renderer).
- **Not done yet:**
    1. ~~Boot the API and hit `POST /api/agent` end to end~~ — done 2026-10-29: "top 5 customers by total order amount" on jaffle_shop ran `read`/`search`/`execute_sql`/`suggest_follow_ups` and saved the turn. Runtime fixes: `WarehouseSqlService` missing from `WarehouseModule` providers; `@vscode/ripgrep` missing (grep tool); `@ai-sdk/anthropic` pinned to `3.0.121` (3.0.69 drops `thinking.display`, 3.0.135 breaks the `ProviderOptionsMap` types).
    2. ~~Port the tests~~ — done: 49 spec files under `src/agent/` (998 api tests). Skipped cases are commented in each spec (logger, file-text, billing/managed AI, `write`/`/home`, onboarding agent-run).
    3. ~~`chats` GraphQL module~~ — done (see PHASES.md 2c for the deviations).
    4. ~~Remaining core tools, compaction and subagents~~ — done; which tools are stand-in-backed is in PHASES.md 2c.
    5. ~~Moved from 2b: `warehouse` run-SQL from the UI, query results/rows services~~ — done in the `chats` module.
    6. ~~Frontend: chat list/view, sharing, feedback on Apollo; Vite proxy sends `/api/agent` to `apps/api`~~ — done through `apps/frontend/src/lib/chat-api.ts`. Saved prompts and Settings → Agent (LLM providers, default models, agent settings) moved as well (`src/model-settings/`, `lib/project-api.ts`), checked in the browser.
    - Browser check (2026-10-29, split mode on :3000): asked "Show revenue by month for 2018 as a chart" in the jaffle project — streamed answer with chart and cited values; reload from GraphQL, chat list, star, thumbs-up feedback with text, share to project, shared-chat page, SQL view, data table (`queryRows`) and the context ring all worked.
    - Verify items done: `test/agent-chat.e2e-spec.ts` (streamed chat saved, mock model) and the live upstream/quarry comparison in `docs/upstream-baseline.md` (upstream needs its FastAPI service on :8005: `npm run dev:fastapi` in `fork-reference`).
    7. ~~lint, test, format, tick PHASES.md, commit 2c~~ — done.

## Running locally

Since Phase 8 there is one backend: the frontend (Vite, :3000) proxies `/graphql`, `/api`, `/health`, `/i/`, `/c/` to `apps/api` (:5006), which uses the `quarry` database. The upstream backend (:5005) and `nao_baseline` are no longer needed (`docs/upstream-baseline.md` still describes running upstream for comparisons).

- Postgres in Docker on **5434**: databases `quarry` and `warehouse` (jaffle_shop). Existing local volumes still have `nao_baseline`; new ones don't.
- `npm run dev:api`, `npm run dev:frontend`; seed login `test@test.test` / `test1234` (`npm run db:seed -w @quarry/api`).
- Production: `Dockerfile` + `docker-compose.prod.yml` (README "Deployment").

## Phase 3 notes (2026-10-29)

- **Semantic layer without Python:** `apps/api/src/semantic-layer/metricflow/` compiles MetricFlow manifests to Postgres SQL. Manifests made by `dbt parse` against DuckDB name DuckDB relations (`"jaffle_shop"."main".orders`); a Postgres project needs a manifest whose `relation_name`s point at Postgres. Comparison script: `metricflow/__fixtures__/reference_queries.json` + the specs.
- **Context explorer Git:** only the generic provider (`QUARRY_CONTEXT_SOURCE=git`, `QUARRY_CONTEXT_GIT_URL`, `_BRANCH`, `_SUBPATH`, `_TOKEN` or `_SSH_KEY`) works until Phase 7; edits happen in per-user worktrees under `<projects dir>/.nao/worktrees/`, reach the agent after the branch is merged and live context is pulled.
- **Agent profiles:** `AgentProfile` (agent-manager.ts) takes `tools`, `systemPrompt`, `maxSteps`, `skipMemoryExtraction`; `AgentService.create` honours them. Phases 4/5 (story refresh, automations) should build their runs the same way (see `agent/profiles/context-recommendations.ts`).
- **For later phases:** `ensureContextRecommendationsScheduleForNewProject` exists but project creation doesn't call it; `AgentToolServices` (types/tools.ts) is where new services reach tools (`skills`, `scheduleOnboardingRules` added); `reviveDates` in the frontend's `apollo-procedures.ts` for JSON-scalar results; user-group grants (skills, files, docs) still use `fullProjectContextAccess()` until Phase 6.

## Phase 4 notes (2026-10-29)

- **Stories API:** the mapping from upstream's `trpc.story` / `storyFolder` / `storyTheme` / `customStoryViewer` / story `chatFork` procedures to GraphQL fields, with conventions and what is not available yet, is in [stories-api.md](stories-api.md). One `JSON` input/output field per procedure (`storyGetLatest`, `storyFolderBulkMove`…).
- **Module-level story code:** upstream's story services, the `story` tool and the `/stories` + `/story-library` mounts are copied module-level code. `StoriesCoreModule` binds the repositories into `stories/story-queries.ts` (namespaces named like upstream's query modules: `storyQueries`, `storyFileQueries`, `chatQueries`…), `StoriesModule` binds the agent bits (`storyRuntime`: tool context, app-DB queries, LLM, running agents). Specs mock `story-queries.js` the way upstream mocked its query files, or use `test/stories-test-module.ts` for Postgres-backed cases.
- **Routers:** `stories/procedures/*.procedures.ts` are the upstream routers nearly verbatim on a small tRPC-like builder (`stories/procedure.ts`: `input`/`use`/`query`/`mutation`, `protectedProcedure`, `projectProtectedProcedure`, `canSendProcedure`, `ownedResourceProcedure`…); the resolver only maps GraphQL fields onto them.
- **Modules:** `StoriesCoreModule` (repositories + bindings), `StoriesModule` (story/folder/theme/viewer routers, agent runtime), `StorySharingModule` (shares, embeds, downloads, theme generation, thumbnail + embed REST; binds the delivery renderer), `StoryJobsModule` (pg-boss scheduler + the three jobs), `StoryFavoritesModule`, `StoryFeedbackModule`. The bindings are process-global: specs that boot two apps must rebind.
- **For Phase 5 (Automations):** story notifications are a stand-in in `stories/jobs/story-notifications.ts` (`notifyUsers`: in-app rows written, email/Slack only logged) — replace it with the real notification service, and finish the unsubscribe cleanup in `teardownStoryDelivery`. Activity logging (`logActivity`) and share notifications (`notifySharedItem`) in `stories/sharing/sharing-procedure.ts` are no-ops. Story schedules go through `stories/services/story-schedule.ts`; automations can follow the same pg-boss key scheme.
- **For Phase 6 (Platform):** user groups are a stand-in in `stories/services/share-audience.ts` (no group audiences, empty `listShareableGroups`, fork = membership, empty `listDeliveryRecipientGroups`); `analyticsEvent.storyViewCounts` / `logChatDownload` still go to upstream; `storyTheme.getState` returns no white-label identity (no branding service); `storyThemeGenerate` records no `llm_inference`.
- **For Phase 7:** embed tokens are minted only by MCP (`stories/sharing/embed-token.ts` `generateEmbedToken`), and embeds require MCP enabled for the project (`project.mcp_endpoint_settings` or `MCP_ENDPOINT_ENABLED`); `chatFork.fork` with a story source is not ported.
- **Open items:** `apps/api` installs its own react 19.2.5 next to the root react-dom 19.3.1; `stories/utils/server-react.ts` works around the duplicate context. `npm dedupe` fixes it but also moves a frontend Radix dialog version, so it was left. resvg loads lazily in `charts/utils/generate-chart.ts` (it picks its native binary by platform at import). Test resets clear `story-*` pg-boss schedules (`test/test-app.ts`).

## Phase 8 notes (2026-10-29)

- **Branch:** `phase-8-cutover` in worktree `nao/quarry-phase-8`, built on `phase-4-stories` (which includes Phase 3). Merge order into `main`: `phase-2-core` → `phase-3-context` → `phase-4-stories` → `phase-8-cutover`.
- **Frontend API layer:** every call goes through a `lib/*-api.ts` module (`lib/apollo-procedures.ts`); `lib/api-types.ts` gives the procedures' input/output types in upstream's router shape. The story routers are inferred from apps/api's procedure objects (`stories/procedure.ts` now carries the client-side input type); the other procedures' types were generated once from upstream's router and point at quarry type modules, so keep them in step by hand when a GraphQL `JSON` field changes. Frontend code imports apps/api types with `import type … from '@quarry/api/…'` (tsconfig path + Vite alias); the only runtime modules it takes from apps/api are `agent/providers/provider-meta.ts`, `agent/types/llm.ts` and `stories/utils/story-summary.ts`.
- **Tests:** frontend specs that need fake procedures mock `@/test/procedures` and point the api module under test at it (`vi.mock('@/lib/story-api', …)`).
- **Stand-ins until Phase 6:** user-group access (`lib/effective-user-group-features.ts` `PROJECT_MEMBER_ACCESS`, `canSeeAdvancedSettings`), sharing audience (everyone may share with the project), `contexts/mcp.tsx` (no MCP servers, Phase 7). Project members can't be managed from the UI (the account page only edits the user's name).
- **Git context source:** project folders created under `QUARRY_PROJECTS_DIR` are not Git checkouts. With `QUARRY_CONTEXT_SOURCE=git` the File Explorer only edits when the project folder is a clone of the context repository (checked by cloning the bare repo into the project folder). The default `./projects` lives inside the quarry checkout, so a non-clone project folder resolves quarry's own repository and reports "No tracked quarry_config.yaml". Worth a follow-up: clone the context repository into new projects, or keep `QUARRY_PROJECTS_DIR` outside any repository.
- **Image size:** `quarry:phase8` is 3.9 GB (dev dependencies, since apps/api runs from TS sources, plus Chromium). Compiling apps/api with SWC and pruning dev dependencies would shrink it.
- **Left as `nao`:** see PHASES.md Phase 8 (`.nao/` folders, `nao/` branch prefix, co-author, system prompt credit, file names).
- **Seen in the browser check, not caused by the cut-over:** after creating a story the agent sometimes adds a `<story-reference>` card with the story's slug instead of its id, which shows "Story no longer available" (the system prompt meant it for existing library stories).

## Saved query tools (2026-10-30)

- **New quarry feature, not a port** (upstream has none). Branch `claude/query-tools-05a582`.
- **Model:** `project_query_tool` (migration `0001_project_query_tool`): name, description, SQL template with `{{ name }}` placeholders, typed `parameters` JSON (`@quarry/shared/query-tools`), optional warehouse `database_id`, `enabled`, `created_by`.
- **API:** `apps/api/src/query-tools/`. Reads need project access; create, preview and writes need a non-viewer role, and editing or deleting someone else's tool needs project admin. Saving validates the SQL with the warehouse guards.
- **Binding:** placeholders compile to `$1…$n`; values are type-checked and sent to `pg` as bind values (`WarehouseSqlOptions.params` → `SqlRequest.params` → `WarehouseDriver.execute(sql, limits, params)`). A literal copy, deparsed from the AST, is kept as the result's SQL for display and re-runs. Placeholders only fit where a value goes (`FROM {{ t }}` is a parse error).
- **Agent:** each enabled tool is `qt_<name>` (`agent/tools/saved-query-tool.ts`, added in `AgentService.create` next to the web tools; left out when the semantic layer is exclusive). It runs through `execute_sql`'s `executeQuery`; its output is an `execute_sql` result plus `query_tool` (name, SQL). Query-result lookups accept `qt_` parts (`isQueryResultPartType`, `isQueryResultToolName`, `QUERY_RESULT_TOOL_NAME_SQL`); they can't be edited in place through `execute_sql`.
- **Frontend:** Settings → Project → Query tools (builder in `lib/query-builder.ts`, columns from the synced `columns.json` via `queryToolTableColumns`), `SavedQueryToolCall` in chat, and "Save as query tool" on `execute_sql` results (`?sql=`).
