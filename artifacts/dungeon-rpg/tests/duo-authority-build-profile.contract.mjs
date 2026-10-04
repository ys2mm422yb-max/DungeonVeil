import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const migration = fs.readFileSync('supabase/migrations/20261004154000_add_duo_authority_build_profiles.sql', 'utf8');
const runner = fs.readFileSync('artifacts/dungeon-rpg/scripts/run-duo-authority-postgres-integration.sh', 'utf8');
const workflow = fs.readFileSync('.github/workflows/dungeon-rpg-check.yml', 'utf8');

test('legacy client progression is excluded from authority provenance', () => {
  assert.doesNotMatch(
    migration,
    /(?:from|join|insert\s+into|update)\s+(?:public|private)\.(?:game_saves|public_stats|coop_run_checkpoints)\b/i,
  );
  const chooseSignature = migration.match(/create or replace function public\.choose_my_coop_authority_upgrade\(([\s\S]*?)\)\nreturns table/i)?.[1] ?? '';
  for (const forbidden of ['hp', 'attack', 'defense', 'speed', 'rank', 'equipment', 'relic', 'companion', 'snapshot', 'damage']) {
    assert.doesNotMatch(chooseSignature, new RegExp('p_' + forbidden, 'i'));
  }
});

test('catalog, class and build snapshots are server-owned and versioned', () => {
  assert.match(migration, /coop_authority_build_catalog/);
  assert.match(migration, /duo-profile-v1/);
  assert.match(migration, /duo-build-catalog-v1/);
  assert.match(migration, /canonical_duo_build_snapshot/);
  assert.match(migration, /authority_class_key in \('warrior', 'mage', 'archer'\)/);
  assert.match(migration, /create or replace function private\.bootstrap_coop_authority_run[\s\S]*?set search_path = ''[\s\S]*?member\.authority_class_key in \('warrior', 'mage', 'archer'\)/i);
  assert.match(migration, /build_digest text not null check \(build_digest ~ '\^\[0-9a-f\]\{64\}\$'\)/);
});

test('offer issuance is deterministic, actor-bound and service-only', () => {
  assert.match(migration, /v_run\.run_seed::text \|\| ':' \|\| p_actor_user_id::text/);
  assert.match(migration, /p_progression_key \|\| ':' \|\| v_ordinal::text/);
  assert.doesNotMatch(migration, /Math\.random|random\(\)/);
  assert.match(migration, /revoke all on function public\.issue_coop_authority_upgrade_offer[\s\S]*from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.issue_coop_authority_upgrade_offer[\s\S]*to service_role/i);
});

test('choice endpoint enforces CAS, exact replay and current issued option', () => {
  assert.match(migration, /v_profile\.build_revision <> p_expected_build_revision/);
  assert.match(migration, /v_offer\.choice_ordinal <> v_profile\.choice_ordinal \+ 1/);
  assert.match(migration, /p_option_id = any\(v_offer\.offered_options\)/);
  assert.match(migration, /authority choice replay conflict/);
  assert.match(migration, /v_profile\.build_revision = p_expected_build_revision \+ 1/);
});

test('private provenance tables are forced-RLS and directly inaccessible', () => {
  for (const table of ['coop_authority_build_catalog', 'coop_authority_build_profiles', 'coop_authority_choice_offers']) {
    assert.match(migration, new RegExp('alter table private\\.' + table + ' force row level security', 'i'));
    assert.match(migration, new RegExp('revoke all on table private\\.' + table + ' from public, anon, authenticated, service_role', 'i'));
  }
});

test('permanent cheap and PostgreSQL gates include the provenance slice', () => {
  assert.match(runner, /20261004154000_add_duo_authority_build_profiles\.sql/);
  assert.match(runner, /duo_authority_build_profile_integration\.sql/);
  assert.match(workflow, /duo-authority-build-profile\.contract\.mjs/);
  assert.ok(
    workflow.indexOf('Duo authority build provenance contract') < workflow.indexOf('Install workspace'),
    'cheap provenance contract must execute before dependency installation',
  );
});
