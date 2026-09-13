import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const sourcePath = new URL('../src/game/duoEncounterAuthorityKernel.ts', import.meta.url);
const source = fs.readFileSync(sourcePath, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  fileName: 'duoEncounterAuthorityKernel.ts',
}).outputText;
const kernel = await import(`data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`);

const createBase = () => kernel.createCanonicalEncounterState({
  runId: 'run-461-recovery',
  runAttempt: 3,
  chapter: 1,
  room: 1,
  seed: 461250,
  authorityStartedAtMs: 1000,
  actors: [{ actorId: 'host', classKey: 'warrior', spawnX: 0, spawnY: 0 }],
  enemies: [{ enemyType: 'slime', x: 300, y: 0 }],
});

const move = (state, clientSeq, authorityNowMs, directionX = 1, directionY = 0) =>
  kernel.reduceAuthorityIntent(state, { kind: 'move', actorId: 'host', directionX, directionY, clientSeq }, authorityNowMs);

test('oversized idle gap rejects displacement but resynchronizes server clock for later legal movement', () => {
  const base = createBase();
  const recovered = move(base, 1, 1400);

  assert.equal(recovered.state.actors[0].x, 0, 'oversized interval must never create movement');
  assert.equal(recovered.state.actors[0].y, 0, 'oversized interval must never create movement');
  assert.equal(recovered.state.actors[0].lastAuthorityAtMs, 1400, 'authority-owned clock must resynchronize');
  assert.equal(recovered.state.lastClientSeqByActor.host, 1, 'resync intent is consumed exactly once');
  assert.equal(recovered.state.version, 1);

  const moved = move(recovered.state, 2, 1500);
  assert.equal(moved.state.actors[0].x, 11.8, 'legal movement resumes from canonical speed after resync');
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
  assert.equal(base.actors[0].x, 0);
  assert.equal(base.actors[0].lastAuthorityAtMs, 1000);

  const recovered = kernel.reduceAuthorityIntent(base, {
    kind: 'move', actorId: 'host', directionX: 1, directionY: 0, clientSeq: 1,
    x: 999999, y: 999999, authorityNowMs: 999999,
  }, 1400);
  assert.equal(recovered.state.actors[0].x, 0);
  assert.equal(recovered.state.actors[0].lastAuthorityAtMs, 1400);
});
