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

psql "$database_url" -v ON_ERROR_STOP=1 -f "$fixture"
psql "$database_url" -v ON_ERROR_STOP=1 -f "$migration"
psql "$database_url" -v ON_ERROR_STOP=1 -f "$contract"
