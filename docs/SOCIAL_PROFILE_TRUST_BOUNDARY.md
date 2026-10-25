# Social profile trust boundary — Issue #460 / PR #490

Project: Dungeon Veil, Supabase `hfndwqfghyomwapqsked` only.

## Candidate behavior and data impact

`20261025132500_harden_social_profile_trust_boundary.sql` removes authenticated
INSERT and table-wide UPDATE privileges on `profiles`, retains cosmetic
`display_name` / `avatar_key` updates, and ignores browser chapter/rank/stat JSON.
Existing RPC signatures remain available. Character selection and presence remain
writable through the actor-bound compatibility RPC.

The candidate also replaces **every existing** `current_chapter`, `current_rank`
and `public_stats` social projection with neutral values. This includes honestly
reported values: provenance cannot be recovered by inspecting magnitude alone.
It removes publicly displayed historical equipment and progression-derived
achievements until a trusted producer exists. It does not validate or restore a
trusted producer by itself. It does not edit cloud saves, inventory, reward rows,
friendships, guild membership or World Boss contribution records.

This is a deliberately lossy public projection reconciliation, not a claim that
all historical values were fraudulent. The migration is not approved for live
application merely because the SQL fixture passes. The verifier must compare
this strategy with Issue #460's legitimate-data preservation criterion.

## Required reconciliation and rollout evidence

Before integration approval, independently inspect actual writer/reader paths,
function signatures, grants, policies and the source of all historical values.
Before production application, preserve a recoverable pre-change snapshot of the
three projection columns keyed by profile ID in the project's approved private
backup system, and prove restoration access. Never place player rows, credentials
or database dumps in GitHub, test artifacts or the public site. Record snapshot
identity and aggregate affected-row counts without personal data. If a safe
snapshot cannot be established, park production application.

Apply only the independently accepted repository migration after merge, after a
fresh project-identity and migration-drift check. Re-read function definitions,
EXECUTE/table/column grants, RLS, representative authorized self/friend/guild
reads, denied unauthorized reads, security/performance advisors and relevant
logs. Keep Issue #460 open until these production checks succeed. No production
application or backup verification is claimed by this document.

## Recovery

Prefer a forward migration. Preserve the private snapshot for investigation;
do not restore its unverified fields into the trusted public projection or
restore arbitrary browser write authority. A later trusted producer may recover
only independently validated progression/equipment state. Cosmetic identity,
relationships and separate save/inventory data must remain intact.

## Test evidence

The disposable PostgreSQL-17 runner tests the exact migration, thirteen privilege,
identity, malicious-input, cosmetic and trusted-value assertions, and five reader
checks using the actual repository `get_social_profile_card` / `list_friends_v2`
definitions. Reader tests cover self, friend, guild peer, stranger, missing
identity and forged achievement/equipment exposure. SQL assertion failures raise
exceptions under ON_ERROR_STOP; an arbitrary database error cannot satisfy the
expected permission-denial probe. The CI receipt binds server version and output
to the tested source head.

Two local negative probes forced each fixed-search-path assertion false; both
exited with PostgreSQL status 3. This is harness validation, not independent
product acceptance. Four-device presentation evidence and independent verifier
acceptance remain separate Ready gates.
