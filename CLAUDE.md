# quarry

Rewrite of getnao/nao on NestJS 11 (Express) + GraphQL code-first (Apollo) + Prisma/PostgreSQL, keeping the React frontend. Read [PLAN.md](PLAN.md) for what is built and [PHASES.md](PHASES.md) for the order and checklists.

`../fork-reference` is the upstream source: **read-only reference**. Never edit tracked files there (local `.env` files are fine).

## Stack rules

- NestJS 11 on Express, GraphQL code-first (`@nestjs/graphql` + Apollo), one server, no federation. REST only for the endpoints listed in PLAN.md §5.
- Prisma on PostgreSQL only. No SQLite, no Python, no billing, nothing marked `/* @license Enterprise */` upstream.
- Frontend: React (TanStack Router, Shadcn, Tailwind) with Apollo Client + GraphQL Code Generator.
- Node from `.nvmrc` (`nvm use`), npm pinned by `packageManager` (`engine-strict`).

## Module conventions

- **kebab-case file names**: `chat-message.service.ts`, `project-access.guard.ts`.
- One folder per feature under `apps/api/src/<feature>/`: `<feature>.module.ts`, `.resolver.ts`, `.service.ts`, `.repository.ts`, `.loader.ts`, `dto/`, `models/`.
- **Resolvers (and REST controllers) stay thin**: parse args, check access via decorators, call a service, return. No business logic, no Prisma.
- **Business logic lives in services.**
- **Prisma is only used in repositories.** Services call repositories, never `PrismaService` directly. Raw SQL goes to Prisma TypedSQL (`prisma/sql/*.sql`) or `$queryRaw` inside a repository.
- Access control through decorators on a global `AuthGuard`: `@Public()`, `@CurrentUser()`, `@ProjectAccess()`, `@OrgMember()`, `@OrgAdmin()`, `@ProjectAdmin()` (PLAN.md §3).
- N+1: request-scoped DataLoaders, one `<feature>.loader.ts` per module.
- Background work: pg-boss jobs registered with `@Job(name)`.

## Porting

- **Port, don't retype.** Copy the upstream file, then adapt it: make it `@Injectable()`, swap Drizzle calls for the module's repository, swap tRPC inputs for GraphQL `@InputType`s. Keep the logic.
- Upstream `*.queries.ts` → repository; upstream `*.service.ts` → injectable service, mostly as-is.
- **Tests are ported with every port**: each upstream test in `fork-reference/apps/backend/tests` (or `cli/tests` for the SQL engine) that covers a ported file is ported in the same change.
- An area isn't done until its frontend screens use Apollo against `apps/api`.

## Style

- Prettier (tabs, width 4, single quotes, print width 120) and ESLint with `simple-import-sort`, both from upstream config.
- Husky pre-commit runs lint-staged (ESLint + Prettier on staged files).

## Verify

Before calling any change done, run and pass:

```bash
npm run lint
npm test
```

Plus `npm run format:check`, and the phase's "Verify" items in PHASES.md.

## Local setup

```bash
nvm use
npm install
cp .env.example .env            # fill in BETTER_AUTH_SECRET and an LLM key
docker compose up -d --wait     # Postgres on localhost:5434: quarry, warehouse, nao_baseline
npm run warehouse:load          # jaffle_shop → warehouse (needs `brew install duckdb`)
```
