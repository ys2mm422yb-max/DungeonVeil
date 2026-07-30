import React, { useEffect, useMemo, useState } from 'react';
import { EQUIPMENT, loadMetaProgression, type EquipmentId } from '../../game/metaProgression';
import { loadRetentionProfile } from '../../game/runRetention';
import { loadVeilRelicProfile, VEIL_RELICS, type VeilRelicId } from '../../game/veilRelics';
import { CODEX_BEASTS, CODEX_HUNTS, CODEX_WARDENS } from '../../game/codexDefinitions';
import { useLanguage } from '../../i18n/LanguageContext';
import { EnemyArtwork, EquipmentArtwork, RelicArtwork } from '../CodexArtwork';
import { CodexModelPreview } from '../CodexModelPreview';

type Tab = 'beasts' | 'hunts' | 'wardens' | 'relics' | 'equipment';
type Copy = { de: string; en: string };
type CardProps = {
  id: string;
  selected: boolean;
  known: boolean;
  title: string;
  eyebrow: string;
  lockedLabel: string;
  openLabel: string;
  openedLabel: string;
  hintLabel: string;
  artwork: React.ReactNode;
  counter?: string;
  onSelect: () => void;
};

const TAB_ORDER: Tab[] = ['beasts', 'hunts', 'wardens', 'relics', 'equipment'];
const HUNT_ACCENTS = ['#e6a94a', '#9d7be8', '#dc6f68', '#b7c6dd', '#c78cff', '#d8a35e'];
const RARITY_LABELS = {
  common: { de: 'GEWÖHNLICH', en: 'COMMON' }, rare: { de: 'SELTEN', en: 'RARE' }, epic: { de: 'EPISCH', en: 'EPIC' },
} as const;
const SOURCE_LABELS = {
  hunt: { de: 'JAGD', en: 'HUNT' }, boss: { de: 'BOSS', en: 'BOSS' }, worldboss: { de: 'WELTBOSS', en: 'WORLD BOSS' },
} as const;
const COPY = {
  locked: { de: 'NICHT ENTDECKT', en: 'UNDISCOVERED' }, detailOpen: { de: 'DETAIL GEÖFFNET', en: 'DETAIL OPEN' },
  detailShow: { de: 'DETAIL ANZEIGEN', en: 'SHOW DETAILS' }, silhouetteHint: { de: 'SILHOUETTE · FUNDHINWEIS', en: 'SILHOUETTE · DISCOVERY HINT' },
  type: { de: 'TYP', en: 'TYPE' }, firstSighting: { de: 'ERSTER FUND', en: 'FIRST SIGHTING' }, room: { de: 'RAUM', en: 'ROOM' },
  arena: { de: 'ARENA', en: 'ARENA' }, status: { de: 'STATUS', en: 'STATUS' }, source: { de: 'QUELLE', en: 'SOURCE' },
  rarity: { de: 'SELTENHEIT', en: 'RARITY' }, form: { de: 'GESTALT', en: 'FORM' }, varies: { de: 'VARIIERT JE RUN', en: 'VARIES BY RUN' },
  rareHunt: { de: 'SELTENE JAGD', en: 'RARE HUNT' }, defeats: { de: 'BESIEGT', en: 'DEFEATED' }, mechanic: { de: 'MECHANIK', en: 'MECHANIC' },
} satisfies Record<string, Copy>;

function pick(copy: Copy, de: boolean) { return de ? copy.de : copy.en; }

function CodexCard({ id, selected, known, title, eyebrow, lockedLabel, openLabel, openedLabel, hintLabel, artwork, counter, onSelect }: CardProps) {
  return <button
    type="button"
    data-testid={`codex-card-${id}`}
    data-known={known ? 'true' : 'false'}
    data-selected={selected ? 'true' : 'false'}
    aria-pressed={selected}
    onPointerDown={event => { event.preventDefault(); onSelect(); }}
    className={'group min-h-[112px] w-full rounded-3xl border p-3 text-left transition active:scale-[.99] '
      + (selected ? 'border-violet-200/42 bg-violet-400/[.11]' : known ? 'border-white/10 bg-black/42' : 'border-white/6 bg-black/28')}
  >
    <div className="flex items-center gap-3">
      {artwork}
      <span className="min-w-0 flex-1">
        <span className={'block text-[6px] font-black tracking-[.16em] ' + (known ? 'text-violet-100/48' : 'text-white/20')}>{known ? eyebrow : lockedLabel}</span>
        <b className={'mt-1.5 block text-[11px] leading-snug ' + (known ? 'text-white/88' : 'text-white/24')}>{known ? title : '???'}</b>
        <span className={'mt-2 block text-[7px] leading-relaxed ' + (known ? 'text-white/36' : 'text-white/18')}>{known ? (selected ? openedLabel : openLabel) : hintLabel}</span>
        {known && counter && <span className="mt-1 block text-[6px] font-black tracking-[.14em] text-amber-100/48">{counter}</span>}
      </span>
    </div>
  </button>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="min-h-11 rounded-xl border border-white/7 bg-black/28 px-3 py-2.5"><div className="text-[6px] font-black tracking-[.16em] text-white/24">{label}</div><div className="mt-1 text-[9px] font-black text-white/72">{value}</div></div>;
}

export function CodexScreen({ onBack }: { onBack: () => void }) {
  const { language } = useLanguage();
  const de = language === 'de';
  const [tab, setTab] = useState<Tab>('beasts');
  const [retention, setRetention] = useState(() => loadRetentionProfile());
  const [selected, setSelected] = useState<Record<Tab, string>>({
    beasts: CODEX_BEASTS[0].id,
    hunts: CODEX_HUNTS[0].id,
    wardens: CODEX_WARDENS[0].id,
    relics: Object.keys(VEIL_RELICS)[0],
    equipment: Object.values(EQUIPMENT).find(item => item.active)?.id ?? 'ash-bow',
  });
  const relics = useMemo(() => loadVeilRelicProfile(), []);
  const meta = useMemo(() => loadMetaProgression(), []);
  const equipment = useMemo(() => Object.values(EQUIPMENT).filter(item => item.active), []);

  useEffect(() => {
    const refresh = () => setRetention(loadRetentionProfile());
    window.addEventListener('dungeon-veil-retention-update', refresh);
    window.addEventListener('dungeon-veil-cloud-save-restored', refresh);
    return () => {
      window.removeEventListener('dungeon-veil-retention-update', refresh);
      window.removeEventListener('dungeon-veil-cloud-save-restored', refresh);
    };
  }, []);

  const counts = {
    beasts: CODEX_BEASTS.filter(entry => retention.codex.enemies.includes(entry.familyId)).length,
    hunts: CODEX_HUNTS.filter(entry => retention.codex.hunts.includes(entry.nameDe)).length,
    wardens: CODEX_WARDENS.filter(entry => retention.codex.bosses.includes(entry.discoveryKey)).length,
    relics: Object.values(VEIL_RELICS).filter(relic => relics.owned.includes(relic.id)).length,
    equipment: equipment.filter(item => Boolean(meta.owned[item.id])).length,
  };
  const totals = { beasts: CODEX_BEASTS.length, hunts: CODEX_HUNTS.length, wardens: CODEX_WARDENS.length, relics: Object.keys(VEIL_RELICS).length, equipment: equipment.length };
  const labels: Record<Tab, Copy> = {
    beasts: { de: 'BESTIEN', en: 'BEASTS' }, hunts: { de: 'JAGD', en: 'HUNTS' }, wardens: { de: 'WÄCHTER', en: 'WARDENS' },
    relics: { de: 'RELIKTE', en: 'RELICS' }, equipment: { de: 'AUSRÜSTUNG', en: 'EQUIPMENT' },
  };
  const select = (id: string) => setSelected(current => ({ ...current, [tab]: id }));
  const cardCopy = { lockedLabel: pick(COPY.locked, de), openLabel: pick(COPY.detailShow, de), openedLabel: pick(COPY.detailOpen, de), hintLabel: pick(COPY.silhouetteHint, de) };

  const cards = (() => {
    if (tab === 'beasts') return CODEX_BEASTS.map(entry => {
      const known = retention.codex.enemies.includes(entry.familyId);
      const kills = retention.codex.enemyKills[entry.familyId] ?? 0;
      return <CodexCard {...cardCopy} key={entry.id} id={entry.id} selected={selected.beasts === entry.id} known={known}
        title={de ? entry.nameDe : entry.nameEn} eyebrow={de ? entry.kindDe : entry.kindEn}
        counter={`${pick(COPY.defeats, de)} · ${kills}`}
        artwork={<EnemyArtwork enemyType={entry.enemyType} room={entry.room} locked={!known} accent="#a98be9" className="h-16 w-16 shrink-0" />}
        onSelect={() => select(entry.id)} />;
    });
    if (tab === 'hunts') return CODEX_HUNTS.map((entry, index) => {
      const known = retention.codex.hunts.includes(entry.nameDe);
      return <CodexCard {...cardCopy} key={entry.id} id={entry.id} selected={selected.hunts === entry.id} known={known} title={de ? entry.nameDe : entry.nameEn} eyebrow={de ? 'SELTENES JAGDZIEL' : 'RARE HUNT TARGET'} artwork={<RelicArtwork relicId="marked-claw" locked={!known} accent={HUNT_ACCENTS[index]} className="h-16 w-16 shrink-0" />} onSelect={() => select(entry.id)} />;
    });
    if (tab === 'wardens') return CODEX_WARDENS.map(entry => {
      const known = retention.codex.bosses.includes(entry.discoveryKey);
      return <CodexCard {...cardCopy} key={entry.id} id={entry.id} selected={selected.wardens === entry.id} known={known} title={de ? entry.nameDe : entry.nameEn} eyebrow={de ? entry.areaDe : entry.areaEn} artwork={<EnemyArtwork enemyType="boss" room={entry.room} locked={!known} accent="#d88972" className="h-16 w-16 shrink-0" />} onSelect={() => select(entry.id)} />;
    });
    if (tab === 'relics') return Object.values(VEIL_RELICS).map(relic => {
      const known = relics.owned.includes(relic.id);
      return <CodexCard {...cardCopy} key={relic.id} id={relic.id} selected={selected.relics === relic.id} known={known} title={de ? relic.nameDe : relic.nameEn} eyebrow={SOURCE_LABELS[relic.source][de ? 'de' : 'en']} artwork={<RelicArtwork relicId={relic.id} locked={!known} accent={relic.accent} className="h-16 w-16 shrink-0" />} onSelect={() => select(relic.id)} />;
    });
    return equipment.map(item => {
      const known = Boolean(meta.owned[item.id]);
      return <CodexCard {...cardCopy} key={item.id} id={item.id} selected={selected.equipment === item.id} known={known} title={de ? item.nameDe : item.nameEn} eyebrow={RARITY_LABELS[item.rarity][de ? 'de' : 'en']} artwork={<EquipmentArtwork itemId={item.id} locked={!known} accent={item.accent} className="h-16 w-16 shrink-0" />} onSelect={() => select(item.id)} />;
    });
  })();

  const detail = (() => {
    if (tab === 'beasts') {
      const entry = CODEX_BEASTS.find(candidate => candidate.id === selected.beasts) ?? CODEX_BEASTS[0];
      const known = retention.codex.enemies.includes(entry.familyId);
      const kills = retention.codex.enemyKills[entry.familyId] ?? 0;
      return <><div>{known ? <CodexModelPreview enemyType={entry.enemyType} room={entry.room} accent="#a98be9" /> : <div className="grid min-h-[250px] place-items-center rounded-[1.75rem] border border-white/7 bg-black/32"><EnemyArtwork enemyType={entry.enemyType} room={entry.room} locked className="h-36 w-36" /></div>}</div><div className="mt-4 flex items-start justify-between gap-3"><div><div className="text-[7px] font-black tracking-[.2em] text-violet-100/38">{known ? (de ? entry.kindDe : entry.kindEn) : (de ? 'UNENTDECKTE BESTIE' : 'UNDISCOVERED BEAST')}</div><h2 className="mt-1.5 text-xl font-black">{known ? (de ? entry.nameDe : entry.nameEn) : '???'}</h2></div><span className="rounded-full border border-white/8 bg-black/30 px-3 py-1 text-[7px] font-black text-white/42">{known ? (de ? entry.areaDe : entry.areaEn) : `${pick(COPY.room, de)} ${entry.room}+`}</span></div><p className="mt-3 text-[11px] leading-relaxed text-white/58">{known ? (de ? entry.descriptionDe : entry.descriptionEn) : (de ? entry.hintDe : entry.hintEn)}</p>{known && <p className="mt-2 text-[9px] leading-relaxed text-violet-100/48">{de ? entry.mechanicDe : entry.mechanicEn}</p>}<div className="mt-4 grid grid-cols-2 gap-2"><Fact label={pick(COPY.type, de)} value={known ? (de ? entry.kindDe : entry.kindEn) : '???'} /><Fact label={pick(COPY.defeats, de)} value={known ? String(kills) : '—'} /><Fact label={pick(COPY.firstSighting, de)} value={`${pick(COPY.room, de)} ${entry.room}`} /><Fact label={pick(COPY.mechanic, de)} value={known ? (de ? entry.mechanicDe : entry.mechanicEn) : '???'} /></div></>;
    }
    if (tab === 'wardens') {
      const entry = CODEX_WARDENS.find(candidate => candidate.id === selected.wardens) ?? CODEX_WARDENS[0];
      const known = retention.codex.bosses.includes(entry.discoveryKey);
      return <>{known ? <CodexModelPreview enemyType="boss" room={entry.room} accent="#d88972" /> : <div className="grid min-h-[250px] place-items-center rounded-[1.75rem] border border-white/7 bg-black/32"><EnemyArtwork enemyType="boss" room={entry.room} locked className="h-36 w-36" /></div>}<div className="mt-4"><div className="text-[7px] font-black tracking-[.2em] text-red-100/38">{known ? (de ? entry.kindDe : entry.kindEn) : (de ? 'UNBEKANNTER WÄCHTER' : 'UNKNOWN WARDEN')}</div><h2 className="mt-1.5 text-xl font-black">{known ? (de ? entry.nameDe : entry.nameEn) : '???'}</h2></div><p className="mt-3 text-[11px] leading-relaxed text-white/58">{known ? (de ? entry.descriptionDe : entry.descriptionEn) : (de ? entry.hintDe : entry.hintEn)}</p><div className="mt-4 grid grid-cols-2 gap-2"><Fact label={pick(COPY.arena, de)} value={de ? entry.areaDe : entry.areaEn} /><Fact label={pick(COPY.room, de)} value={String(entry.room)} /></div></>;
    }
    if (tab === 'hunts') {
      const index = Math.max(0, CODEX_HUNTS.findIndex(candidate => candidate.id === selected.hunts));
      const entry = CODEX_HUNTS[index] ?? CODEX_HUNTS[0];
      const known = retention.codex.hunts.includes(entry.nameDe);
      return <><div className="grid min-h-[250px] place-items-center rounded-[1.75rem] border border-amber-200/10 bg-[radial-gradient(circle_at_50%_38%,rgba(230,169,74,.13),rgba(5,3,10,.96)_72%)]"><RelicArtwork relicId="marked-claw" locked={!known} accent={HUNT_ACCENTS[index]} className="h-36 w-36" /></div><div className="mt-4"><div className="text-[7px] font-black tracking-[.2em] text-amber-100/38">{known ? (de ? 'JAGDZIEL BESIEGT' : 'HUNT TARGET DEFEATED') : (de ? 'UNBEKANNTES JAGDZEICHEN' : 'UNKNOWN HUNT MARK')}</div><h2 className="mt-1.5 text-xl font-black">{known ? (de ? entry.nameDe : entry.nameEn) : '???'}</h2></div><p className="mt-3 text-[11px] leading-relaxed text-white/58">{known ? (de ? entry.descriptionDe : entry.descriptionEn) : (de ? entry.hintDe : entry.hintEn)}</p><div className="mt-4 grid grid-cols-2 gap-2"><Fact label={pick(COPY.form, de)} value={pick(COPY.varies, de)} /><Fact label={pick(COPY.source, de)} value={pick(COPY.rareHunt, de)} /></div></>;
    }
    if (tab === 'relics') {
      const id = selected.relics as VeilRelicId;
      const relic = VEIL_RELICS[id] ?? Object.values(VEIL_RELICS)[0];
      const known = relics.owned.includes(relic.id);
      return <><div className="grid min-h-[250px] place-items-center rounded-[1.75rem] border border-violet-200/12 bg-[radial-gradient(circle_at_50%_38%,rgba(139,92,246,.15),rgba(5,3,10,.96)_72%)]"><RelicArtwork relicId={relic.id} locked={!known} accent={relic.accent} className="h-36 w-36" /></div><div className="mt-4"><div className="text-[7px] font-black tracking-[.2em]" style={{ color: known ? relic.accent : 'rgba(255,255,255,.25)' }}>{known ? SOURCE_LABELS[relic.source][de ? 'de' : 'en'] : (de ? 'UNENTDECKTES RELIKT' : 'UNDISCOVERED RELIC')}</div><h2 className="mt-1.5 text-xl font-black">{known ? (de ? relic.nameDe : relic.nameEn) : '???'}</h2></div><p className="mt-3 text-[11px] leading-relaxed text-white/58">{known ? (de ? relic.descriptionDe : relic.descriptionEn) : (de ? 'Berge dieses Relikt aus der angegebenen Quelle, um seinen Effekt zu enthüllen.' : 'Recover this relic from its listed source to reveal its effect.')}</p><div className="mt-4 grid grid-cols-2 gap-2"><Fact label={pick(COPY.source, de)} value={SOURCE_LABELS[relic.source][de ? 'de' : 'en']} /><Fact label={pick(COPY.status, de)} value={known ? (relics.equipped === relic.id ? (de ? 'AKTIV' : 'ACTIVE') : (de ? 'GEBORGEN' : 'RECOVERED')) : (de ? 'GESPERRT' : 'LOCKED')} /></div></>;
    }
    const id = selected.equipment as EquipmentId;
    const item = EQUIPMENT[id] ?? equipment[0];
    const progress = item ? meta.owned[item.id] : undefined;
    const known = Boolean(progress);
    return item ? <><div className="grid min-h-[250px] place-items-center rounded-[1.75rem] border border-white/8 bg-[radial-gradient(circle_at_50%_38%,rgba(230,195,122,.1),rgba(5,3,10,.96)_72%)]"><EquipmentArtwork itemId={item.id} locked={!known} accent={item.accent} className="h-36 w-36" /></div><div className="mt-4"><div className="text-[7px] font-black tracking-[.2em]" style={{ color: known ? item.accent : 'rgba(255,255,255,.25)' }}>{known ? RARITY_LABELS[item.rarity][de ? 'de' : 'en'] : (de ? 'UNENTDECKTE AUSRÜSTUNG' : 'UNDISCOVERED EQUIPMENT')}</div><h2 className="mt-1.5 text-xl font-black">{known ? (de ? item.nameDe : item.nameEn) : '???'}</h2></div><p className="mt-3 text-[11px] leading-relaxed text-white/58">{known ? (de ? item.descriptionDe : item.descriptionEn) : (de ? `Dieses Ausrüstungsteil wird ab Rang ${item.unlockRank} über seine reguläre Quelle sichtbar.` : `This equipment becomes visible from rank ${item.unlockRank} through its normal source.`)}</p><div className="mt-4 grid grid-cols-2 gap-2"><Fact label="LEVEL" value={known ? String(progress?.level ?? 1) : '—'} /><Fact label={pick(COPY.rarity, de)} value={RARITY_LABELS[item.rarity][de ? 'de' : 'en']} /></div></> : null;
  })();

  return <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#080706] text-white">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(104,74,168,.2),transparent_45%),linear-gradient(180deg,#0e0b0a,#080706_70%)]" />
    <div className="relative mx-auto min-h-full max-w-6xl px-4 pb-[max(28px,calc(env(safe-area-inset-bottom)+18px))] pt-[max(24px,calc(env(safe-area-inset-top)+10px))] md:px-6">
      <header className="flex items-start gap-3"><button data-testid="codex-back" aria-label={de ? 'Zurück' : 'Back'} type="button" onPointerDown={event => { event.preventDefault(); onBack(); }} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/12 bg-black/45 text-2xl text-white/70 active:scale-95">‹</button><div><div className="text-[8px] font-black uppercase tracking-[.42em] text-violet-200/45">DUNGEON VEIL</div><h1 className="mt-1 font-serif text-[2.2rem] leading-none tracking-[.08em] text-[#e7c37a]">{de ? 'KODEX' : 'CODEX'}</h1><p className="mt-2 text-[8px] uppercase tracking-[.18em] text-white/35">{de ? 'WAS DU HINTER DEM SCHLEIER ENTDECKT HAST' : 'WHAT YOU DISCOVERED BEYOND THE VEIL'}</p></div></header>
      <div data-testid="codex-tabs" className="mt-5 grid grid-cols-5 gap-1.5 md:gap-2">{TAB_ORDER.map(key => <button key={key} data-testid={`codex-tab-${key}`} type="button" aria-pressed={tab === key} onPointerDown={event => { event.preventDefault(); setTab(key); }} className={'min-h-11 rounded-xl border px-1 py-2.5 text-[6px] font-black tracking-[.08em] md:text-[8px] ' + (tab === key ? 'border-amber-300/40 bg-amber-400/12 text-amber-100' : 'border-white/8 bg-black/38 text-white/35')}><div>{labels[key][de ? 'de' : 'en']}</div><div data-testid={`codex-count-${key}`} className="mt-1 text-[7px] md:text-[9px]">{counts[key]}/{totals[key]}</div></button>)}</div>
      <section data-testid="codex-responsive-layout" className="mt-4 grid items-start gap-3 md:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)] md:gap-4">
        <div data-testid="codex-card-grid" className="order-2 grid content-start gap-2 sm:grid-cols-2 md:order-1">{cards}</div>
        <aside data-testid="codex-detail-panel" className="order-1 rounded-3xl border border-white/10 bg-black/48 p-4 shadow-2xl backdrop-blur-xl md:sticky md:top-4 md:order-2">{detail}</aside>
      </section>
    </div>
  </div>;
}
