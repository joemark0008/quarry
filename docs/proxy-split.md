# Running quarry next to upstream (proxy split)

During Phases 1–7 the frontend talks to two backends (PLAN.md §8): Vite sends `/graphql`, `/api/auth/*` and
`/health` to `apps/api`, everything else to the upstream backend in `../fork-reference`.

Both backends must read the same users and sessions, so in this mode:

- `apps/api` uses the upstream database (`nao_baseline`), not `quarry`. Prisma only touches the tables it maps,
  and upstream's extra columns (billing, license, SSO) have defaults, so both can write to it. Don't run
  `prisma migrate` against `nao_baseline`: its schema belongs to upstream's Drizzle migrations.
- Both use the same `BETTER_AUTH_SECRET` (the session cookie is signed with it).
- `BETTER_AUTH_URL` is the frontend origin you open in the browser (better-auth checks the request origin).

| Process          | Port | Command                                                                                                                                                                     |
| ---------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| upstream backend | 5005 | `cd ../fork-reference && npm run dev:backend` (or `npm run dev` for the whole upstream app)                                                                                 |
| `apps/api`       | 5006 | `DATABASE_URL=postgresql://quarry:quarry@localhost:5434/nao_baseline BETTER_AUTH_SECRET=<upstream secret> BETTER_AUTH_URL=http://localhost:3000 npm run dev -w @quarry/api` |
| quarry frontend  | 3000 | `npm run dev -w @quarry/frontend`                                                                                                                                           |

If the upstream frontend already uses port 3000, run quarry's on another port and use that origin as
`BETTER_AUTH_URL`; set `TANSTACK_DEVTOOLS_PORT` (default 42069) too, since both Vite servers start a devtools
event bus: `TANSTACK_DEVTOOLS_PORT=42070 npx vite --port 3001` in `apps/frontend`.

`QUARRY_API_URL` and `UPSTREAM_API_URL` override the proxy targets.

## Checked on 2026-10-29 (Phase 1c)

With upstream's `npm run dev` on 3000/5005/8005, `apps/api` on 5006 and quarry's frontend on 3001: sign-up,
log in, current user and log out ran through `apps/api`, and the home page, chat list, chat view and settings
kept working through upstream tRPC on the same session.

## Types from upstream

The frontend still imports upstream backend types (tRPC router, chat message types, usage, providers…).
`apps/shared/src/backend/*.ts` re-exports them from `../fork-reference` as `@nao/shared/backend/*`; each
bridge is replaced by the ported definitions when its module moves to `apps/api`, and the folder goes away in
Phase 8. The frontend's `tsconfig.json` paths and Vite aliases point upstream's own `@nao/shared`, `zod` and `ai`
imports at quarry's copies, so there is one copy of each.
