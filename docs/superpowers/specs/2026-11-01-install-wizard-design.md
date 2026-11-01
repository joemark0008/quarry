# Install wizard design

## Goal

Nobody can create their own account. On a new deployment, an installer proves they control the server, then creates the first admin in a `/setup` wizard. Every later account comes from that admin, which a separate spec covers (see Out of scope).

**Success looks like:**

- On an empty database, every page leads to `/setup`, and only someone with the token from the server logs can finish it.
- Once a user exists, `/setup` redirects to `/login` and the API refuses `completeSetup`.
- Email sign-up and first-time social sign-in cannot create an account, even by calling the API directly.
- An existing install, including one created by `npm run db:seed`, never sees the wizard.

## Decisions

| Decision           | Choice                                                        | Why                                                                                                                                            |
| ------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Who may run setup  | Whoever holds a setup token printed in the server logs        | The server can be reachable before setup finishes, so the first visitor must not become admin                                                  |
| Token source       | Derived from `BETTER_AUTH_SECRET` with HMAC, nothing stored   | Same token across restarts and replicas, and it survives lost logs. Anyone with the secret already controls auth, so this adds no new weakness |
| "Is it set up?"    | At least one row in `user`, read through the `hasUsers` query | No flag that can drift from the data, and existing installs count as set up with no migration                                                  |
| Wizard scope       | Admin account only                                            | Projects and LLM keys keep their existing screens                                                                                              |
| Global admin       | The existing org `admin` role on the default organization     | Already enforced by `@OrgAdmin()`. Needs no new role                                                                                           |
| Social sign-in     | Signs in existing users, never creates one                    | First-time sign-in would otherwise be self-service sign-up                                                                                     |
| Attempt rate limit | None                                                          | The token has 128 bits from an HMAC, so guessing is not practical, and the repo has no rate limiter to reuse                                   |

## Token

```ts
createHmac('sha256', BETTER_AUTH_SECRET).update('quarry-setup-token').digest('hex').slice(0, 32);
```

- Lives in a new `apps/api/src/setup/setup-token.ts` as a pure function, so it can be tested alone.
- Compared with `timingSafeEqual` on equal-length buffers. A token of the wrong length is refused without comparing.
- Never logged by a failed attempt, and never returned by any API.
- Stops mattering once a user exists, because `completeSetup` refuses first. Changing `BETTER_AUTH_SECRET` before setup changes the token, and the next startup logs the new one.

## Backend

### New `setup` module (`apps/api/src/setup/`)

Follows the module conventions: `setup.module.ts`, `setup.resolver.ts`, `setup.service.ts`, `dto/complete-setup.input.ts`.

**`SetupService`**

- `onApplicationBootstrap`: when no users exist, logs the token and `${BETTER_AUTH_URL}/setup` with `Logger.log`. Logs nothing once a user exists.
- `completeSetup(input)`:
    1. Refuses with `FORBIDDEN` and "Invalid setup token." when the token does not match.
    2. Hashes the password with `hashPassword` from `better-auth/crypto`, as `prisma/seed.ts` does.
    3. Calls the repository method below, which refuses with `CONFLICT` and "Setup is already complete." when a user exists.

The token check comes first, so an unauthenticated caller cannot learn whether setup is done from this mutation, and cannot make the server hash passwords for free. `hasUsers` already reports that state publicly.

**`SetupResolver`**

```graphql
completeSetup(input: CompleteSetupInput!): Boolean!   # @Public()
```

`CompleteSetupInput` holds `token`, `name`, `email` and `password`. The email is trimmed and lower-cased. The name must not be blank, and the password must have at least 8 characters, better-auth's default minimum.

**Repository**

`UserRepository.createFirstAdmin(user, account)` runs in one transaction:

1. `SELECT pg_advisory_xact_lock(<fixed key>)`, so concurrent requests and replicas run one at a time.
2. Counts users, and refuses when any exist.
3. Creates the user with `emailVerified: true` and a `credential` account.
4. Creates the default organization with this user as `admin`, plus the default project when `QUARRY_DEFAULT_PROJECT_PATH` is set. This reuses the logic of `OrganizationRepository.initializeDefaultOrganizationForFirstUser`, changed to accept a transaction client.

### `AuthService`

- `emailAndPassword.disableSignUp` is always `true`. `shouldDisableEmailSignUp` and `refreshAuthAfterInitialSignup` are removed.
- `databaseHooks.user.create.before` always throws `APIError('FORBIDDEN', 'Accounts are created by an admin.')`. `completeSetup` and the seed use `UserRepository` directly, so they are not affected. Sign-up through better-auth is the only path this blocks.
- `databaseHooks.user.create.after` and `UserOnboardingService` are removed, along with `OrganizationRepository.addUserToDefaultProjectIfExists`, which only that service called.
- Account linking stays, so an existing user can still sign in with Google, GitHub or GitLab on a matching email.

### Config

- `ENABLE_USER_SIGNUP` is removed from `config/env.ts`, `env.spec.ts` and `.env.example`.
- `PublicConfig.enableUserSignup` and `SystemService.isUserSignupAvailable` are removed.
- `DEFAULT_USER_ROLE` is removed if nothing else reads it after these changes. The next spec chooses roles explicitly.

## Frontend

### `/setup` route

A top-level `routes/setup.tsx` with its page in `feature/auth/setup-page.tsx`, styled like the login page. One screen with four fields: setup token, name, email and password. The token field's help text says where to find it: "Printed in the server logs when quarry starts."

On success the page calls `signIn.email` with the same credentials and goes to `/`.

Errors:

| Case                                     | Result                                                              |
| ---------------------------------------- | ------------------------------------------------------------------- |
| Wrong token                              | Inline error on the token field. The other fields keep their values |
| `CONFLICT`, someone else got there first | Redirect to `/login`                                                |
| Validation failure                       | Inline error on the field                                           |
| Admin created but sign-in fails          | Redirect to `/login`, since the account exists                      |

### Redirects

The `beforeLoad` of `_protected` and `_public` read `hasUsers` through a small `lib/setup-status.ts`:

| State                     | Route                   | Result                          |
| ------------------------- | ----------------------- | ------------------------------- |
| No users                  | `_protected`, `_public` | Redirect to `/setup`            |
| Users exist               | `/setup`                | Redirect to `/login`            |
| Users exist and signed in | `/setup`                | `/login` then sends them to `/` |

- Once `hasUsers` returns `true` it is cached for the session, because it never goes back to `false` in normal use. `false` is never cached, so finishing setup takes effect immediately.
- If the `hasUsers` request fails, the guards behave as if users exist, matching `useAuthRoute` today. This stops an API outage from sending people to the wizard.
- `embed.*` and `shared-chat` are not guarded by this. They need a token or an existing share, and neither can exist on an empty install.

### Removed

- `routes/_public/signup.tsx` and `feature/auth/signup-page.tsx`, with its CSS module.
- The "Sign up" link in `login-page.tsx`, and the `/signup` branches in `use-auth-route.ts`, `use-session-or-navigate-to-index-page.tsx` and `lib/safe-redirect.ts`.
- `enableUserSignup` from `graphql/system.graphql` and the public config hook.
- The sign-up cases in `routes/-email-verification-flow.test.tsx`. The file is deleted if nothing else in it applies.

## Tests

**API (`apps/api/test/setup.e2e-spec.ts`), on an empty test database:**

- A wrong token is refused and creates nothing.
- The right token creates the user as org `admin`, and that user can sign in.
- A second `completeSetup` with the right token returns `CONFLICT`.
- Two concurrent `completeSetup` calls create exactly one user.
- `POST /api/auth/sign-up/email` is refused both before and after setup.
- The `user.create.before` hook refuses creation, which covers first-time social sign-in.
- A user with an existing account can still sign in after sign-up is closed.

**Unit (`setup-token.spec.ts`, `setup.service.spec.ts`):** the token is stable for one secret and differs between secrets. A token of the wrong length is refused. Startup logs the token only when no users exist.

**Existing e2e specs:** 14 files sign users up through `/api/auth/sign-up/email` with `ENABLE_USER_SIGNUP=true`. They move to a `createTestUser(app, { name, email, password })` helper in `test/test-app.ts`, which creates the user through `UserRepository` and signs in through the real endpoint. Their assertions do not change.

**Frontend:** a unit test for the redirect rules in `lib/setup-status.ts`. A Playwright flow runs through the wizard against a separate empty database, using `E2E_BASE_URL` and a second API instance, and it is skipped when that instance is not configured. The existing `flows.spec.ts` keeps running against the seeded database, where it also proves the wizard stays out of the way.

## Docs

- `README.md`: replace "sign up (the first user becomes the admin)" with the wizard and where to find the token, for both `npm run dev:api` and the Docker logs.
- `.env.example`: remove `ENABLE_USER_SIGNUP`, and note that `BETTER_AUTH_SECRET` also produces the setup token.
- `PLAN.md`: note the wizard and that public sign-up is gone.

## Out of scope

- The users page, creating accounts, per-project access, password resets and deactivation. These come next in their own spec. Until then, new users can only be added through the database, as they can be today.
- Setting up projects, warehouses or LLM keys in the wizard.
- Email delivery.
- Recovering a lost admin password.
