# quarry

An analytics agent: connect a Postgres warehouse, sync its context, chat with an agent that writes SQL and draws
charts, turn answers into stories, and curate the context it reads. A rewrite of [getnao/nao](https://github.com/getnao/nao)
on NestJS 11 (Express) + GraphQL (Apollo, code-first) + Prisma/PostgreSQL, with nao's React frontend on Apollo Client.

- `apps/api` — the API (GraphQL at `/graphql`, REST for auth, agent streaming, uploads, story downloads) and, in
  production, the built frontend.
- `apps/frontend` — React (TanStack Router, Shadcn, Tailwind), Apollo Client + GraphQL Code Generator.
- `apps/shared` — types and helpers used by both.

What is built and what was left out: [PLAN.md](PLAN.md), [PHASES.md](PHASES.md) and
[docs/deferred-features.md](docs/deferred-features.md) (automations, platform and integration screens that can be
brought back from upstream).

## Development

Needs Node from `.nvmrc`, Docker, and DuckDB (`brew install duckdb`, only to load the example warehouse).

```bash
nvm use
npm install
cp .env.example .env               # set BETTER_AUTH_SECRET (openssl rand -base64 32) and an LLM key
npm run db:up                      # Postgres on localhost:5434: databases quarry and warehouse
npm run warehouse:load             # jaffle_shop example data -> warehouse
npm run db:deploy -w @quarry/api   # apply Prisma migrations to quarry
npm run db:seed -w @quarry/api     # optional: test@test.test / test1234 with an organization and a project
npm run dev:api                    # apps/api on :5006
npm run dev:frontend               # frontend on :3000, proxies the API to :5006
```

Open http://localhost:3000, sign up (the first user becomes the admin) or log in with the seed user, create a project
from the project switcher, then add the warehouse in **Settings → Warehouse** (`localhost:5434`, database `warehouse`,
user/password `quarry`) and press **Sync**.

Checks: `npm run lint`, `npm test`, `npm run format:check`, `npm run build -w @quarry/frontend`. After changing the
GraphQL schema, `npm run codegen` regenerates the frontend's typed documents (the API writes `apps/api/schema.gql`
when it boots).

## Configuration

`.env.example` lists the variables; the full, validated list is `apps/api/src/config/env.ts`. The ones that matter:

| Variable                                                                   | Purpose                                                                       |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `DATABASE_URL`                                                             | quarry's Postgres database (Prisma)                                           |
| `BETTER_AUTH_SECRET`                                                       | signs sessions; keep it stable                                                |
| `BETTER_AUTH_URL`                                                          | the public URL users open (auth checks the origin)                            |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, …                                   | LLM providers from the environment; more can be added in **Settings → Agent** |
| `QUARRY_PROJECTS_DIR`, `QUARRY_STORAGE_LOCAL_PATH`                         | project context folders and stored files                                      |
| `QUARRY_STORAGE_BACKEND` (`local`, `s3`, `none`) and `QUARRY_STORAGE_S3_*` | where attachments and saved files go                                          |
| `QUARRY_CONTEXT_SOURCE=git`, `QUARRY_CONTEXT_GIT_*`                        | keep context files in a Git repository                                        |
| `QUARRY_FRONTEND_DIST`                                                     | built frontend the API serves (set by the Docker image)                       |
| `VITE_QUARRY_*`                                                            | frontend links (docs, support, repository…), build time; unset hides them     |

## Deployment

The `Dockerfile` builds one image: `apps/api` serving the built frontend on port 5006, with Chromium for story
downloads. `docker-compose.prod.yml` runs it with its own Postgres:

```bash
cp .env.example .env    # BETTER_AUTH_SECRET, BETTER_AUTH_URL=https://your-host, an LLM key
docker compose -f docker-compose.prod.yml up -d --build
```

The container applies pending migrations on start. Data lives in two volumes: `quarry_postgres_data` (database) and
`quarry_data` (`/data/projects`, `/data/storage`). Put a TLS-terminating proxy in front and point `BETTER_AUTH_URL`
at its public URL.
