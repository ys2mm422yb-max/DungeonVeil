import assert from 'node:assert/strict';
import fs from 'node:fs';

const migrationPath = process.argv[2];
if (!migrationPath) throw new Error('migration path required');
const sql = fs.readFileSync(migrationPath, 'utf8');

const tests = [];
const test = (name, fn) => tests.push([name, fn]);
const contains = (pattern, message) => assert.match(sql, pattern, message);

test('creates exact-run trusted completion ledger with RLS', () => {
  contains(/create table if not exists public\.coop_trusted_encounter_completions/i);
  contains(/primary key \(lobby_id, run_attempt, run_seed, chapter, room\)/i);
  contains(/alter table public\.coop_trusted_encounter_completions enable row level security/i);
});

test('client roles cannot mutate or read trusted proof ledger', () => {
  contains(/revoke all on table public\.coop_trusted_encounter_completions from public, anon, authenticated/i);
  assert.doesNotMatch(sql, /grant\s+(?:select|insert|update|delete|all)[^;]*coop_trusted_encounter_completions[^;]*\b(?:anon|authenticated)\b/i);
});

test('only service role can execute proof recorder', () => {
  contains(/revoke all on function public\.record_trusted_coop_completion\([^)]+\)\s+from public, anon, authenticated/i);
  contains(/grant execute on function public\.record_trusted_coop_completion\([^)]+\)\s+to service_role/i);
  assert.doesNotMatch(sql, /grant execute on function public\.record_trusted_coop_completion\([^)]+\)\s+to (?:anon|authenticated)/i);
});

test('proof recorder binds proof to current active run attempt and is conflict-safe', () => {
  contains(/lobby\.status = 'in_run'/i);
  contains(/lobby\.run_seed = p_run_seed/i);
  contains(/select lobby\.run_attempt into v_run_attempt/i);
  contains(/if v_run_attempt <> p_run_attempt then raise exception 'stale coop run attempt'/i);
  contains(/trusted completion proof conflict/i);
  contains(/v_existing\.completion_digest <> p_completion_digest/i);
});

test('proof digest and state sequence are validated', () => {
  contains(/p_final_state_seq is null or p_final_state_seq < 0/i);
  contains(/p_completion_digest !~ '\^\[0-9a-f\]\{64\}\$'/i);
});

test('room rewards require trusted completion before client checkpoint', () => {
  const functionStart = sql.indexOf('create or replace function public.prepare_coop_room_rewards');
  const bossStart = sql.indexOf('create or replace function public.open_coop_boss_loot');
  assert.ok(functionStart >= 0 && bossStart > functionStart);
  const body = sql.slice(functionStart, bossStart);
  const proofIndex = body.indexOf('perform private.require_trusted_coop_completion');
  const checkpointIndex = body.indexOf('from public.coop_run_checkpoints checkpoint');
  const entitlementIndex = body.indexOf('insert into public.coop_room_reward_entitlements');
  assert.ok(proofIndex >= 0, 'reward function must require trusted proof');
  assert.ok(checkpointIndex > proofIndex, 'trusted proof must precede client checkpoint');
  assert.ok(entitlementIndex > checkpointIndex, 'entitlement insertion must occur only after both guards');
});

test('boss loot requires trusted completion before reading or creating rolls', () => {
  const bodyStart = sql.indexOf('create or replace function public.open_coop_boss_loot');
  assert.ok(bodyStart >= 0);
  const body = sql.slice(bodyStart);
  const proofIndex = body.indexOf('perform private.require_trusted_coop_completion');
  const rollReadIndex = body.indexOf('select roll.id into v_roll_id');
  const rollInsertIndex = body.indexOf('insert into public.coop_boss_loot_rolls');
  assert.ok(proofIndex >= 0, 'boss loot must require trusted proof');
  assert.ok(rollReadIndex > proofIndex, 'existing boss rolls must not bypass trusted proof');
  assert.ok(rollInsertIndex > proofIndex, 'new boss rolls must not bypass trusted proof');
});

test('authenticated access remains limited to gated consumer RPCs', () => {
  contains(/grant execute on function public\.prepare_coop_room_rewards\(uuid, bigint, integer, integer\) to authenticated/i);
  contains(/grant execute on function public\.open_coop_boss_loot\(uuid, bigint, integer, integer\) to authenticated/i);
});

let passed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    passed += 1;
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}
console.log(`${passed}/${tests.length} trusted-completion migration contracts passed`);
