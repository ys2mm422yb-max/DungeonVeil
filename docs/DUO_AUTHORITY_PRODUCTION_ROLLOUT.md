# Duo authority production rollout

This runbook applies only to Dungeon Veil project `hfndwqfghyomwapqsked` and only to the fixed target branch `fix/mobile-telegraphs-room-21-50-balance`. It does not authorize a rollout by itself.

## Safety contract

- The independent verifier must accept the unchanged exact target head before an apply run.
- `.github/workflows/duo-authority-production-rollout.yml` is the only supported production path for this cutover.
- `preflight` is read-only. `apply-and-verify` additionally requires the protected `dungeon-veil-production` environment, repository variable `DUNGEON_VEIL_PRODUCTION_ROLLOUT_ENABLED=true`, the exact confirmation string, and all required secrets.
- The workflow refuses any branch other than the fixed target and checks the full 40-character expected SHA against the checked-out commit.
- Supabase CLI is pinned and uses `db push`; it never edits `supabase_migrations.schema_migrations` directly and never uses `migration repair` or `--include-all`.
- The dry-run and pre/post migration lists must contain exactly the eight versions declared by `scripts/verify-duo-authority-production-plan.mjs`.

## Partial-apply recovery

Migration `20260911133000_trust_duo_encounter_completion.sql` is independently fail-closed: `service_role` has no direct ledger DML and cannot execute the private proof reader. Only the validated public recorder is executable. Migration 2 repeats the revokes idempotently.

If migration application stops after any version, do not rewrite remote history and do not run arbitrary SQL. Preserve the receipt, diagnose the failed repository migration, create a new repo-versioned forward-recovery migration if required, and obtain a new independent exact-head decision before resuming `db push`. Until the Edge function deploys, the authority path remains unavailable rather than falling back to client-owned completion.

If all migrations apply but Edge deployment fails, do not roll back migration history. Fix or retry only the independently diagnosed function deployment; the database boundary stays fail-closed.

## Post-apply proof

The workflow verifies the exact remote versions, deploys `duo-authority` with `verify_jwt=true`, and runs `scripts/duo-authority-production-smoke.mjs` with three dedicated, distinct test identities. The smoke proves:

- unauthenticated and nonmember rejection;
- exact server-owned binding for both active members;
- legitimate two-member bootstrap and intents;
- stale attempt/state, future state, actor-sequence gap, and replay behavior;
- idempotent terminal exit and cleanup.

The uploaded receipt contains no emails, passwords, access tokens, service keys, lobby IDs, or user IDs. After apply, independently re-read production functions, exact objects/grants, logs, and security/performance advisors before declaring the rollout complete.
