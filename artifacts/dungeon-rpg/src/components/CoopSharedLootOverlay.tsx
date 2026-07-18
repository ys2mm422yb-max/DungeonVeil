import React, { useEffect, useMemo, useRef, useState } from 'react';
import { currentDuoRunContext } from '../game/coopRunMode';
import {
  applyCoopSharedLootResolution,
  chooseCoopSharedLoot,
  loadCoopSharedLoot,
  localCoopLootChoice,
  openCoopSharedLoot,
  type CoopLootChoice,
  type CoopSharedLootState,
} from '../game/coopSharedLootOnline';
import { EQUIPMENT, type PendingEquipmentDrop } from '../game/metaProgression';
import { currentOnlineSession } from '../game/supabaseOnline';
import { useLanguage } from '../i18n/LanguageContext';

const POLL_MS = 700;
const RESOLVED_VISIBLE_MS = 4_500;

type ProposalDetail = {
  drop: PendingEquipmentDrop;
  chapter: number;
  room: number;
};

function activeRoom(): { chapter: number; room: number } | null {
  if (typeof document === 'undefined') return null;
  const root = document.documentElement;
  const chapter = Math.max(1, Math.floor(Number(root.dataset.dungeonVeilCoopChapter) || 0));
  const room = Math.max(1, Math.min(50, Math.floor(Number(root.dataset.dungeonVeilCoopRoom) || 0)));
  return chapter > 0 && room > 0 ? { chapter, room } : null;
}

function remainingSeconds(state: CoopSharedLootState): number {
  const resolveAt = Date.parse(state.resolve_after);
  const serverNow = Date.parse(state.server_now);
  if (!Number.isFinite(resolveAt)) return 0;
  const offset = Number.isFinite(serverNow) ? Date.now() - serverNow : 0;
  return Math.max(0, Math.ceil((resolveAt - (Date.now() - offset)) / 1000));
}

export function CoopSharedLootOverlay() {
  const { language } = useLanguage();
  const de = language === 'de';
  const [loot, setLoot] = useState<CoopSharedLootState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const appliedKeyRef = useRef('');
  const hiddenKeyRef = useRef('');
  const localUserId = currentOnlineSession()?.user?.id ?? '';

  const stateKey = loot
    ? `${loot.lobby_id}:${loot.run_seed}:${loot.chapter}:${loot.room}:${loot.status}`
    : '';
  const item = loot ? EQUIPMENT[loot.item_id] : null;
  const myChoice = loot ? localCoopLootChoice(loot) : null;
  const claimCount = loot ? Object.values(loot.choices).filter(choice => choice === 'claim').length : 0;
  const passCount = loot ? Object.values(loot.choices).filter(choice => choice === 'pass').length : 0;

  const outcome = useMemo(() => {
    if (!loot || loot.status !== 'resolved') return '';
    if (loot.winner_user_id === localUserId) return de ? 'DU ERHÄLTST DIE BEUTE' : 'YOU RECEIVE THE LOOT';
    if (loot.loser_user_id === localUserId) return de ? `WÜRFELRUNDE VERLOREN · +${loot.compensation_dust} STAUB` : `ROLL LOST · +${loot.compensation_dust} DUST`;
    if (!loot.winner_user_id) return de ? 'BEIDE HABEN GEPASST' : 'BOTH PLAYERS PASSED';
    return de ? 'DEIN MITSTREITER ERHÄLT DIE BEUTE' : 'YOUR TEAMMATE RECEIVES THE LOOT';
  }, [de, localUserId, loot]);

  useEffect(() => {
    const onProposal = (event: Event) => {
      const context = currentDuoRunContext();
      const detail = (event as CustomEvent<ProposalDetail>).detail;
      if (!context || context.role !== 'host' || !detail?.drop?.item) return;
      setError('');
      void openCoopSharedLoot(context, detail.chapter, detail.room, detail.drop)
        .then(next => {
          hiddenKeyRef.current = '';
          setLoot(next);
        })
        .catch(reason => setError(reason instanceof Error ? reason.message : String(reason)));
    };
    window.addEventListener('dungeon-veil-duo-loot-proposal', onProposal as EventListener);
    return () => window.removeEventListener('dungeon-veil-duo-loot-proposal', onProposal as EventListener);
  }, []);

  useEffect(() => {
    let stopped = false;
    let polling = false;
    const poll = async () => {
      const context = currentDuoRunContext();
      const room = activeRoom();
      if (stopped || polling || !context || !room || !currentOnlineSession()) return;
      polling = true;
      try {
        const next = await loadCoopSharedLoot(context, room.chapter, room.room);
        if (!stopped && next) {
          const key = `${next.lobby_id}:${next.run_seed}:${next.chapter}:${next.room}:${next.status}`;
          if (hiddenKeyRef.current !== key) setLoot(next);
        }
      } catch {
        // A short network interruption must not dismiss an already visible vote.
      } finally {
        polling = false;
      }
    };
    void poll();
    const interval = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (loot?.status === 'open') document.documentElement.dataset.dungeonVeilCoopLootPending = '1';
    else delete document.documentElement.dataset.dungeonVeilCoopLootPending;
    return () => { delete document.documentElement.dataset.dungeonVeilCoopLootPending; };
  }, [loot?.status, loot?.chapter, loot?.room]);

  useEffect(() => {
    if (!loot) return;
    setSeconds(remainingSeconds(loot));
    const interval = window.setInterval(() => setSeconds(remainingSeconds(loot)), 250);
    return () => window.clearInterval(interval);
  }, [stateKey]);

  useEffect(() => {
    if (!loot || loot.status !== 'resolved') return;
    const resolutionKey = `${loot.lobby_id}:${loot.run_seed}:${loot.chapter}:${loot.room}`;
    if (appliedKeyRef.current !== resolutionKey) {
      appliedKeyRef.current = resolutionKey;
      applyCoopSharedLootResolution(loot);
    }
    const timer = window.setTimeout(() => {
      hiddenKeyRef.current = stateKey;
      setLoot(current => current === loot ? null : current);
    }, RESOLVED_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [loot, stateKey]);

  const choose = async (choice: CoopLootChoice) => {
    const context = currentDuoRunContext();
    if (!context || !loot || loot.status !== 'open' || busy) return;
    setBusy(true);
    setError('');
    try {
      setLoot(await chooseCoopSharedLoot(context, loot.chapter, loot.room, choice));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  if (!loot || !item) return error ? <div data-testid="coop-loot-error" className="pointer-events-none fixed left-1/2 top-[18%] z-[85] w-[min(88vw,390px)] -translate-x-1/2 rounded-xl border border-red-300/20 bg-black/88 px-4 py-3 text-center text-[8px] font-black uppercase tracking-[.12em] text-red-100">{error}</div> : null;

  return <div data-testid="coop-shared-loot" data-status={loot.status} className="pointer-events-auto fixed inset-0 z-[88] flex items-center justify-center bg-black/58 px-4 backdrop-blur-[2px]">
    <div className="w-[min(92vw,430px)] overflow-hidden rounded-3xl border border-amber-200/28 bg-[linear-gradient(150deg,rgba(35,22,10,.98),rgba(8,9,12,.98))] p-5 text-white shadow-[0_24px_90px_rgba(0,0,0,.72)]">
      <div className="text-center text-[7px] font-black uppercase tracking-[.28em] text-amber-100/48">{de ? 'GEMEINSAME BEUTE' : 'SHARED LOOT'} · {loot.chapter}-{loot.room}</div>
      <div className="mx-auto mt-4 grid h-20 w-20 place-items-center rounded-2xl border border-white/12 bg-black/45 text-4xl shadow-inner" style={{ color: item.accent }}>{item.icon}</div>
      <div className="mt-3 text-center font-serif text-2xl" style={{ color: item.accent }}>{de ? item.nameDe : item.nameEn}</div>
      <div className="mt-1 text-center text-[8px] font-black uppercase tracking-[.16em] text-white/38">{item.rarity} · {item.dropSource}</div>

      {loot.status === 'open' ? <>
        <div className="mt-4 rounded-2xl border border-white/8 bg-white/[.035] px-3 py-2 text-center text-[8px] font-black uppercase tracking-[.12em] text-white/58">
          {myChoice ? (myChoice === 'claim' ? (de ? 'DU BEANSPRUCHST DIE BEUTE' : 'YOU CLAIMED THE LOOT') : (de ? 'DU HAST GEPASST' : 'YOU PASSED')) : (de ? 'BEANSPRUCHEN ODER PASSEN' : 'CLAIM OR PASS')} · {seconds}s
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button type="button" data-testid="coop-loot-pass" disabled={busy || Boolean(myChoice)} onClick={() => void choose('pass')} className="min-h-12 rounded-xl border border-white/12 bg-white/[.05] px-3 py-3 text-[9px] font-black uppercase tracking-[.15em] text-white/65 disabled:opacity-30">{de ? 'PASSEN' : 'PASS'}</button>
          <button type="button" data-testid="coop-loot-claim" disabled={busy || Boolean(myChoice)} onClick={() => void choose('claim')} className="min-h-12 rounded-xl border border-amber-200/35 bg-amber-400/14 px-3 py-3 text-[9px] font-black uppercase tracking-[.15em] text-amber-50 disabled:opacity-30">{de ? 'BEANSPRUCHEN' : 'CLAIM'}</button>
        </div>
        <div className="mt-3 text-center text-[7px] uppercase tracking-[.1em] text-white/30">{claimCount} {de ? 'Anspruch' : 'claim'} · {passCount} {de ? 'Pass' : 'pass'} · {de ? 'Bei zwei Ansprüchen würfelt der Server' : 'The server rolls when both claim'}</div>
      </> : <div data-testid="coop-loot-result" className="mt-5 rounded-2xl border border-emerald-200/18 bg-emerald-400/[.07] px-4 py-4 text-center text-[10px] font-black uppercase tracking-[.14em] text-emerald-100">{outcome}</div>}

      {error && <div className="mt-3 rounded-xl border border-red-300/20 bg-red-400/[.06] px-3 py-2 text-center text-[8px] text-red-100">{error}</div>}
    </div>
  </div>;
}
