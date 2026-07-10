import { useEffect, useRef } from 'react';
import { saveEngineSession } from '../game/sessionStore';
import { loadGame } from '../game/saveManager';
import type { GameEngine } from '../game/runEngine';
import type { Enemy } from '../game/entities';
import type { UpgradeKey } from '../i18n/translations';
import { availableRunSkills } from '../game/runSkills';
import { createRunEffectSystemState, updateRunEffectSystems } from '../game/runEffectSystems';
import { createRunBalanceState, updateRunBalance } from '../game/runBalance';
import { rewardMetaRoomClear } from '../game/metaProgression';
import { createRunRetentionState, updateRunRetentionSystems } from '../game/runRetention';
import { createRunRelicEffectState, updateRunRelicEffects } from '../game/runRelicEffects';
import { createRoomMechanicState, updateRoomMechanics } from '../game/roomMechanics';
import { createRunSynergyState, updateRunSynergies } from '../game/runSynergies';
import { createFirstWardenFinaleState, updateFirstWardenFinale } from '../game/firstWardenFinale';
import { pushCloudSave } from '../game/cloudSave';
import { MetaRewardBanner } from './MetaRewardBanner';
import { RunRetentionOverlay } from './RunRetentionOverlay';
import { FirstWardenOverlay } from './FirstWardenOverlay';

const RUN_UPGRADES: UpgradeKey[] = ['multishot', 'ricochet', 'fireArrow', 'iceArrow', 'attackSpeed', 'piercing', 'attack', 'maxHp', 'speed', 'defense'];

type HuntSnapshot = {
  name: string;
  reward: number;
  visualVariant: number;
};

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

function captureHunt(enemy: Enemy | undefined): HuntSnapshot | null {
  if (!enemy?.isHuntTarget || !enemy.huntName) return null;
  return {
    name: enemy.huntName,
    reward: enemy.huntReward ?? 25,
    visualVariant: enemy.huntVisualVariant ?? 0,
  };
}

function restoreHuntAfterRestart(engine: GameEngine, retention: ReturnType<typeof createRunRetentionState>, hunt: HuntSnapshot): void {
  const living = engine.state.enemies.filter(enemy => enemy.hp > 0 && !enemy.isDead);
  if (!living.length) return;
  const target = [...living].sort((a, b) => b.maxHp - a.maxHp)[0];
  target.id = `${target.id}-hunt-${hunt.visualVariant}`;
  target.isHuntTarget = true;
  target.huntName = hunt.name;
  target.huntReward = hunt.reward;
  target.huntVisualVariant = hunt.visualVariant;
  target.width = Math.round(target.width * 1.16);
  target.height = Math.round(target.height * 1.16);
  target.maxHp = Math.max(target.maxHp + 80, Math.round(target.maxHp * 3.1));
  target.hp = target.maxHp;
  target.attack = Math.max(target.attack + 5, Math.round(target.attack * 1.5));
  target.speed *= 1.12;
  target.color = hunt.visualVariant === 1 ? '#c984ef' : hunt.visualVariant === 2 ? '#ed7656' : '#d9a94b';
  retention.huntTargetId = target.id;
  const x = target.x + target.width / 2;
  const y = target.y + target.height / 2;
  engine.state.effects.push({ id: `hunt-restart-outer-${Date.now()}`, x, y, radius: 0, maxRadius: 150, color: target.color, lifeTime: 0, maxLifeTime: 900, type: 'circle', element: 'arcane' });
  engine.state.damageNumbers.push({ id: `hunt-restart-name-${Date.now()}`, x, y: target.y - 28, value: `JAGD: ${hunt.name.toUpperCase()}`, color: '#ffd775', lifeTime: 0, maxLifeTime: 1800, scale: 1.2 });
}

export function GameSessionBridge({ getEngine, active }: { getEngine: () => GameEngine | null; active: boolean }) {
  const getEngineRef = useRef(getEngine);
  getEngineRef.current = getEngine;

  useEffect(() => {
    if (!active) return;
    const engine = getEngineRef.current();
    if (engine) restorePendingRoomGift(engine);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const save = () => {
      const engine = getEngineRef.current();
      if (engine && engine.state.player.playerName !== 'Hero') {
        saveEngineSession(engine);
        void pushCloudSave();
      }
    };
    const hide = () => { if (document.hidden) save(); };
    const interval = window.setInterval(save, 30_000);
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', hide);
    return () => {
      window.clearInterval(interval);
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
    const synergies = createRunSynergyState();
    const firstWarden = createFirstWardenFinaleState();
    let frame = 0;
    let checkedClearKey = '';
    let lastFrame = performance.now();
    let lastMap: GameEngine['state']['map'] | null = null;
    let lastFloor = 0;
    let lastChapter = 0;
    let huntSnapshot: HuntSnapshot | null = null;

    const resetRoomScopedSystems = (engine: GameEngine, restartHunt: HuntSnapshot | null) => {
      effects.roomKey = '';
      effects.nextRuneStormAt = 0;
      effects.runeStrikeAt = 0;
      effects.runeStrikeX = 0;
      effects.runeStrikeY = 0;
      effects.pressureBoosted.clear();
      effects.bloodFrenzy.clear();
      effects.bossPhaseTriggered.clear();
      effects.processedTelegraphs.clear();
      effects.lastPlayerHp = engine.state.player.hp;

      roomMechanics.roomKey = '';
      roomMechanics.kind = null;
      roomMechanics.nextTriggerAt = 0;
      roomMechanics.warningAt = 0;
      roomMechanics.ritualChargeMs = 0;
      roomMechanics.ritualBroken = false;
      roomMechanics.ritualBuffedIds.clear();
      roomMechanics.graveTriggered = false;

      firstWarden.roomKey = '';
      firstWarden.introShown = false;
      firstWarden.victoryShown = false;

      synergies.processedEffects.clear();
      synergies.lastAttackTime = engine.state.player.lastAttackTime;
      synergies.attackChain = 0;
      synergies.lastDodgeTime = engine.state.player.lastDodgeTime;

      retention.roomKey = `${engine.state.chapter}:${engine.state.floor}`;
      retention.roomClearKey = '';
      retention.processedDeaths.clear();
      retention.huntTargetId = '';
      retention.lastAuraAt = 0;
      retention.pendingRelics.clear();
      if (restartHunt) restoreHuntAfterRestart(engine, retention, restartHunt);
      checkedClearKey = '';
    };

    const update = (time: number) => {
      const engine = getEngineRef.current();
      const dt = Math.min(100, Math.max(0, time - lastFrame));
      lastFrame = time;
      if (engine) {
        const sameRoomRestart = lastMap !== null
          && lastMap !== engine.state.map
          && lastFloor === engine.state.floor
          && lastChapter === engine.state.chapter;
        if (sameRoomRestart) {
          resetRoomScopedSystems(engine, huntSnapshot);
          huntSnapshot = null;
        }
        if (lastMap !== engine.state.map) {
          lastMap = engine.state.map;
          lastFloor = engine.state.floor;
          lastChapter = engine.state.chapter;
        }

        if (engine.state.status === 'playing') {
          const moving = Math.hypot(engine.input.joyX, engine.input.joyY) > 0.08;
          if (moving && !engine.input.dodge && engine.state.player.attackCooldown <= 0 && engine.state.enemies.some(enemy => enemy.hp > 0 && !enemy.isDead)) {
            engine.input.attack = true;
          }

          updateRunBalance(engine, balance);
          updateRunEffectSystems(engine, effects, time);
          updateRunRetentionSystems(engine, retention, time);
          updateRoomMechanics(engine, roomMechanics, time, dt);
          updateRunSynergies(engine, synergies, time);
          updateFirstWardenFinale(engine, firstWarden, time);

          const huntTarget = engine.state.enemies.find(enemy => enemy.id === retention.huntTargetId && enemy.hp > 0 && !enemy.isDead);
          huntSnapshot = captureHunt(huntTarget);
        }
        updateRunRelicEffects(engine, relicEffects, time);
        if (engine.state.roomClearReady) {
          const clearKey = `${engine.state.chapter}:${engine.state.floor}:${engine.state.roomClearAt}`;
          if (checkedClearKey !== clearKey) {
            checkedClearKey = clearKey;
            const reward = rewardMetaRoomClear(engine.state.chapter, engine.state.floor);
            if (reward) window.dispatchEvent(new CustomEvent('dungeon-veil-meta-reward', { detail: reward }));
            void pushCloudSave();
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

  return active ? <><MetaRewardBanner /><RunRetentionOverlay /><FirstWardenOverlay /></> : null;
}
