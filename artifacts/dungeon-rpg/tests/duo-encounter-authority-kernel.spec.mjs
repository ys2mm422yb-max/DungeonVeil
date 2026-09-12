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
  spawnX: 0,
  spawnY: 0,
  ...overrides,
});
const enemy = (overrides = {}) => ({ enemyType: 'slime', x: 80, y: 0, ...overrides });
const createBase = (overrides = {}) => kernel.createCanonicalEncounterState({
  runId: 'run-461', runAttempt: 2, chapter: 1, room: 1, seed: 424242, authorityStartedAtMs: 1000,
  actors: [actor()], enemies: [enemy()], ...overrides,
});
const move = (state, clientSeq, authorityNowMs, directionX, directionY = 0) =>
  kernel.reduceAuthorityIntent(state, { kind: 'move', actorId: 'host', directionX, directionY, clientSeq }, authorityNowMs);
const hit = (state, clientSeq, authorityNowMs, targetEnemyId = state.enemies[0].enemyId, extra = {}) =>
  kernel.reduceAuthorityIntent(state, { kind: 'basic-hit', actorId: 'host', targetEnemyId, clientSeq, ...extra }, authorityNowMs);

test('canonical class manifest owns base attack, speed, size, range and cadence', () => {
  for (const [classKey, expected] of Object.entries({
    warrior: { attack: 12, speed: 118, size: 32, range: 65, cooldown: 350 },
    mage: { attack: 20, speed: 130, size: 32, range: 55, cooldown: 550 },
    archer: { attack: 10, speed: 218, size: 32, range: 105, cooldown: 270 },
  })) {
    const state = createBase({ actors: [actor({ classKey })] });
    const actual = state.actors[0];
    assert.equal(actual.attack, expected.attack);
    assert.equal(actual.speed, expected.speed);
    assert.equal(actual.width, expected.size);
    assert.equal(actual.height, expected.size);
    assert.equal(actual.attackRange, expected.range);
    assert.equal(actual.attackCooldownMs, expected.cooldown);
  }
  const actorInputType = source.match(/export type AuthorityActorInput = Readonly<\{([\s\S]*?)\}>;/)?.[1] ?? '';
  for (const forbidden of ['attack:', 'width:', 'height:', ' x:', ' y:']) {
    assert.equal(actorInputType.includes(forbidden), false, `AuthorityActorInput must not trust ${forbidden}`);
  }
});

test('movement is server-integrated from direction, canonical speed and authority time', () => {
  const base = createBase();
  const moved = move(base, 1, 1100, 1);
  assert.equal(moved.state.actors[0].x, 11.8);
  assert.equal(moved.state.actors[0].y, 0);
  assert.equal(moved.state.actors[0].lastAuthorityAtMs, 1100);
  assert.equal(moved.state.version, 1);
  assert.equal(moved.state.lastClientSeqByActor.host, 1);
});

test('teleport vectors, oversized movement time steps and backwards authority time fail closed', () => {
  const base = createBase();
  assert.throws(() => move(base, 1, 1100, 2, 0), /magnitude exceeds one/);
  assert.throws(() => move(base, 1, 1300, 1, 0), /time budget/);
  assert.throws(() => move(base, 1, 999, 1, 0), /time cannot move backwards/);
  assert.equal(base.version, 0);
  assert.equal(base.actors[0].x, 0);
});

test('forged absolute position fields cannot move an actor into hit range', () => {
  const base = createBase({ actors: [actor({ classKey: 'warrior' })], enemies: [enemy({ x: 120 })] });
  assert.throws(() => hit(base, 1, 1000, base.enemies[0].enemyId, { x: 120, y: 0, actorX: 120, targetX: 120 }), /outside canonical basic-hit range/);
  const moved = move(base, 1, 1250, 1);
  assert.throws(() => hit(moved.state, 2, 1250), /outside canonical basic-hit range/);
});

test('sequencing spans movement and hits, blocking replay and gaps', () => {
  const base = createBase({ enemies: [enemy({ x: 60 })] });
  const moved = move(base, 1, 1100, 0.5);
  assert.throws(() => move(moved.state, 1, 1200, 0.5), /replayed|out-of-order/);
  assert.throws(() => hit(moved.state, 3, 1200), /gap/);
  const firstHit = hit(moved.state, 2, 1200);
  assert.equal(firstHit.state.version, 2);
  assert.equal(firstHit.state.lastClientSeqByActor.host, 2);
});

test('canonical attack cannot be inflated through forged hit payload fields', () => {
  const base = createBase({ actors: [actor({ classKey: 'warrior' })], enemies: [enemy({ x: 30 })] });
  const normal = hit(base, 1, 1000);
  const forged = hit(base, 1, 1000, base.enemies[0].enemyId, { damage: 999999, attack: 999999, room_clear: true, chapter: 999999 });
  assert.deepEqual(forged, normal);
  assert.equal(normal.state.enemies[0].hp, normal.state.enemies[0].maxHp - 12);
});

test('server-owned cadence and movement clock cannot be bypassed by caller timestamps', () => {
  const base = createBase({ actors: [actor({ classKey: 'mage' })], enemies: [enemy({ x: 30 })] });
  const first = hit(base, 1, 1000);
  assert.throws(() => hit(first.state, 2, 1200, first.state.enemies[0].enemyId, { timestamp: 999999, cooldown: 0 }), /cadence not ready/);
  assert.throws(() => move(first.state, 2, 1300, 1), /time budget/);
  const moved = move(first.state, 2, 1250, 1);
  assert.equal(moved.state.actors[0].x, 32.5);
});

test('completion still requires canonical enemy hp to reach zero', () => {
  let state = createBase({ actors: [actor({ classKey: 'mage' })], enemies: [enemy({ x: 20 })] });
  let seq = 1;
  let now = 1000;
  let event = null;
  while (!state.completed) {
    const result = hit(state, seq++, now);
    state = result.state;
    event = result.event;
    now += 550;
  }
  assert.equal(event?.kind, 'encounter-completed');
  assert.equal(event?.runAttempt, 2);
  assert.equal(event?.chapter, 1);
  assert.equal(event?.room, 1);
});

test('authority intent contract exposes direction but no trusted absolute position, damage, class or timing fields', () => {
  assert.match(source, /kind: 'move'/);
  assert.match(source, /directionX: number/);
  assert.match(source, /directionY: number/);
  assert.match(source, /MAX_AUTHORITY_MOVEMENT_STEP_MS = 250/);
  assert.match(source, /attack: classCombat\.attack/);
  assert.match(source, /speed: classCombat\.speed/);
  assert.match(source, /intent\.clientSeq !== previousSeq \+ 1/);
  assert.match(source, /authorityNowMs < actor\.lastAuthorityAtMs/);
  assert.match(source, /isWithinBasicHitRange\(actor, target\)/);
});
