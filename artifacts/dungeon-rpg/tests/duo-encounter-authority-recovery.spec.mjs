import assert from 'node:assert/strict';
import fs from 'node:fs';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const sourcePath = new URL('../../../supabase/functions/_shared/duo_authority_kernel.ts', import.meta.url);
const source = fs.readFileSync(sourcePath, 'utf8');
const server = await createServer({
  root: fileURLToPath(new URL('../../../', import.meta.url)),
  configFile: false,
  logLevel: 'silent',
  appType: 'custom',
  server: { middlewareMode: true },
});
const kernel = await server.ssrLoadModule('/supabase/functions/_shared/duo_authority_kernel.ts');
after(async () => server.close());

const createBase = () => kernel.createCanonicalEncounterState({
  runId: 'run-461-recovery',
  runAttempt: 3,
  chapter: 1,
  room: 1,
  seed: 461250,
  authorityStartedAtMs: 1000,
  actors: [{ actorId: 'host', classKey: 'warrior', spawnX: 100, spawnY: 100 }],
  enemies: [{ enemyType: 'slime', x: 300, y: 100 }],
});

const move = (state, clientSeq, authorityNowMs, directionX = 1, directionY = 0) =>
  kernel.reduceAuthorityIntent(state, { kind: 'move', actorId: 'host', directionX, directionY, clientSeq }, authorityNowMs);

test('oversized idle gap rejects displacement but resynchronizes server clock for later legal movement', () => {
  const base = createBase();
  const recovered = move(base, 1, 1400);

  assert.equal(recovered.state.actors[0].x, 100, 'oversized interval must never create movement');
  assert.equal(recovered.state.actors[0].y, 100, 'oversized interval must never create movement');
  assert.equal(recovered.state.actors[0].lastAuthorityAtMs, 1400, 'authority-owned clock must resynchronize');
  assert.equal(recovered.state.lastClientSeqByActor.host, 1, 'resync intent is consumed exactly once');
  assert.equal(recovered.state.version, 1);

  const moved = move(recovered.state, 2, 1500);
  assert.equal(moved.state.actors[0].x, 111.8, 'legal movement resumes from canonical speed after resync');
  assert.equal(moved.state.actors[0].lastAuthorityAtMs, 1500);
  assert.equal(moved.state.lastClientSeqByActor.host, 2);

  assert.throws(() => move(moved.state, 1, 1600), /replayed|out-of-order/);
});

test('idle-gap recovery cannot be used to smuggle teleport direction or absolute position', () => {
  const base = createBase();
  assert.throws(
    () => kernel.reduceAuthorityIntent(base, {
      kind: 'move', actorId: 'host', directionX: 2, directionY: 0, clientSeq: 1,
      x: 999999, y: 999999, authorityNowMs: 999999,
    }, 1400),
    /magnitude exceeds one/,
  );
  assert.equal(base.actors[0].x, 100);
  assert.equal(base.actors[0].lastAuthorityAtMs, 1000);

  const recovered = kernel.reduceAuthorityIntent(base, {
    kind: 'move', actorId: 'host', directionX: 1, directionY: 0, clientSeq: 1,
    x: 999999, y: 999999, authorityNowMs: 999999,
  }, 1400);
  assert.equal(recovered.state.actors[0].x, 100);
  assert.equal(recovered.state.actors[0].lastAuthorityAtMs, 1400);
});
