export type AuthorityEnemyType = 'slime' | 'goblin' | 'skeleton' | 'orc' | 'spider' | 'vampire' | 'demon' | 'golem' | 'boss';
export type AuthorityClassKey = 'warrior' | 'mage' | 'archer';

export type AuthorityEnemyManifestEntry = Readonly<{
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  size: number;
  xp: number;
  color: string;
}>;

export type AuthorityClassCombatEntry = Readonly<{
  attack: number;
  speed: number;
  actorSize: number;
  attackRange: number;
  attackCooldownMs: number;
}>;

export const CANONICAL_CLASS_COMBAT_MANIFEST: Readonly<Record<AuthorityClassKey, AuthorityClassCombatEntry>> = Object.freeze({
  warrior: Object.freeze({ attack: 12, speed: 118, actorSize: 32, attackRange: 65, attackCooldownMs: 350 }),
  mage: Object.freeze({ attack: 20, speed: 130, actorSize: 32, attackRange: 55, attackCooldownMs: 550 }),
  archer: Object.freeze({ attack: 10, speed: 218, actorSize: 32, attackRange: 105, attackCooldownMs: 270 }),
});

export const MAX_AUTHORITY_MOVEMENT_STEP_MS = 250;

// Mirrors the current runEngine enemy combat constants so the future server reducer has
// one browser-free manifest to consume. This module remains a producer prerequisite until
// lobby/run binding, canonical encounter construction and durable state are wired server-side.
export const CANONICAL_ENEMY_COMBAT_MANIFEST: Readonly<Record<AuthorityEnemyType, AuthorityEnemyManifestEntry>> = Object.freeze({
  slime: { hp: 24, attack: 4, defense: 0, speed: 42, size: 32, xp: 18, color: '#43c968' },
  goblin: { hp: 34, attack: 6, defense: 1, speed: 68, size: 30, xp: 24, color: '#89a94b' },
  skeleton: { hp: 52, attack: 8, defense: 2, speed: 72, size: 26, xp: 30, color: '#d1ccb0' },
  orc: { hp: 92, attack: 12, defense: 4, speed: 56, size: 30, xp: 42, color: '#627c38' },
  spider: { hp: 38, attack: 7, defense: 1, speed: 88, size: 38, xp: 28, color: '#342d42' },
  vampire: { hp: 82, attack: 14, defense: 3, speed: 82, size: 34, xp: 48, color: '#9e304b' },
  demon: { hp: 128, attack: 18, defense: 4, speed: 76, size: 36, xp: 58, color: '#c53827' },
  golem: { hp: 190, attack: 20, defense: 9, speed: 40, size: 34, xp: 70, color: '#696985' },
  boss: { hp: 520, attack: 24, defense: 7, speed: 54, size: 74, xp: 180, color: '#ff493a' },
});

export type AuthorityActorInput = Readonly<{
  actorId: string;
  classKey: AuthorityClassKey;
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
  attack: number;
  speed: number;
  attackRange: number;
  attackCooldownMs: number;
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  nextBasicHitAtMs: number;
  lastAuthorityAtMs: number;
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

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer`);
}

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be finite and non-negative`);
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
}

function stableEncounterId(input: Pick<CreateCanonicalEncounterInput, 'runId' | 'runAttempt' | 'chapter' | 'room' | 'seed'>): string {
  return `${input.runId}:${input.runAttempt}:${input.chapter}:${input.room}:${input.seed}`;
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

function assertSequencedIntent(state: CanonicalEncounterState, intent: AuthorityIntent, authorityNowMs: number): { actorIndex: number; actor: AuthorityActor } {
  if (state.completed) throw new Error('encounter already completed');
  if (!Number.isInteger(intent.clientSeq) || intent.clientSeq <= 0) throw new Error('clientSeq must be a positive integer');
  assertFiniteNonNegative(authorityNowMs, 'authorityNowMs');

  const actorIndex = state.actors.findIndex(candidate => candidate.actorId === intent.actorId);
  if (actorIndex < 0) throw new Error('actor is not part of the canonical encounter');
  const actor = state.actors[actorIndex];
  if (!actor.active) throw new Error('actor is not active in the canonical encounter');
  if (authorityNowMs < actor.lastAuthorityAtMs) throw new Error('authority time cannot move backwards');

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
    assertFinite(actor.spawnX, 'actor.spawnX');
    assertFinite(actor.spawnY, 'actor.spawnY');
    return Object.freeze({
      actorId: actor.actorId,
      classKey: actor.classKey,
      attack: classCombat.attack,
      speed: classCombat.speed,
      attackRange: classCombat.attackRange,
      attackCooldownMs: classCombat.attackCooldownMs,
      x: actor.spawnX,
      y: actor.spawnY,
      width: classCombat.actorSize,
      height: classCombat.actorSize,
      active: actor.active !== false,
      nextBasicHitAtMs: input.authorityStartedAtMs,
      lastAuthorityAtMs: input.authorityStartedAtMs,
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
  });
}

export function reduceAuthorityIntent(
  state: CanonicalEncounterState,
  intent: AuthorityIntent,
  authorityNowMs: number,
): AuthorityReduceResult {
  const { actorIndex, actor } = assertSequencedIntent(state, intent, authorityNowMs);
  const nextVersion = state.version + 1;
  const lastClientSeqByActor = Object.freeze({ ...state.lastClientSeqByActor, [intent.actorId]: intent.clientSeq });

  if (intent.kind === 'move') {
    assertFinite(intent.directionX, 'directionX');
    assertFinite(intent.directionY, 'directionY');
    const magnitudeSquared = intent.directionX * intent.directionX + intent.directionY * intent.directionY;
    if (magnitudeSquared > 1.000001) throw new Error('movement direction magnitude exceeds one');
    const elapsedMs = authorityNowMs - actor.lastAuthorityAtMs;
    const movementAccepted = elapsedMs <= MAX_AUTHORITY_MOVEMENT_STEP_MS;
    const distance = movementAccepted ? actor.speed * (elapsedMs / 1000) : 0;
    const actors = state.actors.map((candidate, index) => index === actorIndex
      ? Object.freeze({
          ...candidate,
          x: candidate.x + intent.directionX * distance,
          y: candidate.y + intent.directionY * distance,
          lastAuthorityAtMs: authorityNowMs,
        })
      : candidate);
    return Object.freeze({
      state: Object.freeze({
        ...state,
        version: nextVersion,
        actors: Object.freeze(actors),
        lastClientSeqByActor,
      }),
      event: null,
    });
  }

  if (intent.kind !== 'basic-hit') throw new Error('unsupported intent');
  if (authorityNowMs < actor.nextBasicHitAtMs) throw new Error('basic-hit cadence not ready');

  const targetIndex = state.enemies.findIndex(enemy => enemy.enemyId === intent.targetEnemyId && enemy.hp > 0);
  if (targetIndex < 0) throw new Error('target is not a living canonical enemy');
  const target = state.enemies[targetIndex];
  if (!isWithinBasicHitRange(actor, target)) throw new Error('target is outside canonical basic-hit range');

  const damage = Math.max(1, Math.round(actor.attack - target.defense * 0.5));
  const nextHp = Math.max(0, target.hp - damage);
  const enemies = state.enemies.map((enemy, index) => index === targetIndex
    ? Object.freeze({ ...enemy, hp: nextHp })
    : enemy);
  const actors = state.actors.map((candidate, index) => index === actorIndex
    ? Object.freeze({
        ...candidate,
        nextBasicHitAtMs: authorityNowMs + actor.attackCooldownMs,
        lastAuthorityAtMs: authorityNowMs,
      })
    : candidate);
  const completed = enemies.every(enemy => enemy.hp <= 0);
  const nextState: CanonicalEncounterState = Object.freeze({
    ...state,
    version: nextVersion,
    actors: Object.freeze(actors),
    enemies: Object.freeze(enemies),
    lastClientSeqByActor,
    completed,
  });

  return Object.freeze({
    state: nextState,
    event: completed ? Object.freeze({
      kind: 'encounter-completed' as const,
      runId: state.runId,
      runAttempt: state.runAttempt,
      chapter: state.chapter,
      room: state.room,
      encounterId: state.encounterId,
      seed: state.seed,
      stateVersion: nextVersion,
    }) : null,
  });
}
