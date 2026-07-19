import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import {
  EQUIPMENT,
  equipMetaItem,
  loadMetaProgression,
  type EquipmentDropSource,
  type EquipmentId,
  xpForNextRank,
} from '../../game/metaProgression';
import { balancedEquipmentUpgradeCost, upgradeMetaItemBalanced } from '../../game/equipmentUpgradeEconomy';
import { equipmentUpgradePreview, type EquipmentUpgradePreviewKey } from '../../game/equipmentUpgradePreview';
import { equipmentUnlockChapter, highestReachedChapter } from '../../game/equipmentChapterGates';
import {
  craftEquipmentCopy,
  equipmentCanBeTargeted,
  equipmentSourceMarkCost,
  loadEquipmentTargeting,
  setEquipmentWishItem,
} from '../../game/equipmentTargeting';
import { equipVeilRelic, loadVeilRelicProfile, VEIL_RELICS, type VeilRelicId } from '../../game/veilRelics';
import { initializeSeenUnlocks, markEquipmentSeen, markRelicSeen, NEW_CONTENT_EVENT, unseenEquipmentIds, unseenRelicIds } from '../../game/newContentMarkers';
import { KayKitEquipmentPreview } from '../KayKitEquipmentPreview';

type ChamberTab = 'bow' | 'quiver' | 'armor' | 'relic';
const TABS: ChamberTab[] = ['bow', 'quiver', 'armor', 'relic'];
const SLOT_LABELS = {
  bow: { de: 'FERNWAFFE', en: 'RANGED' },
  quiver: { de: 'KÖCHER', en: 'QUIVER' },
  armor: { de: 'RÜSTUNG', en: 'ARMOR' },
};
const SOURCE_LABELS: Record<EquipmentDropSource, { de: string; en: string }> = {
  forge: { de: 'SCHMIEDE', en: 'FORGE' }, hunt: { de: 'JAGD', en: 'HUNT' },
  warden: { de: 'WÄCHTER', en: 'WARDEN' }, ritual: { de: 'RITUAL', en: 'RITUAL' }, depth: { de: 'TIEFE', en: 'DEPTH' },
};
const VALUE_LABELS: Record<EquipmentUpgradePreviewKey, { de: string; en: string }> = {
  attackFlat: { de: 'ANGRIFF', en: 'ATTACK' },
  critChance: { de: 'KRIT-CHANCE', en: 'CRIT CHANCE' },
  critDamageMultiplier: { de: 'KRIT-SCHADEN', en: 'CRIT DAMAGE' },
  maxHp: { de: 'LEBEN', en: 'HEALTH' },
  defense: { de: 'VERTEIDIGUNG', en: 'DEFENSE' },
  attackRange: { de: 'REICHWEITE', en: 'RANGE' },
  attackSpeedPercent: { de: 'ANGRIFFSTEMPO', en: 'ATTACK SPEED' },
};

function shown(value: number, percent: boolean) {
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
  return percent ? `${text} %` : text;
}

export function VeilChamberScreen({ onBack }: { onBack: () => void }) {
  const { language } = useLanguage();
  const de = language === 'de';
  const [meta, setMeta] = useState(loadMetaProgression);
  const [targeting, setTargeting] = useState(loadEquipmentTargeting);
  const [relics, setRelics] = useState(loadVeilRelicProfile);
  const [tab, setTab] = useState<ChamberTab>('bow');
  const [selected, setSelected] = useState<EquipmentId>(meta.equipped.bow);
  const [selectedRelic, setSelectedRelic] = useState<VeilRelicId | null>(relics.equipped ?? relics.owned[0] ?? null);
  const [upgrading, setUpgrading] = useState(false);
  const upgradingRef = useRef(false);
  const [, setMarkerRevision] = useState(0);
  const highestChapter = highestReachedChapter();

  const refresh = () => {
    setMeta({ ...loadMetaProgression() });
    setTargeting({ ...loadEquipmentTargeting() });
    setRelics({ ...loadVeilRelicProfile() });
  };

  useEffect(() => {
    initializeSeenUnlocks(Object.keys(meta.owned) as EquipmentId[], relics.owned);
    const markers = () => setMarkerRevision(value => value + 1);
    window.addEventListener(NEW_CONTENT_EVENT, markers);
    window.addEventListener('dungeon-veil-meta-changed', refresh);
    window.addEventListener('dungeon-veil-equipment-targeting-changed', refresh);
    window.addEventListener('dungeon-veil-cloud-save-restored', refresh);
    return () => {
      window.removeEventListener(NEW_CONTENT_EVENT, markers);
      window.removeEventListener('dungeon-veil-meta-changed', refresh);
      window.removeEventListener('dungeon-veil-equipment-targeting-changed', refresh);
      window.removeEventListener('dungeon-veil-cloud-save-restored', refresh);
    };
  }, []);

  const newEquipment = new Set(unseenEquipmentIds(Object.keys(meta.owned) as EquipmentId[]).filter(id => EQUIPMENT[id]?.active));
  const newRelics = new Set(unseenRelicIds(relics.owned));
  const items = useMemo(() => tab === 'relic' ? [] : Object.values(EQUIPMENT)
    .filter(item => item.active && item.slot === tab)
    .sort((a, b) => Number(meta.equipped[a.slot] === b.id) - Number(meta.equipped[b.slot] === a.id)
      || Number(Boolean(meta.owned[b.id])) - Number(Boolean(meta.owned[a.id]))
      || equipmentUnlockChapter(a.id) - equipmentUnlockChapter(b.id)), [meta, tab]);

  const item = tab === 'relic' ? null : EQUIPMENT[selected]?.active ? EQUIPMENT[selected] : items[0] ?? null;
  const progress = item ? meta.owned[item.id] : undefined;
  const level = progress?.level ?? 0;
  const copies = progress?.copies ?? 0;
  const cost = item ? balancedEquipmentUpgradeCost(item.id, meta) : null;
  const preview = useMemo(() => item ? equipmentUpgradePreview(item.id, meta) : [], [item?.id, meta]);
  const canUpgrade = Boolean(cost && meta.gold >= cost.gold && meta.dust >= cost.dust && copies >= cost.copies && !upgrading);
  const sourceMarks = item ? targeting.sourceMarks[item.dropSource] : 0;
  const markCost = item ? equipmentSourceMarkCost(item.id) : 0;
  const targetable = item ? equipmentCanBeTargeted(item.id, meta) : false;
  const canCraft = Boolean(item && targetable && sourceMarks >= markCost);
  const activeRelic = selectedRelic ? VEIL_RELICS[selectedRelic] : null;
  const xpTarget = xpForNextRank(meta.rank);
  const xpPercent = Math.min(100, meta.xp / Math.max(1, xpTarget) * 100);

  const blockedReason = !cost ? (de ? 'MAXIMALLEVEL ERREICHT' : 'MAXIMUM LEVEL REACHED')
    : meta.gold < cost.gold ? (de ? 'ZU WENIG GOLD' : 'NOT ENOUGH GOLD')
      : copies < cost.copies ? (de ? 'ZU WENIGE ITEMKOPIEN' : 'NOT ENOUGH ITEM COPIES')
        : meta.dust < cost.dust ? (de ? 'ZU WENIG SCHLEIERSTAUB' : 'NOT ENOUGH VEIL DUST') : '';

  const changeTab = (next: ChamberTab) => {
    setTab(next);
    if (next === 'relic') setSelectedRelic(relics.equipped ?? relics.owned[0] ?? null);
    else setSelected(meta.equipped[next]);
  };
  const selectItem = (id: EquipmentId) => { setSelected(id); markEquipmentSeen(id); };
  const upgrade = () => {
    if (!item || !canUpgrade || upgradingRef.current) return;
    upgradingRef.current = true; setUpgrading(true);
    const before = meta.owned[item.id]?.level ?? 0;
    const next = upgradeMetaItemBalanced(item.id);
    setMeta({ ...next });
    if ((next.owned[item.id]?.level ?? before) > before) window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', { detail: { title: de ? 'ITEM VERBESSERT' : 'ITEM UPGRADED', text: `${de ? item.nameDe : item.nameEn} · LEVEL ${next.owned[item.id]?.level}/5`, tone: 'relic' } }));
    window.setTimeout(() => { upgradingRef.current = false; setUpgrading(false); }, 220);
  };
  const craft = () => {
    if (!item || !canCraft) return;
    const result = craftEquipmentCopy(item.id);
    refresh();
    if (result.crafted) window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', { detail: { title: result.newUnlock ? (de ? 'ITEM HERGESTELLT' : 'ITEM CRAFTED') : (de ? 'KOPIE HERGESTELLT' : 'COPY CRAFTED'), text: de ? item.nameDe : item.nameEn, tone: 'relic' } }));
  };

  return <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#080706] text-white">
    <div className="relative mx-auto min-h-full max-w-md px-4 pb-8 pt-[max(24px,calc(env(safe-area-inset-top)+10px))]">
      <header className="flex gap-3"><button type="button" onPointerDown={event => { event.preventDefault(); onBack(); }} className="h-12 w-12 rounded-xl border border-white/12 bg-black/45 text-2xl">‹</button><div><div className="text-[8px] font-black tracking-[.42em] text-violet-200/45">DUNGEON VEIL</div><h1 className="font-serif text-3xl text-[#e7c37a]">{de ? 'INVENTAR' : 'INVENTORY'}</h1><p className="text-[8px] tracking-[.16em] text-white/35">{de ? '10 GAMEPLAY-ITEMS · RELIKTE SEPARAT' : '10 GAMEPLAY ITEMS · RELICS SEPARATE'}</p></div></header>
      <section className="mt-5 rounded-3xl border border-violet-300/15 bg-black/52 p-4"><div className="grid grid-cols-3 gap-3 text-center"><div><div className="text-[8px] text-violet-200/45">{de ? 'RANG' : 'RANK'}</div><div className="text-3xl">{meta.rank}</div></div><div><div className="text-[8px] text-yellow-200/45">GOLD</div><div className="text-lg text-yellow-200">{meta.gold}</div></div><div><div className="text-[8px] text-amber-200/45">{de ? 'STAUB' : 'DUST'}</div><div className="text-lg text-amber-200">✦ {meta.dust}</div></div></div><div className="mt-3 h-2 rounded-full bg-white/7"><div className="h-full rounded-full bg-violet-400" style={{ width: `${xpPercent}%` }} /></div></section>
      <div className="mt-4 grid grid-cols-4 gap-1.5">{TABS.map(key => { const count = key === 'relic' ? newRelics.size : [...newEquipment].filter(id => EQUIPMENT[id].slot === key).length; return <button data-testid={`inventory-tab-${key}`} key={key} type="button" onPointerDown={event => { event.preventDefault(); changeTab(key); }} className={`relative rounded-xl border py-3 text-[7px] font-black ${tab === key ? 'border-amber-300/45 bg-amber-400/12 text-amber-100' : 'border-white/9 bg-black/42 text-white/38'}`}>{key === 'relic' ? (de ? 'RELIKT' : 'RELIC') : SLOT_LABELS[key][de ? 'de' : 'en']}{count > 0 && <span data-testid="inventory-tab-new-badge" className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[6px] text-white">{de ? 'NEU' : 'NEW'} {count}</span>}</button>; })}</div>

      {tab === 'relic' ? <><section className="mt-4 rounded-3xl border border-violet-300/25 bg-black/52 p-5">{activeRelic ? <><h2 className="text-xl font-black">{de ? activeRelic.nameDe : activeRelic.nameEn}</h2><p className="mt-3 text-[12px] leading-relaxed text-white/65">{de ? activeRelic.descriptionDe : activeRelic.descriptionEn}</p><button type="button" disabled={relics.equipped === activeRelic.id} onPointerDown={event => { event.preventDefault(); setRelics({ ...equipVeilRelic(activeRelic.id) }); }} className="mt-4 w-full rounded-xl border border-violet-300/25 bg-violet-500/14 py-3 text-[9px] font-black disabled:opacity-40">{relics.equipped === activeRelic.id ? (de ? 'AKTIV' : 'ACTIVE') : (de ? 'AUSRÜSTEN' : 'EQUIP')}</button></> : <p className="py-8 text-center text-[10px] text-white/35">{de ? 'Noch kein Schleier-Relikt gefunden.' : 'No Veil relic found yet.'}</p>}</section><section className="mt-3 grid gap-2">{Object.values(VEIL_RELICS).map(relic => { const owned = relics.owned.includes(relic.id); return <button key={relic.id} disabled={!owned} onPointerDown={event => { event.preventDefault(); if (owned) { setSelectedRelic(relic.id); markRelicSeen(relic.id); } }} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/38 p-3 text-left disabled:opacity-30"><span className="h-3 w-3 rounded-full" style={{ background: relic.accent }} /><span className="flex-1 text-[12px] font-black">{de ? relic.nameDe : relic.nameEn}</span>{newRelics.has(relic.id) && <span data-testid="inventory-item-new-badge" className="rounded-full bg-red-500 px-2 py-1 text-[6px]">{de ? 'NEU' : 'NEW'}</span>}</button>; })}</section></>
      : item ? <><section className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-black/52"><div className="grid min-h-[245px] grid-cols-[42%_58%]"><div className="border-r border-white/8"><KayKitEquipmentPreview assetPath={item.assetPath} accent={item.accent} itemId={item.id} /></div><div className="flex flex-col p-4"><div className="text-[8px] font-black" style={{ color: item.accent }}>{SLOT_LABELS[item.slot as 'bow' | 'quiver' | 'armor'][de ? 'de' : 'en']}</div><h2 className="mt-2 text-xl font-black">{de ? item.nameDe : item.nameEn}</h2><p className="mt-3 text-[12px] text-white/62">{de ? item.descriptionDe : item.descriptionEn}</p><div className="mt-2 text-[8px] text-white/35">{level ? `LEVEL ${level}/5 · ${copies} ${de ? 'KOPIEN' : 'COPIES'}` : `${de ? 'AB KAPITEL' : 'FROM CHAPTER'} ${equipmentUnlockChapter(item.id)} · ${de ? 'RANG' : 'RANK'} ${item.unlockRank}`}</div><div className="flex-1" />{level > 0 && <div className="mt-4 grid gap-2">{cost ? <div data-testid="equipment-upgrade-preview" className="rounded-xl border border-amber-300/14 bg-amber-300/[.05] p-2.5"><div className="text-[7px] font-black text-amber-100/60">LEVEL {level} → {level + 1}</div><div className="mt-2 grid gap-1">{preview.map(row => <div key={row.key} className="flex justify-between rounded-lg bg-black/25 px-2 py-1.5 text-[8px]"><span>{VALUE_LABELS[row.key][de ? 'de' : 'en']}</span><span>{shown(row.current, row.format === 'percent')} → {shown(row.next, row.format === 'percent')} <b className="text-emerald-200">(+{shown(row.delta, row.format === 'percent')})</b></span></div>)}</div></div> : <div data-testid="equipment-upgrade-max" className="rounded-xl border border-emerald-300/14 p-3 text-center text-[8px] text-emerald-200">MAXIMALLEVEL</div>}<div className="grid grid-cols-2 gap-2"><button type="button" disabled={meta.equipped[item.slot] === item.id} onPointerDown={event => { event.preventDefault(); setMeta({ ...equipMetaItem(item.id) }); }} className="rounded-xl border border-violet-300/25 bg-violet-500/14 py-3 text-[9px] font-black disabled:opacity-35">{meta.equipped[item.slot] === item.id ? (de ? 'AKTIV' : 'ACTIVE') : (de ? 'AUSRÜSTEN' : 'EQUIP')}</button><button data-testid="equipment-upgrade-button" type="button" disabled={!canUpgrade} onClick={event => { event.preventDefault(); event.stopPropagation(); upgrade(); }} className="rounded-xl border border-amber-300/25 bg-amber-500/12 py-3 text-[9px] font-black disabled:opacity-30">{upgrading ? '…' : cost ? (de ? 'VERBESSERN' : 'UPGRADE') : 'MAX'}</button></div>{cost && <div data-testid="equipment-upgrade-costs" className="grid grid-cols-3 gap-1 text-center text-[7px]"><span>GOLD<br />{meta.gold}/{cost.gold}</span><span>{de ? 'KOPIEN' : 'COPIES'}<br />{copies}/{cost.copies}</span><span>{de ? 'STAUB' : 'DUST'}<br />{meta.dust}/{cost.dust}</span></div>}{!canUpgrade && blockedReason && <div data-testid="equipment-upgrade-disabled-reason" className="text-center text-[7px] text-red-200/70">{blockedReason}</div>}</div>}</div></div></section>
        {targetable && <section className="mt-3 rounded-2xl border border-violet-300/12 bg-black/42 p-3"><div data-testid="equipment-source-marks" className="flex justify-between text-[8px]"><span>{SOURCE_LABELS[item.dropSource][de ? 'de' : 'en']}-{de ? 'MARKEN' : 'MARKS'}</span><span>{sourceMarks}/{markCost}</span></div><div className="mt-2 grid grid-cols-2 gap-2"><button data-testid="equipment-wish-item" type="button" onPointerDown={event => { event.preventDefault(); setTargeting({ ...setEquipmentWishItem(targeting.wishItem === item.id ? null : item.id) }); }} className="rounded-xl border border-fuchsia-300/25 py-3 text-[8px] font-black">{targeting.wishItem === item.id ? (de ? '◎ WUNSCH AKTIV' : '◎ WISH ACTIVE') : (de ? '◎ ALS WUNSCH' : '◎ SET WISH')}</button><button data-testid="equipment-craft-copy" type="button" disabled={!canCraft} onPointerDown={event => { event.preventDefault(); craft(); }} className="rounded-xl border border-emerald-300/25 py-3 text-[8px] font-black disabled:opacity-30">{level ? (de ? '⚒ KOPIE BAUEN' : '⚒ CRAFT COPY') : (de ? '⚒ ITEM BAUEN' : '⚒ CRAFT ITEM')}</button></div><p className="mt-2 text-center text-[7px] text-white/30">{de ? 'Wunschchance 18–24 % · Hard-Pity nach 7–9 passenden Fehlschlägen.' : 'Wish chance 18–24% · hard pity after 7–9 matching misses.'}</p></section>}
        <section className="mt-3 grid gap-2">{items.map(entry => { const owned = meta.owned[entry.id]; return <button key={entry.id} type="button" onPointerDown={event => { event.preventDefault(); selectItem(entry.id); }} className={`flex items-center gap-3 rounded-2xl border p-3 text-left ${selected === entry.id ? 'border-white/22 bg-white/[.075]' : 'border-white/8 bg-black/38'}`}><span className="h-3 w-3 rounded-full" style={{ background: entry.accent }} /><span className="min-w-0 flex-1"><b className="block truncate text-[12px]">{de ? entry.nameDe : entry.nameEn}</b><small className="text-[8px] text-white/30">{owned ? `LEVEL ${owned.level} · ${owned.copies} ${de ? 'KOPIEN' : 'COPIES'}` : `${de ? 'KAPITEL' : 'CHAPTER'} ${equipmentUnlockChapter(entry.id)} · ${SOURCE_LABELS[entry.dropSource][de ? 'de' : 'en']}`}</small></span>{newEquipment.has(entry.id) && <span data-testid="inventory-item-new-badge" className="rounded-full bg-red-500 px-2 py-1 text-[6px]">{de ? 'NEU' : 'NEW'}</span>}</button>; })}</section></> : null}
    </div>
  </div>;
}
