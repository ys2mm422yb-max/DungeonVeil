import { DUO_AUTHORITY_ROOM_MANIFEST } from './duo_authority_room_manifest.ts';

export type AuthorityEnemyType = 'slime' | 'goblin' | 'skeleton' | 'orc' | 'spider' | 'vampire' | 'demon' | 'golem' | 'boss';
export type AuthorityClassKey = 'warrior' | 'mage' | 'archer';
export type AuthorityEnemyArchetype = 'skeleton' | 'skirmisher' | 'guardian' | 'dragon';
export type AuthorityBossPattern = 'guardian' | 'caster' | 'ranger' | 'assassin' | 'warden';

export type AuthorityBossCombatProfile = Readonly<{
  attackRange: number;
  attackDelay: number;
  moveScale: number;
  element: 'normal' | 'fire' | 'arcane';
  pattern: AuthorityBossPattern;
}>;

export type AuthorityEnemyManifestEntry = Readonly<{
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  size: number;
  xp: number;
  color: string;
  attackRange: number;
  attackCooldownMs: number;
  telegraphMs: number;
}>;

export type AuthorityClassCombatEntry = Readonly<{
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  actorSize: number;
  attackRange: number;
  skillRange: number;
  attackCooldownMs: number;
  skillCooldownMs: number;
  dodgeCooldownMs: number;
  dashDistance: number;
}>;

export const CANONICAL_CLASS_COMBAT_MANIFEST: Readonly<Record<AuthorityClassKey, AuthorityClassCombatEntry>> = Object.freeze({
  warrior: Object.freeze({ maxHp: 150, attack: 12, defense: 8, speed: 118, actorSize: 32, attackRange: 65, skillRange: 130, attackCooldownMs: 350, skillCooldownMs: 6000, dodgeCooldownMs: 1200, dashDistance: 80 }),
  mage: Object.freeze({ maxHp: 80, attack: 20, defense: 2, speed: 130, actorSize: 32, attackRange: 55, skillRange: 175, attackCooldownMs: 550, skillCooldownMs: 4000, dodgeCooldownMs: 1800, dashDistance: 105 }),
  archer: Object.freeze({ maxHp: 100, attack: 10, defense: 4, speed: 218, actorSize: 32, attackRange: 105, skillRange: 95, attackCooldownMs: 270, skillCooldownMs: 3000, dodgeCooldownMs: 900, dashDistance: 100 }),
});

export type AuthorityBuildSnapshot = Readonly<{
  profileVersion: 'duo-profile-v1';
  catalogVersion: 'duo-build-catalog-v1';
  classKey: AuthorityClassKey;
  loadoutKey: 'canonical-base-v1';
  skillRanks: Readonly<Record<string, number>>;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  attackRange: number;
  skillRange: number;
  attackCooldownMs: number;
  skillCooldownMs: number;
}>;

export const MAX_AUTHORITY_MOVEMENT_STEP_MS = 250;
export const MAX_AUTHORITY_SIMULATION_STEP_MS = 100;
export const AUTHORITY_START_COUNTDOWN_MS = 1200;
export const AUTHORITY_REVIVE_HOLD_MS = 1500;
export const AUTHORITY_DOWNED_TO_FALLEN_MS = 30000;

export const AUTHORITY_ENEMY_ARCHETYPES: Readonly<Record<AuthorityEnemyType, AuthorityEnemyArchetype>> = Object.freeze({
  slime: 'skeleton',
  goblin: 'skeleton',
  skeleton: 'skeleton',
  spider: 'skirmisher',
  vampire: 'skirmisher',
  orc: 'guardian',
  demon: 'guardian',
  golem: 'guardian',
  boss: 'dragon',
});

const DEFAULT_BOSS_PROFILE: AuthorityBossCombatProfile = Object.freeze({
  attackRange: 72,
  attackDelay: 860,
  moveScale: 0.96,
  element: 'normal',
  pattern: 'guardian',
});

export const AUTHORITY_BOSS_COMBAT_PROFILES: Readonly<Record<number, AuthorityBossCombatProfile>> = Object.freeze({
  20: Object.freeze({ attackRange: 178, attackDelay: 1040, moveScale: 0.9, element: 'arcane', pattern: 'caster' }),
  30: Object.freeze({ attackRange: 190, attackDelay: 820, moveScale: 1.12, element: 'normal', pattern: 'ranger' }),
  40: Object.freeze({ attackRange: 92, attackDelay: 690, moveScale: 1.2, element: 'arcane', pattern: 'assassin' }),
  50: Object.freeze({ attackRange: 138, attackDelay: 720, moveScale: 1.06, element: 'fire', pattern: 'warden' }),
  60: Object.freeze({ attackRange: 176, attackDelay: 790, moveScale: 1.02, element: 'normal', pattern: 'ranger' }),
  70: Object.freeze({ attackRange: 184, attackDelay: 930, moveScale: 0.94, element: 'arcane', pattern: 'caster' }),
  80: Object.freeze({ attackRange: 108, attackDelay: 740, moveScale: 1.08, element: 'normal', pattern: 'assassin' }),
  90: Object.freeze({ attackRange: 146, attackDelay: 700, moveScale: 1.04, element: 'fire', pattern: 'warden' }),
  100: Object.freeze({ attackRange: 184, attackDelay: 930, moveScale: 0.94, element: 'arcane', pattern: 'caster' }),
});

export function authorityBossCombatProfile(room: number): AuthorityBossCombatProfile {
  return AUTHORITY_BOSS_COMBAT_PROFILES[room] ?? DEFAULT_BOSS_PROFILE;
}

// Mirrors the current runEngine enemy combat constants so the future server reducer has
// one browser-free manifest to consume. This module remains a producer prerequisite until
// lobby/run binding, canonical encounter construction and durable state are wired server-side.
export const CANONICAL_ENEMY_COMBAT_MANIFEST: Readonly<Record<AuthorityEnemyType, AuthorityEnemyManifestEntry>> = Object.freeze({
  slime: { hp: 24, attack: 4, defense: 0, speed: 42, size: 32, xp: 18, color: '#43c968', attackRange: 44, attackCooldownMs: 1400, telegraphMs: 300 },
  goblin: { hp: 34, attack: 6, defense: 1, speed: 68, size: 30, xp: 24, color: '#89a94b', attackRange: 48, attackCooldownMs: 1150, telegraphMs: 260 },
  skeleton: { hp: 52, attack: 8, defense: 2, speed: 72, size: 26, xp: 30, color: '#d1ccb0', attackRange: 56, attackCooldownMs: 1200, telegraphMs: 320 },
  orc: { hp: 92, attack: 12, defense: 4, speed: 56, size: 30, xp: 42, color: '#627c38', attackRange: 52, attackCooldownMs: 1550, telegraphMs: 420 },
  spider: { hp: 38, attack: 7, defense: 1, speed: 88, size: 38, xp: 28, color: '#342d42', attackRange: 46, attackCooldownMs: 950, telegraphMs: 220 },
  vampire: { hp: 82, attack: 14, defense: 3, speed: 82, size: 34, xp: 48, color: '#9e304b', attackRange: 62, attackCooldownMs: 1100, telegraphMs: 300 },
  demon: { hp: 128, attack: 18, defense: 4, speed: 76, size: 36, xp: 58, color: '#c53827', attackRange: 68, attackCooldownMs: 1350, telegraphMs: 380 },
  golem: { hp: 190, attack: 20, defense: 9, speed: 40, size: 34, xp: 70, color: '#696985', attackRange: 58, attackCooldownMs: 1900, telegraphMs: 520 },
  boss: { hp: 520, attack: 24, defense: 7, speed: 54, size: 74, xp: 180, color: '#ff493a', attackRange: 96, attackCooldownMs: 1450, telegraphMs: 600 },
});

export type AuthorityActorInput = Readonly<{
  actorId: string;
  classKey: AuthorityClassKey;
  buildRevision: number;
  buildDigest: string;
  buildSnapshot: AuthorityBuildSnapshot;
  spawnX: number;
  spawnY: number;
  active?: boolean;
}>;

export type AuthorityEnemyInput = Readonly<{
  enemyType: AuthorityEnemyType;
  x: number;
  y: number;
}>;

export type AuthorityActor = Readonly<{
  actorId: string;
  classKey: AuthorityClassKey;
  buildRevision: number;
  buildDigest: string;
  skillRanks: Readonly<Record<string, number>>;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  attackRange: number;
  skillRange: number;
  attackCooldownMs: number;
  skillCooldownMs: number;
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  nextBasicHitAtMs: number;
  nextDodgeAtMs: number;
  invulnerableUntilMs: number;
  lastAuthorityAtMs: number;
  lifeState: 'alive' | 'downed' | 'fallen';
  downedAtMs: number | null;
  reviveTargetActorId: string | null;
  reviveStartedAtMs: number | null;
}>;

export type AuthorityEnemyState = Readonly<{
  enemyId: string;
  enemyType: AuthorityEnemyType;
  hp: number;
  maxHp: number;
  defense: number;
  x: number;
  y: number;
  width: number;
  height: number;
  attack: number;
  speed: number;
  attackRange: number;
  attackCooldownMs: number;
  telegraphMs: number;
  nextAttackAtMs: number;
  targetActorId: string | null;
  attackPhase: 'idle' | 'telegraph';
  attackPattern: 'basic' | `boss-${AuthorityBossPattern}`;
  attackElement: AuthorityBossCombatProfile['element'];
  telegraphStartedAtMs: number | null;
  attackImpactAtMs: number | null;
  attackOrdinal: number;
  burnUntilMs: number;
  burnDamage: number;
  burnTicksRemaining: number;
  nextBurnTickMs: number;
  slowUntilMs: number;
  slowMultiplier: number;
  bossPhase: 1 | 2 | 3;
  telegraphKey: string;
  spawnedAtMs: number;
}>;

export type CanonicalEncounterState = Readonly<{
  runId: string;
  runAttempt: number;
  chapter: number;
  room: number;
  encounterId: string;
  seed: number;
  version: number;
  actors: readonly AuthorityActor[];
  enemies: readonly AuthorityEnemyState[];
  lastClientSeqByActor: Readonly<Record<string, number>>;
  completed: boolean;
  authorityNowMs: number;
  authorityStartedAtMs: number | null;
  startAcknowledgedByActor: Readonly<Record<string, true>>;
  lifecycle: 'awaiting-start' | 'running' | 'team-defeated' | 'completed';
}>;

export type AuthorityIntent =
  | Readonly<{
      kind: 'move';
      actorId: string;
      directionX: number;
      directionY: number;
      clientSeq: number;
    }>
  | Readonly<{
      kind: 'basic-hit';
      actorId: string;
      targetEnemyId: string;
      clientSeq: number;
    }>
  | Readonly<{
      kind: 'dodge';
      actorId: string;
      directionX: number;
      directionY: number;
      clientSeq: number;
    }>
  | Readonly<{
      kind: 'sync';
      actorId: string;
      clientSeq: number;
    }>
  | Readonly<{
      kind: 'start-ack';
      actorId: string;
      clientSeq: number;
    }>
  | Readonly<{
      kind: 'revive-hold';
      actorId: string;
      targetActorId: string;
      clientSeq: number;
    }>;

export type EncounterCompletedEvent = Readonly<{
  kind: 'encounter-completed';
  runId: string;
  runAttempt: number;
  chapter: number;
  room: number;
  encounterId: string;
  seed: number;
  stateVersion: number;
}>;

export type AuthorityReduceResult = Readonly<{
  state: CanonicalEncounterState;
  event: EncounterCompletedEvent | null;
}>;

export type CreateCanonicalEncounterInput = Readonly<{
  runId: string;
  runAttempt: number;
  chapter: number;
  room: number;
  seed: number;
  authorityStartedAtMs: number;
  actors: readonly AuthorityActorInput[];
  enemies: readonly AuthorityEnemyInput[];
}>;

function completedEvent(state: CanonicalEncounterState, stateVersion: number): EncounterCompletedEvent {
  return Object.freeze({
    kind: 'encounter-completed',
    runId: state.runId,
    runAttempt: state.runAttempt,
    chapter: state.chapter,
    room: state.room,
    encounterId: state.encounterId,
    seed: state.seed,
    stateVersion,
  });
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer`);
}

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be finite and non-negative`);
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
}

const AUTHORITY_BUILD_OPTIONS = new Set([
  'attack', 'maxHp', 'speed', 'defense', 'attackSpeed',
  'multishot', 'ricochet', 'fireArrow', 'iceArrow', 'piercing',
]);

function assertBoundedStat(value: number, label: string, minimum: number, maximum: number): void {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${label} is outside the canonical authority bounds`);
  }
}

function assertAuthorityBuildSnapshot(actor: AuthorityActorInput): AuthorityBuildSnapshot {
  const snapshot = actor.buildSnapshot;
  if (!snapshot || typeof snapshot !== 'object') throw new Error('server build snapshot is required');
  if (snapshot.profileVersion !== 'duo-profile-v1' || snapshot.catalogVersion !== 'duo-build-catalog-v1') {
    throw new Error('unsupported authority build provenance version');
  }
  if (snapshot.classKey !== actor.classKey || snapshot.loadoutKey !== 'canonical-base-v1') {
    throw new Error('authority build snapshot identity mismatch');
  }
  if (!Number.isSafeInteger(actor.buildRevision) || actor.buildRevision < 0) throw new Error('invalid authority build revision');
  if (!/^[0-9a-f]{64}$/.test(actor.buildDigest)) throw new Error('invalid authority build digest');
  if (!snapshot.skillRanks || typeof snapshot.skillRanks !== 'object' || Array.isArray(snapshot.skillRanks)) {
    throw new Error('invalid authority skill ranks');
  }
  for (const [optionId, rank] of Object.entries(snapshot.skillRanks)) {
    if (!AUTHORITY_BUILD_OPTIONS.has(optionId) || !Number.isInteger(rank) || rank < 0 || rank > 3) {
      throw new Error('invalid authority skill rank');
    }
  }
  assertBoundedStat(snapshot.maxHp, 'build.maxHp', 1, 10000);
  assertBoundedStat(snapshot.attack, 'build.attack', 1, 1000);
  assertBoundedStat(snapshot.defense, 'build.defense', 0, 1000);
  assertBoundedStat(snapshot.speed, 'build.speed', 1, 1000);
  assertBoundedStat(snapshot.attackRange, 'build.attackRange', 1, 1000);
  assertBoundedStat(snapshot.skillRange, 'build.skillRange', 1, 1000);
  assertBoundedStat(snapshot.attackCooldownMs, 'build.attackCooldownMs', 125, 60000);
  assertBoundedStat(snapshot.skillCooldownMs, 'build.skillCooldownMs', 125, 60000);
  return snapshot;
}

function stableEncounterId(input: Pick<CreateCanonicalEncounterInput, 'runId' | 'runAttempt' | 'chapter' | 'room' | 'seed'>): string {
  return `${input.runId}:${input.runAttempt}:${input.chapter}:${input.room}:${input.seed}`;
}

function roomManifest(room: number) {
  const manifest = DUO_AUTHORITY_ROOM_MANIFEST[room];
  if (!manifest) throw new Error(`room ${room} has no canonical authority geometry`);
  return manifest;
}

function entityCenterToScene(value: number, size: number, mapTiles: number): number {
  return (value + size / 2) / 40 - mapTiles / 2 + 0.5;
}

function segmentHitsAabb(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  centerX: number,
  centerY: number,
  halfWidth: number,
  halfHeight: number,
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  const clip = (start: number, delta: number, min: number, max: number) => {
    if (Math.abs(delta) < 1e-6) return start >= min && start <= max;
    let t1 = (min - start) / delta;
    let t2 = (max - start) / delta;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    return tMin <= tMax;
  };
  return clip(x1, dx, centerX - halfWidth, centerX + halfWidth)
    && clip(y1, dy, centerY - halfHeight, centerY + halfHeight);
}

function movementCrossesRoomGeometry(
  room: number,
  actor: Readonly<{ x: number; y: number; width: number; height: number }>,
  nextX: number,
  nextY: number,
): boolean {
  const manifest = roomManifest(room);
  const { minX, minY, maxX, maxY } = manifest.walkableBounds;
  if (nextX < minX || nextY < minY || nextX + actor.width > maxX || nextY + actor.height > maxY) return true;
  const fromX = entityCenterToScene(actor.x, actor.width, manifest.mapWidth);
  const fromY = entityCenterToScene(actor.y, actor.height, manifest.mapHeight);
  const toX = entityCenterToScene(nextX, actor.width, manifest.mapWidth);
  const toY = entityCenterToScene(nextY, actor.height, manifest.mapHeight);
  const halfWidth = actor.width / 80 + 0.12;
  const halfHeight = actor.height / 80 + 0.12;
  return manifest.colliders.some(collider => segmentHitsAabb(
    fromX,
    fromY,
    toX,
    toY,
    collider.x,
    collider.z,
    collider.halfW + halfWidth,
    collider.halfH + halfHeight,
  ));
}

function squaredDistance(a: Readonly<{ x: number; y: number; width: number; height: number }>, b: Readonly<{ x: number; y: number; width: number; height: number }>): number {
  const dx = a.x + a.width / 2 - (b.x + b.width / 2);
  const dy = a.y + a.height / 2 - (b.y + b.height / 2);
  return dx * dx + dy * dy;
}

function deterministicTarget(actors: readonly AuthorityActor[], enemy: AuthorityEnemyState): AuthorityActor | null {
  return actors
    .filter(actor => actor.active && actor.lifeState === 'alive')
    .slice()
    .sort((left, right) => squaredDistance(left, enemy) - squaredDistance(right, enemy)
      || left.actorId.localeCompare(right.actorId))[0] ?? null;
}

function enemyDamage(enemy: AuthorityEnemyState, actor: AuthorityActor): number {
  const patternMultiplier = enemy.attackPattern === 'boss-assassin' ? 1.22
    : enemy.attackPattern === 'boss-warden' ? 1.12
    : enemy.attackPattern === 'boss-caster' ? 1.08
    : enemy.attackPattern === 'boss-ranger' ? 0.94 : 1;
  const elementMultiplier = enemy.attackElement === 'fire' ? 1.12
    : enemy.attackElement === 'arcane' ? 1.06 : 1;
  const phaseMultiplier = enemy.enemyType === 'boss' ? 1 + (enemy.bossPhase - 1) * 0.14 : 1;
  return Math.max(1, Math.round(enemy.attack * patternMultiplier * elementMultiplier * phaseMultiplier - actor.defense * 0.5));
}

function nextAttackPattern(state: CanonicalEncounterState, enemy: AuthorityEnemyState): AuthorityEnemyState['attackPattern'] {
  if (enemy.enemyType !== 'boss') return 'basic';
  return `boss-${authorityBossCombatProfile(state.room).pattern}`;
}

function attackWindupMs(enemyType: AuthorityEnemyType, bossPattern: AuthorityBossPattern | null): number {
  const archetype = AUTHORITY_ENEMY_ARCHETYPES[enemyType];
  if (archetype === 'skirmisher') return 165;
  if (archetype === 'guardian') return 270;
  if (archetype !== 'dragon') return 185;
  if (bossPattern === 'assassin') return 230;
  if (bossPattern === 'ranger') return 320;
  if (bossPattern === 'caster') return 460;
  if (bossPattern === 'warden') return 420;
  return 340;
}

function normalizedDirection(from: Readonly<{ x: number; y: number }>, to: Readonly<{ x: number; y: number }>): { x: number; y: number; distance: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy) || 1;
  return { x: dx / distance, y: dy / distance, distance };
}

function rotateDirection(direction: Readonly<{ x: number; y: number }>, degrees: number): { x: number; y: number } {
  const radians = degrees * Math.PI / 180;
  return {
    x: direction.x * Math.cos(radians) - direction.y * Math.sin(radians),
    y: direction.x * Math.sin(radians) + direction.y * Math.cos(radians),
  };
}

type AuthorityEnemyMovePlan = Readonly<{
  x: number;
  y: number;
  speedScale: number;
  attackRange: number;
  attackDelay: number;
}>;

function normalizedMove(x: number, y: number): { x: number; y: number } {
  const length = Math.max(1, Math.hypot(x, y));
  return { x: x / length, y: y / length };
}

function roleMovementPlan(
  state: CanonicalEncounterState,
  enemy: AuthorityEnemyState,
  target: AuthorityActor,
  stepNowMs: number,
): AuthorityEnemyMovePlan {
  const toward = normalizedDirection(enemy, target);
  const archetype = AUTHORITY_ENEMY_ARCHETYPES[enemy.enemyType];
  const ordinal = Number(enemy.enemyId.split(':').at(-2) ?? 0);
  const elapsed = Math.max(0, stepNowMs - enemy.spawnedAtMs);
  const side = (ordinal + Math.floor(elapsed / 1900)) % 2 === 0 ? 1 : -1;
  const attackPressure = 1 - Math.min(0.24, (state.room - 1) * 0.013);
  const finish = (direction: Readonly<{ x: number; y: number }>, speedScale: number, attackRange: number, attackDelay: number): AuthorityEnemyMovePlan => ({
    ...direction,
    speedScale,
    attackRange,
    attackDelay: Math.max(520, Math.round(attackDelay * attackPressure)),
  });
  if (archetype === 'skirmisher') {
    const cycle = elapsed % 3300;
    const sideX = -toward.y * side;
    const sideY = toward.x * side;
    if (cycle < 1450) {
      const advance = toward.distance > 145 ? 0.95 : toward.distance < 82 ? -0.1 : 0.42;
      return finish(normalizedMove(toward.x * advance + sideX * 0.42, toward.y * advance + sideY * 0.42), 1, 48 + enemy.width / 2, 880);
    }
    if (cycle < 2350) {
      const pressure = toward.distance > 50 ? 1.55 : 0.28;
      return finish(toward, pressure, 50 + enemy.width / 2, 720);
    }
    const retreat = toward.distance < 102 ? -0.25 : 0.48;
    return finish(normalizedMove(toward.x * retreat + sideX * 0.34, toward.y * retreat + sideY * 0.34), 0.9, 48 + enemy.width / 2, 840);
  }
  if (archetype === 'guardian') {
    const phase = elapsed % 4000;
    if (phase < 1920) {
      const advance = toward.distance > 66 ? 1.28 : toward.distance < 41 ? -0.08 : 0.48;
      return finish(toward, advance, 58 + enemy.width / 2, 840);
    }
    if (phase < 2800) {
      const advance = toward.distance > 78 ? 0.72 : 0.34;
      return finish(normalizedMove(toward.x * advance - toward.y * side * 0.34, toward.y * advance + toward.x * side * 0.34), 0.92, 60 + enemy.width / 2, 900);
    }
    return finish(toward, toward.distance > 54 ? 1.52 : 0.24, 60 + enemy.width / 2, 680);
  }
  if (archetype === 'dragon') {
    const profile = authorityBossCombatProfile(state.room);
    const phaseLength = profile.pattern === 'assassin' ? 3100 : profile.pattern === 'ranger' ? 3800 : 4600;
    const phase = elapsed % phaseLength;
    if (profile.pattern === 'caster') {
      const advance = toward.distance < 138 ? -0.72 : toward.distance > 205 ? 0.62 : 0.08;
      return finish(normalizedMove(toward.x * advance - toward.y * side * 0.38, toward.y * advance + toward.x * side * 0.38), profile.moveScale, profile.attackRange, profile.attackDelay);
    }
    if (profile.pattern === 'ranger') {
      const advance = toward.distance > 188 ? 0.86 : toward.distance < 132 ? -0.45 : 0.12;
      return finish(normalizedMove(toward.x * advance - toward.y * side * 0.68, toward.y * advance + toward.x * side * 0.68), profile.moveScale, profile.attackRange, profile.attackDelay);
    }
    if (profile.pattern === 'assassin') {
      const dash = phase > phaseLength * 0.62 ? 1.82 : toward.distance > 86 ? 0.9 : -0.18;
      return finish(normalizedMove(toward.x * dash - toward.y * side * (phase < 1200 ? 0.72 : 0.18), toward.y * dash + toward.x * side * (phase < 1200 ? 0.72 : 0.18)), profile.moveScale * Math.max(0.7, dash), profile.attackRange, profile.attackDelay);
    }
    const ideal = profile.pattern === 'warden' ? 112 : 68;
    const advance = toward.distance > ideal ? 1.28 : toward.distance < ideal * 0.62 ? -0.12 : 0.46;
    const strafe = phase > phaseLength * 0.48 && phase < phaseLength * 0.72 ? 0.42 * side : 0;
    return finish(normalizedMove(toward.x * advance - toward.y * strafe, toward.y * advance + toward.x * strafe), profile.moveScale, profile.attackRange, profile.attackDelay);
  }
  const weave = Math.sin(elapsed * 0.0017 + enemy.x * 0.008) * 0.1;
  return finish(normalizedMove(toward.x - toward.y * weave, toward.y + toward.x * weave), 1.08, 42 + enemy.width / 2, 820);
}

function moveEnemyWithDetour(
  state: CanonicalEncounterState,
  enemy: { x: number; y: number; width: number; height: number },
  direction: Readonly<{ x: number; y: number }>,
  distance: number,
): void {
  for (const degrees of [0, 45, -45, 72, -72, 105, -105]) {
    const candidate = rotateDirection(direction, degrees);
    const nextX = enemy.x + candidate.x * distance;
    const nextY = enemy.y + candidate.y * distance;
    if (!movementCrossesRoomGeometry(state.room, enemy, nextX, nextY)) {
      enemy.x = nextX;
      enemy.y = nextY;
      return;
    }
  }
}

function advanceSimulationStep(
  state: CanonicalEncounterState,
  stepNowMs: number,
  stepMs: number,
): Pick<CanonicalEncounterState, 'actors' | 'enemies' | 'lifecycle' | 'completed'> & Readonly<{ telegraphStarted: boolean; attackSettled: boolean }> {
  let actors = state.actors.map(actor => ({
    ...actor,
    lifeState: actor.lifeState === 'downed' && actor.downedAtMs !== null
      && stepNowMs - actor.downedAtMs >= AUTHORITY_DOWNED_TO_FALLEN_MS ? 'fallen' as const : actor.lifeState,
  }));
  const enemies = state.enemies.map(enemy => ({ ...enemy }));
  let telegraphStarted = false;
  let attackSettled = false;
  const settlingAttackBoundaryId = enemies
    .filter(enemy => {
      if (enemy.hp <= 0 || enemy.attackPhase !== 'telegraph') return false;
      const target = actors.find(actor => actor.actorId === enemy.targetActorId && actor.active && actor.lifeState === 'alive');
      return !target || enemy.attackImpactAtMs === null || stepNowMs >= enemy.attackImpactAtMs
        || squaredDistance(enemy, target) > enemy.attackRange * enemy.attackRange
        || attackCrossesRoomGeometry(state.room, enemy, target);
    })
    .sort((left, right) => (left.attackImpactAtMs ?? Number.MAX_SAFE_INTEGER)
      - (right.attackImpactAtMs ?? Number.MAX_SAFE_INTEGER)
      || left.enemyId.localeCompare(right.enemyId))[0]?.enemyId ?? null;
  const orderedEnemies = [...enemies].sort((left, right) => left.enemyId.localeCompare(right.enemyId));

  for (const enemy of orderedEnemies) {
    if (enemy.hp <= 0) continue;
    if (enemy.burnTicksRemaining > 0 && stepNowMs >= enemy.nextBurnTickMs) {
      enemy.hp = Math.max(0, enemy.hp - enemy.burnDamage);
      enemy.burnTicksRemaining -= 1;
      enemy.nextBurnTickMs += 520;
      if (enemy.hp <= 0) continue;
    }
    if (enemy.attackPhase === 'telegraph') {
      if (enemy.enemyId !== settlingAttackBoundaryId) continue;
      const lockedTarget = actors.find(actor => actor.actorId === enemy.targetActorId && actor.active && actor.lifeState === 'alive');
      const impactAtMs = enemy.attackImpactAtMs;
      const invalidLockedTarget = !lockedTarget
        || squaredDistance(enemy, lockedTarget) > enemy.attackRange * enemy.attackRange
        || attackCrossesRoomGeometry(state.room, enemy, lockedTarget);
      if (invalidLockedTarget) {
        enemy.attackPhase = 'idle';
        enemy.targetActorId = null;
        enemy.telegraphStartedAtMs = null;
        enemy.attackImpactAtMs = null;
        enemy.nextAttackAtMs = stepNowMs + enemy.attackCooldownMs;
        attackSettled = true;
        continue;
      }
      if (impactAtMs === null || stepNowMs < impactAtMs) continue;
      const targetIndex = actors.findIndex(actor => actor.actorId === lockedTarget.actorId);
      const damage = stepNowMs <= lockedTarget.invulnerableUntilMs ? 0 : enemyDamage(enemy, lockedTarget);
      const hp = Math.max(0, lockedTarget.hp - damage);
      actors[targetIndex] = {
        ...lockedTarget,
        hp,
        lifeState: hp <= 0 ? 'downed' : lockedTarget.lifeState,
        downedAtMs: hp <= 0 ? stepNowMs : lockedTarget.downedAtMs,
        reviveTargetActorId: null,
        reviveStartedAtMs: null,
      };
      enemy.attackOrdinal += 1;
      enemy.attackPhase = 'idle';
      enemy.targetActorId = null;
      enemy.telegraphStartedAtMs = null;
      enemy.attackImpactAtMs = null;
      enemy.nextAttackAtMs = stepNowMs + enemy.attackCooldownMs;
      attackSettled = true;
      continue;
    }

    // A version is either an impact/cancellation boundary or a new forecast
    // boundary. Never mix the two across different enemies in one transition.
    if (settlingAttackBoundaryId !== null || telegraphStarted) continue;
    const target = deterministicTarget(actors, enemy);
    enemy.targetActorId = null;
    if (!target) continue;
    const movePlan = roleMovementPlan(state, enemy, target, stepNowMs);
    enemy.attackRange = movePlan.attackRange;
    enemy.attackCooldownMs = movePlan.attackDelay;
    const distanceSquared = squaredDistance(enemy, target);
    const occluded = attackCrossesRoomGeometry(state.room, enemy, target);
    if (distanceSquared > enemy.attackRange * enemy.attackRange || occluded) {
      const movePressure = 1 + Math.min(0.34, (state.room - 1) * 0.019);
      const slowScale = stepNowMs <= enemy.slowUntilMs ? enemy.slowMultiplier : 1;
      const distance = enemy.speed * movePressure * slowScale * movePlan.speedScale * (stepMs / 1000);
      moveEnemyWithDetour(state, enemy, movePlan, distance);
      continue;
    }
    if (stepNowMs < enemy.nextAttackAtMs) continue;
    enemy.attackPhase = 'telegraph';
    enemy.attackPattern = nextAttackPattern(state, enemy);
    enemy.targetActorId = target.actorId;
    enemy.telegraphStartedAtMs = stepNowMs;
    enemy.attackImpactAtMs = stepNowMs + enemy.telegraphMs;
    enemy.telegraphKey = `${enemy.enemyType}:${enemy.attackOrdinal}:${enemy.attackPattern}`;
    telegraphStarted = true;
  }

  const active = actors.filter(actor => actor.active);
  const completed = enemies.every(enemy => enemy.hp <= 0);
  const teamDefeated = active.length > 0 && active.every(actor => actor.lifeState !== 'alive');
  return {
    actors: Object.freeze(actors.map(actor => Object.freeze(actor))),
    enemies: Object.freeze(enemies.map(enemy => Object.freeze({
      ...enemy,
      bossPhase: enemy.enemyType === 'boss' && enemy.hp <= enemy.maxHp / 3 ? 3
        : enemy.enemyType === 'boss' && enemy.hp <= enemy.maxHp * 2 / 3 ? 2 : 1,
    }))),
    completed,
    lifecycle: completed ? 'completed' : teamDefeated ? 'team-defeated' : state.lifecycle,
    telegraphStarted,
    attackSettled,
  };
}

export function advanceCanonicalSimulation(state: CanonicalEncounterState, authorityNowMs: number): CanonicalEncounterState {
  assertFiniteNonNegative(authorityNowMs, 'authorityNowMs');
  if (authorityNowMs < state.authorityNowMs) throw new Error('authority time cannot move backwards');
  if (state.lifecycle !== 'running' || authorityNowMs === state.authorityNowMs) return state;
  if (state.authorityStartedAtMs === null || authorityNowMs <= state.authorityStartedAtMs) return state;
  const simulatedUntil = authorityNowMs;
  const firstSimulationAtMs = Math.max(state.authorityNowMs, state.authorityStartedAtMs);
  let advanced: CanonicalEncounterState = firstSimulationAtMs === state.authorityNowMs
    ? state
    : Object.freeze({ ...state, authorityNowMs: firstSimulationAtMs });
  for (let cursor = firstSimulationAtMs; cursor < simulatedUntil;) {
    const next = Math.min(simulatedUntil, cursor + MAX_AUTHORITY_SIMULATION_STEP_MS);
    const step = advanceSimulationStep(advanced, next, next - cursor);
    const { telegraphStarted, attackSettled, ...stateStep } = step;
    advanced = Object.freeze({ ...advanced, ...stateStep, authorityNowMs: next });
    cursor = next;
    // Persist exactly one outcome boundary per version. A transition may either
    // announce a future attack or settle one announced by an earlier version,
    // never create and resolve an attack invisibly in the same request.
    if (telegraphStarted || attackSettled) break;
    if (advanced.lifecycle !== 'running') break;
  }
  return advanced;
}

function attackCrossesRoomGeometry(
  room: number,
  actor: Readonly<{ x: number; y: number; width: number; height: number }>,
  enemy: Readonly<{ x: number; y: number; width: number; height: number }>,
): boolean {
  const manifest = roomManifest(room);
  const actorX = entityCenterToScene(actor.x, actor.width, manifest.mapWidth);
  const actorY = entityCenterToScene(actor.y, actor.height, manifest.mapHeight);
  const enemyX = entityCenterToScene(enemy.x, enemy.width, manifest.mapWidth);
  const enemyY = entityCenterToScene(enemy.y, enemy.height, manifest.mapHeight);
  return manifest.colliders.some(collider => segmentHitsAabb(
    actorX,
    actorY,
    enemyX,
    enemyY,
    collider.x,
    collider.z,
    collider.halfW + 0.025,
    collider.halfH + 0.025,
  ));
}

function isWithinBasicHitRange(actor: AuthorityActor, enemy: AuthorityEnemyState): boolean {
  const actorCenterX = actor.x + actor.width / 2;
  const actorCenterY = actor.y + actor.height / 2;
  const enemyCenterX = enemy.x + enemy.width / 2;
  const enemyCenterY = enemy.y + enemy.height / 2;
  const dx = actorCenterX - enemyCenterX;
  const dy = actorCenterY - enemyCenterY;
  return dx * dx + dy * dy <= actor.attackRange * actor.attackRange;
}

type MutableAuthorityEnemy = { -readonly [Key in keyof AuthorityEnemyState]: AuthorityEnemyState[Key] };
type ShotElement = 'normal' | 'fire' | 'ice';

function shotElement(actor: AuthorityActor, stateVersion: number, shotIndex: number): ShotElement {
  const fire = actor.skillRanks.fireArrow ?? 0;
  const ice = actor.skillRanks.iceArrow ?? 0;
  if (fire > 0 && ice > 0) return (stateVersion + shotIndex) % 2 === 0 ? 'fire' : 'ice';
  return fire > 0 ? 'fire' : ice > 0 ? 'ice' : 'normal';
}

function applyElementStatus(enemy: MutableAuthorityEnemy, actor: AuthorityActor, element: ShotElement, authorityNowMs: number): void {
  if (element === 'fire') {
    const rank = actor.skillRanks.fireArrow ?? 0;
    const ticks = rank === 1 ? 3 : rank === 2 ? 4 : 5;
    enemy.burnDamage = rank + 1;
    enemy.burnTicksRemaining = ticks;
    enemy.nextBurnTickMs = authorityNowMs + 520;
    enemy.burnUntilMs = authorityNowMs + ticks * 520;
  } else if (element === 'ice') {
    const rank = actor.skillRanks.iceArrow ?? 0;
    const slow = [0, 0.2, 0.32, 0.45][rank] ?? 0;
    const duration = [0, 2000, 2500, 3000][rank] ?? 0;
    enemy.slowMultiplier = 1 - slow;
    enemy.slowUntilMs = authorityNowMs + duration;
  }
}

function applyCanonicalHit(
  enemy: MutableAuthorityEnemy,
  actor: AuthorityActor,
  multiplier: number,
  element: ShotElement,
  authorityNowMs: number,
): void {
  const damage = Math.max(1, Math.round((actor.attack - enemy.defense * 0.5) * multiplier));
  enemy.hp = Math.max(0, enemy.hp - damage);
  applyElementStatus(enemy, actor, element, authorityNowMs);
}

function visibleEnemyIndexes(
  room: number,
  origin: Readonly<{ x: number; y: number; width: number; height: number }>,
  enemies: readonly MutableAuthorityEnemy[],
  excluded: ReadonlySet<number>,
): number[] {
  return enemies
    .map((enemy, index) => ({ enemy, index }))
    .filter(candidate => candidate.enemy.hp > 0 && !excluded.has(candidate.index))
    .filter(candidate => !attackCrossesRoomGeometry(room, origin, candidate.enemy))
    .sort((left, right) => squaredDistance(origin, left.enemy) - squaredDistance(origin, right.enemy)
      || left.enemy.enemyId.localeCompare(right.enemy.enemyId))
    .map(candidate => candidate.index);
}

function nextPiercingIndex(
  room: number,
  source: AuthorityEnemyState,
  angle: number,
  range: number,
  enemies: readonly MutableAuthorityEnemy[],
  excluded: ReadonlySet<number>,
): number | null {
  const sourceX = source.x + source.width / 2;
  const sourceY = source.y + source.height / 2;
  const directionX = Math.cos(angle);
  const directionY = Math.sin(angle);
  return enemies
    .map((enemy, index) => {
      const deltaX = enemy.x + enemy.width / 2 - sourceX;
      const deltaY = enemy.y + enemy.height / 2 - sourceY;
      return {
        enemy,
        index,
        forward: deltaX * directionX + deltaY * directionY,
        perpendicular: Math.abs(deltaX * directionY - deltaY * directionX),
      };
    })
    .filter(candidate => candidate.enemy.hp > 0 && !excluded.has(candidate.index))
    .filter(candidate => candidate.forward > 0 && candidate.forward <= range
      && candidate.perpendicular <= candidate.enemy.width * 0.72 + 12)
    .filter(candidate => !attackCrossesRoomGeometry(room, source, candidate.enemy))
    .sort((left, right) => left.forward - right.forward || left.enemy.enemyId.localeCompare(right.enemy.enemyId))[0]?.index ?? null;
}

function assertSequencedIntent(state: CanonicalEncounterState, intent: AuthorityIntent, authorityNowMs: number): { actorIndex: number; actor: AuthorityActor } {
  if (state.completed) throw new Error('encounter already completed');
  if (state.lifecycle === 'team-defeated') throw new Error('team is defeated');
  if (state.lifecycle === 'awaiting-start' && intent.kind !== 'start-ack') throw new Error('authority start acknowledgement required');
  if (state.lifecycle !== 'awaiting-start' && intent.kind === 'start-ack') throw new Error('authority already started');
  if (!Number.isInteger(intent.clientSeq) || intent.clientSeq <= 0) throw new Error('clientSeq must be a positive integer');
  assertFiniteNonNegative(authorityNowMs, 'authorityNowMs');

  const actorIndex = state.actors.findIndex(candidate => candidate.actorId === intent.actorId);
  if (actorIndex < 0) throw new Error('actor is not part of the canonical encounter');
  const actor = state.actors[actorIndex];
  if (!actor.active) throw new Error('actor is not active in the canonical encounter');
  if (authorityNowMs < state.authorityNowMs || authorityNowMs < actor.lastAuthorityAtMs) throw new Error('authority time cannot move backwards');

  const previousSeq = state.lastClientSeqByActor[intent.actorId] ?? 0;
  if (intent.clientSeq <= previousSeq) throw new Error('replayed or out-of-order intent');
  if (intent.clientSeq !== previousSeq + 1) throw new Error('clientSeq gap is not allowed');
  return { actorIndex, actor };
}

export function createCanonicalEncounterState(input: CreateCanonicalEncounterInput): CanonicalEncounterState {
  if (!input.runId.trim()) throw new Error('runId is required');
  assertPositiveInteger(input.runAttempt, 'runAttempt');
  assertPositiveInteger(input.chapter, 'chapter');
  assertPositiveInteger(input.room, 'room');
  roomManifest(input.room);
  if (!Number.isSafeInteger(input.seed)) throw new Error('seed must be a safe integer');
  assertFiniteNonNegative(input.authorityStartedAtMs, 'authorityStartedAtMs');
  if (input.actors.length < 1 || input.actors.length > 2) throw new Error('Duo authority requires one or two actors');
  if (input.enemies.length < 1) throw new Error('encounter requires at least one enemy');

  const actorIds = new Set<string>();
  const actors = input.actors.map(actor => {
    if (!actor.actorId.trim()) throw new Error('actorId is required');
    if (actorIds.has(actor.actorId)) throw new Error(`duplicate actorId: ${actor.actorId}`);
    actorIds.add(actor.actorId);
    const classCombat = CANONICAL_CLASS_COMBAT_MANIFEST[actor.classKey];
    if (!classCombat) throw new Error(`unknown classKey: ${String(actor.classKey)}`);
    const build = assertAuthorityBuildSnapshot(actor);
    assertFinite(actor.spawnX, 'actor.spawnX');
    assertFinite(actor.spawnY, 'actor.spawnY');
    return Object.freeze({
      actorId: actor.actorId,
      classKey: actor.classKey,
      buildRevision: actor.buildRevision,
      buildDigest: actor.buildDigest,
      skillRanks: Object.freeze({ ...build.skillRanks }),
      hp: build.maxHp,
      maxHp: build.maxHp,
      attack: build.attack,
      defense: build.defense,
      speed: build.speed,
      attackRange: build.attackRange,
      skillRange: build.skillRange,
      attackCooldownMs: build.attackCooldownMs,
      skillCooldownMs: build.skillCooldownMs,
      x: actor.spawnX,
      y: actor.spawnY,
      width: classCombat.actorSize,
      height: classCombat.actorSize,
      active: actor.active !== false,
      nextBasicHitAtMs: input.authorityStartedAtMs,
      nextDodgeAtMs: input.authorityStartedAtMs,
      invulnerableUntilMs: 0,
      lastAuthorityAtMs: input.authorityStartedAtMs,
      lifeState: 'alive' as const,
      downedAtMs: null,
      reviveTargetActorId: null,
      reviveStartedAtMs: null,
    });
  });

  const chapterScale = 1 + (input.chapter - 1) * 0.36;
  const roomScale = 1 + (input.room - 1) * 0.055;
  const scale = chapterScale * roomScale;
  const encounterId = stableEncounterId(input);
  const enemies = input.enemies.map((enemy, index) => {
    const base = CANONICAL_ENEMY_COMBAT_MANIFEST[enemy.enemyType];
    if (!base) throw new Error(`unknown enemy type: ${String(enemy.enemyType)}`);
    assertFinite(enemy.x, 'enemy.x');
    assertFinite(enemy.y, 'enemy.y');
    const maxHp = Math.round(base.hp * scale);
    const bossProfile = enemy.enemyType === 'boss' ? authorityBossCombatProfile(input.room) : null;
    return Object.freeze({
      enemyId: `${encounterId}:${index}:${enemy.enemyType}`,
      enemyType: enemy.enemyType,
      hp: maxHp,
      maxHp,
      defense: base.defense,
      x: enemy.x,
      y: enemy.y,
      width: base.size,
      height: base.size,
      attack: Math.round(base.attack * scale),
      speed: base.speed,
      attackRange: bossProfile?.attackRange ?? base.attackRange,
      attackCooldownMs: bossProfile?.attackDelay ?? base.attackCooldownMs,
      telegraphMs: attackWindupMs(enemy.enemyType, bossProfile?.pattern ?? null),
      nextAttackAtMs: input.authorityStartedAtMs,
      targetActorId: null,
      attackPhase: 'idle' as const,
      attackPattern: (bossProfile ? `boss-${bossProfile.pattern}` : 'basic') as AuthorityEnemyState['attackPattern'],
      attackElement: bossProfile?.element ?? 'normal',
      telegraphStartedAtMs: null,
      attackImpactAtMs: null,
      attackOrdinal: 0,
      burnUntilMs: 0,
      burnDamage: 0,
      burnTicksRemaining: 0,
      nextBurnTickMs: 0,
      slowUntilMs: 0,
      slowMultiplier: 1,
      bossPhase: 1 as const,
      telegraphKey: `${enemy.enemyType}:0`,
      spawnedAtMs: input.authorityStartedAtMs,
    });
  });

  return Object.freeze({
    runId: input.runId,
    runAttempt: input.runAttempt,
    chapter: input.chapter,
    room: input.room,
    encounterId,
    seed: input.seed,
    version: 0,
    actors: Object.freeze(actors),
    enemies: Object.freeze(enemies),
    lastClientSeqByActor: Object.freeze({}),
    completed: false,
    authorityNowMs: input.authorityStartedAtMs,
    authorityStartedAtMs: null,
    startAcknowledgedByActor: Object.freeze({}),
    lifecycle: 'awaiting-start',
  });
}

export function reduceAuthorityIntent(
  state: CanonicalEncounterState,
  intent: AuthorityIntent,
  authorityNowMs: number,
): AuthorityReduceResult {
  const currentState = state;
  const sequenced = assertSequencedIntent(currentState, intent, authorityNowMs);
  const nextVersion = currentState.version + 1;
  const lastClientSeqByActor = Object.freeze({ ...currentState.lastClientSeqByActor, [intent.actorId]: intent.clientSeq });

  if (intent.kind === 'start-ack') {
    const startAcknowledgedByActor = Object.freeze({
      ...currentState.startAcknowledgedByActor,
      [intent.actorId]: true as const,
    });
    const allAcknowledged = currentState.actors.filter(actor => actor.active)
      .every(actor => startAcknowledgedByActor[actor.actorId] === true);
    const authorityStartedAtMs = allAcknowledged ? authorityNowMs + AUTHORITY_START_COUNTDOWN_MS : null;
    const actors = currentState.actors.map((candidate, index) => index === sequenced.actorIndex
      ? Object.freeze({ ...candidate, lastAuthorityAtMs: authorityNowMs }) : candidate);
    const forecastActors = Object.freeze(actors);
    const enemies = currentState.enemies.map(enemy => {
      if (!allAcknowledged) return enemy;
      return Object.freeze({
        ...enemy,
        attackPhase: 'idle' as const,
        targetActorId: null,
        telegraphStartedAtMs: null,
        attackImpactAtMs: null,
        nextAttackAtMs: authorityStartedAtMs!,
        telegraphKey: `${enemy.enemyType}:${enemy.attackOrdinal}`,
        spawnedAtMs: authorityStartedAtMs!,
      });
    });
    return Object.freeze({
      state: Object.freeze({
        ...currentState,
        version: nextVersion,
        authorityNowMs,
        authorityStartedAtMs,
        startAcknowledgedByActor,
        lifecycle: allAcknowledged ? 'running' : 'awaiting-start',
        lastClientSeqByActor,
        actors: forecastActors,
        enemies: Object.freeze(enemies),
      }),
      event: null,
    });
  }

  let simulated = advanceCanonicalSimulation(currentState, authorityNowMs);
  const settledBoundary = simulated.enemies.some((enemy, index) => {
    const previous = currentState.enemies[index];
    return previous && (enemy.attackOrdinal > previous.attackOrdinal
      || (previous.attackPhase === 'telegraph' && enemy.attackPhase === 'idle'));
  });
  if (simulated.authorityNowMs < authorityNowMs && settledBoundary && intent.kind !== 'sync') {
    throw new Error('authority catch-up requires sync');
  }
  const actorIndex = simulated.actors.findIndex(candidate => candidate.actorId === intent.actorId);
  let actor = simulated.actors[actorIndex];
  if (!actor) throw new Error('actor left canonical encounter during simulation');
  if (simulated.lifecycle !== 'running') {
    return Object.freeze({
      state: Object.freeze({ ...simulated, version: nextVersion, lastClientSeqByActor }),
      event: simulated.completed ? completedEvent(simulated, nextVersion) : null,
    });
  }

  actor = simulated.actors[actorIndex];

  if (intent.kind === 'sync') {
    const actors = simulated.actors.map((candidate, index) => index === actorIndex
      ? Object.freeze({
          ...candidate,
          lastAuthorityAtMs: authorityNowMs,
          reviveTargetActorId: null,
          reviveStartedAtMs: null,
        })
      : candidate);
    return Object.freeze({
      state: Object.freeze({ ...simulated, version: nextVersion, actors: Object.freeze(actors), lastClientSeqByActor }),
      event: null,
    });
  }

  if (actor.lifeState !== 'alive') {
    return Object.freeze({
      state: Object.freeze({ ...simulated, version: nextVersion, lastClientSeqByActor }),
      event: null,
    });
  }

  if (intent.kind === 'move') {
    assertFinite(intent.directionX, 'directionX');
    assertFinite(intent.directionY, 'directionY');
    const magnitudeSquared = intent.directionX * intent.directionX + intent.directionY * intent.directionY;
    if (magnitudeSquared > 1.000001) throw new Error('movement direction magnitude exceeds one');
    const elapsedMs = authorityNowMs - actor.lastAuthorityAtMs;
    const movementAccepted = elapsedMs <= MAX_AUTHORITY_MOVEMENT_STEP_MS;
    const distance = movementAccepted ? actor.speed * (elapsedMs / 1000) : 0;
    const nextX = actor.x + intent.directionX * distance;
    const nextY = actor.y + intent.directionY * distance;
    if (movementCrossesRoomGeometry(simulated.room, actor, nextX, nextY)) {
      throw new Error('authority movement blocked by canonical room geometry');
    }
    const actors = simulated.actors.map((candidate, index) => index === actorIndex
      ? Object.freeze({
          ...candidate,
          x: nextX,
          y: nextY,
          lastAuthorityAtMs: authorityNowMs,
          reviveTargetActorId: null,
          reviveStartedAtMs: null,
        })
      : candidate);
    return Object.freeze({
      state: Object.freeze({
        ...simulated,
        version: nextVersion,
        actors: Object.freeze(actors),
        lastClientSeqByActor,
      }),
      event: null,
    });
  }

  if (intent.kind === 'dodge') {
    assertFinite(intent.directionX, 'directionX');
    assertFinite(intent.directionY, 'directionY');
    const magnitude = Math.hypot(intent.directionX, intent.directionY);
    if (magnitude < 0.000001 || magnitude > 1.000001) throw new Error('dodge direction magnitude must be within zero and one');
    if (authorityNowMs < actor.nextDodgeAtMs) throw new Error('dodge cadence not ready');
    const classCombat = CANONICAL_CLASS_COMBAT_MANIFEST[actor.classKey];
    const dashScale = (actor.skillRanks.speed ?? 0) >= 3 ? 1.15 : 1;
    const distance = classCombat.dashDistance * dashScale;
    const nextX = actor.x + intent.directionX / magnitude * distance;
    const nextY = actor.y + intent.directionY / magnitude * distance;
    if (movementCrossesRoomGeometry(simulated.room, actor, nextX, nextY)) {
      throw new Error('authority dodge blocked by canonical room geometry');
    }
    const actors = simulated.actors.map((candidate, index) => index === actorIndex
      ? Object.freeze({
          ...candidate,
          x: nextX,
          y: nextY,
          nextDodgeAtMs: authorityNowMs + classCombat.dodgeCooldownMs,
          invulnerableUntilMs: authorityNowMs + 260,
          lastAuthorityAtMs: authorityNowMs,
          reviveTargetActorId: null,
          reviveStartedAtMs: null,
        })
      : candidate);
    return Object.freeze({
      state: Object.freeze({ ...simulated, version: nextVersion, actors: Object.freeze(actors), lastClientSeqByActor }),
      event: null,
    });
  }

  if (intent.kind === 'revive-hold') {
    const targetIndex = simulated.actors.findIndex(candidate => candidate.actorId === intent.targetActorId);
    if (targetIndex < 0 || targetIndex === actorIndex) throw new Error('invalid revive target');
    const target = simulated.actors[targetIndex];
    if (!target.active || target.lifeState !== 'downed') throw new Error('revive target is not downed');
    if (squaredDistance(actor, target) > 72 * 72) throw new Error('revive target is outside canonical range');
    const continuing = actor.reviveTargetActorId === target.actorId && actor.reviveStartedAtMs !== null;
    const startedAtMs = continuing ? actor.reviveStartedAtMs! : authorityNowMs;
    const complete = authorityNowMs - startedAtMs >= AUTHORITY_REVIVE_HOLD_MS;
    const actors = simulated.actors.map((candidate, index) => {
      if (index === actorIndex) return Object.freeze({
        ...candidate,
        reviveTargetActorId: complete ? null : target.actorId,
        reviveStartedAtMs: complete ? null : startedAtMs,
        lastAuthorityAtMs: authorityNowMs,
      });
      if (index === targetIndex && complete) return Object.freeze({
        ...candidate,
        hp: Math.max(1, Math.ceil(candidate.maxHp * 0.35)),
        lifeState: 'alive' as const,
        downedAtMs: null,
        lastAuthorityAtMs: authorityNowMs,
      });
      return candidate;
    });
    return Object.freeze({
      state: Object.freeze({ ...simulated, version: nextVersion, actors: Object.freeze(actors), lastClientSeqByActor }),
      event: null,
    });
  }

  if (intent.kind !== 'basic-hit') throw new Error('unsupported intent');
  if (authorityNowMs < actor.nextBasicHitAtMs) throw new Error('basic-hit cadence not ready');

  const targetIndex = simulated.enemies.findIndex(enemy => enemy.enemyId === intent.targetEnemyId && enemy.hp > 0);
  if (targetIndex < 0) throw new Error('target is not a living canonical enemy');
  const target = simulated.enemies[targetIndex];
  if (!isWithinBasicHitRange(actor, target)) throw new Error('target is outside canonical basic-hit range');
  if (attackCrossesRoomGeometry(simulated.room, actor, target)) throw new Error('target is occluded by canonical room geometry');

  const enemies: MutableAuthorityEnemy[] = simulated.enemies.map(enemy => ({ ...enemy }));
  const hitIndexes = new Set<number>([targetIndex]);
  applyCanonicalHit(enemies[targetIndex], actor, 1, shotElement(actor, simulated.version, 0), authorityNowMs);

  const multishotRank = actor.skillRanks.multishot ?? 0;
  const multishotIndexes = visibleEnemyIndexes(simulated.room, actor, enemies, hitIndexes)
    .filter(index => isWithinBasicHitRange(actor, enemies[index]))
    .slice(0, multishotRank);
  for (const [shotIndex, index] of multishotIndexes.entries()) {
    hitIndexes.add(index);
    applyCanonicalHit(enemies[index], actor, 0.82, shotElement(actor, simulated.version, shotIndex + 1), authorityNowMs);
  }

  const actorCenterX = actor.x + actor.width / 2;
  const actorCenterY = actor.y + actor.height / 2;
  const primaryCenterX = target.x + target.width / 2;
  const primaryCenterY = target.y + target.height / 2;
  const shotAngle = Math.atan2(primaryCenterY - actorCenterY, primaryCenterX - actorCenterX);
  const piercingRank = actor.skillRanks.piercing ?? 0;
  const piercingMultiplier = piercingRank === 1 ? 0.7 : piercingRank === 2 ? 0.75 : 0.8;
  let piercingSource: AuthorityEnemyState = enemies[targetIndex];
  for (let index = 0; index < piercingRank; index += 1) {
    const nextIndex = nextPiercingIndex(
      simulated.room,
      piercingSource,
      shotAngle,
      actor.attackRange,
      enemies,
      hitIndexes,
    );
    if (nextIndex === null) break;
    hitIndexes.add(nextIndex);
    applyCanonicalHit(enemies[nextIndex], actor, piercingMultiplier, shotElement(actor, simulated.version, 0), authorityNowMs);
    piercingSource = enemies[nextIndex];
  }

  const ricochetRank = actor.skillRanks.ricochet ?? 0;
  const ricochetMultiplier = ricochetRank === 1 ? 0.65 : ricochetRank === 2 ? 0.7 : 0.75;
  let ricochetSource: AuthorityEnemyState = enemies[targetIndex];
  for (let index = 0; index < ricochetRank; index += 1) {
    const nextIndex = visibleEnemyIndexes(simulated.room, ricochetSource, enemies, hitIndexes)[0];
    if (nextIndex === undefined) break;
    hitIndexes.add(nextIndex);
    applyCanonicalHit(enemies[nextIndex], actor, ricochetMultiplier, shotElement(actor, simulated.version, 0), authorityNowMs);
    ricochetSource = enemies[nextIndex];
  }
  const frozenEnemies = enemies.map(enemy => Object.freeze(enemy));
  const actors = simulated.actors.map((candidate, index) => index === actorIndex
    ? Object.freeze({
        ...candidate,
        nextBasicHitAtMs: authorityNowMs + actor.attackCooldownMs,
        lastAuthorityAtMs: authorityNowMs,
        reviveTargetActorId: null,
        reviveStartedAtMs: null,
      })
    : candidate);
  const completed = frozenEnemies.every(enemy => enemy.hp <= 0);
  const nextState: CanonicalEncounterState = Object.freeze({
    ...simulated,
    version: nextVersion,
    actors: Object.freeze(actors),
    enemies: Object.freeze(frozenEnemies),
    lastClientSeqByActor,
    completed,
    lifecycle: completed ? 'completed' : simulated.lifecycle,
  });

  return Object.freeze({
    state: nextState,
    event: completed ? completedEvent(simulated, nextVersion) : null,
  });
}
