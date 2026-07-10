import React, { useMemo, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  EQUIPMENT,
  equipMetaItem,
  equipmentUpgradeCost,
  loadMetaProgression,
  type EquipmentId,
  type EquipmentSlot,
  upgradeMetaItem,
} from '../../game/metaProgression';
import { equipVeilRelic, loadVeilRelicProfile, VEIL_RELICS, type VeilRelicId } from '../../game/veilRelics';
import { KayKitEquipmentPreview } from '../KayKitEquipmentPreview';

const SLOT_LABELS: Record<EquipmentSlot, { de: string; en: string; icon: string }> = {
  bow: { de: 'BOGEN', en: 'BOW', icon: '⌁' },
  quiver: { de: 'KÖCHER', en: 'QUIVER', icon: '⇈' },
  talisman: { de: 'TALISMAN', en: 'TALISMAN', icon: '◇' },
};

type InventoryTab = 'gear' | 'relics';

export function VeilChamberScreen({ onBack }: { onBack: () => void }) {
  const { language } = useLanguage();
  const de = language === 'de';
  const [meta, setMeta] = useState(loadMetaProgression);
  const [relicProfile, setRelicProfile] = useState(loadVeilRelicProfile);
  const [tab, setTab] = useState<InventoryTab>('gear');
  const [selected, setSelected] = useState<EquipmentId>(meta.equipped.bow);
  const [selectedRelic, setSelectedRelic] = useState<VeilRelicId | null>(relicProfile.equipped ?? relicProfile.owned[0] ?? null);

  const gear = useMemo(() => Object.values(EQUIPMENT), []);
  const selectedItem = EQUIPMENT[selected];
  const selectedLevel = meta.owned[selected] ?? 0;
  const isOwned = selectedLevel > 0;
  const isEquipped = meta.equipped[selectedItem.slot] === selected;
  const upgradeCost = equipmentUpgradeCost(selected, meta);
  const selectedRelicDef = selectedRelic ? VEIL_RELICS[selectedRelic] : null;

  const refreshMeta = (next = loadMetaProgression()) => setMeta({ ...next });
  const openSlot = (slot: EquipmentSlot) => {
    setTab('gear');
    setSelected(meta.equipped[slot]);
  };

  return <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#080706] text-white">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(112,72,170,.18),transparent_36%),linear-gradient(180deg,#100c09_0%,#080706_68%)]" />
    <div className="relative mx-auto min-h-full max-w-md px-4 pb-[max(30px,calc(env(safe-area-inset-bottom)+18px))] pt-[max(22px,calc(env(safe-area-inset-top)+8px))]">
      <header className="flex items-start gap-3">
        <button type="button" onPointerDown={event => { event.preventDefault(); onBack(); }} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/12 bg-black/45 text-2xl text-white/70 active:scale-95">‹</button>
        <div className="min-w-0 flex-1">
          <div className="text-[8px] font-black uppercase tracking-[.42em] text-amber-200/42">DUNGEON VEIL</div>
          <h1 className="mt-1 font-serif text-[2.15rem] leading-none tracking-[.08em] text-[#e7c37a]">{de ? 'INVENTAR' : 'INVENTORY'}</h1>
          <div className="mt-2 flex gap-3 text-[8px] font-black uppercase tracking-[.14em] text-white/35"><span>{de ? 'RANG' : 'RANK'} {meta.rank}</span><span className="text-amber-200/60">✦ {meta.dust}</span></div>
        </div>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-white/9 bg-black/38 p-1.5">
        <button type="button" onPointerDown={event => { event.preventDefault(); setTab('gear'); }} className={`rounded-xl py-3 text-[9px] font-black uppercase tracking-[.18em] active:scale-[.98] ${tab === 'gear' ? 'bg-amber-400/14 text-amber-100' : 'text-white/35'}`}>{de ? 'AUSRÜSTUNG' : 'EQUIPMENT'}</button>
        <button type="button" onPointerDown={event => { event.preventDefault(); setTab('relics'); }} className={`rounded-xl py-3 text-[9px] font-black uppercase tracking-[.18em] active:scale-[.98] ${tab === 'relics' ? 'bg-violet-400/14 text-violet-100' : 'text-white/35'}`}>{de ? 'RELIKTE' : 'RELICS'}</button>
      </div>

      {tab === 'gear' ? <>
        <section className="mt-4 rounded-3xl border border-white/10 bg-black/48 p-4 shadow-[0_20px_60px_rgba(0,0,0,.4)]">
          <div className="mb-3 text-[8px] font-black uppercase tracking-[.25em] text-white/35">{de ? 'AUSGERÜSTET' : 'EQUIPPED'}</div>
          <div className="grid grid-cols-3 gap-2">
            {(['bow', 'quiver', 'talisman'] as EquipmentSlot[]).map(slot => {
              const item = EQUIPMENT[meta.equipped[slot]];
              return <button key={slot} type="button" onPointerDown={event => { event.preventDefault(); openSlot(slot); }} className={`rounded-2xl border p-2.5 text-left active:scale-[.98] ${selected === item.id ? 'border-amber-300/40 bg-amber-400/10' : 'border-white/9 bg-white/[.025]'}`}>
                <div className="text-lg" style={{ color: item.accent }}>{SLOT_LABELS[slot].icon}</div>
                <div className="mt-2 text-[7px] font-black uppercase tracking-[.15em] text-white/32">{SLOT_LABELS[slot][de ? 'de' : 'en']}</div>
                <div className="mt-1 truncate text-[10px] font-black text-white/82">{de ? item.nameDe : item.nameEn}</div>
              </button>;
            })}
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-black/50 shadow-[0_22px_70px_rgba(0,0,0,.45)]">
          <div className="grid min-h-[230px] grid-cols-[44%_56%]">
            <div className="relative overflow-hidden border-r border-white/8 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,.07),transparent_62%)]">
              <KayKitEquipmentPreview assetPath={selectedItem.assetPath} accent={selectedItem.accent} itemId={selectedItem.id} />
              <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[7px] font-black uppercase tracking-[.2em] text-white/24">{selectedItem.pack}</div>
            </div>
            <div className="flex flex-col p-4">
              <div className="text-[8px] font-black uppercase tracking-[.2em]" style={{ color: selectedItem.accent }}>{SLOT_LABELS[selectedItem.slot][de ? 'de' : 'en']}</div>
              <h2 className="mt-2 text-xl font-black leading-tight text-white">{de ? selectedItem.nameDe : selectedItem.nameEn}</h2>
              <div className="mt-2 text-[8px] font-black uppercase tracking-[.15em] text-white/38">{isOwned ? `${de ? 'STUFE' : 'LEVEL'} ${selectedLevel}/5` : `${de ? 'AB RANG' : 'RANK'} ${selectedItem.unlockRank}`}</div>
              <p className="mt-4 text-[12px] leading-relaxed text-white/62">{de ? selectedItem.descriptionDe : selectedItem.descriptionEn}</p>
              <div className="flex-1" />
              {isOwned ? <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onPointerDown={event => { event.preventDefault(); refreshMeta(equipMetaItem(selected)); }} disabled={isEquipped} className={`rounded-xl border px-2 py-3 text-[8px] font-black uppercase tracking-[.1em] active:scale-[.98] ${isEquipped ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200/55' : 'border-violet-300/25 bg-violet-500/14 text-violet-100'}`}>{isEquipped ? (de ? 'AKTIV' : 'EQUIPPED') : (de ? 'AUSRÜSTEN' : 'EQUIP')}</button>
                <button type="button" onPointerDown={event => { event.preventDefault(); refreshMeta(upgradeMetaItem(selected)); }} disabled={upgradeCost === 0 || meta.dust < upgradeCost} className="rounded-xl border border-amber-300/25 bg-amber-500/12 px-2 py-3 text-[8px] font-black tracking-[.1em] text-amber-100 disabled:opacity-30 active:scale-[.98]">{upgradeCost === 0 ? 'MAX' : `✦ ${upgradeCost}`}</button>
              </div> : <div className="mt-4 rounded-xl border border-white/8 bg-white/[.03] px-3 py-3 text-center text-[8px] font-black uppercase tracking-[.12em] text-white/30">{meta.rank >= selectedItem.unlockRank ? (de ? 'KANN IM RUN FALLEN' : 'CAN DROP IN A RUN') : `${de ? 'FREISCHALTUNG AB RANG' : 'UNLOCK AT RANK'} ${selectedItem.unlockRank}`}</div>}
            </div>
          </div>
        </section>

        <section className="mt-4">
          <div className="mb-3 text-[8px] font-black uppercase tracking-[.25em] text-white/35">{de ? 'GEGENSTÄNDE' : 'ITEMS'}</div>
          <div className="grid grid-cols-3 gap-2">
            {gear.map(item => {
              const level = meta.owned[item.id] ?? 0;
              const owned = level > 0;
              const active = meta.equipped[item.slot] === item.id;
              return <button key={item.id} type="button" onPointerDown={event => { event.preventDefault(); setSelected(item.id); }} className={`relative min-h-[92px] rounded-2xl border p-3 text-left active:scale-[.98] ${selected === item.id ? 'border-amber-300/45 bg-amber-400/10' : 'border-white/8 bg-black/42'} ${owned ? '' : 'opacity-42'}`}>
                <div className="text-lg" style={{ color: item.accent }}>{SLOT_LABELS[item.slot].icon}</div>
                <div className="mt-2 line-clamp-2 text-[10px] font-black leading-tight text-white/82">{de ? item.nameDe : item.nameEn}</div>
                <div className="mt-1 text-[7px] font-black uppercase tracking-[.12em] text-white/28">{owned ? `${de ? 'STUFE' : 'LV'} ${level}` : `${de ? 'RANG' : 'RANK'} ${item.unlockRank}`}</div>
                {active && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,255,180,.8)]" />}
              </button>;
            })}
          </div>
        </section>
      </> : <>
        <section className="mt-4 rounded-3xl border border-violet-300/18 bg-black/48 p-4">
          <div className="text-[8px] font-black uppercase tracking-[.25em] text-violet-200/45">{de ? 'AKTIVES RELIKT' : 'ACTIVE RELIC'}</div>
          {selectedRelicDef ? <>
            <div className="mt-4 flex items-center gap-4"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-white/12 bg-black/35 text-3xl shadow-[0_0_30px_currentColor]" style={{ color: selectedRelicDef.accent }}>◆</div><div><h2 className="text-xl font-black text-white">{de ? selectedRelicDef.nameDe : selectedRelicDef.nameEn}</h2><div className="mt-1 text-[8px] font-black uppercase tracking-[.14em] text-white/30">{selectedRelicDef.source === 'hunt' ? (de ? 'JAGD-DROP' : 'HUNT DROP') : (de ? 'WÄCHTER-DROP' : 'WARDEN DROP')}</div></div></div>
            <p className="mt-4 text-[12px] leading-relaxed text-white/65">{de ? selectedRelicDef.descriptionDe : selectedRelicDef.descriptionEn}</p>
            <button type="button" onPointerDown={event => { event.preventDefault(); const next = equipVeilRelic(selectedRelicDef.id); setRelicProfile({ ...next }); }} disabled={relicProfile.equipped === selectedRelicDef.id} className="mt-4 w-full rounded-xl border border-violet-300/25 bg-violet-500/14 py-3 text-[9px] font-black uppercase tracking-[.14em] text-violet-100 disabled:border-emerald-300/20 disabled:bg-emerald-400/10 disabled:text-emerald-200/55 active:scale-[.98]">{relicProfile.equipped === selectedRelicDef.id ? (de ? 'AKTIV' : 'EQUIPPED') : (de ? 'AUSRÜSTEN' : 'EQUIP')}</button>
          </> : <div className="mt-5 rounded-2xl border border-white/8 bg-white/[.025] px-4 py-8 text-center text-[10px] font-bold leading-relaxed text-white/35">{de ? 'Noch kein seltenes Relikt gefunden.' : 'No rare relic found yet.'}</div>}
        </section>

        <section className="mt-4 grid grid-cols-2 gap-2">
          {Object.values(VEIL_RELICS).map(relic => {
            const owned = relicProfile.owned.includes(relic.id);
            const active = relicProfile.equipped === relic.id;
            return <button key={relic.id} type="button" disabled={!owned} onPointerDown={event => { event.preventDefault(); if (owned) setSelectedRelic(relic.id); }} className={`relative min-h-[105px] rounded-2xl border p-3 text-left active:scale-[.98] ${selectedRelic === relic.id && owned ? 'border-violet-300/40 bg-violet-400/10' : 'border-white/8 bg-black/42'} ${owned ? '' : 'opacity-35'}`}>
              <div className="h-3 w-3 rounded-full shadow-[0_0_14px_currentColor]" style={{ color: relic.accent, background: relic.accent }} />
              <div className="mt-3 text-[11px] font-black leading-tight text-white/82">{owned ? (de ? relic.nameDe : relic.nameEn) : '???'}</div>
              <div className="mt-2 text-[7px] font-black uppercase tracking-[.12em] text-white/28">{owned ? (de ? 'GEFUNDEN' : 'FOUND') : (relic.source === 'hunt' ? (de ? 'JAGD' : 'HUNT') : (de ? 'WÄCHTER' : 'WARDEN'))}</div>
              {active && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,255,180,.8)]" />}
            </button>;
          })}
        </section>
      </>}
    </div>
  </div>;
}
