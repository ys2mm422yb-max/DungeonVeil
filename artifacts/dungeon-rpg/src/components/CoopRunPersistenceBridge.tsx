import { useEffect, useRef, useState } from 'react';
import type { GameEngine } from '../game/runEngine';
import type { DuoRunContext } from '../game/coopRunMode';
import { isBossRoom } from '../game/chapterRun';
import { chapterRoomRewardAmounts, rewardChapterRoomClear } from '../game/chapterRewardContract';
import { recordPlayerProfileRoomClear } from '../game/playerProfile';
import { pushCloudSave } from '../game/cloudSave';
import { dispatchCoopBossLootOpen } from '../game/coopBossLootOnline';
import {
  acknowledgeCoopRoomReward,
  COOP_CHECKPOINT_MS,
  COOP_ROOM_CLEAR_EVENT,
  COOP_RUN_RESTART_EVENT,
  listMyPendingCoopRoomRewards,
  prepareCoopRoomRewards,
  saveMyCoopRunCheckpoint,
  type CoopRoomClearDetail,
  type CoopRoomRewardEntitlement,
} from '../game/coopRunPersistenceOnline';

const REWARD_POLL_MS = 900;
const APPLIED_REWARDS_KEY = 'dungeon-veil-coop-room-entitlements-applied-v1';

type Props = {
  active: boolean;
  context: DuoRunContext | null;
  getEngine: () => GameEngine | null;
  language: 'de' | 'en';
};

type PersistenceState = 'idle' | 'saving' | 'saved' | 'error';

function readAppliedRewards(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(APPLIED_REWARDS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean).slice(-600) : [];
  } catch {
    return [];
  }
}

function rewardWasApplied(id: string): boolean {
  return readAppliedRewards().includes(id);
}

function markRewardApplied(id: string): void {
  const next = [...new Set([...readAppliedRewards(), id])].slice(-600);
  try { localStorage.setItem(APPLIED_REWARDS_KEY, JSON.stringify(next)); } catch {}
}

function expectedDuoAmounts(chapter: number, room: number) {
  const base = chapterRoomRewardAmounts(chapter, room);
  return {
    xp: base.xp,
    dust: Math.round(base.dust * 1.25),
    gold: Math.round(base.gold * 1.25),
  };
}

export function CoopRunPersistenceBridge({ active, context, getEngine, language }: Props) {
  const getEngineRef = useRef(getEngine);
  const originalCanExitRef = useRef<GameEngine['canExitRoom'] | null>(null);
  const guardedEngineRef = useRef<GameEngine | null>(null);
  const clearRef = useRef<CoopRoomClearDetail | null>(null);
  const preparingRef = useRef(false);
  const applyingRef = useRef(new Set<string>());
  const [state, setState] = useState<PersistenceState>('idle');
  const [pendingRewards, setPendingRewards] = useState(0);
  const [error, setError] = useState('');
  getEngineRef.current = getEngine;

  const restoreExit = () => {
    if (guardedEngineRef.current && originalCanExitRef.current) {
      guardedEngineRef.current.canExitRoom = originalCanExitRef.current;
    }
    guardedEngineRef.current = null;
    originalCanExitRef.current = null;
  };

  const installExitGuard = () => {
    const engine = getEngineRef.current();
    if (!engine || guardedEngineRef.current === engine) return;
    restoreExit();
    guardedEngineRef.current = engine;
    originalCanExitRef.current = engine.canExitRoom;
    engine.canExitRoom = () => {
      const original = originalCanExitRef.current;
      if (!original || !original.call(engine)) return false;
      return clearRef.current === null && applyingRef.current.size === 0;
    };
  };

  const saveCheckpoint = async (roomClear?: boolean) => {
    if (!active || !context) return;
    const engine = getEngineRef.current();
    if (!engine) return;
    setState('saving');
    try {
      await saveMyCoopRunCheckpoint(context.lobbyId, context.runSeed, engine, roomClear ?? engine.state.roomClearReady);
      setState('saved');
      setError('');
    } catch (saveError) {
      setState('error');
      setError(saveError instanceof Error ? saveError.message : 'Duo-Zwischenstand konnte nicht gespeichert werden.');
      throw saveError;
    }
  };

  const prepareCurrentReward = async () => {
    if (!context || !clearRef.current || preparingRef.current) return;
    preparingRef.current = true;
    const clear = clearRef.current;
    try {
      await saveCheckpoint(true);
      await prepareCoopRoomRewards(context.lobbyId, context.runSeed, clear.chapter, clear.room);
      setError('');
    } catch (prepareError) {
      setError(prepareError instanceof Error ? prepareError.message : 'Duo-Belohnung wartet auf den Host-Zwischenstand.');
    } finally {
      preparingRef.current = false;
    }
  };

  const applyEntitlement = async (reward: CoopRoomRewardEntitlement) => {
    if (!context || applyingRef.current.has(reward.entitlement_id)) return;
    applyingRef.current.add(reward.entitlement_id);
    try {
      const expected = expectedDuoAmounts(reward.chapter, reward.room);
      if (expected.xp !== reward.xp || expected.dust !== reward.dust || expected.gold !== reward.gold) {
        throw new Error('Duo-Belohnungsvertrag stimmt nicht mit dem Server überein.');
      }

      if (!rewardWasApplied(reward.entitlement_id)) {
        const localReward = rewardChapterRoomClear(reward.chapter, reward.room, {
          currencyMultiplier: 1.25,
          rewardRunId: `coop-entitlement-${reward.entitlement_id}`,
          skipEquipmentDrop: true,
        });
        if (localReward) {
          recordPlayerProfileRoomClear(reward.chapter, reward.room, isBossRoom(reward.room));
          window.dispatchEvent(new CustomEvent('dungeon-veil-meta-reward', { detail: localReward }));
        }
        markRewardApplied(reward.entitlement_id);
        await pushCloudSave();
      }

      await acknowledgeCoopRoomReward(reward.entitlement_id);
      if (isBossRoom(reward.room)) dispatchCoopBossLootOpen(reward.chapter, reward.room);

      const clear = clearRef.current;
      if (clear && clear.chapter === reward.chapter && clear.room === reward.room) clearRef.current = null;
      setError('');
    } finally {
      applyingRef.current.delete(reward.entitlement_id);
    }
  };

  useEffect(() => {
    if (!active || !context) {
      clearRef.current = null;
      preparingRef.current = false;
      applyingRef.current.clear();
      setPendingRewards(0);
      setState('idle');
      setError('');
      restoreExit();
      return;
    }

    installExitGuard();
    const onClear = (event: Event) => {
      const detail = (event as CustomEvent<CoopRoomClearDetail>).detail;
      clearRef.current = {
        chapter: Math.max(1, Math.floor(Number(detail?.chapter) || 1)),
        room: Math.max(1, Math.min(50, Math.floor(Number(detail?.room) || 1))),
      };
      const engine = getEngineRef.current();
      if (engine) {
        engine.input.joyX = 0;
        engine.input.joyY = 0;
        engine.input.attack = false;
        engine.input.skill = false;
        engine.input.dodge = false;
        engine.input.interact = false;
      }
      void prepareCurrentReward();
    };
    const onRestart = () => {
      clearRef.current = null;
      preparingRef.current = false;
      applyingRef.current.clear();
      setPendingRewards(0);
      setError('');
      void saveCheckpoint(false).catch(() => {});
    };

    window.addEventListener(COOP_ROOM_CLEAR_EVENT, onClear);
    window.addEventListener(COOP_RUN_RESTART_EVENT, onRestart);
    const checkpointInterval = window.setInterval(() => { void saveCheckpoint().catch(() => {}); }, COOP_CHECKPOINT_MS);
    const pageHide = () => { void saveCheckpoint().catch(() => {}); };
    window.addEventListener('pagehide', pageHide);
    void saveCheckpoint().catch(() => {});

    return () => {
      window.clearInterval(checkpointInterval);
      window.removeEventListener('pagehide', pageHide);
      window.removeEventListener(COOP_ROOM_CLEAR_EVENT, onClear);
      window.removeEventListener(COOP_RUN_RESTART_EVENT, onRestart);
      restoreExit();
    };
  }, [active, context?.lobbyId, context?.runSeed]);

  useEffect(() => {
    if (!active || !context) return;
    let stopped = false;
    let timer = 0;

    const poll = async () => {
      try {
        if (clearRef.current) await prepareCurrentReward();
        const rewards = await listMyPendingCoopRoomRewards(context.lobbyId, context.runSeed);
        if (stopped) return;
        setPendingRewards(rewards.length);
        for (const reward of rewards) {
          if (stopped) break;
          await applyEntitlement(reward);
        }
        if (!stopped) setPendingRewards(0);
      } catch (pollError) {
        if (!stopped) setError(pollError instanceof Error ? pollError.message : 'Duo-Fortschritt konnte nicht abgeglichen werden.');
      } finally {
        if (!stopped) timer = window.setTimeout(() => void poll(), REWARD_POLL_MS);
      }
    };

    void poll();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [active, context?.lobbyId, context?.runSeed]);

  useEffect(() => () => restoreExit(), []);

  if (!active || !context) return null;
  const de = language === 'de';
  const visible = Boolean(error || pendingRewards > 0 || state === 'saving');
  if (!visible) return null;

  return <div data-testid="coop-persistence-status" data-state={state} className="pointer-events-none absolute left-1/2 top-[max(42px,calc(env(safe-area-inset-top)+36px))] z-[74] w-[min(88vw,390px)] -translate-x-1/2 rounded-2xl border border-cyan-200/18 bg-black/78 px-4 py-3 text-center shadow-2xl backdrop-blur-md">
    <div className="text-[7px] font-black uppercase tracking-[.2em] text-cyan-100/72">
      {error
        ? (de ? 'DUO-ABGLEICH WIRD WIEDERHOLT' : 'RETRYING DUO SYNC')
        : pendingRewards > 0
          ? (de ? 'BELOHNUNG WIRD GESICHERT' : 'SECURING REWARD')
          : (de ? 'DUO-ZWISCHENSTAND WIRD GESPEICHERT' : 'SAVING DUO CHECKPOINT')}
    </div>
    {error && <div className="mt-1 text-[7px] leading-relaxed text-amber-100/62">{error}</div>}
  </div>;
}
