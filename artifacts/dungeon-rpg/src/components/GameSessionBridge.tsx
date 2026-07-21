import { useEffect, useRef } from 'react';
import { saveEngineSession } from '../game/sessionStore';
import { loadGame } from '../game/saveManager';
import type { GameEngine } from '../game/runEngine';
import { useLanguage } from '../i18n/LanguageContext';
import { buildRunGiftChoices } from '../game/runSkills';
import { installBoundedRunGiftProgression, shouldRestorePendingGift } from '../game/runGiftProgression';
import { installRunFusionEffects } from '../game/runFusionEffects';
import { createRunEffectSystemState, updateRunEffectSystems } from '../game/runEffectSystems';
import { createRunBalanceState, updateRunBalance } from '../game/runBalance';
import { createEquipmentRuntimeBalanceState, updateEquipmentRuntimeBalance } from '../game/equipmentRuntimeBalance';
import { rewardChapterRoomClear } from '../game/chapterRewardContract';
import { dispatchCoopRoomClear } from '../game/coopRunPersistenceOnline';
import { createRunRetentionState, updateRunRetentionSystems } from '../game/runRetention';
import { createRunRelicEffectState, updateRunRelicEffects } from '../game/runRelicEffects';
import { createRoomMechanicState, updateRoomMechanics } from '../game/roomMechanics';
import { installNormalEnemyAttackTelegraphs } from '../game/normalEnemyAttackTelegraphs';
import { installBossAttackTelegraphs } from '../game/bossAttackTelegraphs';
import { createRunSynergyState, updateRunSynergies } from '../game/runSynergies';
import { createFirstWardenFinaleState, updateFirstWardenFinale } from '../game/firstWardenFinale';
import { createEquipmentWorldLootState, disposeEquipmentWorldLoot, spawnRoomEquipmentReward, updateEquipmentWorldLoot } from '../game/equipmentWorldLoot';
import { pushCloudSave } from '../game/cloudSave';
import { isBossRoom } from '../game/chapterRun';
import { loadPlayerProfile, recordPlayerProfileItemFound, recordPlayerProfileRoomClear, recordPlayerProfileSession } from '../game/playerProfile';
import { syncPublicProfileStats } from '../game/socialProgressOnline';
import { currentOnlineSession, onlineSessionEventName } from '../game/supabaseOnline';
import { publishMenuActivity, publishSpectatorState, SPECTATOR_PUBLISH_MS } from '../game/socialSpectatorOnline';
import { MetaRewardBanner } from './MetaRewardBanner';
import { RunRetentionOverlay } from './RunRetentionOverlay';
import { FirstWardenOverlay } from './FirstWardenOverlay';
import { TutorialOverlay } from './TutorialOverlay';
import { CoopBossLootOverlay } from './CoopBossLootOverlay';

const PROFILE_FLUSH_MS = 5_000;
const PUBLIC_PROFILE_SYNC_MS = 15_000;
const PLAYER_HAZARD_EFFECT_PREFIXES = ['rune-warning-', 'rune-impact-', 'forge-warn-', 'forge-hit-', 'arc-warn-', 'arc-charge-', 'arc-fire-', 'arc-source-'];

function restorePendingRoomGift(engine: GameEngine): void {
  const save = loadGame();
  if (!save || !shouldRestorePendingGift(save)) return;
  if (engine.state.status !== 'playing' || engine.state.upgradeChoices.length > 0) return;
  engine.state.upgradeChoices = buildRunGiftChoices(engine.state.runSkills);
  engine.state.status = 'levelup';
  engine.onStateChange({ ...engine.state });
}

function isActiveDuoRun(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.dungeonVeilRunMode === 'duo';
}

function hasLivingEnemies(engine: GameEngine): boolean {
  return engine.state.enemies.some(enemy => enemy.hp > 0 && !enemy.isDead);
}

function clearPostCombatHazards(engine: GameEngine): void {
  engine.state.effects = engine.state.effects.filter(effect => !PLAYER_HAZARD_EFFECT_PREFIXES.some(prefix => effect.id.startsWith(prefix)));
}

export function GameSessionBridge({ getEngine, active }: { getEngine: () => GameEngine | null; active: boolean }) {
  const { language } = useLanguage();
  const getEngineRef = useRef(getEngine);
  const runtimeSystemsReadyRef = useRef(true);
  getEngineRef.current = getEngine;

  useEffect(() => {
    const prepareRuntime = () => {
      runtimeSystemsReadyRef.current = false;
      const engine = getEngineRef.current();
      if (!engine) return;
      engine.input = { joyX: 0, joyY: 0, attack: false, skill: false, dodge: false, interact: false };
    };
    const resumeRuntime = () => {
      runtimeSystemsReadyRef.current = true;
      const engine = getEngineRef.current();
      if (engine) engine.lastTime = performance.now();
    };
    window.addEventListener('dungeon-veil-room-preparing', prepareRuntime);
    window.addEventListener('dungeon-veil-room-ready', resumeRuntime);
    return () => {
      window.removeEventListener('dungeon-veil-room-preparing', prepareRuntime);
      window.removeEventListener('dungeon-veil-room-ready', resumeRuntime);
    };
  }, []);

  useEffect(() => {
    let queued = false;
    const sync = () => {
      if (queued || !currentOnlineSession()) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        void syncPublicProfileStats(loadPlayerProfile()).catch(() => {});
      });
    };
    const sessionEvent = onlineSessionEventName();
    window.addEventListener('dungeon-veil-meta-changed', sync);
    window.addEventListener(sessionEvent, sync);
    sync();
    return () => {
      window.removeEventListener('dungeon-veil-meta-changed', sync);
      window.removeEventListener(sessionEvent, sync);
    };
  }, []);

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
    if (!currentOnlineSession()) return;
    const engine = getEngineRef.current();
    if (!active || !engine) {
      void publishMenuActivity(engine?.state.chapter ?? 1, engine?.state.floor ?? 1).catch(() => {});
      return;
    }

    let stopped = false;
    let publishing = false;
    const publish = async () => {
      if (stopped || publishing) return;
      publishing = true;
      try {
        const current = getEngineRef.current();
        if (current) await publishSpectatorState(current.state);
      } catch {}
      finally { publishing = false; }
    };
    void publish();
    const interval = window.setInterval(() => void publish(), SPECTATOR_PUBLISH_MS);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      const current = getEngineRef.current();
      void publishMenuActivity(current?.state.chapter ?? 1, current?.state.floor ?? 1).catch(() => {});
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const effects = createRunEffectSystemState();
    const balance = createRunBalanceState();
    const equipmentRuntime = createEquipmentRuntimeBalanceState();
    const retention = createRunRetentionState();
    const relicEffects = createRunRelicEffectState();
    const roomMechanics = createRoomMechanicState();
    const synergies = createRunSynergyState();
    const firstWarden = createFirstWardenFinaleState();
    const worldLoot = createEquipmentWorldLootState();
    const initialEngine = getEngineRef.current();
    const disposeGiftProgression = initialEngine ? installBoundedRunGiftProgression(initialEngine) : () => {};
    const disposeFusionEffects = initialEngine ? installRunFusionEffects(initialEngine) : () => {};
    const disposeNormalAttacks = initialEngine ? installNormalEnemyAttackTelegraphs(initialEngine) : () => {};
    const disposeBossAttacks = initialEngine ? installBossAttackTelegraphs(initialEngine) : () => {};
    let frame = 0;
    let checkedClearKey = '';
    let lastFrame = performance.now();
    let lastSystemTick = 0;
    let lastProfileFlush = lastFrame;
    let lastPublicProfileSync = 0;
    let lastKillCount = Math.max(0, getEngineRef.current()?.state.killCount ?? 0);
    let pendingDamage = 0;
    const seenDamageIds = new Set<string>();
    const mobileTick = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

    const collectDamage = (engine: GameEngine) => {
      for (const number of engine.state.damageNumbers) {
        if (seenDamageIds.has(number.id)) continue;
        seenDamageIds.add(number.id);
        const outgoingDamage = number.id.startsWith('dmg-') || number.id.startsWith('burn-');
        if (!outgoingDamage) continue;
        const value = Math.abs(Number(number.value));
        if (Number.isFinite(value) && value > 0) pendingDamage += Math.floor(value);
      }
      if (seenDamageIds.size > 600) {
        const recent = [...seenDamageIds].slice(-240);
        seenDamageIds.clear();
        recent.forEach(id => seenDamageIds.add(id));
      }
    };

    const syncPublicProfile = (time: number, force = false) => {
      if (!currentOnlineSession() || (!force && time - lastPublicProfileSync < PUBLIC_PROFILE_SYNC_MS)) return;
      lastPublicProfileSync = time;
      void syncPublicProfileStats(loadPlayerProfile()).catch(() => {});
    };

    const flushProfile = (time: number, engine: GameEngine) => {
      const currentKills = Math.max(0, engine.state.killCount ?? 0);
      const kills = currentKills >= lastKillCount ? currentKills - lastKillCount : currentKills;
      recordPlayerProfileSession({
        playTimeMs: Math.max(0, time - lastProfileFlush),
        kills,
        damage: pendingDamage,
        chapter: engine.state.chapter,
        room: engine.state.floor,
      });
      lastProfileFlush = time;
      lastKillCount = currentKills;
      pendingDamage = 0;
      syncPublicProfile(time);
    };

    const update = (time: number) => {
      const engine = getEngineRef.current();
      const dt = Math.min(100, Math.max(0, time - lastFrame));
      lastFrame = time;
      if (engine && runtimeSystemsReadyRef.current) {
        collectDamage(engine);
        const interval = mobileTick ? 50 : 33;
        if (time - lastSystemTick >= interval) {
          const systemDt = Math.min(100, Math.max(dt, time - lastSystemTick));
          lastSystemTick = time;
          if (engine.state.status === 'playing') {
            const combatActive = hasLivingEnemies(engine) && !engine.state.roomClearReady;
            updateRunBalance(engine, balance);
            updateRunRetentionSystems(engine, retention, time);
            if (combatActive) updateRunEffectSystems(engine, effects, time);
            else clearPostCombatHazards(engine);
            updateRoomMechanics(engine, roomMechanics, time, systemDt);
            updateRunSynergies(engine, synergies, time);
            updateFirstWardenFinale(engine, firstWarden, time);
          }
          updateEquipmentRuntimeBalance(engine, equipmentRuntime);
          updateRunRelicEffects(engine, relicEffects, time);
          updateEquipmentWorldLoot(engine, worldLoot, time);
        }
        if (engine.state.status === 'playing' && time - lastProfileFlush >= PROFILE_FLUSH_MS) flushProfile(time, engine);
        if (engine.state.roomClearReady) {
          const clearKey = `${engine.state.chapter}:${engine.state.floor}:${engine.state.roomClearAt}`;
          if (checkedClearKey !== clearKey) {
            checkedClearKey = clearKey;
            const duo = isActiveDuoRun();
            const bossRoom = isBossRoom(engine.state.floor);
            if (duo) {
              dispatchCoopRoomClear(engine.state.chapter, engine.state.floor);
            } else {
              const reward = rewardChapterRoomClear(engine.state.chapter, engine.state.floor);
              if (reward) {
                recordPlayerProfileRoomClear(engine.state.chapter, engine.state.floor, bossRoom);
                if (reward.item) recordPlayerProfileItemFound();
                if (reward.item && reward.source && reward.rarity) {
                  spawnRoomEquipmentReward(engine, { item: reward.item, duplicate: Boolean(reward.duplicate), source: reward.source, rarity: reward.rarity });
                }
                window.dispatchEvent(new CustomEvent('dungeon-veil-meta-reward', { detail: reward }));
              }
              syncPublicProfile(time, true);
              void pushCloudSave();
            }
          }
        } else {
          checkedClearKey = '';
        }
      } else if (engine) {
        engine.lastTime = time;
      }
      frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(frame);
      disposeBossAttacks();
      disposeNormalAttacks();
      disposeFusionEffects();
      disposeGiftProgression();
      const engine = getEngineRef.current();
      if (engine) {
        collectDamage(engine);
        flushProfile(performance.now(), engine);
        disposeEquipmentWorldLoot(engine, worldLoot);
      }
    };
  }, [active]);

  return active ? <>
    <MetaRewardBanner />
    <RunRetentionOverlay />
    <FirstWardenOverlay />
    <CoopBossLootOverlay active={active} language={language} getEngine={() => getEngineRef.current()} />
    <TutorialOverlay getEngine={() => getEngineRef.current()} language={language} />
  </> : null;
}
