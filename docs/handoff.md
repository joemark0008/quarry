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
| 2d, 3–8                                              | Not started                                                                                      |

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
    6. ~~Frontend: chat list/view, sharing, feedback on Apollo; Vite proxy sends `/api/agent` to `apps/api`~~ — done through `apps/frontend/src/lib/chat-api.ts`. **Still open:** saved prompts UI and LLM/model settings (project LLM config, default models, agent settings) remain on upstream tRPC; the agent reads the same tables, so split mode works.
    - Browser check (2026-10-29, split mode on :3000): asked "Show revenue by month for 2018 as a chart" in the jaffle project — streamed answer with chart and cited values; reload from GraphQL, chat list, star, thumbs-up feedback with text, share to project, shared-chat page, SQL view, data table (`queryRows`) and the context ring all worked.
    7. `npm run lint`, `npm test`, `npm run format:check`, tick PHASES.md, commit 2c.

## Running locally (split mode)

Until Phase 8 the frontend talks to two backends: `/graphql`, `/api/auth/*`, `/health` → `apps/api` (:5006); everything else → upstream backend (:5005). Both share the `nao_baseline` database and `BETTER_AUTH_SECRET`. See [proxy-split.md](proxy-split.md).

- Postgres in Docker on **5434** (5432 was taken): databases `quarry`, `warehouse` (jaffle_shop), `nao_baseline`.
- Start the API with `npm run dev:api:split` (plain `dev:api` uses the `quarry` DB and login breaks). Frontend `npm run dev:frontend` on :3000. Upstream backend: `npm run dev:backend` in `fork-reference`.
- Login: the baseline test account on line 12 of `fork-reference/.env`.
- Don't run `prisma migrate` against `nao_baseline` — its schema belongs to upstream.
- Strings still named `nao` until Phase 8 (headers, tool names, `nao_config`, `nao` provider id, custom-story protocol) are listed in PHASES.md under 1c.
