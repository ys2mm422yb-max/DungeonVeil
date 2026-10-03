import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const migrationPath = process.argv[2] ?? new URL('../../../supabase/migrations/20261003052000_add_duo_authority_bootstrap.sql', import.meta.url);
const sql = fs.readFileSync(migrationPath, 'utf8');

function functionBody(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = sql.match(new RegExp(`create\\s+or\\s+replace\\s+function\\s+${escaped}\\s*\\([\\s\\S]*?\\n\\$\\$;`, 'i'));
  assert.ok(match, `missing function ${name}`);
  return match[0];
}

test('start and restart transactionally bootstrap the exact DB-owned attempt', () => {
  const start = functionBody('public.start_coop_lobby');
  const restart = functionBody('public.restart_coop_run_attempt');
  assert.match(start, /for update of target_lobby/i);
  assert.match(start, /perform private\.bootstrap_coop_authority_run\(v_lobby\.id, v_lobby\.run_attempt, v_lobby\.run_seed\)/i);
  assert.match(restart, /for update/i);
  assert.match(restart, /run_attempt\s*=\s*lobby\.run_attempt\s*\+\s*1/i);
  assert.match(restart, /perform private\.bootstrap_coop_authority_run\(v_lobby\.id, v_lobby\.run_attempt, v_lobby\.run_seed\)/i);
  assert.doesNotMatch(start + restart, /coop_run_checkpoints|room_clear|p_chapter|p_room/i);
});

test('bootstrap owns progression, encounter identity and immutable shipped actor selection', () => {
  const bootstrap = functionBody('private.bootstrap_coop_authority_run');
  for (const required of [
    /chapter integer not null default 1/i,
    /room integer not null default 1/i,
    /encounter_id uuid not null default gen_random_uuid\(\)/i,
    /state_version bigint not null default 0/i,
    /authority_class_key text not null default 'archer'/i,
    /authority_loadout_key text not null default 'canonical-base-v1'/i,
    /class_key text not null check \(class_key = 'archer'\)/i,
    /loadout_key text not null check \(loadout_key = 'canonical-base-v1'\)/i,
  ]) assert.match(sql, required);
  assert.match(bootstrap, /two trusted ready authority members required/i);
  assert.match(bootstrap, /insert into private\.coop_authority_actors/i);
  assert.match(bootstrap, /row_number\(\) over/i);
  assert.doesNotMatch(bootstrap, /checkpoint|realtime|snapshot\s*->|p_class|p_loadout/i);
});

test('all authority tables are deny-by-default with no direct service-role DML', () => {
  for (const table of ['coop_authority_runs', 'coop_authority_actors', 'coop_authority_intent_receipts']) {
    assert.match(sql, new RegExp(`alter table private\\.${table} enable row level security`, 'i'));
    assert.match(sql, new RegExp(`alter table private\\.${table} force row level security`, 'i'));
    assert.match(sql, new RegExp(`revoke all on table private\\.${table} from public, anon, authenticated, service_role`, 'i'));
    assert.doesNotMatch(sql, new RegExp(`grant\\s+(?:select|insert|update|delete|all)[^;]*private\\.${table}`, 'i'));
  }
  assert.match(sql, /revoke all on function private\.bootstrap_coop_authority_run\(uuid, integer, bigint\)[\s\S]*from public, anon, authenticated, service_role/i);
});

test('security-definer hardening and executable PostgreSQL evidence are permanent', () => {
  for (const name of [
    'private.bootstrap_coop_authority_run',
    'public.read_coop_authority_state',
    'public.persist_coop_authority_transition',
    'public.start_coop_lobby',
    'public.restart_coop_run_attempt',
  ]) {
    assert.match(functionBody(name), /security definer[\s\S]*set search_path\s*=\s*''/i, `${name} must use an empty search_path`);
  }
  assert.doesNotMatch(sql, /set search_path\s*=\s*(?:public|private|pg_temp)/i);

  const fixture = fs.readFileSync(new URL('../../../supabase/tests/duo_authority_bootstrap_fixture.sql', import.meta.url), 'utf8');
  const integration = fs.readFileSync(new URL('../../../supabase/tests/duo_authority_bootstrap_integration.sql', import.meta.url), 'utf8');
  const runner = fs.readFileSync(new URL('../scripts/run-duo-authority-postgres-integration.sh', import.meta.url), 'utf8');
  const workflow = fs.readFileSync(new URL('../../../.github/workflows/dungeon-rpg-check.yml', import.meta.url), 'utf8');
  assert.match(fixture, /create table public\.coop_lobbies/i);
  for (const proof of [
    /rolls back lobby start atomically/i,
    /snapshots exactly two canonical actors/i,
    /reentrant bootstrap/i,
    /reconnect read creates and completes nothing/i,
    /service role cannot directly mutate/i,
    /sequence gaps fail closed/i,
    /identical replay/i,
    /conflicting replay/i,
    /old-attempt transition fails/i,
    /concurrent CAS advances/i,
  ]) assert.match(integration, proof);
  assert.match(runner, /rollback-fixture\.log/);
  assert.match(runner, /receipt\.json/);
  assert.match(workflow, /duo-authority-postgres-receipt-\$\{\{ github\.sha \}\}/);
  assert.match(workflow, /postgres:17/);
});

test('service persistence enforces exact attempt, membership, sequence, replay and CAS', () => {
  const persist = functionBody('public.persist_coop_authority_transition');
  for (const required of [
    /lobby\.run_attempt = p_run_attempt/i,
    /active_member\.user_id = p_actor_user_id[\s\S]*active_member\.left_at is null/i,
    /authority_run\.encounter_id = p_encounter_id/i,
    /authority_run\.state_version = p_expected_state_version/i,
    /actor\.user_id = p_actor_user_id/i,
    /p_actor_sequence <> v_actor\.last_intent_sequence \+ 1/i,
    /authority intent replay conflict/i,
    /return query select v_receipt\.result_state_version[\s\S]*true/i,
    /and authority_run\.state_version = p_expected_state_version/i,
    /authority compare-and-swap conflict/i,
  ]) assert.match(persist, required);
  assert.match(sql, /grant execute on function public\.persist_coop_authority_transition\([\s\S]*?\) to service_role/i);
  assert.match(sql, /revoke all on function public\.persist_coop_authority_transition\([\s\S]*?\) from public, anon, authenticated/i);
});

test('transition boundary cannot accept completion, progression, HP, damage, spawn or enemy results', () => {
  const signature = sql.match(/create or replace function public\.persist_coop_authority_transition\(([\s\S]*?)\)\nreturns table/i)?.[1] ?? '';
  for (const forbidden of ['chapter', 'room', 'complete', 'clear', 'defeat', 'damage', 'health', 'hp', 'spawn', 'enemy', 'class', 'loadout', 'state_version_rewrite']) {
    assert.doesNotMatch(signature, new RegExp(`p_[a-z0-9_]*${forbidden}`, 'i'));
  }
  assert.doesNotMatch(functionBody('public.persist_coop_authority_transition'), /record_trusted_coop_completion|coop_trusted_encounter_completions/i);
});

test('reconnect read is current-attempt-only and cannot recreate state or completion', () => {
  const read = functionBody('public.read_coop_authority_state');
  assert.match(read, /authority_run\.run_attempt = lobby\.run_attempt/i);
  assert.match(read, /lobby\.run_attempt = p_run_attempt/i);
  assert.match(read, /authority_run\.status <> 'invalidated'/i);
  assert.doesNotMatch(read, /\binsert\b|\bupdate\b|record_trusted_coop_completion|coop_trusted_encounter_completions/i);
  assert.match(sql, /grant execute on function public\.read_coop_authority_state\(uuid, integer\) to service_role/i);
  assert.match(sql, /revoke all on function public\.read_coop_authority_state\(uuid, integer\)[\s\S]*from public, anon, authenticated/i);
});

test('restart invalidates mutable prior attempts while preserving completed audit state', () => {
  const bootstrap = functionBody('private.bootstrap_coop_authority_run');
  assert.match(bootstrap, /prior\.run_attempt <> v_lobby\.run_attempt/i);
  assert.match(bootstrap, /prior\.status in \('awaiting_canonical_state', 'active'\)/i);
  assert.match(bootstrap, /set status = 'invalidated'/i);
  assert.doesNotMatch(bootstrap, /delete from private\.coop_authority/i);
});

test('slice remains production-inactive and cannot mint economic authority', () => {
  assert.match(sql, /REPO ONLY/i);
  assert.doesNotMatch(sql, /create\s+or\s+replace\s+function\s+public\.record_trusted_coop_completion/i);
  assert.doesNotMatch(sql, /prepare_coop_room_rewards|open_coop_boss_loot|insert into public\.coop_trusted_encounter_completions/i);
});
