import assert from 'node:assert/strict';
import fs from 'node:fs';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const sourcePath = new URL('../../../supabase/functions/_shared/duo_authority_kernel.ts', import.meta.url);
const source = fs.readFileSync(sourcePath, 'utf8');
const browserEnemyAi = fs.readFileSync(new URL('../src/game/enemyRunAI.ts', import.meta.url), 'utf8');
const browserRegionalIdentity = fs.readFileSync(new URL('../src/game/enemyRegionalIdentity.ts', import.meta.url), 'utf8');
const server = await createServer({
  root: fileURLToPath(new URL('../../../', import.meta.url)),
  configFile: false,
  logLevel: 'silent',
  appType: 'custom',
  server: { middlewareMode: true },
});
const kernel = await server.ssrLoadModule('/supabase/functions/_shared/duo_authority_kernel.ts');
const factory = await server.ssrLoadModule('/supabase/functions/_shared/duo_authority_factory.ts');
after(async () => server.close());

const buildIdentity = classKey => {
  const combat = kernel.CANONICAL_CLASS_COMBAT_MANIFEST[classKey];
  return {
    buildRevision: 0,
    buildDigest: 'a'.repeat(64),
    buildSnapshot: {
      profileVersion: 'duo-profile-v1', catalogVersion: 'duo-build-catalog-v1',
      classKey, loadoutKey: 'canonical-base-v1', skillRanks: {},
      maxHp: combat.maxHp, attack: combat.attack, defense: combat.defense, speed: combat.speed,
      attackRange: combat.attackRange, skillRange: combat.skillRange,
      attackCooldownMs: combat.attackCooldownMs, skillCooldownMs: combat.skillCooldownMs,
    },
  };
};
const actor = (overrides = {}) => {
  const classKey = overrides.classKey ?? 'warrior';
  return { actorId: 'host', classKey, ...buildIdentity(classKey), spawnX: 100, spawnY: 100, ...overrides };
};
const enemy = (overrides = {}) => ({ enemyType: 'slime', x: 180, y: 100, ...overrides });
const createAwaitingBase = (overrides = {}) => kernel.createCanonicalEncounterState({
  runId: 'run-461', runAttempt: 2, chapter: 1, room: 1, seed: 424242, authorityStartedAtMs: 1000,
  actors: [actor()], enemies: [enemy()], ...overrides,
});
// Most pre-existing reducer unit cases start from a persisted post-handshake
// fixture. Handshake behavior itself is covered independently below.
const createBase = (overrides = {}) => {
  const state = createAwaitingBase(overrides);
  return Object.freeze({
    ...state,
    authorityStartedAtMs: 1000,
    startAcknowledgedByActor: Object.freeze(Object.fromEntries(state.actors.filter(item => item.active).map(item => [item.actorId, true]))),
    lifecycle: 'running',
  });
};
const move = (state, clientSeq, authorityNowMs, directionX, directionY = 0) =>
  kernel.reduceAuthorityIntent(state, { kind: 'move', actorId: 'host', directionX, directionY, clientSeq }, authorityNowMs);
const hit = (state, clientSeq, authorityNowMs, targetEnemyId = state.enemies[0].enemyId, extra = {}) =>
  kernel.reduceAuthorityIntent(state, { kind: 'basic-hit', actorId: 'host', targetEnemyId, clientSeq, ...extra }, authorityNowMs);
const dodge = (state, actorId, clientSeq, authorityNowMs, directionX, directionY) =>
  kernel.reduceAuthorityIntent(state, { kind: 'dodge', actorId, directionX, directionY, clientSeq }, authorityNowMs);

test('canonical class manifest owns base attack, speed, size, range and cadence', () => {
  for (const [classKey, expected] of Object.entries({
    warrior: { attack: 12, speed: 118, size: 32, range: 65, cooldown: 350, dodgeCooldown: 1200, dash: 80 },
    mage: { attack: 20, speed: 130, size: 32, range: 55, cooldown: 550, dodgeCooldown: 1800, dash: 105 },
    archer: { attack: 10, speed: 218, size: 32, range: 105, cooldown: 270, dodgeCooldown: 900, dash: 100 },
  })) {
    const state = createBase({ actors: [actor({ classKey })] });
    const actual = state.actors[0];
    assert.equal(actual.attack, expected.attack);
    assert.equal(actual.speed, expected.speed);
    assert.equal(actual.width, expected.size);
    assert.equal(actual.height, expected.size);
    assert.equal(actual.attackRange, expected.range);
    assert.equal(actual.attackCooldownMs, expected.cooldown);
    assert.equal(kernel.CANONICAL_CLASS_COMBAT_MANIFEST[classKey].dodgeCooldownMs, expected.dodgeCooldown);
    assert.equal(kernel.CANONICAL_CLASS_COMBAT_MANIFEST[classKey].dashDistance, expected.dash);
  }
  const actorInputType = source.match(/export type AuthorityActorInput = Readonly<\{([\s\S]*?)\}>;/)?.[1] ?? '';
  for (const forbidden of ['attack:', 'width:', 'height:', ' x:', ' y:']) {
    assert.equal(actorInputType.includes(forbidden), false, `AuthorityActorInput must not trust ${forbidden}`);
  }
});

test('authority enemy roles and boss profiles match the shipped browser combat contract', () => {
  assert.deepEqual(kernel.AUTHORITY_ENEMY_ARCHETYPES, {
    slime: 'skeleton', goblin: 'skeleton', skeleton: 'skeleton',
    spider: 'skirmisher', vampire: 'skirmisher',
    orc: 'guardian', demon: 'guardian', golem: 'guardian', boss: 'dragon',
  });
  assert.deepEqual(kernel.AUTHORITY_BOSS_COMBAT_PROFILES, {
    20: { attackRange: 178, attackDelay: 1040, moveScale: 0.9, element: 'arcane', pattern: 'caster' },
    30: { attackRange: 190, attackDelay: 820, moveScale: 1.12, element: 'normal', pattern: 'ranger' },
    40: { attackRange: 92, attackDelay: 690, moveScale: 1.2, element: 'arcane', pattern: 'assassin' },
    50: { attackRange: 138, attackDelay: 720, moveScale: 1.06, element: 'fire', pattern: 'warden' },
    60: { attackRange: 176, attackDelay: 790, moveScale: 1.02, element: 'normal', pattern: 'ranger' },
    70: { attackRange: 184, attackDelay: 930, moveScale: 0.94, element: 'arcane', pattern: 'caster' },
    80: { attackRange: 108, attackDelay: 740, moveScale: 1.08, element: 'normal', pattern: 'assassin' },
    90: { attackRange: 146, attackDelay: 700, moveScale: 1.04, element: 'fire', pattern: 'warden' },
    100: { attackRange: 184, attackDelay: 930, moveScale: 0.94, element: 'arcane', pattern: 'caster' },
  });
  assert.match(browserEnemyAi, /type === 'spider' \|\| type === 'vampire'\) return 'skirmisher'/);
  assert.match(browserEnemyAi, /type === 'demon' \|\| type === 'golem' \|\| type === 'orc'\) return 'guardian'/);
  for (const [room, profile] of Object.entries(kernel.AUTHORITY_BOSS_COMBAT_PROFILES)) {
    const line = browserRegionalIdentity.split('\n').find(candidate => candidate.includes(`room === ${room}`) && candidate.includes('attackRange:')) ?? '';
    assert.ok(line, `room ${room} browser boss profile must exist`);
    assert.match(line, new RegExp(`attackRange: ${profile.attackRange}`));
    assert.match(line, new RegExp(`attackDelay: ${profile.attackDelay}`));
    assert.match(line, new RegExp(`moveScale: ${profile.moveScale}`));
    assert.match(line, new RegExp(`element: '${profile.element}'`));
    assert.match(line, new RegExp(`pattern: '${profile.pattern}'`));
  }
  assert.match(source, /moveEnemyWithDetour/);
  assert.match(source, /\[0, 45, -45, 72, -72, 105, -105\]/);
});

test('movement is server-integrated from direction, canonical speed and authority time', () => {
  const base = createBase();
  const moved = move(base, 1, 1100, 1);
  assert.equal(moved.state.actors[0].x, 111.8);
  assert.equal(moved.state.actors[0].y, 100);
  assert.equal(moved.state.actors[0].lastAuthorityAtMs, 1100);
  assert.equal(moved.state.version, 1);
  assert.equal(moved.state.lastClientSeqByActor.host, 1);
});

test('teleport vectors and backwards authority time fail closed while oversized idle gaps resynchronize without displacement', () => {
  const base = createBase();
  assert.throws(() => move(base, 1, 1100, 2, 0), /magnitude exceeds one/);
  assert.throws(() => move(base, 1, 999, 1, 0), /time cannot move backwards/);

  const resynced = move(base, 1, 1300, 1, 0);
  assert.equal(resynced.state.actors[0].x, 100);
  assert.equal(resynced.state.actors[0].y, 100);
  assert.equal(resynced.state.actors[0].lastAuthorityAtMs, 1300);
  assert.equal(resynced.state.lastClientSeqByActor.host, 1);
  assert.equal(resynced.state.version, 1);

  const moved = move(resynced.state, 2, 1400, 1, 0);
  assert.equal(moved.state.actors[0].x, 111.8);
  assert.equal(moved.state.actors[0].lastAuthorityAtMs, 1400);
  assert.equal(moved.state.lastClientSeqByActor.host, 2);

  assert.equal(base.version, 0);
  assert.equal(base.actors[0].x, 100);
});

test('forged absolute position fields cannot move an actor into hit range', () => {
  const base = createBase({ actors: [actor({ classKey: 'warrior' })], enemies: [enemy({ x: 220 })] });
  assert.throws(() => hit(base, 1, 1000, base.enemies[0].enemyId, { x: 220, y: 100, actorX: 220, targetX: 220 }), /outside canonical basic-hit range/);
  const moved = move(base, 1, 1250, 1);
  assert.throws(() => hit(moved.state, 2, 1250), /outside canonical basic-hit range/);
});

test('sequencing spans movement and hits, blocking replay and gaps', () => {
  const base = createBase({ enemies: [enemy({ x: 140 })] });
  const moved = move(base, 1, 1100, 0.5);
  assert.throws(() => move(moved.state, 1, 1200, 0.5), /replayed|out-of-order/);
  assert.throws(() => hit(moved.state, 3, 1200), /gap/);
  const firstHit = hit(moved.state, 2, 1200);
  assert.equal(firstHit.state.version, 2);
  assert.equal(firstHit.state.lastClientSeqByActor.host, 2);
});

test('canonical attack cannot be inflated through forged hit payload fields', () => {
  const base = createBase({ actors: [actor({ classKey: 'warrior' })], enemies: [enemy({ x: 130 })] });
  const normal = hit(base, 1, 1000);
  const forged = hit(base, 1, 1000, base.enemies[0].enemyId, { damage: 999999, attack: 999999, room_clear: true, chapter: 999999 });
  assert.deepEqual(forged, normal);
  assert.equal(normal.state.enemies[0].hp, normal.state.enemies[0].maxHp - 12);
});

test('server-owned cadence and movement clock cannot be bypassed by caller timestamps', () => {
  const base = createBase({ actors: [actor({ classKey: 'mage' })], enemies: [enemy({ x: 130 })] });
  const first = hit(base, 1, 1000);
  assert.throws(() => hit(first.state, 2, 1200, first.state.enemies[0].enemyId, { timestamp: 999999, cooldown: 0 }), /cadence not ready/);

  const caughtUp = kernel.reduceAuthorityIntent(first.state, { kind: 'sync', actorId: 'host', clientSeq: 2 }, 1300).state;
  const resynced = move(caughtUp, 3, 1300, 1);
  assert.equal(resynced.state.actors[0].x, 100);
  assert.equal(resynced.state.actors[0].lastAuthorityAtMs, 1300);

  const moved = move(resynced.state, 4, 1400, 1);
  assert.equal(moved.state.actors[0].x, 113);
  assert.equal(moved.state.actors[0].lastAuthorityAtMs, 1400);
});

test('completion still requires canonical enemy hp to reach zero', () => {
  let state = createBase({ actors: [actor({ classKey: 'mage' })], enemies: [enemy({ x: 120 })] });
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
  assert.match(source, /movementAccepted = elapsedMs <= MAX_AUTHORITY_MOVEMENT_STEP_MS/);
  assert.match(source, /distance = movementAccepted \? actor\.speed \* \(elapsedMs \/ 1000\) : 0/);
  assert.match(source, /attack: build\.attack/);
  assert.match(source, /speed: build\.speed/);
  assert.match(source, /intent\.clientSeq !== previousSeq \+ 1/);
  assert.match(source, /authorityNowMs < actor\.lastAuthorityAtMs/);
  assert.match(source, /isWithinBasicHitRange\(actor, target\)/);
});

test('all active actors must acknowledge one durable bootstrap before future canonical forecasting starts combat', () => {
  const base = createAwaitingBase({
    actors: [actor({ actorId: 'a' }), actor({ actorId: 'b', spawnX: 95 })],
    enemies: [enemy({ enemyType: 'boss', x: 110 })],
  });
  assert.equal(base.lifecycle, 'awaiting-start');
  assert.throws(() => kernel.reduceAuthorityIntent(base, { kind: 'sync', actorId: 'a', clientSeq: 1 }, 5000), /acknowledgement required/);
  const first = kernel.reduceAuthorityIntent(base, { kind: 'start-ack', actorId: 'a', clientSeq: 1 }, 5000).state;
  assert.equal(first.lifecycle, 'awaiting-start');
  assert.equal(first.authorityStartedAtMs, null);
  assert.equal(first.enemies[0].attackPhase, 'idle');
  const started = kernel.reduceAuthorityIntent(first, { kind: 'start-ack', actorId: 'b', clientSeq: 1 }, 5100).state;
  assert.equal(started.lifecycle, 'running');
  assert.equal(started.authorityStartedAtMs, 6300);
  assert.equal(started.enemies[0].attackPhase, 'idle');
  assert.equal(started.actors[0].hp, started.actors[0].maxHp);
  const forecast = kernel.reduceAuthorityIntent(started, { kind: 'sync', actorId: 'a', clientSeq: 2 }, 6400).state;
  assert.equal(forecast.enemies[0].attackPhase, 'telegraph');
  assert.equal(forecast.enemies[0].telegraphStartedAtMs, 6400);
  assert.ok(forecast.enemies[0].attackImpactAtMs > forecast.enemies[0].telegraphStartedAtMs);
  assert.equal(forecast.actors[0].hp, forecast.actors[0].maxHp);
});

test('real Room 1 emits one durable full-windup forecast before one deterministic impact', () => {
  const awaiting = factory.createRoomBoundCanonicalEncounterState({
    runId: 'real-room-start', runAttempt: 1, chapter: 1, room: 1, seed: 424242,
    authorityStartedAtMs: 1000,
    actors: [
      { actorId: 'a', classKey: 'warrior', ...buildIdentity('warrior') },
      { actorId: 'b', classKey: 'mage', ...buildIdentity('mage') },
    ],
  });
  const first = kernel.reduceAuthorityIntent(
    awaiting,
    { kind: 'start-ack', actorId: 'a', clientSeq: 1 },
    1000,
  ).state;
  const started = kernel.reduceAuthorityIntent(
    first,
    { kind: 'start-ack', actorId: 'b', clientSeq: 1 },
    1000,
  ).state;
  assert.equal(started.enemies.some(candidate => candidate.attackPhase === 'telegraph'), false,
    'start acknowledgement must not persist a zero-windup forecast');
  assert.equal(started.actors.every(candidate => candidate.hp === candidate.maxHp), true);

  const forecast = kernel.advanceCanonicalSimulation(started, started.authorityStartedAtMs + 30000);
  const persistedTelegraphs = forecast.enemies.filter(candidate => candidate.attackPhase === 'telegraph');
  assert.equal(persistedTelegraphs.length, 1, 'the first real Room 1 boundary must persist exactly one forecast');
  const announced = persistedTelegraphs[0];
  assert.equal(announced.telegraphMs, 165, 'the real Room 1 first forecast must retain its authored windup');
  assert.equal(announced.attackImpactAtMs - announced.telegraphStartedAtMs, announced.telegraphMs,
    'the later first forecast must preserve the full authored windup');
  assert.equal(forecast.actors.every(candidate => candidate.hp === candidate.maxHp), true,
    'forecast persistence must not include pre-impact damage');

  const plusOne = kernel.advanceCanonicalSimulation(forecast, announced.telegraphStartedAtMs + 1);
  const retained = plusOne.enemies.find(candidate => candidate.enemyId === announced.enemyId);
  assert.equal(retained?.attackPhase, 'telegraph', 'the announced forecast must remain visible after +1 ms');
  assert.equal(retained?.targetActorId, announced.targetActorId, 'the announced target must remain locked after +1 ms');
  assert.equal(plusOne.actors.every(candidate => candidate.hp === candidate.maxHp), true,
    'the +1 ms snapshot must remain damage-free');

  const beforeImpact = kernel.advanceCanonicalSimulation(plusOne, announced.attackImpactAtMs - 1);
  const before = beforeImpact.enemies.find(candidate => candidate.enemyId === announced.enemyId);
  assert.equal(before?.attackPhase, 'telegraph', 'the forecast must survive until the final pre-impact millisecond');
  assert.equal(before?.targetActorId, announced.targetActorId, 'the target must remain locked for the entire windup');
  assert.equal(beforeImpact.actors.every(candidate => candidate.hp === candidate.maxHp), true,
    'the full authored windup must remain damage-free');

  const impacted = kernel.advanceCanonicalSimulation(beforeImpact, announced.attackImpactAtMs);
  const impactReplay = kernel.advanceCanonicalSimulation(beforeImpact, announced.attackImpactAtMs);
  assert.deepEqual(impacted, impactReplay, 'the first real Room 1 impact boundary must be byte-stable');
  const settled = impacted.enemies.find(candidate => candidate.enemyId === announced.enemyId);
  assert.equal(settled?.attackPhase, 'idle');
  assert.equal(settled?.attackOrdinal, announced.attackOrdinal + 1, 'the announced attack must settle exactly once');
  assert.equal(
    impacted.enemies.reduce((count, candidate, index) =>
      count + Number(candidate.attackOrdinal > beforeImpact.enemies[index].attackOrdinal), 0),
    1,
    'one persisted authority version may settle exactly one impact boundary',
  );
  const targetBefore = beforeImpact.actors.find(candidate => candidate.actorId === announced.targetActorId);
  const targetAfter = impacted.actors.find(candidate => candidate.actorId === announced.targetActorId);
  assert.ok(targetAfter.hp < targetBefore.hp, 'the locked target must receive canonical damage only at impact');
});

test('equal-time multi-enemy forecasts and impacts persist one deterministic boundary per version', () => {
  const base = createBase({
    actors: [actor({ actorId: 'a', spawnX: 100 })],
    enemies: [
      enemy({ enemyType: 'slime', x: 110, y: 100 }),
      enemy({ enemyType: 'goblin', x: 112, y: 100 }),
    ],
  });
  const firstForecast = kernel.reduceAuthorityIntent(
    base,
    { kind: 'sync', actorId: 'a', clientSeq: 1 },
    1100,
  ).state;
  const forecastReplay = kernel.reduceAuthorityIntent(
    base,
    { kind: 'sync', actorId: 'a', clientSeq: 1 },
    1100,
  ).state;
  assert.deepEqual(firstForecast, forecastReplay, 'equal-time forecast ordering must be byte-stable');
  assert.equal(firstForecast.enemies.filter(candidate => candidate.attackPhase === 'telegraph').length, 1,
    'one version may persist only one forecast boundary');

  const impactAtMs = 1400;
  const simultaneous = Object.freeze({
    ...base,
    authorityNowMs: 1100,
    enemies: Object.freeze(base.enemies.map(candidate => Object.freeze({
      ...candidate,
      attackPhase: 'telegraph',
      attackPattern: 'melee',
      targetActorId: 'a',
      telegraphStartedAtMs: 1000,
      attackImpactAtMs: impactAtMs,
      telegraphKey: `${candidate.enemyType}:0:melee`,
    }))),
  });
  const firstImpact = kernel.advanceCanonicalSimulation(simultaneous, impactAtMs);
  const impactReplay = kernel.advanceCanonicalSimulation(simultaneous, impactAtMs);
  assert.deepEqual(firstImpact, impactReplay, 'equal-time impact ordering must be byte-stable');
  assert.equal(firstImpact.enemies.reduce((sum, candidate) => sum + candidate.attackOrdinal, 0), 1,
    'one version may settle only one impact boundary');
  assert.equal(firstImpact.enemies.filter(candidate => candidate.attackPhase === 'telegraph').length, 1,
    'the later equal-time boundary must remain persisted for a later CAS version');
});

test('server clock persists a full observable telegraph before deterministic locked-target damage', () => {
  const base = createBase({
    chapter: 20,
    actors: [actor({ actorId: 'a', spawnX: 100 }), actor({ actorId: 'b', spawnX: 95 })],
    enemies: [enemy({ enemyType: 'boss', x: 110 })],
  });
  const first = kernel.reduceAuthorityIntent(base, { kind: 'sync', actorId: 'a', clientSeq: 1 }, 1100);
  const replay = kernel.reduceAuthorityIntent(base, { kind: 'sync', actorId: 'a', clientSeq: 1 }, 1100);
  assert.deepEqual(first, replay, 'same seed, durable state and server time must be byte-equivalent');
  assert.equal(first.state.authorityNowMs, 1100);
  assert.equal(first.state.enemies[0].attackPhase, 'telegraph');
  assert.equal(first.state.enemies[0].attackOrdinal, 0);
  assert.equal(first.state.enemies[0].attackPattern, 'boss-guardian');
  assert.equal(first.state.enemies[0].telegraphKey, 'boss:0:boss-guardian');
  assert.equal(first.state.enemies[0].targetActorId, 'a');
  assert.equal(first.state.enemies[0].attackImpactAtMs, 1440);
  assert.equal(first.state.actors[0].hp, first.state.actors[0].maxHp, 'first observation must never include untelegraphed damage');

  const beforeImpact = kernel.reduceAuthorityIntent(
    first.state,
    { kind: 'sync', actorId: 'b', clientSeq: 1 },
    1439,
  ).state;
  assert.equal(beforeImpact.enemies[0].targetActorId, 'a', 'target remains locked during windup');
  assert.equal(beforeImpact.enemies[0].attackPhase, 'telegraph');
  assert.equal(beforeImpact.actors[0].hp, beforeImpact.actors[0].maxHp);

  const impacted = kernel.reduceAuthorityIntent(
    beforeImpact,
    { kind: 'sync', actorId: 'a', clientSeq: 2 },
    1440,
  ).state;
  assert.equal(impacted.enemies[0].attackOrdinal, 1);
  assert.equal(impacted.enemies[0].attackPhase, 'idle');
  assert.equal(impacted.enemies[0].targetActorId, null);
  assert.ok(impacted.actors[0].hp < impacted.actors[0].maxHp, 'locked impact must apply canonical damage');
  assert.equal(impacted.actors[0].hp, 0);
  assert.equal(impacted.lifecycle, 'running', 'living partner prevents premature defeat');
});

test('boss phase and room profile deterministically expose the shipped pattern', () => {
  const base = createBase({
    chapter: 20, room: 20,
    actors: [actor({ actorId: 'a', spawnX: 100 })],
    enemies: [enemy({ enemyType: 'boss', x: 110 })],
  });
  const phaseThree = Object.freeze({
    ...base,
    enemies: Object.freeze([Object.freeze({
      ...base.enemies[0],
      hp: Math.floor(base.enemies[0].maxHp / 3),
      attackOrdinal: 2,
      nextAttackAtMs: 1000,
    })]),
  });
  const telegraphed = kernel.reduceAuthorityIntent(
    phaseThree,
    { kind: 'sync', actorId: 'a', clientSeq: 1 },
    1100,
  ).state;
  assert.equal(telegraphed.enemies[0].bossPhase, 3);
  assert.equal(telegraphed.enemies[0].attackPattern, 'boss-caster');
  assert.equal(telegraphed.enemies[0].telegraphKey, 'boss:2:boss-caster');
  assert.equal(telegraphed.enemies[0].targetActorId, 'a');
});

test('boss patterns, elements and phases change deterministic canonical damage outcomes', () => {
  const damageFor = (room, phase) => {
    const base = createBase({
      chapter: 1, room,
      actors: [actor({ actorId: 'a', classKey: 'warrior', spawnX: 100 })],
      enemies: [enemy({ enemyType: 'boss', x: 110 })],
    });
    const durable = Object.freeze({
      ...base,
      actors: Object.freeze([Object.freeze({ ...base.actors[0], hp: 10000, maxHp: 10000 })]),
      enemies: Object.freeze([Object.freeze({
        ...base.enemies[0],
        hp: phase === 1 ? base.enemies[0].maxHp : phase === 2 ? Math.floor(base.enemies[0].maxHp * 0.6) : Math.floor(base.enemies[0].maxHp * 0.3),
      })]),
    });
    const forecast = kernel.reduceAuthorityIntent(durable, { kind: 'sync', actorId: 'a', clientSeq: 1 }, 1100).state;
    const impactAt = forecast.enemies[0].attackImpactAtMs;
    const impacted = kernel.reduceAuthorityIntent(forecast, { kind: 'sync', actorId: 'a', clientSeq: 2 }, impactAt).state;
    return 10000 - impacted.actors[0].hp;
  };
  const representative = [20, 30, 40, 50, 60, 70, 80, 90, 100].map(room => damageFor(room, 1));
  assert.ok(new Set(representative).size >= 4, 'retained boss profiles must produce materially distinct damage, not labels only');
  assert.ok(damageFor(20, 3) > damageFor(20, 1), 'phase three must increase the canonical outcome');
});

test('lethal server impact wins deterministically over a same-tick final player hit', () => {
  const base = createBase({
    chapter: 20,
    actors: [actor({ actorId: 'a', classKey: 'mage', spawnX: 100 })],
    enemies: [enemy({ enemyType: 'boss', x: 110 })],
  });
  const telegraphed = kernel.reduceAuthorityIntent(
    base,
    { kind: 'sync', actorId: 'a', clientSeq: 1 },
    1100,
  ).state;
  const contested = Object.freeze({
    ...telegraphed,
    enemies: Object.freeze([Object.freeze({ ...telegraphed.enemies[0], hp: 1 })]),
  });
  const resolved = kernel.reduceAuthorityIntent(
    contested,
    { kind: 'basic-hit', actorId: 'a', targetEnemyId: contested.enemies[0].enemyId, clientSeq: 2 },
    1440,
  );
  assert.equal(resolved.state.lifecycle, 'team-defeated');
  assert.equal(resolved.state.actors[0].lifeState, 'downed');
  assert.equal(resolved.state.enemies[0].hp, 1, 'intent cannot execute after terminal simulation outcome');
  assert.equal(resolved.event, null);
});

test('telegraphed enemy attack cancels when its locked target becomes invalid', () => {
  const base = createBase({
    actors: [actor({ actorId: 'a', spawnX: 100 }), actor({ actorId: 'b', spawnX: 95 })],
    enemies: [enemy({ enemyType: 'boss', x: 110 })],
  });
  const telegraphed = kernel.reduceAuthorityIntent(
    base,
    { kind: 'sync', actorId: 'a', clientSeq: 1 },
    1100,
  ).state;
  const displacedTarget = Object.freeze({
    ...telegraphed,
    actors: Object.freeze(telegraphed.actors.map(candidate => candidate.actorId === 'a'
      ? Object.freeze({ ...candidate, x: 400 })
      : candidate)),
  });
  const cancelled = kernel.advanceCanonicalSimulation(displacedTarget, 1440);
  assert.equal(cancelled.enemies[0].attackPhase, 'idle');
  assert.equal(cancelled.enemies[0].targetActorId, null);
  assert.equal(cancelled.enemies[0].attackOrdinal, 0);
  assert.equal(cancelled.actors[0].hp, cancelled.actors[0].maxHp);
});

test('request withholding never grants combat invulnerability or pauses canonical catch-up', () => {
  const base = createBase({
    actors: [actor({ actorId: 'a', spawnX: 100 }), actor({ actorId: 'b', spawnX: 95 })],
    enemies: [enemy({ enemyType: 'boss', x: 110 })],
  });
  const telegraphed = kernel.reduceAuthorityIntent(
    base,
    { kind: 'sync', actorId: 'a', clientSeq: 1 },
    1100,
  ).state;
  const impacted = kernel.advanceCanonicalSimulation(telegraphed, 1440);
  assert.equal(impacted.enemies[0].attackPhase, 'idle');
  assert.equal(impacted.enemies[0].attackOrdinal, 1);
  assert.ok(impacted.actors[0].hp < impacted.actors[0].maxHp, 'expired presence must not suppress locked damage');
  assert.equal(impacted.actors[1].hp, impacted.actors[1].maxHp, 'locked windup must not jump to the connected partner');
});

test('server-owned dodge moves canonically and grants only the bounded impact window', () => {
  const base = createBase({
    chapter: 20, room: 20,
    actors: [actor({ actorId: 'a', spawnX: 100 }), actor({ actorId: 'b', spawnX: 95 })],
    enemies: [enemy({ enemyType: 'boss', x: 110 })],
  });
  const telegraphed = kernel.reduceAuthorityIntent(
    base,
    { kind: 'sync', actorId: 'a', clientSeq: 1 },
    1100,
  ).state;
  const dodged = dodge(telegraphed, 'a', 2, 1300, 0, 1).state;
  assert.equal(dodged.actors[0].x, 100);
  assert.equal(dodged.actors[0].y, 180);
  assert.equal(dodged.actors[0].invulnerableUntilMs, 1560);
  assert.equal(dodged.actors[0].nextDodgeAtMs, 2500);
  assert.throws(() => dodge(dodged, 'a', 3, 1400, 0, -1), /dodge cadence not ready/);

  const impacted = kernel.reduceAuthorityIntent(
    dodged,
    { kind: 'sync', actorId: 'b', clientSeq: 1 },
    1560,
  ).state;
  assert.equal(impacted.enemies[0].attackOrdinal, 1, 'invulnerability resolves rather than postpones the attack');
  assert.equal(impacted.actors[0].lifeState, 'alive');
  assert.equal(impacted.actors[0].hp, impacted.actors[0].maxHp);
});

test('enemy attacks respect canonical room occlusion before telegraphing', () => {
  const base = createBase({
    actors: [actor({ spawnX: 404, spawnY: 536 })],
    enemies: [enemy({ enemyType: 'boss', x: 463, y: 515 })],
  });
  const advanced = kernel.reduceAuthorityIntent(
    base,
    { kind: 'sync', actorId: 'host', clientSeq: 1 },
    1100,
  ).state;
  assert.equal(advanced.enemies[0].attackPhase, 'idle');
  assert.equal(advanced.enemies[0].targetActorId, null);
  assert.equal(advanced.actors[0].hp, advanced.actors[0].maxHp);
});

test('long request gaps never pause authority and settle only one previously committed boundary per version', () => {
  const base = createBase();
  const announced = kernel.reduceAuthorityIntent(base, { kind: 'sync', actorId: 'host', clientSeq: 1 }, 7000).state;
  assert.equal(announced.lifecycle, 'running');
  assert.equal(announced.enemies[0].attackPhase, 'telegraph');
  assert.ok(announced.authorityNowMs < 7000, 'one sync persists one boundary instead of an unbounded burst');
  const impacted = kernel.reduceAuthorityIntent(announced, { kind: 'sync', actorId: 'host', clientSeq: 2 }, 7000).state;
  assert.equal(impacted.enemies[0].attackOrdinal, 1);
  assert.equal(impacted.enemies[0].attackPhase, 'idle');
  assert.ok(impacted.authorityNowMs < 7000, 'impact and next forecast require distinct durable versions');
  const forecasted = move(impacted, 3, 7000, 0).state;
  assert.equal(forecasted.enemies[0].attackPhase, 'telegraph');
  assert.ok(forecasted.enemies[0].attackImpactAtMs > forecasted.authorityNowMs);
});

test('revive hold uses canonical elapsed time and restores only a downed nearby partner', () => {
  const base = createBase({
    chapter: 20, room: 20,
    actors: [actor({ actorId: 'a', spawnX: 100 }), actor({ actorId: 'b', spawnX: 95 })],
    enemies: [enemy({ enemyType: 'boss', x: 110 })],
  });
  const telegraphed = kernel.reduceAuthorityIntent(base, { kind: 'sync', actorId: 'a', clientSeq: 1 }, 1100).state;
  const damaged = kernel.reduceAuthorityIntent(
    telegraphed,
    { kind: 'sync', actorId: 'b', clientSeq: 1 },
    1560,
  ).state;
  assert.equal(damaged.actors[0].lifeState, 'downed');
  const safeToRevive = Object.freeze({
    ...damaged,
    enemies: Object.freeze(damaged.enemies.map(candidate => Object.freeze({ ...candidate, nextAttackAtMs: 10000 }))),
  });
  const started = kernel.reduceAuthorityIntent(
    safeToRevive,
    { kind: 'revive-hold', actorId: 'b', targetActorId: 'a', clientSeq: 2 },
    1560,
  ).state;
  assert.equal(started.actors[0].lifeState, 'downed');
  assert.equal(started.actors[1].reviveTargetActorId, 'a');
  const stillHolding = kernel.reduceAuthorityIntent(
    started,
    { kind: 'revive-hold', actorId: 'b', targetActorId: 'a', clientSeq: 3 },
    3060,
  ).state;
  assert.equal(stillHolding.actors[0].lifeState, 'downed');
  const revived = kernel.reduceAuthorityIntent(
    stillHolding,
    { kind: 'revive-hold', actorId: 'b', targetActorId: 'a', clientSeq: 4 },
    4560,
  ).state;
  assert.equal(revived.actors[0].lifeState, 'alive');
  assert.equal(revived.actors[0].hp, Math.ceil(revived.actors[0].maxHp * 0.35));
  assert.equal(revived.actors[0].revivesUsed, 1);
  assert.equal(revived.actors[1].reviveTargetActorId, null);
  assert.throws(
    () => kernel.reduceAuthorityIntent(
      revived,
      { kind: 'revive-hold', actorId: 'b', targetActorId: 'a', clientSeq: 5 },
      4561,
    ),
    /revive target is not downed/,
  );
});

test('trusted build ranks affect canonical multihit, fire and ice outcomes', () => {
  const ranked = actor({
    buildSnapshot: {
      ...actor().buildSnapshot,
      skillRanks: { multishot: 1, fireArrow: 2, iceArrow: 1 },
    },
  });
  const base = createBase({ actors: [ranked], enemies: [enemy({ x: 140 }), enemy({ x: 150 })] });
  const result = hit(base, 1, 1000);
  assert.ok(result.state.enemies[0].hp < result.state.enemies[0].maxHp);
  assert.ok(result.state.enemies[1].hp < result.state.enemies[1].maxHp, 'multishot must affect another canonical target');
  assert.equal(result.state.enemies[0].burnDamage, 3);
  assert.equal(result.state.enemies[0].burnTicksRemaining, 4);
  assert.equal(result.state.enemies[0].burnUntilMs, 3080);
  assert.equal(result.state.enemies[1].slowUntilMs, 3000);
  assert.equal(result.state.enemies[1].slowMultiplier, 0.8);
});

test('piercing follows the primary ray while ricochet chooses a distinct visible target', () => {
  const ranked = actor({
    buildSnapshot: {
      ...actor().buildSnapshot,
      skillRanks: { piercing: 1, ricochet: 1 },
    },
  });
  const base = createBase({
    actors: [ranked],
    enemies: [enemy({ x: 130, y: 100 }), enemy({ x: 180, y: 100 }), enemy({ x: 130, y: 160 })],
  });
  const result = hit(base, 1, 1000);
  assert.equal(result.state.enemies[0].hp, 12, 'primary takes full canonical damage');
  assert.equal(result.state.enemies[1].hp, 16, 'piercing rank I deals 70% canonical damage along the ray');
  assert.equal(result.state.enemies[2].hp, 16, 'ricochet rank I deals 65% canonical damage to another target');
});
