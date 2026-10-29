# Handoff — 2026-10-29

Context carried over from Claude Code sessions run under another account (transcripts in `~/.claude/projects/-Users-jjgimeno-Documents-Projects-personal-nao{,-quarry}/`). Read this, then [PLAN.md](../PLAN.md) and [PHASES.md](../PHASES.md).

## How we work

- One **master session** plans and coordinates; **each phase runs in its own new session**, on branch `phase-N-…`, and reports back. Phases aren't implemented in the master session.
- Phase sessions may use the `reverse-engineer-anything` (REA) skill, mainly to observe the running upstream app and compare behaviour. Ordinary porting is plain code reading.
- `../fork-reference` is the upstream getnao/nao clone (remote `upstream`), read-only.
- No GitHub remote for quarry yet: `gh` isn't installed (`brew install gh`), or create an empty repo and add it as `origin`.

## Decisions (why the stack looks like this)

| Topic           | Decision                                                                                                                                                                          |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Approach        | Full rewrite, not a NestJS wrapper around upstream; drop parts later (Phases 3–7 are optional)                                                                                    |
| Server          | NestJS 11 on **Express** (not Fastify: latency is dominated by LLM/warehouse calls; Express has better Nest ecosystem fit)                                                        |
| API             | GraphQL code-first + Apollo, one server, no federation; REST only for agent streaming, auth/OAuth, webhooks, uploads, MCP                                                         |
| ORM             | Prisma on Postgres; schema from upstream migrations → `db pull` → cleanup (73 of 87 tables kept)                                                                                  |
| Frontend        | Keep upstream React app; **Apollo Client** + GraphQL Code Generator (matches `sda-graphql-crm`)                                                                                   |
| Jobs            | pg-boss (no Redis)                                                                                                                                                                |
| Billing         | Dropped (Stripe, credits, trials). Billing UI screens still in the frontend — to remove                                                                                           |
| Python          | None. FastAPI sidecar + `nao_core` ported to Node as `sql-engine`; Python CLI dropped; `nao sync` → in-app **Sync** button (`context.sync` job)                                   |
| Warehouses      | Postgres only for now; more drivers later behind `WarehouseDriver`                                                                                                                |
| SSO             | Own OIDC on better-auth generic OAuth (Phase 6), no upstream enterprise code                                                                                                      |
| Enterprise code | Never ported                                                                                                                                                                      |
| Brand           | Name **quarry**; logo = faceted hexagon mark (teal `#0F6E56`, gold facet `#EF9F27`), wordmark in Poppins SemiBold outlined to paths; assets in `brand/` (`build.mjs` regenerates) |

## Status

| Phase                                                | State                                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 0 Setup                                              | Done, merged to `main` (GitHub remote still missing)                                             |
| 1 API skeleton + auth + frontend on Apollo + rebrand | Done, merged to `main` (`d7f70d4`)                                                               |
| 2a SQL engine                                        | Committed on `phase-2-core` (`7791b57`) — `pgsql-parser` instead of `node-sql-parser`, 122 tests |
| 2b Projects, warehouse, context sync                 | Committed on `phase-2-core` (`5c35aa6`)                                                          |
| **2c Chats + agent**                                 | **In progress** — agent + tests committed on `phase-2-core`, see below                           |
| 2d Attachments, charts, transcribe, sandbox          | Committed on `phase-2-core` — Phase 2 complete, see PHASES.md 2d                                 |
| 3 Context                                            | Done on `phase-3-context` (not merged) — see PHASES.md Phase 3 and "Phase 3 notes" below         |
| 4–8                                                  | Not started — chosen: 4 Stories, 5 Automations, 6 Platform (one session each); 7 not chosen yet  |

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

## Running locally (split mode)

Until Phase 8 the frontend talks to two backends: `/graphql`, `/api/auth/*`, `/health` → `apps/api` (:5006); everything else → upstream backend (:5005). Both share the `nao_baseline` database and `BETTER_AUTH_SECRET`. See [proxy-split.md](proxy-split.md).

- Postgres in Docker on **5434** (5432 was taken): databases `quarry`, `warehouse` (jaffle_shop), `nao_baseline`.
- Start the API with `npm run dev:api:split` (plain `dev:api` uses the `quarry` DB and login breaks). Frontend `npm run dev:frontend` on :3000. Upstream backend: `npm run dev:backend` in `fork-reference`.
- Login: the baseline test account on line 12 of `fork-reference/.env`.
- Don't run `prisma migrate` against `nao_baseline` — its schema belongs to upstream.
- Strings still named `nao` until Phase 8 (headers, tool names, `nao_config`, `nao` provider id, custom-story protocol) are listed in PHASES.md under 1c.

## Phase 3 notes (2026-10-29)

- **Semantic layer without Python:** `apps/api/src/semantic-layer/metricflow/` compiles MetricFlow manifests to Postgres SQL. Manifests made by `dbt parse` against DuckDB name DuckDB relations (`"jaffle_shop"."main".orders`); a Postgres project needs a manifest whose `relation_name`s point at Postgres. Comparison script: `metricflow/__fixtures__/reference_queries.json` + the specs.
- **Context explorer Git:** only the generic provider (`QUARRY_CONTEXT_SOURCE=git`, `QUARRY_CONTEXT_GIT_URL`, `_BRANCH`, `_SUBPATH`, `_TOKEN` or `_SSH_KEY`) works until Phase 7; edits happen in per-user worktrees under `<projects dir>/.nao/worktrees/`, reach the agent after the branch is merged and live context is pulled.
- **Agent profiles:** `AgentProfile` (agent-manager.ts) takes `tools`, `systemPrompt`, `maxSteps`, `skipMemoryExtraction`; `AgentService.create` honours them. Phases 4/5 (story refresh, automations) should build their runs the same way (see `agent/profiles/context-recommendations.ts`).
- **For later phases:** `ensureContextRecommendationsScheduleForNewProject` exists but project creation doesn't call it; `AgentToolServices` (types/tools.ts) is where new services reach tools (`skills`, `scheduleOnboardingRules` added); `reviveDates` in the frontend's `apollo-procedures.ts` for JSON-scalar results; user-group grants (skills, files, docs) still use `fullProjectContextAccess()` until Phase 6.

## Phase 4 notes (2026-10-29)

- **Stories API:** the mapping from upstream's `trpc.story` / `storyFolder` / `storyTheme` / `customStoryViewer` / story `chatFork` procedures to GraphQL fields, with conventions and what is not available yet, is in [stories-api.md](stories-api.md). One `JSON` input/output field per procedure (`storyGetLatest`, `storyFolderBulkMove`…).
- **Module-level story code:** upstream's story services, the `story` tool and the `/stories` + `/story-library` mounts are copied module-level code. `StoriesCoreModule` binds the repositories into `stories/story-queries.ts` (namespaces named like upstream's query modules: `storyQueries`, `storyFileQueries`, `chatQueries`…), `StoriesModule` binds the agent bits (`storyRuntime`: tool context, app-DB queries, LLM, running agents). Specs mock `story-queries.js` the way upstream mocked its query files, or use `test/stories-test-module.ts` for Postgres-backed cases.
- **Routers:** `stories/procedures/*.procedures.ts` are the upstream routers nearly verbatim on a small tRPC-like builder (`stories/procedure.ts`: `input`/`use`/`query`/`mutation`, `protectedProcedure`, `projectProtectedProcedure`, `canSendProcedure`, `ownedResourceProcedure`…); the resolver only maps GraphQL fields onto them.
- **For stage 3:** schedules go through `stories/services/story-schedule.ts` (`bindStoryScheduler` — pg-boss keys `story-refresh-<id>` / `story-delivery-<id>`, no `scheduled_job_id` columns); `custom-story-thumbnail.ts` is a no-op stand-in; `MAX_STORY_SNAPSHOT_BYTES` lives in `utils/custom-story-trpc.ts`; share audiences are a stand-in in `services/share-audience.ts`; story page views are logged to `analytics_event` (`utils/analytics-event.ts`).
