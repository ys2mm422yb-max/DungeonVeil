import assert from 'node:assert/strict';
import fs from 'node:fs';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const browserClient = fs.readFileSync(new URL('../src/game/duoAuthorityOnline.ts', import.meta.url), 'utf8');
const persistenceBridge = fs.readFileSync(new URL('../src/components/CoopRunPersistenceBridge.tsx', import.meta.url), 'utf8');
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

after(async () => { await server?.close(); });

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
