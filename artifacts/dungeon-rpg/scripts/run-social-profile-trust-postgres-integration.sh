#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
database_url="${SOCIAL_TRUST_DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5432/postgres}"
fixture="$repo_root/supabase/tests/social_profile_trust_boundary_fixture.sql"
migration="$repo_root/supabase/migrations/20261025132500_harden_social_profile_trust_boundary.sql"
contract="$repo_root/supabase/tests/social_profile_trust_boundary_integration.sql"

test -f "$fixture"
test -f "$migration"
test -f "$contract"

receipt_dir="${SOCIAL_TRUST_RECEIPT_DIR:-$(mktemp -d)}"
mkdir -p "$receipt_dir"
{
  echo "source_head=${SOCIAL_TRUST_SOURCE_HEAD:-local-uncommitted}"
  psql "$database_url" -X -v ON_ERROR_STOP=1 -Atc 'show server_version'
  psql "$database_url" -X -v ON_ERROR_STOP=1 -f "$fixture"
  psql "$database_url" -X -v ON_ERROR_STOP=1 -f "$repo_root/supabase/tests/social_profile_trust_boundary_rollback_setup.sql"
  if psql "$database_url" -X -v ON_ERROR_STOP=1 --single-transaction -f "$migration" > "$receipt_dir/rollback-probe.log" 2>&1; then
    echo 'ERROR: forced rollback probe unexpectedly succeeded'
    exit 1
  fi
  case "$(cat "$receipt_dir/rollback-probe.log")" in
    *'forced reconciliation rollback probe'*) ;;
    *) cat "$receipt_dir/rollback-probe.log"; echo 'ERROR: rollback probe failed for an unexpected reason'; exit 1 ;;
  esac
  psql "$database_url" -X -v ON_ERROR_STOP=1 -f "$repo_root/supabase/tests/social_profile_trust_boundary_rollback_check.sql"
  psql "$database_url" -X -v ON_ERROR_STOP=1 --single-transaction -f "$migration"
  psql "$database_url" -X -v ON_ERROR_STOP=1 -f "$contract"
  # Reapplication must retain the original archive and later trusted state.
  psql "$database_url" -X -v ON_ERROR_STOP=1 --single-transaction -f "$migration"
  psql "$database_url" -X -v ON_ERROR_STOP=1 -f "$repo_root/supabase/tests/social_profile_trust_boundary_preservation.sql"
  # Execute the actual versioned readers, not test reimplementations.
  sed -n '/^create function public.get_social_profile_card(/,/^\$\$;/p' \
    "$repo_root/supabase/migrations/20260716230000_expand_spectating_and_public_equipment.sql" \
    | sed 's/^create function /create or replace function /' \
    | psql "$database_url" -X -v ON_ERROR_STOP=1
  sed -n '/^create function public.list_friends_v2()/,/^\$\$;/p' \
    "$repo_root/supabase/migrations/20260716001000_add_friend_spectating_and_public_career_stats.sql" \
    | sed 's/^create function /create or replace function /' \
    | psql "$database_url" -X -v ON_ERROR_STOP=1
  psql "$database_url" -X -v ON_ERROR_STOP=1 -f "$repo_root/supabase/tests/social_profile_trust_boundary_readers.sql"
} 2>&1 | tee "$receipt_dir/postgres.log"
