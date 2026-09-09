export type AuthorityEnemyType = 'slime' | 'goblin' | 'skeleton' | 'orc' | 'spider' | 'vampire' | 'demon' | 'golem' | 'boss';

export type AuthorityEnemyManifestEntry = Readonly<{
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  size: number;
  xp: number;
  color: string;
}>;

export const BASIC_HIT_COOLDOWN_MS = 350;

// Mirrors the current runEngine enemy combat constants so the future server reducer has
// one browser-free manifest to consume. Slice 1 intentionally does not change reward
// eligibility or claim this module is already the production authority boundary.
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
  attack: number;
  active?: boolean;
}>;

export type AuthorityActor = Readonly<{
  actorId: string;
  attack: number;
  active: boolean;
  nextBasicHitAtMs: number;
}>;

export type AuthorityEnemyState = Readonly<{
  enemyId: string;
  enemyType: AuthorityEnemyType;
  hp: number;
  maxHp: number;
  defense: number;
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

export type AuthorityIntent = Readonly<{
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
  actors: readonly AuthorityActorInput[];
  enemyTypes: readonly AuthorityEnemyType[];
}>;

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer`);
}

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be finite and non-negative`);
}

function stableEncounterId(input: Pick<CreateCanonicalEncounterInput, 'runId' | 'runAttempt' | 'chapter' | 'room' | 'seed'>): string {
  return `${input.runId}:${input.runAttempt}:${input.chapter}:${input.room}:${input.seed}`;
}

export function createCanonicalEncounterState(input: CreateCanonicalEncounterInput): CanonicalEncounterState {
  if (!input.runId.trim()) throw new Error('runId is required');
  assertPositiveInteger(input.runAttempt, 'runAttempt');
  assertPositiveInteger(input.chapter, 'chapter');
  assertPositiveInteger(input.room, 'room');
  if (!Number.isSafeInteger(input.seed)) throw new Error('seed must be a safe integer');
  if (input.actors.length < 1 || input.actors.length > 2) throw new Error('Duo authority requires one or two actors');
  if (input.enemyTypes.length < 1) throw new Error('encounter requires at least one enemy');

  const actorIds = new Set<string>();
  const actors = input.actors.map(actor => {
    if (!actor.actorId.trim()) throw new Error('actorId is required');
    if (actorIds.has(actor.actorId)) throw new Error(`duplicate actorId: ${actor.actorId}`);
    actorIds.add(actor.actorId);
    assertFiniteNonNegative(actor.attack, 'actor.attack');
    return Object.freeze({
      actorId: actor.actorId,
      attack: actor.attack,
      active: actor.active !== false,
      nextBasicHitAtMs: 0,
    });
  });

  const chapterScale = 1 + (input.chapter - 1) * 0.36;
  const roomScale = 1 + (input.room - 1) * 0.055;
  const scale = chapterScale * roomScale;
  const encounterId = stableEncounterId(input);
  const enemies = input.enemyTypes.map((enemyType, index) => {
    const base = CANONICAL_ENEMY_COMBAT_MANIFEST[enemyType];
    if (!base) throw new Error(`unknown enemy type: ${String(enemyType)}`);
    const maxHp = Math.round(base.hp * scale);
    return Object.freeze({
      enemyId: `${encounterId}:${index}:${enemyType}`,
      enemyType,
      hp: maxHp,
      maxHp,
      defense: base.defense,
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
  if (state.completed) throw new Error('encounter already completed');
  if (intent.kind !== 'basic-hit') throw new Error('unsupported intent');
  if (!Number.isInteger(intent.clientSeq) || intent.clientSeq <= 0) throw new Error('clientSeq must be a positive integer');
  assertFiniteNonNegative(authorityNowMs, 'authorityNowMs');

  const actorIndex = state.actors.findIndex(candidate => candidate.actorId === intent.actorId);
  if (actorIndex < 0) throw new Error('actor is not part of the canonical encounter');
  const actor = state.actors[actorIndex];
  if (!actor.active) throw new Error('actor is not active in the canonical encounter');

  const previousSeq = state.lastClientSeqByActor[intent.actorId] ?? 0;
  if (intent.clientSeq <= previousSeq) throw new Error('replayed or out-of-order intent');
  if (intent.clientSeq !== previousSeq + 1) throw new Error('clientSeq gap is not allowed');
  if (authorityNowMs < actor.nextBasicHitAtMs) throw new Error('basic-hit cadence not ready');

  const targetIndex = state.enemies.findIndex(enemy => enemy.enemyId === intent.targetEnemyId && enemy.hp > 0);
  if (targetIndex < 0) throw new Error('target is not a living canonical enemy');
  const target = state.enemies[targetIndex];
  const damage = Math.max(1, Math.round(actor.attack - target.defense * 0.5));
  const nextHp = Math.max(0, target.hp - damage);
  const enemies = state.enemies.map((enemy, index) => index === targetIndex
    ? Object.freeze({ ...enemy, hp: nextHp })
    : enemy);
  const actors = state.actors.map((candidate, index) => index === actorIndex
    ? Object.freeze({ ...candidate, nextBasicHitAtMs: authorityNowMs + BASIC_HIT_COOLDOWN_MS })
    : candidate);
  const nextVersion = state.version + 1;
  const completed = enemies.every(enemy => enemy.hp <= 0);
  const lastClientSeqByActor = Object.freeze({ ...state.lastClientSeqByActor, [intent.actorId]: intent.clientSeq });
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
