import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { GameEngine } from '../game/runEngine';
import type { DuoRunContext } from '../game/coopRunMode';
import { isBossRoom } from '../game/chapterRun';
import { planSharedBossEquipmentReward } from '../game/equipmentDropContract';
import { EQUIPMENT, type PendingEquipmentDrop } from '../game/metaProgression';
import { equipmentPresentation } from '../game/equipmentPresentation';
import {
  createOrLoadCoopSharedLoot,
  loadCoopSharedLoot,
  submitCoopLootChoice,
  type CoopLootChoice,
  type CoopSharedLootSnapshot,
} from '../game/coopSharedLootOnline';
import { collectBalancedEquipmentDropOnce, grantMetaDustOnce } from '../game/equipmentCollection';
import { grantEquipmentSourceMarkOnce } from '../game/equipmentTargeting';
import { currentOnlineSession } from '../game/supabaseOnline';
import { pushCloudSave } from '../game/cloudSave';
import { recordPlayerProfileItemFound } from '../game/playerProfile';
import { useLanguage } from '../i18n/LanguageContext';

const POLL_MS = 700;
const RESULT_HOLD_MS = 3000;

function setExitBlocked(blocked: boolean): void {
  if (typeof document === 'undefined') return;
  if (blocked) document.documentElement.dataset.dungeonVeilCoopLootPending = '1';
  else delete document.documentElement.dataset.dungeonVeilCoopLootPending;
}

function secondsRemaining(snapshot: CoopSharedLootSnapshot, now: number): number {
  const serverOffset = Date.parse(snapshot.server_now) - Date.now();
  return Math.max(0, Math.ceil((Date.parse(snapshot.deadline_at) - (now + serverOffset)) / 1000));
}

export function CoopSharedLootBridge({
  active,
  context,
  getEngine,
}: {
  active: boolean;
  context: DuoRunContext | null;
  getEngine: () => GameEngine | null;
}) {
  const { language } = useLanguage();
  const de = language === 'de';
  const [snapshot, setSnapshot] = useState<CoopSharedLootSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const plannedByRoom = useRef(new Map<string, PendingEquipmentDrop | null>());
  const dismissedDrops = useRef(new Set<string>());
  const appliedDrops = useRef(new Set<string>());
  const markedDrops = useRef(new Set<string>());
  const resultTimer = useRef(0);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!active || !context) {
      setSnapshot(null);
      setExitBlocked(false);
      return;
    }

    let stopped = false;
    let polling = false;

    const applyResolvedReward = async (drop: CoopSharedLootSnapshot) => {
      if (appliedDrops.current.has(drop.drop_id)) return;
      appliedDrops.current.add(drop.drop_id);
      const userId = currentOnlineSession()?.user.id ?? '';
      const won = Boolean(userId && drop.winner_user_id === userId);
      const contestedLoss = drop.resolution === 'contested' && drop.my_choice === 'claim' && !won;
      const sharedSalvage = drop.resolution === 'all_pass' || drop.resolution === 'timeout';

      if (won) {
        const reward = collectBalancedEquipmentDropOnce(drop.equipment_id, `coop-loot:${drop.drop_id}:item`);
        if (reward.applied) {
          recordPlayerProfileItemFound();
          window.dispatchEvent(new CustomEvent('dungeon-veil-equipment-picked', {
            detail: {
              item: drop.equipment_id,
              duplicate: reward.duplicate,
              copies: reward.copies,
              level: reward.level,
              convertedDust: reward.convertedDust,
            },
          }));
        }
      } else if (contestedLoss) {
        grantMetaDustOnce(drop.compensation_dust, `coop-loot:${drop.drop_id}:compensation`);
      } else if (sharedSalvage) {
        grantMetaDustOnce(drop.salvage_dust, `coop-loot:${drop.drop_id}:salvage`);
      }
      await pushCloudSave().catch(() => false);
    };

    const poll = async () => {
      if (stopped || polling) return;
      const engine = getEngine();
      if (!engine || !engine.state.roomClearReady || !isBossRoom(engine.state.floor)) {
        setSnapshot(null);
        setExitBlocked(false);
        return;
      }

      polling = true;
      const chapter = engine.state.chapter;
      const room = engine.state.floor;
      const roomKey = `${context.lobbyId}:${context.runSeed}:${chapter}:${room}`;
      try {
        let next = await loadCoopSharedLoot(context, chapter, room);
        if (!next && context.role === 'host') {
          if (!plannedByRoom.current.has(roomKey)) {
            plannedByRoom.current.set(roomKey, planSharedBossEquipmentReward(chapter, room));
          }
          const planned = plannedByRoom.current.get(roomKey);
          if (planned) next = await createOrLoadCoopSharedLoot(context, chapter, room, planned);
        }

        if (!next || dismissedDrops.current.has(next.drop_id)) {
          setSnapshot(null);
          setExitBlocked(false);
          return;
        }

        if (!markedDrops.current.has(next.drop_id)) {
          markedDrops.current.add(next.drop_id);
          grantEquipmentSourceMarkOnce(next.source, `coop-loot:${next.drop_id}`);
        }

        setError('');
        setSnapshot(next);
        setExitBlocked(next.status === 'open');
        if (next.status === 'resolved') {
          await applyResolvedReward(next);
          setExitBlocked(false);
          if (!resultTimer.current) resultTimer.current = window.setTimeout(() => {
            dismissedDrops.current.add(next.drop_id);
            setSnapshot(current => current?.drop_id === next.drop_id ? null : current);
            resultTimer.current = 0;
          }, RESULT_HOLD_MS);
        }
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : String(reason);
        setError(message);
        setExitBlocked(false);
        if (!snapshot) window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', {
          detail: {
            title: de ? 'DUO-BEUTE NICHT ERREICHBAR' : 'DUO LOOT UNAVAILABLE',
            text: de ? 'Der Raum bleibt spielbar. Die gemeinsame Beute wird erneut versucht.' : 'The room stays playable. Shared loot will retry.',
            tone: 'hunt',
          },
        }));
      } finally {
        polling = false;
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      window.clearTimeout(resultTimer.current);
      resultTimer.current = 0;
      setExitBlocked(false);
    };
  }, [active, context?.lobbyId, context?.runSeed, context?.role, de, getEngine]);

  const presentation = useMemo(() => snapshot ? equipmentPresentation(EQUIPMENT[snapshot.equipment_id]) : null, [snapshot]);
  if (!active || !context || !snapshot || !presentation) return null;

  const remaining = secondsRemaining(snapshot, now);
  const resolved = snapshot.status === 'resolved';
  const userId = currentOnlineSession()?.user.id ?? '';
  const won = resolved && snapshot.winner_user_id === userId;
  const title = de ? presentation.nameDe : presentation.nameEn;
  const description = de ? presentation.descriptionDe : presentation.descriptionEn;
  const showPartnerChoice = Boolean(snapshot.my_choice || resolved);

  const choose = async (selected: CoopLootChoice) => {
    if (busy || resolved || snapshot.my_choice) return;
    setBusy(true);
    setError('');
    try {
      const next = await submitCoopLootChoice(context, snapshot.drop_id, snapshot.chapter, snapshot.room, selected);
      if (next) setSnapshot(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const resultText = won
    ? (de ? 'DU HAST DIE BEUTE ERHALTEN' : 'YOU RECEIVED THE LOOT')
    : snapshot.resolution === 'contested'
      ? (de ? `+${snapshot.compensation_dust} STAUB ENTSCHÄDIGUNG` : `+${snapshot.compensation_dust} DUST COMPENSATION`)
      : snapshot.resolution === 'all_pass' || snapshot.resolution === 'timeout'
        ? (de ? `+${snapshot.salvage_dust} STAUB VERWERTUNG` : `+${snapshot.salvage_dust} DUST SALVAGE`)
        : (de ? 'DEIN MIT­SPIELER ERHÄLT DIE BEUTE' : 'YOUR TEAMMATE RECEIVES THE LOOT');

  return <div data-testid="coop-shared-loot" data-status={snapshot.status} className="absolute inset-0 z-[96] grid place-items-center bg-black/68 px-4 backdrop-blur-sm">
    <section className="w-full max-w-sm rounded-3xl border border-amber-300/30 bg-[#100c08]/[.985] p-4 text-white shadow-[0_28px_90px_rgba(0,0,0,.75)]">
      <div className="flex items-start justify-between gap-3">
        <div><div className="text-[7px] font-black uppercase tracking-[.25em] text-amber-200/55">{de ? 'GEMEINSAME DUO-BEUTE' : 'SHARED DUO LOOT'}</div><h2 className="mt-1 font-serif text-2xl text-amber-100">{title}</h2></div>
        <div className="rounded-full border border-white/10 bg-white/[.04] px-2.5 py-1 text-[7px] font-black uppercase text-white/45">{snapshot.rarity}</div>
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-white/52">{description}</p>
      <div className="mt-3 rounded-2xl border border-white/8 bg-black/35 p-3 text-[8px] text-white/45">
        <div className="flex justify-between"><span>{de ? 'DEINE WAHL' : 'YOUR CHOICE'}</span><strong className="text-white/75">{snapshot.my_choice === 'claim' ? (de ? 'BEANSPRUCHT' : 'CLAIM') : snapshot.my_choice === 'pass' ? (de ? 'GEPASST' : 'PASS') : '—'}</strong></div>
        <div className="mt-2 flex justify-between"><span>{de ? 'MIT­SPIELER' : 'TEAMMATE'}</span><strong className="text-white/75">{showPartnerChoice && snapshot.partner_choice ? (snapshot.partner_choice === 'claim' ? (de ? 'BEANSPRUCHT' : 'CLAIM') : (de ? 'GEPASST' : 'PASS')) : (de ? 'ENTSCHEIDET …' : 'DECIDING …')}</strong></div>
        {snapshot.resolution === 'contested' && <div data-testid="coop-loot-rolls" className="mt-3 grid grid-cols-2 gap-2 border-t border-white/8 pt-3 text-center"><div><div className="text-white/35">{de ? 'DEIN WURF' : 'YOUR ROLL'}</div><div className="mt-1 text-xl font-black text-amber-100">{snapshot.my_roll ?? '—'}</div></div><div><div className="text-white/35">{de ? 'ANDERER WURF' : 'OTHER ROLL'}</div><div className="mt-1 text-xl font-black text-white/70">{snapshot.partner_roll ?? '—'}</div></div></div>}
      </div>

      {!resolved ? <>
        <div className="mt-3 text-center text-[8px] font-black uppercase tracking-[.15em] text-amber-100/60">{remaining > 0 ? `${remaining} ${de ? 'SEKUNDEN' : 'SECONDS'}` : (de ? 'WIRD AUFGELÖST …' : 'RESOLVING …')}</div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button data-testid="coop-loot-pass" type="button" disabled={busy || Boolean(snapshot.my_choice)} onClick={() => void choose('pass')} className="rounded-2xl border border-white/12 bg-white/[.04] px-3 py-3 text-[9px] font-black uppercase text-white/55 disabled:opacity-35">{de ? 'PASSEN' : 'PASS'}</button>
          <button data-testid="coop-loot-claim" type="button" disabled={busy || Boolean(snapshot.my_choice)} onClick={() => void choose('claim')} className="rounded-2xl border border-amber-300/35 bg-amber-500/15 px-3 py-3 text-[9px] font-black uppercase text-amber-100 disabled:opacity-35">{de ? 'BEANSPRUCHEN' : 'CLAIM'}</button>
        </div>
      </> : <div data-testid="coop-loot-result" className={`mt-4 rounded-2xl border px-3 py-4 text-center ${won ? 'border-emerald-300/25 bg-emerald-500/10 text-emerald-100' : 'border-amber-300/20 bg-amber-500/[.08] text-amber-100'}`}>
        <div className="text-[11px] font-black uppercase tracking-[.12em]">{resultText}</div>
      </div>}
      {error && <div className="mt-3 rounded-xl border border-red-300/20 bg-red-500/10 px-3 py-2 text-[8px] text-red-100">{error}</div>}
    </section>
  </div>;
}
