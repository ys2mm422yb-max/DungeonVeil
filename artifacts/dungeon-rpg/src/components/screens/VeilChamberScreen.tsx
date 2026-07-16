import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { equipmentPresentation } from '../../game/equipmentPresentation';
import {
  EQUIPMENT,
  equipMetaItem,
  loadMetaProgression,
  type EquipmentDropSource,
  type EquipmentId,
  type EquipmentSlot,
  xpForNextRank,
} from '../../game/metaProgression';
import { balancedEquipmentUpgradeCost, upgradeMetaItemBalanced } from '../../game/equipmentUpgradeEconomy';
import { equipmentUnlockChapter, highestReachedChapter } from '../../game/equipmentChapterGates';
import { EQUIPMENT_TARGET_EVENT, loadEquipmentTargetState, toggleEquipmentTarget } from '../../game/equipmentTargeting';
import { equipVeilRelic, loadVeilRelicProfile, VEIL_RELICS, type VeilRelicId } from '../../game/veilRelics';
import {
  initializeSeenUnlocks,
  markEquipmentSeen,
  markRelicSeen,
  NEW_CONTENT_EVENT,
  unseenEquipmentIds,
  unseenRelicIds,
} from '../../game/newContentMarkers';
import { KayKitEquipmentPreview } from '../KayKitEquipmentPreview';

const SLOT_LABELS: Record<EquipmentSlot, { de: string; en: string }> = {
  bow: { de: 'FERNWAFFE', en: 'RANGED' },
  quiver: { de: 'KÖCHER', en: 'QUIVER' },
  talisman: { de: 'ARTEFAKT', en: 'ARTIFACT' },
  armor: { de: 'RÜSTUNG', en: 'ARMOR' },
};

const SOURCE_LABELS: Record<EquipmentDropSource, { de: string; en: string }> = {
  forge: { de: 'SCHMIEDE', en: 'FORGE' },
  hunt: { de: 'JAGD', en: 'HUNT' },
  warden: { de: 'WÄCHTER', en: 'WARDEN' },
  ritual: { de: 'RITUAL', en: 'RITUAL' },
  depth: { de: 'TIEFE', en: 'DEPTH' },
};

type ChamberTab = EquipmentSlot | 'relic';
const CHAMBER_TABS: ChamberTab[] = ['bow', 'quiver', 'talisman', 'armor', 'relic'];

export function VeilChamberScreen({ onBack }: { onBack: () => void }) {
  const { language } = useLanguage();
  const [meta, setMeta] = useState(loadMetaProgression);
  const [relicProfile, setRelicProfile] = useState(loadVeilRelicProfile);
  const [targetState, setTargetState] = useState(loadEquipmentTargetState);
  const [tab, setTab] = useState<ChamberTab>('bow');
  const [selected, setSelected] = useState<EquipmentId>(meta.equipped.bow);
  const [selectedRelic, setSelectedRelic] = useState<VeilRelicId | null>(relicProfile.equipped ?? relicProfile.owned[0] ?? null);
  const [, setMarkerRevision] = useState(0);
  const de = language === 'de';
  const highestChapter = highestReachedChapter();

  useEffect(() => {
    initializeSeenUnlocks(Object.keys(meta.owned) as EquipmentId[], relicProfile.owned);
    const refreshMarkers = () => setMarkerRevision(value => value + 1);
    const refreshTarget = () => setTargetState({ ...loadEquipmentTargetState() });
    window.addEventListener(NEW_CONTENT_EVENT, refreshMarkers);
    window.addEventListener(EQUIPMENT_TARGET_EVENT, refreshTarget);
    window.addEventListener('dungeon-veil-cloud-save-restored', refreshTarget);
    return () => {
      window.removeEventListener(NEW_CONTENT_EVENT, refreshMarkers);
      window.removeEventListener(EQUIPMENT_TARGET_EVENT, refreshTarget);
      window.removeEventListener('dungeon-veil-cloud-save-restored', refreshTarget);
    };
  }, []);

  const newEquipment = new Set(unseenEquipmentIds(Object.keys(meta.owned) as EquipmentId[]));
  const newRelics = new Set(unseenRelicIds(relicProfile.owned));
  const newCountForTab = (key: ChamberTab) => key === 'relic'
    ? newRelics.size
    : [...newEquipment].filter(id => EQUIPMENT[id]?.slot === key).length;

  const items = useMemo(() => {
    if (tab === 'relic') return [];
    return Object.values(EQUIPMENT)
      .filter(item => item.slot === tab)
      .sort((a, b) => {
        const aEquipped = meta.equipped[a.slot] === a.id ? 1 : 0;
        const bEquipped = meta.equipped[b.slot] === b.id ? 1 : 0;
        if (aEquipped !== bEquipped) return bEquipped - aEquipped;
        const aOwned = meta.owned[a.id] ? 1 : 0;
        const bOwned = meta.owned[b.id] ? 1 : 0;
        if (aOwned !== bOwned) return bOwned - aOwned;
        return equipmentUnlockChapter(a.id) - equipmentUnlockChapter(b.id) || a.unlockRank - b.unlockRank;
      });
  }, [meta, tab]);

  const selectedItem = tab === 'relic' ? null : EQUIPMENT[selected];
  const selectedPresentation = selectedItem ? equipmentPresentation(selectedItem) : null;
  const selectedProgress = selectedItem ? meta.owned[selected] : undefined;
  const selectedLevel = selectedProgress?.level ?? 0;
  const selectedCopies = selectedProgress?.copies ?? 0;
  const equipped = selectedItem ? meta.equipped[selectedItem.slot] === selected : false;
  const cost = selectedItem ? balancedEquipmentUpgradeCost(selected, meta) : null;
  const canUpgrade = Boolean(cost && meta.gold >= cost.gold && meta.dust >= cost.dust && selectedCopies >= cost.copies);
  const xpTarget = xpForNextRank(meta.rank);
  const xpPercent = Math.max(0, Math.min(100, meta.xp / xpTarget * 100));
  const relicTier = selectedItem?.rarity === 'epic';
  const activeRelic = selectedRelic ? VEIL_RELICS[selectedRelic] : null;
  const sourceLabel = selectedItem ? SOURCE_LABELS[selectedItem.dropSource][de ? 'de' : 'en'] : '';
  const targetActive = targetState.target === selected;
  const targetUnlocked = Boolean(selectedItem && highestChapter >= equipmentUnlockChapter(selectedItem.id) && meta.rank >= selectedItem.unlockRank);
  const canTarget = Boolean(selectedItem && targetUnlocked && selectedLevel < 5);

  const lockedLabel = (item: (typeof EQUIPMENT)[EquipmentId]) => {
    const chapter = equipmentUnlockChapter(item.id);
    if (highestChapter < chapter) return `${de ? 'AB KAPITEL' : 'FROM CHAPTER'} ${chapter}`;
    if (meta.rank < item.unlockRank) return `${de ? 'AB RANG' : 'FROM RANK'} ${item.unlockRank}`;
    return de ? 'NOCH NICHT GEFUNDEN' : 'NOT FOUND YET';
  };

  const relicSourceLabel = (source: 'hunt' | 'boss' | 'worldboss', compact = false) => {
    if (source === 'hunt') return de ? (compact ? 'JAGD-DROP' : 'JAGD-RELIKT') : (compact ? 'HUNT DROP' : 'HUNT RELIC');
    if (source === 'worldboss') return de ? (compact ? 'NUR WELTBOSS' : 'WELTBOSS-RELIKT') : (compact ? 'WORLD BOSS ONLY' : 'WORLD BOSS RELIC');
    return de ? (compact ? 'BOSS-DROP AB RAUM 20' : 'BOSS-RELIKT AB RAUM 20') : (compact ? 'BOSS DROP FROM ROOM 20' : 'BOSS RELIC FROM ROOM 20');
  };

  const refresh = (next = loadMetaProgression()) => setMeta({ ...next });
  const selectEquipment = (id: EquipmentId) => { setSelected(id); markEquipmentSeen(id); };
  const selectRelic = (id: VeilRelicId) => { setSelectedRelic(id); markRelicSeen(id); };
  const changeTab = (next: ChamberTab) => {
    setTab(next);
    if (next === 'relic') {
      const profile = loadVeilRelicProfile();
      setRelicProfile({ ...profile });
      setSelectedRelic(profile.equipped ?? profile.owned[0] ?? null);
    } else setSelected(meta.equipped[next]);
  };

  return <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#080706] text-white">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(105,73,170,.22),transparent_42%),linear-gradient(180deg,#0e0b0a_0%,#080706_72%)]" />
    <div className="relative mx-auto min-h-full max-w-md px-4 pb-[max(28px,calc(env(safe-area-inset-bottom)+18px))] pt-[max(24px,calc(env(safe-area-inset-top)+10px))]">
      <header className="flex items-start gap-3">
        <button type="button" onPointerDown={event => { event.preventDefault(); onBack(); }} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/12 bg-black/45 text-2xl text-white/70 active:scale-95">‹</button>
        <div className="min-w-0 flex-1"><div className="text-[8px] font-black uppercase tracking-[.42em] text-violet-200/45">DUNGEON VEIL</div><h1 className="mt-1 font-serif text-[2.05rem] leading-none tracking-[.08em] text-[#e7c37a]">{de ? 'INVENTAR' : 'INVENTORY'}</h1><p className="mt-2 text-[9px] uppercase tracking-[.2em] text-white/35">{de ? 'AUSRÜSTUNG UND DAUERHAFTER FORTSCHRITT' : 'EQUIPMENT AND PERMANENT PROGRESS'}</p></div>
      </header>

      <section className="mt-5 rounded-3xl border border-violet-300/15 bg-black/52 p-4 shadow-[0_22px_70px_rgba(0,0,0,.45)] backdrop-blur-xl">
        <div className="grid grid-cols-3 items-end gap-3"><div><div className="text-[8px] font-black tracking-[.24em] text-violet-200/45">{de ? 'SCHLEIER-RANG' : 'VEIL RANK'}</div><div className="mt-1 font-serif text-4xl text-white">{meta.rank}</div></div><div className="text-center"><div className="text-[8px] font-black tracking-[.2em] text-yellow-200/45">GOLD</div><div className="mt-1 text-xl font-black text-yellow-200">{meta.gold}</div></div><div className="text-right"><div className="text-[8px] font-black tracking-[.2em] text-amber-200/45">{de ? 'SCHLEIERSTAUB' : 'VEIL DUST'}</div><div className="mt-1 text-xl font-black text-amber-200">✦ {meta.dust}</div></div></div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/7"><div className="h-full rounded-full bg-[linear-gradient(90deg,#6f51c7,#bd9bff)]" style={{ width: `${xpPercent}%` }} /></div>
        <div className="mt-2 flex justify-between text-[8px] font-bold tracking-[.16em] text-white/32"><span>{meta.xp} XP</span><span>{xpTarget} XP</span></div>
      </section>

      <div className="mt-4 grid grid-cols-5 gap-1.5">
        {CHAMBER_TABS.map(key => {
          const count = newCountForTab(key);
          return <button data-testid={`inventory-tab-${key}`} key={key} type="button" onPointerDown={event => { event.preventDefault(); changeTab(key); }} className={`relative min-w-0 rounded-xl border px-0.5 py-3 text-[7px] font-black tracking-[.06em] active:scale-[.98] ${tab === key ? 'border-amber-300/45 bg-amber-400/12 text-amber-100' : 'border-white/9 bg-black/42 text-white/38'}`}>{key === 'relic' ? (de ? 'RELIKT' : 'RELIC') : SLOT_LABELS[key][de ? 'de' : 'en']}{count > 0 && <span data-testid="inventory-tab-new-badge" className="absolute -right-1.5 -top-1.5 rounded-full border border-red-200/30 bg-red-500 px-1.5 py-0.5 text-[6px] font-black text-white shadow-lg">{de ? 'NEU' : 'NEW'} {count}</span>}</button>;
        })}
      </div>

      {tab === 'relic' ? <>
        <section className="relative mt-4 min-h-[230px] overflow-hidden rounded-3xl border border-violet-300/30 bg-black/52 p-5 shadow-[0_0_42px_rgba(130,91,255,.16),0_24px_70px_rgba(0,0,0,.55)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(142,94,255,.22),transparent_34%)]" />
          <div className="relative"><div className="text-[8px] font-black tracking-[.24em] text-violet-200/55">{de ? 'AKTIVES SCHLEIER-RELIKT' : 'ACTIVE VEIL RELIC'}</div>{activeRelic ? <><div className="mt-4 flex items-center gap-4"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-white/15 bg-black/40 text-3xl shadow-[0_0_32px_currentColor]" style={{ color: activeRelic.accent }}>◆</div><div><h2 className="text-xl font-black leading-tight text-white">{de ? activeRelic.nameDe : activeRelic.nameEn}</h2><div className="mt-1 text-[8px] font-black uppercase tracking-[.18em] text-violet-200/45">{relicSourceLabel(activeRelic.source)}</div></div></div><p className="mt-5 text-[13px] leading-relaxed text-white/72">{de ? activeRelic.descriptionDe : activeRelic.descriptionEn}</p><button type="button" onPointerDown={event => { event.preventDefault(); const next = equipVeilRelic(activeRelic.id); setRelicProfile({ ...next }); }} disabled={relicProfile.equipped === activeRelic.id} className="mt-5 w-full rounded-xl border border-violet-300/25 bg-violet-500/14 px-3 py-3 text-[9px] font-black tracking-[.14em] text-violet-100 disabled:border-emerald-300/20 disabled:bg-emerald-400/10 disabled:text-emerald-200/55">{relicProfile.equipped === activeRelic.id ? (de ? 'AKTIV' : 'EQUIPPED') : (de ? 'AUSRÜSTEN' : 'EQUIP')}</button></> : <div className="mt-8 rounded-2xl border border-white/8 bg-black/30 px-4 py-8 text-center text-[10px] font-bold leading-relaxed text-white/35">{de ? 'Noch kein seltenes Schleier-Relikt gefunden. Jagd-Gegner und Bossräume ab Raum 20 können Relikte fallen lassen. Der Weltenkern stammt ausschließlich vom Weltboss.' : 'No rare Veil relic found yet. Hunt enemies and boss rooms from room 20 onward can drop relics. The World Core comes exclusively from the world boss.'}</div>}</div>
        </section>
        <section className="mt-3 grid gap-2">{Object.values(VEIL_RELICS).map(relic => { const owned = relicProfile.owned.includes(relic.id); const isEquipped = relicProfile.equipped === relic.id; const isNew = newRelics.has(relic.id); return <button key={relic.id} type="button" disabled={!owned} onPointerDown={event => { event.preventDefault(); if (owned) selectRelic(relic.id); }} className={`relative flex items-center gap-3 rounded-2xl border p-3 text-left active:scale-[.99] ${selectedRelic === relic.id && owned ? 'border-violet-300/35 bg-violet-400/[.09]' : 'border-white/8 bg-black/38'} ${owned ? '' : 'opacity-32'}`}><div className="h-3 w-3 shrink-0 rounded-full shadow-[0_0_16px_currentColor]" style={{ color: relic.accent, background: relic.accent }} /><div className="min-w-0 flex-1"><div className="truncate text-[12px] font-black text-white/82">{de ? relic.nameDe : relic.nameEn}</div><div className="mt-1 text-[8px] uppercase tracking-[.14em] text-white/30">{owned ? (de ? 'GEFUNDEN' : 'FOUND') : relicSourceLabel(relic.source, true)}</div></div>{isNew && <span data-testid="inventory-item-new-badge" className="rounded-full bg-red-500 px-2 py-1 text-[6px] font-black text-white">{de ? 'NEU' : 'NEW'}</span>}{isEquipped && <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-[7px] font-black tracking-[.12em] text-emerald-200">{de ? 'AKTIV' : 'ACTIVE'}</span>}</button>; })}</section>
      </> : selectedItem && selectedPresentation ? <>
        <section className={`relative mt-4 overflow-hidden rounded-3xl border bg-black/52 ${relicTier ? 'min-h-[270px] border-violet-300/30 shadow-[0_0_42px_rgba(130,91,255,.16),0_24px_70px_rgba(0,0,0,.55)]' : 'border-white/10'}`}>
          <div className={`relative grid ${relicTier ? 'min-h-[270px] grid-cols-[48%_52%]' : 'min-h-[240px] grid-cols-[42%_58%]'}`}>
            <div className="relative overflow-hidden border-r border-white/8 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,.07),transparent_62%)]"><KayKitEquipmentPreview assetPath={selectedItem.assetPath} accent={selectedItem.accent} itemId={selectedItem.id} /><div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[7px] font-black uppercase tracking-[.2em] text-white/25">{sourceLabel} · {selectedItem.rarity}</div></div>
            <div className={`flex flex-col ${relicTier ? 'p-4 pt-10' : 'p-4'}`}>
              <div className="text-[8px] font-black tracking-[.22em]" style={{ color: selectedItem.accent }}>{SLOT_LABELS[selectedItem.slot][de ? 'de' : 'en']}</div>
              <h2 className="mt-2 text-xl font-black leading-tight text-white">{de ? selectedPresentation.nameDe : selectedPresentation.nameEn}</h2>
              <div className="mt-2 text-[9px] font-black tracking-[.18em] text-white/40">{selectedLevel > 0 ? `${de ? 'AUSRÜSTUNGSLEVEL' : 'EQUIPMENT LEVEL'} ${selectedLevel}/5 · ${selectedCopies} ${de ? 'KOPIEN' : 'COPIES'}` : `${lockedLabel(selectedItem)} · ${sourceLabel}`}</div>
              <p className="mt-4 text-[12px] leading-relaxed text-white/62">{de ? selectedPresentation.descriptionDe : selectedPresentation.descriptionEn}</p>
              <div className="mt-2 text-[7px] leading-relaxed text-white/28">{de ? 'Ausrüstungslevel ist dauerhaft. Verbesserungen benötigen Gold, Itemkopien und Schleierstaub.' : 'Equipment level is permanent. Upgrades require gold, item copies and Veil Dust.'}</div>
              <div className="flex-1" />
              {selectedLevel > 0 ? <div className="mt-4 grid gap-2">
                <div className="grid grid-cols-2 gap-2"><button type="button" onPointerDown={event => { event.preventDefault(); refresh(equipMetaItem(selected)); }} disabled={equipped} className={`rounded-xl border px-2 py-3 text-[9px] font-black tracking-[.12em] active:scale-[.98] ${equipped ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200/55' : 'border-violet-300/25 bg-violet-500/14 text-violet-100'}`}>{equipped ? (de ? 'AKTIV' : 'EQUIPPED') : (de ? 'AUSRÜSTEN' : 'EQUIP')}</button><button type="button" onPointerDown={event => { event.preventDefault(); refresh(upgradeMetaItemBalanced(selected)); }} disabled={!canUpgrade} className="rounded-xl border border-amber-300/25 bg-amber-500/12 px-2 py-3 text-[9px] font-black tracking-[.08em] text-amber-100 disabled:opacity-30 active:scale-[.98]">{cost ? (de ? 'VERBESSERN' : 'UPGRADE') : 'MAX'}</button></div>
                {cost && <div data-testid="equipment-upgrade-costs" className="grid grid-cols-3 gap-1.5 text-center text-[7px] font-black tracking-[.06em]"><div className={`rounded-lg border border-white/7 bg-black/24 px-1 py-2 ${meta.gold >= cost.gold ? 'text-yellow-200' : 'text-red-300'}`}>GOLD<br />{meta.gold}/{cost.gold}</div><div className={`rounded-lg border border-white/7 bg-black/24 px-1 py-2 ${selectedCopies >= cost.copies ? 'text-violet-200' : 'text-red-300'}`}>{de ? 'KOPIEN' : 'COPIES'}<br />{selectedCopies}/{cost.copies}</div><div className={`rounded-lg border border-white/7 bg-black/24 px-1 py-2 ${meta.dust >= cost.dust ? 'text-amber-200' : 'text-red-300'}`}>{de ? 'STAUB' : 'DUST'}<br />{meta.dust}/{cost.dust}</div></div>}
              </div> : <div className="mt-4 rounded-xl border border-white/8 bg-white/[.03] px-3 py-3 text-center text-[8px] font-black tracking-[.14em] text-white/30">{`${lockedLabel(selectedItem)} · DROP: ${sourceLabel}`}</div>}
              {canTarget && <div className="mt-2 grid gap-1.5"><button data-testid="equipment-target-toggle" type="button" onPointerDown={event => { event.preventDefault(); setTargetState({ ...toggleEquipmentTarget(selected) }); }} className={`rounded-xl border px-2 py-3 text-[8px] font-black tracking-[.1em] active:scale-[.98] ${targetActive ? 'border-cyan-200/35 bg-cyan-400/12 text-cyan-100' : 'border-white/12 bg-white/[.04] text-white/55'}`}>{targetActive ? (de ? 'ZIEL AKTIV · LÖSEN' : 'TARGET ACTIVE · CLEAR') : (de ? 'ALS ZIEL SETZEN' : 'SET AS TARGET')}</button>{targetActive && <div data-testid="equipment-target-pity" className="rounded-lg border border-cyan-200/12 bg-cyan-400/[.06] px-2 py-2 text-center text-[7px] font-black tracking-[.08em] text-cyan-100/70">{de ? `QUELLEN-PITY ${targetState.misses}/2 · RAUM 50 GARANTIERT` : `SOURCE PITY ${targetState.misses}/2 · ROOM 50 GUARANTEED`}</div>}</div>}
            </div>
          </div>
        </section>
        <section className="mt-3 grid gap-2">{items.map(item => { const progress = meta.owned[item.id]; const isEquipped = meta.equipped[item.slot] === item.id; const isTarget = targetState.target === item.id; const isNew = newEquipment.has(item.id); const itemSource = SOURCE_LABELS[item.dropSource][de ? 'de' : 'en']; const presentation = equipmentPresentation(item); return <button key={item.id} type="button" onPointerDown={event => { event.preventDefault(); selectEquipment(item.id); }} className={`relative flex items-center gap-3 overflow-hidden rounded-2xl border p-3 text-left active:scale-[.99] ${selected === item.id ? 'border-white/22 bg-white/[.075]' : 'border-white/8 bg-black/38'}`}><div className="h-3 w-3 shrink-0 rounded-full shadow-[0_0_16px_currentColor]" style={{ color: item.accent, background: item.accent }} /><div className="min-w-0 flex-1"><div className="truncate text-[12px] font-black text-white/82">{de ? presentation.nameDe : presentation.nameEn}</div><div className="mt-1 text-[8px] uppercase tracking-[.14em] text-white/30">{progress ? `${de ? 'ITEM-LVL' : 'ITEM LVL'} ${progress.level} · ${progress.copies} ${de ? 'KOPIEN' : 'COPIES'}` : `${lockedLabel(item)} · ${itemSource}`}</div></div>{isNew && <span data-testid="inventory-item-new-badge" className="rounded-full bg-red-500 px-2 py-1 text-[6px] font-black text-white">{de ? 'NEU' : 'NEW'}</span>}{isTarget && <span className="rounded-full border border-cyan-200/25 bg-cyan-400/10 px-2 py-1 text-[7px] font-black tracking-[.1em] text-cyan-100">{de ? 'ZIEL' : 'TARGET'}</span>}{isEquipped && <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-[7px] font-black tracking-[.12em] text-emerald-200">{de ? 'AKTIV' : 'ACTIVE'}</span>}</button>; })}</section>
      </> : null}
    </div>
  </div>;
}
