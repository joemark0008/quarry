# Skill builder design

## Goal

Let project admins create skills from the app, through a settings form or by asking the agent in chat. Today a skill can only be added by putting a Markdown file in `agent/skills/` on disk or committing it to the context repo.

**Success looks like:**

- On a default install (no git context), an admin creates a skill from the form or chat and can use it in the next message.
- On a git-backed project, the same action produces a change in the git panel, and the UI says the skill goes live after merge and pull.
- The agent can never save a skill by itself. A person always approves it.

## Decisions

| Decision           | Choice                                                   | Why                                                                                         |
| ------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Source of truth    | Markdown files in `agent/skills/`, no database table     | `load_skill`, the `/` picker and the system prompt keep working unchanged                   |
| Where Save writes  | Depends on the project (see Save modes)                  | Git context is off by default, and only the generic provider works until Phase 7            |
| Agent write access | None. `propose_skill` only shows a draft                 | Skills steer every later answer, and the agent reads untrusted warehouse data and documents |
| Who can save       | `admin` and `context_admin`                              | Same roles as the context explorer                                                          |
| Upstream           | Upstream has no builder, so this is new code, not a port | Reuse ported helpers where they exist                                                       |

## Save modes

The mode comes from `resolveContextExplorerGit`:

| Git resolution                         | Mode          | Create                                                  | Edit and delete                | When it goes live                 |
| -------------------------------------- | ------------- | ------------------------------------------------------- | ------------------------------ | --------------------------------- |
| Unavailable, reason `no-repo`          | `direct`      | Writes to the live `agent/skills/<name>.md`             | Skills page form               | Immediately                       |
| Available                              | `git`         | Writes to the user's worktree                           | Context explorer and git panel | After merge and live context pull |
| Unavailable, any other reason          | `unavailable` | Blocked, showing the existing guidance message          | Blocked                        | Never                             |
| Any, with `QUARRY_SKILL_AUTHORING=off` | `disabled`    | Blocked, saying this deployment manages skills as files | Blocked                        | Never                             |

A misconfigured git project is blocked rather than falling back to `direct`, because uncommitted files in a live checkout skip review and can conflict with the next pull.

`direct` mode has no version history. That is accepted, since these projects have no repo to record it in.

## Self-hosted deployments

Quarry is meant to be open source, so anyone may deploy it, and the builder cannot assume one setup.

| Deployment                                              | Behaviour                                                                                                                                       | Needs                                                                                |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Local or single container (`docker-compose.prod.yml`)   | `direct` mode. Skills persist in the existing `quarry_data` volume                                                                              | Nothing                                                                              |
| Git-managed context                                     | `git` mode                                                                                                                                      | `QUARRY_CONTEXT_SOURCE=git` and a project folder that is a clone of the context repo |
| Several replicas on a shared volume                     | `direct` mode. Other replicas see a new skill within about 5 seconds on their next run, even where file watch events don't arrive (such as NFS) | Shared volume at `QUARRY_PROJECTS_DIR`                                               |
| Several replicas with separate disks                    | Not safe for `direct` mode, since a skill would exist on one replica only                                                                       | Use git context, or set `QUARRY_SKILL_AUTHORING=off`                                 |
| Read-only context folder or policy against in-app edits | Form and Save disabled, with a clear message. Skills still load from files                                                                      | `QUARRY_SKILL_AUTHORING=off`                                                         |

`QUARRY_SKILL_AUTHORING` takes `auto` (default) or `off`, validated in `config/env.ts` and listed in `.env.example` and the README's variable table.

A failed write (read-only volume, permissions, full disk) returns a plain message that masks the project path, as `toLoadErrorMessage` does, because project members must not see server paths.

## Backend

### `context-explorer/files/context-files.ts`

Add `createContextFile(filePath, content, root)`:

- Resolves the path with `resolveAndValidatePath` and creates missing parent folders after `assertNoSymlinkInWritePath`.
- Writes with `writeFileAtomically`. `beforeRename` throws a conflict error if the target exists, so a file is never overwritten.
- Export `hashContent` for the skills module.

### `ContextExplorerService`

Add `resolveWriteTarget(project, user)`, returning `{ mode: 'direct', root }`, `{ mode: 'git', root }` (the worktree project root), `{ mode: 'unavailable', message }` or `{ mode: 'disabled', message }`. All git logic stays in this module.

### `SkillService`: keep skills fresh without relying on the watcher

`initializeSkills` returns early once a project is known, and no watcher is created if `agent/skills/` was missing at first load. So the first skill in a new project is never picked up, including one arriving through a live context pull. Watch events also don't reach other replicas on network volumes.

- In `initializeSkills`, if the project is known and its last load is over 5 seconds old: reload from disk, and start the watcher if there is none and the folder now exists. It runs before every agent run and skill query, so all arrival paths and replicas are covered.
- The watcher stays, as the fast path on a local disk.
- Add a public `reloadSkills(projectId)`. `direct` writes call it so the result does not wait for the 2-second debounce.

### New `SkillAuthoringService` (`skills/skill-authoring.service.ts`)

Holds validation and file content. Resolvers stay thin, and there is no Prisma, so no repository.

**Validation (`skills/skill-input.ts`), shared by the mutations and `propose_skill`:**

- `name`: `^[a-z0-9][a-z0-9-]{0,62}$`. The file is always `agent/skills/<name>.md`, and the path is only ever built on the server from a validated name.
- `name` must not match a built-in skill (`excel`, `pdf`, `skill-creator`). Deliberate shadowing is still possible by editing files.
- `name` must not match a skill in the live catalog, or a file already at the target path.
- `description`: 1 to 1,024 characters, trimmed.
- `body`: 1 character up to `MAX_CONTEXT_FILE_SIZE`, trimmed.

**File content:** built with `matter.stringify` from `gray-matter`, so YAML special characters in a description are escaped.

**Operations:**

- `create`: resolves the mode, writes, and calls `reloadSkills` in `direct` mode.
- `update` (`direct` only): takes `expectedHash`, keeps any other front matter keys, cannot rename. A file that fails to parse is refused with a pointer to the load errors.
- `delete` (`direct` only): takes `expectedHash`.
- `update` and `delete` return `FORBIDDEN` with guidance in other modes.

### GraphQL (`SkillsResolver`)

Typed `@InputType`s, not JSON. All new fields use `@ProjectContextAdmin()`.

| Field                         | Returns                             |
| ----------------------------- | ----------------------------------- |
| `skillSaveMode` query         | `{ mode, message }`                 |
| `skillDetail(name)` query     | `{ name, description, body, hash }` |
| `createSkill(input)` mutation | `{ name, location, mode }`          |
| `updateSkill(input)` mutation | `{ name, hash }`                    |
| `deleteSkill(input)` mutation | `Boolean`                           |

Widen `skillCatalog` and `skillLoadErrors` from `@ProjectAdmin()` to `@ProjectContextAdmin()`. Context admins can already read these files in the explorer.

`SkillsModule` will need `ContextExplorerService`. If that creates a module cycle, move `resolveWriteTarget` into a small exported provider rather than using `forwardRef`.

### `propose_skill` tool

- **Files:** `shared/src/tools/propose-skill.ts`, `agent/tools/propose-skill.ts`, registered in `tools/index.ts`.
- **Input:** `name`, `description`, `body`.
- **Execute:** no side effects. Runs the format checks from `skill-input.ts` and returns `{ success: true }`, or an error the agent can correct. It never writes.
- **Model output:** "Draft shown to the user. Stop and wait for their reply."
- **Availability:** interactive chats only. Left out of automations, story refresh, the recommendations profile and subagents, where no one could approve it.

### `skill-creator` built-in skill

`agent/skills/skill-creator.skill.tsx`, added to `INTERNAL_SKILLS`. It tells the agent to:

- Draft from what worked in the current conversation, including query tools used.
- Write a description that says when to use the skill, since that decides whether it loads.
- Use short numbered steps, and name query tools rather than pasting SQL they already cover.
- Finish by calling `propose_skill`, and never claim the skill is saved until the user confirms.

The system prompt only lists built-in skills when `load_skill` is present, which holds for interactive chats.

## Frontend

### Skills settings page

Route `/settings/project/skills`, with a thin route file and `feature/settings/skills-page.tsx`, following query tools. Add it to `lib/navigation.ts`, `settings-search-index.ts`, `use-settings-search.ts` and `e2e/routes.ts`. Built with Mantine and CSS Modules per `docs/frontend-design.md`.

- **List:** name, description, and load errors from `skillCatalog` and `skillLoadErrors`.
- **New skill form:** name, description (helper text explains it decides when the agent uses the skill), and Markdown body. Server validation errors show on their fields.
- **`direct` mode:** rows have Edit and Delete. Delete asks for confirmation. A hash conflict shows "This skill changed, reload it".
- **`git` mode:** after Save, a notice says the skill goes live after merge and pull, with a link to the git panel. Editing links to the context explorer for skills in the live catalog. New uncommitted skills are not listed, because the catalog reads the live folder.
- **`unavailable` mode:** the form is disabled and shows the guidance message with its action link.
- **`disabled` mode:** the list stays visible, and the form is replaced by a message saying this deployment manages skills as files.

API calls go through a `lib/skill-api.ts` extension, with Apollo documents in `graphql/skills.graphql`, regenerated types and `schema.gql`.

### Chat approval card

`feature/chat/components/tool-calls/propose-skill.tsx`, registered in `tool-calls/index.tsx`.

- Shows the full draft, so the approver reads exactly what will be saved.
- **Edit** switches to inputs. **Save** calls `createSkill` with the fields as shown. **Discard** dismisses.
- Validation errors stay on the card, and the user can fix and retry.
- After Save or Discard, the card sends a user message such as `Saved the skill "churn-analysis".` through `queueOrSendMessage`. The answered state comes from that next message, as in `ClarificationToolCall`, so it survives a reload and the agent knows the outcome.
- In `git` mode, the saved state repeats the merge and pull notice.
- Members who can't save see the draft with Copy and a note to ask an admin. The role check in the UI is only for display; the mutation is the enforcement.
- In `unavailable` and `disabled` modes, the card shows the draft with Copy and the mode's message instead of Save, so the text can still be added to the repo by hand.

## Tests

Backend:

- `createContextFile`: creates parent folders, refuses to overwrite, refuses symlinks and paths outside the root.
- `SkillService`: a folder created after first load gets picked up and watched; a file added with no watch event appears after the 5-second reload.
- `QUARRY_SKILL_AUTHORING=off` blocks all three mutations; a failed write on a read-only folder returns a message with no server path.
- `SkillAuthoringService`: each mode; name, reserved-name and duplicate rejection; YAML special characters round-trip; `update` keeps extra front matter; hash conflicts; `update` and `delete` refused outside `direct`.
- `propose_skill`: writes nothing, reports format errors, absent from non-interactive tool sets.
- `skill-creator`: added to `internal-skills.spec.ts`.
- e2e (`apps/api/test`): each role against each mutation, including `viewer` and plain members being refused; create then `load_skill` returns the body in `direct` mode.

Frontend:

- Skills page in each mode, and card states (draft, edit, saved, discarded, error, no permission).
- `e2e/flows.spec.ts`: create a skill in the form, then find it in the `/` picker.

Verify with `npm run lint`, `npm test`, `npm run format:check` and `npm run test:e2e -w @quarry/frontend`.

## Out of scope

- Renaming skills, because Phase 6 grants are tied to names.
- Preloading and per-group access (Phase 6).
- Editing skill files in the context explorer on `direct` projects.
- A separate list of pending worktree skills in `git` mode. The git panel already shows them.
- Agent-initiated saves or edits of existing skills through `propose_skill`.

## Docs

Update `PHASES.md`, `PLAN.md` and the README's skills line. Add a README section for self-hosters covering the save modes, `QUARRY_SKILL_AUTHORING` and the replica rules above. Record in `docs/handoff.md` that `direct` mode writes skills to the live context folder without git.
