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
  xpForNextRank,
} from '../../game/metaProgression';
import { equipVeilRelic, loadVeilRelicProfile, VEIL_RELICS, type VeilRelicId } from '../../game/veilRelics';
import { KayKitEquipmentPreview } from '../KayKitEquipmentPreview';

const SLOT_LABELS: Record<EquipmentSlot, { de: string; en: string }> = {
  bow: { de: 'BOGEN', en: 'BOW' },
  quiver: { de: 'KÖCHER', en: 'QUIVER' },
  talisman: { de: 'TALISMAN', en: 'TALISMAN' },
};

const RELIC_ITEMS = new Set<EquipmentId>(['hunter-bow', 'rune-quiver', 'frost-grimoire']);
type ChamberTab = EquipmentSlot | 'relic';

export function VeilChamberScreen({ onBack }: { onBack: () => void }) {
  const { language } = useLanguage();
  const [meta, setMeta] = useState(loadMetaProgression);
  const [relicProfile, setRelicProfile] = useState(loadVeilRelicProfile);
  const [tab, setTab] = useState<ChamberTab>('bow');
  const [selected, setSelected] = useState<EquipmentId>(meta.equipped.bow);
  const [selectedRelic, setSelectedRelic] = useState<VeilRelicId | null>(relicProfile.equipped ?? relicProfile.owned[0] ?? null);
  const de = language === 'de';

  const items = useMemo(() => tab === 'relic' ? [] : Object.values(EQUIPMENT).filter(item => item.slot === tab), [tab]);
  const selectedItem = tab === 'relic' ? null : EQUIPMENT[selected];
  const selectedLevel = selectedItem ? meta.owned[selected] ?? 0 : 0;
  const equipped = selectedItem ? meta.equipped[selectedItem.slot] === selected : false;
  const cost = selectedItem ? equipmentUpgradeCost(selected, meta) : 0;
  const xpTarget = xpForNextRank(meta.rank);
  const xpPercent = Math.max(0, Math.min(100, meta.xp / xpTarget * 100));
  const relicTier = selectedItem ? RELIC_ITEMS.has(selected) : false;
  const activeRelic = selectedRelic ? VEIL_RELICS[selectedRelic] : null;

  const refresh = (next = loadMetaProgression()) => setMeta({ ...next });
  const changeTab = (next: ChamberTab) => {
    setTab(next);
    if (next === 'relic') {
      const profile = loadVeilRelicProfile();
      setRelicProfile({ ...profile });
      setSelectedRelic(profile.equipped ?? profile.owned[0] ?? null);
    } else {
      setSelected(meta.equipped[next]);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#080706] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(105,73,170,.22),transparent_42%),linear-gradient(180deg,#0e0b0a_0%,#080706_72%)]" />
      <div className="relative mx-auto min-h-full max-w-md px-4 pb-[max(28px,calc(env(safe-area-inset-bottom)+18px))] pt-[max(24px,calc(env(safe-area-inset-top)+10px))]">
        <header className="flex items-start gap-3">
          <button type="button" onPointerDown={event => { event.preventDefault(); onBack(); }} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/12 bg-black/45 text-2xl text-white/70 active:scale-95">‹</button>
          <div className="min-w-0 flex-1">
            <div className="text-[8px] font-black uppercase tracking-[.42em] text-violet-200/45">DUNGEON VEIL</div>
            <h1 className="mt-1 font-serif text-[2.05rem] leading-none tracking-[.08em] text-[#e7c37a]">{de ? 'SCHLEIERKAMMER' : 'VEIL CHAMBER'}</h1>
            <p className="mt-2 text-[9px] uppercase tracking-[.2em] text-white/35">{de ? 'DAUERHAFTER FORTSCHRITT ZWISCHEN DEN RUNS' : 'PERMANENT PROGRESS BETWEEN RUNS'}</p>
          </div>
        </header>

        <section className="mt-5 rounded-3xl border border-violet-300/15 bg-black/52 p-4 shadow-[0_22px_70px_rgba(0,0,0,.45)] backdrop-blur-xl">
          <div className="flex items-end justify-between gap-3">
            <div><div className="text-[8px] font-black tracking-[.28em] text-violet-200/45">{de ? 'SCHLEIER-RANG' : 'VEIL RANK'}</div><div className="mt-1 font-serif text-4xl text-white">{meta.rank}</div></div>
            <div className="text-right"><div className="text-[8px] font-black tracking-[.24em] text-amber-200/45">{de ? 'SCHLEIERSTAUB' : 'VEIL DUST'}</div><div className="mt-1 text-xl font-black text-amber-200">✦ {meta.dust}</div></div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/7"><div className="h-full rounded-full bg-[linear-gradient(90deg,#6f51c7,#bd9bff)]" style={{ width: `${xpPercent}%` }} /></div>
          <div className="mt-2 flex justify-between text-[8px] font-bold tracking-[.16em] text-white/32"><span>{meta.xp} XP</span><span>{xpTarget} XP</span></div>
        </section>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {(['bow','quiver','talisman','relic'] as ChamberTab[]).map(key => (
            <button key={key} type="button" onPointerDown={event => { event.preventDefault(); changeTab(key); }} className={`rounded-xl border px-1 py-3 text-[8px] font-black tracking-[.12em] active:scale-[.98] ${tab === key ? 'border-amber-300/45 bg-amber-400/12 text-amber-100' : 'border-white/9 bg-black/42 text-white/38'}`}>
              {key === 'relic' ? (de ? 'RELIKT' : 'RELIC') : SLOT_LABELS[key][de ? 'de' : 'en']}
            </button>
          ))}
        </div>

        {tab === 'relic' ? (
          <>
            <section className="relative mt-4 min-h-[230px] overflow-hidden rounded-3xl border border-violet-300/30 bg-black/52 p-5 shadow-[0_0_42px_rgba(130,91,255,.16),0_24px_70px_rgba(0,0,0,.55)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(142,94,255,.22),transparent_34%)]" />
              <div className="relative">
                <div className="text-[8px] font-black tracking-[.24em] text-violet-200/55">{de ? 'AKTIVES SCHLEIER-RELIKT' : 'ACTIVE VEIL RELIC'}</div>
                {activeRelic ? <>
                  <div className="mt-4 flex items-center gap-4"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-white/15 bg-black/40 text-3xl shadow-[0_0_32px_currentColor]" style={{ color: activeRelic.accent }}>◆</div><div><h2 className="text-xl font-black leading-tight text-white">{de ? activeRelic.nameDe : activeRelic.nameEn}</h2><div className="mt-1 text-[8px] font-black uppercase tracking-[.18em] text-violet-200/45">{activeRelic.source === 'hunt' ? (de ? 'JAGD-RELIKT' : 'HUNT RELIC') : (de ? 'RAUM-20-RELIKT' : 'ROOM 20 RELIC')}</div></div></div>
                  <p className="mt-5 text-[13px] leading-relaxed text-white/72">{de ? activeRelic.descriptionDe : activeRelic.descriptionEn}</p>
                  <button type="button" onPointerDown={event => { event.preventDefault(); const next = equipVeilRelic(activeRelic.id); setRelicProfile({ ...next }); }} disabled={relicProfile.equipped === activeRelic.id} className="mt-5 w-full rounded-xl border border-violet-300/25 bg-violet-500/14 px-3 py-3 text-[9px] font-black tracking-[.14em] text-violet-100 disabled:border-emerald-300/20 disabled:bg-emerald-400/10 disabled:text-emerald-200/55">{relicProfile.equipped === activeRelic.id ? (de ? 'AKTIV' : 'EQUIPPED') : (de ? 'AUSRÜSTEN' : 'EQUIP')}</button>
                </> : <div className="mt-8 rounded-2xl border border-white/8 bg-black/30 px-4 py-8 text-center text-[10px] font-bold leading-relaxed text-white/35">{de ? 'Noch kein seltenes Schleier-Relikt gefunden. Jagd-Gegner und Raum 20 können Relikte fallen lassen.' : 'No rare Veil relic found yet. Hunt enemies and room 20 can drop relics.'}</div>}
              </div>
            </section>
            <section className="mt-3 grid gap-2">
              {Object.values(VEIL_RELICS).map(relic => {
                const owned = relicProfile.owned.includes(relic.id);
                const isEquipped = relicProfile.equipped === relic.id;
                return <button key={relic.id} type="button" disabled={!owned} onPointerDown={event => { event.preventDefault(); if (owned) setSelectedRelic(relic.id); }} className={`relative flex items-center gap-3 rounded-2xl border p-3 text-left active:scale-[.99] ${selectedRelic === relic.id && owned ? 'border-violet-300/35 bg-violet-400/[.09]' : 'border-white/8 bg-black/38'} ${owned ? '' : 'opacity-32'}`}>
                  <div className="h-3 w-3 shrink-0 rounded-full shadow-[0_0_16px_currentColor]" style={{ color: relic.accent, background: relic.accent }} />
                  <div className="min-w-0 flex-1"><div className="truncate text-[12px] font-black text-white/82">{de ? relic.nameDe : relic.nameEn}</div><div className="mt-1 text-[8px] uppercase tracking-[.14em] text-white/30">{owned ? (de ? 'GEFUNDEN' : 'FOUND') : (relic.source === 'hunt' ? (de ? 'JAGD-DROP' : 'HUNT DROP') : (de ? 'RAUM-20-DROP' : 'ROOM 20 DROP'))}</div></div>
                  {isEquipped && <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-[7px] font-black tracking-[.12em] text-emerald-200">{de ? 'AKTIV' : 'ACTIVE'}</span>}
                </button>;
              })}
            </section>
          </>
        ) : selectedItem ? (
          <>
            <section className={`relative mt-4 overflow-hidden rounded-3xl border bg-black/52 ${relicTier ? 'min-h-[250px] border-violet-300/30 shadow-[0_0_42px_rgba(130,91,255,.16),0_24px_70px_rgba(0,0,0,.55)]' : 'border-white/10'}`}>
              <div className={`relative grid ${relicTier ? 'min-h-[250px] grid-cols-[48%_52%]' : 'min-h-[210px] grid-cols-[42%_58%]'}`}>
                <div className="relative overflow-hidden border-r border-white/8 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,.07),transparent_62%)]"><KayKitEquipmentPreview assetPath={selectedItem.assetPath} accent={selectedItem.accent} itemId={selectedItem.id} /><div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[7px] font-black uppercase tracking-[.2em] text-white/25">{selectedItem.pack}</div></div>
                <div className={`flex flex-col ${relicTier ? 'p-4 pt-12' : 'p-4'}`}><div className="text-[8px] font-black tracking-[.22em]" style={{ color: selectedItem.accent }}>{SLOT_LABELS[selectedItem.slot][de ? 'de' : 'en']}</div><h2 className="mt-2 text-xl font-black leading-tight text-white">{de ? selectedItem.nameDe : selectedItem.nameEn}</h2><div className="mt-2 text-[9px] font-black tracking-[.18em] text-white/40">{selectedLevel > 0 ? `${de ? 'STUFE' : 'LEVEL'} ${selectedLevel}/5` : `${de ? 'FREISCHALTUNG' : 'UNLOCK'} · RANG ${selectedItem.unlockRank}`}</div><p className="mt-4 text-[12px] leading-relaxed text-white/62">{de ? selectedItem.descriptionDe : selectedItem.descriptionEn}</p><div className="flex-1" />
                  {selectedLevel > 0 ? <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onPointerDown={event => { event.preventDefault(); refresh(equipMetaItem(selected)); }} disabled={equipped} className={`rounded-xl border px-2 py-3 text-[9px] font-black tracking-[.12em] active:scale-[.98] ${equipped ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200/55' : 'border-violet-300/25 bg-violet-500/14 text-violet-100'}`}>{equipped ? (de ? 'AKTIV' : 'EQUIPPED') : (de ? 'AUSRÜSTEN' : 'EQUIP')}</button><button type="button" onPointerDown={event => { event.preventDefault(); refresh(upgradeMetaItem(selected)); }} disabled={cost === 0 || meta.dust < cost} className="rounded-xl border border-amber-300/25 bg-amber-500/12 px-2 py-3 text-[9px] font-black tracking-[.1em] text-amber-100 disabled:opacity-30 active:scale-[.98]">{cost === 0 ? 'MAX' : `✦ ${cost}`}</button></div> : <div className="mt-4 rounded-xl border border-white/8 bg-white/[.03] px-3 py-3 text-center text-[8px] font-black tracking-[.14em] text-white/30">{meta.rank >= selectedItem.unlockRank ? (de ? 'KANN IM RUN GEFUNDEN WERDEN' : 'CAN DROP IN A RUN') : `${de ? 'AB SCHLEIER-RANG' : 'FROM VEIL RANK'} ${selectedItem.unlockRank}`}</div>}
                </div>
              </div>
            </section>
            <section className="mt-3 grid gap-2">{items.map(item => { const level = meta.owned[item.id] ?? 0; const isEquipped = meta.equipped[item.slot] === item.id; return <button key={item.id} type="button" onPointerDown={event => { event.preventDefault(); setSelected(item.id); }} className={`relative flex items-center gap-3 overflow-hidden rounded-2xl border p-3 text-left active:scale-[.99] ${selected === item.id ? 'border-white/22 bg-white/[.075]' : 'border-white/8 bg-black/38'}`}><div className="h-3 w-3 shrink-0 rounded-full shadow-[0_0_16px_currentColor]" style={{ color: item.accent, background: item.accent }} /><div className="min-w-0 flex-1"><div className="truncate text-[12px] font-black text-white/82">{de ? item.nameDe : item.nameEn}</div><div className="mt-1 text-[8px] uppercase tracking-[.14em] text-white/30">{level ? `${de ? 'STUFE' : 'LEVEL'} ${level}` : `${de ? 'GESPERRT' : 'LOCKED'} · RANG ${item.unlockRank}`}</div></div>{isEquipped && <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-[7px] font-black tracking-[.12em] text-emerald-200">{de ? 'AKTIV' : 'ACTIVE'}</span>}</button>; })}</section>
          </>
        ) : null}
      </div>
    </div>
  );
}
