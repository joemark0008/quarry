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
- **Context** — **Sync** pulls the warehouse schema into project context files. The context explorer edits them in the
  project folder, and context recommendations propose fixes from chat feedback.
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

Open http://localhost:3000. On an empty database it opens `/setup`: enter the setup token, which the API prints at
startup (in the `npm run dev:api` terminal, or `docker compose -f docker-compose.prod.yml logs`), and create the first
admin. Or log in with the seed user. Then create a project
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
| `BETTER_AUTH_SECRET`                                                       | signs sessions and derives the setup token; keep it stable (required in prod) |
| `BETTER_AUTH_URL`                                                          | the public URL users open (auth checks the origin)                            |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, …                                   | LLM providers from the environment; more can be added in **Settings → Agent** |
| `ENABLE_USER_LOGIN`                                                        | `false` turns off email and password login (see the note below the table)     |
| `QUARRY_PROJECTS_DIR`, `QUARRY_STORAGE_LOCAL_PATH`                         | project context folders and stored files                                      |
| `QUARRY_STORAGE_BACKEND` (`local`, `s3`, `none`) and `QUARRY_STORAGE_S3_*` | where attachments and saved files go                                          |
| `QUARRY_SKILL_AUTHORING` (`auto`, `off`)                                   | `off` keeps skills file-only: no saving from the app or chat                  |
| `QUARRY_FRONTEND_DIST`                                                     | built frontend the API serves (set by the Docker image)                       |
| `VITE_QUARRY_*`                                                            | frontend links (docs, support, repository…), build time; unset hides them     |

With `ENABLE_USER_LOGIN=false` and no social provider configured, the setup wizard's email and password admin cannot sign
in until one of those changes.

## Skills

Skills are Markdown files in a project's `agent/skills/` folder. Admins can write them in **Settings → Skills**, or ask the
agent in chat to draft one and approve it. Where a skill is saved depends on the deployment:

| Deployment                                 | What Save does                                                              | Setup                        |
| ------------------------------------------ | --------------------------------------------------------------------------- | ---------------------------- |
| Local or single container                  | Writes to the live folder, usable right away                                | None                         |
| Several replicas on a shared volume        | Writes to the live folder; other replicas pick it up within about 5 seconds | Share `QUARRY_PROJECTS_DIR`  |
| Several replicas on separate disks         | Not safe directly, as the skill would exist on one replica only             | `QUARRY_SKILL_AUTHORING=off` |
| Read-only folder, or no editing in the app | Saving is disabled; skills still load from files                            | `QUARRY_SKILL_AUTHORING=off` |

## Deployment

The `Dockerfile` builds one image: `apps/api` serving the built frontend on port 5006, with Chromium for story
downloads. `docker-compose.prod.yml` runs it with its own Postgres:

```bash
cp .env.example .env    # BETTER_AUTH_SECRET, BETTER_AUTH_URL=https://your-host, an LLM key
docker compose -f docker-compose.prod.yml up -d --build
```

The container applies pending migrations on start. Data lives in two volumes: `quarry_postgres_data` (database) and
`quarry_data` (`/data/projects`, `/data/storage`). Put a TLS-terminating proxy in front and point `BETTER_AUTH_URL`
at its public URL. `BETTER_AUTH_SECRET` is required: with `MODE=prod` (the image's default) quarry refuses to start
without it, so every replica and restart shares one secret and prints the same setup token.

### First admin

On an empty database, open `/setup` on your public URL and create the first admin. The page asks for a setup token, which
quarry prints in its log at startup:

```bash
docker compose -f docker-compose.prod.yml logs quarry | grep "setup token"
```

If the logs were rotated, restart the container (`docker compose -f docker-compose.prod.yml restart quarry`) and it prints
the token again. Once an admin exists nothing is printed and `/setup` redirects to the login page. `BETTER_AUTH_URL` must
be the public URL users open, because sign-in checks the request origin; if it does not match, the admin is created but
signing in fails.

### Users

Nobody signs up. An organization admin adds people in **Settings → Users**: enter a name, an email and a role, and quarry
gives you a one-time link to send them (no email is sent). They open it, choose a password and are signed in. The link
works once and expires after 7 days; only a hash of it is stored, so copy it before closing the dialog.

- **Roles** are `admin` (manages users and every project), `user` and `viewer`. They apply to every project of the
  organization unless a project gives the person its own role.
- **Forgotten password:** in the user's row, **Reset password** gives a new link that expires after 24 hours. The old
  password keeps working until the link is used; then every session of that user is signed out. A new link voids the
  previous one.
- **Deactivate** signs the person out at once and blocks their sign-in and links until you reactivate them. Admins cannot
  change their own role or deactivate themselves, so an organization always keeps an active admin.
- **Your own password:** **Settings → Account → Change password** asks for the current one and signs out your other
  sessions.

### Upgrading from a version with public sign-up

Existing installs keep working and never see the wizard. What changes: public sign-up and the automatic joining of new
people through social sign-in are gone, and `ENABLE_USER_SIGNUP` and `DEFAULT_USER_ROLE` are ignored. Admins add people
in **Settings → Users** instead.

## Documentation

- [PLAN.md](PLAN.md) — architecture, decisions, and how each Nest module maps to upstream code
- [PHASES.md](PHASES.md) — build order and what each phase delivered
- [docs/deferred-features.md](docs/deferred-features.md) — areas not ported yet, and how to port them
- [docs/stories-api.md](docs/stories-api.md) — the stories GraphQL API
- [CLAUDE.md](CLAUDE.md) — module conventions and coding rules

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE), which credits the project quarry is derived from.
