import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const migration = fs.readFileSync('supabase/migrations/20261004154000_add_duo_authority_build_profiles.sql', 'utf8');
const bindingMigration = fs.readFileSync('supabase/migrations/20261004230000_bind_duo_authority_build_snapshot.sql', 'utf8');
const service = fs.readFileSync('supabase/functions/duo-authority/service.ts', 'utf8');
const kernel = fs.readFileSync('supabase/functions/_shared/duo_authority_kernel.ts', 'utf8');
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
  assert.match(
    migration,
    /update private\.coop_authority_build_profiles as profile[\s\S]*?set build_revision = profile\.build_revision \+ 1/i,
  );
  assert.doesNotMatch(migration, /set build_revision = build_revision \+ 1/i);
});

test('private provenance tables are forced-RLS and directly inaccessible', () => {
  for (const table of ['coop_authority_build_catalog', 'coop_authority_build_profiles', 'coop_authority_choice_offers']) {
    assert.match(migration, new RegExp('alter table private\\.' + table + ' force row level security', 'i'));
    assert.match(migration, new RegExp('revoke all on table private\\.' + table + ' from public, anon, authenticated, service_role', 'i'));
  }
});

test('permanent cheap and PostgreSQL gates include the provenance slice', () => {
  assert.match(runner, /20261004154000_add_duo_authority_build_profiles\.sql/);
  assert.match(runner, /20261004230000_bind_duo_authority_build_snapshot\.sql/);
  assert.match(runner, /duo_authority_build_profile_integration\.sql/);
  assert.match(workflow, /duo-authority-build-profile\.contract\.mjs/);
  assert.ok(
    workflow.indexOf('Duo authority build provenance contract') < workflow.indexOf('Install workspace'),
    'cheap provenance contract must execute before dependency installation',
  );
});

test('trusted build snapshot is bound fail-closed into canonical Edge actors', () => {
  assert.match(bindingMigration, /v_base_hp := 150/);
  assert.match(bindingMigration, /v_base_hp := 80/);
  assert.match(bindingMigration, /join private\.coop_authority_build_profiles as profile/);
  assert.match(bindingMigration, /profile\.build_digest = encode\(extensions\.digest\(profile\.derived_snapshot::text, 'sha256'\), 'hex'\)/);
  assert.match(bindingMigration, /having count\(actor\.user_id\) = 2/);
  for (const field of ['build_revision', 'build_digest', 'derived_snapshot']) {
    assert.match(bindingMigration, new RegExp("'" + field + "'"));
  }
  assert.match(service, /buildSnapshot: actor\.derived_snapshot/);
  assert.match(kernel, /assertAuthorityBuildSnapshot\(actor\)/);
  assert.match(kernel, /attack: build\.attack/);
  assert.match(kernel, /speed: build\.speed/);
});


test('upgrade offers and choices are bound to an empty exact encounter boundary', () => {
  assert.match(migration, /encounter_id uuid not null/);
  assert.match(migration, /authority_run\.status = 'awaiting_canonical_state'[\s\S]*authority_run\.canonical_snapshot is null/);
  assert.match(migration, /offer\.encounter_id = v_run\.encounter_id/);
  assert.match(migration, /v_offer\.encounter_id <> v_run\.encounter_id/);
  assert.match(migration, /inter-encounter authority boundary required/);
  assert.match(migration, /authority_run\.encounter_id = offer\.encounter_id[\s\S]*authority_run\.canonical_snapshot is null/);
});

test('stale unselected offers release the next ordinal without deleting replay history', () => {
  assert.match(
    migration,
    /delete from private\.coop_authority_choice_offers as stale_offer[\s\S]*?stale_offer\.selected_option is null[\s\S]*?stale_offer\.encounter_id <> v_run\.encounter_id/i,
  );
  assert.match(
    migration,
    /pending_offer\.encounter_id = v_run\.encounter_id[\s\S]*?pending_offer\.selected_option is null[\s\S]*?pending authority choice required/i,
  );
  const staleCleanup = migration.match(
    /delete from private\.coop_authority_choice_offers as stale_offer[\s\S]*?stale_offer\.encounter_id <> v_run\.encounter_id;/i,
  )?.[0] ?? '';
  assert.match(staleCleanup, /stale_offer\.selected_option is null/i);
});
