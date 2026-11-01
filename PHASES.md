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
| 5     | Automations & jobs                    | deferred | 2                          | M                 |
| 6     | Platform                              | deferred | 1                          | M                 |
| 7     | Integrations                          | deferred | 2                          | L                 |
| 8     | Cut-over                              | yes      | 2 + chosen optional phases | M                 |

**Decision point after Phase 2:** choose which of Phases 3–7 to build. They don't depend on each other, so they can run in any order or in parallel.

**Decided (2026-10-29):** Phases 3 and 4 are built; 5, 6 and 7 are deferred and Phase 8 cut over without them. What was removed and where it comes from upstream: [docs/deferred-features.md](docs/deferred-features.md).

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
- [x] Run upstream locally against a separate Postgres database as the baseline (`fork-reference`: `npm install`, `npm run db:migrate`, `npm run dev`)

### Done when

- `npm install` and `npm run lint` pass in `quarry` (no apps yet beyond placeholders)
- `docker compose up` starts Postgres with both databases, and the `warehouse` database has the jaffle_shop tables
- Upstream runs: you can sign up, create a project and get a chat answer — verified

### Verify

- `psql … -d warehouse -c '\dt'` lists the jaffle_shop tables
- Screenshot or notes of the upstream baseline flow, used later for comparison

---

## Phase 1 — API skeleton + auth

**Goal:** `apps/api` boots, owns the database schema, and handles sign-up and login. The frontend's login runs through it.

### Milestone 1a — Nest app and database

- [x] `nest new apps/api` (NestJS 11, Express), strict TypeScript, path aliases (`@/*` → `src/*`) — _ESM package (better-auth and pg-boss are ESM-only), run through `@swc-node/register` so `@upstream/shared` TS sources load; tests on Vitest + SWC (see note below)_
- [x] `config` module: typed env validated with zod (port of upstream `env.ts`, minus billing, SSO enterprise and cloud vars)
- [x] Generate `schema.prisma` (PLAN.md §4): run upstream migrations on an empty database → `prisma db pull` → rename models/fields → drop enterprise, billing and `scheduled_job` tables → `0000_init` migration — _73 of 87 tables kept; dropped: branding, member budgets, credits/wallet/Stripe/org billing, managed AI usage, example-chat allowance, warehouse provisioning, `scheduled_job` (+ `automation.scheduled_job_id`, `organization.bypass_billing`/`license`, `user_group.sso_mappings`); upstream CHECK constraints appended to the migration by hand_
- [x] `prisma` module with `PrismaService` (connect/disconnect hooks)
- [x] Seed script (port of `scripts/db.seed.ts`)
- [x] `GET /health` (checks the database)
- [x] Global exception filter: maps domain errors to GraphQL errors and HTTP status codes

### Milestone 1b — GraphQL, auth and guards

- [x] `GraphQLModule.forRoot` (Apollo driver, code-first, `autoSchemaFile: schema.gql`, playground in dev only) — _GraphiQL in dev (Apollo 5 dropped the playground); `apps/api/schema.gql` is committed for codegen_
- [x] `auth` module: better-auth instance (email + password, same plugins as upstream minus enterprise SSO) mounted at `/api/auth/*` with the Prisma adapter — _email + password, Google, GitHub, GitLab, `bearer`; the OAuth-provider + JWT plugins (MCP) wait for Phase 7, emails for Phase 5_
- [x] `getRequest(context)` helper for GraphQL and REST
- [x] Global `AuthGuard` + decorators: `@Public()`, `@CurrentUser()`, `@ProjectAccess()`, `@OrgMember()`, `@OrgAdmin()`, `@ProjectAdmin()` (PLAN.md §3) — _plus `@ProjectNonViewer()` and `@Current{Session,Project,UserRole,Organization,OrgRole}()`_
- [x] DataLoader base: request-scoped loader factory attached to the GraphQL context
- [x] `users` module: `me` query, profile update, account status — _also `hasUsers`, `modifyPassword`, `UserLoader`_
- [x] `system` module: public config query (auth providers, version), version check
- [x] `jobs` module: pg-boss start/stop, `@Job(name)` decorator and boot-time handler discovery, cron schedules via `boss.schedule()`

### Milestone 1c — frontend on Apollo

- [x] Copy `fork-reference/apps/frontend` → `quarry/apps/frontend`, delete enterprise-licensed files (PLAN.md §8 step 1) — _15 files and their 3 tests; importers (auth form, sidebar, root, appearance, budgets, org settings, user groups, settings nav/search) edited. Billing UI is not enterprise-licensed and stays until it is removed separately_
- [x] Create `apps/shared` and move the type exports the frontend imports from `@upstream/backend/*` into it — _`apps/shared` is upstream's `@upstream/shared`; the `@upstream/backend/*` types become `@upstream/shared/backend/*` bridges that re-export upstream until each module is ported (`docs/proxy-split.md` (retired in Phase 8, see git history))_
- [x] Add Apollo Client (`ApolloProvider`, `InMemoryCache`, credentials: include) and GraphQL Code Generator (`npm run codegen`)
- [x] Vite proxy: `/graphql`, `/api/auth/*`, `/health` → `apps/api`; everything else → upstream backend — _`apps/api` moves to port 5006; upstream keeps 5005_
- [x] Switch login, sign-up, logout, current user and public config to generated Apollo hooks — _login/sign-up/logout keep the better-auth client (now served by `apps/api`); their public config, auth providers and `hasUsers`, the sidebar user (`me`) and every `system.getPublicConfig` call site use Apollo_
- [x] Rebrand to quarry in `apps/frontend`, `apps/shared` and `apps/api`: `@quarry/*` package scope, `quarry-*` file names, identifiers, CSS class prefixes and UI text, `QUARRY_*` env vars in `apps/api`, the `brand/` logo, favicon, app icons and manifest, the teal palette. Links that pointed at the upstream site (docs, support, repository, community, newsletter, privacy) come from `VITE_QUARRY_*` build variables and their UI is hidden when unset; the update check reads `QUARRY_RELEASES_REPOSITORY`.

### Done when

- Sign up, log in, see the current user and log out in the frontend, all served by `apps/api` — _checked in the browser, see `docs/proxy-split.md` (retired in Phase 8, see git history)_
- `prisma migrate reset` builds the schema from scratch and seeds it — _checked as `migrate deploy` + `db:seed` on a new empty database; `migrate reset` itself was not run: Prisma refuses it for AI agents without the user's consent_
- Any other screen still works through the upstream backend — _home, chat list, chat view and settings checked; both backends share the `upstream_baseline` database and auth secret in this mode_

### Verify

- e2e (Jest + Supertest): sign up → session cookie → `me` query → logout — _on Vitest + Supertest instead of Jest: the API is ESM and the ported upstream tests are Vitest (`apps/api/test/auth.e2e-spec.ts`)_
- Unit tests for each guard: allowed and denied cases per access level — _`apps/api/src/common/guards/auth.guard.spec.ts`_
- A pg-boss test job is scheduled, runs and is retried on failure — _`apps/api/test/jobs.e2e-spec.ts`_

---

## Phase 2 — Core: warehouse, projects, chat agent

**Goal:** the main product works on `apps/api`: create a project, connect Postgres, sync its context, chat with the agent and get SQL results, charts and follow-ups.

### Milestone 2a — SQL engine (Postgres)

Port of the Python service and `upstream_core/config/databases/*` (PLAN.md §6).

- [x] `WarehouseDriver` interface: `testConnection`, `listSchemas`, `listTables`, `describeTable`, `previewRows`, `execute(sql, limits)` — _`apps/api/src/sql-engine/warehouse-driver.ts`, plus `countRows` for sync; the driver doubles as the guards' live-schema connection_
- [x] Postgres driver on `pg`: connection pooling, statement timeout, row limit, type mapping to JSON-safe values (dates, decimals, bigints — upstream `main.py` serialisation rules) — _one pool per connection config; every query runs in a `READ ONLY` transaction with `SET LOCAL statement_timeout`; column types printed Ibis-style (`int32`, `string`, `decimal(p, s)`) as upstream sync wrote them_
- [x] SQL checks on `node-sql-parser` (Postgres dialect): — _on `pgsql-parser` (libpg_query, Postgres' own parser in WASM) instead: node-sql-parser misread `CROSS JOIN LATERAL` (took `CROSS` as an alias), accepted `SELECT … INTO` and dropped identifier quoting, which the guards depend on. Scope analysis (the `traverse_scope` part of sqlglot) is in `guards/pg-ast.ts`; other warehouses will need their own parser behind the same guard functions_
    - read-only (rejects DML/DDL, multiple statements) — _quarry addition (`read-only.guard.ts`): also `SELECT INTO`, `FOR UPDATE`, data-modifying CTEs and a deny-list of functions that reach files, other databases or server state (`dblink`, `pg_read_file`, `query_to_xml`, `pg_sleep`…)_
    - allow-listed tables only (`allow_listed_only_guard.py`)
    - column access / excluded columns (`column_access.py`, `exclude_columns_guard.py`) — _`column_access.py` + `column_access_analysis.py` (what FastAPI calls); `exclude_columns_guard.py` is unused upstream and not ported. Upstream only enforced it under an enterprise license; quarry enforces `exclude_columns` whenever it is configured_
    - row security predicates (`row_security_guard.py`, `/validate_row_predicate`)
- [x] Port upstream Python test cases for these guards to Jest (`fork-reference/cli/tests`) and make them pass on the Postgres dialect — _on Vitest: `guards/*.spec.ts` (allow-list 27, row security 32 incl. the outer-join cases executed on Postgres temp tables, column access 26, read-only 24). Dialect-only cases (DuckDB/BigQuery/Snowflake/StarRocks syntax: `* EXCLUDE`, `UNNEST`, backtick paths, MySQL literals) are not ported; each spec header lists them_
- [x] `warehouse/validate` and `warehouse/prepare` equivalents as service methods — _`SqlEngineService` (`executeSql`, `validateSql`, `validateRowPredicate`, `validateWarehouse`, `prepareWarehouse`), checked against the jaffle_shop `warehouse` database in `sql-engine.service.spec.ts`. `quarry_config.yaml` is read with `{{ env('…') }}` substitution (`aws()`/`k8s()` secrets not supported); non-Postgres entries load but fail with a clear error when selected_

### Milestone 2b — projects, warehouse connection, context sync

- [x] `projects` module: create/list/update/delete, membership, LLM config, saved prompts, default models, example project — _GraphQL `projects`, `currentProject`, `createProject`, `renameProject`, `deleteProject`, saved prompts CRUD. quarry addition: projects are created in the app (upstream self-hosted has one project from `QUARRY_DEFAULT_PROJECT_PATH`), each with a folder under `QUARRY_PROJECTS_DIR`; the selected project (`x-quarry-project-id`) is honoured as in upstream's cloud mode. LLM config, default models and agent settings move with the agent (2c); the example project is not ported (it is a DuckDB project)_
- [x] Warehouse credentials: store encrypted, test connection through `sql-engine` — _`connectWarehouse` checks the credentials on a live connection, writes the `quarry_config.yaml` entry with `{{ env('QUARRY_WAREHOUSE_<NAME>_<FIELD>') }}` references and stores the values AES-256-GCM encrypted in `project_warehouse_credentials` (port of `warehouse-credentials.ts` / `utils/encryption.ts`); `testWarehouseConnection`, `disconnectWarehouse`, `warehouseConnections` (no secrets returned)_
- [x] `warehouse` module: run SQL from the UI (trpc `sql` replacement), query results and rows (`query-result.service.ts`, `query-rows.service.ts`) — _moved to 2c: both read the `execute_sql` tool results stored in chat messages. Done in 2c inside the `chats` module (the agent module imports `warehouse`, so it can't depend back on the agent): `previewSqlQuery` / `updateSqlQuery` (port of `services/update-sql.ts`, runs through `execute_sql` and its guards; failures come back as `BAD_REQUEST` with the guard's message, as tRPC showed it) and `queryRows` (`query-rows.service.ts`). `query-result.service.ts` is the agent's `services/query-result.service.ts`_
- [x] Context sync: "Sync" mutation enqueues a `context.sync` job → port of `upstream_core/commands/sync` writes the project's context files (schemas, columns, table previews) → status shown in the UI — _`syncContext` → pg-boss `context.sync` → `databases/type=postgres/database=…/schema=…/table=…/{columns,preview,annotations}.md` and `.meta/…/columns.json` (stale tables and databases removed, `--select` supported). Status in `.meta/sync-status.json` (no new table, so split mode keeps upstream's schema). The `profiling`, `ai_summary` and `query_history` templates are not ported_
- [x] Frontend: project screens, warehouse settings and the sync button on Apollo — _`useCurrentProject`/`useProjects` (Apollo) replace every `project.getCurrent` / `listForCurrentUser` call site; project rename on Apollo; new **Settings → Warehouse** page (connect, test, edit, remove, Sync with live status); **New project** in the project switcher (shown in self-hosted mode too). Still on upstream tRPC: saved prompts UI, LLM/model settings (2c)_

### Milestone 2c — chats and the agent

- [x] `chats` module: chats, messages, fork, citations, favorites, feedback, shared chats (GraphQL + DataLoaders for messages and authors) — _`chat`, `chatList`, `searchChats`, `chatForkMetadata`, `chatContextUsage`, `queryRows`, `citation`, chat mutations (delete, stop, cancel, rename, star, delete non-starred, switch version), `sharedChats` / `sharedChat` / `chatShareOptions` + create/update access/delete, `forkSharedChat` / `askSharedChat` / `sharedChatQuickQuestions`, `submitMessageFeedback` / `recentFeedbacks`. `Chat.messages` (UIMessage JSON, query results cut to previews) and `Chat.author` go through request-scoped DataLoaders. Deviations: favorites upstream only target stories and story folders → Phase 4 (chats are starred); story forks (`askStory`, `forkStory`, `openStandalone`), story feedback and `chat.download` → Phase 4 / chat export; share notifications and activity log → Phase 5; group-limited share audiences → Phase 6 (`ProjectSharingService` stand-in lets members share with the project); citation lineage keeps upstream's default `node-sql-parser` dialect, so Postgres casts (`::numeric`) fall back to an empty lineage as upstream_
- [x] `agent` module: `POST /api/agent` streaming with `pipeUIMessageStreamToResponse`, stop on client disconnect (upstream `agent-stream-disconnect` test) — _SSE through `JsonToSseTransformStream` with keep-alive and query-result previews. As upstream today, a closed connection doesn't stop the run (the answer is still saved); it is logged unless the user pressed Stop (`stopChat`). `agent-stream-disconnect` spec ported_
- [x] Port `agents/`: providers, system prompts, compaction, subagents, stop conditions, user rules, telemetry hooks — _`src/agent/`; compaction (`RunCompaction` per step, `useLastCompaction`, also used by forks) and the `explore` subagent behind `task` (`BETA_SUBAGENTS_ENABLED`). Dropped: billing/budget checks and `llm_inference` records (usage tracking not ported), managed `quarry` provider, memory, skills and story references (Phase 3/4 stand-ins). `@ai-sdk/anthropic` pinned to 3.0.121_
- [x] Tool registry with `ToolContext` built per request (services injected, project and user resolved) — _`tools/index.ts` follows upstream `getTools`; `AgentService.buildToolContext` injects repository-backed services (chat queries, warehouse SQL, app DB, LLM resolution)_
- [x] Port the core tools: `execute_sql`, `read_query_result`, `display_chart`, `display_map`, `clarification`, `suggest_follow_ups`, `grep`, `list`, `read`, `write`, `str_replace`, `search`, `task`, `web_search`, `execute_python` (`@pydantic/monty`, in-process), `execute_sandboxed_code`, `request_warehouse_credentials`, `request_warehouse_selection`, `query_app_db`, `propose_context_fix`, `record_recommendation` — _real: `execute_sql`, `read_query_result`, `display_chart`, `display_map` (custom boundary sets 2d), `clarification`, `suggest_follow_ups`, `grep`, `list`, `read`, `search`, `task`, `web_search` (agent setting), `execute_python` (in-process `@pydantic/monty`, experimental flag), `request_warehouse_credentials` / `request_warehouse_selection` (onboarding runs, Phase 3), `query_app_db` (quarry's DB through scoped temp views in a rolled-back read-only transaction), `record_recommendation` / `propose_context_fix` (collectors; context-recommendation runs are Phase 3). Ported unchanged but backed by stand-ins, so inactive by upstream's own gating: `write` / `str_replace` (storage 2d, story mounts Phase 4), `execute_sandboxed_code` (sandbox runtime 2d)_
- [x] Frontend: chat list, chat view, sharing and feedback on Apollo; `useChat` keeps calling `POST /api/agent` — _`lib/chat-api.ts` mirrors the tRPC options proxy (`queryOptions`, `queryKey`, `mutationOptions`, `pathFilter`) over Apollo Client for `chat.*`, `sharedChat.*`, `chatFork.fork/askSharedChat/listSharedChatQuickQuestions`, `citation.get`, `feedback.submit` and `sql.*`; call sites swap `trpc.` for `chatApi.`. Results stay in TanStack Query because the chat view rewrites the cached chat on every streamed chunk; keys keep tRPC's shape so prefix invalidations still work, and GraphQL error codes are exposed as `data.code` for `lib/trpc-error.ts`. Vite sends `/api/agent` to `apps/api`. Saved prompts and Settings → Agent (LLM providers, default models, agent settings) moved too: `ModelSettingsModule` (`llmConfigs`, `upsertLlmConfig`, `deleteLlmConfig`, `knownModels`, `defaultModels`, `updateDefaultModels`, `defaultChatModel`, `agentSettings`, `updateAgentSettings`; JSON payloads validated with upstream's zod schemas) and `projectSavedPrompts`, through `lib/project-api.ts`. Not ported there: the `quarry_config.yaml` `llm` block, messaging integration models (Phase 7), the MCP endpoint model (Phase 6). Still on upstream tRPC: story forks/feedback and favorites (Phase 4), transcription models (2d), messaging configs (Phase 7)_

### Milestone 2d — attachments, charts, transcription, sandbox

- [x] `attachments`: `POST /api/attachments` (multer, 100 MB), storage service, text extraction for PDF/XLSX — _`AttachmentsModule`: `POST /api/attachments` (multer, 100 MB cap, then the storage size limit) plus `GET`/`HEAD /api/attachments/file`; upstream's storage (local + S3 providers, keys, usage, user files) stays module-level under `src/attachments/storage/`, reading `QUARRY_STORAGE_*` from the environment; PDF (`unpdf`) and XLSX (`fflate`) text extraction. The agent's storage, file-text and image stand-ins are real now: `write` / `str_replace` and `/home` work, `POST /api/agent` saves images to `message_image` and documents as `file` parts, and the model receives them as upstream's `resolveAttachments` builds them. GraphQL `storageConfig` / `storageHealth` (admins), `storageUploadLimits`, `storageUsage` (non-viewers: no user groups yet). Checked live: a CSV uploaded, downloaded back and counted in storage usage. Not ported: DuckDB local queries_
- [x] `charts`: chart images `GET /c/:id`, images `GET /i/:id`, map boundaries, chart plugins — _`ChartsModule`: `GET /c/:chatId/:chartId.png` (public, as upstream), `GET /i/:imageId` (chat-view access, now `ChatAccessService`), `GET /api/map-boundaries/:projectId/:key` and `/proxy`; GraphQL `chartDownload` (server-rendered PNG: upstream's `generate-chart` React → SVG → `@resvg/resvg-js`, DejaVu fonts in `apps/api/assets/fonts/`), `updateChartConfig`, `updateMapConfig`, `chartPlugins`, `chartPluginSource`, and the project map boundaries (`mapBoundaries`, `validateMapBoundaryUrl`, `add/update/deleteMapBoundary` on `project.map_settings`). `display_map` now sees custom boundary sets. Deviations: no `cheerio` (a small tag scanner cuts the `<svg>` out), duplicate boundary keys and boundary fetch failures are `BAD_REQUEST` with the original message, analytics events not ported. Checked live: the jaffle chart downloaded as a 1600×1048 PNG, and the `world_countries` boundary served 177 features_
- [x] `transcribe`: `POST /api/transcribe` — _`TranscribeModule`: the REST endpoint takes upstream's tRPC input unchanged (`{ audio: base64, provider?, modelId? }`) and returns `{ text }`; `knownTranscribeModels` (upstream `getKnownTranscribeModels`) and `availableModels` (upstream `listAvailableTranscribeModels`, which is really the project's chat model list) are GraphQL. Checked live: a `say`-generated clip came back as its sentence through the Vite proxy. Upstream has no transcription tests; `transcribe.service.spec.ts` covers model/key resolution_
- [x] `sandbox`: sandbox runtime and secrets — _`services/sandbox-runtime.ts` is upstream's (`@boxlite-ai/boxlite`, `/dev/kvm` check on Linux); `SandboxModule` ports the secret queries/service/routes (`sandboxSecrets`, `setSandboxSecret`, `updateSandboxSecretDescription`, `deleteSandboxSecret`, non-viewers only), encrypted like warehouse credentials. Secrets reach `execute_sandboxed_code` through `ToolContext.services.resolveSandboxSecrets`; the tool stays gated by `experimental.sandboxes`. Checked live: a micro-VM booted on macOS and ran Python with a secret passed in and redacted from the output. Not ported: the `pdf-handling` skill checks (skills are Phase 3)_

### Done when

- On `apps/api` only: create a project → connect the `warehouse` database → sync → ask "top 5 customers by revenue" → the agent runs SQL, shows a chart and suggests follow-ups
- A forbidden query (e.g. `DELETE`, a non-allow-listed table) is blocked with a clear error

### Verify

- Ported upstream tests for tools, agent and chats (`apps/backend/tests`, `tests/tool-outputs`) — _done: about 70 spec files under `src/agent/` and `src/chats/` (api suite 1213 + 3 e2e); skipped cases are commented in each spec_
- Ported Python guard tests pass on the Node SQL engine
- e2e: stream a chat, assert tool calls and the final message are saved — _done: `test/agent-chat.e2e-spec.ts` streams `POST /api/agent` with a scripted mock model (no key) against the jaffle_shop warehouse, then checks the saved `execute_sql` part, its rows (`queryRows`) and the answer through GraphQL_
- Same questions asked on upstream and quarry give equivalent answers (manual comparison against the Phase 0 baseline) — _done 2026-10-29: identical figures for both baseline questions, see the upstream baseline_

**→ Decision point:** choose which of Phases 3–7 to build.

---

## Phase 3 — Context _(optional)_

**Goal:** browse and edit the project context, connect it to git, and use the semantic layer, skills and memory.

### Tasks

- [x] `context-explorer`: file tree, read/edit files, git sync, path access rules — _`ContextExplorerModule`: upstream's `context-explorer*` services, `context-explorer-git/*`, `context-repo`, `git-repo`, `generic-git`, `safe-file-write`, `file-tree-catalog` copied nearly unchanged under `files/` and `git/` (module-level, the repository bound at boot); `QUARRY_CONTEXT_*` → `QUARRY_CONTEXT_*`. 22 GraphQL operations (`contextRepositoryStatus`, `contextFile`, `writeContextFile`, `createContextBranchAndCommit`, `pushContextBranch`, `pullLiveContext`…) return upstream's shapes as `JSON`. Only the generic Git provider works: GitHub/GitLab connections, tokens and PR/MR creation are stand-ins until Phase 7 (`git-providers`); user-group license locking not ported_
- [x] `semantic-layer`: port `upstream_core/semantic_layer` + compile to Postgres SQL; register `execute_semantic_query` — _no Python: `semantic-layer/metricflow/` is a TypeScript compiler for the manifest subset (simple/ratio/derived/cumulative metrics, all aggregations, one-hop entity joins, `Dimension`/`TimeDimension`/`Entity`/`Metric` filters, time ranges, multi-metric joins), Postgres only; unsupported (clear error): conversion metrics, `non_additive_dimension`, `join_to_timespine`, `offset_window`/`offset_to_grain`, multi-hop joins, `date_part`, non-daily time spines. `agent/services/semantic-layer.service.ts` is upstream's service with the FastAPI `/semantic_layer/compile` logic in process; context sync runs upstream's semantic-layer sync provider (`semantics/*.md` + `.meta/semantic_layer/semantic_manifest.json`, byte-identical docs for the example project)_
- [x] `skills`: skill CRUD; register `load_skill` — _upstream has no skill CRUD (skills are `agent/skills/*.md` edited in the context explorer): `SkillsModule` ports `services/skill.ts` (`skills`, `skillCatalog`, `skillLoadErrors`), the internal `excel-handling`/`pdf-handling` skills and `load_skill`; `/skill` mentions and preloaded skills reach the agent. User-group skill grants are Phase 6 (everyone sees every skill)_
- [x] `memory`: memory CRUD and agent memory hooks — _`MemoryModule` (`memories`, `memorySettings`, `projectMemorySettings`, `setMemoryEnabled`, `editMemory`, `deleteMemory`); memories are injected into the system prompt and extracted after each user message. Dropped with usage tracking: PostHog events and `llm_inference` rows. `AgentCoreModule` now holds `LlmService` so memory/onboarding/recommendations can use it without importing `AgentModule`_
- [x] `onboarding`: onboarding rules; register `onboarding_*` and `generate_onboarding_rules` — _`OnboardingModule` ports `onboarding-rules.ts` (the `write-context-rules` skill ships in `apps/api/assets/skills/`; no `cheerio`) and exposes `generateOnboardingRules` for admins; the tools are registered behind `getTools({ onboarding: true })` as upstream. Upstream's onboarding chat (example project, CLI warehouse provisioning, `onboarding.*` tRPC) is not ported — its tables were dropped in 1a — so no run enables those tools yet and `generate_onboarding_rules` writes RULES.md for the run's project instead of finalizing a provisioning job_
- [x] `context-recommendations`: service + `context.recommendations` job; `context.branch.cleanup` job — _`ContextRecommendationsModule`: the 789-line queries file as a Prisma repository, the run (agent profile with the recommendation tools, 40 steps), feedback coverage, 17 GraphQL operations, `@Job('context.recommendations')` with one pg-boss schedule per project from its frequency (beta flag). `context.branch.cleanup` runs daily at 05:00 UTC in `ContextExplorerModule`. Phase 7 leftovers: PR creation (`createPullRequest`, batch, `getPrStatus`, auto-PRs) and repo sub-path detection; new projects get their schedule at the next boot_
- [x] Frontend screens on Apollo — _`lib/context-explorer-api.ts`, `lib/context-recommendation-api.ts`, `lib/memory-api.ts`, `lib/skill-api.ts`; call sites only swap the `trpc.` prefix. `reviveDates` in `apollo-procedures.ts` turns ISO strings under date keys back into `Date` (upstream used superjson). No new REST paths (all GraphQL), so the Vite proxy is unchanged_

### Done when

- Edit a context file, commit it to git, and the agent uses it in the next chat
- A semantic query ("revenue by month") compiles to SQL and runs on Postgres

### Verify

- Ported tests; semantic layer compiled SQL compared with upstream's Python output for the example project's `semantics/` — _done 2026-10-29: 43 queries (15 on the example manifest, 28 on an extended one covering every supported feature) compiled by upstream's MetricFlow and by quarry, both run on the `warehouse` Postgres: identical rows for all, same errors for the 5 invalid ones. Ported specs: `test_metricflow.py`, `test_sync_provider.py`, `semantic-layer*.test.ts`, skill/load-skill/internal-skills, onboarding-rules, the context-explorer suites (git, search, write, routes, file-tree catalog, branch cleanup) and the recommendation suites (api 1840+ tests)_
- Done-when checked live 2026-10-29 (split mode, project `jaffle-phase3` on the `warehouse` DB, `QUARRY_CONTEXT_SOURCE=git` on a local bare repo): RULES.md edited through `writeContextFile`, committed on a branch, pushed, merged on the remote, `pullLiveContext` → a new chat followed the new rule; "Show revenue by month" → `execute_semantic_query` compiled and ran on Postgres and charted 4 months

---

## Phase 4 — Stories _(optional)_

**Goal:** stories (dashboards) can be created, edited, shared, embedded and refreshed on a schedule.

### Tasks

- [x] `stories`: stories, folders, themes, custom story viewer; register the `story` tool — _`StoriesCoreModule`: every upstream story query module as a Prisma repository (story, shared-story, story-file, story-folder, story-theme, story-reference, story-delivery, story-app-state, favorite, example-story, mcp-embed). **Deviation:** upstream's story services, the `story` tool and the `/stories` + `/story-library` mounts stay module-level (≈11k lines copied, not retyped into classes); they reach the repositories through `stories/story-queries.ts` bindings (named like upstream's query modules) and the agent through `storyRuntime`. The routers are upstream's, nearly verbatim, as `stories/procedures/*.procedures.ts` on a small tRPC-like builder; GraphQL is one `JSON`-in/`JSON`-out field per procedure (`storyGetLatest`, `storyFolderBulkMove`…), mapping in [docs/stories-api.md](docs/stories-api.md). Story apps build with esbuild in process instead of Bun (`@babel/parser` replaces `Bun.Transpiler`, a tag scanner replaces `HTMLRewriter`). The agent message pipeline keeps upstream's order (artifacts, story outputs, mentions, `keepStoryReferencesThroughCompaction`, reference expansion); story mounts unlock `write`/`str_replace` when `BETA_CUSTOM_STORIES_ENABLED` is on_
- [x] `story-sharing`: shared stories, embeds, `GET /api/stories/:id/thumbnail`, `GET /api/embed/*` — _`StorySharingModule`: `sharedStory*` (23), `embed*` (public), the story/custom/viewer/shared-chat downloads, `storyThemeGenerate`; REST `GET /api/stories/:storyId/thumbnail` (WebP, ETag) and `GET /api/embed/story/:storyId/download` (token). Story HTML/PDF/screenshots on the system Chrome via puppeteer-core. No `sharp`: thumbnails and theme pixels are encoded/decoded by headless Chrome, SVG logos by resvg. Embed tokens are upstream's HMAC (keyed by `BETTER_AUTH_SECRET`); embeds need MCP enabled for the project, as upstream, and tokens are only minted by MCP (Phase 7). User groups are a stand-in (Phase 6): group audiences are refused, `listShareableGroups` is empty, fork rights = project membership. Not ported: `chatFork.fork` with a story source_
- [x] Jobs: `story.refresh`, `story.deliver`, `story.blob-cleanup` — _`StoryJobsModule` binds a pg-boss story scheduler (keys `story-refresh-<id>` / `story-delivery-<id>`, UTC crons; there is no `scheduled_job_id` column). Delivery attaches the PDF and email HTML from the story renderer; notifications are a Phase 5 stand-in (in-app rows written, email/Slack logged). Retries differ: pg-boss can't rewrite a payload, so a failed channel queues a follow-up `story.deliver` with the merged `skipDeliveries` (max 5). Favorites (`favorite*`) and story feedback (`feedbackGetStoryFeedback`/`feedbackSubmitStoryFeedback`) are in their own modules_
- [x] Frontend screens on Apollo — _`lib/story-api.ts` (a typed factory over 116 codegen'd operations in `graphql/stories.graphql`) replaces `trpc.story`, `storyFolder`, `storyTheme`, `customStoryViewer`, `storyShare`, `embed`, `favorite`, story `feedback`, the downloads and `sharedChat.downloadStory`; the story `chatFork` procedures joined `chatApi`. The Vite proxy sends `/api/stories` and `/api/embed` to apps/api. Still on upstream tRPC: `analyticsEvent.storyViewCounts` and `analyticsEvent.logChatDownload` (Phase 6)_

### Done when

- The agent creates a story from a chat; it can be edited, shared, embedded, and refreshes on schedule

### Verify

- Ported tests; thumbnail and embed endpoints return files; refresh job completes — _ported specs for the queries, services, routers, jobs, sharing, HTML/screenshot rendering and thumbnails (api 172 files / 2111 tests, 1 skipped); not ported: story-list-item and mcp-*story* (Phase 7), story-view-counts (Phase 6), the cloud/billing/DuckDB cases. The thumbnail (200/304/404) and embed downloads (PDF/HTML) are covered by `test/stories-sharing.e2e-spec.ts`, the refresh job reaching `completed` by `test/stories-jobs.e2e-spec.ts`_
- Done-when checked live 2026-10-29 (split mode on `upstream_baseline`): the agent built "Orders by Status" (bar chart + table) from a chat; "Make it live" created the `story-refresh-<id>` pg-boss schedule and a queued `story.refresh` job completed and regenerated the narrative; edited and saved (version 2); shared with the project and opened through the share link; `storyDownload` returned a PDF and an HTML file; with MCP turned on for the project, a token-signed `/embed/story/<id>` page rendered logged out and `/api/embed/story/<id>/download` returned the PDF (154 KB) and HTML. Not checked live: thumbnails (custom stories are behind `BETA_CUSTOM_STORIES_ENABLED`, off by default) and delivery to recipients

---

## Phase 5 — Automations & jobs _(optional)_

> **Deferred** (decided 2026-10-29, at the cut-over): not built for now. The screens that needed it were removed from the frontend; [docs/deferred-features.md](docs/deferred-features.md) lists them with their upstream frontend and backend sources so they can be brought back.

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

> **Deferred** (decided 2026-10-29, at the cut-over): not built for now. The screens that needed it were removed from the frontend; [docs/deferred-features.md](docs/deferred-features.md) lists them with their upstream frontend and backend sources so they can be brought back.

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

> **Deferred** (decided 2026-10-29, at the cut-over): not built for now. The screens that needed it were removed from the frontend; [docs/deferred-features.md](docs/deferred-features.md) lists them with their upstream frontend and backend sources so they can be brought back.

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

- [x] Inventory the frontend calls still going to upstream and sort them — _99 files, 191 procedures (classification in the Phase 8 report and `docs/deferred-features.md`): (a) already on apps/api → switched to Apollo (memories, version/update check, transcription test, password change, own profile, project lists); (b) needed by the core flow → ported: `databaseObjects`, `displaySettings`/`updateDisplaySettings`, `userPreferences`/`updateUserPreferences`, `chatDownload`, `chatShareMembers` (`test/project-settings.e2e-spec.ts`), user-group access as a frontend stand-in until Phase 6; (c) Phases 5–7 and dropped billing/budgets/license/trials/cloud onboarding → removed_
- [x] Remove the deferred screens: routes, nav and search entries, components, hooks, tests — _removed areas and their upstream sources: [docs/deferred-features.md](docs/deferred-features.md)_
- [x] Remove the Vite proxy split; all traffic to `apps/api` — _`/graphql`, `/api`, `/health`, `/i/`, `/c/` proxied to apps/api; `scripts/dev-api-split.sh`, `dev:api:split` and `docs/proxy-split.md` removed_
- [x] Remove `@trpc/*` and any leftover upstream imports — _no tRPC client; `@trpc/*`, `superjson`, `posthog-js` removed; the `@quarry/shared/backend/*` bridges to `../fork-reference` are gone. Procedure types are `apps/frontend/src/lib/api-types.ts` (story routers inferred from apps/api's procedure objects, the rest generated once from upstream's router onto quarry's type modules); apps/api types come through `@quarry/api/*`; `lib/trpc-error.ts` → `lib/api-error.ts`; tests mock `@/test/procedures`_
- [x] Rename the remaining upstream names, including the `.quarry/` folders and the `quarry/` context branch prefix
- [x] quarry runs on its own `quarry` database through Prisma migrations — _`upstream_baseline` dropped from `docker-compose.yml`/init SQL; `db:deploy` + `db:seed` checked on a new empty database_
- [x] Dockerfile (api + built frontend) and `docker-compose.yml` for production — _`Dockerfile` (apps/api from its TS sources via `@swc-node/register`, frontend built at image build, Chromium for story downloads, migrations on start), `docker-compose.prod.yml` (app + Postgres, `quarry_data` volume); apps/api serves the built frontend when `QUARRY_FRONTEND_DIST` is set (`src/frontend-static.ts`)_
- [ ] Helm chart (optional) — _not done_
- [x] README: setup, env vars, deployment

### Done when

- quarry runs with no dependency on `fork-reference` — _the frontend, apps/api and the Docker build read nothing from `../fork-reference` (only `semantic-layer-sync.spec.ts` compares with its example project when present, skipped otherwise)_

### Verify

- `docker compose up` from a clean checkout; full test suite and lint green; smoke test: sign up → project → sync → chat → (story, if Phase 4 was built) — _checked 2026-10-29: `docker build` succeeded and the image, started on an empty database, applied the migrations and served `/health`, the SPA, its assets and `/graphql`. In the browser against apps/api alone (dev servers on :5016/:3010, nothing proxied to :5005): seed login, new project, jaffle_shop warehouse connected and synced (9 tables, `@` mentions list them), chat "total order amount by month for 2018 as a bar chart" answered with a chart, `chatDownload` returned the HTML export, a story created from the chat opened in the side panel, `RULES.md` edited in the File Explorer and committed (generic git source on a local bare repo). `npm test`: apps/api 2120 passed + 1 skipped, frontend 636, shared 757; `npm run lint`, `npm run format:check` and the frontend build pass. Upstream's backend was still running on :5005 during the check (stopping it is the user's call), but nothing points at it. Not checked: a `docker compose -f docker-compose.prod.yml up` run end to end (the image was run on its own against the dev Postgres)_

## After cut-over

- [x] Query workbench on `/settings/project/query-tools`: write and run SQL first, with an embedded agent (`query_workbench` mode, `propose_sql`), then save as a tool; replaces the query builder — _spec: `docs/superpowers/specs/2026-11-01-query-workbench-design.md`. Create skill from a result comes with the skill builder._
- [x] Skill builder: Settings → Skills, `createSkill`/`updateSkill`/`deleteSkill`, the `propose_skill` chat card, the `skill-creator` built-in skill and **Create skill** in the query workbench — _spec: `docs/superpowers/specs/2026-11-01-skill-builder-design.md`._
