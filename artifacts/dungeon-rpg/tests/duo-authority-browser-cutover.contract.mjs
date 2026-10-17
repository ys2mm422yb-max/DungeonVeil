import assert from 'node:assert/strict';
import fs from 'node:fs';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const browserClient = fs.readFileSync(new URL('../src/game/duoAuthorityOnline.ts', import.meta.url), 'utf8');
const persistenceBridge = fs.readFileSync(new URL('../src/components/CoopRunPersistenceBridge.tsx', import.meta.url), 'utf8');
const authorityBridge = fs.readFileSync(new URL('../src/components/CoopAuthorityRuntimeBridge.tsx', import.meta.url), 'utf8');
const runtimeEvidenceQa = fs.readFileSync(new URL('../src/components/RuntimeDuoEvidenceQa.tsx', import.meta.url), 'utf8');
const gamePage = fs.readFileSync(new URL('../src/pages/game.tsx', import.meta.url), 'utf8');
const edgeService = fs.readFileSync(new URL('../../../supabase/functions/duo-authority/service.ts', import.meta.url), 'utf8');
const supabaseOnline = fs.readFileSync(new URL('../src/game/supabaseOnline.ts', import.meta.url), 'utf8');
const bindingMigration = fs.readFileSync(new URL('../../../supabase/migrations/20261011211500_expose_my_duo_authority_binding.sql', import.meta.url), 'utf8');
let server;

async function runtime() {
  server ??= await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)),
    configFile: false,
    logLevel: 'silent',
    appType: 'custom',
    server: { middlewareMode: true },
  });
  return server.ssrLoadModule('/src/game/duoAuthorityOnline.ts');
}

async function bridgeRuntime() {
  await runtime();
  return server.ssrLoadModule('/src/components/CoopAuthorityRuntimeBridge.tsx');
}

async function fixtureRuntime() {
  await runtime();
  return server.ssrLoadModule('/src/game/runtimeDuoAuthorityFixture.ts');
}

after(async () => { await server?.close(); });

test('runtime evidence rooms execute the real canonical fixture path with bounded builds', async () => {
  const { RuntimeDuoAuthorityFixture } = await fixtureRuntime();
  const fixture = new RuntimeDuoAuthorityFixture();

  for (let room = 1; room <= 100; room += 1) {
    fixture.loadEvidenceRoom(room);
    const snapshot = fixture.snapshot();
    assert.equal(snapshot.state.room, room);
    assert.equal(snapshot.state.actors.length, 2);
    for (const actor of snapshot.state.actors) {
      assert.ok(actor.maxHp > 0 && actor.maxHp <= 10_000, `room ${room} maxHp escaped canonical bounds`);
      assert.ok(actor.defense >= 0 && actor.defense <= 1_000, `room ${room} defense escaped canonical bounds`);
    }
  }
});
test('runtime evidence freezes canonical hazards across failed room builds and rejects stale projections', async () => {
  const { RuntimeDuoAuthorityFixture } = await fixtureRuntime();
  const fixture = new RuntimeDuoAuthorityFixture();
  fixture.loadEvidenceRoom(13);
  fixture.setEvidencePaused(true);
  const before = fixture.snapshot().state;
  const session = fixture.currentSession();
  assert.ok(session);
  const paused = await fixture.submit(
    session,
    { lobbyId: fixture.lobbyId, runAttempt: 1, runSeed: fixture.runSeed },
    before.encounterId,
    before.version,
    (before.lastClientSeqByActor[fixture.hostId] ?? 0) + 1,
    { kind: 'sync' },
  );
  assert.equal(paused.state, before);
  assert.equal(paused.state.actors.find(actor => actor.actorId === fixture.hostId)?.hp, before.actors.find(actor => actor.actorId === fixture.hostId)?.hp);
  assert.equal(paused.state.runeStorm.strikeAtMs, null);
  fixture.setEvidencePaused(false);
  const resumed = await fixture.submit(
    session,
    { lobbyId: fixture.lobbyId, runAttempt: 1, runSeed: fixture.runSeed },
    paused.state.encounterId,
    paused.state.version,
    (paused.state.lastClientSeqByActor[fixture.hostId] ?? 0) + 1,
    { kind: 'sync' },
  );
  assert.equal(fixture.isStateCurrent(resumed.state), true);
  fixture.completeEvidenceEncounter();
  assert.equal(fixture.isStateCurrent(resumed.state), false);
  assert.equal(fixture.snapshot().state.completed, true);
  assert.match(runtimeEvidenceQa, /const onRoomPreparing = \(\) => fixture\.setEvidencePaused\(true\);/);
  assert.match(runtimeEvidenceQa, /addEventListener\('dungeon-veil-room-preparing', onRoomPreparing\)/);
  assert.match(runtimeEvidenceQa, /const onRoomReady = \(event: Event\) => \{[\s\S]*fixture\.setEvidencePaused\(detail\?\.failed === true\);[\s\S]*\};/);
  assert.match(runtimeEvidenceQa, /addEventListener\('dungeon-veil-room-ready', onRoomReady\)/);
  assert.match(authorityBridge, /transport\.isStateCurrent && !transport\.isStateCurrent\(state\)/);
});

test('browser discovers its exact server-owned attempt through an actor-bound RPC', () => {
  assert.match(bindingMigration, /get_my_coop_authority_binding\(p_lobby_id uuid\)/i);
  assert.match(bindingMigration, /member\.user_id = auth\.uid\(\)/i);
  assert.match(bindingMigration, /member\.left_at is null/i);
  assert.match(bindingMigration, /lobby\.status = 'in_run'/i);
  assert.match(bindingMigration, /security definer\s+set search_path = ''/i);
  assert.match(bindingMigration, /revoke all on function public\.get_my_coop_authority_binding\(uuid\) from public, anon/i);
  assert.match(bindingMigration, /grant execute on function public\.get_my_coop_authority_binding\(uuid\) to authenticated/i);
  assert.match(bindingMigration, /pg_notify\('pgrst', 'reload schema'\)/i);
  assert.doesNotMatch(browserClient, /runAttempt\s*:\s*1\b/);
});
test('authenticated Edge calls retain refresh and exact binding validation', () => {
  assert.match(supabaseOnline, /authenticatedSupabaseFunction/);
  assert.match(supabaseOnline, /performFunctionRequest[\s\S]*authorization: `Bearer \$\{session\.access_token\}`/);
  assert.match(supabaseOnline, /functionRequest[\s\S]*shouldRefreshJwt/);
  assert.match(supabaseOnline, /performRestRequest[\s\S]*callerHeaders[\s\S]*authorization: `Bearer \$\{session\.access_token\}`/);
  assert.match(supabaseOnline, /headers: \{[\s\S]*callerHeaders[\s\S]*authorization: `Bearer \$\{session\.access_token\}`/);
  assert.match(browserClient, /action: 'state', lobbyId, runAttempt: binding\.runAttempt/);
  assert.match(browserClient, /state\.runId !== lobbyId/);
  assert.match(browserClient, /state\.runAttempt !== binding\.runAttempt/);
  assert.match(browserClient, /state\.seed !== binding\.runSeed/);
  assert.match(browserClient, /state\.version !== stateVersion/);
});

test('reward preparation accepts only canonical completed zero-living-enemy state', () => {
  assert.match(browserClient, /state\.completed/);
  assert.match(browserClient, /state\.lifecycle !== 'completed'/);
  assert.match(browserClient, /state\.enemies\.some\(enemy => enemy\.hp > 0\)/);
  assert.match(persistenceBridge, /readCompletedDuoAuthorityEncounter\(context\.lobbyId, context\.runSeed\)/);
  assert.match(persistenceBridge, /prepareCoopRoomRewards\(context\.lobbyId, context\.runSeed, completed\.chapter, completed\.room\)/);
  assert.doesNotMatch(persistenceBridge, /saveCheckpoint\(true\)/);
  assert.doesNotMatch(persistenceBridge, /checkpoint\?\.authoritative_room_clear/);
});

test('local room-clear is a trigger only and cannot supply reward identity', () => {
  const onClear = persistenceBridge.match(/const onClear = \(event: Event\) => \{([\s\S]*?)\n    \};/)?.[1] ?? '';
  assert.match(onClear, /void event/);
  assert.doesNotMatch(onClear, /CustomEvent|\.detail|clearRef\.current\s*=/);
  assert.match(onClear, /prepareCurrentReward\(\)/);
  assert.match(persistenceBridge, /saveMyCoopRunCheckpoint\(context\.lobbyId, context\.runSeed, engine, false\)/);
  assert.doesNotMatch(persistenceBridge, /saveMyCoopRunCheckpoint\([\s\S]{0,180}roomClearReady/);
});

test('runtime resolves a zero seed binding and accepts only the exact canonical completed state', async () => {
  const stored = new Map([['dungeon-veil-supabase-session-v1', JSON.stringify({
    access_token: 'actor-token', refresh_token: 'refresh-token', expires_at: 4_000_000_000,
    token_type: 'bearer', user: { id: 'actor-1' },
  })]]);
  globalThis.localStorage = {
    getItem: key => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value),
    removeItem: key => stored.delete(key),
  };
  const requests = [];
  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    if (String(url).includes('/rest/v1/rpc/get_my_coop_authority_binding')) {
      return new Response(JSON.stringify([{ lobby_id: 'lobby-1', run_attempt: 3, run_seed: 0 }]), { status: 200 });
    }
    return new Response(JSON.stringify({
      encounterId: 'encounter-1',
      stateVersion: 7,
      bootstrapRequired: false,
      state: {
        runId: 'lobby-1', runAttempt: 3, seed: 0, version: 7, encounterId: 'encounter-1',
        chapter: 1, room: 1, completed: true, lifecycle: 'completed', enemies: [],
      },
    }), { status: 200 });
  };

  const client = await runtime();
  const state = await client.readCompletedDuoAuthorityEncounter('lobby-1', 0);
  assert.equal(state.encounterId, 'encounter-1');
  assert.equal(requests.length, 2);
  assert.match(requests[0].url, /\/rest\/v1\/rpc\/get_my_coop_authority_binding$/);
  assert.match(requests[1].url, /\/functions\/v1\/duo-authority$/);
  for (const request of requests) {
    assert.equal(request.init.headers.authorization, 'Bearer actor-token');
    assert.ok(request.init.headers.apikey);
  }
  assert.deepEqual(JSON.parse(requests[1].init.body), { action: 'state', lobbyId: 'lobby-1', runAttempt: 3 });
});

test('live Duo gameplay routes through the canonical authority bridge, not host-owned combat', () => {
  assert.match(gamePage, /<CoopAuthorityRuntimeBridge/);
  assert.doesNotMatch(gamePage, /<CoopRunRealtimeBridge/);
  assert.match(authorityBridge, /engine\.update = timestamp => agePresentation\(engine, timestamp\)/);
  assert.match(authorityBridge, /partner && engine\.input\.interact/);
  assert.match(authorityBridge, /data-testid="coop-revive-control"/);
  assert.match(authorityBridge, /data-testid="coop-local-life-state"/);
  assert.match(authorityBridge, /data-testid="coop-teammate-disconnected"/);
  for (const kind of ['start-ack', 'move', 'basic-hit', 'dodge', 'sync', 'revive-hold']) {
    assert.match(authorityBridge, new RegExp(`kind: '${kind}'`));
  }
  assert.match(authorityBridge, /state\.lastClientSeqByActor\[actorId\].*\+ 1/);
  assert.match(authorityBridge, /state\.completed && atExit/);
  assert.match(authorityBridge, /if \(acceptedIntent\.kind === 'dodge'\) liveEngine\.input\.dodge = false/);
  assert.match(authorityBridge, /if \(acceptedIntent\.kind === 'basic-hit'\) liveEngine\.input\.attack = false/);
  assert.match(edgeService, /encounterId: row\.encounter_id, stateVersion/);
  assert.match(gamePage, /exitMyDuoAuthorityAttempt\(leavingContext\.lobbyId, leavingContext\.runSeed\)/);
  assert.match(gamePage, /Promise\.allSettled\(\[/);
});

test('browser authority validation and reconciliation share the 100-room chapter constant', () => {
  assert.match(browserClient, /import \{ CHAPTER_ROOMS \} from '\.\/chapterRun'/);
  assert.match(browserClient, /state\.room > CHAPTER_ROOMS/);
  assert.match(authorityBridge, /liveEngine\.state\.floor === CHAPTER_ROOMS/);
});

test('mounted bridge catches up with sync before retrying an automatic action', async () => {
  const { submitAuthorityIntentWithCatchUpRecovery } = await bridgeRuntime();
  const calls = [];
  const state = {
    encounterId: 'encounter-1', version: 7,
    lastClientSeqByActor: { 'actor-1': 3 },
  };
  const transport = {
    submit: async (_session, _binding, encounterId, version, sequence, intent) => {
      calls.push({ encounterId, version, sequence, intent });
      if (calls.length === 1) throw new Error('authority catch-up requires sync');
      return {
        state: {
          ...state,
          version: version + 1,
          lastClientSeqByActor: { 'actor-1': sequence },
        },
      };
    },
  };
  const session = { actorId: 'actor-1', credentialGeneration: 1 };
  const binding = { lobbyId: 'lobby-1', runAttempt: 3, runSeed: 11 };
  const basicHit = { kind: 'basic-hit', targetEnemyId: 'enemy-1' };

  const recovered = await submitAuthorityIntentWithCatchUpRecovery(
    transport, session, binding, state, 'actor-1', basicHit,
  );
  assert.deepEqual(calls.map(call => call.intent.kind), ['basic-hit', 'sync']);
  assert.deepEqual(calls.map(call => call.sequence), [4, 4]);
  assert.deepEqual(calls.map(call => call.version), [7, 7]);
  assert.equal(recovered.acceptedIntent.kind, 'sync');

  const resumed = await submitAuthorityIntentWithCatchUpRecovery(
    transport, session, binding, recovered.transition.state, 'actor-1', basicHit,
  );
  assert.equal(calls.at(-1).intent.kind, 'basic-hit');
  assert.equal(calls.at(-1).sequence, 5);
  assert.equal(calls.at(-1).version, 8);
  assert.equal(resumed.acceptedIntent.kind, 'basic-hit');
});

test('mounted bridge keeps unrelated transport failures fail-closed', async () => {
  const { submitAuthorityIntentWithCatchUpRecovery } = await bridgeRuntime();
  let submissions = 0;
  const transport = {
    submit: async () => {
      submissions += 1;
      throw new Error('network unavailable');
    },
  };
  await assert.rejects(
    submitAuthorityIntentWithCatchUpRecovery(
      transport,
      { actorId: 'actor-1', credentialGeneration: 1 },
      { lobbyId: 'lobby-1', runAttempt: 3, runSeed: 11 },
      { encounterId: 'encounter-1', version: 7, lastClientSeqByActor: { 'actor-1': 3 } },
      'actor-1',
      { kind: 'basic-hit', targetEnemyId: 'enemy-1' },
    ),
    /network unavailable/,
  );
  assert.equal(submissions, 1);
});

test('intent client binds exact attempt, encounter, version and sequence while overwriting forged auth headers', async () => {
  const requests = [];
  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    return new Response(JSON.stringify({
      stateVersion: 8,
      replayed: false,
      completed: false,
      state: {
        runId: 'lobby-1', runAttempt: 3, seed: 0, version: 8, encounterId: 'encounter-1',
        chapter: 1, room: 1, completed: false, lifecycle: 'running', enemies: [], actors: [],
      },
    }), { status: 200 });
  };
  const client = await runtime();
  await client.submitDuoAuthorityIntent(
    { lobbyId: 'lobby-1', runAttempt: 3, runSeed: 0 },
    'encounter-1', 7, 4, { kind: 'sync' }, 'intent-1',
  );
  assert.equal(requests.length, 1);
  assert.equal(requests[0].init.headers.authorization, 'Bearer actor-token');
  assert.notEqual(requests[0].init.headers.authorization, 'Bearer forged');
  assert.deepEqual(JSON.parse(requests[0].init.body), {
    action: 'intent', lobbyId: 'lobby-1', runAttempt: 3, encounterId: 'encounter-1',
    intentId: 'intent-1', expectedStateVersion: 7, actorSequence: 4, intent: { kind: 'sync' },
  });
});

test('intent client rejects a mismatched canonical response before browser projection', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({
    stateVersion: 8,
    state: { runId: 'other-lobby', runAttempt: 3, seed: 0, version: 8, encounterId: 'encounter-1' },
  }), { status: 200 });
  const client = await runtime();
  await assert.rejects(
    client.submitDuoAuthorityIntent(
      { lobbyId: 'lobby-1', runAttempt: 3, runSeed: 0 },
      'encounter-1', 7, 4, { kind: 'sync' }, 'intent-2',
    ),
    /nicht exakt an diesen Lauf gebunden/,
  );
});
