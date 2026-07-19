import type { RunGameState } from './runEngine';

export const SPECTATOR_BUFFER_CAPACITY = 8;
export const SPECTATOR_INTERPOLATION_DELAY_MS = 140;
export const SPECTATOR_MAX_EXTRAPOLATION_MS = 80;
export const SPECTATOR_MAX_EXTRAPOLATION_PX = 28;
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
  mode: SpectatorSampleMode;
};

type Positioned = { id: string; x: number; y: number };
type TimedVisual = Positioned & { lifeTime: number; maxLifeTime: number };

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
  preserve: readonly (keyof T)[] = [],
): T[] {
  const existing = indexById(current);
  return incoming.map(item => {
    const stable = existing.get(item.id);
    if (!stable) return { ...item };
    const preserved = preserve.map(key => [key, stable[key]] as const);
    Object.assign(stable, item);
    for (const [key, value] of preserved) stable[key] = value;
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

function interpolatePosition(target: { x: number; y: number }, from: { x: number; y: number }, to: { x: number; y: number }, amount: number): void {
  target.x = lerp(from.x, to.x, amount);
  target.y = lerp(from.y, to.y, amount);
}

function interpolateTimedVisual(target: TimedVisual, from: TimedVisual, to: TimedVisual, amount: number): void {
  interpolatePosition(target, from, to, amount);
  target.lifeTime = lerp(from.lifeTime, to.lifeTime, amount);
}

function interpolateCollection<T extends Positioned>(
  display: readonly T[],
  from: Map<string, T>,
  to: Map<string, T>,
): (amount: number) => void {
  return amount => {
    for (const target of display) {
      const lower = from.get(target.id);
      const upper = to.get(target.id);
      if (lower && upper) interpolatePosition(target, lower, upper, amount);
      else if (upper) {
        target.x = upper.x;
        target.y = upper.y;
      }
    }
  };
}

function interpolateTimedCollection<T extends TimedVisual>(
  display: readonly T[],
  from: Map<string, T>,
  to: Map<string, T>,
  amount: number,
): void {
  for (const target of display) {
    const lower = from.get(target.id);
    const upper = to.get(target.id);
    if (lower && upper) interpolateTimedVisual(target, lower, upper, amount);
    else if (upper) {
      target.x = upper.x;
      target.y = upper.y;
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
  maximumDistance: number,
): number {
  const ratio = sampleSpanMs > 0 ? extrapolateMs / sampleSpanMs : 0;
  let dx = (latest.x - previous.x) * ratio;
  let dy = (latest.y - previous.y) * ratio;
  const distance = Math.hypot(dx, dy);
  if (distance > maximumDistance && distance > 0) {
    const scale = maximumDistance / distance;
    dx *= scale;
    dy *= scale;
  }
  target.x = latest.x + dx;
  target.y = latest.y + dy;
  return Math.hypot(dx, dy);
}

function extrapolateCollection<T extends Positioned>(
  display: readonly T[],
  previous: Map<string, T>,
  latest: Map<string, T>,
  sampleSpanMs: number,
  extrapolateMs: number,
  maximumDistance: number,
): number {
  let greatest = 0;
  for (const target of display) {
    const lower = previous.get(target.id);
    const upper = latest.get(target.id);
    if (lower && upper) {
      greatest = Math.max(greatest, extrapolatePosition(target, lower, upper, sampleSpanMs, extrapolateMs, maximumDistance));
    } else if (upper) {
      target.x = upper.x;
      target.y = upper.y;
    }
  }
  return greatest;
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
  private mode: SpectatorSampleMode = 'empty';

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
      interpolatePosition(display.player, lower.state.player, upper.state.player, amount);
      interpolatePosition(display.camera, lower.state.camera, upper.state.camera, amount);
      interpolateCollection(display.enemies, lower.enemies, upper.enemies)(amount);
      interpolateTimedCollection(display.effects, lower.effects, upper.effects, amount);
      interpolateTimedCollection(display.particles, lower.particles, upper.particles, amount);
      interpolateTimedCollection(display.damageNumbers, lower.damageNumbers, upper.damageNumbers, amount);
      this.interpolatedFrames += 1;
      this.mode = 'interpolated';
      return display;
    }

    if (renderAt <= first.localAt || this.frames.length < 2) {
      interpolatePosition(display.player, first.state.player, first.state.player, 0);
      interpolatePosition(display.camera, first.state.camera, first.state.camera, 0);
      this.heldFrames += 1;
      this.mode = 'held';
      return display;
    }

    const previous = this.frames[this.frames.length - 2];
    const sampleSpanMs = Math.max(1, latest.localAt - previous.localAt);
    const requestedExtraMs = Math.max(0, renderAt - latest.localAt);
    const extrapolateMs = Math.min(SPECTATOR_MAX_EXTRAPOLATION_MS, requestedExtraMs);
    let greatest = extrapolatePosition(
      display.player,
      previous.state.player,
      latest.state.player,
      sampleSpanMs,
      extrapolateMs,
      SPECTATOR_MAX_EXTRAPOLATION_PX,
    );
    greatest = Math.max(greatest, extrapolatePosition(
      display.camera,
      previous.state.camera,
      latest.state.camera,
      sampleSpanMs,
      extrapolateMs,
      SPECTATOR_MAX_EXTRAPOLATION_PX,
    ));
    greatest = Math.max(greatest, extrapolateCollection(
      display.enemies,
      previous.enemies,
      latest.enemies,
      sampleSpanMs,
      extrapolateMs,
      SPECTATOR_MAX_EXTRAPOLATION_PX,
    ));
    for (const effect of display.effects) {
      const source = latest.effects.get(effect.id);
      if (source) effect.lifeTime = Math.min(effect.maxLifeTime, source.lifeTime + extrapolateMs);
    }
    for (const particle of display.particles) {
      const source = latest.particles.get(particle.id);
      if (source) effectTime(particle, source, extrapolateMs);
    }
    for (const number of display.damageNumbers) {
      const source = latest.damageNumbers.get(number.id);
      if (source) effectTime(number, source, extrapolateMs);
    }
    this.maxExtrapolatedDistancePx = Math.max(this.maxExtrapolatedDistancePx, greatest);

    if (requestedExtraMs <= SPECTATOR_MAX_EXTRAPOLATION_MS) {
      this.extrapolatedFrames += 1;
      this.mode = 'extrapolated';
    } else {
      this.heldFrames += 1;
      this.mode = 'held';
    }
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
      mode: this.mode,
    };
  }
}

function effectTime<T extends { lifeTime: number; maxLifeTime: number }>(target: T, source: T, extraMs: number): void {
  target.lifeTime = Math.min(target.maxLifeTime, source.lifeTime + extraMs);
}
