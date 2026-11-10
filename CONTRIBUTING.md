# Contributing to quarry

Thanks for your interest. Bug reports, fixes, features and documentation are all welcome.

## Before you start

- Read [PLAN.md](PLAN.md) (what is built and how it fits together) and [PHASES.md](PHASES.md) (the order of the work
  and its checklists).
- For anything larger than a small fix, open an issue first so we can agree on the approach.
- Security problems go through [SECURITY.md](SECURITY.md), never a public issue.

## Setup

Follow [Local development](README.md#local-development) in the README. The example warehouse that the tests query can
be loaded without the DuckDB CLI:

```bash
docker exec -i quarry_postgres psql -U quarry -d warehouse < docker/postgres/warehouse-example.sql
```

## Rules the code follows

The conventions are written down in [CLAUDE.md](CLAUDE.md) (used by people and AI agents alike). The ones reviewers
check most:

- **Resolvers stay thin; logic lives in services; Prisma only in repositories.**
- **Access through decorators** on the global `AuthGuard` (`@ProjectAccess()`, `@OrgAdmin()` …), never ad-hoc checks.
- **The agent only reads the warehouse.** Its SQL goes through the SQL engine, which enforces the synced context
  (allowed tables, excluded columns, row security predicates).
- **Tests come with every change**, including the upstream tests of any code ported from nao.
- **Never commit real data or secrets**: no customer data in fixtures, screenshots or issues, and no API keys.

## Checks

Before you open a pull request:

```bash
npm run lint
npm test
npm run format:check
```

For frontend changes, also run `npm run test:e2e -w @quarry/frontend` with the local stack up. After you change the
GraphQL schema, run `npm run codegen`. Add a Prisma migration with `prisma migrate dev`; never edit an existing one.

CI runs the same checks on every pull request, against Postgres with the example warehouse, and builds the Docker
image.

## Pull requests

- Keep each pull request to one change, with tests.
- Write the commit message as what the change does ("Show the row count under each chart").
- By contributing, you agree that your contribution is licensed under the [Apache License 2.0](LICENSE).

Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
