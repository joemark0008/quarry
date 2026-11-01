# quarry — rewrite plan

quarry is a rewrite of an Apache-2.0 analytics-agent platform (see [NOTICE](NOTICE)) on a NestJS + GraphQL + Prisma backend, keeping the React frontend. Maintainers may keep a clone of the upstream source in `../fork-reference` as a **read-only reference**.

## 1. Decisions

| Area       | Choice                                                                                                                                                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend    | NestJS 11 on Express (`apps/api`)                                                                                                                                                                                                            |
| API        | GraphQL code-first (`@nestjs/graphql` + Apollo Server), single server, no federation                                                                                                                                                         |
| REST       | Only where GraphQL doesn't fit: chat streaming, auth/OAuth callbacks, webhooks, file upload/download, MCP server (see §5)                                                                                                                    |
| ORM / DB   | Prisma, PostgreSQL only (SQLite support dropped)                                                                                                                                                                                             |
| Auth       | better-auth (mounted at `/api/auth/*`), Nest guards that read the session via `GqlExecutionContext`                                                                                                                                          |
| N+1        | DataLoader, request-scoped, one loader file per module                                                                                                                                                                                       |
| Jobs       | pg-boss on the same Postgres (replaces upstream's custom `scheduled_job` poller)                                                                                                                                                             |
| AI         | Vercel AI SDK (`ai` v6), same providers as upstream                                                                                                                                                                                          |
| Frontend   | React app kept (TanStack Router, Mantine, CSS Modules; see docs/frontend-design.md); tRPC replaced by Apollo Client + GraphQL Code Generator (typed documents and hooks), matching `sda-graphql-crm`                                         |
| Billing    | Dropped: self-hosted only, no Stripe, credits or cloud trials                                                                                                                                                                                |
| SSO        | Own OIDC login on better-auth's generic OAuth plugin, written from scratch (upstream SSO is enterprise-licensed)                                                                                                                             |
| SQL engine | Upstream Python service (`apps/backend/fastapi` + `upstream_core`) is **ported to Node** inside `apps/api` (`sql-engine` module). No Python in quarry. First warehouse: **PostgreSQL** (`pg` driver); more added later, one Node driver each |
| Licensing  | Nothing marked `/* @license Enterprise */` is ported (62 files: SSO/OIDC/Microsoft auth, license checks, backoffice, branding, member budgets, excluded columns)                                                                             |

## 2. Repository layout

```
quarry/
├── apps/
│   ├── api/                      NestJS
│   │   ├── prisma/schema.prisma
│   │   └── src/
│   │       ├── main.ts, app.module.ts
│   │       ├── common/           guards, decorators (@Public, @CurrentUser, @ProjectAccess, @OrgAdmin, @Admin), dataloader base, errors
│   │       ├── config/           typed env (zod), ConfigModule
│   │       ├── prisma/           PrismaService
│   │       ├── auth/             better-auth instance + REST mount
│   │       ├── jobs/             pg-boss module, @Job() handler registry
│   │       └── <feature>/        <feature>.module.ts, .resolver.ts, .service.ts, .repository.ts, .loader.ts, dto/, models/
│   ├── frontend/                 React (copied from upstream, then migrated)
│   └── shared/                   types/utils shared by api + frontend (replaces `@upstream/backend/*` type exports)
├── package.json                  npm workspaces
├── PHASES.md
└── PLAN.md
```

Module conventions: kebab-case files, resolvers stay thin, business logic in services, Prisma access only in repositories. Each upstream `*.queries.ts` file becomes a repository; each `*.service.ts` is ported mostly as-is and made injectable.

## 3. Access levels → guards

Upstream tRPC procedure levels map to Nest decorators (counts are upstream procedure counts):

| Upstream procedure                            | Count | quarry decorator                                                          |
| --------------------------------------------- | ----- | ------------------------------------------------------------------------- |
| `publicProcedure`                             | 27    | `@Public()`                                                               |
| `protectedProcedure`                          | 75    | default (global `AuthGuard`)                                              |
| `projectProtectedProcedure`                   | 93    | `@ProjectAccess()` — resolves project from args/header, checks membership |
| `organizationProtectedProcedure`              | 5     | `@OrgMember()`                                                            |
| `orgAdminProcedure` / `orgAdminOnlyProcedure` | 19    | `@OrgAdmin()` / `@OrgAdmin({ strict: true })`                             |
| `adminProtectedProcedure`                     | 111   | `@ProjectAdmin()`                                                         |

Guards work for both GraphQL (`GqlExecutionContext`) and REST (`HttpArgumentsHost`) through one `getRequest(context)` helper.

## 4. Prisma schema strategy

Upstream has 87 Postgres tables built by 92 Drizzle migrations (`apps/backend/migrations-postgres/0000…0091`).

1. Start an empty Postgres (Docker).
2. Run upstream migrations against it: in `fork-reference/apps/backend`, `DB_URI=… npm run db:migrate` (or apply the SQL files in order with `psql`).
3. In `quarry/apps/api`: `prisma db pull` → raw `schema.prisma`.
4. Clean up: PascalCase models with `@@map("snake_table")`, camelCase fields with `@map`, relation names, enums.
5. Delete enterprise-only and unneeded tables (backoffice, member budgets, branding, SSO group mapping, license) and the old `scheduled_job` table (pg-boss owns its own schema).
6. `prisma migrate diff --from-empty --to-schema-datamodel` → commit as migration `0000_init`. From here on, only Prisma migrations.
7. Seed script ported from `scripts/db.seed.ts`.

Hand-written SQL in upstream queries (usage, analytics, logs) moves to Prisma TypedSQL (`prisma/sql/*.sql`) or `$queryRaw`.

## 5. REST endpoints (everything else is GraphQL)

| Path                                                               | Upstream source                        | Phase |
| ------------------------------------------------------------------ | -------------------------------------- | ----- |
| `POST /api/agent` (AI SDK UI stream, SSE)                          | `routes/agent.ts`                      | 2     |
| `ALL /api/auth/*` (better-auth)                                    | `routes/auth.ts`                       | 1     |
| `GET /api/auth/error` redirect                                     | `routes/auth-error-redirect.ts`        | 1     |
| `POST /api/attachments` (multipart, 100 MB)                        | `routes/attachment.ts`                 | 2     |
| `POST /api/transcribe` (audio upload)                              | `trpc/transcribe.routes.ts`            | 2     |
| `GET /c/:id` chart image, `GET /i/:id` image                       | `routes/chart.ts`, `routes/image.ts`   | 2     |
| `GET /api/map-boundaries/*`                                        | `routes/map-boundaries.ts`             | 2     |
| `GET /api/stories/:id/thumbnail`                                   | `routes/story-thumbnail.ts`            | 4     |
| `GET /api/embed/*` story download                                  | `routes/embed-story-download.ts`       | 4     |
| `GET /api/notifications/unsubscribe`                               | `routes/notification-unsubscribe.ts`   | 5     |
| `POST /api/automations/:automationId/run`                          | `routes/automation-webhook.ts`         | 5     |
| `POST /api/analytics/view-duration`                                | `routes/analytics.ts`                  | 6     |
| `/api/webhooks/{slack,teams,telegram,mattermost,discord,whatsapp}` | `routes/*.ts`                          | 7     |
| `/api/github/*`, `/api/gitlab/*` OAuth + webhooks                  | `routes/github.ts`, `routes/gitlab.ts` | 7     |
| `/mcp` (MCP Streamable HTTP), `/api/mcp-oauth/*`                   | `mcp/routes.ts`, `routes/mcp-oauth.ts` | 7     |
| `GET /health`                                                      | —                                      | 1     |

Not ported: `routes/backoffice.ts`, `routes/sso.ts`, `routes/branding.ts` (enterprise), `routes/test.ts`, `routes/deploy.ts` (revisit in phase 8).

Express setup: raw body only on webhook routes (signature checks), `multer` for uploads, SSE via `res.write` from `pipeUIMessageStreamToResponse`.

## 6. Nest modules ↔ upstream code

Upstream paths are relative to `fork-reference/apps/backend/src`. "trpc" = `trpc/<name>.routes.ts`.

### Phase 1 — skeleton + auth

| Module   | Replaces                                                                                                                               |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `config` | `env.ts`                                                                                                                               |
| `prisma` | `db/*`                                                                                                                                 |
| `auth`   | `auth.ts`, `middleware/auth.ts`, `routes/auth.ts`, trpc `auth-config` (CLI login dropped with the CLI)                                 |
| `users`  | trpc `user`, `account`; `queries/user*`, `account.queries.ts`, `services/account-status.service.ts`, `auth-user-onboarding.service.ts` |
| `system` | trpc `system`; `services/version-check.service.ts`, `ping.ts`                                                                          |
| `jobs`   | `services/scheduler.service.ts` (re-implemented on pg-boss)                                                                            |

### Phase 2 — core

| Module        | Replaces                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projects`    | trpc `project`; `queries/project*.ts` (llm-config, saved-prompt, warehouse-credentials), `services/project*.ts`, `warehouse-*.ts`, `default-models.service.ts`, `example-project.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `warehouse`   | `services/warehouse-sql.service.ts`, `query-result.service.ts`, `query-rows.service.ts`, trpc `sql`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `sql-engine`  | Port of `fastapi/main.py` (`/execute_sql`, `/validate_sql`, `/validate_row_predicate`, `/warehouse/validate`, `/warehouse/prepare`) and `upstream_core/config/databases/*` (connectors, allow-list, column access, row security guards). One `WarehouseDriver` interface, one adapter per supported warehouse; SQL checks on a JS SQL parser (e.g. `node-sql-parser`), validated against the upstream Python test cases                                                                                                                                                                                                 |
| `chats`       | trpc `chat`, `chat-fork`, `citation`, `favorite`, `feedback`, `shared-chat`; `queries/chat.queries.ts`, `citation`, `favorite`, `feedback`, `shared-chat`                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `agent`       | `routes/agent.ts`, `services/agent.ts`, `agent-run.ts`, `chat-artifacts.ts`, `compaction.ts`, `token-counter.ts`; whole `agents/` folder (providers, system prompts, compaction, subagents, stop conditions, telemetry, user rules)                                                                                                                                                                                                                                                                                                                                                                                     |
| `agent/tools` | `agents/tools/*` — 32 files: `story`, `clarification`, `display-chart`, `display-map`, `execute-python`, `execute-sandboxed-code`, `execute-sql`, `execute-semantic-query`, `read-query-result`, `grep`, `list`, `read`, `write`, `str-replace`, `search`, `task`, `load-skill`, `web-search`, `mcp-call`, `mcp-connect`, `query-app-db`, `propose-context-fix`, `record-recommendation`, `suggest-follow-ups`, `request-warehouse-credentials`, `request-warehouse-selection`, `onboarding-agent-prompt`, `onboarding-command`, `onboarding-progress`, `generate-onboarding-rules`, `windows-descriptor-path`, `index` |
| `charts`      | trpc `chart`, `chart-plugin`, `map`; `routes/chart.ts`, `image.ts`, `map-boundaries.ts`; `queries/chart-image*`, `display-map`, `image`; `services/chart-plugin.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `attachments` | `routes/attachment.ts`, `services/storage/*`, trpc `storage`, `services/file-text.ts`, `pdf.ts`, `workbook.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `transcribe`  | trpc `transcribe`, `services/transcribe.service.ts`, `agents/transcribe.providers.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `sandbox`     | `services/sandbox-runtime.ts`, `sandbox-secret.service.ts`, trpc `sandbox-secret`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

Tools are framework-agnostic AI SDK `tool()` definitions; port them nearly unchanged and inject services through a `ToolContext` built per request.

### Phase 3 — context (optional)

| Module                    | Replaces                                                                                                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `context-explorer`        | trpc `context-explorer`; `services/context-explorer*.ts`, `context-access.ts`, `git-repo.ts`, `generic-git.ts`, `file-tree-catalog.service.ts`, `agent-visible-project-file.service.ts` |
| `context-recommendations` | trpc `context-recommendation`; `services/context-recommendation*.ts`, `handlers/context-recommendations.handler.ts`                                                                     |
| `semantic-layer`          | `services/semantic-layer.service.ts` + port of `upstream_core/semantic_layer` and `/semantic_layer/compile`                                                                             |
| `skills`                  | trpc `skill`, `services/skill.ts`, `agents/skills/*`                                                                                                                                    |
| `memory`                  | trpc `memory`, `agents/memory/*`, `services/memory.ts`, `queries/memory.ts`                                                                                                             |
| `onboarding`              | trpc `onboarding`, `services/onboarding-rules.ts`                                                                                                                                       |

### Phase 4 — stories (optional)

| Module          | Replaces                                                                                                                                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stories`       | trpc `story`, `story-folder`, `story-theme`, `custom-story-viewer`; `services/story-*.ts`, `custom-story*.ts`, `live-story.ts`, `standalone-story.ts`, `story-theme/*`; `queries/story*.ts`, `example-story.queries.ts` |
| `story-sharing` | trpc `shared-story` (`storyShare`), `embed`; `services/shared-story.service.ts`, `routes/embed-story-download.ts`, `story-thumbnail.ts`                                                                                 |

### Phase 5 — automations & jobs (optional)

| Module          | Replaces                                                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `automations`   | trpc `automation`; `services/automation-*.ts`, `cron-nlp.ts`, `routes/automation-webhook.ts`, `queries/automation.queries.ts` |
| `notifications` | trpc `notification`; `services/notification*.ts`, `email.ts`, `routes/notification-unsubscribe.ts`                            |

### Phase 6 — platform (optional)

| Module          | Replaces                                                                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `organizations` | trpc `organization`; `services/membership.service.ts`, `team-member.ts`, `project-sharing.service.ts`                                                                           |
| `user-groups`   | trpc `user-group`, `user-group-feature-access`; `services/user-group-*.ts`, `project-user-group-membership.service.ts`, `shareable-user-groups.service.ts` (non-SSO parts only) |
| `api-keys`      | trpc `api-key`, `services/api-key.service.ts`                                                                                                                                   |
| `usage`         | trpc `usage`, `budget`, `log`, `analytics-event`, `posthog`, `support`; `routes/analytics.ts`; `services/posthog.ts`, `activity.ts`, `usage-period-settings.service.ts`         |
| `sso`           | Own OIDC provider config + login on better-auth generic OAuth (no upstream code reused)                                                                                         |

### Phase 7 — integrations (optional)

| Module          | Replaces                                                                                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `messaging`     | `routes/{slack,teams,discord,telegram,mattermost,whatsapp}.ts`, matching `services/*`, `queries/project-*-config.queries.ts`, `slack-socket-bridge.ts`, `slack-env-seed.ts`         |
| `git-providers` | trpc `github`, `gitlab`; `routes/github.ts`, `gitlab.ts`; `services/github*.ts`, `gitlab.ts`, `context-pr.service.ts`, `managed-github-repository.ts`, `review-request-provider.ts` |
| `mcp-client`    | trpc `mcp`, `mcp-endpoint`; `services/mcp.ts`, `mcp-openapi.ts`                                                                                                                     |
| `mcp-server`    | `mcp/*` (server, tools, embed, auth), `routes/mcp-oauth.ts`, trpc `mcp-oauth-clients`, `services/mcp-oauth.ts`                                                                      |

### Not ported (enterprise)

trpc `branding`, `license`, `member-budget`; `routes/backoffice.ts`, `sso.ts`, `branding.ts`; `services/backoffice*`, `branding.service.ts`, `license*`, `member-budget*`, `sso-*`, `oidc-auth.service.ts`, `microsoft-*`, `excluded-columns.service.ts`; `queries/backoffice-*`, `branding`, `member-budget`; `mcp/tools/member-budget.ts`; the matching frontend settings pages.

## 7. Background jobs (pg-boss)

| Job                       | Upstream handler                                                                | Phase |
| ------------------------- | ------------------------------------------------------------------------------- | ----- |
| `automation.run`          | `automation.handler.ts`                                                         | 5     |
| `story.refresh`           | `story-refresh.handler.ts`                                                      | 4     |
| `story.deliver`           | `story-delivery.handler.ts`                                                     | 4     |
| `story.blob-cleanup`      | `story-blob-cleanup.handler.ts`                                                 | 4     |
| `context.recommendations` | `context-recommendations.handler.ts`                                            | 3     |
| `context.sync`            | port of `upstream_core/commands/sync` (schemas, table previews → context files) | 2     |
| `invitation.cleanup`      | `invitation-cleanup.handler.ts`                                                 | 6     |
| `log.cleanup`             | `log-cleanup.handler.ts`                                                        | 6     |
| `mcp.queryData.cleanup`   | `mcp-query-data-cleanup.handler.ts`                                             | 7     |

Upstream semantics to keep: per-project resolution (`resolveProjectId`), retry backoff 30s→10m, lease/reclaim (pg-boss `expireInSeconds` + retries), cron schedules from `cron-parser` → `boss.schedule()`. `jobs` module exposes `@Job(name)` handlers discovered at boot.

## 8. Frontend migration

1. Copy `fork-reference/apps/frontend` into `quarry/apps/frontend` (drop enterprise-licensed components: 8 under `components/settings`, 4 under `components`, plus 1 each in `routes`, `lib`, `hooks`).
2. Move the type exports the frontend imports from `@upstream/backend/*` into `apps/shared` (usage counts: `chat` 56, `trpc` 21, `usage` 19, `llm` 8, `provider-meta` 7, `saved-prompts` 4, `memory` 2, others 1 each).
3. Add Apollo Client (`ApolloProvider`, `InMemoryCache` with type policies) and GraphQL Code Generator (`@graphql-codegen/client-preset`) reading the schema emitted by Nest (`autoSchemaFile: apps/api/schema.gql`). Documents live next to their feature: `src/graphql/<feature>.graphql`. Script: `npm run codegen`.
4. Replace calls per feature area: `useQuery(trpc.x.y…)` → Apollo `useQuery(XyDocument)` / `useMutation`; `queryClient.invalidateQueries(trpc.x.pathFilter())` → `refetchQueries` or cache updates. TanStack Query stays only where non-GraphQL fetches need it. Heaviest areas: `project` (219 call sites), `story` (139), `contextExplorer` (54), `storyShare` (45), `userGroup` (38), `chat` (35).
5. Chat keeps `useChat` from `@ai-sdk/react` against `POST /api/agent` (unchanged transport).
6. Remove `@trpc/*` once the last call site is gone (phase 8).

During phases 1–7 the frontend's Vite proxy sends `/graphql` and migrated REST paths to `apps/api`, everything else to the upstream backend, so each area switches independently.

## 9. Phases

Detailed checklists per phase: [PHASES.md](PHASES.md).

Phases 3–7 are **optional and independently skippable**; decide after phase 2.

### Phase 0 — setup

- npm workspaces in `quarry/`, Node version from upstream `.nvmrc`, Docker Postgres, ESLint/Prettier config, `CLAUDE.md` with these conventions.
- Run upstream (`fork-reference`) locally against the same Postgres as a baseline.
- **Done:** upstream app runs locally; `quarry` installs and lints clean.
- **Verify:** log in and send a chat on upstream; `npm run lint` in `quarry`.

### Phase 1 — API skeleton + auth

- Nest app, ConfigModule, PrismaModule (schema per §4), GraphQL module, better-auth mount, guards/decorators (§3), pg-boss module, `users` + `system` modules, codegen wired in frontend, Vite proxy split.
- **Done:** log in / current user / public config served by `apps/api`; frontend login flow uses generated hooks.
- **Install wizard (replaces public sign-up):** `/setup` creates the first admin on an empty database, gated by a setup token derived from `BETTER_AUTH_SECRET` and printed by the API at startup. Public sign-up is gone (no `/signup` route; only the wizard and admins create accounts) and the `DEFAULT_USER_ROLE` setting is removed. Browser test: `npm run test:e2e:setup`.
- **Verify:** e2e test (Supertest) for first-admin setup → log in → session → `me` query, and for refused sign-up; guard unit tests for each access level; `prisma migrate reset` from scratch works.

### Phase 2 — core

- `projects`, `warehouse`, `sql-engine` (Node port, PostgreSQL driver), context sync (in-app action + `context.sync` job), `chats`, `agent` (SSE), 32 tools, `charts`, `attachments`, `transcribe`, `sandbox`.
- **Done:** create a project, connect a warehouse, chat with the agent (SQL + chart + follow-ups) end to end on `apps/api`.
- **Verify:** port upstream vitest suites for tools and agent (`apps/backend/tests`, `tests/tool-outputs`); e2e: stream a chat and assert tool calls + final message persisted; manual run against the `example/` project.

### Phase 3 — context _(optional)_

- **Done:** context explorer browse/edit, git sync, semantic layer, skills, memory, recommendations job.
- **Verify:** ported tests; recommendations job runs on schedule in pg-boss.

### Phase 4 — stories _(optional)_

- **Done:** create/edit/share/embed a story; scheduled refresh and delivery run.
- **Verify:** ported tests; thumbnail and embed download endpoints return files; `story.refresh` job completes.

### Phase 5 — automations & jobs _(optional)_

- **Done:** create an automation, trigger by cron and by webhook, notifications sent, unsubscribe works.
- **Verify:** e2e webhook trigger; job retry/backoff test with a failing handler.

### Phase 6 — platform _(optional)_

- **Done:** orgs, invitations, user groups, API keys, usage/logs, OIDC SSO login.
- **Verify:** guard tests per role; invitation and log cleanup jobs; SSO login against a test OIDC provider (e.g. Keycloak in Docker).

### Phase 7 — integrations _(optional)_

- **Done:** chosen messaging bots, GitHub/GitLab context PRs, MCP client and MCP server work.
- **Verify:** webhook signature tests per provider; MCP server checked with the MCP Inspector.

### Phase 8 — cut-over

- Remove the Vite proxy split and `@trpc/*`; Dockerfile and Helm chart for `apps/api` + frontend; README.
- **Done:** quarry runs with no dependency on `fork-reference`.
- **Verify:** `docker compose up` from a clean checkout; full test suite and lint green; smoke test login → project → chat → story.

## 10. Open questions

Resolved: billing dropped, own OIDC SSO, Apollo Client.
Resolved: Python service and CLI dropped; SQL engine and semantic layer ported to Node.
Resolved: first warehouse is PostgreSQL only; others added later as extra drivers.
Resolved: context sync (replaces `context sync`) is an in-app "Sync" action run as a pg-boss job.

No open questions.
