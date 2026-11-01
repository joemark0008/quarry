# Install Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close self-service sign-up and let an installer holding a server-logged token create the first admin at `/setup`.

**Architecture:** A new `setup` API module checks an HMAC token derived from `BETTER_AUTH_SECRET`, then creates the admin and default organization under a Postgres advisory lock. better-auth can no longer create users at all. The frontend guards redirect on the public `hasUsers` query.

**Tech Stack:** NestJS 11, GraphQL code-first, Prisma, better-auth, React, TanStack Router and Form, Apollo Client, Vitest, Playwright.

**Spec:** [docs/superpowers/specs/2026-11-01-install-wizard-design.md](../specs/2026-11-01-install-wizard-design.md)

**Differences from the spec, found while reading the code:**

- The transaction lives in `setup/setup.repository.ts`, not `UserRepository`, because `UserRepository` does not depend on `OrganizationRepository`.
- The frontend module is `lib/setup-api.ts`, following the `lib/*-api.ts` rule in `CLAUDE.md`, and it replaces the spec's `lib/setup-status.ts`.
- The refusal message is the code `signup_disabled`, because better-auth puts it in the login redirect URL. The login page turns it into readable text.
- `ENABLE_USER_SIGNUP` is not in `.env.example`, so there is nothing to remove from that file.
- `routes/-email-verification-flow.test.tsx` keeps its three login and verification cases. Only the two sign-up cases go.
- The wizard Playwright flow gets a script, `scripts/e2e-setup-wizard.sh`, that creates its own empty database and stack.

## Global Constraints

- Work on `main`, as the user asked. Commit after each task, ending each message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push unless the user asks.
- Prisma only in repositories. Resolvers stay thin. Business logic lives in services. kebab-case file names.
- Token: `createHmac('sha256', BETTER_AUTH_SECRET).update('quarry-setup-token').digest('hex').slice(0, 32)`.
- Error text: `FORBIDDEN` "Invalid setup token." and `CONFLICT` "Setup is already complete."
- Never log the token except in the startup message, and never return it from an API.
- Before finishing: `npm run lint`, `npm test`, `npm run format:check`, `npm run test:e2e -w @quarry/frontend` with the local stack up.

## Review Focus

- A token pasted with surrounding spaces or a trailing newline is accepted, not reported as wrong. (Task 1)
- `Admin@Example.com ` is stored lower-cased and trimmed, and the admin can log in by typing it either way. (Task 1)
- A password of 129 characters is refused at setup, because better-auth's 128 limit on sign-in would otherwise leave an admin who can never log in. (Task 1)
- A failed `hasUsers` request never sends a working install to the wizard. (Task 3)
- Someone who is new and uses Google, GitHub or GitLab lands on `/login` with a readable message, not a raw code. (Task 2)

---

### Task 1: Setup API

**Files:**

- Create: `apps/api/src/setup/setup-token.ts`, `setup.service.ts`, `setup.repository.ts`, `setup.resolver.ts`, `setup.module.ts`, `dto/complete-setup.input.ts`
- Modify: `apps/api/src/organizations/organization.repository.ts`, `apps/api/src/app.module.ts`, `apps/api/schema.gql` (generated)
- Test: `apps/api/src/setup/setup-token.spec.ts`, `apps/api/src/setup/setup.service.spec.ts`, `apps/api/test/setup.e2e-spec.ts`

**Interfaces:**

- Produces: `deriveSetupToken(secret: string): string` and `isValidSetupToken(input: string, secret: string): boolean`.
- Produces: `SetupService.completeSetup(input: CompleteSetupInput): Promise<void>`.
- Produces: `SetupRepository.createFirstAdmin(user, account): Promise<User>`, taking the same first two arguments as `UserRepository.createUser`.
- Produces: `OrganizationRepository.initializeDefaultOrganization(userId: string, tx: Prisma.TransactionClient): Promise<void>`, used by Task 2's test helper.
- Produces GraphQL: `completeSetup(input: CompleteSetupInput!): Boolean!`, public, with fields `token`, `name`, `email`, `password`.

- [ ] **Step 1: Write the failing token test** in `setup-token.spec.ts`

```ts
it('is stable for one secret and differs between secrets', () => {
	expect(deriveSetupToken('a')).toBe(deriveSetupToken('a'));
	expect(deriveSetupToken('a')).not.toBe(deriveSetupToken('b'));
	expect(deriveSetupToken('a')).toMatch(/^[0-9a-f]{32}$/);
});
it('accepts the token with surrounding whitespace', () => {
	expect(isValidSetupToken(`  ${deriveSetupToken('a')}\n`, 'a')).toBe(true);
});
it('refuses a wrong token, a wrong length and multi-byte input without throwing', () => {
	expect(isValidSetupToken('0'.repeat(32), 'a')).toBe(false);
	expect(isValidSetupToken('abc', 'a')).toBe(false);
	expect(isValidSetupToken('é'.repeat(32), 'a')).toBe(false);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run --root apps/api src/setup/setup-token.spec.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `setup-token.ts`**

`isValidSetupToken` trims the input, compares `Buffer` byte lengths first, and then uses `timingSafeEqual`.

- [ ] **Step 4: Run it to verify it passes**

Run the same command. Expected: PASS.

- [ ] **Step 5: Write the failing `setup.e2e-spec.ts`**

Follow the setup of `test/auth.e2e-spec.ts`, with `resetDatabase` in a `beforeEach`. Derive the token with `deriveSetupToken(process.env.BETTER_AUTH_SECRET!)`. Tests:

- `refuses a wrong token and creates nothing`: `extensions.code` is `FORBIDDEN`, `hasUsers` is false.
- `creates the admin, who can sign in`: an `orgMember` row has role `admin`, the organization exists, and `POST /api/auth/sign-in/email` returns 200.
- `stores the email trimmed and lower-cased`: input `Admin@Example.com ` stores `admin@example.com`, and sign-in with `ADMIN@example.com` returns 200.
- `refuses a second setup`: the second call returns `CONFLICT` and the user count stays 1.
- `creates exactly one user from concurrent calls`: `Promise.all` of 5 calls with different emails gives one success, four `CONFLICT` and a user count of 1.
- `refuses a short, an over-long and a blank-name input`: 7 and 129 character passwords and a blank name each return an error and create nothing, and a 128 character password succeeds and can sign in.

- [ ] **Step 6: Run it to verify it fails**

Run: `npx vitest run --root apps/api test/setup.e2e-spec.ts`
Expected: FAIL, `completeSetup` is not in the schema.

- [ ] **Step 7: Change `OrganizationRepository`**

Replace `initializeDefaultOrganizationForFirstUser` with `initializeDefaultOrganization(userId, tx)`, keeping the body of its transaction callback and running it on `tx`. It returns early when `getFirstOrganization(tx)` finds one. Remove `addUserToDefaultOrganizationIfExists`. Task 2 removes the remaining callers, so keep `UserOnboardingService` compiling for now by wrapping the call in `prisma.$transaction`.

- [ ] **Step 8: Implement the module**

- `setup.repository.ts`: `createFirstAdmin` opens a `$transaction`, runs `SELECT pg_advisory_xact_lock(7283910)`, throws `HandlerError('CONFLICT', 'Setup is already complete.')` when `tx.user.count() > 0`, calls `UserRepository.createUser(user, account, tx)`, then `initializeDefaultOrganization(user.id, tx)`.
- `setup.service.ts`: `completeSetup` checks the token first, hashes the password with `hashPassword` from `better-auth/crypto`, and creates the user with `emailVerified: true`. The account follows `prisma/seed.ts`: `{ id, accountId: userId, providerId: 'credential', password }`. `onApplicationBootstrap` logs the token and `${BETTER_AUTH_URL}/setup` with `Logger.log` only when `countUsers()` is 0.
- `complete-setup.input.ts`: `token` is `@IsString()`. `name` uses `@Transform` to trim, plus `@MinLength(1) @MaxLength(100)`. `email` uses `@Transform` to trim and lower-case, plus `@IsEmail()`. `password` uses `@MinLength(8) @MaxLength(128)`. The global `ValidationPipe` in `app.module.ts` already has `transform: true`.
- `setup.resolver.ts`: one `@Public() @Mutation(() => Boolean)` that calls the service and returns `true`.
- `setup.module.ts`: imports `UsersCoreModule` and `OrganizationsModule`. Register it in `app.module.ts`.

- [ ] **Step 9: Run the e2e spec to verify it passes**

Run: `npx vitest run --root apps/api test/setup.e2e-spec.ts`
Expected: PASS. `apps/api/schema.gql` now contains `completeSetup`.

- [ ] **Step 10: Write and pass `setup.service.spec.ts`**

With mocked repositories: `logs the token and URL when no users exist` and `logs nothing once a user exists`, asserting on a `Logger.prototype.log` spy. Add `does not hash the password for a wrong token` by mocking `better-auth/crypto`.

Run: `npx vitest run --root apps/api src/setup`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add apps/api
git commit -m "Add the setup API: token check and first admin creation"
```

### Task 2: Close sign-up

**Files:**

- Modify: `apps/api/src/auth/auth.service.ts`, `apps/api/src/config/env.ts`, `env.spec.ts`, `apps/api/src/system/system.service.ts`, `system/models/public-config.model.ts`, `apps/api/src/users/users-core.module.ts`, `organizations/organization.repository.ts`
- Modify: `apps/api/test/test-app.ts`, `apps/api/test/auth.e2e-spec.ts`, and the 13 other specs from `grep -rl sign-up/email apps/api/test`
- Modify: `apps/frontend/src/lib/email-verification.ts`, `apps/frontend/src/graphql/system.graphql`, and the generated GraphQL files
- Delete: `apps/api/src/users/user-onboarding.service.ts`, `user-onboarding.service.spec.ts`
- Test: `apps/api/test/setup.e2e-spec.ts`, `apps/frontend/src/lib/email-verification.test.ts` (extend it, or create it if missing)

**Interfaces:**

- Consumes: `OrganizationRepository.initializeDefaultOrganization` from Task 1.
- Produces: `createTestUser(app, { name, email, password }): Promise<{ cookie: string[]; userId: string }>` in `test/test-app.ts`. It hashes the password, creates the user through `UserRepository.createUser`, runs `initializeDefaultOrganization` in a transaction so the first user still becomes org admin, and signs in through `POST /api/auth/sign-in/email`.
- Produces: `PublicConfig` without `enableUserSignup`. Task 4 removes the frontend readers.

- [ ] **Step 1: Add the failing cases to `setup.e2e-spec.ts`**

- `refuses email sign-up before and after setup`: `POST /api/auth/sign-up/email` is not 200 in either state, and the user count does not change.
- `refuses user creation through better-auth, which covers first-time social sign-in`: `(await (await app.get(AuthService).getAuth()).$context).internalAdapter.createUser({ name, email, emailVerified: false })` rejects, and the user count does not change.
- `still signs in an existing user`: after setup, `POST /api/auth/sign-in/email` returns 200.

- [ ] **Step 2: Add the failing case for the login message**

```ts
it('explains a refused first-time social sign-in', () => {
	expect(getSignInErrorMessage('signup_disabled')).toBe('You do not have an account yet. Ask your admin to add you.');
	expect(getSignInErrorMessage('unable_to_create_user')).toBe(
		'You do not have an account yet. Ask your admin to add you.',
	);
});
```

- [ ] **Step 3: Run both to verify they fail**

Run: `npx vitest run --root apps/api test/setup.e2e-spec.ts`, then `npx vitest run --root apps/frontend src/lib/email-verification.test.ts`
Expected: FAIL on the new cases.

- [ ] **Step 4: Change `AuthService`**

Set `disableSignUp: true`. Make `user.create.before` always throw `new APIError('FORBIDDEN', { message: 'signup_disabled' })`. Remove `user.create.after`, `shouldDisableEmailSignUp`, `refreshAuthAfterInitialSignup`, the `UserOnboardingService` injection and the imports these leave unused. Keep `updateAuth` and correct its comment, since Google settings rely on rebuilding the instance. Keep `accountLinking`.

- [ ] **Step 5: Remove the rest**

Remove `ENABLE_USER_SIGNUP` and `DEFAULT_USER_ROLE` from `env.ts` and `env.spec.ts`. Remove `isUserSignupAvailable` and `enableUserSignup` from the API, and `enableUserSignup` from `system.graphql`. Delete `UserOnboardingService` and its spec, and remove it from `users-core.module.ts`. Remove `addUserToDefaultProjectIfExists`.

- [ ] **Step 6: Map the login error**

In `getSignInErrorMessage`, return "You do not have an account yet. Ask your admin to add you." for `signup_disabled` and `unable_to_create_user`.

- [ ] **Step 7: Add `createTestUser` and migrate the specs**

Replace each spec's sign-up call with `createTestUser`, and remove its `ENABLE_USER_SIGNUP` lines and the one in `useTestDatabase`. Assertions do not change, with these exceptions in `auth.e2e-spec.ts`:

- `offers sign-up while there are no users` becomes `reports no users yet`, asserting `hasUsers: false` and dropping `enableUserSignup` from the query.
- `signs up the first user and sets a session cookie` uses `createTestUser` and asserts the cookie.
- `closes email sign-up after the first user` moves to `setup.e2e-spec.ts`, where Step 1 already covers it, and is deleted here.

- [ ] **Step 8: Run everything in the API and the frontend test**

Run: `npm run test -w @quarry/api` and `npx vitest run --root apps/frontend src/lib/email-verification.test.ts`
Expected: PASS, with no `sign-up/email` left in `apps/api/test` except the refusal cases in `setup.e2e-spec.ts`. Frontend type errors from `enableUserSignup` are expected until Task 4, so do not run `npm run lint` yet.

- [ ] **Step 9: Commit**

```bash
git add apps
git commit -m "Close sign-up: only the setup wizard and admins create accounts"
```

### Task 3: `/setup` page and redirects

**Files:**

- Create: `apps/frontend/src/graphql/setup.graphql`, `apps/frontend/src/lib/setup-api.ts`, `apps/frontend/src/routes/setup.tsx`, `apps/frontend/src/feature/auth/setup-page.tsx`, `setup-page.module.css`
- Modify: `apps/frontend/src/routes/_protected.tsx`, `routes/_public.tsx`, `hooks/use-session-or-navigate-to-index-page.tsx`, `lib/safe-redirect.ts`, `lib/safe-redirect.test.ts`, and the generated `routeTree.gen.ts` and GraphQL files
- Test: `apps/frontend/src/lib/setup-api.test.ts`, `apps/frontend/src/feature/auth/setup-page.test.tsx`

**Interfaces:**

- Consumes: the `completeSetup` mutation from Task 1.
- Produces, in `lib/setup-api.ts`:
    - `isSetupComplete(): Promise<boolean>`
    - `markSetupComplete(): void`
    - `completeSetup(input: { token: string; name: string; email: string; password: string }): Promise<CompleteSetupResult>`
    - `type CompleteSetupResult = { status: 'ok' } | { status: 'invalid-token' } | { status: 'already-complete' } | { status: 'error'; message: string }`

- [ ] **Step 1: Write the failing `setup-api.test.ts`**

With `apolloClient.query` mocked and `vi.resetModules()` between tests:

- `returns false and asks again until there are users`: two calls answering `false` make two requests.
- `caches true`: two calls answering `true` make one request.
- `treats a failed request as set up, without caching it`: a rejected query returns `true`, and the next call makes a new request.
- `maps FORBIDDEN to invalid-token and CONFLICT to already-complete`, on a mocked mutation error.

- [ ] **Step 2: Write the failing `setup-page.test.tsx`**

Following the mocking style of `routes/-email-verification-flow.test.tsx`:

- `signs in and goes home after setup`.
- `shows an inline error for a wrong token and keeps the other fields`.
- `goes to /login when someone else finished first`.
- `goes to /login when the admin was created but sign-in fails`.
- `says where to find the token`: the page shows "Printed in the server logs when quarry starts."

- [ ] **Step 3: Run them to verify they fail**

Run: `npx vitest run --root apps/frontend src/lib/setup-api.test.ts src/feature/auth/setup-page.test.tsx`
Expected: FAIL, modules not found.

- [ ] **Step 4: Implement `setup.graphql` and `lib/setup-api.ts`**

`isSetupComplete` uses `apolloClient.query({ query: HasUsersDocument, fetchPolicy: 'network-only' })` and keeps `true` in a module variable. Run `npm run codegen -w @quarry/frontend`, or the codegen step that `npm run lint` runs, to generate the document.

- [ ] **Step 5: Implement the page and the route**

Reuse `AuthForm` and `FormTextField` from `feature/auth/components/auth-form`, with four fields named `token`, `name`, `email`, `password`. On `ok`: call `markSetupComplete()`, `signIn.email`, `invalidateSession()`, `clearApolloCache()`, `rememberSignInMethod('email')`, then go to `/`.

`routes/setup.tsx` is a top-level route whose `beforeLoad` redirects to `/login` when `isSetupComplete()` is true.

- [ ] **Step 6: Add the guards**

At the start of `beforeLoad` in `_protected.tsx` and `_public.tsx`, redirect to `/setup` when `isSetupComplete()` is false. In `use-session-or-navigate-to-index-page.tsx`, add `/setup` to `PUBLIC_AUTH_ROUTES`, so the root hook does not push the wizard to `/login`. In `safe-redirect.ts`, add `/setup` to `AUTH_PATHS`, with a matching case in `safe-redirect.test.ts`.

- [ ] **Step 7: Run them to verify they pass**

Run the Step 3 command, plus `npx vitest run --root apps/frontend src/lib/safe-redirect.test.ts`.
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/frontend
git commit -m "Add the /setup wizard and its redirects"
```

### Task 4: Remove the sign-up frontend

**Files:**

- Delete: `apps/frontend/src/routes/_public/signup.tsx`, `apps/frontend/src/feature/auth/signup-page.tsx`, `signup-page.module.css`, `apps/frontend/src/hooks/use-auth-route.ts`
- Modify: `apps/frontend/src/feature/auth/login-page.tsx`, `hooks/use-session-or-navigate-to-index-page.tsx`, `hooks/use-sign-out.ts`, `lib/auth-client.ts`, `lib/safe-redirect.ts`, `lib/safe-redirect.test.ts`, `routes/-email-verification-flow.test.tsx`, and the generated `routeTree.gen.ts`

**Interfaces:**

- Consumes: `PublicConfig` without `enableUserSignup` from Task 2.
- Produces: `useSignOut` and the root hook send signed-out users to `/login` directly.

- [ ] **Step 1: Remove the code**

Delete the listed files. In `login-page.tsx`, remove `isUserSignupEnabled` and the `footer` link. In the root hook, remove `/signup` handling and `useAuthRoute`. In `use-sign-out.ts`, replace `useAuthRoute()` with `/login`. Remove `signUp` from `auth-client.ts`. Remove `/signup` from `AUTH_PATHS` and its two test lines. In the verification flow test, remove the two cases named `...cloud sign-up...` and the `SignUp` import and mocks, keeping the other three.

- [ ] **Step 2: Verify nothing is left**

Run: `grep -rnE "signUp\b|/signup|enableUserSignup|isUserSignupEnabled|useAuthRoute" apps/frontend/src --include='*.ts*' --exclude-dir=generated --exclude=routeTree.gen.ts`
Expected: no output.

- [ ] **Step 3: Run lint and tests**

Run: `npm run lint && npm test`
Expected: both pass, with only the existing warning in `query-tool-sql-editor.tsx`.

- [ ] **Step 4: Commit**

```bash
git add apps
git commit -m "Remove the sign-up page"
```

### Task 5: Browser flow and docs

**Files:**

- Create: `apps/frontend/e2e/setup-wizard.spec.ts`, `scripts/e2e-setup-wizard.sh`
- Modify: `package.json`, `README.md`, `.env.example`, `PLAN.md`

**Interfaces:**

- Consumes: the `/setup` page from Task 3 and `deriveSetupToken`'s formula from Global Constraints.
- Produces: `npm run test:e2e:setup`. The spec reads `SETUP_E2E_TOKEN` and is skipped when it is unset, so `npm run test:e2e -w @quarry/frontend` skips it against the seeded stack.

- [ ] **Step 1: Write `setup-wizard.spec.ts`**

In order, in one test:

- Going to `/` lands on `/setup`, and `/login` lands on `/setup` too.
- A wrong token shows "Invalid setup token." on the page, and the name and email keep their values.
- The right token finishes on `/`, signed in. After a reload it is still signed in.
- `/setup` then redirects away from the wizard.
- Signing out and opening `/setup` lands on `/login`, and the page has no link to `/signup`.
- `/signup` does not show a sign-up form.

- [ ] **Step 2: Write `scripts/e2e-setup-wizard.sh`**

With `set -euo pipefail`:

1. Load `.env`, drop and create the database `quarry_setup_e2e` with `docker compose exec`, then run `npm run db:deploy -w @quarry/api` with `DATABASE_URL` pointing at it.
2. Start the API with `PORT=5007` and that `DATABASE_URL`, and start Vite with `QUARRY_API_URL=http://localhost:5007` on port 3001. Wait for both to answer, and stop both with a `trap` on exit.
3. Compute `SETUP_E2E_TOKEN` with `node -e` using the formula in Global Constraints. Run `npx playwright test e2e/setup-wizard.spec.ts` in `apps/frontend` with `E2E_BASE_URL=http://localhost:3001`.
4. Set `BETTER_AUTH_URL=http://localhost:3001` for the API so its trusted origin matches.

Add `"test:e2e:setup": "./scripts/e2e-setup-wizard.sh"` to the root `package.json`.

- [ ] **Step 3: Run it**

Run: `npm run test:e2e:setup`
Expected: 1 passed. Run it twice to prove it starts clean. Confirm with `docker compose exec -T postgres psql -U quarry -d quarry -At -c 'select count(*) from "user"'` that the development database did not change.

- [ ] **Step 4: Update the docs**

- `README.md`: replace "sign up (the first user becomes the admin)" with: on an empty database, open `/setup` and enter the setup token, which the API prints at startup (in the `npm run dev:api` terminal, or `docker compose -f docker-compose.prod.yml logs`).
- `.env.example`: add a comment by `BETTER_AUTH_SECRET` saying it also produces the setup token.
- `PLAN.md`: note the setup wizard, that public sign-up is gone, and `DEFAULT_USER_ROLE` is removed.

- [ ] **Step 5: Run the final verification**

Run: `npm run lint && npm run format:check && npm test && npm run test:e2e -w @quarry/frontend` with the local stack up.
Expected: all pass. `flows.spec.ts` passing proves the wizard stays out of the way on a seeded database, and `setup-wizard.spec.ts` shows as skipped.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/e2e/setup-wizard.spec.ts scripts/e2e-setup-wizard.sh package.json README.md .env.example PLAN.md
git commit -m "Test the setup wizard in a browser and document it"
```
