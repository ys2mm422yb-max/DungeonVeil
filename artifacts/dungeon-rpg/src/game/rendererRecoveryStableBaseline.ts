import { GameEngine } from './runEngine';

type PatchedGameEnginePrototype = typeof GameEngine.prototype & {
  __dungeonVeilStableRecoveryBaselineInstalled?: boolean;
};

type RecoveryDetail = {
  rendererRecovery?: boolean;
  owner?: string;
  reason?: string;
};

const RETAINED_NOOP_UPDATE_LIMIT = 1;

let activeEngine: GameEngine | null = null;
let preUpdateHp: number | null = null;
let retainedPreMutationHp: number | null = null;
let retainedNoopUpdates = 0;

function isRendererRecoveryEvent(event: Event) {
  if (event.type === 'dungeon-veil-renderer-lost') return true;
  const detail = event instanceof CustomEvent ? (event.detail ?? {}) as RecoveryDetail : {};
  return detail.rendererRecovery === true
    || detail.owner === 'game-canvas-recovery'
    || detail.reason === 'webglcontextlost';
}

function restoreStablePreRecoveryHp(event: Event) {
  if (!isRendererRecoveryEvent(event) || !activeEngine || preUpdateHp === null) return;
  const stableHp = retainedPreMutationHp ?? preUpdateHp;
  const liveHp = activeEngine.state.player.hp;
  // Recovery is a full gameplay freeze boundary. A mutation can complete one frame
  // before the browser dispatches the recovery event, followed by one no-op frame.
  // Retain that pre-mutation baseline across the no-op so React cannot latch drift.
  if (Number.isFinite(liveHp) && Number.isFinite(stableHp) && liveHp !== stableHp) {
    activeEngine.state.player.hp = stableHp;
  }
}

export function installRendererRecoveryStableBaseline() {
  if (typeof window === 'undefined') return;

  const prototype = GameEngine.prototype as PatchedGameEnginePrototype;
  if (prototype.__dungeonVeilStableRecoveryBaselineInstalled) return;
  prototype.__dungeonVeilStableRecoveryBaselineInstalled = true;

  const originalUpdate = prototype.update;
  prototype.update = function patchedStableRecoveryUpdate(timestamp: number) {
    activeEngine = this;
    const beforeHp = this.state.player.hp;
    preUpdateHp = beforeHp;
    const result = originalUpdate.call(this, timestamp);
    const afterHp = this.state.player.hp;

    if (Number.isFinite(beforeHp) && Number.isFinite(afterHp) && afterHp !== beforeHp) {
      retainedPreMutationHp = beforeHp;
      retainedNoopUpdates = RETAINED_NOOP_UPDATE_LIMIT;
    } else if (retainedPreMutationHp !== null) {
      if (retainedNoopUpdates > 0) retainedNoopUpdates -= 1;
      else retainedPreMutationHp = null;
    }

    return result;
  };

  // Registered before React mounts so the authoritative pre-frame baseline is
  // restored before Game's recovery handlers latch the hold HP. This closes the
  // browser-task gap where one combat frame, plus one intervening no-op update,
  // can land between QA/renderer state observation and the recovery event.
  window.addEventListener('dungeon-veil-renderer-lost', restoreStablePreRecoveryHp);
  window.addEventListener('dungeon-veil-room-preparing', restoreStablePreRecoveryHp);
}
