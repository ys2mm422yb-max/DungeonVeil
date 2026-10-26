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

Before neutralizing any public projection, the migration retains its original
chapter, rank and complete stats JSON in
`dungeon_veil_social_private.original_profile_claims`, keyed by profile ID.
Unknown JSON fields are preserved. This dedicated schema must remain outside the Data API exposed schema list. PUBLIC, anon, authenticated and service_role have neither schema
access nor table privileges; RLS is enabled with no client policy. Only the
privileged database operator can use it for reconciliation. There is no RPC or
public reader exposing the archive, and preservation does not establish truth.

The migration takes a writer-excluding lock and must execute in one transaction.
A failed preservation/reconciliation rolls back schema, data and privilege
changes together. ON CONFLICT DO NOTHING preserves the first snapshot. Only
newly archived profiles are neutralized; reapplication cannot erase a later
trusted projection. The archive follows auth-user deletion through ON DELETE
CASCADE, so deleted accounts do not leave orphaned archived claims.

This deliberately reduces public display completeness while preserving original
data privately, not a claim that all historical values were fraudulent. The
verifier must independently assess the strategy and privileges before approval.

## Required reconciliation and rollout evidence

Before integration approval, independently inspect actual writer/reader paths,
function signatures, grants, policies and the source of all historical values.
Before production application, verify the dedicated archive schema is absent or
matches the accepted definition, is not in the exposed schema list, and has no
unexpected inherited access. Verify the project's normal backup/restore readiness.
Apply the migration as one transaction; never execute its statements individually.
Afterward, verify aggregate archive row counts equal the pre-apply profile count,
original field fidelity and owner-only access without exporting player values.
Never place player rows, credentials or database dumps in GitHub, test artifacts
or the public site. If preservation or access checks fail, park application.

Apply only the independently accepted repository migration after merge, after a
fresh project-identity and migration-drift check. Re-read function definitions,
EXECUTE/table/column grants, RLS, representative authorized self/friend/guild
reads, denied unauthorized reads, security/performance advisors and relevant
logs. Keep Issue #460 open until these production checks succeed. No production
application or backup verification is claimed by this document.

## Production migration-history mapping

The accepted SQL was merged in commit
`37410dcf101414fb14cc00622523e9348cd1649b` at repository path
`supabase/migrations/20261025132500_harden_social_profile_trust_boundary.sql`.
Its SHA-256 is recorded and enforced by
`scripts/social-profile-production-history.json` and the permanent focused
contract test.

Supabase MCP `apply_migration` applied that exact SQL to project
`hfndwqfghyomwapqsked`, but the transport generates its own history version.
Production therefore records
`20261026113943_harden_social_profile_trust_boundary`. The reviewed repository
mapping is the durable reconciliation between those two identifiers. It is not
a second migration and does not assert that the SQL ran twice.

Do not rename or reapply the accepted migration, delete the generated production
record, edit `supabase_migrations.schema_migrations` directly, or run
`migration repair` merely to make the timestamps look identical. Any future
history repair requires its own live-state proof and independent review. The
mapping contract fails if the repository path, merged SQL hash, project ref,
live version or migration name changes silently.

## Recovery

Prefer a forward migration. Preserve the private archive for investigation;
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
exited with PostgreSQL status 3. Five additional preservation checks prove exact
historical fidelity for both malicious-looking and plausibly legitimate values,
unknown JSON preservation, reapply behavior, ACL/RLS and real access denial
(including BYPASSRLS service_role), and account-deletion cleanup. An injected
UPDATE failure proves full transactional rollback before the successful migration.
This is implementer evidence, not independent product acceptance. Four-device
presentation evidence and independent verifier acceptance remain Ready gates.

Additional local mutation probes deliberately exposed the archive and stripped an
unknown historical JSON field. Both were rejected by the preservation assertions.
They validate the new tests; they do not constitute independent acceptance.
