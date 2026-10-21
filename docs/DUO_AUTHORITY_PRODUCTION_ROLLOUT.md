# Duo authority production rollout

This runbook applies only to Dungeon Veil project `hfndwqfghyomwapqsked` and only to the fixed target branch `fix/mobile-telegraphs-room-21-50-balance`. It does not authorize a rollout by itself.

## Two-slice trust bootstrap

The rollout is intentionally split so unmerged pull-request code never receives production credentials.

1. **Bootstrap slice (PR #486):** installs only the permanent workflow, its secret-boundary contract, and this runbook. Its pull-request job checks out the exact PR head with persisted credentials disabled and runs only a static Node contract. It has no production environment and no Supabase secrets.
2. **Payload slice (follow-up PR):** carries the reviewed migrations, Edge function, production-history manifest, validators, smoke, and their complete security/integration tests. Its PR checks remain secretless. After that payload is independently accepted and merged, the already-trusted workflow on the fixed target branch receives the target-push event and runs the credentialed read-only production preflight.

The bootstrap-only files are deliberately absent from the workflow's `push.paths`. Merging the bootstrap cannot start a credentialed job. A later payload merge changes the explicitly listed production files and therefore triggers the trusted target preflight.

If the bootstrap workflow is not already present on the fixed target branch, no payload PR may merge. If the payload differs from its accepted exact head, verification restarts on the new head.

## Trigger and authorization contract

- The repository default branch is `main`, which must never be changed or used for Dungeon Veil delivery.
- `pull_request` executes only the secretless exact-head contract. It never mounts `dungeon-veil-production`, references Actions secrets, links Supabase, or executes a production command.
- Only `push` to `fix/mobile-telegraphs-room-21-50-balance` can run the credentialed rollout job.
- Target-push attempt 1 is always read-only and stops after exact migration-history validation and `db push --dry-run`.
- After the unchanged target commit and attempt-1 preflight are independently accepted, the verifier may create exactly one `<!-- dungeon-veil-production-authorization -->` comment in Issue #481. It must bind `worker: verifier`, terminal status, task key `issue461-production-rollout-authorization`, exact target SHA, exact existing workflow run ID, `workflow_run_attempt: 2`, `decision: accept`, `production_authorization: approved`, and `APPLY_ISSUE_461_TO_hfndwqfghyomwapqsked_AT_<sha>`.
- Only an intentional rerun of that exact target-push run can consume the authorization. Any other run, SHA, attempt, branch, or missing confirmation remains read-only.

## Safety contract

- The bootstrap slice contains no migrations, function bundle, history manifest, smoke identities, or production validator.
- The payload slice remains critical security work and must retain its full adaptive plan, migration/RLS/RPC/Edge contracts, Deno/PostgreSQL checks, historically binding browser checks, and independent exact-head decision.
- Production access exists only in the trusted target-push job. The job checks the full 40-character target SHA against `git rev-parse HEAD`, uses `persist-credentials: false`, and targets only `hfndwqfghyomwapqsked`.
- The repository's historical migration filenames and the reviewed 70-version production history have zero overlap. A repository-root `db push` is unsafe and must fail closed.
- The payload workflow uses pinned Supabase CLI, official `migration fetch --linked` in an isolated workdir, exactly eight explicitly copied migrations, exact-set validators, dry-run before apply, and no `migration repair`, `--include-all`, direct history edits, or arbitrary SQL.
- Production apply and Edge deployment remain impossible on attempt 1. Attempt 2 still requires the verifier-owned one-use authorization.

## Truthful evidence

The uploaded `workflow.json` derives `actual_sha` from the checked-out repository with `git rev-parse HEAD`; it never substitutes the pull-request merge ref. It also records:

- `result` as `pass` or `fail`;
- `failure_stage` for a failed job;
- project ref, expected SHA, actual SHA, event/ref, operation, authorization comment ID, run ID, and attempt.

Evidence must remain redacted. It must never contain tokens, passwords, keys, emails, user IDs, lobby IDs, or fetched migration SQL.

## Partial-apply recovery

The payload migration `20260911133000_trust_duo_encounter_completion.sql` must remain independently fail-closed: `service_role` has no direct ledger DML and cannot execute the private proof reader. Migration 2 repeats the revokes idempotently.

If migration application stops after any version, do not rewrite remote history and do not run arbitrary SQL. Preserve the receipt, re-fetch production history into a new isolated workdir, diagnose the failed repository migration, create a repo-versioned forward-recovery migration if required, and obtain a new independent exact-head decision before resuming.

If all migrations apply but Edge deployment fails, do not roll back migration history. Fix or retry only the independently diagnosed function deployment; the database boundary stays fail-closed.

## Post-apply proof

The authorized workflow verifies all exact remote versions, deploys `duo-authority` with `verify_jwt=true`, and runs the three-identity adversarial smoke. After apply, independently re-read production functions, objects/grants, logs, and security/performance advisors before declaring the rollout complete.
