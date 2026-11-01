<p align="center">
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset="brand/png/quarry-logo-dark-1200.png" />
        <img alt="quarry" src="brand/png/quarry-logo-light-1200.png" width="360" />
    </picture>
</p>

<p align="center">
    An analytics agent for your Postgres warehouse: ask in plain language, get SQL, charts and stories.
</p>

---

quarry connects to a Postgres warehouse, syncs its schema into a context the agent reads, and lets you chat with an
agent that writes SQL and draws charts. Answers can be turned into stories, and the context the agent works from can be
browsed, edited and improved from the app.

It runs on NestJS 11 (Express) + GraphQL (Apollo, code-first) + Prisma/PostgreSQL, with a React frontend on Apollo
Client. The SQL engine and semantic layer are written in Node, with no Python.

## Features

- **Chat agent** — writes and runs SQL, reads results, draws charts and maps, asks clarifying questions, suggests
  follow-ups, searches the web, and can run Python or sandboxed code (experimental). Chats can be forked, starred and
  shared.
- **Any LLM provider** — OpenAI, Anthropic and the other Vercel AI SDK providers, from the environment or
  **Settings → Agent**.
- **Context** — **Sync** pulls the warehouse schema into project context files. The context explorer edits them (optionally
  in a Git repository), and context recommendations propose fixes from chat feedback.
- **Semantic layer** — MetricFlow-style metrics compiled to Postgres SQL in process.
- **Query workbench and saved query tools** — write SQL in an editor, or ask the assistant for a query it tests first,
  run it on the warehouse, then save it as a tool the agent can call by name (or save one from a chat)
- **Skills and memory** — Markdown skills the agent loads on demand; memories extracted from chats and added to the
  system prompt.
- **Stories** — turn answers into stories with folders, themes, sharing, embeds, scheduled refresh and delivery, and
  HTML/PDF downloads.
- **Attachments and voice** — upload files (PDF and XLSX text extraction), local or S3 storage, and speech-to-text
  input.

Not included: billing, enterprise-licensed upstream code, and (for now) automations, platform administration and
integrations. See [docs/deferred-features.md](docs/deferred-features.md) for what was left out and how to bring it back.

## Repository layout

| Path                             | What                                                                                                                              |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [`apps/api`](apps/api)           | NestJS API: GraphQL at `/graphql`, REST for auth, agent streaming, uploads and downloads; serves the built frontend in production |
| [`apps/frontend`](apps/frontend) | React (TanStack Router, Mantine, CSS Modules), Apollo Client + GraphQL Code Generator                                             |
| [`apps/shared`](apps/shared)     | types and helpers used by both                                                                                                    |
| [`brand`](brand)                 | logo, icons and colours                                                                                                           |
| [`docs`](docs)                   | design notes and deferred features                                                                                                |

## Getting started

Needs Node from `.nvmrc` (22.23), npm 11.10.1, Docker, and DuckDB (`brew install duckdb`, only to load the example
warehouse).

```bash
git clone https://github.com/advancedlocal/explore-joe-ai-tools.git
cd explore-joe-ai-tools
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

### Checks

```bash
npm run lint
npm test
npm run format:check
npm run build -w @quarry/frontend
```

After changing the GraphQL schema, `npm run codegen` regenerates the frontend's typed documents (the API writes
`apps/api/schema.gql` when it boots).

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

## Documentation

- [PLAN.md](PLAN.md) — architecture, decisions, and how each Nest module maps to upstream code
- [PHASES.md](PHASES.md) — build order and what each phase delivered
- [docs/deferred-features.md](docs/deferred-features.md) — areas not ported yet, and how to port them
- [docs/stories-api.md](docs/stories-api.md) — the stories GraphQL API
- [CLAUDE.md](CLAUDE.md) — module conventions and coding rules

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE), which credits the project quarry is derived from.
