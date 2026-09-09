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

const createBase = (overrides = {}) => kernel.createCanonicalEncounterState({
  runId: 'run-461',
  runAttempt: 2,
  chapter: 3,
  room: 10,
  seed: 424242,
  actors: [{ actorId: 'host', attack: 250 }],
  enemyTypes: ['slime'],
  ...overrides,
});

const hit = (state, clientSeq, authorityNowMs, targetEnemyId = state.enemies[0].enemyId) =>
  kernel.reduceAuthorityIntent(state, { kind: 'basic-hit', actorId: 'host', targetEnemyId, clientSeq }, authorityNowMs);

test('fixed seed and canonical inputs produce byte-stable encounter state', () => {
  assert.deepEqual(createBase(), createBase());
  assert.match(createBase().encounterId, /^run-461:2:3:10:424242$/);
});

test('client-supplied damage and clear flags cannot influence the reducer', () => {
  const base = createBase();
  const targetEnemyId = base.enemies[0].enemyId;
  const normal = kernel.reduceAuthorityIntent(base, { kind: 'basic-hit', actorId: 'host', targetEnemyId, clientSeq: 1 }, 1000);
  const forged = kernel.reduceAuthorityIntent(base, {
    kind: 'basic-hit', actorId: 'host', targetEnemyId, clientSeq: 1,
    damage: 999999999, room_clear: true, chapter: 999999,
  }, 1000);
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
  const first = hit(base, 1, 1000);
  assert.equal(first.state.completed, false);
  assert.equal(first.event, null);
});

test('unknown targets, replayed sequences, and sequence gaps fail closed', () => {
  const base = createBase();
  assert.throws(() => hit(base, 1, 1000, 'forged-target'), /canonical enemy/);
  assert.throws(() => hit(base, 999999, 1000), /gap/);

  const durableBase = createBase({ actors: [{ actorId: 'host', attack: 1 }] });
  const first = hit(durableBase, 1, 1000);
  assert.throws(() => hit(first.state, 1, 2000), /replayed|out-of-order/);
  assert.throws(() => hit(first.state, 0, 2000), /positive integer/);
});

test('server-owned cadence rejects rapid fresh-sequence spam without consuming state', () => {
  const base = createBase({ actors: [{ actorId: 'host', attack: 1 }] });
  const first = hit(base, 1, 1000);
  assert.equal(first.state.actors[0].nextBasicHitAtMs, 1000 + kernel.BASIC_HIT_COOLDOWN_MS);
  assert.throws(() => hit(first.state, 2, 1001), /cadence not ready/);

  const second = hit(first.state, 2, 1000 + kernel.BASIC_HIT_COOLDOWN_MS);
  assert.equal(second.state.version, 2);
  assert.equal(second.state.lastClientSeqByActor.host, 2);
});

test('inactive or dead/downed canonical actors cannot attack', () => {
  const inactive = createBase({ actors: [{ actorId: 'host', attack: 250, active: false }] });
  assert.throws(() => hit(inactive, 1, 1000), /not active/);
  assert.equal(inactive.version, 0);
  assert.equal(inactive.enemies[0].hp, inactive.enemies[0].maxHp);
});

test('authority time is server-side reducer input and invalid time fails closed', () => {
  const base = createBase({ actors: [{ actorId: 'host', attack: 1 }] });
  assert.throws(() => hit(base, 1, -1), /authorityNowMs/);
  assert.throws(() => hit(base, 1, Number.NaN), /authorityNowMs/);
});

test('authority intent contract exposes no trusted damage, timing, progression, or completion fields', () => {
  const intentType = source.match(/export type AuthorityIntent = Readonly<\{([\s\S]*?)\}>;/)?.[1] ?? '';
  assert.match(intentType, /kind: 'basic-hit'/);
  for (const forbidden of ['damage', 'room_clear', 'chapter', 'room', 'completed', 'enemyState', 'bossState', 'timestamp', 'time', 'cooldown', 'active']) {
    assert.equal(intentType.includes(forbidden), false, `AuthorityIntent must not trust ${forbidden}`);
  }
  assert.match(source, /authorityNowMs: number/);
  assert.match(source, /intent\.clientSeq !== previousSeq \+ 1/);
  assert.match(source, /authorityNowMs < actor\.nextBasicHitAtMs/);
  assert.match(source, /!actor\.active/);
});
