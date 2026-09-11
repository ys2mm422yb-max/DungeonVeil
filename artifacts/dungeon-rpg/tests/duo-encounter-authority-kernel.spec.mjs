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

const actor = (overrides = {}) => ({
  actorId: 'host',
  classKey: 'warrior',
  attack: 250,
  x: 0,
  y: 0,
  ...overrides,
});

const enemy = (overrides = {}) => ({ enemyType: 'slime', x: 20, y: 0, ...overrides });

const createBase = (overrides = {}) => kernel.createCanonicalEncounterState({
  runId: 'run-461',
  runAttempt: 2,
  chapter: 3,
  room: 10,
  seed: 424242,
  actors: [actor()],
  enemies: [enemy()],
  ...overrides,
});

const hit = (state, clientSeq, authorityNowMs, targetEnemyId = state.enemies[0].enemyId, intentOverrides = {}) =>
  kernel.reduceAuthorityIntent(state, { kind: 'basic-hit', actorId: 'host', targetEnemyId, clientSeq, ...intentOverrides }, authorityNowMs);

test('fixed seed and canonical inputs produce byte-stable encounter state', () => {
  assert.deepEqual(createBase(), createBase());
  assert.match(createBase().encounterId, /^run-461:2:3:10:424242$/);
});

test('client-supplied damage and clear flags cannot influence the reducer', () => {
  const base = createBase();
  const targetEnemyId = base.enemies[0].enemyId;
  const normal = hit(base, 1, 1000, targetEnemyId);
  const forged = hit(base, 1, 1000, targetEnemyId, {
    damage: 999999999,
    room_clear: true,
    chapter: 999999,
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
    actors: [actor({ attack: 10 })],
    enemies: [enemy(), enemy({ enemyType: 'goblin', x: 25 })],
  });
  const first = hit(base, 1, 1000);
  assert.equal(first.state.completed, false);
  assert.equal(first.event, null);
});

test('unknown targets, replayed sequences, and sequence gaps fail closed', () => {
  const base = createBase();
  assert.throws(() => hit(base, 1, 1000, 'forged-target'), /canonical enemy/);
  assert.throws(() => hit(base, 999999, 1000), /gap/);

  const durableBase = createBase({ actors: [actor({ attack: 1 })] });
  const first = hit(durableBase, 1, 1000);
  assert.throws(() => hit(first.state, 1, 2000), /replayed|out-of-order/);
  assert.throws(() => hit(first.state, 0, 2000), /positive integer/);
});

test('server-owned class cadence rejects rapid fresh-sequence spam without consuming state', () => {
  const mage = createBase({ actors: [actor({ classKey: 'mage', attack: 1 })] });
  const firstMage = hit(mage, 1, 1000);
  assert.equal(firstMage.state.actors[0].attackCooldownMs, 550);
  assert.equal(firstMage.state.actors[0].nextBasicHitAtMs, 1550);
  assert.throws(() => hit(firstMage.state, 2, 1549), /cadence not ready/);
  const secondMage = hit(firstMage.state, 2, 1550);
  assert.equal(secondMage.state.version, 2);
  assert.equal(secondMage.state.lastClientSeqByActor.host, 2);

  const archer = createBase({ actors: [actor({ classKey: 'archer', attack: 1 })] });
  const firstArcher = hit(archer, 1, 2000);
  assert.equal(firstArcher.state.actors[0].attackCooldownMs, 270);
  assert.equal(firstArcher.state.actors[0].nextBasicHitAtMs, 2270);
  assert.throws(() => hit(firstArcher.state, 2, 2269), /cadence not ready/);
  assert.equal(hit(firstArcher.state, 2, 2270).state.version, 2);
});

test('canonical actor and enemy positions enforce live class basic-hit range', () => {
  const mageInRange = createBase({
    actors: [actor({ classKey: 'mage', attack: 1, x: 10, y: 10 })],
    enemies: [enemy({ x: 65, y: 10 })],
  });
  assert.equal(hit(mageInRange, 1, 1000).state.version, 1);

  const mageOutOfRange = createBase({
    actors: [actor({ classKey: 'mage', attack: 1, x: 10, y: 10 })],
    enemies: [enemy({ x: 65.01, y: 10 })],
  });
  assert.throws(() => hit(mageOutOfRange, 1, 1000), /outside canonical basic-hit range/);
  assert.equal(mageOutOfRange.version, 0);

  const archerLongerRange = createBase({
    actors: [actor({ classKey: 'archer', attack: 1, x: 0, y: 0 })],
    enemies: [enemy({ x: 100, y: 0 })],
  });
  assert.equal(hit(archerLongerRange, 1, 1000).state.version, 1);
});

test('forged client legality fields cannot bypass canonical cadence, class, or range', () => {
  const outOfRangeMage = createBase({
    actors: [actor({ classKey: 'mage', attack: 1, x: 0, y: 0 })],
    enemies: [enemy({ x: 80, y: 0 })],
  });
  assert.throws(() => hit(outOfRangeMage, 1, 1000, outOfRangeMage.enemies[0].enemyId, {
    classKey: 'archer', actorX: 80, actorY: 0, targetX: 80, targetY: 0, attackRange: 99999, cooldown: 0,
  }), /outside canonical basic-hit range/);

  const mage = createBase({ actors: [actor({ classKey: 'mage', attack: 1 })] });
  const first = hit(mage, 1, 1000);
  assert.throws(() => hit(first.state, 2, 1200, first.state.enemies[0].enemyId, {
    classKey: 'archer', cooldown: 0, timestamp: 999999,
  }), /cadence not ready/);
});

test('inactive or dead/downed canonical actors cannot attack', () => {
  const inactive = createBase({ actors: [actor({ active: false })] });
  assert.throws(() => hit(inactive, 1, 1000), /not active/);
  assert.equal(inactive.version, 0);
  assert.equal(inactive.enemies[0].hp, inactive.enemies[0].maxHp);
});

test('authority time and canonical coordinates fail closed when invalid', () => {
  const base = createBase({ actors: [actor({ attack: 1 })] });
  assert.throws(() => hit(base, 1, -1), /authorityNowMs/);
  assert.throws(() => hit(base, 1, Number.NaN), /authorityNowMs/);
  assert.throws(() => createBase({ actors: [actor({ x: Number.NaN })] }), /actor.x/);
  assert.throws(() => createBase({ enemies: [enemy({ y: Number.POSITIVE_INFINITY })] }), /enemy.y/);
});

test('authority intent contract exposes no trusted damage, timing, progression, class, position, or legality fields', () => {
  const intentType = source.match(/export type AuthorityIntent = Readonly<\{([\s\S]*?)\}>;/)?.[1] ?? '';
  assert.match(intentType, /kind: 'basic-hit'/);
  for (const forbidden of [
    'damage', 'room_clear', 'chapter', 'room', 'completed', 'enemyState', 'bossState', 'timestamp', 'time',
    'cooldown', 'active', 'classKey', 'attackRange', 'actorX', 'actorY', 'targetX', 'targetY', 'position',
  ]) {
    assert.equal(intentType.includes(forbidden), false, `AuthorityIntent must not trust ${forbidden}`);
  }
  assert.match(source, /authorityNowMs: number/);
  assert.match(source, /intent\.clientSeq !== previousSeq \+ 1/);
  assert.match(source, /authorityNowMs < actor\.nextBasicHitAtMs/);
  assert.match(source, /!actor\.active/);
  assert.match(source, /CANONICAL_CLASS_COMBAT_MANIFEST\[actor\.classKey\]/);
  assert.match(source, /isWithinBasicHitRange\(actor, target\)/);
});
