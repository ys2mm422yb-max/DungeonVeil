# Dungeon Veil agent instructions

These instructions apply to the entire repository. GitHub is the source of truth when chat history, local files, issue text, pull-request text, reviews, checks, or deployments disagree.

## Repository and publication boundaries

- Repository: `ys2mm422yb-max/DungeonVeil`
- Only target, test, and publication branch: `fix/mobile-telegraphs-room-21-50-balance`
- Never change, target, merge into, or publish from `main`.
- Leave PR #315 untouched.
- Do not enable auto-merge.
- Do not delete branches automatically.
- Use only the public test URL already documented in Issue #376.
- Replit is forbidden for this repository.

## Start every task from live GitHub state

1. Read Issue #376 completely, including its newest comments.
2. Read the full task issue, linked PR, current user comments, reviews, review threads, checklists, and exact-head Actions.
3. Check for live worker leases before writing. Never overlap a leased issue, PR, branch, file set, or task scope.
4. Verify the current target-branch head before creating a focused branch.
5. Create new product work as a Draft PR against `fix/mobile-telegraphs-room-21-50-balance`.

Task-specific product, gameplay, visual, and acceptance requirements belong in the relevant GitHub issue, PR, review thread, or Issue #376 handoff. Do not permanently add task-specific requirements to this file.

## Worker coordination

Use the lease protocol from Issue #376. A run must never end with its own lease still `active`.

Allowed terminal states are:

- `completed`
- `released`
- `waiting_external`
- `blocked_external`

Only a current, unexpired, exact-head overlapping lease blocks work. Release stale, malformed, expired, or head-stale locks only after live verification.

## Quality and merge rules

- A known defect, rejecting user report, unresolved review requirement, or unmet issue criterion blocks Ready and merge even when automated checks are green.
- Do not weaken assertions, coverage, thresholds, timeouts, or Playwright configuration.
- Playwright retries remain `0`.
- UI, gameplay, and runtime acceptance use only the four supported mobile portrait projects.
- Evidence must follow Issue #366: small, separate, and hash-deduplicated.
- Before Ready or merge, verify the unchanged exact head, base branch, mergeability, reviews, threads, required checks, artifacts, leases, and every task criterion.
- Merge only after all applicable Draft and Ready exact-head gates are green and no known blocker remains.
- Keep issues open until their complete Definition of Done is satisfied.

## Safe implementation practices

- Prefer focused changes and preserve unrelated behavior.
- Never use temporary GitHub Actions workflows as patch transport.
- Remove temporary repair files and debugging artifacts before completion.
- For large file replacement, read the complete current file, verify blob SHA and head immediately before writing, then inspect the resulting diff and head.
- Run the narrowest relevant validation first, followed by repository typecheck/build and the task-specific checks required by GitHub.

Common commands from the repository root:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm --filter @workspace/dungeon-rpg dev
```

Run additional audit and Playwright commands exactly as required by the active issue and existing workflows. Do not substitute weaker checks.

## Secrets and authentication

- Never commit, print, paste into prompts, or place in issues/PRs any password, token, API key, private key, service-role key, refresh token, or session credential.
- Use GitHub Codespaces secrets for interactive development and GitHub Actions secrets for workflows. They are separate stores.
- Codex should sign in with the user's ChatGPT account. Do not require or create `OPENAI_API_KEY` for that flow.
- Do not commit real `.env` files. Commit example templates only with placeholder values.
- Treat the Codespaces-provided `GITHUB_TOKEN` as ephemeral and never copy it elsewhere.
- If a secret is exposed, stop work, avoid repeating it, and document only that rotation is required—never the value.

## Codespaces

The canonical environment is `.devcontainer/devcontainer.json` with setup in `.devcontainer/postCreate.sh`.

- Keep the Codespace on the fixed target branch only long enough to create or switch to a focused work branch.
- Stop the Codespace after work to conserve included usage.
- Do not alter the development container in a way that weakens repository tests or bypasses required checks.
