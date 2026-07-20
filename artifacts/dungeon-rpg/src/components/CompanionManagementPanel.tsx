import { useEffect, useLayoutEffect, useState } from 'react';
import type { CompanionRoleV4 } from '../game/companionReserveV4';
import {
  COMPANION_COLLECTION_EVENT,
  COMPANION_DEFINITIONS_V5,
  COMPANION_MAX_LEVEL_V5,
  companionCanBeFoundV5,
  loadCompanionCollectionV5,
  nextCompanionUpgradeCostV5,
  selectCompanionV5,
  unlockCompanionV5,
  upgradeCompanionV5,
} from '../game/companionCollectionV5';
import { COMPANION_ROLE_ORDER_V4 } from '../game/companionSelectionV4';
import { loadMetaProgression } from '../game/metaProgression';
import { loadPlayerProfile, PLAYER_PROFILE_EVENT } from '../game/playerProfile';

const ROLE_TONE: Readonly<Record<CompanionRoleV4, string>> = {
  'single-target': 'border-cyan-200/30 bg-cyan-400/[.08] text-cyan-100',
  'critical-support': 'border-amber-200/30 bg-amber-400/[.08] text-amber-100',
  shield: 'border-emerald-200/30 bg-emerald-400/[.08] text-emerald-100',
  'loot-comfort': 'border-yellow-200/30 bg-yellow-400/[.08] text-yellow-100',
  distraction: 'border-violet-200/30 bg-violet-400/[.08] text-violet-100',
};

type Props = {
  language?: 'de' | 'en';
  embedded?: boolean;
};

function CompanionPortrait({ role, locked = false }: { role: CompanionRoleV4; locked?: boolean }) {
  const definition = COMPANION_DEFINITIONS_V5[role];
  const common = 'relative h-[74px] w-[74px] drop-shadow-[0_14px_20px_rgba(0,0,0,.55)]';
  return <div className={`relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[22px] border ${ROLE_TONE[role]} ${locked ? 'grayscale opacity-45' : ''}`}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,.16),transparent_48%)]" />
    {definition.species === 'veil-lynx' && <svg viewBox="0 0 120 120" aria-hidden="true" className={common}>
      <path d="M22 21 43 38l17-6 17 6 21-17-7 34c6 8 9 17 9 28 0 22-18 35-40 35S20 105 20 83c0-11 3-20 9-28l-7-34Z" fill="#151725" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M34 75c10-8 18-11 26-11s16 3 26 11l-7 20-19 13-19-13-7-20Z" fill="#243447"/>
      <path d="m39 77 13 5M81 77l-13 5M51 94l9 5 9-5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round"/>
      <circle cx="47" cy="72" r="3.4" fill="#e9fbff"/><circle cx="73" cy="72" r="3.4" fill="#e9fbff"/>
    </svg>}
    {definition.species === 'ember-raven' && <svg viewBox="0 0 120 120" aria-hidden="true" className={common}>
      <path d="M60 19c18 0 29 13 29 31 0 9-3 16-8 22l18 17-27-7-12 26-12-26-27 7 18-17c-5-6-8-13-8-22 0-18 11-31 29-31Z" fill="#1b1720" stroke="currentColor" strokeWidth="3"/>
      <path d="m59 42 25 13-24 8-19-8 18-13Z" fill="#43261f"/>
      <path d="M35 55 13 68l28 4M85 55l22 13-28 4" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/>
      <circle cx="51" cy="48" r="3" fill="#fff0d6"/><circle cx="69" cy="48" r="3" fill="#fff0d6"/>
    </svg>}
    {definition.species === 'rune-sentinel' && <svg viewBox="0 0 120 120" aria-hidden="true" className={common}>
      <path d="M38 19h44l10 25-8 18 9 39-33 14-33-14 9-39-8-18 10-25Z" fill="#1a2626" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M43 43h34l7 18-24 22-24-22 7-18Z" fill="#294139"/>
      <path d="m60 34 8 14-8 12-8-12 8-14ZM43 90h34" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/>
      <circle cx="49" cy="58" r="3" fill="#e9fff2"/><circle cx="71" cy="58" r="3" fill="#e9fff2"/>
    </svg>}
    {definition.species === 'lantern-wisp' && <svg viewBox="0 0 120 120" aria-hidden="true" className={common}>
      <circle cx="60" cy="59" r="31" fill="#252218" stroke="currentColor" strokeWidth="3"/>
      <circle cx="60" cy="59" r="18" fill="currentColor" opacity=".32"/>
      <path d="M60 14 68 31 60 39 52 31 60 14ZM60 104l-8-17 8-8 8 8-8 17ZM15 59l17-8 8 8-8 8-17-8ZM105 59l-17 8-8-8 8-8 17 8Z" fill="currentColor" opacity=".7"/>
      <path d="M48 61c8-7 16-7 24 0M52 73c5 4 11 4 16 0" fill="none" stroke="#fff8d8" strokeWidth="3" strokeLinecap="round"/>
    </svg>}
    {definition.species === 'dusk-drake' && <svg viewBox="0 0 120 120" aria-hidden="true" className={common}>
      <path d="M60 20 78 33l21-8-10 24 12 20-24-3-17 36-17-36-24 3 12-20-10-24 21 8 18-13Z" fill="#20182d" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M42 54c11-8 25-8 36 0l-5 25-13 14-13-14-5-25Z" fill="#382450"/>
      <path d="m45 56 12 7M75 56l-12 7M53 80l7 5 7-5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round"/>
      <circle cx="50" cy="55" r="3.2" fill="#f4eaff"/><circle cx="70" cy="55" r="3.2" fill="#f4eaff"/>
    </svg>}
    <span className="absolute bottom-1.5 right-1.5 grid h-6 min-w-6 place-items-center rounded-full border border-white/12 bg-black/72 px-1 text-xs font-black text-current">{locked ? '◆' : definition.glyph}</span>
  </div>;
}

export function CompanionManagementPanel({ language = 'de', embedded = false }: Props) {
  const de = language === 'de';
  const [collection, setCollection] = useState(loadCompanionCollectionV5);
  const [meta, setMeta] = useState(loadMetaProgression);
  const [highestChapter, setHighestChapter] = useState(() => loadPlayerProfile().stats.highestChapter);
  const [notice, setNotice] = useState('');

  useLayoutEffect(() => {
    if (!embedded) return;
    const copy = document.querySelector('[data-testid="equipment-permanent-progression-copy"]');
    const progressionSummary = copy?.closest('section') as HTMLElement | null;
    if (!progressionSummary) return;
    const previousDisplay = progressionSummary.style.display;
    progressionSummary.style.display = 'none';
    progressionSummary.dataset.hiddenForCompanion = 'true';
    return () => {
      progressionSummary.style.display = previousDisplay;
      delete progressionSummary.dataset.hiddenForCompanion;
    };
  }, [embedded]);

  useEffect(() => {
    const refreshCollection = () => setCollection(loadCompanionCollectionV5());
    const refreshMeta = () => setMeta(loadMetaProgression());
    const refreshProfile = () => setHighestChapter(loadPlayerProfile().stats.highestChapter);
    window.addEventListener(COMPANION_COLLECTION_EVENT, refreshCollection);
    window.addEventListener('dungeon-veil-meta-changed', refreshMeta);
    window.addEventListener(PLAYER_PROFILE_EVENT, refreshProfile);
    return () => {
      window.removeEventListener(COMPANION_COLLECTION_EVENT, refreshCollection);
      window.removeEventListener('dungeon-veil-meta-changed', refreshMeta);
      window.removeEventListener(PLAYER_PROFILE_EVENT, refreshProfile);
    };
  }, []);

  const refresh = () => {
    setCollection(loadCompanionCollectionV5());
    setMeta(loadMetaProgression());
    setHighestChapter(loadPlayerProfile().stats.highestChapter);
  };
  const active = collection.activeId ? COMPANION_DEFINITIONS_V5[collection.activeId] : null;
  const activeProgress = collection.activeId ? collection.companions[collection.activeId] : null;
  const unlockedCount = COMPANION_ROLE_ORDER_V4.filter(role => collection.companions[role]).length;
  const shellClass = embedded
    ? 'text-white'
    : 'max-h-[min(78vh,780px)] overflow-y-auto overscroll-contain rounded-3xl border border-violet-200/16 bg-[#111019]/98 p-4 text-white shadow-2xl [-webkit-overflow-scrolling:touch] md:p-6';

  return <section
    data-testid="companion-management-panel"
    data-embedded={embedded ? 'true' : 'false'}
    data-companion-species={active?.species ?? 'none'}
    data-selection-surface="pre-run-only"
    className={shellClass}
  >
    <header className="flex items-end justify-between gap-3">
      <div>
        <div className="text-[7px] font-black uppercase tracking-[.3em] text-violet-100/42">{de ? 'BEGLEITER-SAMMLUNG' : 'COMPANION COLLECTION'}</div>
        <h2 className="mt-1 text-2xl font-black text-violet-50">{de ? 'Gefährten des Schleiers' : 'Allies of the Veil'}</h2>
        <p className="mt-1.5 max-w-2xl text-[9px] leading-relaxed text-white/46">{de ? 'Jeder Begleiter muss gefunden werden. Auswahl und Verbesserung gelten erst für den nächsten Run.' : 'Every companion must be found. Selection and upgrades apply to the next run.'}</p>
      </div>
      <div className="shrink-0 rounded-2xl border border-violet-200/14 bg-black/28 px-3 py-2 text-right"><div className="text-[6px] font-black uppercase tracking-[.18em] text-white/36">{de ? 'SCHLEIERSTAUB' : 'VEIL DUST'}</div><div className="mt-0.5 text-sm font-black text-violet-100">{meta.dust.toLocaleString(de ? 'de-DE' : 'en-US')}</div></div>
    </header>

    <article data-testid="companion-active-role" data-companion-role={collection.activeId ?? 'none'} className="mt-3 rounded-[24px] border border-violet-200/22 bg-[radial-gradient(circle_at_12%_10%,rgba(139,92,246,.2),rgba(255,255,255,.025)_58%)] p-3">
      {active && activeProgress ? <div className="grid grid-cols-[80px_minmax(0,1fr)] items-center gap-3">
        <CompanionPortrait role={active.id} />
        <div className="min-w-0">
          <div className="text-[7px] font-black uppercase tracking-[.2em] text-violet-100/42">{de ? 'FÜR DEN NÄCHSTEN RUN AKTIV' : 'ACTIVE FOR THE NEXT RUN'}</div>
          <div className="mt-1 text-lg font-black text-white">{active.nameDe} <span className="text-white/46">· {de ? active.titleDe : active.titleEn}</span></div>
          <div className="mt-1 text-[8px] leading-relaxed text-white/48">{de ? active.bonusDe : active.bonusEn}</div>
          <div className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[7px] font-black ${ROLE_TONE[active.id]}`}>{de ? 'STUFE' : 'LEVEL'} {activeProgress.level} / {COMPANION_MAX_LEVEL_V5}</div>
        </div>
      </div> : <div className="py-4 text-center"><div className="text-lg font-black text-white/82">{de ? 'Noch kein Begleiter gefunden' : 'No companion found yet'}</div><div className="mt-1 text-[8px] text-white/42">{de ? 'Der erste seltene Fund wird ab Kapitel 2 verfügbar.' : 'The first rare find becomes available from chapter 2.'}</div></div>}
    </article>

    {notice && <div className="mt-2 rounded-xl border border-violet-200/14 bg-violet-400/[.07] px-3 py-2 text-[8px] font-bold text-violet-100/78">{notice}</div>}

    <div className="mt-3 flex items-center justify-between">
      <div className="text-[7px] font-black uppercase tracking-[.2em] text-white/38">{de ? 'FUNDE UND VERBESSERUNGEN' : 'FINDS AND UPGRADES'}</div>
      <div data-testid="companion-reserve-count" className="text-[7px] font-black text-white/38">{unlockedCount} / {COMPANION_ROLE_ORDER_V4.length} {de ? 'GEFUNDEN' : 'FOUND'}</div>
    </div>

    <div data-testid="companion-reserve-grid" className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {COMPANION_ROLE_ORDER_V4.map(role => {
        const definition = COMPANION_DEFINITIONS_V5[role];
        const progress = collection.companions[role];
        const eligible = companionCanBeFoundV5(role, highestChapter);
        const selected = collection.activeId === role;
        const upgradeCost = progress ? nextCompanionUpgradeCostV5(role) : null;
        return <article key={role} data-testid={`companion-role-${role}`} data-unlocked={progress ? 'true' : 'false'} data-selected={selected ? 'true' : 'false'} className={`rounded-[22px] border p-3 ${progress ? ROLE_TONE[role] : 'border-white/[.08] bg-black/24 text-white/48'}`}>
          <div className="flex items-start gap-3">
            <CompanionPortrait role={role} locked={!progress} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2"><div><div className="text-sm font-black text-white/92">{definition.nameDe}</div><div className="text-[7px] font-black uppercase tracking-[.14em] text-current/70">{de ? definition.titleDe : definition.titleEn}</div></div>{progress && <span className="rounded-full border border-white/10 bg-black/28 px-2 py-1 text-[7px] font-black">{de ? 'ST.' : 'LV.'} {progress.level}</span>}</div>
              <p className="mt-2 text-[7px] leading-relaxed text-white/45">{de ? definition.bonusDe : definition.bonusEn}</p>
              {!progress && <div className="mt-2 text-[7px] font-black uppercase tracking-[.12em] text-white/38">{eligible ? (de ? 'SELTENER FUND VERFÜGBAR' : 'RARE FIND AVAILABLE') : `${de ? 'AB KAPITEL' : 'FROM CHAPTER'} ${definition.unlockChapter}`}</div>}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {!progress && <button type="button" disabled={!eligible} onPointerDown={event => { event.preventDefault(); if (!eligible) return; unlockCompanionV5(role); setNotice(de ? `${definition.nameDe} wurde gefunden und kann vor dem Run gewählt werden.` : `${definition.nameEn} was found and can be selected before a run.`); refresh(); }} className="col-span-2 rounded-xl border border-white/12 bg-white/[.06] px-3 py-2 text-[8px] font-black uppercase tracking-[.1em] text-white/76 disabled:opacity-30">{eligible ? (de ? 'FUND BEANSPRUCHEN' : 'CLAIM FIND') : `${de ? 'GESPERRT' : 'LOCKED'} · ${definition.unlockChapter}`}</button>}
            {progress && <button type="button" disabled={selected} onPointerDown={event => { event.preventDefault(); selectCompanionV5(role); setNotice(de ? `${definition.nameDe} begleitet den nächsten Run.` : `${definition.nameEn} will join the next run.`); refresh(); }} className="rounded-xl border border-white/12 bg-black/28 px-2 py-2 text-[8px] font-black uppercase tracking-[.08em] text-white/76 disabled:border-emerald-200/20 disabled:text-emerald-200/70">{selected ? (de ? 'AUSGEWÄHLT' : 'SELECTED') : (de ? 'AUSWÄHLEN' : 'SELECT')}</button>}
            {progress && <button type="button" disabled={upgradeCost === null} onPointerDown={event => { event.preventDefault(); const result = upgradeCompanionV5(role); if (!result.ok) setNotice(result.reason === 'dust' ? (de ? `Nicht genug Schleierstaub. Benötigt: ${result.cost}.` : `Not enough Veil Dust. Required: ${result.cost}.`) : (de ? 'Maximale Stufe erreicht.' : 'Maximum level reached.')); else setNotice(de ? `${definition.nameDe} wurde auf Stufe ${result.state.companions[role]?.level} verbessert.` : `${definition.nameEn} reached level ${result.state.companions[role]?.level}.`); refresh(); }} className="rounded-xl border border-white/12 bg-white/[.06] px-2 py-2 text-[8px] font-black uppercase tracking-[.08em] text-white/76 disabled:opacity-35">{upgradeCost === null ? (de ? 'MAXIMAL' : 'MAXED') : `${de ? 'VERBESSERN' : 'UPGRADE'} · ${upgradeCost}`}</button>}
          </div>
        </article>;
      })}
    </div>
  </section>;
}
