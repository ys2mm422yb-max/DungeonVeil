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
let recoveryHeldHp: number | null = null;
let recoveryHoldFrame = 0;

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
  // Preserve the original boundary contract: prefer the retained pre-mutation
  // baseline, then fall back to the last pre-update HP when no mutation baseline
  // is retained.
  if (retainedPreMutationHp !== null) {
    if (Number.isFinite(liveHp) && Number.isFinite(retainedPreMutationHp) && liveHp !== retainedPreMutationHp) {
      activeEngine.state.player.hp = retainedPreMutationHp;
    }
  } else if (Number.isFinite(liveHp) && liveHp !== preUpdateHp) {
    activeEngine.state.player.hp = preUpdateHp;
  }
}

function restoreHeldHp() {
  if (!activeEngine || recoveryHeldHp === null) return;
  const liveHp = activeEngine.state.player.hp;
  if (Number.isFinite(liveHp) && liveHp !== recoveryHeldHp) {
    activeEngine.state.player.hp = recoveryHeldHp;
  }
}

function keepRecoveryHpFrozen() {
  recoveryHoldFrame = 0;
  if (recoveryHeldHp === null) return;
  restoreHeldHp();
  recoveryHoldFrame = window.requestAnimationFrame(keepRecoveryHpFrozen);
}

function beginStableRecoveryHpHold(event: Event) {
  if (!isRendererRecoveryEvent(event) || !activeEngine || preUpdateHp === null) return;

  // The original recovery listener restores the proven boundary first. Multiple
  // lifecycle events may describe the same recovery, so the first held value
  // remains authoritative until room-ready and later events cannot rebase it.
  if (recoveryHeldHp === null) {
    const restoredHp = activeEngine.state.player.hp;
    if (!Number.isFinite(restoredHp)) return;
    recoveryHeldHp = restoredHp;
  } else {
    restoreHeldHp();
  }

  if (!recoveryHoldFrame) recoveryHoldFrame = window.requestAnimationFrame(keepRecoveryHpFrozen);
}

function endStableRecoveryHpHold() {
  restoreHeldHp();
  recoveryHeldHp = null;
  if (recoveryHoldFrame) window.cancelAnimationFrame(recoveryHoldFrame);
  recoveryHoldFrame = 0;
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
    preUpdateHp = this.state.player.hp;
    const result = originalUpdate.call(this, timestamp);
    const afterHp = this.state.player.hp;

    // The normal Game loop is paused during renderer recovery, but asynchronous
    // runtime effects can still resolve after the recovery boundary. Keep the
    // authoritative HP frozen until the matching room-ready lifecycle resumes play.
    if (recoveryHeldHp !== null) {
      if (Number.isFinite(afterHp) && afterHp !== recoveryHeldHp) this.state.player.hp = recoveryHeldHp;
      return result;
    }

    if (Number.isFinite(beforeHp) && Number.isFinite(afterHp) && afterHp !== beforeHp) {
      retainedPreMutationHp = beforeHp;
      retainedNoopUpdates = RETAINED_NOOP_UPDATE_LIMIT;
    } else if (retainedPreMutationHp !== null) {
      if (retainedNoopUpdates > 0) retainedNoopUpdates -= 1;
      else retainedPreMutationHp = null;
    }

    return result;
  };

  // Preserve the permanent synchronous recovery contract first, then extend it
  // with an rAF hold for asynchronous runtime effects until room-ready resumes play.
  window.addEventListener('dungeon-veil-renderer-lost', restoreStablePreRecoveryHp);
  window.addEventListener('dungeon-veil-room-preparing', restoreStablePreRecoveryHp);
  window.addEventListener('dungeon-veil-renderer-lost', beginStableRecoveryHpHold);
  window.addEventListener('dungeon-veil-room-preparing', beginStableRecoveryHpHold);
  window.addEventListener('dungeon-veil-room-ready', endStableRecoveryHpHold);
}
