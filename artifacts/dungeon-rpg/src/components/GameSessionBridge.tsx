import { useEffect } from 'react';
import { saveEngineSession } from '../game/sessionStore';
import { loadGame } from '../game/saveManager';
import type { GameEngine } from '../game/runEngine';
import type { UpgradeKey } from '../i18n/translations';
import { availableRunSkills } from '../game/runSkills';
import { createRunEffectSystemState, updateRunEffectSystems } from '../game/runEffectSystems';
import { createRunBalanceState, updateRunBalance } from '../game/runBalance';
import { rewardMetaRoomClear } from '../game/metaProgression';
import { MetaRewardBanner } from './MetaRewardBanner';

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
  useEffect(() => {
    if (!active) return;
    const engine = getEngine();
    if (engine) restorePendingRoomGift(engine);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const save = () => {
      const engine = getEngine();
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
    let frame = 0;
    const update = (time: number) => {
      const engine = getEngine();
      if (engine) {
        if (engine.state.status === 'playing') {
          updateRunBalance(engine, balance);
          updateRunEffectSystems(engine, effects, time);
        }
        if (engine.state.roomClearReady) {
          const reward = rewardMetaRoomClear(engine.state.chapter, engine.state.floor);
          if (reward) window.dispatchEvent(new CustomEvent('dungeon-veil-meta-reward', { detail: reward }));
        }
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  return active ? <MetaRewardBanner /> : null;
}
