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
import { armMobilePointerSafety } from '../../game/mobilePointerSafety';
import { equipmentUnlockChapter, highestReachedChapter } from '../../game/equipmentChapterGates';
import {
  craftEquipmentCopy,
  equipmentCanBeTargeted,
  equipmentSourceMarkCost,
  loadEquipmentTargeting,
  setEquipmentWishItem,
} from '../../game/equipmentTargeting';
import {
  equipVeilRelic,
  loadVeilRelicProfile,
  unequipVeilRelic,
  VEIL_RELICS,
  type VeilRelicId,
} from '../../game/veilRelics';
import {
  isOptionalEquipmentSlotEquipped,
  OPTIONAL_EQUIPMENT_EVENT,
  setOptionalEquipmentSlotEquipped,
} from '../../game/optionalEquipmentState';
import { initializeSeenUnlocks, markEquipmentSeen, markRelicSeen, NEW_CONTENT_EVENT, unseenEquipmentIds, unseenRelicIds } from '../../game/newContentMarkers';
import { KayKitEquipmentPreview } from '../KayKitEquipmentPreview';
import { EquipmentArtwork, RelicArtwork } from '../CodexArtwork';
import { CompanionManagementPanel } from '../CompanionManagementPanel';

type EquipmentTab = 'bow' | 'quiver' | 'armor';
type ChamberTab = EquipmentTab | 'relic' | 'companion';
const TABS: ChamberTab[] = ['bow', 'quiver', 'armor', 'relic', 'companion'];
const SLOT_LABELS: Record<EquipmentTab, { de: string; en: string }> = {
  bow: { de: 'BOGEN', en: 'BOW' },
  quiver: { de: 'KÖCHER', en: 'QUIVER' },
  armor: { de: 'RÜSTUNG', en: 'ARMOR' },
};
const SOURCE_LABELS: Record<EquipmentDropSource, { de: string; en: string }> = {
  forge: { de: 'SCHMIEDE', en: 'FORGE' }, hunt: { de: 'JAGD', en: 'HUNT' },
  warden: { de: 'WÄCHTER', en: 'WARDEN' }, ritual: { de: 'RITUAL', en: 'RITUAL' }, depth: { de: 'TIEFE', en: 'DEPTH' },
};
const RELIC_SOURCE_LABELS = {
  hunt: { de: 'JAGD-RELIKT', en: 'HUNT RELIC' },
  boss: { de: 'BOSS-RELIKT', en: 'BOSS RELIC' },
  worldboss: { de: 'WELTBOSS-RELIKT', en: 'WORLD BOSS RELIC' },
} as const;
const VALUE_LABELS: Record<EquipmentUpgradePreviewKey, { de: string; en: string }> = {
  attackFlat: { de: 'ANGRIFF', en: 'ATTACK' },
  critChance: { de: 'KRIT-CHANCE', en: 'CRIT CHANCE' },
  critDamageMultiplier: { de: 'KRIT-SCHADEN', en: 'CRIT DAMAGE' },
  maxHp: { de: 'LEBEN', en: 'HEALTH' },
  defense: { de: 'VERTEIDIGUNG', en: 'DEFENSE' },
  attackRange: { de: 'REICHWEITE', en: 'RANGE' },
  attackSpeedPercent: { de: 'ANGRIFFSTEMPO', en: 'ATTACK SPEED' },
};

function isEquipmentTab(value: ChamberTab): value is EquipmentTab {
  return value === 'bow' || value === 'quiver' || value === 'armor';
}

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
  const [quiverEquipped, setQuiverEquipped] = useState(() => isOptionalEquipmentSlotEquipped('quiver'));
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
    setQuiverEquipped(isOptionalEquipmentSlotEquipped('quiver'));
  };

  useEffect(() => {
    initializeSeenUnlocks(Object.keys(meta.owned) as EquipmentId[], relics.owned);
    const markers = () => setMarkerRevision(value => value + 1);
    window.addEventListener(NEW_CONTENT_EVENT, markers);
    window.addEventListener('dungeon-veil-meta-changed', refresh);
    window.addEventListener('dungeon-veil-equipment-targeting-changed', refresh);
    window.addEventListener('dungeon-veil-relic-changed', refresh);
    window.addEventListener(OPTIONAL_EQUIPMENT_EVENT, refresh);
    window.addEventListener('dungeon-veil-cloud-save-restored', refresh);
    return () => {
      window.removeEventListener(NEW_CONTENT_EVENT, markers);
      window.removeEventListener('dungeon-veil-meta-changed', refresh);
      window.removeEventListener('dungeon-veil-equipment-targeting-changed', refresh);
      window.removeEventListener('dungeon-veil-relic-changed', refresh);
      window.removeEventListener(OPTIONAL_EQUIPMENT_EVENT, refresh);
      window.removeEventListener('dungeon-veil-cloud-save-restored', refresh);
    };
  }, []);

  const newEquipment = new Set(unseenEquipmentIds(Object.keys(meta.owned) as EquipmentId[]).filter(id => EQUIPMENT[id]?.active));
  const newRelics = new Set(unseenRelicIds(relics.owned));
  const items = useMemo(() => !isEquipmentTab(tab) ? [] : Object.values(EQUIPMENT)
    .filter(item => item.active && item.slot === tab)
    .sort((a, b) => Number(meta.equipped[a.slot] === b.id) - Number(meta.equipped[b.slot] === a.id)
      || Number(Boolean(meta.owned[b.id])) - Number(Boolean(meta.owned[a.id]))
      || equipmentUnlockChapter(a.id) - equipmentUnlockChapter(b.id)), [meta, tab]);

  const item = isEquipmentTab(tab) ? (EQUIPMENT[selected]?.active ? EQUIPMENT[selected] : items[0] ?? null) : null;
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
    else if (isEquipmentTab(next)) setSelected(meta.equipped[next]);
  };
  const selectItem = (id: EquipmentId) => { setSelected(id); markEquipmentSeen(id); };
  const upgrade = () => {
    if (!item || !canUpgrade || upgradingRef.current) return;
    upgradingRef.current = true;
    setUpgrading(true);
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
  const equipItem = () => {
    if (!item || level <= 0) return;
    const next = equipMetaItem(item.id);
    if (item.slot === 'quiver') setOptionalEquipmentSlotEquipped('quiver', true);
    setMeta({ ...next });
    setQuiverEquipped(isOptionalEquipmentSlotEquipped('quiver'));
  };
  const unequipQuiver = () => {
    setOptionalEquipmentSlotEquipped('quiver', false);
    setQuiverEquipped(false);
  };

  const wideContent = tab === 'relic' || tab === 'companion';
  const selectedItemIsEquipped = Boolean(item && meta.equipped[item.slot] === item.id && (item.slot !== 'quiver' || quiverEquipped));
  const canUnequipSelected = Boolean(item && item.slot === 'quiver' && meta.equipped.quiver === item.id && quiverEquipped);

  return <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#080706] text-white">
    <div className={'relative mx-auto min-h-full px-4 pb-8 pt-[max(24px,calc(env(safe-area-inset-top)+10px))] ' + (wideContent ? 'max-w-5xl' : 'max-w-md')}>
      <header className="flex gap-3"><button type="button" aria-label={de ? 'Zurück' : 'Back'} onPointerDown={event => { event.preventDefault(); onBack(); }} className="h-12 w-12 shrink-0 rounded-xl border border-white/12 bg-black/45 text-2xl">‹</button><div><div className="text-[8px] font-black tracking-[.42em] text-violet-200/45">DUNGEON VEIL</div><h1 className="font-serif text-3xl text-[#e7c37a]">{de ? 'AUSRÜSTUNG' : 'EQUIPMENT'}</h1><p className="text-[8px] tracking-[.1em] text-white/35">{de ? 'BOGEN · KÖCHER · RÜSTUNG · RELIKTE · BEGLEITER' : 'BOW · QUIVER · ARMOR · RELICS · COMPANIONS'}</p></div></header>
      <section className="mt-5 rounded-3xl border border-violet-300/15 bg-black/52 p-4"><div className="grid grid-cols-3 gap-3 text-center"><div><div className="text-[8px] text-violet-200/45">{de ? 'RANG' : 'RANK'}</div><div className="text-3xl">{meta.rank}</div></div><div><div className="text-[8px] text-yellow-200/45">GOLD</div><div className="text-lg text-yellow-200">{meta.gold}</div></div><div><div className="text-[8px] text-amber-200/45">{de ? 'STAUB' : 'DUST'}</div><div className="text-lg text-amber-200">✦ {meta.dust}</div></div></div><div className="mt-3 h-2 rounded-full bg-white/7"><div className="h-full rounded-full bg-violet-400" style={{ width: `${xpPercent}%` }} /></div><p data-testid="equipment-permanent-progression-copy" className="mt-3 text-center text-[8px] leading-relaxed text-white/38">{de ? 'Ausrüstungslevel 1–5 sind dauerhaft. Bogen und Rüstung bleiben zwingend; Köcher, Relikt und Begleiter können abgelegt werden.' : 'Equipment levels 1–5 are permanent. Bow and armor are required; quiver, relic and companion can be unequipped.'}</p></section>
      <div data-testid="equipment-category-tabs" className="mt-4 grid grid-cols-5 gap-1">{TABS.map(key => {
        const count = key === 'relic' ? newRelics.size : isEquipmentTab(key) ? [...newEquipment].filter(id => EQUIPMENT[id].slot === key).length : 0;
        const label = key === 'relic' ? (de ? 'RELIKT' : 'RELIC') : key === 'companion' ? (de ? 'BEGLEITER' : 'COMPANION') : SLOT_LABELS[key][de ? 'de' : 'en'];
        return <button data-testid={`inventory-tab-${key}`} key={key} type="button" onPointerDown={event => { event.preventDefault(); changeTab(key); }} className={`relative min-w-0 rounded-xl border px-1 py-3 text-[6px] font-black sm:text-[7px] ${tab === key ? 'border-amber-300/45 bg-amber-400/12 text-amber-100' : 'border-white/9 bg-black/42 text-white/38'}`}>{label}{count > 0 && <span data-testid="inventory-tab-new-badge" className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[6px] text-white">{de ? 'NEU' : 'NEW'} {count}</span>}</button>;
      })}</div>

      {tab === 'companion' ? <section data-testid="equipment-companion-section" className="mt-4"><CompanionManagementPanel language={language} embedded /></section>
      : tab === 'relic' ? <>
        <section data-testid="relic-source-summary" className="mt-4 rounded-2xl border border-violet-300/15 bg-violet-500/[.06] p-3 text-violet-100/55"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-[8px] leading-relaxed">{de ? 'Jagd-Relikte kommen aus Jagden. Boss-Relikte können in den Bossräumen 10, 20, 30, 40 und 50 fallen. Relikte sind optional und können wieder abgelegt werden.' : 'Hunt relics come from hunts. Boss relics can drop in boss rooms 10, 20, 30, 40 and 50. Relics are optional and can be unequipped.'}</p><span data-testid="relic-collection-count" className="shrink-0 rounded-full border border-violet-200/15 bg-black/35 px-3 py-1.5 text-[8px] font-black tracking-[.16em] text-violet-100/70">{relics.owned.length} / {Object.keys(VEIL_RELICS).length} {de ? 'GEBORGEN' : 'RECOVERED'}</span></div></section>
        <div data-testid="relic-library-layout" className="mt-3 grid items-start gap-3 md:grid-cols-[minmax(0,0.86fr)_minmax(0,1.4fr)]">
          <section data-testid="relic-detail-panel" className="rounded-3xl border border-violet-300/25 bg-black/52 p-5 md:sticky md:top-4">
            {activeRelic ? <><div className="flex items-center justify-between gap-3"><span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1 text-[7px] font-black tracking-[.16em]" style={{ color: activeRelic.accent }}>{RELIC_SOURCE_LABELS[activeRelic.source][de ? 'de' : 'en']}</span>{relics.equipped === activeRelic.id && <span data-testid="relic-active-badge" className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-[7px] font-black tracking-[.16em] text-emerald-100">{de ? 'AKTIV' : 'ACTIVE'}</span>}</div><RelicArtwork relicId={activeRelic.id} accent={activeRelic.accent} className="mx-auto mt-6 h-28 w-28 shadow-[0_0_42px_rgba(142,92,255,.14)]" /><div className="mt-5 text-[7px] font-black tracking-[.2em] text-violet-100/38">{de ? 'EFFEKT IM RUN' : 'IN-RUN EFFECT'}</div><h2 className="mt-2 text-xl font-black">{de ? activeRelic.nameDe : activeRelic.nameEn}</h2><p className="mt-3 min-h-[64px] text-[12px] leading-relaxed text-white/65">{de ? activeRelic.descriptionDe : activeRelic.descriptionEn}</p><button data-testid={relics.equipped === activeRelic.id ? 'relic-unequip-button' : 'relic-equip-button'} type="button" onPointerDown={event => { event.preventDefault(); setRelics({ ...(relics.equipped === activeRelic.id ? unequipVeilRelic() : equipVeilRelic(activeRelic.id)) }); markRelicSeen(activeRelic.id); }} className={`mt-5 w-full rounded-xl border py-3 text-[9px] font-black ${relics.equipped === activeRelic.id ? 'border-white/14 bg-black/28 text-white/62' : 'border-violet-300/25 bg-violet-500/14 text-violet-100'}`}>{relics.equipped === activeRelic.id ? (de ? 'RELIKT ABLEGEN' : 'UNEQUIP RELIC') : (de ? 'RELIKT AUSRÜSTEN' : 'EQUIP RELIC')}</button></> : <div className="flex min-h-[340px] flex-col items-center justify-center text-center"><div className="flex h-24 w-24 items-center justify-center rounded-full border border-dashed border-violet-200/15 bg-violet-400/[.03] text-5xl text-violet-100/14">◆</div><p className="mt-5 text-[10px] font-black tracking-[.16em] text-white/35">{de ? 'NOCH KEIN RELIKT GEBORGEN' : 'NO RELIC RECOVERED YET'}</p><p className="mt-2 max-w-[250px] text-[9px] leading-relaxed text-white/25">{de ? 'Besiege Jagdgegner, Kapitelbosse und den Weltboss, um die Sammlung zu öffnen.' : 'Defeat hunt enemies, chapter bosses and the world boss to open the collection.'}</p></div>}
          </section>
          <section data-testid="relic-card-grid" className="grid content-start gap-2 sm:grid-cols-2">{Object.values(VEIL_RELICS).map(relic => {
            const owned = relics.owned.includes(relic.id); const active = relics.equipped === relic.id; const selectedCard = selectedRelic === relic.id; const sourceLabel = RELIC_SOURCE_LABELS[relic.source][de ? 'de' : 'en'];
            return <button key={relic.id} data-testid={'relic-card-' + relic.id} data-relic-card="true" data-owned={owned ? 'true' : 'false'} data-active={active ? 'true' : 'false'} disabled={!owned} onPointerDown={event => { event.preventDefault(); if (owned) { setSelectedRelic(relic.id); markRelicSeen(relic.id); } }} className={'relative min-h-[174px] overflow-hidden rounded-3xl border p-4 text-left transition ' + (selectedCard ? 'border-violet-200/45 bg-violet-400/[.11]' : active ? 'border-emerald-300/28 bg-emerald-300/[.06]' : owned ? 'border-white/10 bg-black/42 active:scale-[.99]' : 'cursor-not-allowed border-white/6 bg-black/28')}><span className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full blur-2xl" style={{ background: owned ? relic.accent + '1f' : 'rgba(255,255,255,.025)' }} /><div className="relative flex items-center justify-between gap-2"><span className="rounded-full border border-white/8 bg-black/25 px-2.5 py-1 text-[6px] font-black tracking-[.12em]" style={{ color: owned ? relic.accent : 'rgba(255,255,255,.22)' }}>{sourceLabel}</span>{active && <span className="rounded-full bg-emerald-300/12 px-2 py-1 text-[6px] font-black text-emerald-100">{de ? 'AKTIV' : 'ACTIVE'}</span>}</div><div className="relative mt-4 flex items-start gap-3"><span data-testid={owned ? undefined : 'relic-locked-silhouette'}><RelicArtwork relicId={relic.id} locked={!owned} accent={relic.accent} className="h-12 w-12 shrink-0" /></span><span className="min-w-0 flex-1"><b className={'block text-[12px] leading-snug ' + (owned ? 'text-white' : 'text-white/24')}>{owned ? (de ? relic.nameDe : relic.nameEn) : (de ? 'UNENTDECKTES RELIKT' : 'UNDISCOVERED RELIC')}</b><small className={'mt-2 block text-[8px] leading-relaxed ' + (owned ? 'text-white/42' : 'text-white/20')}>{owned ? (de ? relic.descriptionDe : relic.descriptionEn) : (de ? 'Silhouette bekannt · Effekt wird nach der Bergung sichtbar.' : 'Silhouette known · effect is revealed after recovery.')}</small></span></div><div className="relative mt-4 flex items-center justify-between text-[6px] font-black tracking-[.13em]"><span className={owned ? 'text-violet-100/45' : 'text-white/16'}>{owned ? (selectedCard ? (de ? 'AUSGEWÄHLT' : 'SELECTED') : (de ? 'DETAILS ÖFFNEN' : 'OPEN DETAILS')) : (de ? 'GESPERRT' : 'LOCKED')}</span>{newRelics.has(relic.id) && <span data-testid="inventory-item-new-badge" className="rounded-full bg-red-500 px-2 py-1 text-[6px] text-white">{de ? 'NEU' : 'NEW'}</span>}</div></button>;
          })}</section>
        </div>
      </>
      : item ? <>
        <section className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-black/52"><div className="grid min-h-[245px] grid-cols-[42%_58%]"><div className="border-r border-white/8"><KayKitEquipmentPreview assetPath={item.assetPath} accent={item.accent} itemId={item.id} /></div><div className="flex flex-col p-4"><div className="flex items-center justify-between gap-2"><div className="text-[8px] font-black" style={{ color: item.accent }}>{SLOT_LABELS[item.slot as EquipmentTab][de ? 'de' : 'en']}</div><span className={`rounded-full border px-2 py-1 text-[6px] font-black ${item.slot === 'quiver' ? 'border-cyan-300/15 text-cyan-100/55' : 'border-amber-300/15 text-amber-100/55'}`}>{item.slot === 'quiver' ? (de ? 'OPTIONAL' : 'OPTIONAL') : (de ? 'ZWINGEND' : 'REQUIRED')}</span></div><h2 className="mt-2 text-xl font-black">{de ? item.nameDe : item.nameEn}</h2><p className="mt-3 text-[12px] text-white/62">{de ? item.descriptionDe : item.descriptionEn}</p><div className="mt-2 text-[8px] text-white/35">{level ? `LEVEL ${level}/5 · ${copies} ${de ? 'KOPIEN' : 'COPIES'}` : `${de ? 'AB KAPITEL' : 'FROM CHAPTER'} ${equipmentUnlockChapter(item.id)} · ${de ? 'RANG' : 'RANK'} ${item.unlockRank}`}</div><div className="flex-1" />{level > 0 && <div className="mt-4 grid gap-2">{cost ? <div data-testid="equipment-upgrade-preview" className="rounded-xl border border-amber-300/14 bg-amber-300/[.05] p-2.5"><div className="text-[7px] font-black text-amber-100/60">LEVEL {level} → {level + 1}</div><div className="mt-2 grid gap-1">{preview.map(row => <div key={row.key} className="flex justify-between rounded-lg bg-black/25 px-2 py-1.5 text-[8px]"><span>{VALUE_LABELS[row.key][de ? 'de' : 'en']}</span><span>{shown(row.current, row.format === 'percent')} → {shown(row.next, row.format === 'percent')} <b className="text-emerald-200">(+{shown(row.delta, row.format === 'percent')})</b></span></div>)}</div></div> : <div data-testid="equipment-upgrade-max" className="rounded-xl border border-emerald-300/14 p-3 text-center text-[8px] text-emerald-200">{de ? 'MAXIMALLEVEL' : 'MAXIMUM LEVEL'}</div>}<div className="grid grid-cols-2 gap-2"><button data-testid={canUnequipSelected ? 'equipment-unequip-button' : 'equipment-equip-button'} type="button" disabled={selectedItemIsEquipped && !canUnequipSelected} onPointerDown={event => { event.preventDefault(); if (canUnequipSelected) unequipQuiver(); else equipItem(); }} className={`rounded-xl border py-3 text-[9px] font-black disabled:opacity-35 ${canUnequipSelected ? 'border-white/14 bg-black/28 text-white/62' : 'border-violet-300/25 bg-violet-500/14 text-violet-100'}`}>{canUnequipSelected ? (de ? 'ABLEGEN' : 'UNEQUIP') : selectedItemIsEquipped ? (de ? 'AKTIV' : 'ACTIVE') : (de ? 'AUSRÜSTEN' : 'EQUIP')}</button><button data-testid="equipment-upgrade-button" type="button" disabled={!canUpgrade} onPointerDown={event => { event.preventDefault(); event.stopPropagation(); }} onPointerUp={event => { event.preventDefault(); event.stopPropagation(); armMobilePointerSafety(); window.setTimeout(upgrade, 0); }} onClick={event => { event.preventDefault(); event.stopPropagation(); }} className="rounded-xl border border-amber-300/25 bg-amber-500/12 py-3 text-[9px] font-black disabled:opacity-30">{upgrading ? '…' : cost ? (de ? 'VERBESSERN' : 'UPGRADE') : 'MAX'}</button></div>{cost && <div data-testid="equipment-upgrade-costs" className="grid grid-cols-3 gap-1 text-center text-[7px]"><span>GOLD<br />{meta.gold}/{cost.gold}</span><span>{de ? 'KOPIEN' : 'COPIES'}<br />{copies}/{cost.copies}</span><span>{de ? 'STAUB' : 'DUST'}<br />{meta.dust}/{cost.dust}</span></div>}{!canUpgrade && blockedReason && <div data-testid="equipment-upgrade-disabled-reason" className="text-center text-[7px] text-red-200/70">{blockedReason}</div>}</div>}</div></div></section>
        {targetable && <section className="mt-3 rounded-2xl border border-violet-300/12 bg-black/42 p-3"><div data-testid="equipment-source-marks" className="flex justify-between text-[8px]"><span>{SOURCE_LABELS[item.dropSource][de ? 'de' : 'en']}-{de ? 'MARKEN' : 'MARKS'}</span><span>{sourceMarks}/{markCost}</span></div><div className="mt-2 grid grid-cols-2 gap-2"><button data-testid="equipment-wish-item" type="button" onPointerDown={event => { event.preventDefault(); setTargeting({ ...setEquipmentWishItem(targeting.wishItem === item.id ? null : item.id) }); }} className="rounded-xl border border-fuchsia-300/25 py-3 text-[8px] font-black">{targeting.wishItem === item.id ? (de ? '◎ WUNSCH AKTIV' : '◎ WISH ACTIVE') : (de ? '◎ ALS WUNSCH' : '◎ SET WISH')}</button><button data-testid="equipment-craft-copy" type="button" disabled={!canCraft} onPointerDown={event => { event.preventDefault(); craft(); }} className="rounded-xl border border-emerald-300/25 py-3 text-[8px] font-black disabled:opacity-30">{level ? (de ? '⚒ KOPIE BAUEN' : '⚒ CRAFT COPY') : (de ? '⚒ ITEM BAUEN' : '⚒ CRAFT ITEM')}</button></div><p className="mt-2 text-center text-[7px] text-white/30">{de ? 'Wunschchance 18–24 % · Hard-Pity nach 7–9 passenden Fehlschlägen.' : 'Wish chance 18–24% · hard pity after 7–9 matching misses.'}</p></section>}
        <section className="mt-3 grid gap-2">{items.map(entry => { const owned = meta.owned[entry.id]; const active = meta.equipped[entry.slot] === entry.id && (entry.slot !== 'quiver' || quiverEquipped); return <button key={entry.id} type="button" onPointerDown={event => { event.preventDefault(); selectItem(entry.id); }} className={`flex items-center gap-3 rounded-2xl border p-3 text-left ${selected === entry.id ? 'border-white/22 bg-white/[.075]' : 'border-white/8 bg-black/38'}`}><EquipmentArtwork itemId={entry.id} accent={entry.accent} locked={!owned} className="h-11 w-11 shrink-0" /><span className="min-w-0 flex-1"><b className="block truncate text-[12px]">{de ? entry.nameDe : entry.nameEn}</b><small className="text-[8px] text-white/30">{owned ? `LEVEL ${owned.level} · ${owned.copies} ${de ? 'KOPIEN' : 'COPIES'}` : `${de ? 'KAPITEL' : 'CHAPTER'} ${equipmentUnlockChapter(entry.id)} · ${SOURCE_LABELS[entry.dropSource][de ? 'de' : 'en']}`}</small></span>{active && <span className="rounded-full border border-emerald-300/18 bg-emerald-300/[.06] px-2 py-1 text-[6px] font-black text-emerald-100">{de ? 'AKTIV' : 'ACTIVE'}</span>}{newEquipment.has(entry.id) && <span data-testid="inventory-item-new-badge" className="rounded-full bg-red-500 px-2 py-1 text-[6px]">{de ? 'NEU' : 'NEW'}</span>}</button>; })}</section>
      </> : null}
      <span className="sr-only" data-testid="equipment-highest-chapter">{highestChapter}</span>
    </div>
  </div>;
}
