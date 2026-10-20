# Duo authority production rollout

This runbook applies only to Dungeon Veil project `hfndwqfghyomwapqsked` and only to the fixed target branch `fix/mobile-telegraphs-room-21-50-balance`. It does not authorize a rollout by itself.

## Executable trigger and authorization contract

- The repository default branch is `main`, which must never be changed or used for Dungeon Veil delivery. A target-only `workflow_dispatch` workflow is therefore not a valid entrypoint.
- The permanent workflow uses two real target paths instead:
  - a same-repository `pull_request` event targeting the fixed branch runs read-only preflight for the exact PR head;
  - the eventual `push` to the fixed target runs read-only preflight for the exact target commit.
- Pull requests from forks are rejected before any job receives production secrets.
- First attempts are always read-only. No push can apply migrations or deploy a function on its initial run.
- After the unchanged target commit and its first-attempt preflight are independently accepted, the verifier may create exactly one `<!-- dungeon-veil-production-authorization -->` comment in Issue #481. It must bind `worker: verifier`, terminal status, task key `issue461-production-rollout-authorization`, the exact target SHA, the exact existing workflow run ID, `workflow_run_attempt: 2`, `decision: accept`, `production_authorization: approved`, and `APPLY_ISSUE_461_TO_hfndwqfghyomwapqsked_AT_<sha>`.
- Only an intentional rerun of that exact target push run can consume the authorization. The comment cannot authorize a PR event, another SHA, another run ID, attempt 1, or attempt 3+.
- Without the exact one-use authorization, every run remains a read-only preflight.
- The protected `dungeon-veil-production` environment and required secrets remain mandatory for preflight and apply.

## Safety contract

- The independent verifier must accept the unchanged exact target head before an apply run.
- `.github/workflows/duo-authority-production-rollout.yml` is the only supported production path for this cutover.
- The workflow refuses any branch other than the fixed target/base and checks the full 40-character exact SHA against the checked-out commit.
- The repository's historical migration filenames and the 70-version production history have zero version overlap. A normal repository-root `db push` is therefore explicitly unsafe and must fail closed.
- The reviewed production baseline is committed in `scripts/duo-authority-production-history.json`. Any live count, version, ordering, or tail drift requires a new repository head and independent review.
- Supabase CLI is pinned. The workflow first proves the repository-root history is blocked, then uses the official read-only `migration fetch --linked` command in a fresh temporary workdir to materialize the exact live history.
- Only the eight migration files declared by `scripts/verify-duo-authority-production-plan.mjs` are copied explicitly into that isolated workdir. Both dry-run and apply run there; the repository root is never pushed.
- The workflow never edits `supabase_migrations.schema_migrations` directly and never uses `migration repair`, `--include-all`, or arbitrary SQL as a history workaround.
- The fetched SQL files are temporary and are never uploaded as evidence. Only redacted migration-list and dry-run receipts are retained.
- The fetched, pre-apply, dry-run, and post-apply validators require exact complete sets: 70 live versions before staging, 70 preserved plus exactly eight pending versions, and 78 matching local/remote versions after apply.

## Preflight evidence

The first-attempt receipt proves the real GitHub trigger path, event name, exact checked-out head, fixed target/base, operation `preflight`, run ID and attempt. A PR preflight is evidence that the target-scoped workflow is accepted and executable; the target push preflight must still be independently consumed before any production authorization.

## Partial-apply recovery

Migration `20260911133000_trust_duo_encounter_completion.sql` is independently fail-closed: `service_role` has no direct ledger DML and cannot execute the private proof reader. Only the validated public recorder is executable. Migration 2 repeats the revokes idempotently.

If migration application stops after any version, do not rewrite remote history and do not run arbitrary SQL. Preserve the receipt, re-fetch production history into a new isolated workdir, diagnose the failed repository migration, create a new repo-versioned forward-recovery migration if required, and obtain a new independent exact-head decision before resuming `db push`. Until the Edge function deploys, the authority path remains unavailable rather than falling back to client-owned completion.

If all migrations apply but Edge deployment fails, do not roll back migration history. Fix or retry only the independently diagnosed function deployment; the database boundary stays fail-closed.

## Post-apply proof

The workflow verifies the exact remote versions, deploys `duo-authority` with `verify_jwt=true`, and runs `scripts/duo-authority-production-smoke.mjs` with three dedicated, distinct test identities. The smoke proves:

- unauthenticated and nonmember rejection;
- exact server-owned binding for both active members;
- legitimate two-member bootstrap and intents;
- exact-payload stale state, future state, future attempt, actor-sequence gap, and replay rejection;
- idempotent terminal exit, rejection of the now-genuinely-stale closed attempt, and empty authenticated member bindings for both players.

The uploaded receipt contains no emails, passwords, access tokens, service keys, lobby IDs, or user IDs. After apply, independently re-read production functions, exact objects/grants, logs, and security/performance advisors before declaring the rollout complete.
