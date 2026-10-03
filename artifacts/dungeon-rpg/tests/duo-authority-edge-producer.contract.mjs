import assert from 'node:assert/strict';
import fs from 'node:fs';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const service = fs.readFileSync(new URL('../../../supabase/functions/duo-authority/service.ts', import.meta.url), 'utf8');
const entry = fs.readFileSync(new URL('../../../supabase/functions/duo-authority/index.ts', import.meta.url), 'utf8');
const migration = fs.readFileSync(new URL('../../../supabase/migrations/20261003142500_connect_duo_authority_completion.sql', import.meta.url), 'utf8');
const edgeConfig = fs.readFileSync(new URL('../../../supabase/config.toml', import.meta.url), 'utf8');
const denoConfig = JSON.parse(fs.readFileSync(new URL('../../../supabase/functions/duo-authority/deno.json', import.meta.url), 'utf8'));
let server;

async function runtime() {
  server ??= await createServer({
    root: fileURLToPath(new URL('../../../', import.meta.url)),
    configFile: false,
    logLevel: 'silent',
    appType: 'custom',
    server: { middlewareMode: true },
  });
  return server.ssrLoadModule('/supabase/functions/duo-authority/service.ts');
}

after(async () => { await server?.close(); });

test('Edge boundary authenticates JWT and never accepts caller actor, time, state, combat stats or completion', () => {
  assert.match(entry, /get\("Authorization"\)/);
  assert.match(service, /service\.auth\.getUser\(token\)/);
  const body = service.match(/type IntentBody = \{([\s\S]*?)\n\};/)?.[1] ?? '';
  for (const forbidden of ['actorId', 'authorityNowMs', 'chapter', 'room', 'seed', 'state', 'completed', 'damage', 'attack', 'hp', 'x', 'y']) {
    assert.doesNotMatch(body, new RegExp(`\\b${forbidden}\\??\\s*:`), `client body must not own ${forbidden}`);
  }
  assert.match(service, /actorId: authData\.user\.id/);
  assert.match(service, /authorityNowMs = Date\.now\(\)/);
});

test('Edge deploy contract pins dependencies and preserves platform JWT verification', () => {
  assert.equal(denoConfig.imports.supabase, 'npm:@supabase/supabase-js@2.57.4');
  assert.match(entry, /from "supabase"/);
  assert.match(edgeConfig, /\[functions\.duo-authority\][\s\S]*verify_jwt\s*=\s*true/);
});

test('producer constructs canonical state from durable run and repository factory before reducing intent', () => {
  assert.match(service, /read_coop_authority_state/);
  assert.match(service, /createRoomBoundCanonicalEncounterState/);
  assert.match(service, /assertStoredBinding\(row, current\)/);
  assert.match(service, /reduceAuthorityIntent\(current, intent, authorityNowMs\)/);
  assert.match(service, /body\.actorSequence !== Number\(actor\.last_intent_sequence\) \+ 1/);
  assert.match(service, /receipt-aware RPC resolve[\s\S]*row\.canonical_snapshot_digest/);
  assert.match(service, /body\.encounterId !== row\.encounter_id/);
});

test('Edge calls one atomic persistence and completion boundary', () => {
  assert.match(service, /persist_coop_authority_transition_and_record/);
  assert.doesNotMatch(service, /record_trusted_coop_completion/);
  assert.match(service, /p_actor_user_id: authData\.user!?\.id/);
  assert.match(service, /persist\(reduced\.state, snapshotDigest\)/);
});

test('database wrapper is service-only, hardened and derives proof identity from durable authority state', () => {
  assert.match(migration, /security definer\s+set search_path = ''/i);
  assert.match(migration, /revoke all on function public\.persist_coop_authority_transition_and_record\([\s\S]*?from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.persist_coop_authority_transition_and_record\([\s\S]*?to service_role/i);
  assert.match(migration, /v_run\.run_seed[\s\S]*v_run\.chapter[\s\S]*v_run\.room[\s\S]*v_run\.authority_version/i);
  const recorderCall = migration.match(/perform public\.record_trusted_coop_completion\(([\s\S]*?)\);/i)?.[1] ?? '';
  assert.match(recorderCall, /v_run\.run_seed[\s\S]*v_run\.chapter[\s\S]*v_run\.room/i);
  assert.doesNotMatch(recorderCall, /p_next_snapshot\s*->>\s*'(?:chapter|room|seed)'/i);
  assert.match(migration, /v_result\.replayed and v_run\.encounter_id <> p_encounter_id[\s\S]*canonical replay binding conflict/i);
  assert.match(migration, /is distinct from p_lobby_id::text/i);
});

test('completion recording is atomic, zero-enemy guarded and marks terminal authority state', () => {
  assert.match(migration, /from public\.persist_coop_authority_transition\(/i);
  assert.match(migration, /canonical completion binding conflict/i);
  assert.match(migration, /jsonb_array_elements\(v_result\.canonical_snapshot -> 'enemies'\)/i);
  assert.match(migration, /where coalesce\(\(enemy ->> 'hp'\)::numeric, 1\) > 0/i);
  assert.match(migration, /perform public\.record_trusted_coop_completion\(/i);
  assert.match(migration, /set status = 'completed'/i);
});

test('encounter advance is service-only and derives progression from exact durable proof', () => {
  assert.match(migration, /create or replace function public\.advance_coop_authority_encounter/i);
  assert.match(migration, /security definer\s+set search_path = ''/i);
  assert.match(migration, /v_run\.room = 50[\s\S]*v_next_chapter := v_run\.chapter \+ 1/i);
  assert.match(migration, /from public\.coop_trusted_encounter_completions as proof/i);
  assert.match(migration, /proof\.completion_digest = v_run\.canonical_snapshot_digest/i);
  assert.match(migration, /revoke all on function public\.advance_coop_authority_encounter\([\s\S]*from public, anon, authenticated/i);
  const body = service.match(/type AdvanceBody = \{([^}]+)\}/)?.[1] ?? '';
  assert.doesNotMatch(body, /\b(?:chapter|room|seed|nextRoom)\??\s*:/);
});

test('real producer ignores forged authority fields and persists a canonical actor-bound transition', async () => {
  const { executeDuoAuthority } = await runtime();
  const lobbyId = '10000000-0000-4000-8000-000000000001';
  const actorId = '20000000-0000-4000-8000-000000000001';
  const encounterId = '30000000-0000-4000-8000-000000000001';
  const calls = [];
  const row = {
    lobby_id: lobbyId, run_attempt: 1, run_seed: 42, chapter: 1, room: 1,
    encounter_id: encounterId, state_version: 0, authority_version: 'duo-authority-bootstrap-v1',
    status: 'awaiting_canonical_state', canonical_snapshot: null, canonical_snapshot_digest: null,
    actors: [{ user_id: actorId, class_key: 'archer', last_intent_sequence: 0 }],
  };
  const api = {
    auth: { getUser: async () => ({ data: { user: { id: actorId } }, error: null }) },
    rpc: async (name, args) => {
      calls.push({ name, args });
      if (name === 'read_coop_authority_state') return { data: [row], error: null };
      return { data: [{ state_version: 1, canonical_snapshot: args.p_next_snapshot,
        canonical_snapshot_digest: args.p_next_snapshot_digest, replayed: false }], error: null };
    },
  };
  const result = await executeDuoAuthority(api, 'valid-token', {
    action: 'intent', lobbyId, runAttempt: 1,
    encounterId,
    intentId: '40000000-0000-4000-8000-000000000001', expectedStateVersion: 0, actorSequence: 1,
    intent: { kind: 'move', directionX: 0, directionY: 0, actorId: 'forged', completed: true, damage: 999999 },
  }, 1000);
  const persisted = calls.find(call => call.name === 'persist_coop_authority_transition_and_record').args;
  assert.equal(persisted.p_actor_user_id, actorId);
  assert.equal(persisted.p_next_snapshot.runId, lobbyId);
  assert.equal(persisted.p_next_snapshot.encounterId, encounterId);
  assert.equal(persisted.p_next_snapshot.completed, false);
  assert.equal(persisted.p_next_snapshot.version, 1);
  assert.equal(result.stateVersion, 1);
});

test('lost-response retry reaches the database receipt path instead of re-reducing newer state', async () => {
  const { executeDuoAuthority } = await runtime();
  const lobbyId = '10000000-0000-4000-8000-000000000002';
  const actorId = '20000000-0000-4000-8000-000000000002';
  const encounterId = '30000000-0000-4000-8000-000000000002';
  const current = { runId: lobbyId, runAttempt: 1, chapter: 1, room: 1, encounterId,
    seed: 9, version: 1, actors: [], enemies: [], lastClientSeqByActor: { [actorId]: 1 }, completed: false };
  let persisted;
  const api = {
    auth: { getUser: async () => ({ data: { user: { id: actorId } }, error: null }) },
    rpc: async (name, args) => {
      if (name === 'read_coop_authority_state') return { data: [{
        lobby_id: lobbyId, run_attempt: 1, run_seed: 9, chapter: 1, room: 1, encounter_id: encounterId,
        state_version: 1, authority_version: 'duo-authority-bootstrap-v1', status: 'active',
        canonical_snapshot: current, canonical_snapshot_digest: 'a'.repeat(64),
        actors: [{ user_id: actorId, class_key: 'archer', last_intent_sequence: 1 }],
      }], error: null };
      persisted = args;
      return { data: [{ state_version: 1, canonical_snapshot: current,
        canonical_snapshot_digest: 'a'.repeat(64), replayed: true }], error: null };
    },
  };
  const result = await executeDuoAuthority(api, 'valid-token', {
    action: 'intent', lobbyId, runAttempt: 1,
    encounterId,
    intentId: '40000000-0000-4000-8000-000000000002', expectedStateVersion: 0, actorSequence: 1,
    intent: { kind: 'move', directionX: 0, directionY: 0 },
  }, 2000);
  assert.equal(persisted.p_expected_state_version, 0);
  assert.equal(result.replayed, true);
});

test('fresh encounter resumes the global actor sequence and advance stays actor-bound', async () => {
  const { executeDuoAuthority } = await runtime();
  const lobbyId = '10000000-0000-4000-8000-000000000003';
  const actorId = '20000000-0000-4000-8000-000000000003';
  const encounterId = '30000000-0000-4000-8000-000000000003';
  const row = {
    lobby_id: lobbyId, run_attempt: 1, run_seed: 12, chapter: 1, room: 2,
    encounter_id: encounterId, state_version: 0, authority_version: 'duo-authority-bootstrap-v1',
    status: 'awaiting_canonical_state', canonical_snapshot: null, canonical_snapshot_digest: null,
    actors: [{ user_id: actorId, class_key: 'archer', last_intent_sequence: 7 }],
  };
  const calls = [];
  const api = {
    auth: { getUser: async () => ({ data: { user: { id: actorId } }, error: null }) },
    rpc: async (name, args) => {
      calls.push({ name, args });
      if (name === 'read_coop_authority_state') return { data: [row], error: null };
      if (name === 'advance_coop_authority_encounter') return { data: [{ chapter: 1, room: 3, encounter_id: 'next', state_version: 0, status: 'awaiting_canonical_state' }], error: null };
      return { data: [{ state_version: 1, canonical_snapshot: args.p_next_snapshot,
        canonical_snapshot_digest: args.p_next_snapshot_digest, replayed: false }], error: null };
    },
  };
  await executeDuoAuthority(api, 'valid-token', {
    action: 'intent', lobbyId, runAttempt: 1,
    encounterId,
    intentId: '40000000-0000-4000-8000-000000000003', expectedStateVersion: 0, actorSequence: 8,
    intent: { kind: 'move', directionX: 0, directionY: 0 },
  }, 3000);
  const persisted = calls.find(call => call.name === 'persist_coop_authority_transition_and_record').args;
  assert.equal(persisted.p_next_snapshot.lastClientSeqByActor[actorId], 8);

  await executeDuoAuthority(api, 'valid-token', { action: 'advance', lobbyId, runAttempt: 1, encounterId });
  const advance = calls.find(call => call.name === 'advance_coop_authority_encounter').args;
  assert.deepEqual(advance, {
    p_lobby_id: lobbyId,
    p_run_attempt: 1,
    p_completed_encounter_id: encounterId,
    p_actor_user_id: actorId,
  });
});

test('invalid identity and non-member requests fail before a transition is emitted', async () => {
  const { executeDuoAuthority } = await runtime();
  const lobbyId = '10000000-0000-4000-8000-000000000004';
  const row = {
    lobby_id: lobbyId, run_attempt: 1, run_seed: 1, chapter: 1, room: 1,
    encounter_id: '30000000-0000-4000-8000-000000000004', state_version: 0,
    authority_version: 'duo-authority-bootstrap-v1', status: 'awaiting_canonical_state',
    canonical_snapshot: null, canonical_snapshot_digest: null, actors: [],
  };
  await assert.rejects(() => executeDuoAuthority({
    auth: { getUser: async () => ({ data: { user: null }, error: new Error('bad token') }) },
    rpc: async () => { throw new Error('must not read state'); },
  }, 'invalid', { action: 'state', lobbyId, runAttempt: 1 }), /invalid_token/);
  await assert.rejects(() => executeDuoAuthority({
    auth: { getUser: async () => ({ data: { user: { id: '20000000-0000-4000-8000-000000000004' } }, error: null }) },
    rpc: async () => ({ data: [row], error: null }),
  }, 'valid', { action: 'state', lobbyId, runAttempt: 1 }), /active_actor_required/);
});
