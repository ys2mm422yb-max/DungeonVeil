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
  runId: 'run-461',
  runAttempt: 2,
  chapter: 3,
  room: 10,
  seed: 424242,
  actors: [{ actorId: 'host', attack: 250 }],
  enemyTypes: ['slime'],
});

test('fixed seed and canonical inputs produce byte-stable encounter state', () => {
  assert.deepEqual(createBase(), createBase());
  assert.match(createBase().encounterId, /^run-461:2:3:10:424242$/);
});

test('client-supplied damage and clear flags cannot influence the reducer', () => {
  const base = createBase();
  const targetEnemyId = base.enemies[0].enemyId;
  const normal = kernel.reduceAuthorityIntent(base, { kind: 'basic-hit', actorId: 'host', targetEnemyId, clientSeq: 1 });
  const forged = kernel.reduceAuthorityIntent(base, {
    kind: 'basic-hit', actorId: 'host', targetEnemyId, clientSeq: 1,
    damage: 999999999, room_clear: true, chapter: 999999,
  });
  assert.deepEqual(forged, normal);
  assert.equal(normal.state.enemies[0].hp, 0);
  assert.equal(normal.state.completed, true);
  assert.equal(normal.event?.kind, 'encounter-completed');
  assert.equal(normal.event?.chapter, 3);
  assert.equal(normal.event?.room, 10);
});

test('completion is impossible without reducing every canonical enemy to zero hp', () => {
  const base = kernel.createCanonicalEncounterState({
    runId: 'run-461', runAttempt: 1, chapter: 1, room: 1, seed: 7,
    actors: [{ actorId: 'host', attack: 10 }],
    enemyTypes: ['slime', 'goblin'],
  });
  const first = kernel.reduceAuthorityIntent(base, {
    kind: 'basic-hit', actorId: 'host', targetEnemyId: base.enemies[0].enemyId, clientSeq: 1,
  });
  assert.equal(first.state.completed, false);
  assert.equal(first.event, null);
});

test('unknown targets and replayed client sequences fail closed', () => {
  const base = createBase();
  assert.throws(() => kernel.reduceAuthorityIntent(base, {
    kind: 'basic-hit', actorId: 'host', targetEnemyId: 'forged-target', clientSeq: 1,
  }), /canonical enemy/);

  const first = kernel.reduceAuthorityIntent(base, {
    kind: 'basic-hit', actorId: 'host', targetEnemyId: base.enemies[0].enemyId, clientSeq: 1,
  });
  assert.throws(() => kernel.reduceAuthorityIntent(first.state, {
    kind: 'basic-hit', actorId: 'host', targetEnemyId: base.enemies[0].enemyId, clientSeq: 1,
  }), /already completed|replayed/);
});

test('authority intent contract exposes no trusted damage, progression, or completion fields', () => {
  const intentType = source.match(/export type AuthorityIntent = Readonly<\{([\s\S]*?)\}>;/)?.[1] ?? '';
  assert.match(intentType, /kind: 'basic-hit'/);
  for (const forbidden of ['damage', 'room_clear', 'chapter', 'room', 'completed', 'enemyState', 'bossState']) {
    assert.equal(intentType.includes(forbidden), false, `AuthorityIntent must not trust ${forbidden}`);
  }
});
