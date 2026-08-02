# Dungeon Veil agent instructions

These instructions apply to the entire repository. GitHub is the source of truth when chat history, local files, issue text, pull-request text, reviews, checks, or deployments disagree.

## Repository and publication boundaries

- Repository: `ys2mm422yb-max/DungeonVeil`
- Only target, test, and publication branch: `fix/mobile-telegraphs-room-21-50-balance`
- Never change, target, merge into, or publish from `main`.
- Leave PR #315 untouched.
- Do not enable auto-merge.
- Do not delete branches automatically.
- Do not force-push, reset, or overwrite another worker's commits.
- Use only `https://ys2mm422yb-max.github.io/DungeonVeil/` as the public test URL.
- Replit and temporary GitHub Actions workflows used as patch transport are forbidden.

## Start every task from live GitHub state

1. Read Issue #376 completely, especially its body and newest comments.
2. Read the full task issue, linked PR, current user comments, reviews, review threads, checklists, exact-head Actions, artifacts, and deployments.
3. Check live worker leases before every write. Never overlap a leased issue, PR, branch, file set, or task scope.
4. Verify the current target-branch head before creating a focused branch.
5. Create new product work as a Draft PR against `fix/mobile-telegraphs-room-21-50-balance`.

Task-specific product, gameplay, visual, and acceptance requirements belong in the relevant issue, PR, review thread, or Issue #376 handoff.

## Active operating model: exactly two regular workers

Dungeon Veil uses exactly two regular ChatGPT automation roles in `Europe/Berlin`:

1. **`:00` — Master implementer** (`worker: primary`)
   - owns the highest-priority free product task;
   - implements, tests, commits, pushes, and maintains its PR;
   - generates and actually inspects required runtime and visual evidence;
   - may carry a fully accepted exact head through Ready, merge, and publication.
2. **`:30` — Master verifier** (`worker: verifier`)
   - verifies exact-head gates, reviews, threads, artifacts, and evidence;
   - may safely implement a focused correction when it does not overlap the primary lease;
   - performs final acceptance, Expected-Head merge without auto-merge, retains branches, and verifies publication.

There are no scheduled `secondary` or `visual` workers. Historical comments using those names are audit records only and do not authorize new leases or work. Do not create additional regular workers unless the user explicitly changes this operating model.

`worker: background` is permitted only for a short-lived, explicitly separate coordination or migration task. It is never a third scheduled product worker.

Codespaces is an optional execution environment, not an additional worker. A targeted Codespaces launcher uses `worker: primary`, has a unique `launcher_run_id`, and must obey the same non-overlapping lease rules.

## Mandatory progress model

Primary state machine:

`IMPLEMENTIEREN -> EXAKT-HEAD-TESTS -> EVIDENCE -> READY -> READY-GATES -> MERGE -> DEPLOY -> DONE`

Verifier state machine:

`VERIFY -> EVIDENCE -> READY-GATES -> MERGE -> DEPLOY -> DONE`

A worker may not merely report the same exact head, state, and blocker in three consecutive runs. It must take a new concrete action: fix the cause and create a new head, rerun a genuinely transient failed job, inspect missing evidence, safely park the task and continue independent work, or create a precise issue and focused fix when appropriate.

`waiting_external` is not a run-ending condition when independent work exists.

## Queue and WIP contract

Rebuild the live queue from open issues and comments, PRs, reviews and threads, roadmap #323, Issue #376, Actions, deployments, artifacts, user rejections, and self-discovered product defects.

Prioritize:

1. safety, data-loss, auth, build, deployment, and merge blockers;
2. red, cancelled, stale, or missing exact-head gates;
3. active PR defects, rejected user feedback, and unresolved reviews;
4. unfinished acceptance criteria in existing work;
5. visible UI, gameplay, mobile, enemy, boss, equipment, animation, and asset defects;
6. roadmap and remaining backlog;
7. safe tests, validators, evidence, and process improvements.

Across both workers, keep at most one actively modified or verified product PR plus one additional cleanly parked `waiting_external` PR. Do not open a third implementation PR while active work can continue.

## Worker coordination and leases

Use the lease protocol in Issue #376. Allowed new worker values are:

- `primary`
- `verifier`
- `background` only for explicit coordination or migration

Do not create new `secondary` or `visual` leases.

Before every GitHub write:

1. read all current leases;
2. reject any overlapping issue, PR, branch, file, or scope;
3. claim exactly one narrow exact-head lease;
4. re-read the affected head after the claim;
5. stay inside the declared scope;
6. never hold more than one own active lease;
7. terminalize the lease before the run ends.

Allowed terminal states are `completed`, `released`, `waiting_external`, and `blocked_external`.

Only a current, unexpired, exact-head overlapping lease blocks work. Historical, expired, malformed, or head-stale locks are not active after live verification.

## Durable handoff memory

Every active-task handoff in Issue #376 must include:

- `task_key`
- `state`
- `attempt`
- `exact_head`
- `last_completed_step`
- `next_executable_step`
- `artifact_ids`
- `known_good_runs`
- `blocker_class`
- `updated_at`

The next run resumes exactly at `next_executable_step`; it must not restart a broad audit. Local files are not durable memory. Artifact IDs, hashes, run IDs, PR state, and GitHub comments are durable memory.

## Failure classification and self-healing

Classify blockers as:

- `product`: reproducible code, test, workflow, data, UI, gameplay, or evidence defect; fix it or create a precise focused handoff
- `transient_tool`: container, network, DNS, cache, connector, or runtime failure; try two technically different methods, then perform other concrete work
- `external_wait`: unchanged running GitHub job or unavailable external resource; park it and continue elsewhere

Only `product` is a functional PR blocker. A transient tool failure must not be recorded as a permanent merge blocker.

When the same transient tool failure appears in two consecutive runs, create one deduplicated process issue and, when safely isolatable, a permanent workflow or evidence fix. Prefer small separate, directly inspectable media artifacts plus a manifest and hash list over difficult monolithic archives.

## Quality and merge rules

- A known defect, rejecting user report, unresolved review requirement, or unmet issue criterion blocks Ready and merge even when automated checks are green.
- Do not weaken assertions, coverage, thresholds, timeouts, acceptance criteria, or Playwright configuration.
- Playwright retries remain `0`.
- UI, gameplay, and runtime acceptance use only the four supported mobile portrait projects.
- Evidence follows Issue #366: small, separate, and SHA-256-deduplicated.
- Actually open and inspect all relevant hash-distinct screenshots, videos, traces, and runtime evidence before claiming visual acceptance.
- Before Ready or merge, verify the unchanged exact head, base branch, mergeability, reviews, threads, required checks, artifacts, leases, and every task criterion.
- Merge only after all applicable Draft and Ready exact-head gates are green and no known blocker remains.
- Use Expected-Head protection, never auto-merge, and keep the source branch.
- Keep issues open until their complete Definition of Done is satisfied.
- After merge, verify the target-branch commit and GitHub Pages deployment.

A browser, DNS, cache, network, or tool inability to open the public URL alone does not block merge when every exact-head gate is green, evidence is accepted, and the exact merged target commit has a successful Pages deployment. A failed, missing, or stale deployment remains a blocker.

## Safe implementation practices

- Prefer focused changes and preserve unrelated behavior.
- Remove temporary repair files and debugging artifacts before completion.
- For a complete file replacement, read the current file, verify its blob SHA and branch head immediately before writing, then inspect the resulting diff and new head.
- Run the narrowest relevant validation first, followed by repository typecheck/build and task-specific checks.
- Never overwrite another worker's commits or tests.

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
- Treat a Codespaces-provided `GITHUB_TOKEN` as ephemeral and never copy it elsewhere.
- If a secret is exposed, stop work, avoid repeating it, and document only that rotation is required—never the value.

## Codespaces

The canonical environment is `.devcontainer/devcontainer.json` with setup in `.devcontainer/postCreate.sh`.

- Keep the Codespace on the fixed target branch only long enough to create or switch to a focused work branch.
- Stop the Codespace after work to conserve included usage.
- Do not alter the development container in a way that weakens repository tests or bypasses required checks.
