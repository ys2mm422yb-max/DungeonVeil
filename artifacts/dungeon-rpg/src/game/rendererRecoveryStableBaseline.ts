import { GameEngine } from './runEngine';

type PatchedGameEnginePrototype = typeof GameEngine.prototype & {
  __dungeonVeilStableRecoveryBaselineInstalled?: boolean;
};

type RecoveryDetail = {
  rendererRecovery?: boolean;
  owner?: string;
  reason?: string;
};

let activeEngine: GameEngine | null = null;
let preUpdateHp: number | null = null;

function isRendererRecoveryEvent(event: Event) {
  if (event.type === 'dungeon-veil-renderer-lost') return true;
  const detail = event instanceof CustomEvent ? (event.detail ?? {}) as RecoveryDetail : {};
  return detail.rendererRecovery === true
    || detail.owner === 'game-canvas-recovery'
    || detail.reason === 'webglcontextlost';
}

function restoreStablePreRecoveryHp(event: Event) {
  if (!isRendererRecoveryEvent(event) || !activeEngine || preUpdateHp === null) return;
  const liveHp = activeEngine.state.player.hp;
  // Recovery is a full gameplay freeze boundary. Restore both damage and healing
  // drift before React recovery handlers latch the authoritative hold HP.
  if (Number.isFinite(liveHp) && liveHp !== preUpdateHp) activeEngine.state.player.hp = preUpdateHp;
}

export function installRendererRecoveryStableBaseline() {
  if (typeof window === 'undefined') return;

  const prototype = GameEngine.prototype as PatchedGameEnginePrototype;
  if (prototype.__dungeonVeilStableRecoveryBaselineInstalled) return;
  prototype.__dungeonVeilStableRecoveryBaselineInstalled = true;

  const originalUpdate = prototype.update;
  prototype.update = function patchedStableRecoveryUpdate(timestamp: number) {
    activeEngine = this;
    preUpdateHp = this.state.player.hp;
    return originalUpdate.call(this, timestamp);
  };

  // Registered before React mounts so the authoritative pre-frame baseline is
  // restored before Game's recovery handlers latch the hold HP. This closes the
  // browser-task gap where one combat frame could land between QA/renderer state
  // observation and the recovery event on slower Chromium devices.
  window.addEventListener('dungeon-veil-renderer-lost', restoreStablePreRecoveryHp);
  window.addEventListener('dungeon-veil-room-preparing', restoreStablePreRecoveryHp);
}
