# Block 19 – Worldboss rotation execution contract

Issue: #353

## Fixed branch contract

- Base branch: `fix/mobile-telegraphs-room-21-50-balance`
- Exact base at branch creation: `2b4a609eb7d5d813194ac09d2ec99aa5203394bc`
- Work branch: `feat/block-19-worldboss-rotation-v1`
- `main` is excluded.
- PR #315 remains untouched.
- No auto-merge and no automatic branch deletion.

## Required server contract

1. Supabase remains the server-authoritative source of truth.
2. Exactly one worldboss event is active for the current rotation week.
3. Rotation order is deterministic:
   - Der Aschenkönig
   - Der Schleierdrache
   - Der Tiefenwächter
   - Der Aschenkönig
4. Preferred boundary is Sunday 20:00 `Europe/Berlin`.
5. Rotation is atomic, idempotent and catch-up safe.
6. Repeated or delayed scheduler execution cannot create duplicate active events.
7. Contributions, attempts, hits, rankings and rewards remain event-scoped.
8. Participation, top-10 and victory rewards remain exactly-once claimable.
9. Direct client mutation remains blocked by RLS; no service-role credential enters the client.

## Required audit before implementation

- current live event rows and expired-active inconsistencies
- relevant tables, constraints, indexes and RLS policies
- event creation/expiration RPCs
- attempt reservation and hit submission RPCs
- reward grant/claim path
- scheduler or cron configuration
- frontend query, fallback and reconnect behavior
- existing migrations and tests

## Product requirements

Each boss must have distinct mechanics, visuals, DE/EN copy and reward identity:

- Aschenkönig: fire, burn pressure and safe zones
- Schleierdrache: shadow/poison breath, positioning phases and readable telegraphs
- Tiefenwächter: armor, summons, defensive phases and controlled add pressure

The active week, remaining time and boss identity must be readable on all required portrait devices. Touch targets remain at least 44 px. Landscape remains blocked. Playwright retries remain zero.

## Verification gates

- database tests: expiration, rotation, catch-up, idempotency and exactly one active event
- multi-week deterministic simulation
- reload, reconnect, expiry-during-open-view and repeated-tap coverage
- reward exactly-once coverage
- frontend coverage for all three boss variants in German and English
- iPhone/WebKit
- Android phone/Chromium
- iPad portrait/WebKit
- Android tablet portrait/Chromium
- Product Autopilot QA
- Full Game Regression
- Complete Runtime Evidence QA
- manual inspection of relevant screenshots, videos, traces and manifests

Merge is allowed only on one unchanged, fully green exact head. After merge, target-branch checks and the fixed public test link must be verified.