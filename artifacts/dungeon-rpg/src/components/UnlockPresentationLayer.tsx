import React, { useCallback, useEffect, useRef, useState } from 'react';
import { equipmentPresentation } from '../game/equipmentPresentation';
import { EQUIPMENT, loadMetaProgression, type EquipmentId } from '../game/metaProgression';
import {
  initializeSeenUnlocks,
  markEquipmentAnnounced,
  markRelicAnnounced,
  unannouncedEquipmentIds,
  unannouncedRelicIds,
} from '../game/newContentMarkers';
import { loadVeilRelicProfile, VEIL_RELICS, type VeilRelicId } from '../game/veilRelics';
import { APP_BOOT_READY_EVENT } from './GlobalLoadingLayer';

type PresentedUnlock =
  | { key: string; kind: 'equipment'; id: EquipmentId; nameDe: string; nameEn: string; detailDe: string; detailEn: string; accent: string }
  | { key: string; kind: 'relic'; id: VeilRelicId; nameDe: string; nameEn: string; detailDe: string; detailEn: string; accent: string };

function currentLanguage(): 'de' | 'en' {
  try { return localStorage.getItem('dungeon-veil-language') === 'de' ? 'de' : 'en'; }
  catch { return 'en'; }
}

function collectUnlocks(): PresentedUnlock[] {
  const meta = loadMetaProgression();
  const relics = loadVeilRelicProfile();
  const equipmentIds = Object.keys(meta.owned) as EquipmentId[];
  initializeSeenUnlocks(equipmentIds, relics.owned);
  const equipment = unannouncedEquipmentIds(equipmentIds).map(id => {
    const item = EQUIPMENT[id];
    const presentation = equipmentPresentation(item);
    return {
      key: `equipment:${id}`,
      kind: 'equipment' as const,
      id,
      nameDe: presentation.nameDe,
      nameEn: presentation.nameEn,
      detailDe: 'Neue Ausrüstung im Inventar',
      detailEn: 'New equipment in your inventory',
      accent: item.accent,
    };
  });
  const relicUnlocks = unannouncedRelicIds(relics.owned).map(id => {
    const relic = VEIL_RELICS[id];
    return {
      key: `relic:${id}`,
      kind: 'relic' as const,
      id,
      nameDe: relic.nameDe,
      nameEn: relic.nameEn,
      detailDe: 'Neues Schleier-Relikt freigeschaltet',
      detailEn: 'New Veil relic unlocked',
      accent: relic.accent,
    };
  });
  return [...equipment, ...relicUnlocks];
}

function persistAnnouncement(unlock: PresentedUnlock): void {
  if (unlock.kind === 'equipment') markEquipmentAnnounced(unlock.id);
  else markRelicAnnounced(unlock.id);
}

export function UnlockPresentationLayer() {
  const [current, setCurrent] = useState<PresentedUnlock | null>(null);
  const [bootReady, setBootReady] = useState(() => typeof document !== 'undefined' && document.documentElement.dataset.dungeonVeilBootReady === '1');
  const announcedRef = useRef(new Set<string>());
  const language = currentLanguage();
  const de = language === 'de';

  const detect = useCallback(() => {
    setCurrent(active => {
      if (active) return active;
      const next = collectUnlocks().find(unlock => !announcedRef.current.has(unlock.key)) ?? null;
      if (!next) return null;
      announcedRef.current.add(next.key);
      persistAnnouncement(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (bootReady) return;
    const handleBootReady = () => setBootReady(true);
    window.addEventListener(APP_BOOT_READY_EVENT, handleBootReady, { once: true });
    return () => window.removeEventListener(APP_BOOT_READY_EVENT, handleBootReady);
  }, [bootReady]);

  useEffect(() => {
    if (!bootReady) return;
    detect();
    const handleChange = () => detect();
    window.addEventListener('dungeon-veil-meta-changed', handleChange);
    window.addEventListener('dungeon-veil-relic-changed', handleChange);
    return () => {
      window.removeEventListener('dungeon-veil-meta-changed', handleChange);
      window.removeEventListener('dungeon-veil-relic-changed', handleChange);
    };
  }, [bootReady, detect]);

  if (!bootReady || !current) return null;
  const close = () => {
    setCurrent(null);
    window.setTimeout(detect, 0);
  };

  return <div data-testid="unlock-presentation-layer" className="pointer-events-none fixed inset-x-0 top-[max(16px,calc(env(safe-area-inset-top)+8px))] z-[210] flex justify-center px-4">
    <section role="status" aria-live="polite" className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border bg-[#0b0a0c]/96 p-4 text-white shadow-[0_20px_70px_rgba(0,0,0,.72)] backdrop-blur-xl" style={{ borderColor: `${current.accent}66`, boxShadow: `0 20px 70px rgba(0,0,0,.72),0 0 28px ${current.accent}33` }}>
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border text-xl" style={{ borderColor: `${current.accent}70`, color: current.accent, background: `${current.accent}18` }}>{current.kind === 'relic' ? '◆' : '✦'}</div>
        <div className="min-w-0 flex-1"><div className="text-[7px] font-black uppercase tracking-[.24em]" style={{ color: current.accent }}>{de ? 'NEUE FREISCHALTUNG' : 'NEW UNLOCK'}</div><div className="mt-1 truncate text-[14px] font-black text-white">{de ? current.nameDe : current.nameEn}</div><div className="mt-1 text-[8px] text-white/42">{de ? current.detailDe : current.detailEn}</div></div>
        <button data-testid="unlock-presentation-dismiss" type="button" aria-label={de ? 'Hinweis schließen' : 'Dismiss notification'} onClick={close} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/32 text-lg text-white/55 active:scale-90">×</button>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/8"><div className="h-full w-full animate-[pulse_1.5s_ease-in-out_infinite] rounded-full" style={{ background: current.accent }} /></div>
      <div className="mt-2 text-[7px] leading-relaxed text-white/30">{de ? 'Der Gegenstand bleibt im Inventar mit NEU markiert, bis du ihn öffnest.' : 'The item remains marked NEW in the inventory until you open it.'}</div>
    </section>
  </div>;
}
