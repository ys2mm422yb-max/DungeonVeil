import { useEffect, useRef, useState } from 'react';
import type { GameEngine } from '../game/runEngine';
import { getMyCoopLobby } from '../game/coopLobbyOnline';
import { collectBalancedEquipmentDrop } from '../game/equipmentCollection';
import { EQUIPMENT, loadMetaProgression, saveMetaProgression } from '../game/metaProgression';
import { recordPlayerProfileItemFound } from '../game/playerProfile';
import { pushCloudSave } from '../game/cloudSave';
import {
  chooseCoopBossLoot,
  COOP_BOSS_LOOT_OPEN_EVENT,
  COOP_BOSS_LOOT_PENDING_DATASET,
  getCoopBossLoot,
  openCoopBossLoot,
  type CoopBossLootChoice,
  type CoopBossLootOpenDetail,
  type CoopBossLootSnapshot,
} from '../game/coopBossLootOnline';

const POLL_MS = 700;
const APPLIED_LEDGER_KEY = 'dungeon-veil-coop-boss-loot-applied-v1';

type Props = {
  active: boolean;
  language: 'de' | 'en';
  getEngine: () => GameEngine | null;
};

type Trigger = CoopBossLootOpenDetail & { key: string };

function readAppliedLedger(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(APPLIED_LEDGER_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean).slice(-240) : [];
  } catch {
    return [];
  }
}

function markApplied(rollId: string): void {
  const next = [...new Set([...readAppliedLedger(), rollId])].slice(-240);
  try { localStorage.setItem(APPLIED_LEDGER_KEY, JSON.stringify(next)); } catch {}
}

function alreadyApplied(rollId: string): boolean {
  return readAppliedLedger().includes(rollId);
}

function grantConsolationDust(amount: number): void {
  const safe = Math.max(0, Math.floor(Number(amount) || 0));
  if (!safe) return;
  const meta = loadMetaProgression();
  meta.dust += safe;
  saveMetaProgression(meta);
}

export function CoopBossLootOverlay({ active, language, getEngine }: Props) {
  const getEngineRef = useRef(getEngine);
  const originalCanExitRef = useRef<GameEngine['canExitRoom'] | null>(null);
  const guardedEngineRef = useRef<GameEngine | null>(null);
  const applyingRef = useRef(new Set<string>());
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [snapshot, setSnapshot] = useState<CoopBossLootSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [retryNonce, setRetryNonce] = useState(0);
  getEngineRef.current = getEngine;

  const restoreExit = () => {
    const engine = guardedEngineRef.current;
    const original = originalCanExitRef.current;
    if (engine && original) engine.canExitRoom = original;
    guardedEngineRef.current = null;
    originalCanExitRef.current = null;
    if (typeof document !== 'undefined') delete document.documentElement.dataset[COOP_BOSS_LOOT_PENDING_DATASET];
  };

  const blockExit = () => {
    const engine = getEngineRef.current();
    if (!engine) return;
    if (guardedEngineRef.current !== engine) {
      restoreExit();
      guardedEngineRef.current = engine;
      originalCanExitRef.current = engine.canExitRoom;
      engine.canExitRoom = () => false;
    }
    engine.input.joyX = 0;
    engine.input.joyY = 0;
    engine.input.attack = false;
    engine.input.skill = false;
    engine.input.dodge = false;
    engine.input.interact = false;
    if (typeof document !== 'undefined') document.documentElement.dataset[COOP_BOSS_LOOT_PENDING_DATASET] = '1';
  };

  const acceptSnapshot = (result: CoopBossLootSnapshot) => {
    setSnapshot(result);
    setServerOffsetMs(Date.parse(result.server_now) - Date.now());
  };

  useEffect(() => {
    const open = (event: Event) => {
      if (!active) return;
      const detail = (event as CustomEvent<CoopBossLootOpenDetail>).detail;
      const chapter = Math.max(1, Math.floor(Number(detail?.chapter) || 1));
      const room = Math.max(1, Math.floor(Number(detail?.room) || 1));
      blockExit();
      setSnapshot(null);
      setError('');
      setTrigger({ chapter, room, key: `${chapter}:${room}:${Date.now()}` });
    };
    window.addEventListener(COOP_BOSS_LOOT_OPEN_EVENT, open);
    return () => window.removeEventListener(COOP_BOSS_LOOT_OPEN_EVENT, open);
  }, [active]);

  useEffect(() => {
    if (!active && trigger) {
      restoreExit();
      setTrigger(null);
      setSnapshot(null);
    }
  }, [active, trigger]);

  useEffect(() => () => restoreExit(), []);

  useEffect(() => {
    if (!trigger) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [trigger]);

  useEffect(() => {
    if (!trigger || !active) return;
    let stopped = false;
    let timer = 0;

    const applyOutcome = async (result: CoopBossLootSnapshot) => {
      if (result.status !== 'resolved' || alreadyApplied(result.roll_id) || applyingRef.current.has(result.roll_id)) return;
      applyingRef.current.add(result.roll_id);
      try {
        const definition = EQUIPMENT[result.item_id];
        if (result.my_item_won && definition) {
          const collected = collectBalancedEquipmentDrop(result.item_id);
          recordPlayerProfileItemFound();
          window.dispatchEvent(new CustomEvent('dungeon-veil-equipment-picked', {
            detail: {
              item: result.item_id,
              duplicate: collected.duplicate,
              copies: collected.progress.copies,
              level: collected.progress.level,
              convertedDust: collected.convertedDust,
            },
          }));
          window.dispatchEvent(new CustomEvent('dungeon-veil-meta-reward', {
            detail: {
              xp: 0,
              dust: collected.convertedDust,
              gold: 0,
              item: result.item_id,
              duplicate: collected.duplicate,
              source: result.source,
              rarity: result.rarity,
            },
          }));
        } else if (result.my_consolation_dust > 0) {
          grantConsolationDust(result.my_consolation_dust);
          window.dispatchEvent(new CustomEvent('dungeon-veil-meta-reward', {
            detail: { xp: 0, dust: result.my_consolation_dust, gold: 0 },
          }));
        }
        markApplied(result.roll_id);
        await pushCloudSave();
      } finally {
        applyingRef.current.delete(result.roll_id);
      }
    };

    const sync = async () => {
      try {
        const lobby = await getMyCoopLobby();
        if (!lobby || lobby.status !== 'in_run') throw new Error('Aktive Duo-Lobby nicht gefunden.');
        let result = await getCoopBossLoot(lobby.lobby_id, lobby.run_seed, trigger.chapter, trigger.room);
        if (!result && lobby.role === 'host') {
          result = await openCoopBossLoot(lobby.lobby_id, lobby.run_seed, trigger.chapter, trigger.room);
        }
        if (!stopped && result) {
          acceptSnapshot(result);
          setError('');
          await applyOutcome(result);
        }
      } catch (syncError) {
        if (!stopped) setError(syncError instanceof Error ? syncError.message : 'Duo-Beute konnte nicht geladen werden.');
      } finally {
        if (!stopped) timer = window.setTimeout(() => void sync(), POLL_MS);
      }
    };

    void sync();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [active, retryNonce, trigger?.key]);

  if (!active || !trigger) return null;

  const de = language === 'de';
  const definition = snapshot ? EQUIPMENT[snapshot.item_id] : null;
  const remainingMs = snapshot ? Math.max(0, Date.parse(snapshot.expires_at) - (now + serverOffsetMs)) : 0;
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const resolved = snapshot?.status === 'resolved';
  const myChoice = snapshot?.my_choice ?? null;
  const waitingForPeer = Boolean(snapshot && !resolved && snapshot.choice_count < snapshot.member_count);

  const choose = async (choice: CoopBossLootChoice) => {
    if (!snapshot || resolved || busy || myChoice) return;
    setBusy(true);
    setError('');
    try {
      const result = await chooseCoopBossLoot(snapshot.roll_id, choice);
      acceptSnapshot(result);
    } catch (choiceError) {
      setError(choiceError instanceof Error ? choiceError.message : 'Auswahl konnte nicht gespeichert werden.');
    } finally {
      setBusy(false);
    }
  };

  const finish = () => {
    if (!resolved) return;
    restoreExit();
    setTrigger(null);
    setSnapshot(null);
    setError('');
  };

  let outcome = '';
  if (snapshot?.status === 'resolved') {
    if (snapshot.my_item_won) outcome = de ? 'DU HAST DIE AUSRÜSTUNG ERHALTEN' : 'YOU WON THE EQUIPMENT';
    else if (snapshot.my_consolation_dust > 0) outcome = de ? `KNAPP VERLOREN · +${snapshot.my_consolation_dust} SCHLEIERSTAUB` : `LOST THE ROLL · +${snapshot.my_consolation_dust} VEIL DUST`;
    else if (snapshot.winner_user_id) outcome = de ? 'DEIN MITSTREITER ERHÄLT DIE AUSRÜSTUNG' : 'YOUR TEAMMATE RECEIVES THE EQUIPMENT';
    else outcome = de ? 'BEIDE HABEN GEPASST' : 'BOTH PLAYERS PASSED';
  }

  return <div data-testid="coop-boss-loot-overlay" className="pointer-events-auto absolute inset-0 z-[96] flex items-center justify-center bg-black/82 px-4 backdrop-blur-md">
    <div className="w-[min(92vw,430px)] rounded-3xl border border-amber-200/25 bg-[#151018]/98 p-6 text-center shadow-[0_24px_90px_rgba(0,0,0,.72)]">
      <div className="text-[8px] font-black uppercase tracking-[.3em] text-amber-200/55">DUO-BOSSBEUTE · SHARED BOSS LOOT</div>
      <div className="mt-2 font-serif text-2xl text-amber-50">{definition ? (de ? definition.nameDe : definition.nameEn) : (de ? 'BEUTE WIRD BESTIMMT' : 'PREPARING LOOT')}</div>
      {definition && <div className="mt-2 text-[9px] leading-relaxed text-white/58">{de ? definition.descriptionDe : definition.descriptionEn}</div>}

      {!snapshot && !error && <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-[9px] font-black uppercase tracking-[.16em] text-white/60">{de ? 'SERVER BESTIMMT DEN GEMEINSAMEN DROP…' : 'SERVER IS SELECTING THE SHARED DROP…'}</div>}

      {snapshot && !resolved && <>
        <div className="mt-5 grid grid-cols-2 gap-3 text-left">
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
            <div className="text-[7px] font-black uppercase tracking-[.15em] text-white/35">{de ? 'ENTSCHEIDUNGEN' : 'CHOICES'}</div>
            <div className="mt-1 text-sm font-black text-white/85">{snapshot.choice_count}/{snapshot.member_count}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
            <div className="text-[7px] font-black uppercase tracking-[.15em] text-white/35">{de ? 'RESTZEIT' : 'TIME LEFT'}</div>
            <div className="mt-1 text-sm font-black text-amber-100">{remainingSeconds}s</div>
          </div>
        </div>
        {!myChoice ? <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" data-testid="coop-loot-claim" disabled={busy || remainingSeconds <= 0} onClick={() => void choose('claim')} className="min-h-14 rounded-2xl border border-emerald-200/35 bg-emerald-400/16 px-3 text-[9px] font-black uppercase tracking-[.18em] text-emerald-50 disabled:opacity-40">{de ? 'BEANSPRUCHEN' : 'CLAIM'}</button>
          <button type="button" data-testid="coop-loot-pass" disabled={busy || remainingSeconds <= 0} onClick={() => void choose('pass')} className="min-h-14 rounded-2xl border border-white/15 bg-white/6 px-3 text-[9px] font-black uppercase tracking-[.18em] text-white/70 disabled:opacity-40">{de ? 'PASSEN' : 'PASS'}</button>
        </div> : <div className="mt-5 rounded-2xl border border-cyan-200/18 bg-cyan-400/8 px-4 py-4 text-[9px] font-black uppercase tracking-[.17em] text-cyan-50/78">{myChoice === 'claim' ? (de ? 'BEANSPRUCHT · WARTE AUF MITSTREITER' : 'CLAIMED · WAITING FOR TEAMMATE') : (de ? 'GEPASST · WARTE AUF MITSTREITER' : 'PASSED · WAITING FOR TEAMMATE')}</div>}
        {waitingForPeer && <div className="mt-3 text-[8px] uppercase tracking-[.12em] text-white/35">{de ? 'Bei Ablauf wird eine fehlende Auswahl automatisch als Passen gewertet.' : 'At timeout, a missing choice is treated as pass.'}</div>}
      </>}

      {resolved && <>
        <div data-testid="coop-loot-outcome" className="mt-6 rounded-2xl border border-amber-200/22 bg-amber-300/10 px-4 py-5 text-[10px] font-black uppercase tracking-[.16em] text-amber-50">{outcome}</div>
        <button type="button" data-testid="coop-loot-continue" onClick={finish} className="mt-5 min-h-13 w-full rounded-2xl border border-amber-200/30 bg-amber-300/15 px-4 text-[9px] font-black uppercase tracking-[.2em] text-amber-50">{de ? 'WEITER' : 'CONTINUE'}</button>
      </>}

      {error && <div className="mt-4 rounded-xl border border-red-300/20 bg-red-500/10 px-3 py-3 text-[8px] font-bold leading-relaxed text-red-100/80">{error}<button type="button" onClick={() => setRetryNonce(value => value + 1)} className="ml-2 underline">{de ? 'ERNEUT VERSUCHEN' : 'RETRY'}</button></div>}
    </div>
  </div>;
}
