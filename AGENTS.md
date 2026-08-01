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

## Active operating model

Dungeon Veil uses exactly four regular ChatGPT automation roles, staggered hourly in `Europe/Berlin` so a new pass starts every 15 minutes:

1. **`:00` — Primary developer** (`worker: primary`) takes the highest-priority free product task, implements and tests the fix, maintains its PR, and may carry a fully accepted exact head through Ready, merge, and publication.
2. **`:15` — Secondary developer** (`worker: secondary`) works on an independent free product task. It must never overlap another live lease's PR, branch, files, or scope and must immediately select different free work when a scope is occupied.
3. **`:30` — Visual and asset scout** (`worker: visual`) opens and evaluates screenshots, videos, traces, and runtime evidence; tests the published player experience; audits available purchased assets; and implements isolated visual or asset improvements when the scope is free.
4. **`:45` — QA, merge, and publication verifier** (`worker: verifier`) diagnoses red gates, reviews threads and evidence, performs final exact-head acceptance, merges without auto-merge only when every gate is satisfied, retains branches, and verifies deployment.

Do not create a fifth regular worker unless concrete live evidence shows that it increases completed, conflict-free throughput. `worker: background` is reserved for explicitly separate coordination or migration work and is not a fifth scheduled product worker.

Codespaces is an optional targeted execution environment for heavy local builds, Playwright runs, or safe large edits. It is not an additional regular worker. A targeted Codespaces launcher uses `worker: primary` with a unique `launcher_run_id`, must read live leases first, and may work only inside its own non-overlapping lease.

Only a current, unexpired, exact-head overlapping lease blocks work. One running Action, deployment, media-download problem, or task-local external wait is not a global lock; every worker must select the next independent free operation when possible.

## Queue-drain contract

Each automation pass should process the complete currently free queue as far as its bounded run permits safely.

- Finishing, safely parking, or externally waiting on one task does not end a run when another independent task for that role is free.
- Rebuild the queue live before each new task from open product issues, PRs, reviews, exact-head Actions, roadmap state, deployments, evidence, and user comments.
- Issue #376 and roadmap #323 are coordination sources, not ordinary product tasks to close.
- Existing defective or red product PRs take priority over opening new backlog PRs.
- Avoid uncontrolled PR sprawl. When two or more independent product PRs are already waiting on external checks or evidence, prefer existing PRs, red gates, reviews, evidence, or safe independent work before opening another product PR.
- Each task has its own lease lifecycle. A lease must be terminal before the same worker switches to a different task.
- A running check for one task is not a global blocker.
- The user has granted standing permission for normal safe branch, implementation, test, commit, push, PR, Ready, merge, and publication steps. Do not ask for routine confirmation, but never bypass repository quality or safety rules.

A Codespaces launcher additionally reports:

```text
AUTOPILOT_TASK_STATUS: continue|completed|waiting_external|blocked_external|released
AUTOPILOT_QUEUE_STATUS: same_task|next_task|empty|globally_blocked|budget_exhausted
AUTOPILOT_NEXT: concrete next operation
```

## Worker coordination

Use the lease protocol from Issue #376. A run must never end with its own lease still `active`.

Allowed worker values are:

- `primary`
- `secondary`
- `visual`
- `verifier`
- `background` only for explicitly separate background coordination or migration work

Allowed terminal states are:

- `completed`
- `released`
- `waiting_external`
- `blocked_external`

Before every GitHub write, claim exactly one narrow lease, recheck the affected head after the claim, stay within the declared scope, and terminalize the lease at the end. Never hold more than one own active lease.

Only a current, unexpired, exact-head overlapping lease blocks work. Release stale, malformed, expired, or head-stale locks only after live verification.

## Quality and merge rules

- A known defect, rejecting user report, unresolved review requirement, or unmet issue criterion blocks Ready and merge even when automated checks are green.
- Do not weaken assertions, coverage, thresholds, timeouts, or Playwright configuration.
- Playwright retries remain `0`.
- UI, gameplay, and runtime acceptance use only the four supported mobile portrait projects.
- Evidence must follow Issue #366: small, separate, and hash-deduplicated.
- Before Ready or merge, verify the unchanged exact head, base branch, mergeability, reviews, threads, required checks, artifacts, leases, and every task criterion.
- Actually open and inspect all relevant hash-distinct screenshots, videos, traces, and runtime evidence before claiming visual acceptance.
- Merge only after all applicable Draft and Ready exact-head gates are green and no known blocker remains.
- Keep issues open until their complete Definition of Done is satisfied.
- After merge, verify the target-branch deployment and the fixed public test URL before claiming publication success.

## Safe implementation practices

- Prefer focused changes and preserve unrelated behavior.
- Never use temporary GitHub Actions workflows as patch transport.
- Remove temporary repair files and debugging artifacts before completion.
- For large file replacement, read the complete current file, verify blob SHA and head immediately before writing, then inspect the resulting diff and head.
- Run the narrowest relevant validation first, followed by repository typecheck/build and the task-specific checks required by GitHub.
- Do not force-push, reset, or overwrite another worker's commits.

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
