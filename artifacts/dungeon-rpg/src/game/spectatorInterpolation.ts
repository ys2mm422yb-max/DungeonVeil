import type { RunGameState } from './runEngine';

export const SPECTATOR_BUFFER_CAPACITY = 8;
export const SPECTATOR_INTERPOLATION_DELAY_MS = 140;
export const SPECTATOR_MAX_EXTRAPOLATION_MS = 80;
export const SPECTATOR_MAX_EXTRAPOLATION_PX = 28;
export const SPECTATOR_MAX_CORRECTION_STEP_PX = 10;
export const SPECTATOR_UI_PAINT_MS = 250;

export type SpectatorStateSnapshot = {
  emittedAt: number;
  state: RunGameState;
};

export type SpectatorSampleMode = 'empty' | 'interpolated' | 'extrapolated' | 'held';

export type SpectatorInterpolationMetrics = {
  acceptedSnapshots: number;
  duplicateSnapshots: number;
  outOfOrderSnapshots: number;
  roomResets: number;
  bufferDepth: number;
  networkHz: number;
  packetAgeMs: number;
  lastPacketGapMs: number;
  maxPacketGapMs: number;
  sampledFrames: number;
  interpolatedFrames: number;
  extrapolatedFrames: number;
  heldFrames: number;
  maxExtrapolatedDistancePx: number;
  maxCorrectionStepPx: number;
  mode: SpectatorSampleMode;
};

type Positioned = { id: string; x: number; y: number };
type TimedVisual = Positioned & { lifeTime: number; maxLifeTime: number };
type MotionAccumulator = { prediction: number; correction: number };

type BufferedFrame = {
  emittedAt: number;
  receivedAt: number;
  localAt: number;
  state: RunGameState;
  enemies: Map<string, RunGameState['enemies'][number]>;
  effects: Map<string, RunGameState['effects'][number]>;
  particles: Map<string, RunGameState['particles'][number]>;
  damageNumbers: Map<string, RunGameState['damageNumbers'][number]>;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

function roomKey(state: RunGameState): string {
  return `${state.chapter}:${state.floor}:${state.map.width}x${state.map.height}`;
}

function indexById<T extends { id: string }>(items: readonly T[]): Map<string, T> {
  return new Map(items.map(item => [item.id, item]));
}

function cloneState(state: RunGameState): RunGameState {
  return {
    ...state,
    player: { ...state.player, facing: { ...state.player.facing } },
    camera: { ...state.camera },
    enemies: state.enemies.map(enemy => ({ ...enemy })),
    items: state.items.map(item => ({ ...item })),
    chests: state.chests.map(chest => ({ ...chest })),
    damageNumbers: state.damageNumbers.map(number => ({ ...number })),
    particles: state.particles.map(particle => ({ ...particle })),
    effects: state.effects.map(effect => ({ ...effect })),
    upgradeChoices: [...state.upgradeChoices],
    runSkills: { ...state.runSkills },
  };
}

function reconcileStableArray<T extends { id: string }>(
  current: readonly T[],
  incoming: readonly T[],
  preserve: readonly string[] = [],
): T[] {
  const existing = indexById(current);
  return incoming.map(item => {
    const stable = existing.get(item.id);
    if (!stable) return { ...item };
    const stableRecord = stable as unknown as Record<string, unknown>;
    const preserved: Record<string, unknown> = {};
    for (const key of preserve) preserved[key] = stableRecord[key];
    Object.assign(stable, item);
    for (const key of preserve) stableRecord[key] = preserved[key];
    return stable;
  });
}

function reconcileDisplayState(display: RunGameState, incoming: RunGameState): void {
  const playerX = display.player.x;
  const playerY = display.player.y;
  const cameraX = display.camera.x;
  const cameraY = display.camera.y;

  display.status = incoming.status;
  display.floor = incoming.floor;
  display.chapter = incoming.chapter;
  display.map = incoming.map;
  display.inDungeon = incoming.inDungeon;
  display.killCount = incoming.killCount;
  display.roomClearReady = incoming.roomClearReady;
  display.roomClearAt = incoming.roomClearAt;
  display.exitHintUntil = incoming.exitHintUntil;
  display.exitHintCount = incoming.exitHintCount;
  display.upgradeChoices = [...incoming.upgradeChoices];
  display.runSkills = { ...incoming.runSkills };

  Object.assign(display.player, incoming.player);
  display.player.facing = { ...incoming.player.facing };
  display.player.x = playerX;
  display.player.y = playerY;
  display.camera.x = cameraX;
  display.camera.y = cameraY;

  display.enemies = reconcileStableArray(display.enemies, incoming.enemies, ['x', 'y']);
  display.effects = reconcileStableArray(display.effects, incoming.effects, ['x', 'y', 'lifeTime']);
  display.particles = reconcileStableArray(display.particles, incoming.particles, ['x', 'y', 'lifeTime']);
  display.damageNumbers = reconcileStableArray(display.damageNumbers, incoming.damageNumbers, ['x', 'y', 'lifeTime']);
  display.items = reconcileStableArray(display.items, incoming.items, ['x', 'y']);
  display.chests = reconcileStableArray(display.chests, incoming.chests, ['x', 'y']);
}

function moveTowardPosition(
  target: { x: number; y: number },
  desiredX: number,
  desiredY: number,
  accumulator: MotionAccumulator,
): void {
  let dx = desiredX - target.x;
  let dy = desiredY - target.y;
  const distance = Math.hypot(dx, dy);
  if (distance > SPECTATOR_MAX_CORRECTION_STEP_PX && distance > 0) {
    const scale = SPECTATOR_MAX_CORRECTION_STEP_PX / distance;
    dx *= scale;
    dy *= scale;
  }
  target.x += dx;
  target.y += dy;
  accumulator.correction = Math.max(accumulator.correction, Math.hypot(dx, dy));
}

function interpolatePosition(
  target: { x: number; y: number },
  from: { x: number; y: number },
  to: { x: number; y: number },
  amount: number,
  accumulator: MotionAccumulator,
): void {
  moveTowardPosition(target, lerp(from.x, to.x, amount), lerp(from.y, to.y, amount), accumulator);
}

function interpolateCollection<T extends Positioned>(
  display: readonly T[],
  from: Map<string, T>,
  to: Map<string, T>,
  amount: number,
  accumulator: MotionAccumulator,
): void {
  for (const target of display) {
    const lower = from.get(target.id);
    const upper = to.get(target.id);
    if (lower && upper) interpolatePosition(target, lower, upper, amount, accumulator);
    else if (upper) moveTowardPosition(target, upper.x, upper.y, accumulator);
  }
}

function interpolateTimedCollection<T extends TimedVisual>(
  display: readonly T[],
  from: Map<string, T>,
  to: Map<string, T>,
  amount: number,
  accumulator: MotionAccumulator,
): void {
  for (const target of display) {
    const lower = from.get(target.id);
    const upper = to.get(target.id);
    if (lower && upper) {
      interpolatePosition(target, lower, upper, amount, accumulator);
      target.lifeTime = lerp(lower.lifeTime, upper.lifeTime, amount);
    } else if (upper) {
      moveTowardPosition(target, upper.x, upper.y, accumulator);
      target.lifeTime = upper.lifeTime;
    }
  }
}

function extrapolatePosition(
  target: { x: number; y: number },
  previous: { x: number; y: number },
  latest: { x: number; y: number },
  sampleSpanMs: number,
  extrapolateMs: number,
  accumulator: MotionAccumulator,
): void {
  const ratio = sampleSpanMs > 0 ? extrapolateMs / sampleSpanMs : 0;
  let dx = (latest.x - previous.x) * ratio;
  let dy = (latest.y - previous.y) * ratio;
  const prediction = Math.hypot(dx, dy);
  if (prediction > SPECTATOR_MAX_EXTRAPOLATION_PX && prediction > 0) {
    const scale = SPECTATOR_MAX_EXTRAPOLATION_PX / prediction;
    dx *= scale;
    dy *= scale;
  }
  accumulator.prediction = Math.max(accumulator.prediction, Math.hypot(dx, dy));
  moveTowardPosition(target, latest.x + dx, latest.y + dy, accumulator);
}

function extrapolateCollection<T extends Positioned>(
  display: readonly T[],
  previous: Map<string, T>,
  latest: Map<string, T>,
  sampleSpanMs: number,
  extrapolateMs: number,
  accumulator: MotionAccumulator,
): void {
  for (const target of display) {
    const lower = previous.get(target.id);
    const upper = latest.get(target.id);
    if (lower && upper) extrapolatePosition(target, lower, upper, sampleSpanMs, extrapolateMs, accumulator);
    else if (upper) moveTowardPosition(target, upper.x, upper.y, accumulator);
  }
}

function advanceLifeTime<T extends { lifeTime: number; maxLifeTime: number }>(target: T, source: T, extraMs: number): void {
  target.lifeTime = Math.min(target.maxLifeTime, source.lifeTime + extraMs);
}

export class SpectatorInterpolationBuffer {
  private frames: BufferedFrame[] = [];
  private display: RunGameState | null = null;
  private activeRoomKey = '';
  private estimatedClockOffsetMs = 0;
  private acceptedSnapshots = 0;
  private duplicateSnapshots = 0;
  private outOfOrderSnapshots = 0;
  private roomResets = 0;
  private sampledFrames = 0;
  private interpolatedFrames = 0;
  private extrapolatedFrames = 0;
  private heldFrames = 0;
  private lastPacketGapMs = 0;
  private maxPacketGapMs = 0;
  private maxExtrapolatedDistancePx = 0;
  private maxCorrectionStepPx = 0;
  private mode: SpectatorSampleMode = 'empty';
  private readonly motion: MotionAccumulator = { prediction: 0, correction: 0 };

  push(snapshot: SpectatorStateSnapshot, receivedAt = Date.now()): RunGameState | null {
    if (!snapshot || !Number.isFinite(snapshot.emittedAt) || !snapshot.state) return this.display;
    const nextRoomKey = roomKey(snapshot.state);
    const latest = this.frames[this.frames.length - 1];

    if (latest && nextRoomKey === this.activeRoomKey) {
      if (snapshot.emittedAt === latest.emittedAt) {
        this.duplicateSnapshots += 1;
        return this.display;
      }
      if (snapshot.emittedAt < latest.emittedAt) {
        this.outOfOrderSnapshots += 1;
        return this.display;
      }
    }

    if (!this.display || nextRoomKey !== this.activeRoomKey) {
      if (this.display) this.roomResets += 1;
      this.frames = [];
      this.activeRoomKey = nextRoomKey;
      this.display = cloneState(snapshot.state);
      this.estimatedClockOffsetMs = receivedAt - snapshot.emittedAt;
    } else {
      reconcileDisplayState(this.display, snapshot.state);
    }

    const previous = this.frames[this.frames.length - 1];
    const observedOffset = receivedAt - snapshot.emittedAt;
    const offsetDelta = Math.max(-20, Math.min(20, observedOffset - this.estimatedClockOffsetMs));
    this.estimatedClockOffsetMs += offsetDelta * 0.12;
    let localAt = snapshot.emittedAt + this.estimatedClockOffsetMs;
    if (previous && localAt <= previous.localAt) localAt = previous.localAt + 1;

    if (previous) {
      this.lastPacketGapMs = Math.max(0, snapshot.emittedAt - previous.emittedAt);
      this.maxPacketGapMs = Math.max(this.maxPacketGapMs, this.lastPacketGapMs);
    }

    this.frames.push({
      emittedAt: snapshot.emittedAt,
      receivedAt,
      localAt,
      state: snapshot.state,
      enemies: indexById(snapshot.state.enemies),
      effects: indexById(snapshot.state.effects),
      particles: indexById(snapshot.state.particles),
      damageNumbers: indexById(snapshot.state.damageNumbers),
    });
    if (this.frames.length > SPECTATOR_BUFFER_CAPACITY) this.frames.splice(0, this.frames.length - SPECTATOR_BUFFER_CAPACITY);
    this.acceptedSnapshots += 1;
    return this.display;
  }

  sample(now = Date.now()): RunGameState | null {
    const display = this.display;
    if (!display || this.frames.length === 0) {
      this.mode = 'empty';
      return null;
    }

    this.motion.prediction = 0;
    this.motion.correction = 0;
    this.sampledFrames += 1;
    const renderAt = now - SPECTATOR_INTERPOLATION_DELAY_MS;
    const first = this.frames[0];
    const latest = this.frames[this.frames.length - 1];
    let lower = first;
    let upper: BufferedFrame | null = null;

    for (let index = 1; index < this.frames.length; index += 1) {
      const candidate = this.frames[index];
      if (candidate.localAt >= renderAt) {
        upper = candidate;
        lower = this.frames[index - 1];
        break;
      }
    }

    if (upper) {
      const amount = clamp01((renderAt - lower.localAt) / Math.max(1, upper.localAt - lower.localAt));
      interpolatePosition(display.player, lower.state.player, upper.state.player, amount, this.motion);
      interpolatePosition(display.camera, lower.state.camera, upper.state.camera, amount, this.motion);
      interpolateCollection(display.enemies, lower.enemies, upper.enemies, amount, this.motion);
      interpolateTimedCollection(display.effects, lower.effects, upper.effects, amount, this.motion);
      interpolateTimedCollection(display.particles, lower.particles, upper.particles, amount, this.motion);
      interpolateTimedCollection(display.damageNumbers, lower.damageNumbers, upper.damageNumbers, amount, this.motion);
      this.interpolatedFrames += 1;
      this.mode = 'interpolated';
    } else if (renderAt <= first.localAt || this.frames.length < 2) {
      interpolatePosition(display.player, first.state.player, first.state.player, 0, this.motion);
      interpolatePosition(display.camera, first.state.camera, first.state.camera, 0, this.motion);
      this.heldFrames += 1;
      this.mode = 'held';
    } else {
      const previous = this.frames[this.frames.length - 2];
      const sampleSpanMs = Math.max(1, latest.localAt - previous.localAt);
      const requestedExtraMs = Math.max(0, renderAt - latest.localAt);
      const extrapolateMs = Math.min(SPECTATOR_MAX_EXTRAPOLATION_MS, requestedExtraMs);
      extrapolatePosition(display.player, previous.state.player, latest.state.player, sampleSpanMs, extrapolateMs, this.motion);
      extrapolatePosition(display.camera, previous.state.camera, latest.state.camera, sampleSpanMs, extrapolateMs, this.motion);
      extrapolateCollection(display.enemies, previous.enemies, latest.enemies, sampleSpanMs, extrapolateMs, this.motion);
      for (const effect of display.effects) {
        const source = latest.effects.get(effect.id);
        if (source) advanceLifeTime(effect, source, extrapolateMs);
      }
      for (const particle of display.particles) {
        const source = latest.particles.get(particle.id);
        if (source) advanceLifeTime(particle, source, extrapolateMs);
      }
      for (const number of display.damageNumbers) {
        const source = latest.damageNumbers.get(number.id);
        if (source) advanceLifeTime(number, source, extrapolateMs);
      }
      if (requestedExtraMs <= SPECTATOR_MAX_EXTRAPOLATION_MS) {
        this.extrapolatedFrames += 1;
        this.mode = 'extrapolated';
      } else {
        this.heldFrames += 1;
        this.mode = 'held';
      }
    }

    this.maxExtrapolatedDistancePx = Math.max(this.maxExtrapolatedDistancePx, this.motion.prediction);
    this.maxCorrectionStepPx = Math.max(this.maxCorrectionStepPx, this.motion.correction);
    return display;
  }

  state(): RunGameState | null {
    return this.display;
  }

  metrics(now = Date.now()): SpectatorInterpolationMetrics {
    const first = this.frames[0];
    const latest = this.frames[this.frames.length - 1];
    const span = first && latest ? latest.emittedAt - first.emittedAt : 0;
    const networkHz = this.frames.length > 1 && span > 0 ? (this.frames.length - 1) * 1000 / span : 0;
    return {
      acceptedSnapshots: this.acceptedSnapshots,
      duplicateSnapshots: this.duplicateSnapshots,
      outOfOrderSnapshots: this.outOfOrderSnapshots,
      roomResets: this.roomResets,
      bufferDepth: this.frames.length,
      networkHz: Number(networkHz.toFixed(2)),
      packetAgeMs: latest ? Math.max(0, now - latest.receivedAt) : 0,
      lastPacketGapMs: this.lastPacketGapMs,
      maxPacketGapMs: this.maxPacketGapMs,
      sampledFrames: this.sampledFrames,
      interpolatedFrames: this.interpolatedFrames,
      extrapolatedFrames: this.extrapolatedFrames,
      heldFrames: this.heldFrames,
      maxExtrapolatedDistancePx: Number(this.maxExtrapolatedDistancePx.toFixed(2)),
      maxCorrectionStepPx: Number(this.maxCorrectionStepPx.toFixed(2)),
      mode: this.mode,
    };
  }
}
