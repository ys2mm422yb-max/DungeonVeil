import type { RunGameState } from './runEngine';

export const SPECTATOR_INTERPOLATION_DELAY_MS = 240;
export const SPECTATOR_MAX_EXTRAPOLATION_MS = 110;
export const SPECTATOR_PACKET_GAP_MS = 900;
export const SPECTATOR_BUFFER_LIMIT = 8;
export const SPECTATOR_TELEPORT_THRESHOLD = 280;

export type SpectatorPlaybackDiagnostics = {
  bufferDepth: number;
  renderedFrames: number;
  receivedSnapshots: number;
  droppedSnapshots: number;
  hardCorrections: number;
  extrapolationMs: number;
  packetIntervalMs: number;
  arrivalJitterMs: number;
  packetAgeMs: number;
  packetBytes: number;
  enemies: number;
  effects: number;
  particles: number;
  damageNumbers: number;
  mode: 'waiting' | 'interpolating' | 'extrapolating' | 'frozen';
};

type PlaybackFrame = {
  emittedAt: number;
  receivedAt: number;
  timelineAt: number;
  state: RunGameState;
  enemies: Map<string, RunGameState['enemies'][number]>;
};

function finite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function cloneObjects<T extends object>(values: readonly T[]): T[] {
  return values.map(value => ({ ...value }));
}

export function cloneSpectatorPlaybackState(state: RunGameState): RunGameState {
  return {
    ...state,
    player: { ...state.player },
    camera: { ...state.camera },
    enemies: cloneObjects(state.enemies),
    items: cloneObjects(state.items),
    chests: cloneObjects(state.chests),
    damageNumbers: cloneObjects(state.damageNumbers),
    particles: cloneObjects(state.particles),
    effects: cloneObjects(state.effects),
    upgradeChoices: [...state.upgradeChoices],
    runSkills: { ...state.runSkills },
  };
}

function sameRoom(left: RunGameState, right: RunGameState): boolean {
  return left.chapter === right.chapter
    && left.floor === right.floor
    && left.map.width === right.map.width
    && left.map.height === right.map.height;
}

function copySnapshotIntoStableState(display: RunGameState, target: RunGameState): void {
  const stablePlayer = display.player;
  const stableCamera = display.camera;
  const playerX = stablePlayer.x;
  const playerY = stablePlayer.y;
  const cameraX = stableCamera.x;
  const cameraY = stableCamera.y;
  const previousEnemies = new Map(display.enemies.map(enemy => [enemy.id, enemy]));

  Object.assign(display, target);
  Object.assign(stablePlayer, target.player);
  stablePlayer.x = playerX;
  stablePlayer.y = playerY;
  display.player = stablePlayer;

  Object.assign(stableCamera, target.camera);
  stableCamera.x = cameraX;
  stableCamera.y = cameraY;
  display.camera = stableCamera;

  display.enemies = target.enemies.map(enemy => {
    const stableEnemy = previousEnemies.get(enemy.id);
    if (!stableEnemy) return { ...enemy };
    const x = stableEnemy.x;
    const y = stableEnemy.y;
    Object.assign(stableEnemy, enemy);
    stableEnemy.x = x;
    stableEnemy.y = y;
    return stableEnemy;
  });
  display.items = cloneObjects(target.items);
  display.chests = cloneObjects(target.chests);
  display.damageNumbers = cloneObjects(target.damageNumbers);
  display.particles = cloneObjects(target.particles);
  display.effects = cloneObjects(target.effects);
  display.upgradeChoices = [];
  display.runSkills = { ...target.runSkills };
}

function blendPosition(fromX: number, fromY: number, toX: number, toY: number, amount: number) {
  const safeFromX = finite(fromX, toX);
  const safeFromY = finite(fromY, toY);
  const safeToX = finite(toX, safeFromX);
  const safeToY = finite(toY, safeFromY);
  const distance = Math.hypot(safeToX - safeFromX, safeToY - safeFromY);
  if (distance > SPECTATOR_TELEPORT_THRESHOLD) return { x: safeToX, y: safeToY, corrected: true };
  return {
    x: safeFromX + (safeToX - safeFromX) * amount,
    y: safeFromY + (safeToY - safeFromY) * amount,
    corrected: false,
  };
}

function frameFrom(state: RunGameState, emittedAt: number, receivedAt: number, timelineAt: number): PlaybackFrame {
  return {
    emittedAt,
    receivedAt,
    timelineAt,
    state,
    enemies: new Map(state.enemies.map(enemy => [enemy.id, enemy])),
  };
}

export class SpectatorPlaybackBuffer {
  readonly sceneState: RunGameState;
  private readonly frames: PlaybackFrame[] = [];
  private readonly baseEmittedAt: number;
  private readonly baseTimelineAt: number;
  private renderedFrames = 0;
  private receivedSnapshots = 0;
  private droppedSnapshots = 0;
  private hardCorrections = 0;
  private extrapolationMs = 0;
  private packetIntervalMs = 0;
  private arrivalJitterMs = 0;
  private packetBytes = 0;
  private mode: SpectatorPlaybackDiagnostics['mode'] = 'waiting';
  private correctionPair = '';

  constructor(initialState: RunGameState, emittedAt: number, packetBytes = 0, receivedAt = performance.now()) {
    this.sceneState = cloneSpectatorPlaybackState(initialState);
    this.baseEmittedAt = finite(emittedAt, Date.now());
    this.baseTimelineAt = receivedAt;
    this.packetBytes = Math.max(0, Math.floor(packetBytes));
    this.push(initialState, emittedAt, packetBytes, receivedAt);
  }

  accepts(state: RunGameState): boolean {
    return sameRoom(this.sceneState, state);
  }

  push(state: RunGameState, emittedAt: number, packetBytes = 0, receivedAt = performance.now()): boolean {
    if (!this.accepts(state)) return false;
    const safeEmittedAt = finite(emittedAt, Date.now());
    const last = this.frames[this.frames.length - 1];
    if (last && safeEmittedAt <= last.emittedAt) {
      this.droppedSnapshots += 1;
      return false;
    }

    const timelineAt = this.baseTimelineAt + Math.max(0, safeEmittedAt - this.baseEmittedAt);
    if (last) {
      const hostInterval = Math.max(1, timelineAt - last.timelineAt);
      const arrivalInterval = Math.max(0, receivedAt - last.receivedAt);
      this.packetIntervalMs = hostInterval;
      this.arrivalJitterMs = Math.abs(arrivalInterval - hostInterval);
    }

    this.frames.push(frameFrom(state, safeEmittedAt, receivedAt, timelineAt));
    if (this.frames.length > SPECTATOR_BUFFER_LIMIT) this.frames.splice(0, this.frames.length - SPECTATOR_BUFFER_LIMIT);
    this.receivedSnapshots += 1;
    this.packetBytes = Math.max(0, Math.floor(packetBytes || this.packetBytes));
    copySnapshotIntoStableState(this.sceneState, state);
    return true;
  }

  render(now = performance.now()): RunGameState {
    this.renderedFrames += 1;
    const latest = this.frames[this.frames.length - 1];
    if (!latest) {
      this.mode = 'waiting';
      return this.sceneState;
    }

    const renderAt = now - SPECTATOR_INTERPOLATION_DELAY_MS;
    let from = this.frames[0];
    let to = this.frames[0];
    let amount = 1;
    this.extrapolationMs = 0;

    for (let index = 1; index < this.frames.length; index++) {
      const candidate = this.frames[index];
      if (candidate.timelineAt >= renderAt) {
        from = this.frames[index - 1];
        to = candidate;
        const span = Math.max(1, to.timelineAt - from.timelineAt);
        amount = Math.max(0, Math.min(1, (renderAt - from.timelineAt) / span));
        this.mode = 'interpolating';
        break;
      }
      from = candidate;
      to = candidate;
    }

    if (renderAt > latest.timelineAt) {
      const previous = this.frames[this.frames.length - 2];
      const packetAge = now - latest.receivedAt;
      if (previous && packetAge <= SPECTATOR_PACKET_GAP_MS) {
        const span = Math.max(1, latest.timelineAt - previous.timelineAt);
        this.extrapolationMs = Math.max(0, Math.min(SPECTATOR_MAX_EXTRAPOLATION_MS, renderAt - latest.timelineAt));
        from = previous;
        to = latest;
        amount = 1 + this.extrapolationMs / span;
        this.mode = this.extrapolationMs > 0 ? 'extrapolating' : 'interpolating';
      } else {
        from = latest;
        to = latest;
        amount = 1;
        this.mode = 'frozen';
      }
    } else if (this.frames.length === 1 || renderAt <= this.frames[0].timelineAt) {
      from = this.frames[0];
      to = this.frames[0];
      amount = 1;
      this.mode = this.frames.length === 1 ? 'waiting' : 'interpolating';
    }

    const correctionKey = `${from.emittedAt}:${to.emittedAt}`;
    let corrected = false;
    const player = blendPosition(from.state.player.x, from.state.player.y, to.state.player.x, to.state.player.y, amount);
    this.sceneState.player.x = player.x;
    this.sceneState.player.y = player.y;
    corrected ||= player.corrected;

    const camera = blendPosition(from.state.camera.x, from.state.camera.y, to.state.camera.x, to.state.camera.y, amount);
    this.sceneState.camera.x = camera.x;
    this.sceneState.camera.y = camera.y;
    corrected ||= camera.corrected;

    for (const enemy of this.sceneState.enemies) {
      const fromEnemy = from.enemies.get(enemy.id) ?? to.enemies.get(enemy.id);
      const toEnemy = to.enemies.get(enemy.id) ?? fromEnemy;
      if (!fromEnemy || !toEnemy) continue;
      const position = blendPosition(fromEnemy.x, fromEnemy.y, toEnemy.x, toEnemy.y, amount);
      enemy.x = position.x;
      enemy.y = position.y;
      corrected ||= position.corrected;
    }

    if (corrected && this.correctionPair !== correctionKey) {
      this.correctionPair = correctionKey;
      this.hardCorrections += 1;
    }
    return this.sceneState;
  }

  diagnostics(now = performance.now()): SpectatorPlaybackDiagnostics {
    const latest = this.frames[this.frames.length - 1];
    return {
      bufferDepth: this.frames.length,
      renderedFrames: this.renderedFrames,
      receivedSnapshots: this.receivedSnapshots,
      droppedSnapshots: this.droppedSnapshots,
      hardCorrections: this.hardCorrections,
      extrapolationMs: Number(this.extrapolationMs.toFixed(1)),
      packetIntervalMs: Number(this.packetIntervalMs.toFixed(1)),
      arrivalJitterMs: Number(this.arrivalJitterMs.toFixed(1)),
      packetAgeMs: Number(Math.max(0, latest ? now - latest.receivedAt : 0).toFixed(1)),
      packetBytes: this.packetBytes,
      enemies: this.sceneState.enemies.length,
      effects: this.sceneState.effects.length,
      particles: this.sceneState.particles.length,
      damageNumbers: this.sceneState.damageNumbers.length,
      mode: this.mode,
    };
  }
}
