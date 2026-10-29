# Upstream baseline (Phase 0)

Notes on running upstream nao (`../fork-reference`) locally, for side-by-side comparison with quarry.

## Setup

Recorded 2026-10-29 on macOS (Apple silicon).

- Node v22.23.4 (`nvm install`), npm 11.10.1 (upstream's `packageManager`, enforced by `engine-strict`).
- Bun 1.4.4 (`brew install oven-sh/bun/bun`): the backend runs on Bun (`bun --watch src/index.ts`, `bun scripts/db.migrate.ts`).
- uv + Python 3.13 for the FastAPI SQL service (`cli/`, `uv run ../apps/backend/fastapi/main.py`).
- `nao-core[all]` builds `mysqlclient`, which needs MySQL headers: `brew install mysql-client pkg-config` and
  `PKG_CONFIG_PATH="$(brew --prefix mysql-client)/lib/pkgconfig"` when running `uv sync` (once; later runs reuse `cli/.venv`).
- Database: quarry's Docker Postgres (`docker compose up`), database `nao_baseline`, port 5434.
- `fork-reference/.env` (untracked, read by the backend from the repo root):

    ```
    DB_URI=postgres://quarry:quarry@localhost:5434/nao_baseline
    SERVER_PORT=5005
    BETTER_AUTH_SECRET=<openssl rand -base64 32>
    BETTER_AUTH_URL=http://localhost:3000
    NAO_MODE=self-hosted
    NAO_DEFAULT_PROJECT_PATH=<absolute path to fork-reference/example>
    OPENAI_API_KEY=... or ANTHROPIC_API_KEY=...   # needed for chat answers
    ```

## Run

```bash
cd ../fork-reference
nvm use
npm install
npm run db:migrate -w @nao/backend
npm run dev
```

`npm run dev` starts three processes: backend on :5005 (Bun + Fastify + tRPC), frontend on :3000 (Vite), FastAPI SQL
service on :8005. Open http://localhost:3000.

## Observed flow

1. `/` redirects to `/signup?redirect=%2F` (no users yet). Form: name, email, password.
2. Sign-up logs the user in and opens the home screen: "<Name>, what do you want to analyze?", sidebar with New chat,
   Search chats, Stories, Feed, empty Chats list.
3. A project named `example` (type `local`, path = `NAO_DEFAULT_PROJECT_PATH`) is created automatically on first sign-up:
   no manual "create project" step in self-hosted mode with a default project path.
4. With no LLM key, the chat input shows "Configure a model". Sending a question shows the error
   **"No model config found"** with a Retry button.
5. Migrations: 92 Drizzle migrations apply cleanly on Postgres 16 (identifier-truncation NOTICEs only).

6. With `OPENAI_API_KEY` set (model picker shows "Auto"), the question "How many orders are there, and what is the total
   payment amount?" is answered in about 15 s: the agent explores the context folders ("Explored 2 folders, 1 search,
   4 files"), runs a **Semantic query** (MetricFlow, 1 row) and answers "99 orders, total payment amount 1,672" — the
   same figures as the quarry `warehouse` database. Two follow-up suggestions are shown under the answer.
7. Clicking a suggestion only fills the input; sending "How do orders and payment amounts trend by month?" runs another
   semantic query (4 rows) and renders a **chart** (orders and payment amount by month, two axes) plus a **table**:
   Jan 29 / 496, Feb 27 / 415, Mar 35 / 622, Apr 8 / 139, then a short analysis, new suggestions and a "How did this
   conversation go?" feedback prompt. The chat gets an auto-generated title ("Order count and total payment amount")
   and a Library counter (one entry per query result).
8. `llm_inference` in `nao_baseline` records the side calls (`title_generation`, `memory_extraction`) on
   `openai / gpt-4.1-mini`.
