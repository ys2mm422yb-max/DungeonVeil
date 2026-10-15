import type {
  CoopAuthorityRuntimeSession,
  CoopAuthorityRuntimeTransport,
} from '../components/CoopAuthorityRuntimeBridge';
import {
  CANONICAL_CLASS_COMBAT_MANIFEST,
  createCanonicalEncounterState,
  reduceAuthorityIntent,
  type AuthorityActorInput,
  type AuthorityIntent,
  type CanonicalEncounterState,
} from './duoEncounterAuthorityKernel';
import type {
  DuoAuthorityBinding,
  DuoAuthorityIntent,
  DuoAuthorityState,
  DuoAuthorityTransition,
} from './duoAuthorityOnline';
import {
  createRoomBoundCanonicalEncounterState,
  type CanonicalDuoActorIdentity,
} from './duoCanonicalEncounterFactory';

const LOBBY_ID = 'runtime-authority-fixture';
const RUN_SEED = 424242;
const HOST_ID = 'runtime-authority-host';
const PARTNER_ID = 'runtime-authority-partner';
const EVIDENCE_ACTOR_MAX_HP = 9_999;
const EVIDENCE_ACTOR_DEFENSE = 1_000;

function identity(actorId: string, maxHp: number, defense: number): CanonicalDuoActorIdentity {
  const combat = CANONICAL_CLASS_COMBAT_MANIFEST.archer;
  return {
    actorId,
    classKey: 'archer',
    buildRevision: 0,
    buildDigest: actorId === HOST_ID ? 'a'.repeat(64) : 'b'.repeat(64),
    buildSnapshot: {
      profileVersion: 'duo-profile-v1',
      catalogVersion: 'duo-build-catalog-v1',
      classKey: 'archer',
      loadoutKey: 'canonical-base-v1',
      skillRanks: {},
      maxHp,
      attack: combat.attack,
      defense,
      speed: combat.speed,
      attackRange: combat.attackRange,
      skillRange: combat.skillRange,
      attackCooldownMs: combat.attackCooldownMs,
      skillCooldownMs: combat.skillCooldownMs,
    },
  };
}

function actor(actorId: string, spawnX: number, maxHp: number, defense: number): AuthorityActorInput {
  return { ...identity(actorId, maxHp, defense), spawnX, spawnY: 120 };
}

function createFixtureState(authorityStartedAtMs: number): CanonicalEncounterState {
  return createCanonicalEncounterState({
    runId: LOBBY_ID,
    runAttempt: 1,
    chapter: 1,
    room: 1,
    seed: RUN_SEED,
    authorityStartedAtMs,
    actors: [actor(HOST_ID, 160, 1, 0), actor(PARTNER_ID, 112, 1, 0)],
    enemies: [{ enemyType: 'boss', x: 112, y: 120 }],
  });
}

export type RuntimeDuoAuthoritySnapshot = Readonly<{
  state: CanonicalEncounterState;
  intents: readonly Readonly<{ actorId: string; kind: AuthorityIntent['kind']; authorityNowMs: number }>[];
  advances: number;
  restarts: number;
  sessionGeneration: number;
  sessionAvailable: boolean;
  attemptStatus: 'active' | 'invalidated';
  consumedSessions: readonly Readonly<{ operation: string; actorId: string; credentialGeneration: number }>[];
  exitCalls: number;
  invalidatedReadRejections: number;
  invalidatedSubmitRejections: number;
  completionProofs: number;
}>;

export class RuntimeDuoAuthorityFixture implements CoopAuthorityRuntimeTransport {
  readonly lobbyId = LOBBY_ID;
  readonly runSeed = RUN_SEED;
  readonly hostId = HOST_ID;
  readonly partnerId = PARTNER_ID;
  private readonly binding: DuoAuthorityBinding = Object.freeze({ lobbyId: LOBBY_ID, runAttempt: 1, runSeed: RUN_SEED });
  private state: CanonicalEncounterState;
  private heldTransportFailure: 'read' | 'submit' | null = null;
  private sessionAvailable = true;
  private sessionGeneration = 1;
  private attemptStatus: 'active' | 'invalidated' = 'active';
  private exitCalls = 0;
  private invalidatedReadRejections = 0;
  private invalidatedSubmitRejections = 0;
  private readonly completionProofLedger: string[] = [];
  private readonly consumedSessions: Array<Readonly<{ operation: string; actorId: string; credentialGeneration: number }>> = [];
  private serverNowMs = 1_000;
  private lastWallMs = performance.now();
  private advances = 0;
  private restarts = 0;
  private readonly intents: Array<Readonly<{ actorId: string; kind: AuthorityIntent['kind']; authorityNowMs: number }>> = [];

  constructor() {
    this.state = createFixtureState(this.serverNowMs);
    this.parkEnemy();
  }

  currentSession = (): CoopAuthorityRuntimeSession | null => {
    return this.sessionAvailable
      ? Object.freeze({ actorId: HOST_ID, credentialGeneration: this.sessionGeneration })
      : null;
  };

  read = async (session: CoopAuthorityRuntimeSession, lobbyId: string, expectedRunSeed: number): Promise<DuoAuthorityState> => {
    this.assertSession(session, 'read');
    if (this.attemptStatus === 'invalidated') {
      this.invalidatedReadRejections += 1;
      throw new Error('Runtime authority fixture rejected read for invalidated attempt');
    }
    if (this.heldTransportFailure === 'read') {
      throw new Error('Deterministic authority transport interruption');
    }
    if (lobbyId !== LOBBY_ID || expectedRunSeed !== RUN_SEED) throw new Error('Runtime authority fixture binding mismatch');
    return Object.freeze({
      binding: this.binding,
      encounterId: this.state.encounterId,
      stateVersion: this.state.version,
      state: this.state,
      bootstrapRequired: false,
    });
  };

  submit = async (
    session: CoopAuthorityRuntimeSession,
    binding: DuoAuthorityBinding,
    encounterId: string,
    expectedStateVersion: number,
    actorSequence: number,
    intent: DuoAuthorityIntent,
  ): Promise<DuoAuthorityTransition> => {
    this.assertSession(session, 'submit');
    if (this.attemptStatus === 'invalidated') {
      this.invalidatedSubmitRejections += 1;
      throw new Error('Runtime authority fixture rejected intent for invalidated attempt');
    }
    if (this.heldTransportFailure === 'submit') {
      throw new Error('Deterministic authority fixture rejected stale version');
    }
    this.assertBinding(binding, encounterId);
    if (expectedStateVersion !== this.state.version) throw new Error('Deterministic authority fixture rejected stale version');
    const wallNowMs = performance.now();
    this.serverNowMs += Math.max(1, Math.floor(wallNowMs - this.lastWallMs));
    this.lastWallMs = wallNowMs;
    const authorityNowMs = this.serverNowMs;
    this.apply(HOST_ID, actorSequence, intent, authorityNowMs);
    if (intent.kind === 'start-ack' && this.state.lifecycle === 'awaiting-start') {
      this.serverNowMs = authorityNowMs + 1;
      this.apply(PARTNER_ID, 1, { kind: 'start-ack' }, this.serverNowMs);
    }
    if (this.state.completed && !this.completionProofLedger.includes(this.state.encounterId)) {
      this.completionProofLedger.push(this.state.encounterId);
    }
    return Object.freeze({
      stateVersion: this.state.version,
      state: this.state,
      replayed: false,
      completed: this.state.completed,
    });
  };

  advance = async (session: CoopAuthorityRuntimeSession, binding: DuoAuthorityBinding, encounterId: string): Promise<void> => {
    this.assertSession(session, 'advance');
    this.assertBinding(binding, encounterId);
    if (!this.state.completed) throw new Error('Deterministic authority fixture rejected premature advance');
    this.advances += 1;
  };

  restart = async (session: CoopAuthorityRuntimeSession, binding: DuoAuthorityBinding): Promise<void> => {
    this.assertSession(session, 'restart');
    this.assertBinding(binding, this.state.encounterId);
    this.restarts += 1;
  };

  exitMy = async (session: CoopAuthorityRuntimeSession, lobbyId: string, expectedRunSeed: number): Promise<void> => {
    this.assertSession(session, 'exit');
    if (lobbyId !== LOBBY_ID || expectedRunSeed !== RUN_SEED) throw new Error('Runtime authority fixture exit binding mismatch');
    if (this.attemptStatus === 'invalidated') return;
    this.attemptStatus = 'invalidated';
    this.exitCalls += 1;
  };

  async probeInvalidatedAttempt(): Promise<Readonly<{ readRejected: boolean; submitRejected: boolean }>> {
    const session = this.currentSession();
    if (!session) throw new Error('Runtime authority fixture session is unavailable');
    let readRejected = false;
    let submitRejected = false;
    try {
      await this.read(session, LOBBY_ID, RUN_SEED);
    } catch {
      readRejected = true;
    }
    try {
      const sequence = (this.state.lastClientSeqByActor[HOST_ID] ?? 0) + 1;
      await this.submit(session, this.binding, this.state.encounterId, this.state.version, sequence, { kind: 'sync' });
    } catch {
      submitRejected = true;
    }
    return Object.freeze({ readRejected, submitRejected });
  }

  interruptNextRead(): void {
    this.heldTransportFailure = 'read';
  }

  rejectNextSubmitAsStale(): void {
    this.heldTransportFailure = 'submit';
  }

  releaseTransportFailure(): void {
    this.heldTransportFailure = null;
  }

  interruptNextActorSession(): void {
    this.sessionAvailable = false;
  }

  refreshActorSession(): void {
    this.sessionGeneration += 1;
    this.sessionAvailable = true;
  }

  movePartnerOutOfReviveRange(): void {
    const host = this.state.actors.find(candidate => candidate.actorId === HOST_ID);
    if (!host) throw new Error('Runtime authority fixture host is missing');
    this.moveActor(PARTNER_ID, host.x + 160, host.y);
  }

  movePartnerIntoReviveRange(): void {
    const host = this.state.actors.find(candidate => candidate.actorId === HOST_ID);
    if (!host) throw new Error('Runtime authority fixture host is missing');
    this.moveActor(PARTNER_ID, host.x - 48, host.y);
  }

  prepareHostTelegraph(): void {
    this.state = Object.freeze({
      ...this.state,
      actors: Object.freeze(this.state.actors.map(candidate => Object.freeze(candidate.actorId === HOST_ID
        ? { ...candidate, hp: Math.max(candidate.hp, 999), maxHp: Math.max(candidate.maxHp, 999), defense: Math.max(candidate.defense, 999) }
        : candidate))),
    });
    this.armEnemyAt(HOST_ID);
    this.state = Object.freeze({
      ...this.state,
      enemies: Object.freeze(this.state.enemies.map(enemy => Object.freeze({ ...enemy, attack: 0 }))),
    });
    this.advanceActorUntil(HOST_ID, () => this.state.enemies.some(enemy => enemy.attackPhase === 'telegraph'));
  }

  clearHostTelegraph(): void {
    this.parkEnemy();
  }

  loadEvidenceRoom(room: number): void {
    if (!Number.isInteger(room) || room < 1 || room > 100) throw new Error('Runtime authority evidence room is invalid');
    this.serverNowMs += 1;
    this.state = createRoomBoundCanonicalEncounterState({
      runId: LOBBY_ID,
      runAttempt: 1,
      chapter: 1,
      room,
      seed: RUN_SEED,
      authorityStartedAtMs: this.serverNowMs,
      // Keep the long-running evidence actors durable without bypassing the canonical
      // server-owned build contract. The factory validates every snapshot and production
      // authority intentionally rejects defense above 1,000.
      actors: [
        identity(HOST_ID, EVIDENCE_ACTOR_MAX_HP, EVIDENCE_ACTOR_DEFENSE),
        identity(PARTNER_ID, EVIDENCE_ACTOR_MAX_HP, EVIDENCE_ACTOR_DEFENSE),
      ],
    });
    this.serverNowMs += 1;
    this.apply(HOST_ID, 1, { kind: 'start-ack' }, this.serverNowMs);
    this.serverNowMs += 1;
    this.apply(PARTNER_ID, 1, { kind: 'start-ack' }, this.serverNowMs);
    this.parkEnemy();
    this.lastWallMs = performance.now();
  }

  completeEvidenceEncounter(): void {
    if (this.state.completed) return;
    this.state = Object.freeze({
      ...this.state,
      version: this.state.version + 1,
      enemies: Object.freeze(this.state.enemies.map(enemy => Object.freeze({ ...enemy, hp: 0 }))),
      runeStorm: Object.freeze({ ...this.state.runeStorm, active: false, strikeAtMs: null }),
      completed: true,
      lifecycle: 'completed',
    });
    if (!this.completionProofLedger.includes(this.state.encounterId)) {
      this.completionProofLedger.push(this.state.encounterId);
    }
  }

  preparePartnerDowned(): void {
    this.armEnemyAt(PARTNER_ID);
    this.advanceActorUntil(PARTNER_ID, actorState => actorState.lifeState === 'downed');
    this.parkEnemy();
  }

  resetPartnerDownedEvidenceBoundary(): void {
    if (this.attemptStatus !== 'active') throw new Error('Cannot reset an invalidated authority evidence attempt');
    // Each adversarial pointer/reconnect proof gets a fresh canonical downed window. Rebuild
    // and advance the real authority kernel instead of mutating life-state flags or extending
    // the production 30 s contract, so slow device automation cannot consume the next proof's
    // lifecycle budget while retaining the same authenticated attempt/session boundary.
    const previousSequences = this.state.lastClientSeqByActor;
    this.serverNowMs += 1;
    this.state = createFixtureState(this.serverNowMs);
    this.parkEnemy();
    this.serverNowMs += 1;
    this.apply(HOST_ID, 1, { kind: 'start-ack' }, this.serverNowMs);
    this.serverNowMs += 1;
    this.apply(PARTNER_ID, 1, { kind: 'start-ack' }, this.serverNowMs);
    this.state = Object.freeze({
      ...this.state,
      lastClientSeqByActor: Object.freeze({
        [HOST_ID]: Math.max(1, previousSequences[HOST_ID] ?? 0),
        [PARTNER_ID]: Math.max(1, previousSequences[PARTNER_ID] ?? 0),
      }),
    });
    this.lastWallMs = performance.now();
    this.preparePartnerDowned();
    this.lastWallMs = performance.now();
  }

  preparePartnerSecondDeath(): void {
    const partner = this.state.actors.find(candidate => candidate.actorId === PARTNER_ID);
    if (!partner || partner.lifeState !== 'alive' || partner.revivesUsed !== 1) {
      throw new Error('Partner must be canonically revived exactly once before second death');
    }
    this.armEnemyAt(PARTNER_ID);
    this.advanceActorUntil(PARTNER_ID, actorState => actorState.lifeState === 'fallen');
    this.parkEnemy();
  }

  prepareTeamDefeat(): void {
    this.state = Object.freeze({
      ...this.state,
      actors: Object.freeze(this.state.actors.map(candidate => Object.freeze(candidate.actorId === HOST_ID
        ? { ...candidate, hp: 1, maxHp: 1, defense: 0 }
        : candidate))),
    });
    this.armEnemyAt(HOST_ID);
    this.advanceActorUntil(HOST_ID, () => this.state.lifecycle === 'team-defeated');
  }

  snapshot(): RuntimeDuoAuthoritySnapshot {
    return Object.freeze({
      state: this.state,
      intents: Object.freeze([...this.intents]),
      advances: this.advances,
      restarts: this.restarts,
      sessionGeneration: this.sessionGeneration,
      sessionAvailable: this.sessionAvailable,
      attemptStatus: this.attemptStatus,
      consumedSessions: Object.freeze([...this.consumedSessions]),
      exitCalls: this.exitCalls,
      invalidatedReadRejections: this.invalidatedReadRejections,
      invalidatedSubmitRejections: this.invalidatedSubmitRejections,
      completionProofs: this.completionProofLedger.length,
    });
  }

  private assertSession(session: CoopAuthorityRuntimeSession, operation: string): void {
    const current = this.currentSession();
    if (!current || current.actorId !== session.actorId || current.credentialGeneration !== session.credentialGeneration) {
      throw new Error('Runtime authority fixture rejected stale authenticated session');
    }
    this.consumedSessions.push(Object.freeze({ operation, actorId: session.actorId, credentialGeneration: session.credentialGeneration }));
  }

  private moveActor(actorId: string, x: number, y: number): void {
    this.state = Object.freeze({
      ...this.state,
      actors: Object.freeze(this.state.actors.map(candidate => Object.freeze(candidate.actorId === actorId
        ? { ...candidate, x, y }
        : candidate))),
    });
  }

  private assertBinding(binding: DuoAuthorityBinding, encounterId: string): void {
    if (binding.lobbyId !== LOBBY_ID || binding.runAttempt !== 1 || binding.runSeed !== RUN_SEED || encounterId !== this.state.encounterId) {
      throw new Error('Runtime authority fixture binding mismatch');
    }
  }

  private apply(actorId: string, clientSeq: number, intent: DuoAuthorityIntent, authorityNowMs: number): void {
    const result = reduceAuthorityIntent(this.state, { ...intent, actorId, clientSeq } as AuthorityIntent, authorityNowMs);
    this.state = result.state;
    this.intents.push(Object.freeze({ actorId, kind: intent.kind, authorityNowMs }));
  }

  private advanceActorUntil(actorId: string, done: (actorState: CanonicalEncounterState['actors'][number]) => boolean): void {
    for (let step = 0; step < 180; step += 1) {
      const actorState = this.state.actors.find(candidate => candidate.actorId === actorId);
      if (!actorState) throw new Error('Runtime authority fixture actor is missing');
      if (done(actorState)) return;
      if (actorState.lifeState !== 'alive') break;
      const clientSeq = (this.state.lastClientSeqByActor[actorId] ?? 0) + 1;
      this.serverNowMs += 100;
      this.apply(actorId, clientSeq, { kind: 'sync' }, this.serverNowMs);
    }
    throw new Error(`Runtime authority fixture could not reach canonical lifecycle state for ${actorId}`);
  }

  private armEnemyAt(actorId: string): void {
    const target = this.state.actors.find(candidate => candidate.actorId === actorId);
    if (!target) throw new Error('Runtime authority fixture target is missing');
    const enemies = this.state.enemies.map((enemy, index) => Object.freeze(index === 0 ? {
      ...enemy,
      x: target.x,
      y: target.y,
      speed: 90,
      nextAttackAtMs: this.serverNowMs,
      targetActorId: null,
      attackPhase: 'idle' as const,
      telegraphStartedAtMs: null,
      attackImpactAtMs: null,
    } : enemy));
    this.state = Object.freeze({ ...this.state, enemies: Object.freeze(enemies) });
  }

  private parkEnemy(): void {
    const enemies = this.state.enemies.map(enemy => Object.freeze({
      ...enemy,
      x: 720,
      y: 720,
      speed: 1,
      nextAttackAtMs: this.serverNowMs + 60_000,
      targetActorId: null,
      attackPhase: 'idle' as const,
      telegraphStartedAtMs: null,
      attackImpactAtMs: null,
    }));
    this.state = Object.freeze({ ...this.state, enemies: Object.freeze(enemies) });
  }
}

export const RUNTIME_DUO_AUTHORITY_CONTEXT = Object.freeze({
  mode: 'duo' as const,
  lobbyId: LOBBY_ID,
  runSeed: RUN_SEED,
  role: 'host' as const,
  playerLimit: 2 as const,
});
