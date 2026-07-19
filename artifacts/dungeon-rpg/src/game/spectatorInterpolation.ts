import type { Enemy } from './entities';
import type { RunGameState } from './runEngine';

export const SPECTATOR_INTERPOLATION_DELAY_MS = 165;
export const SPECTATOR_MAX_EXTRAPOLATION_MS = 120;
export const SPECTATOR_BUFFER_LIMIT = 8;

type TimedSnapshot = {
  emittedAt: number;
  receivedAt: number;
  state: RunGameState;
};

export type SpectatorInterpolationMetrics = {
  receivedSnapshots: number;
  duplicateSnapshots: number;
  outOfOrderSnapshots: number;
  bufferDepth: number;
  interpolationFrames: number;
  extrapolationFrames: number;
  heldFrames: number;
  roomResets: number;
  maxCorrectionPx: number;
  clockOffsetMs: number;
  latestPacketAgeMs: number;
  mode: 'waiting' | 'hold' | 'interpolate' | 'extrapolate';
};

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
const roomKey = (state: RunGameState) => `${state.chapter}:${state.floor}:${state.map.width}x${state.map.height}`;

function cloneState(state: RunGameState): RunGameState {
  if (typeof structuredClone === 'function') return structuredClone(state);
  return JSON.parse(JSON.stringify(state)) as RunGameState;
}

function sameEnemyLayout(output: RunGameState, target: RunGameState): boolean {
  if (output.enemies.length !== target.enemies.length) return false;
  for (let index = 0; index < target.enemies.length; index++) {
    if (output.enemies[index]?.id !== target.enemies[index]?.id) return false;
  }
  return true;
}

function copyNonSpatialState(output: RunGameState, target: RunGameState): void {
  output.status = target.status;
  output.floor = target.floor;
  output.chapter = target.chapter;
  output.map = target.map;
  output.inDungeon = target.inDungeon;
  output.items = target.items;
  output.chests = target.chests;
  output.damageNumbers = target.damageNumbers;
  output.particles = target.particles;
  output.effects = target.effects;
  output.upgradeChoices = [];
  output.runSkills = target.runSkills;
  output.killCount = target.killCount;
  output.roomClearReady = target.roomClearReady;
  output.roomClearAt = target.roomClearAt;
  output.exitHintUntil = target.exitHintUntil;
  output.exitHintCount = target.exitHintCount;
  Object.assign(output.player, target.player);
  Object.assign(output.camera, target.camera);

  if (!sameEnemyLayout(output, target)) {
    output.enemies = target.enemies.map(enemy => ({ ...enemy }));
  } else {
    for (let index = 0; index < target.enemies.length; index++) Object.assign(output.enemies[index], target.enemies[index]);
  }
}

function matchingEnemy(state: RunGameState, id: string): Enemy | undefined {
  return state.enemies.find(enemy => enemy.id === id);
}

export class SpectatorSnapshotBuffer {
  private packets: TimedSnapshot[] = [];
  private offsetSamples: number[] = [];
  private output: RunGameState | null = null;
  private outputRoomKey = '';
  private lastSampleAt = 0;
  private metrics: SpectatorInterpolationMetrics = {
    receivedSnapshots: 0,
    duplicateSnapshots: 0,
    outOfOrderSnapshots: 0,
    bufferDepth: 0,
    interpolationFrames: 0,
    extrapolationFrames: 0,
    heldFrames: 0,
    roomResets: 0,
    maxCorrectionPx: 0,
    clockOffsetMs: 0,
    latestPacketAgeMs: 0,
    mode: 'waiting',
  };

  push(emittedAt: number, state: RunGameState, receivedAt = Date.now()): boolean {
    if (!Number.isFinite(emittedAt) || emittedAt <= 0) return false;
    if (this.packets.some(packet => packet.emittedAt === emittedAt)) {
      this.metrics.duplicateSnapshots += 1;
      return false;
    }
    if (this.packets.length > 0 && emittedAt < this.packets[this.packets.length - 1].emittedAt) this.metrics.outOfOrderSnapshots += 1;

    this.packets.push({ emittedAt, receivedAt, state });
    this.packets.sort((left, right) => left.emittedAt - right.emittedAt);
    if (this.packets.length > SPECTATOR_BUFFER_LIMIT) this.packets.splice(0, this.packets.length - SPECTATOR_BUFFER_LIMIT);

    const offset = receivedAt - emittedAt;
    if (Number.isFinite(offset)) {
      this.offsetSamples.push(offset);
      if (this.offsetSamples.length > 16) this.offsetSamples.shift();
    }
    this.metrics.receivedSnapshots += 1;
    this.metrics.bufferDepth = this.packets.length;
    return true;
  }

  clear(): void {
    this.packets.length = 0;
    this.offsetSamples.length = 0;
    this.output = null;
    this.outputRoomKey = '';
    this.lastSampleAt = 0;
    this.metrics.bufferDepth = 0;
    this.metrics.mode = 'waiting';
  }

  private clockOffset(): number {
    if (this.offsetSamples.length === 0) return 0;
    const sorted = [...this.offsetSamples].sort((left, right) => left - right);
    const sampleCount = Math.min(4, sorted.length);
    return sorted.slice(0, sampleCount).reduce((sum, value) => sum + value, 0) / sampleCount;
  }

  private ensureOutput(target: RunGameState): RunGameState {
    const key = roomKey(target);
    if (!this.output) {
      this.output = cloneState(target);
      this.outputRoomKey = key;
      this.lastSampleAt = 0;
      this.metrics.roomResets += 1;
      return this.output;
    }
    if (key !== this.outputRoomKey) {
      const replacement = cloneState(target);
      Object.assign(this.output, replacement);
      this.output.player = replacement.player;
      this.output.camera = replacement.camera;
      this.output.enemies = replacement.enemies;
      this.output.items = replacement.items;
      this.output.chests = replacement.chests;
      this.output.damageNumbers = replacement.damageNumbers;
      this.output.particles = replacement.particles;
      this.output.effects = replacement.effects;
      this.output.upgradeChoices = replacement.upgradeChoices;
      this.output.runSkills = replacement.runSkills;
      this.outputRoomKey = key;
      this.lastSampleAt = 0;
      this.metrics.roomResets += 1;
    }
    return this.output;
  }

  private smooth(current: number, desired: number, frameMs: number): number {
    if (!Number.isFinite(current) || this.lastSampleAt === 0) return desired;
    const difference = desired - current;
    const maxStep = Math.max(3, Math.min(24, frameMs * 0.82));
    const correction = clamp(difference, -maxStep, maxStep);
    this.metrics.maxCorrectionPx = Math.max(this.metrics.maxCorrectionPx, Math.abs(correction));
    const alpha = 1 - Math.exp(-Math.max(1, frameMs) / 34);
    return current + correction * alpha;
  }

  sample(now = Date.now()): RunGameState | null {
    if (this.packets.length === 0) {
      this.metrics.mode = 'waiting';
      return this.output;
    }

    const clockOffset = this.clockOffset();
    const remoteRenderAt = now - clockOffset - SPECTATOR_INTERPOLATION_DELAY_MS;
    const latest = this.packets[this.packets.length - 1];
    const latestRoom = roomKey(latest.state);
    let previous = latest;
    let target = latest;
    let amount = 1;
    let extrapolationMs = 0;
    let mode: SpectatorInterpolationMetrics['mode'] = 'hold';

    for (let index = 1; index < this.packets.length; index++) {
      const left = this.packets[index - 1];
      const right = this.packets[index];
      if (roomKey(left.state) !== latestRoom || roomKey(right.state) !== latestRoom) continue;
      if (remoteRenderAt >= left.emittedAt && remoteRenderAt <= right.emittedAt) {
        previous = left;
        target = right;
        amount = clamp((remoteRenderAt - left.emittedAt) / Math.max(1, right.emittedAt - left.emittedAt), 0, 1);
        mode = 'interpolate';
        break;
      }
    }

    if (mode !== 'interpolate' && remoteRenderAt > latest.emittedAt) {
      const compatible = [...this.packets].reverse().find(packet => packet !== latest && roomKey(packet.state) === latestRoom);
      if (compatible) {
        previous = compatible;
        target = latest;
        extrapolationMs = clamp(remoteRenderAt - latest.emittedAt, 0, SPECTATOR_MAX_EXTRAPOLATION_MS);
        mode = extrapolationMs > 0 ? 'extrapolate' : 'hold';
      }
    } else if (mode !== 'interpolate') {
      const earliest = this.packets.find(packet => roomKey(packet.state) === latestRoom) ?? latest;
      previous = earliest;
      target = earliest;
      mode = 'hold';
    }

    const output = this.ensureOutput(target.state);
    const frameMs = this.lastSampleAt > 0 ? clamp(now - this.lastSampleAt, 1, 100) : 16;
    const preserveSpatial = this.lastSampleAt > 0 && roomKey(output) === roomKey(target.state);
    const previousPlayerX = output.player.x;
    const previousPlayerY = output.player.y;
    const previousCameraX = output.camera.x;
    const previousCameraY = output.camera.y;
    const previousEnemyPositions = preserveSpatial
      ? new Map(output.enemies.map(enemy => [enemy.id, { x: enemy.x, y: enemy.y }]))
      : new Map<string, { x: number; y: number }>();

    copyNonSpatialState(output, target.state);
    if (preserveSpatial) {
      output.player.x = previousPlayerX;
      output.player.y = previousPlayerY;
      output.camera.x = previousCameraX;
      output.camera.y = previousCameraY;
      for (const enemy of output.enemies) {
        const position = previousEnemyPositions.get(enemy.id);
        if (position) { enemy.x = position.x; enemy.y = position.y; }
      }
    }

    const intervalMs = Math.max(1, target.emittedAt - previous.emittedAt);
    const spatial = (from: number, to: number) => {
      if (mode === 'interpolate') return from + (to - from) * amount;
      if (mode === 'extrapolate') {
        const projected = to + (to - from) / intervalMs * extrapolationMs;
        return to + clamp(projected - to, -32, 32);
      }
      return to;
    };

    output.player.x = this.smooth(output.player.x, spatial(previous.state.player.x, target.state.player.x), frameMs);
    output.player.y = this.smooth(output.player.y, spatial(previous.state.player.y, target.state.player.y), frameMs);
    output.camera.x = this.smooth(output.camera.x, spatial(previous.state.camera.x, target.state.camera.x), frameMs);
    output.camera.y = this.smooth(output.camera.y, spatial(previous.state.camera.y, target.state.camera.y), frameMs);

    for (const enemy of output.enemies) {
      const from = matchingEnemy(previous.state, enemy.id);
      const to = matchingEnemy(target.state, enemy.id);
      if (!to) continue;
      enemy.x = this.smooth(enemy.x, from ? spatial(from.x, to.x) : to.x, frameMs);
      enemy.y = this.smooth(enemy.y, from ? spatial(from.y, to.y) : to.y, frameMs);
    }

    this.lastSampleAt = now;
    this.metrics.clockOffsetMs = Math.round(clockOffset);
    this.metrics.latestPacketAgeMs = Math.max(0, now - latest.receivedAt);
    this.metrics.bufferDepth = this.packets.length;
    this.metrics.mode = mode;
    if (mode === 'interpolate') this.metrics.interpolationFrames += 1;
    else if (mode === 'extrapolate') this.metrics.extrapolationFrames += 1;
    else this.metrics.heldFrames += 1;
    return output;
  }

  getMetrics(): SpectatorInterpolationMetrics {
    return { ...this.metrics, bufferDepth: this.packets.length };
  }
}
