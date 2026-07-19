import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { ACTIVE_EQUIPMENT, loadMetaProgression, type ActiveEquipmentSlot, type EquipmentId } from '../../game/metaProgression';
import { loadVeilRelicProfile } from '../../game/veilRelics';
import { initializeSeenUnlocks, NEW_CONTENT_EVENT, unseenEquipmentIds, unseenRelicIds } from '../../game/newContentMarkers';
import { EquipmentChamberTabV4 } from './EquipmentChamberTabV4';
import { RelicChamberTabV4 } from './RelicChamberTabV4';

const LABELS: Record<ActiveEquipmentSlot, { de: string; en: string }> = {
  bow: { de: 'FERNWAFFE', en: 'RANGED' },
  quiver: { de: 'KÖCHER', en: 'QUIVER' },
  armor: { de: 'RÜSTUNG', en: 'ARMOR' },
};
type ChamberTab = ActiveEquipmentSlot | 'relic';
const TABS: readonly ChamberTab[] = ['bow', 'quiver', 'armor', 'relic'];

export function VeilChamberScreen({ onBack }: { onBack: () => void }) {
  const { language } = useLanguage();
  const de = language === 'de';
  const [tab, setTab] = useState<ChamberTab>('bow');
  const [revision, setRevision] = useState(0);
  const meta = loadMetaProgression();
  const relics = loadVeilRelicProfile();
  const xpTarget = 100 + Math.max(0, meta.rank - 1) * 65;
  const xpPercent = Math.max(0, Math.min(100, meta.xp / xpTarget * 100));
  const unseenItems = new Set(unseenEquipmentIds(Object.keys(meta.owned) as EquipmentId[]));
  const unseenRelics = new Set(unseenRelicIds(relics.owned));

  useEffect(() => {
    initializeSeenUnlocks(Object.keys(meta.owned) as EquipmentId[], relics.owned);
    const refresh = () => setRevision(value => value + 1);
    const events = [NEW_CONTENT_EVENT, 'dungeon-veil-meta-changed', 'dungeon-veil-equipment-targeting-changed', 'dungeon-veil-cloud-save-restored', 'dungeon-veil-relic-changed'];
    events.forEach(event => window.addEventListener(event, refresh));
    return () => events.forEach(event => window.removeEventListener(event, refresh));
  }, []);

  const countFor = (key: ChamberTab) => key === 'relic'
    ? unseenRelics.size
    : ACTIVE_EQUIPMENT.filter(item => item.slot === key && unseenItems.has(item.id)).length;

  return <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#080706] text-white" data-revision={revision}>
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(105,73,170,.22),transparent_42%),linear-gradient(180deg,#0e0b0a_0%,#080706_72%)]" />
    <main className="relative mx-auto min-h-full max-w-md px-4 pb-[max(28px,calc(env(safe-area-inset-bottom)+18px))] pt-[max(24px,calc(env(safe-area-inset-top)+10px))]">
      <header className="flex items-start gap-3">
        <button type="button" onPointerDown={event => { event.preventDefault(); onBack(); }} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/12 bg-black/45 text-2xl text-white/70 active:scale-95">‹</button>
        <div className="min-w-0 flex-1"><div className="text-[8px] font-black uppercase tracking-[.42em] text-violet-200/45">DUNGEON VEIL</div><h1 className="mt-1 font-serif text-[2.05rem] leading-none tracking-[.08em] text-[#e7c37a]">{de ? 'INVENTAR' : 'INVENTORY'}</h1><p className="mt-2 text-[9px] uppercase tracking-[.2em] text-white/35">{de ? 'AUSRÜSTUNG UND DAUERHAFTER FORTSCHRITT' : 'EQUIPMENT AND PERMANENT PROGRESS'}</p></div>
      </header>

      <section className="mt-5 rounded-3xl border border-violet-300/15 bg-black/52 p-4 shadow-[0_22px_70px_rgba(0,0,0,.45)] backdrop-blur-xl">
        <div className="grid grid-cols-3 items-end gap-3"><div><div className="text-[8px] font-black tracking-[.24em] text-violet-200/45">{de ? 'SCHLEIER-RANG' : 'VEIL RANK'}</div><div className="mt-1 font-serif text-4xl text-white">{meta.rank}</div></div><div className="text-center"><div className="text-[8px] font-black tracking-[.2em] text-yellow-200/45">GOLD</div><div className="mt-1 text-xl font-black text-yellow-200">{meta.gold}</div></div><div className="text-right"><div className="text-[8px] font-black tracking-[.2em] text-amber-200/45">{de ? 'SCHLEIERSTAUB' : 'VEIL DUST'}</div><div className="mt-1 text-xl font-black text-amber-200">✦ {meta.dust}</div></div></div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/7"><div className="h-full rounded-full bg-[linear-gradient(90deg,#6f51c7,#bd9bff)]" style={{ width: `${xpPercent}%` }} /></div><div className="mt-2 flex justify-between text-[8px] font-bold tracking-[.16em] text-white/32"><span>{meta.xp} XP</span><span>{xpTarget} XP</span></div>
      </section>

      <nav className="mt-4 grid grid-cols-4 gap-1.5">
        {TABS.map(key => <button data-testid={`inventory-tab-${key}`} key={key} type="button" onPointerDown={event => { event.preventDefault(); setTab(key); }} className={`relative min-w-0 rounded-xl border px-0.5 py-3 text-[7px] font-black tracking-[.06em] active:scale-[.98] ${tab === key ? 'border-amber-300/45 bg-amber-400/12 text-amber-100' : 'border-white/9 bg-black/42 text-white/38'}`}>{key === 'relic' ? (de ? 'RELIKT' : 'RELIC') : LABELS[key][de ? 'de' : 'en']}{countFor(key) > 0 && <span data-testid="inventory-tab-new-badge" className="absolute -right-1.5 -top-1.5 rounded-full border border-red-200/30 bg-red-500 px-1.5 py-0.5 text-[6px] font-black text-white">{de ? 'NEU' : 'NEW'} {countFor(key)}</span>}</button>)}
      </nav>

      {tab === 'relic' ? <RelicChamberTabV4 /> : <EquipmentChamberTabV4 slot={tab} />}
    </main>
  </div>;
}
