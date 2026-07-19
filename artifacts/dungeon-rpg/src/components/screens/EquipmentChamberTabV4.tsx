import React, { useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { equipmentPresentation } from '../../game/equipmentPresentation';
import {
  ACTIVE_EQUIPMENT,
  EQUIPMENT,
  equipMetaItem,
  loadMetaProgression,
  type ActiveEquipmentSlot,
  type EquipmentDropSource,
  type EquipmentId,
} from '../../game/metaProgression';
import { balancedEquipmentUpgradeCost, upgradeMetaItemBalanced } from '../../game/equipmentUpgradeEconomy';
import { equipmentUpgradePreview, type EquipmentUpgradePreviewKey } from '../../game/equipmentUpgradePreview';
import { equipmentUnlockChapter, highestReachedChapter } from '../../game/equipmentChapterGates';
import {
  EQUIPMENT_SOURCE_MARK_COST,
  craftEquipmentCopy,
  equipmentCanBeTargeted,
  loadEquipmentTargeting,
  setEquipmentWishItem,
} from '../../game/equipmentTargeting';
import { markEquipmentSeen, unseenEquipmentIds } from '../../game/newContentMarkers';
import { KayKitEquipmentPreview } from '../KayKitEquipmentPreview';

const SLOT_LABELS: Record<ActiveEquipmentSlot, { de: string; en: string }> = {
  bow: { de: 'FERNWAFFE', en: 'RANGED' }, quiver: { de: 'KÖCHER', en: 'QUIVER' }, armor: { de: 'RÜSTUNG', en: 'ARMOR' },
};
const SOURCE_LABELS: Record<EquipmentDropSource, { de: string; en: string }> = {
  forge: { de: 'SCHMIEDE', en: 'FORGE' }, hunt: { de: 'JAGD', en: 'HUNT' }, warden: { de: 'WÄCHTER', en: 'WARDEN' }, ritual: { de: 'RITUAL', en: 'RITUAL' }, depth: { de: 'TIEFE', en: 'DEPTH' },
};
const UPGRADE_LABELS: Record<EquipmentUpgradePreviewKey, { de: string; en: string }> = {
  attackFlat: { de: 'ANGRIFF', en: 'ATTACK' }, maxHp: { de: 'LEBEN', en: 'HEALTH' }, defense: { de: 'VERTEIDIGUNG', en: 'DEFENSE' },
  attackRange: { de: 'REICHWEITE', en: 'RANGE' }, attackSpeedPercent: { de: 'ANGRIFFSTEMPO', en: 'ATTACK SPEED' },
  critChance: { de: 'KRIT-CHANCE', en: 'CRIT CHANCE' }, critDamage: { de: 'KRIT-SCHADEN', en: 'CRIT DAMAGE' },
};

function formatValue(value: number, percent: boolean) {
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
  return percent ? `${text} %` : text;
}

export function EquipmentChamberTabV4({ slot }: { slot: ActiveEquipmentSlot }) {
  const { language } = useLanguage();
  const de = language === 'de';
  const [revision, setRevision] = useState(0);
  const meta = loadMetaProgression();
  const targeting = loadEquipmentTargeting();
  const items = useMemo(() => ACTIVE_EQUIPMENT.filter(item => item.slot === slot).sort((a, b) => {
    const equippedDifference = Number(meta.equipped[b.slot] === b.id) - Number(meta.equipped[a.slot] === a.id);
    if (equippedDifference) return equippedDifference;
    return Number(Boolean(meta.owned[b.id])) - Number(Boolean(meta.owned[a.id])) || equipmentUnlockChapter(a.id) - equipmentUnlockChapter(b.id);
  }), [slot, revision]);
  const [selected, setSelected] = useState<EquipmentId>(meta.equipped[slot]);
  const selectedItem = EQUIPMENT[selected]?.active && EQUIPMENT[selected].slot === slot ? EQUIPMENT[selected] : items[0];
  const presentation = selectedItem ? equipmentPresentation(selectedItem) : null;
  const progress = selectedItem ? meta.owned[selectedItem.id] : undefined;
  const level = progress?.level ?? 0;
  const copies = progress?.copies ?? 0;
  const equipped = selectedItem ? meta.equipped[selectedItem.slot] === selectedItem.id : false;
  const cost = selectedItem ? balancedEquipmentUpgradeCost(selectedItem.id, meta) : null;
  const canUpgrade = Boolean(cost && meta.gold >= cost.gold && meta.dust >= cost.dust && copies >= cost.copies);
  const preview = selectedItem ? equipmentUpgradePreview(selectedItem.id, meta) : [];
  const targetable = selectedItem ? equipmentCanBeTargeted(selectedItem.id, meta) : false;
  const sourceLabel = selectedItem ? SOURCE_LABELS[selectedItem.dropSource][de ? 'de' : 'en'] : '';
  const marks = selectedItem ? targeting.sourceMarks[selectedItem.dropSource] : 0;
  const wishActive = selectedItem ? targeting.wishItem === selectedItem.id : false;
  const canCraft = Boolean(selectedItem && targetable && marks >= EQUIPMENT_SOURCE_MARK_COST);
  const unseen = new Set(unseenEquipmentIds(Object.keys(meta.owned) as EquipmentId[]));
  const upgradingRef = useRef(false);
  const [upgrading, setUpgrading] = useState(false);

  const refresh = () => setRevision(value => value + 1);
  const lockedLabel = (id: EquipmentId) => {
    const item = EQUIPMENT[id]; const chapter = equipmentUnlockChapter(id);
    if (highestReachedChapter() < chapter) return `${de ? 'AB KAPITEL' : 'FROM CHAPTER'} ${chapter}`;
    if (meta.rank < item.unlockRank) return `${de ? 'AB RANG' : 'FROM RANK'} ${item.unlockRank}`;
    return de ? 'NOCH NICHT GEFUNDEN' : 'NOT FOUND YET';
  };
  const blockedReason = !cost ? (de ? 'MAXIMALLEVEL ERREICHT' : 'MAXIMUM LEVEL REACHED')
    : meta.gold < cost.gold ? (de ? 'ZU WENIG GOLD' : 'NOT ENOUGH GOLD')
    : copies < cost.copies ? (de ? 'ZU WENIGE ITEMKOPIEN' : 'NOT ENOUGH ITEM COPIES')
    : meta.dust < cost.dust ? (de ? 'ZU WENIG SCHLEIERSTAUB' : 'NOT ENOUGH VEIL DUST') : '';

  const upgrade = () => {
    if (!selectedItem || !canUpgrade || upgradingRef.current) return;
    upgradingRef.current = true; setUpgrading(true);
    try { upgradeMetaItemBalanced(selectedItem.id); refresh(); }
    finally { window.setTimeout(() => { upgradingRef.current = false; setUpgrading(false); }, 220); }
  };

  if (!selectedItem || !presentation) return null;
  return <>
    <section className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-black/52">
      <div className="grid min-h-[250px] grid-cols-[42%_58%]">
        <div className="relative overflow-hidden border-r border-white/8"><KayKitEquipmentPreview assetPath={selectedItem.assetPath} accent={selectedItem.accent} itemId={selectedItem.id} /></div>
        <div className="flex flex-col p-4">
          <div className="text-[8px] font-black tracking-[.2em]" style={{ color: selectedItem.accent }}>{SLOT_LABELS[slot][de ? 'de' : 'en']}</div>
          <h2 className="mt-2 text-xl font-black leading-tight">{de ? presentation.nameDe : presentation.nameEn}</h2>
          <div className="mt-2 text-[9px] text-white/40">{level > 0 ? `${de ? 'AUSRÜSTUNGSLEVEL' : 'EQUIPMENT LEVEL'} ${level}/5 · ${copies} ${de ? 'KOPIEN' : 'COPIES'}` : `${lockedLabel(selectedItem.id)} · ${sourceLabel}`}</div>
          <p className="mt-4 text-[12px] leading-relaxed text-white/62">{de ? presentation.descriptionDe : presentation.descriptionEn}</p><div className="flex-1" />
          {level > 0 ? <div className="mt-4 grid gap-2">
            {cost && <div data-testid="equipment-upgrade-preview" className="rounded-xl border border-amber-300/14 bg-amber-300/[.055] p-2.5"><div className="text-[7px] font-black text-amber-100/55">{de ? 'NÄCHSTES UPGRADE' : 'NEXT UPGRADE'} · LVL {level} → {level + 1}</div><div className="mt-2 grid gap-1">{preview.map(row => <div key={row.key} className="flex justify-between gap-2 text-[8px]"><span className="text-white/55">{UPGRADE_LABELS[row.key][de ? 'de' : 'en']}</span><span className="font-black text-amber-100">{formatValue(row.current, row.format === 'percent')} → {formatValue(row.next, row.format === 'percent')} <span className="text-emerald-200">(+{formatValue(row.delta, row.format === 'percent')})</span></span></div>)}</div></div>}
            <div className="grid grid-cols-2 gap-2"><button type="button" disabled={equipped} onPointerDown={event => { event.preventDefault(); equipMetaItem(selectedItem.id); refresh(); }} className="rounded-xl border border-violet-300/25 bg-violet-500/14 p-3 text-[9px] font-black disabled:opacity-40">{equipped ? (de ? 'AKTIV' : 'EQUIPPED') : (de ? 'AUSRÜSTEN' : 'EQUIP')}</button><button data-testid="equipment-upgrade-button" type="button" disabled={!canUpgrade || upgrading} onPointerDown={event => event.stopPropagation()} onClick={event => { event.preventDefault(); event.stopPropagation(); upgrade(); }} className="rounded-xl border border-amber-300/25 bg-amber-500/12 p-3 text-[9px] font-black disabled:opacity-30">{upgrading ? (de ? 'WIRD VERBESSERT…' : 'UPGRADING…') : cost ? (de ? 'VERBESSERN' : 'UPGRADE') : 'MAX'}</button></div>
            {cost && <div data-testid="equipment-upgrade-costs" className="grid grid-cols-3 gap-1 text-center text-[7px]"><div>GOLD<br />{meta.gold}/{cost.gold}</div><div>{de ? 'KOPIEN' : 'COPIES'}<br />{copies}/{cost.copies}</div><div>{de ? 'STAUB' : 'DUST'}<br />{meta.dust}/{cost.dust}</div></div>}
            {!canUpgrade && blockedReason && <div data-testid="equipment-upgrade-disabled-reason" className="text-center text-[7px] text-red-200/65">{blockedReason}</div>}
          </div> : <div className="mt-4 rounded-xl border border-white/8 p-3 text-center text-[8px] text-white/30">{lockedLabel(selectedItem.id)} · DROP: {sourceLabel}</div>}
          {targetable && <div className="mt-3 grid gap-2 border-t border-white/8 pt-3"><div data-testid="equipment-source-marks" className="flex justify-between text-[8px]"><span>{sourceLabel}-{de ? 'MARKEN' : 'MARKS'}</span><span>{marks}/{EQUIPMENT_SOURCE_MARK_COST}</span></div><div className="grid grid-cols-2 gap-2"><button data-testid="equipment-wish-item" type="button" onPointerDown={event => { event.preventDefault(); setEquipmentWishItem(wishActive ? null : selectedItem.id); refresh(); }} className="rounded-xl border border-white/12 p-3 text-[8px]">{wishActive ? (de ? '◎ WUNSCH AKTIV' : '◎ WISH ACTIVE') : (de ? '◎ ALS WUNSCH' : '◎ SET WISH')}</button><button data-testid="equipment-craft-copy" type="button" disabled={!canCraft} onPointerDown={event => { event.preventDefault(); craftEquipmentCopy(selectedItem.id); refresh(); }} className="rounded-xl border border-emerald-300/25 p-3 text-[8px] disabled:opacity-30">{de ? '⚒ KOPIE BAUEN' : '⚒ CRAFT COPY'}</button></div></div>}
        </div>
      </div>
    </section>
    <section className="mt-3 grid gap-2">{items.map(item => { const itemProgress = meta.owned[item.id]; const itemPresentation = equipmentPresentation(item); return <button key={item.id} type="button" onPointerDown={event => { event.preventDefault(); setSelected(item.id); markEquipmentSeen(item.id); }} className={`flex items-center gap-3 rounded-2xl border p-3 text-left ${selectedItem.id === item.id ? 'border-white/22 bg-white/[.075]' : 'border-white/8 bg-black/38'}`}><span className="h-3 w-3 rounded-full" style={{ background: item.accent }} /><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-black">{de ? itemPresentation.nameDe : itemPresentation.nameEn}</span><span className="block text-[8px] text-white/30">{itemProgress ? `${de ? 'ITEM-LVL' : 'ITEM LVL'} ${itemProgress.level} · ${itemProgress.copies} ${de ? 'KOPIEN' : 'COPIES'}` : lockedLabel(item.id)}</span></span>{targeting.wishItem === item.id && <span className="text-[7px] text-fuchsia-100">◎ {de ? 'WUNSCH' : 'WISH'}</span>}{unseen.has(item.id) && <span data-testid="inventory-item-new-badge" className="rounded-full bg-red-500 px-2 py-1 text-[6px]">{de ? 'NEU' : 'NEW'}</span>}{meta.equipped[item.slot] === item.id && <span className="text-[7px] text-emerald-200">{de ? 'AKTIV' : 'ACTIVE'}</span>}</button>; })}</section>
  </>;
}
