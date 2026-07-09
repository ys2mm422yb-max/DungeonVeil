import { useEffect, useRef } from 'react';
import { saveEngineSession } from '../game/sessionStore';
import { loadGame } from '../game/saveManager';
import type { GameEngine } from '../game/runEngine';
import type { UpgradeKey } from '../i18n/translations';
import { availableRunSkills } from '../game/runSkills';
import { createRunEffectSystemState, updateRunEffectSystems } from '../game/runEffectSystems';
import { createRunBalanceState, updateRunBalance } from '../game/runBalance';
import { rewardMetaRoomClear } from '../game/metaProgression';
import { createRunRetentionState, updateRunRetentionSystems } from '../game/runRetention';
import { createRunRelicEffectState, updateRunRelicEffects } from '../game/runRelicEffects';
import { createRoomMechanicState, updateRoomMechanics } from '../game/roomMechanics';
import { activatePendingWeeklyRift, createWeeklyRiftRunState, updateWeeklyRiftRun } from '../game/weeklyRiftRun';
import { MetaRewardBanner } from './MetaRewardBanner';
import { RunRetentionOverlay } from './RunRetentionOverlay';

const RUN_UPGRADES: UpgradeKey[] = ['multishot', 'ricochet', 'fireArrow', 'iceArrow', 'attackSpeed', 'piercing', 'attack', 'maxHp', 'speed', 'defense'];

function restorePendingRoomGift(engine: GameEngine): void {
  const save = loadGame();
  if (!save || (save.saveReason !== 'room-complete' && save.saveReason !== 'chapter-complete')) return;
  if (engine.state.status !== 'playing' || engine.state.upgradeChoices.length > 0) return;

  const available = availableRunSkills(engine.state.runSkills, RUN_UPGRADES);
  const pool = available.length >= 3 ? available : [...available, 'heal' as UpgradeKey];
  engine.state.upgradeChoices = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
  engine.state.status = 'levelup';
  engine.onStateChange({ ...engine.state });
}

export function GameSessionBridge({ getEngine, active }: { getEngine: () => GameEngine | null; active: boolean }) {
  const getEngineRef = useRef(getEngine);
  getEngineRef.current = getEngine;

  useEffect(() => {
    if (!active) return;
    const engine = getEngineRef.current();
    if (engine) {
      activatePendingWeeklyRift();
      restorePendingRoomGift(engine);
    }
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const save = () => {
      const engine = getEngineRef.current();
      if (engine && engine.state.player.playerName !== 'Hero') saveEngineSession(engine);
    };
    const hide = () => { if (document.hidden) save(); };
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', hide);
    return () => {
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', hide);
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const effects = createRunEffectSystemState();
    const balance = createRunBalanceState();
    const retention = createRunRetentionState();
    const relicEffects = createRunRelicEffectState();
    const roomMechanics = createRoomMechanicState();
    const weeklyRift = createWeeklyRiftRunState();
    let frame = 0;
    let checkedClearKey = '';
    let lastFrame = performance.now();

    const update = (time: number) => {
      const engine = getEngineRef.current();
      const dt = Math.min(100, Math.max(0, time - lastFrame));
      lastFrame = time;
      if (engine) {
        updateWeeklyRiftRun(engine, weeklyRift);
        if (engine.state.status === 'playing') {
          updateRunBalance(engine, balance);
          updateRunEffectSystems(engine, effects, time);
          updateRunRetentionSystems(engine, retention, time);
          updateRoomMechanics(engine, roomMechanics, time, dt);
        }
        updateRunRelicEffects(engine, relicEffects, time);

        if (engine.state.roomClearReady) {
          const clearKey = `${engine.state.chapter}:${engine.state.floor}:${engine.state.roomClearAt}`;
          if (checkedClearKey !== clearKey) {
            checkedClearKey = clearKey;
            const reward = rewardMetaRoomClear(engine.state.chapter, engine.state.floor);
            if (reward) window.dispatchEvent(new CustomEvent('dungeon-veil-meta-reward', { detail: reward }));
          }
        } else {
          checkedClearKey = '';
        }
      }
      frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return active ? <><MetaRewardBanner /><RunRetentionOverlay /></> : null;
}
