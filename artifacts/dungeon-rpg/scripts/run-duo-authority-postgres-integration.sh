#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
bootstrap_migration="$repo_root/supabase/migrations/20261003052000_add_duo_authority_bootstrap.sql"
completion_migration="$repo_root/supabase/migrations/20261003142500_connect_duo_authority_completion.sql"
fixture="$repo_root/supabase/tests/duo_authority_bootstrap_fixture.sql"
contract="$repo_root/supabase/tests/duo_authority_bootstrap_integration.sql"
receipt_dir="${DUO_AUTHORITY_RECEIPT_DIR:-$repo_root/duo-authority-postgres-receipt}"
database_url="${DUO_AUTHORITY_DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:5432/postgres}"

mkdir -p "$receipt_dir"
test -f "$bootstrap_migration"
test -f "$completion_migration"
test -f "$fixture"
test -f "$contract"

rollback_db="duo_authority_rollback_${GITHUB_RUN_ID:-local}_${GITHUB_RUN_ATTEMPT:-1}"
rollback_db="${rollback_db//[^A-Za-z0-9_]/_}"
trap 'dropdb --if-exists --force --maintenance-db="$database_url" "$rollback_db" >/dev/null 2>&1 || true' EXIT

createdb --maintenance-db="$database_url" "$rollback_db"
rollback_url="${database_url%/*}/$rollback_db"
psql "$rollback_url" -v ON_ERROR_STOP=1 -f "$fixture" > "$receipt_dir/rollback-fixture.log"
{
  printf 'begin;\n'
  cat "$bootstrap_migration"
  printf '\n'
  cat "$completion_migration"
  printf '\nrollback;\n'
} | psql "$rollback_url" -v ON_ERROR_STOP=1 > "$receipt_dir/rollback-apply.log"
psql "$rollback_url" -v ON_ERROR_STOP=1 -Atc \
  "select to_regclass('private.coop_authority_runs') is null" | grep -qx t
psql "$rollback_url" -v ON_ERROR_STOP=1 -f "$bootstrap_migration" > "$receipt_dir/recovery-bootstrap-apply.log"
psql "$rollback_url" -v ON_ERROR_STOP=1 -f "$completion_migration" > "$receipt_dir/recovery-completion-apply.log"
psql "$rollback_url" -v ON_ERROR_STOP=1 -Atc \
  "select to_regclass('private.coop_authority_runs') is not null" | grep -qx t

psql "$database_url" -v ON_ERROR_STOP=1 -f "$fixture" > "$receipt_dir/fixture.log"
psql "$database_url" -v ON_ERROR_STOP=1 -f "$bootstrap_migration" > "$receipt_dir/bootstrap-migration-apply.log"
psql "$database_url" -v ON_ERROR_STOP=1 -f "$completion_migration" > "$receipt_dir/completion-migration-apply.log"
psql "$database_url" -v ON_ERROR_STOP=1 -f "$contract" 2>&1 | tee "$receipt_dir/test-output.tap"

REPO_ROOT="$repo_root" node - "$receipt_dir/receipt.json" <<'NODE'
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const output = process.argv[2];
const root = process.env.REPO_ROOT;
const files = [
  'supabase/migrations/20261003052000_add_duo_authority_bootstrap.sql',
  'supabase/migrations/20261003142500_connect_duo_authority_completion.sql',
  'supabase/tests/duo_authority_bootstrap_fixture.sql',
  'supabase/tests/duo_authority_bootstrap_integration.sql',
];
const hashes = Object.fromEntries(files.map(file => {
  const bytes = fs.readFileSync(path.join(root, file));
  return [file, crypto.createHash('sha256').update(bytes).digest('hex')];
}));
fs.writeFileSync(output, JSON.stringify({
  source_head: process.env.DUO_AUTHORITY_SOURCE_HEAD || process.env.GITHUB_SHA || 'local',
  workflow_run_id: process.env.GITHUB_RUN_ID || 'local',
  workflow_run_attempt: process.env.GITHUB_RUN_ATTEMPT || '1',
  postgres_version: process.env.DUO_AUTHORITY_POSTGRES_VERSION || '17',
  result: 'executed_pass',
  rollback_recovery: 'pass',
  hashes,
}, null, 2) + '\n');
NODE
