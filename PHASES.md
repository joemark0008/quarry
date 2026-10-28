# quarry — phases

Step-by-step breakdown of the phases in [PLAN.md](PLAN.md) §9. PLAN.md says _what_ is built and which upstream code each module replaces; this file says _in what order_, with a checklist per phase.

## Ground rules

- **One branch per phase** (`phase-0-setup`, `phase-1-skeleton`, …), merged into `main` when its "Done when" holds. Big phases are split into milestones, one PR each.
- **Port, don't retype.** Copy an upstream file, then adapt it: make it `@Injectable()`, swap Drizzle calls for the module's repository, swap tRPC inputs for GraphQL `@InputType`s. Keep the logic.
- **Tests come with the code.** Each upstream test file in `fork-reference/apps/backend/tests` that covers a ported file is ported in the same PR.
- **The frontend moves with the backend.** An area isn't done until its frontend screens use Apollo against `apps/api`.
- **Upstream stays runnable** until Phase 8, so behaviour can always be compared side by side.
- Every phase ends with `npm run lint` and `npm test` green.

## Overview

| Phase | Name                                  | Required | Depends on                 | Size              |
| ----- | ------------------------------------- | -------- | -------------------------- | ----------------- |
| 0     | Setup                                 | yes      | —                          | S                 |
| 1     | API skeleton + auth                   | yes      | 0                          | M                 |
| 2     | Core: warehouse, projects, chat agent | yes      | 1                          | XL (4 milestones) |
| 3     | Context                               | optional | 2                          | L                 |
| 4     | Stories                               | optional | 2                          | L                 |
| 5     | Automations & jobs                    | optional | 2                          | M                 |
| 6     | Platform                              | optional | 1                          | M                 |
| 7     | Integrations                          | optional | 2                          | L                 |
| 8     | Cut-over                              | yes      | 2 + chosen optional phases | M                 |

**Decision point after Phase 2:** choose which of Phases 3–7 to build. They don't depend on each other, so they can run in any order or in parallel.

Agent tools that belong to optional phases (`load_skill`, `execute_semantic_query`, `onboarding_*` → 3; `story` → 4; `mcp_call`, `mcp_connect` → 7) stay **out of the tool registry** until their module exists. The registry builds the tool set from the modules that are loaded, so a skipped phase simply means fewer tools.

---

## Phase 0 — Setup

**Goal:** an empty but working `quarry` monorepo, and a running upstream as the baseline.

### Tasks

- [ ] Create the GitHub repo for quarry and add it as `origin` — _not done: `gh` CLI not installed_
- [x] Root `package.json` with npm workspaces (`apps/*`), `.nvmrc` = `v22.23.4` (same as upstream)
- [x] ESLint + Prettier config (start from upstream's `eslint.config.js` / `prettier.config.js`), Husky pre-commit with lint-staged
- [x] `docker-compose.yml` with one Postgres server and two databases:
    - `quarry` — the app database (Prisma)
    - `warehouse` — the test warehouse the agent queries
- [x] Load the upstream example dataset (`fork-reference/example/jaffle_shop.duckdb`) into the `warehouse` database (DuckDB `postgres` extension → `COPY` each table)
- [x] `.env.example` with `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, LLM provider keys
- [x] `CLAUDE.md` with the conventions from PLAN.md §2 (kebab-case files, thin resolvers, Prisma only in repositories, tests with every port)
- [x] Run upstream locally against a separate Postgres database as the baseline (`fork-reference`: `npm install`, `npm run db:migrate`, `npm run dev`) — notes in [docs/upstream-baseline.md](docs/upstream-baseline.md)

### Done when

- `npm install` and `npm run lint` pass in `quarry` (no apps yet beyond placeholders)
- `docker compose up` starts Postgres with both databases, and the `warehouse` database has the jaffle_shop tables
- Upstream runs: you can sign up, create a project and get a chat answer — _sign-up and project work; chat answer needs an LLM key_

### Verify

- `psql … -d warehouse -c '\dt'` lists the jaffle_shop tables
- Screenshot or notes of the upstream baseline flow, used later for comparison

---

## Phase 1 — API skeleton + auth

**Goal:** `apps/api` boots, owns the database schema, and handles sign-up and login. The frontend's login runs through it.

### Milestone 1a — Nest app and database

- [x] `nest new apps/api` (NestJS 11, Express), strict TypeScript, path aliases (`@/*` → `src/*`) — _ESM package (better-auth and pg-boss are ESM-only), run through `@swc-node/register` so `@nao/shared` TS sources load; tests on Vitest + SWC (see note below)_
- [x] `config` module: typed env validated with zod (port of upstream `env.ts`, minus billing, SSO enterprise and cloud vars)
- [x] Generate `schema.prisma` (PLAN.md §4): run upstream migrations on an empty database → `prisma db pull` → rename models/fields → drop enterprise, billing and `scheduled_job` tables → `0000_init` migration — _73 of 87 tables kept; dropped: branding, member budgets, credits/wallet/Stripe/org billing, managed AI usage, example-chat allowance, warehouse provisioning, `scheduled_job` (+ `automation.scheduled_job_id`, `organization.bypass_billing`/`license`, `user_group.sso_mappings`); upstream CHECK constraints appended to the migration by hand_
- [x] `prisma` module with `PrismaService` (connect/disconnect hooks)
- [x] Seed script (port of `scripts/db.seed.ts`)
- [x] `GET /health` (checks the database)
- [x] Global exception filter: maps domain errors to GraphQL errors and HTTP status codes

### Milestone 1b — GraphQL, auth and guards

- [ ] `GraphQLModule.forRoot` (Apollo driver, code-first, `autoSchemaFile: schema.gql`, playground in dev only)
- [ ] `auth` module: better-auth instance (email + password, same plugins as upstream minus enterprise SSO) mounted at `/api/auth/*` with the Prisma adapter
- [ ] `getRequest(context)` helper for GraphQL and REST
- [ ] Global `AuthGuard` + decorators: `@Public()`, `@CurrentUser()`, `@ProjectAccess()`, `@OrgMember()`, `@OrgAdmin()`, `@ProjectAdmin()` (PLAN.md §3)
- [ ] DataLoader base: request-scoped loader factory attached to the GraphQL context
- [ ] `users` module: `me` query, profile update, account status
- [ ] `system` module: public config query (auth providers, version), version check
- [ ] `jobs` module: pg-boss start/stop, `@Job(name)` decorator and boot-time handler discovery, cron schedules via `boss.schedule()`

### Milestone 1c — frontend on Apollo

- [ ] Copy `fork-reference/apps/frontend` → `quarry/apps/frontend`, delete enterprise-licensed files (PLAN.md §8 step 1)
- [ ] Create `apps/shared` and move the type exports the frontend imports from `@nao/backend/*` into it
- [ ] Add Apollo Client (`ApolloProvider`, `InMemoryCache`, credentials: include) and GraphQL Code Generator (`npm run codegen`)
- [ ] Vite proxy: `/graphql`, `/api/auth/*`, `/health` → `apps/api`; everything else → upstream backend
- [ ] Switch login, sign-up, logout, current user and public config to generated Apollo hooks

### Done when

- Sign up, log in, see the current user and log out in the frontend, all served by `apps/api`
- `prisma migrate reset` builds the schema from scratch and seeds it
- Any other screen still works through the upstream backend

### Verify

- e2e (Jest + Supertest): sign up → session cookie → `me` query → logout
- Unit tests for each guard: allowed and denied cases per access level
- A pg-boss test job is scheduled, runs and is retried on failure

---

## Phase 2 — Core: warehouse, projects, chat agent

**Goal:** the main product works on `apps/api`: create a project, connect Postgres, sync its context, chat with the agent and get SQL results, charts and follow-ups.

### Milestone 2a — SQL engine (Postgres)

Port of the Python service and `nao_core/config/databases/*` (PLAN.md §6).

- [ ] `WarehouseDriver` interface: `testConnection`, `listSchemas`, `listTables`, `describeTable`, `previewRows`, `execute(sql, limits)`
- [ ] Postgres driver on `pg`: connection pooling, statement timeout, row limit, type mapping to JSON-safe values (dates, decimals, bigints — upstream `main.py` serialisation rules)
- [ ] SQL checks on `node-sql-parser` (Postgres dialect):
    - read-only (rejects DML/DDL, multiple statements)
    - allow-listed tables only (`allow_listed_only_guard.py`)
    - column access / excluded columns (`column_access.py`, `exclude_columns_guard.py`)
    - row security predicates (`row_security_guard.py`, `/validate_row_predicate`)
- [ ] Port upstream Python test cases for these guards to Jest (`fork-reference/cli/tests`) and make them pass on the Postgres dialect
- [ ] `warehouse/validate` and `warehouse/prepare` equivalents as service methods

### Milestone 2b — projects, warehouse connection, context sync

- [ ] `projects` module: create/list/update/delete, membership, LLM config, saved prompts, default models, example project
- [ ] Warehouse credentials: store encrypted, test connection through `sql-engine`
- [ ] `warehouse` module: run SQL from the UI (trpc `sql` replacement), query results and rows (`query-result.service.ts`, `query-rows.service.ts`)
- [ ] Context sync: "Sync" mutation enqueues a `context.sync` job → port of `nao_core/commands/sync` writes the project's context files (schemas, columns, table previews) → status shown in the UI
- [ ] Frontend: project screens, warehouse settings and the sync button on Apollo

### Milestone 2c — chats and the agent

- [ ] `chats` module: chats, messages, fork, citations, favorites, feedback, shared chats (GraphQL + DataLoaders for messages and authors)
- [ ] `agent` module: `POST /api/agent` streaming with `pipeUIMessageStreamToResponse`, stop on client disconnect (upstream `agent-stream-disconnect` test)
- [ ] Port `agents/`: providers, system prompts, compaction, subagents, stop conditions, user rules, telemetry hooks
- [ ] Tool registry with `ToolContext` built per request (services injected, project and user resolved)
- [ ] Port the core tools: `execute_sql`, `read_query_result`, `display_chart`, `display_map`, `clarification`, `suggest_follow_ups`, `grep`, `list`, `read`, `write`, `str_replace`, `search`, `task`, `web_search`, `execute_python` (`@pydantic/monty`, in-process), `execute_sandboxed_code`, `request_warehouse_credentials`, `request_warehouse_selection`, `query_app_db`, `propose_context_fix`, `record_recommendation`
- [ ] Frontend: chat list, chat view, sharing and feedback on Apollo; `useChat` keeps calling `POST /api/agent`

### Milestone 2d — attachments, charts, transcription, sandbox

- [ ] `attachments`: `POST /api/attachments` (multer, 100 MB), storage service, text extraction for PDF/XLSX
- [ ] `charts`: chart images `GET /c/:id`, images `GET /i/:id`, map boundaries, chart plugins
- [ ] `transcribe`: `POST /api/transcribe`
- [ ] `sandbox`: sandbox runtime and secrets

### Done when

- On `apps/api` only: create a project → connect the `warehouse` database → sync → ask "top 5 customers by revenue" → the agent runs SQL, shows a chart and suggests follow-ups
- A forbidden query (e.g. `DELETE`, a non-allow-listed table) is blocked with a clear error

### Verify

- Ported upstream tests for tools, agent and chats (`apps/backend/tests`, `tests/tool-outputs`)
- Ported Python guard tests pass on the Node SQL engine
- e2e: stream a chat, assert tool calls and the final message are saved
- Same questions asked on upstream and quarry give equivalent answers (manual comparison against the Phase 0 baseline)

**→ Decision point:** choose which of Phases 3–7 to build.

---

## Phase 3 — Context _(optional)_

**Goal:** browse and edit the project context, connect it to git, and use the semantic layer, skills and memory.

### Tasks

- [ ] `context-explorer`: file tree, read/edit files, git sync, path access rules
- [ ] `semantic-layer`: port `nao_core/semantic_layer` + compile to Postgres SQL; register `execute_semantic_query`
- [ ] `skills`: skill CRUD; register `load_skill`
- [ ] `memory`: memory CRUD and agent memory hooks
- [ ] `onboarding`: onboarding rules; register `onboarding_*` and `generate_onboarding_rules`
- [ ] `context-recommendations`: service + `context.recommendations` job; `context.branch.cleanup` job
- [ ] Frontend screens on Apollo

### Done when

- Edit a context file, commit it to git, and the agent uses it in the next chat
- A semantic query ("revenue by month") compiles to SQL and runs on Postgres

### Verify

- Ported tests; semantic layer compiled SQL compared with upstream's Python output for the example project's `semantics/`

---

## Phase 4 — Stories _(optional)_

**Goal:** stories (dashboards) can be created, edited, shared, embedded and refreshed on a schedule.

### Tasks

- [ ] `stories`: stories, folders, themes, custom story viewer; register the `story` tool
- [ ] `story-sharing`: shared stories, embeds, `GET /api/stories/:id/thumbnail`, `GET /api/embed/*`
- [ ] Jobs: `story.refresh`, `story.deliver`, `story.blob-cleanup`
- [ ] Frontend screens on Apollo

### Done when

- The agent creates a story from a chat; it can be edited, shared, embedded, and refreshes on schedule

### Verify

- Ported tests; thumbnail and embed endpoints return files; refresh job completes

---

## Phase 5 — Automations & jobs _(optional)_

**Goal:** scheduled and webhook-triggered agent runs, with notifications.

### Tasks

- [ ] `automations`: CRUD, cron parsing (`cron-nlp.ts`), `automation.run` job, `POST /api/automations/:id/run`
- [ ] `notifications`: channels, email, unsubscribe endpoint
- [ ] Frontend screens on Apollo

### Done when

- An automation runs on its cron and via webhook, and the notification arrives; unsubscribe works

### Verify

- e2e webhook trigger; retry/backoff with a failing handler

---

## Phase 6 — Platform _(optional)_

**Goal:** multi-user organisations and administration.

### Tasks

- [ ] `organizations`: orgs, invitations, members, project sharing; `invitation.cleanup` job
- [ ] `user-groups`: groups, feature access, project access by group
- [ ] `api-keys`
- [ ] `usage`: usage, logs, feedback, analytics events; `log.cleanup` job
- [ ] `sso`: own OIDC login on better-auth's generic OAuth plugin, provider settings in the UI
- [ ] Frontend settings screens on Apollo (update `settings-search-index.ts`)

### Done when

- Invite a user to an org, put them in a group, restrict a project to that group; log in through OIDC

### Verify

- Guard tests per role; cleanup jobs; SSO login against Keycloak in Docker

---

## Phase 7 — Integrations _(optional)_

**Goal:** use the agent outside the web app.

### Tasks

- [ ] `messaging`: pick bots first (Slack, Teams, Discord, Telegram, Mattermost, WhatsApp) — webhooks with signature checks
- [ ] `git-providers`: GitHub/GitLab OAuth, webhooks, context PRs
- [ ] `mcp-client`: MCP server connections; register `mcp_call`, `mcp_connect`
- [ ] `mcp-server`: expose quarry over MCP at `/mcp` with OAuth; `mcp.queryData.cleanup` job

### Done when

- Each chosen bot answers a question; the MCP server works from an MCP client

### Verify

- Signature tests per provider; MCP Inspector against `/mcp`

---

## Phase 8 — Cut-over

**Goal:** quarry runs on its own.

### Tasks

- [ ] Remove the Vite proxy split; all traffic to `apps/api`
- [ ] Remove `@trpc/*` and any leftover upstream imports
- [ ] Dockerfile (api + built frontend) and `docker-compose.yml` for production
- [ ] Helm chart (optional)
- [ ] README: setup, env vars, deployment

### Done when

- quarry runs with no dependency on `fork-reference`

### Verify

- `docker compose up` from a clean checkout; full test suite and lint green; smoke test: sign up → project → sync → chat → (story, if Phase 4 was built)
