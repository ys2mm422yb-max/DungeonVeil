# Duo authority rollout audit

## Production read-only baseline — 2026-10-11

Project: `hfndwqfghyomwapqsked`

The pre-rollout audit queried aggregate metadata only. It made no production mutation and exposed no player identifiers.

| Check | Result |
| --- | ---: |
| Reward entitlement rows | 20 |
| Distinct room-clear groups | 10 |
| Groups without exactly two distinct members | 0 |
| Unclaimed entitlement rows | 0 |
| Non-contiguous room steps | 0 |
| Entitlements without matching lobby membership | 0 |
| Entitlement/lobby seed mismatches | 0 |
| Boss-loot rolls / choices | 0 / 0 |
| Boss rolls without a matching boss clear | 0 |
| Checkpoint rows / clear-marked rows | 4 / 2 |

Observed progression remains chapter 1, rooms 1–7. This independently matches the earlier audit history. There is no concrete impossible or exploit-derived record to reconcile, so the safe reconciliation decision is **no destructive cleanup**.

Before production rollout, repeat the same aggregate checks. If a concrete anomaly appears, quarantine only the exact impossible record set under a separately reviewed, repo-versioned recovery migration; never bulk-delete historical Duo data. After rollout, require legitimate two-member completion plus forged local `room_clear`, stale attempt and duplicate/replay adversarial journeys before release.
