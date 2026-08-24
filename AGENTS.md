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

Dungeon Veil uses exactly two regular ChatGPT automation roles in `Europe/Berlin`. Their actual enabled schedules are external automation state and must be read live; do not hard-code clock times here or infer them from historical comments.

1. **Master implementer** (`worker: primary`)
   - owns the highest-priority free product task;
   - implements, tests, commits, pushes, and maintains its PR;
   - generates and actually inspects required runtime and visual evidence;
   - may carry a fully accepted exact head through Ready, merge, and publication.
2. **Master verifier** (`worker: verifier`)
   - verifies exact-head gates, reviews, threads, artifacts, and evidence;
   - may safely implement a focused correction when it does not overlap the primary lease;
   - performs final acceptance, Expected-Head merge without auto-merge, retains branches, and verifies publication.

The actual enabled automation configuration is authoritative for execution times. If repository text and live automation state disagree only about schedule, correct the stale documentation; do not change worker scope or create an extra regular worker just to match an old clock time.

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

## Adaptive test-plan contract

The canonical policy is `docs/ADAPTIVE_TEST_POLICY.md`. Every new PR except protected historical PR #315 must use the structured block in `.github/PULL_REQUEST_TEMPLATE.md`.

The implementer must choose and document the smallest sufficient exact-head matrix based on the actual diff, issue acceptance criteria, affected data flow, prior failures, and plausible regressions. It must record:

- risk level: `low`, `medium`, `high`, or `critical`;
- affected domains, files, modes, menus, rooms, states, devices, and browsers;
- a concrete proof mapping for every acceptance criterion;
- selected checks and evidence with technical reasons;
- every omitted broad check with a technical non-impact reason;
- escalation triggers that expand the matrix when assumptions fail.

Adaptive testing never permits weakening or skipping a relevant requirement. A red, cancelled, stale, or missing relevant check cannot be dismissed as irrelevant after it fails. Explicit issue, review, or user-required checks remain mandatory.

Use these defaults:

- `low`: docs/process/non-executable metadata — focused structure or contract validation; no browser or gameplay evidence without executable impact;
- `medium`: localized nonvisual code — focused unit/contract checks plus TypeScript/build where applicable;
- `high`: visible UI, interaction, gameplay, animation, assets, touch, layout, or renderer behavior — focused journeys and compact evidence; all four portrait projects whenever browser, touch, layout, WebGL, renderer, or gameplay differences can matter;
- `critical`: auth/security, Supabase/RLS/RPC, persistence/cloud, economy/rewards, multiplayer/reconnect, world-boss rotation, shared navigation, renderer/WebGL lifecycle, global registries/spawns, deployment, or central workflows — full relevant integration, recovery, idempotency, exact-head, and cross-device gates.

A run test is required only when the change is visible or functional during a run or creates a plausible run regression. Choose exact menus, rooms, states, and devices that prove the changed contract instead of generating a generic game tour.

Evidence must be small, separate, manifest-backed, SHA-256-deduplicated, and directly tied to acceptance criteria. Open every relevant hash-distinct item before visual acceptance.

The verifier independently reviews the diff and test plan. It must mark the plan `accepted` or `expanded`, and must expand or reject any plan that understates risk, omits a criterion, uses irrelevant evidence, or attempts to bypass a relevant failure.

The maintained validator `scripts/validate-adaptive-test-plan.mjs` and its permanent pull-request workflow enforce the policy structure. Do not bypass or weaken them.

## Quality and merge rules

- A known defect, rejecting user report, unresolved review requirement, or unmet issue criterion blocks Ready and merge even when automated checks are green.
- Do not weaken assertions, coverage, thresholds, timeouts, acceptance criteria, or Playwright configuration.
- Playwright retries remain `0`.
- UI, gameplay, and runtime acceptance use only the four supported mobile portrait projects when those surfaces are affected or can differ across engines/devices.
- Evidence follows Issue #366: small, separate, and SHA-256-deduplicated.
- Actually open and inspect all relevant hash-distinct screenshots, videos, traces, and runtime evidence before claiming visual acceptance.
- Before Ready or merge, verify the unchanged exact head, base branch, mergeability, reviews, threads, adaptive test-plan validity, selected and otherwise applicable required checks, artifacts, leases, and every task criterion.
- Merge only after all applicable Draft and Ready exact-head gates are green and no known blocker remains.
- Use Expected-Head protection, never auto-merge, and keep the source branch.
- Keep issues open until their complete Definition of Done is satisfied.
- After merge, verify the target-branch commit and GitHub Pages deployment.

A browser, DNS, cache, network, or tool inability to open the public URL alone does not block merge when every exact-head gate is green, evidence is accepted, and the exact merged target commit has a successful Pages deployment. A failed, missing, or stale deployment remains a blocker.

## Safe implementation practices

- Prefer focused changes and preserve unrelated behavior.
- Remove temporary repair files and debugging artifacts before completion.
- For a complete file replacement, read the current file, verify its blob SHA and branch head immediately before writing, then inspect the resulting diff and new head.
- Run the narrowest relevant validation first, followed by the additional checks selected by the adaptive test plan.
- Never overwrite another worker's commits or tests.

Common commands from the repository root:

```bash
pnpm install --frozen-lockfile
pnpm run audit:adaptive-test-policy
pnpm typecheck
pnpm build
pnpm --filter @workspace/dungeon-rpg dev
```

Run additional audit and Playwright commands exactly as required by the active issue and adaptive test plan. Do not substitute weaker checks.

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
