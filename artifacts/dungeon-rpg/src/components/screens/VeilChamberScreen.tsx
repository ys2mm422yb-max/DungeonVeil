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
import { KayKitEquipmentPreview } from '../KayKitEquipmentPreview';

const SLOT_LABELS: Record<EquipmentSlot, { de: string; en: string }> = {
  bow: { de: 'BOGEN', en: 'BOW' },
  quiver: { de: 'KÖCHER', en: 'QUIVER' },
  talisman: { de: 'TALISMAN', en: 'TALISMAN' },
};

export function VeilChamberScreen({ onBack }: { onBack: () => void }) {
  const { language } = useLanguage();
  const [meta, setMeta] = useState(loadMetaProgression);
  const [slot, setSlot] = useState<EquipmentSlot>('bow');
  const [selected, setSelected] = useState<EquipmentId>(meta.equipped.bow);
  const de = language === 'de';

  const items = useMemo(() => Object.values(EQUIPMENT).filter(item => item.slot === slot), [slot]);
  const selectedItem = EQUIPMENT[selected];
  const selectedLevel = meta.owned[selected] ?? 0;
  const equipped = meta.equipped[selectedItem.slot] === selected;
  const cost = equipmentUpgradeCost(selected, meta);
  const xpTarget = xpForNextRank(meta.rank);
  const xpPercent = Math.max(0, Math.min(100, meta.xp / xpTarget * 100));

  const refresh = (next = loadMetaProgression()) => setMeta({ ...next });
  const changeSlot = (next: EquipmentSlot) => {
    setSlot(next);
    setSelected(meta.equipped[next]);
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
            <div>
              <div className="text-[8px] font-black tracking-[.28em] text-violet-200/45">{de ? 'SCHLEIER-RANG' : 'VEIL RANK'}</div>
              <div className="mt-1 font-serif text-4xl text-white">{meta.rank}</div>
            </div>
            <div className="text-right">
              <div className="text-[8px] font-black tracking-[.24em] text-amber-200/45">{de ? 'SCHLEIERSTAUB' : 'VEIL DUST'}</div>
              <div className="mt-1 text-xl font-black text-amber-200">✦ {meta.dust}</div>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/7"><div className="h-full rounded-full bg-[linear-gradient(90deg,#6f51c7,#bd9bff)]" style={{ width: `${xpPercent}%` }} /></div>
          <div className="mt-2 flex justify-between text-[8px] font-bold tracking-[.16em] text-white/32"><span>{meta.xp} XP</span><span>{xpTarget} XP</span></div>
        </section>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {(Object.keys(SLOT_LABELS) as EquipmentSlot[]).map(key => (
            <button key={key} type="button" onPointerDown={event => { event.preventDefault(); changeSlot(key); }} className={`rounded-xl border px-2 py-3 text-[9px] font-black tracking-[.16em] active:scale-[.98] ${slot === key ? 'border-amber-300/45 bg-amber-400/12 text-amber-100' : 'border-white/9 bg-black/42 text-white/38'}`}>
              {SLOT_LABELS[key][de ? 'de' : 'en']}
            </button>
          ))}
        </div>

        <section className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-black/52">
          <div className="grid min-h-[210px] grid-cols-[42%_58%]">
            <div className="relative border-r border-white/8 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,.07),transparent_62%)]">
              <KayKitEquipmentPreview assetPath={selectedItem.assetPath} accent={selectedItem.accent} />
              <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[7px] font-black uppercase tracking-[.2em] text-white/25">{selectedItem.pack}</div>
            </div>
            <div className="flex flex-col p-4">
              <div className="text-[8px] font-black tracking-[.22em]" style={{ color: selectedItem.accent }}>{SLOT_LABELS[selectedItem.slot][de ? 'de' : 'en']}</div>
              <h2 className="mt-2 text-xl font-black leading-tight text-white">{de ? selectedItem.nameDe : selectedItem.nameEn}</h2>
              <div className="mt-2 text-[9px] font-black tracking-[.18em] text-white/40">{selectedLevel > 0 ? `${de ? 'STUFE' : 'LEVEL'} ${selectedLevel}/5` : `${de ? 'FREISCHALTUNG' : 'UNLOCK'} · RANG ${selectedItem.unlockRank}`}</div>
              <p className="mt-4 text-[12px] leading-relaxed text-white/62">{de ? selectedItem.descriptionDe : selectedItem.descriptionEn}</p>
              <div className="flex-1" />
              {selectedLevel > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" onPointerDown={event => { event.preventDefault(); refresh(equipMetaItem(selected)); }} disabled={equipped} className={`rounded-xl border px-2 py-3 text-[9px] font-black tracking-[.12em] active:scale-[.98] ${equipped ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200/55' : 'border-violet-300/25 bg-violet-500/14 text-violet-100'}`}>{equipped ? (de ? 'AKTIV' : 'EQUIPPED') : (de ? 'AUSRÜSTEN' : 'EQUIP')}</button>
                  <button type="button" onPointerDown={event => { event.preventDefault(); refresh(upgradeMetaItem(selected)); }} disabled={cost === 0 || meta.dust < cost} className="rounded-xl border border-amber-300/25 bg-amber-500/12 px-2 py-3 text-[9px] font-black tracking-[.1em] text-amber-100 disabled:opacity-30 active:scale-[.98]">{cost === 0 ? 'MAX' : `✦ ${cost}`}</button>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-white/8 bg-white/[.03] px-3 py-3 text-center text-[8px] font-black tracking-[.14em] text-white/30">{meta.rank >= selectedItem.unlockRank ? (de ? 'KANN IM RUN GEFUNDEN WERDEN' : 'CAN DROP IN A RUN') : `${de ? 'AB SCHLEIER-RANG' : 'FROM VEIL RANK'} ${selectedItem.unlockRank}`}</div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-3 grid gap-2">
          {items.map(item => {
            const level = meta.owned[item.id] ?? 0;
            const isEquipped = meta.equipped[item.slot] === item.id;
            return (
              <button key={item.id} type="button" onPointerDown={event => { event.preventDefault(); setSelected(item.id); }} className={`flex items-center gap-3 rounded-2xl border p-3 text-left active:scale-[.99] ${selected === item.id ? 'border-white/22 bg-white/[.075]' : 'border-white/8 bg-black/38'}`}>
                <div className="h-3 w-3 shrink-0 rounded-full shadow-[0_0_16px_currentColor]" style={{ color: item.accent, background: item.accent }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-black text-white/82">{de ? item.nameDe : item.nameEn}</div>
                  <div className="mt-1 text-[8px] uppercase tracking-[.14em] text-white/30">{level ? `${de ? 'STUFE' : 'LEVEL'} ${level}` : `${de ? 'GESPERRT' : 'LOCKED'} · RANG ${item.unlockRank}`}</div>
                </div>
                {isEquipped && <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-[7px] font-black tracking-[.12em] text-emerald-200">{de ? 'AKTIV' : 'ACTIVE'}</span>}
              </button>
            );
          })}
        </section>
      </div>
    </div>
  );
}
