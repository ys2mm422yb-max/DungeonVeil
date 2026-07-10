import React, { useMemo, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  EQUIPMENT,
  equipMetaItem,
  equipmentUpgradeCost,
  loadMetaProgression,
  markMetaItemSeen,
  type EquipmentId,
  type EquipmentRarity,
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

const RARITY_LABELS: Record<EquipmentRarity, { de: string; en: string; className: string; cardClass: string; dotClass: string }> = {
  common: { de: 'GEWÖHNLICH', en: 'COMMON', className: 'text-stone-300', cardClass: 'border-stone-200/10 bg-stone-100/[.025]', dotClass: 'bg-stone-300' },
  uncommon: { de: 'UNGEWÖHNLICH', en: 'UNCOMMON', className: 'text-emerald-300', cardClass: 'border-emerald-300/18 bg-emerald-400/[.035]', dotClass: 'bg-emerald-300' },
  rare: { de: 'SELTEN', en: 'RARE', className: 'text-sky-300', cardClass: 'border-sky-300/20 bg-sky-400/[.04]', dotClass: 'bg-sky-300' },
  epic: { de: 'EPISCH', en: 'EPIC', className: 'text-violet-300', cardClass: 'border-violet-300/24 bg-violet-400/[.055] shadow-[inset_0_0_28px_rgba(139,92,246,.045)]', dotClass: 'bg-violet-300' },
};

const SOURCE_LABELS = {
  depths: { de: 'TIEFENFUND', en: 'DEPTHS' },
  hunt: { de: 'JAGD', en: 'HUNT' },
  warden: { de: 'WÄCHTER', en: 'WARDEN' },
  ritual: { de: 'RITUAL', en: 'RITUAL' },
  forge: { de: 'SCHMIEDE', en: 'FORGE' },
};

type InventoryTab = 'gear' | 'relics';
type GearFilter = 'all' | EquipmentSlot;

export function VeilChamberScreen({ onBack }: { onBack: () => void }) {
  const { language } = useLanguage();
  const de = language === 'de';
  const [meta, setMeta] = useState(loadMetaProgression);
  const [relicProfile, setRelicProfile] = useState(loadVeilRelicProfile);
  const [tab, setTab] = useState<InventoryTab>('gear');
  const [filter, setFilter] = useState<GearFilter>('all');
  const [selected, setSelected] = useState<EquipmentId | null>(null);
  const [selectedRelic, setSelectedRelic] = useState<VeilRelicId | null>(null);

  const gear = useMemo(() => Object.values(EQUIPMENT), []);
  const filteredGear = filter === 'all' ? gear : gear.filter(item => item.slot === filter);
  const discoveredCount = gear.filter(item => (meta.owned[item.id] ?? 0) > 0).length;
  const freshCount = gear.filter(item => (meta.owned[item.id] ?? 0) > 0 && !meta.seenItems.includes(item.id)).length;
  const selectedItem = selected ? EQUIPMENT[selected] : null;
  const selectedLevel = selected ? (meta.owned[selected] ?? 0) : 0;
  const isOwned = selectedLevel > 0;
  const isEquipped = !!selectedItem && isOwned && meta.equipped[selectedItem.slot] === selected;
  const upgradeCost = selected && isOwned ? equipmentUpgradeCost(selected, meta) : 0;
  const selectedRelicDef = selectedRelic ? VEIL_RELICS[selectedRelic] : null;

  const refreshMeta = (next = loadMetaProgression()) => setMeta({ ...next });
  const selectItem = (id: EquipmentId) => {
    setSelected(id);
    const current = loadMetaProgression();
    if ((current.owned[id] ?? 0) > 0 && !current.seenItems.includes(id)) refreshMeta(markMetaItemSeen(id));
  };
  const openSlot = (slot: EquipmentSlot) => {
    setTab('gear');
    setFilter(slot);
    selectItem(meta.equipped[slot]);
  };

  const gearFilters: Array<{ id: GearFilter; de: string; en: string }> = [
    { id: 'all', de: 'ALLE', en: 'ALL' },
    { id: 'bow', de: 'BÖGEN', en: 'BOWS' },
    { id: 'quiver', de: 'KÖCHER', en: 'QUIVERS' },
    { id: 'talisman', de: 'TALISMANE', en: 'TALISMANS' },
  ];

  return <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#080706] text-white">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(112,72,170,.18),transparent_36%),linear-gradient(180deg,#100c09_0%,#080706_68%)]" />
    <div className="relative mx-auto min-h-full max-w-md px-4 pb-[max(30px,calc(env(safe-area-inset-bottom)+18px))] pt-[max(22px,calc(env(safe-area-inset-top)+8px))]">
      <header className="flex items-start gap-3">
        <button type="button" onPointerDown={event => { event.preventDefault(); onBack(); }} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/12 bg-black/45 text-2xl text-white/70 active:scale-95">‹</button>
        <div className="min-w-0 flex-1">
          <div className="text-[8px] font-black uppercase tracking-[.42em] text-amber-200/42">DUNGEON VEIL</div>
          <h1 className="mt-1 font-serif text-[2.15rem] leading-none tracking-[.08em] text-[#e7c37a]">{de ? 'INVENTAR' : 'INVENTORY'}</h1>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[8px] font-black uppercase tracking-[.14em] text-white/35">
            <span>{de ? 'ENTDECKT' : 'DISCOVERED'} {discoveredCount}/{gear.length}</span>
            {freshCount > 0 && <span className="text-amber-300">◆ {de ? 'NEU' : 'NEW'} {freshCount}</span>}
            <span>{de ? 'RANG' : 'RANK'} {meta.rank}</span>
            <span className="text-amber-200/60">✦ {meta.dust}</span>
          </div>
        </div>
      </header>

      <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-white/9 bg-black/38 p-1.5">
        <button type="button" onPointerDown={event => { event.preventDefault(); setTab('gear'); }} className={`rounded-xl py-3 text-[9px] font-black uppercase tracking-[.18em] active:scale-[.98] ${tab === 'gear' ? 'bg-amber-400/14 text-amber-100' : 'text-white/35'}`}>{de ? 'AUSRÜSTUNG' : 'EQUIPMENT'}</button>
        <button type="button" onPointerDown={event => { event.preventDefault(); setTab('relics'); }} className={`rounded-xl py-3 text-[9px] font-black uppercase tracking-[.18em] active:scale-[.98] ${tab === 'relics' ? 'bg-violet-400/14 text-violet-100' : 'text-white/35'}`}>{de ? 'RELIKTE' : 'RELICS'}</button>
      </div>

      {tab === 'gear' ? <>
        <section className="mt-4 rounded-3xl border border-white/10 bg-black/48 p-4 shadow-[0_20px_60px_rgba(0,0,0,.4)]">
          <div className="mb-3 flex items-center justify-between"><div className="text-[8px] font-black uppercase tracking-[.25em] text-white/35">{de ? 'AUSGERÜSTET' : 'EQUIPPED'}</div><div className="text-[7px] font-black uppercase tracking-[.16em] text-white/20">{de ? 'SLOT ANTIPPEN' : 'TAP SLOT'}</div></div>
          <div className="grid grid-cols-3 gap-2">
            {(['bow', 'quiver', 'talisman'] as EquipmentSlot[]).map(slot => {
              const item = EQUIPMENT[meta.equipped[slot]];
              return <button key={slot} type="button" onPointerDown={event => { event.preventDefault(); openSlot(slot); }} className={`rounded-2xl border p-2.5 text-left active:scale-[.98] ${filter === slot ? 'border-amber-300/40 bg-amber-400/10' : 'border-white/9 bg-white/[.025]'}`}>
                <div className="text-lg" style={{ color: item.accent }}>{SLOT_LABELS[slot].icon}</div>
                <div className="mt-2 text-[7px] font-black uppercase tracking-[.15em] text-white/32">{SLOT_LABELS[slot][de ? 'de' : 'en']}</div>
                <div className="mt-1 truncate text-[10px] font-black text-white/82">{de ? item.nameDe : item.nameEn}</div>
              </button>;
            })}
          </div>
        </section>

        <section className="mt-4">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {gearFilters.map(entry => <button key={entry.id} type="button" onPointerDown={event => { event.preventDefault(); setFilter(entry.id); }} className={`shrink-0 rounded-full border px-4 py-2 text-[8px] font-black uppercase tracking-[.14em] active:scale-[.98] ${filter === entry.id ? 'border-amber-300/35 bg-amber-400/14 text-amber-100' : 'border-white/8 bg-black/35 text-white/32'}`}>{entry[de ? 'de' : 'en']}</button>)}
          </div>
        </section>

        <section className="mt-4">
          <div className="mb-3 flex items-center justify-between"><div className="text-[8px] font-black uppercase tracking-[.25em] text-white/35">{de ? 'GEGENSTÄNDE' : 'ITEMS'}</div><div className="text-[8px] font-black tracking-[.12em] text-white/25">{filteredGear.filter(item => (meta.owned[item.id] ?? 0) > 0).length}/{filteredGear.length}</div></div>
          <div className="grid grid-cols-3 gap-2">
            {filteredGear.map(item => {
              const level = meta.owned[item.id] ?? 0;
              const owned = level > 0;
              const active = owned && meta.equipped[item.slot] === item.id;
              const fresh = owned && !meta.seenItems.includes(item.id);
              const rarity = RARITY_LABELS[item.rarity];
              const cardClass = !owned ? 'border-white/8 bg-[linear-gradient(145deg,rgba(255,255,255,.018),rgba(0,0,0,.62))]' : active ? 'border-emerald-300/35 bg-emerald-400/[.07]' : rarity.cardClass;
              return <button key={item.id} type="button" onPointerDown={event => { event.preventDefault(); selectItem(item.id); }} className={`relative min-h-[118px] overflow-hidden rounded-2xl border p-3 text-left transition-transform active:scale-[.98] ${cardClass} ${fresh ? 'ring-1 ring-amber-300/45 shadow-[0_0_22px_rgba(251,191,36,.12)]' : ''}`}>
                {owned ? <>
                  <div className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full shadow-[0_0_10px_currentColor] ${rarity.dotClass}`} /><div className="text-lg" style={{ color: item.accent }}>{SLOT_LABELS[item.slot].icon}</div></div>
                  <div className="mt-2 line-clamp-2 text-[10px] font-black leading-tight text-white/88">{de ? item.nameDe : item.nameEn}</div>
                  <div className={`mt-1 text-[7px] font-black uppercase tracking-[.12em] ${rarity.className}`}>{de ? 'STUFE' : 'LV'} {level} · {rarity[de ? 'de' : 'en']}</div>
                  <div className="mt-2 text-[6px] font-black uppercase tracking-[.15em] text-white/28">{SOURCE_LABELS[item.source][de ? 'de' : 'en']}</div>
                </> : <><div className="text-2xl font-serif text-white/18">?</div><div className="mt-2 text-[11px] font-black tracking-[.12em] text-white/28">???</div><div className="mt-1 text-[7px] font-black uppercase tracking-[.12em] text-white/15">{de ? 'UNENTDECKT' : 'UNDISCOVERED'}</div></>}
                {active && <span className="absolute right-2 top-2 rounded-full border border-emerald-200/20 bg-emerald-400/15 px-1.5 py-0.5 text-[6px] font-black text-emerald-200">{de ? 'AKTIV' : 'ACTIVE'}</span>}
                {fresh && <span className="absolute right-2 top-2 rounded-full border border-amber-100/35 bg-amber-300 px-2 py-0.5 text-[6px] font-black text-black shadow-[0_0_14px_rgba(252,211,77,.35)]">{de ? 'NEU' : 'NEW'}</span>}
              </button>;
            })}
          </div>
        </section>
      </> : <>
        <section className="mt-4">
          <div className="mb-3 flex items-center justify-between"><div className="text-[8px] font-black uppercase tracking-[.25em] text-violet-200/45">{de ? 'RELIKTE' : 'RELICS'}</div><div className="text-[8px] font-black text-white/25">{relicProfile.owned.length}/{Object.keys(VEIL_RELICS).length}</div></div>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(VEIL_RELICS).map(relic => {
              const owned = relicProfile.owned.includes(relic.id);
              const active = relicProfile.equipped === relic.id;
              return <button key={relic.id} type="button" disabled={!owned} onPointerDown={event => { event.preventDefault(); if (owned) setSelectedRelic(relic.id); }} className={`relative min-h-[110px] rounded-2xl border p-3 text-left active:scale-[.98] ${active ? 'border-emerald-300/30 bg-emerald-400/[.06]' : 'border-violet-300/12 bg-violet-400/[.025]'} ${owned ? '' : 'opacity-35'}`}>
                <div className="h-3 w-3 rounded-full shadow-[0_0_14px_currentColor]" style={{ color: owned ? relic.accent : '#777', background: owned ? relic.accent : '#333' }} />
                <div className="mt-3 text-[11px] font-black leading-tight text-white/82">{owned ? (de ? relic.nameDe : relic.nameEn) : '???'}</div>
                <div className="mt-2 text-[7px] font-black uppercase tracking-[.12em] text-white/28">{owned ? (de ? 'GEFUNDEN' : 'FOUND') : (de ? 'UNENTDECKT' : 'UNDISCOVERED')}</div>
                {active && <span className="absolute right-2 top-2 rounded-full border border-emerald-200/20 bg-emerald-400/15 px-1.5 py-0.5 text-[6px] font-black text-emerald-200">{de ? 'AKTIV' : 'ACTIVE'}</span>}
              </button>;
            })}
          </div>
        </section>
      </>}
    </div>

    {selectedItem && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/72 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-16 backdrop-blur-sm" onPointerDown={() => setSelected(null)}>
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border bg-[#0d0a08] shadow-[0_30px_100px_rgba(0,0,0,.75)]" style={{ borderColor: isOwned ? `${selectedItem.accent}55` : 'rgba(255,255,255,.12)', boxShadow: isOwned ? `0 30px 100px rgba(0,0,0,.75), inset 0 0 42px ${selectedItem.accent}0d` : '0 30px 100px rgba(0,0,0,.75)' }} onPointerDown={event => event.stopPropagation()}>
        {isOwned ? <>
          <div className="grid min-h-[250px] grid-cols-[43%_57%]">
            <div className="relative overflow-hidden border-r border-white/8 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,.07),transparent_62%)]">
              <KayKitEquipmentPreview assetPath={selectedItem.assetPath} accent={selectedItem.accent} itemId={selectedItem.id} />
              <div className="pointer-events-none absolute inset-x-4 bottom-3 flex items-center justify-between text-[6px] font-black uppercase tracking-[.18em] text-white/28"><span>{selectedItem.pack}</span><span>{SOURCE_LABELS[selectedItem.source][de ? 'de' : 'en']}</span></div>
            </div>
            <div className="flex flex-col p-4">
              <button type="button" onPointerDown={event => { event.preventDefault(); setSelected(null); }} className="self-end text-2xl text-white/35">×</button>
              <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${RARITY_LABELS[selectedItem.rarity].dotClass}`} /><div className="text-[8px] font-black uppercase tracking-[.2em]" style={{ color: selectedItem.accent }}>{SLOT_LABELS[selectedItem.slot][de ? 'de' : 'en']}</div></div>
              <h2 className="mt-2 text-xl font-black leading-tight text-white">{de ? selectedItem.nameDe : selectedItem.nameEn}</h2>
              <div className={`mt-2 text-[7px] font-black uppercase tracking-[.16em] ${RARITY_LABELS[selectedItem.rarity].className}`}>{RARITY_LABELS[selectedItem.rarity][de ? 'de' : 'en']} · {SOURCE_LABELS[selectedItem.source][de ? 'de' : 'en']}</div>
              <div className="mt-2 text-[8px] font-black uppercase tracking-[.15em] text-white/38">{de ? 'STUFE' : 'LEVEL'} {selectedLevel}/5</div>
              <div className="mt-3 h-px w-full" style={{ background: `linear-gradient(90deg, ${selectedItem.accent}88, transparent)` }} />
              <p className="mt-3 text-[12px] leading-relaxed text-white/62">{de ? selectedItem.descriptionDe : selectedItem.descriptionEn}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-white/8 p-4">
            <button type="button" onPointerDown={event => { event.preventDefault(); refreshMeta(equipMetaItem(selectedItem.id)); }} disabled={isEquipped} className={`rounded-xl border px-2 py-3 text-[8px] font-black uppercase tracking-[.1em] active:scale-[.98] ${isEquipped ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200/55' : 'border-violet-300/25 bg-violet-500/14 text-violet-100'}`}>{isEquipped ? (de ? 'AKTIV' : 'EQUIPPED') : (de ? 'AUSRÜSTEN' : 'EQUIP')}</button>
            <button type="button" onPointerDown={event => { event.preventDefault(); refreshMeta(upgradeMetaItem(selectedItem.id)); }} disabled={upgradeCost === 0 || meta.dust < upgradeCost} className="rounded-xl border border-amber-300/25 bg-amber-500/12 px-2 py-3 text-[8px] font-black tracking-[.1em] text-amber-100 disabled:opacity-30 active:scale-[.98]">{upgradeCost === 0 ? 'MAX' : `✦ ${upgradeCost}`}</button>
          </div>
        </> : <div className="flex min-h-[310px] flex-col items-center justify-center px-8 text-center">
          <button type="button" onPointerDown={event => { event.preventDefault(); setSelected(null); }} className="absolute right-7 top-20 text-2xl text-white/35">×</button>
          <div className="grid h-20 w-20 place-items-center rounded-3xl border border-white/8 bg-white/[.025] text-5xl font-serif text-white/18">?</div>
          <h2 className="mt-5 text-lg font-black tracking-[.08em] text-white/55">{de ? 'UNBEKANNTER GEGENSTAND' : 'UNKNOWN ITEM'}</h2>
          <p className="mt-3 text-[11px] leading-relaxed text-white/30">{de ? 'Kann tief im Schleier gefunden werden. Name, Wirkung und Herkunft werden erst nach dem ersten Fund enthüllt.' : 'Can be found deep in the Veil. Name, effect and origin are revealed after the first discovery.'}</p>
        </div>}
      </div>
    </div>}

    {selectedRelicDef && <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/72 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-16 backdrop-blur-sm" onPointerDown={() => setSelectedRelic(null)}>
      <div className="w-full max-w-md rounded-[28px] border border-violet-300/18 bg-[#0d0a10] p-5 shadow-[0_30px_100px_rgba(0,0,0,.75)]" onPointerDown={event => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-4"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-white/12 bg-black/35 text-3xl shadow-[0_0_30px_currentColor]" style={{ color: selectedRelicDef.accent }}>◆</div><div><div className="text-[8px] font-black uppercase tracking-[.2em] text-violet-200/45">{de ? 'RELIKT' : 'RELIC'}</div><h2 className="mt-1 text-xl font-black text-white">{de ? selectedRelicDef.nameDe : selectedRelicDef.nameEn}</h2></div></div><button type="button" onPointerDown={event => { event.preventDefault(); setSelectedRelic(null); }} className="text-2xl text-white/35">×</button></div>
        <div className="mt-3 text-[8px] font-black uppercase tracking-[.14em] text-white/30">{selectedRelicDef.source === 'hunt' ? (de ? 'JAGD-DROP' : 'HUNT DROP') : (de ? 'WÄCHTER-DROP' : 'WARDEN DROP')}</div>
        <p className="mt-4 text-[12px] leading-relaxed text-white/65">{de ? selectedRelicDef.descriptionDe : selectedRelicDef.descriptionEn}</p>
        <button type="button" onPointerDown={event => { event.preventDefault(); const next = equipVeilRelic(selectedRelicDef.id); setRelicProfile({ ...next }); }} disabled={relicProfile.equipped === selectedRelicDef.id} className="mt-5 w-full rounded-xl border border-violet-300/25 bg-violet-500/14 py-3 text-[9px] font-black uppercase tracking-[.14em] text-violet-100 disabled:border-emerald-300/20 disabled:bg-emerald-400/10 disabled:text-emerald-200/55 active:scale-[.98]">{relicProfile.equipped === selectedRelicDef.id ? (de ? 'AKTIV' : 'EQUIPPED') : (de ? 'AUSRÜSTEN' : 'EQUIP')}</button>
      </div>
    </div>}
  </div>;
}
