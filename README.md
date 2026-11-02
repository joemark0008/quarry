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

quarry connects to a Postgres warehouse and syncs its schema into a context that the agent reads. You chat with an agent
that writes SQL and draws charts, and you can turn its answers into stories. You can browse, edit and improve that
context from the app.

<p align="center">
    <video src="https://github.com/joemark0008/quarry/raw/main/docs/quarry-demo.mp4" controls muted width="100%">
        <a href="docs/quarry-demo.mp4">Watch the demo</a>
    </video>
</p>

## Features

- **Chat agent**: writes and runs SQL, draws charts and maps, asks clarifying questions and suggests follow-ups. You
  can fork, star and share chats.
- **Any LLM provider**: OpenAI, Anthropic, Gemini, Mistral, OpenRouter or any OpenAI-compatible endpoint, set in the
  environment or in **Settings → Agent**.
- **Context**: **Sync** pulls the warehouse schema into context files, which you edit in the context explorer.
- **Semantic layer**: MetricFlow-style metrics, compiled to Postgres SQL.
- **Query workbench**: write or generate SQL, run it, and save it as a tool that the agent can call.
- **Skills and memory**: Markdown skills that the agent loads when it needs them, and memories taken from past chats.
- **Stories**: dashboards built from answers, with sharing, embeds, scheduled refresh and HTML/PDF downloads.
- **Attachments and voice**: upload files (text is extracted from PDF and XLSX), store them locally or on S3, and dictate
  input by voice.

## Core technology stack

| Layer          | Technology                                                                        |
| -------------- | --------------------------------------------------------------------------------- |
| Runtime        | Node.js 22 (see `.nvmrc`), npm 11 workspaces, TypeScript                          |
| API            | NestJS 11 on Express, GraphQL code-first with `@nestjs/graphql` + Apollo Server 5 |
| Database       | PostgreSQL 16 with Prisma 7                                                       |
| Auth           | better-auth (email and password, sessions)                                        |
| Background job | pg-boss                                                                           |
| AI             | Vercel AI SDK 6 (`ai`, `@ai-sdk/*` providers)                                     |
| Frontend       | React 19, Vite 7, TanStack Router, Mantine 9, CSS Modules                         |
| Data fetching  | Apollo Client 4 + GraphQL Code Generator                                          |
| Charts         | Recharts                                                                          |
| Testing        | Vitest (unit), Playwright (end-to-end)                                            |
| Tooling        | ESLint, Prettier, Husky + lint-staged                                             |
| Deployment     | Docker (a single image: the API also serves the built frontend)                   |

## Repository layout

| Path                             | Contents                                                                    |
| -------------------------------- | --------------------------------------------------------------------------- |
| [`apps/api`](apps/api)           | NestJS API: GraphQL at `/graphql`, REST for auth, agent streaming and files |
| [`apps/frontend`](apps/frontend) | React app                                                                   |
| [`apps/shared`](apps/shared)     | Types and helpers used by both apps                                         |
| [`brand`](brand)                 | Logo, icons and colours                                                     |

## Installation

### Requirements

- Node.js **22.23.4** (from `.nvmrc`; [nvm](https://github.com/nvm-sh/nvm) recommended)
- npm **11.10.1** (pinned with `engine-strict`; `npm install -g npm@11.10.1`)
- Docker with Docker Compose
- An API key for at least one LLM provider
- Optional: the [DuckDB CLI](https://duckdb.org/docs/installation/) (`brew install duckdb`), only for loading the example
  warehouse

### Local development

1. **Clone and install**

    ```bash
    git clone https://github.com/joemark0008/quarry.git
    cd quarry
    nvm use
    npm install
    ```

2. **Configure the environment**

    ```bash
    cp .env.example .env
    ```

    In `.env`, set `BETTER_AUTH_SECRET` (generate it with `openssl rand -base64 32`) and at least one LLM key, such as
    `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`.

3. **Start Postgres**

    ```bash
    npm run db:up
    ```

    This runs Postgres 16 on `localhost:5434` with two databases: `quarry` (the app) and `warehouse` (example data to
    query). Port 5434 avoids a clash with a local Postgres on 5432; change it with `POSTGRES_PORT`.

4. **Create the database schema**

    ```bash
    npm run db:deploy -w @quarry/api
    npm run db:seed -w @quarry/api     # optional: user test@test.test / test1234, with an organization and a project
    ```

5. **Load example data (optional)**

    ```bash
    JAFFLE_SHOP_DUCKDB=/path/to/jaffle_shop.duckdb npm run warehouse:load
    ```

    This copies the jaffle_shop dataset from a DuckDB file into the `warehouse` database. Skip this step if you will
    connect your own warehouse.

6. **Run the app**, in two terminals:

    ```bash
    npm run dev:api        # API on http://localhost:5006
    npm run dev:frontend   # app on http://localhost:3000 (sends API calls to :5006)
    ```

7. **Set it up in the browser**: open http://localhost:3000.
    - On an empty database, the app opens `/setup`. Enter the setup token from the `dev:api` terminal output and create
      the first admin. If you ran the seed, log in with the seed user instead.
    - Create a project from the project switcher.
    - In **Settings → Warehouse**, add a connection (for the example: host `localhost`, port `5434`, database
      `warehouse`, user and password `quarry`), then press **Sync**.
    - Start a chat.

Other useful commands:

```bash
npm run dev:studio     # Prisma Studio to browse the app database
npm run db:down        # stop Postgres
npm run db:reset       # stop Postgres and delete its data
```

### Production with Docker

`docker-compose.prod.yml` builds a single image (the API serves the built frontend, and Chromium is included for story
downloads) and runs it with its own Postgres.

1. **Configure**

    ```bash
    cp .env.example .env
    ```

    Set these values:
    - `BETTER_AUTH_SECRET`: required, and must stay the same across restarts and replicas.
    - `BETTER_AUTH_URL`: the public URL that users open, for example `https://quarry.example.com`. Sign-in checks the
      request origin against it.
    - At least one LLM key.
    - Optional: `QUARRY_PORT` for the host port (default `8080`), and `POSTGRES_USER` / `POSTGRES_PASSWORD`.

2. **Start**

    ```bash
    docker compose -f docker-compose.prod.yml up -d --build
    ```

    The container applies pending database migrations each time it starts. Put a reverse proxy that handles TLS in
    front of it.

3. **Create the first admin**: open `/setup` on your public URL. To get the setup token, run:

    ```bash
    docker compose -f docker-compose.prod.yml logs quarry | grep "setup token"
    ```

    If the logs were rotated, restart the container (`docker compose -f docker-compose.prod.yml restart quarry`) and
    it prints the token again. Once an admin exists, `/setup` redirects to the login page.

Data lives in two volumes: `quarry_postgres_data` holds the database, and `quarry_data` holds project context and stored
files. Back up both.

### Adding users

There is no public sign-up. An organization admin adds people in **Settings → Users**. quarry then creates a one-time
link to send them (it sends no email). The link expires after 7 days. **Reset password** in the user's row creates a
new link, which expires after 24 hours. Roles are `admin`, `user` and `viewer`, and each project can override a user's
role.

## Configuration

`.env.example` lists every variable, and `apps/api/src/config/env.ts` validates them. These are the main ones:

| Variable                                                                   | Purpose                                                                          |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                             | App database (Prisma)                                                            |
| `BETTER_AUTH_SECRET`                                                       | Signs sessions and is used to derive the setup token. Keep it stable.            |
| `BETTER_AUTH_URL`                                                          | Public URL of the app                                                            |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, …                                   | LLM providers; you can add more in **Settings → Agent**                          |
| `ENABLE_USER_LOGIN`                                                        | `false` turns off email and password login                                       |
| `QUARRY_PROJECTS_DIR`, `QUARRY_STORAGE_LOCAL_PATH`                         | Folders for project context and stored files                                     |
| `QUARRY_STORAGE_BACKEND` (`local`, `s3`, `none`) and `QUARRY_STORAGE_S3_*` | Where attachments and saved files go                                             |
| `QUARRY_SKILL_AUTHORING` (`auto`, `off`)                                   | `off` stops saving skills from the app (use it when replicas don't share a disk) |
| `VITE_QUARRY_*`                                                            | Frontend links (docs, support, repository…), read at build time                  |

## Development checks

```bash
npm run lint
npm test
npm run format:check
npm run test:e2e -w @quarry/frontend   # with the local stack running
```

After you change the GraphQL schema, run `npm run codegen` to regenerate the frontend's typed operations.

## Acknowledgements

quarry builds on [nao](https://github.com/getnao/nao) by nao Labs, an open-source analytics agent released under the
Apache License 2.0. Thanks to the nao team for their work.

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
