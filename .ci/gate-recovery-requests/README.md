# Mandatory gate recovery

Use this path only for a mandatory GitHub Actions run that is stuck before repository execution: the workflow run is `queued` and its jobs endpoint reports `total_count: 0` / `jobs=[]`.

## Procedure

1. Keep the blocked product PR and its exact head unchanged. Do not use an empty commit, force-push, reset, branch deletion, auto-merge, or any test/acceptance weakening.
2. Confirm the blocked PR is open, Ready, based on `fix/mobile-telegraphs-room-21-50-balance`, and record its full 40-character exact head.
3. Confirm the original Full Game Regression and Complete Runtime Evidence QA runs are both `queued` on that exact head and both have zero jobs. A run that has any job, checkout, step, log, or artifact is not a pre-job zombie and must be diagnosed normally.
4. Create one JSON request under `.ci/gate-recovery-requests/` on a separate recovery/process branch derived from the current target. Never modify the blocked product branch. Include `pr_number`, `exact_head`, `blocked_fgr_run`, `blocked_complete_runtime_run`, and `requested_at`.
5. The permanent `Mandatory Gate Recovery Dispatcher` validates the PR/base/exact head, validates `queued + jobs=[]`, refuses a duplicate workflow-dispatch replacement on the same head, then dispatches:
   - Full Game Regression on the unchanged product ref with `full_evidence=true`.
   - Complete Runtime Evidence QA on the unchanged product ref with its existing four portrait projects.
6. The dispatcher writes a durable receipt to the blocked PR. Record the replacement run IDs and outcome in Issue #376. Do not issue a second replacement for the same zombie fingerprint.
7. A real repository/test failure in a replacement run is binding and must be diagnosed from its current logs/artifacts/evidence. A green replacement still requires the normal evidence review and fresh merge preflight.

`node scripts/validate-gate-recovery-contract.mjs` statically enforces the unchanged-head guard, zero-job classification, FGR full-evidence dispatch, four-device Complete Runtime coverage, durable receipt, and Playwright retries `0`.
