import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { SaveData } from '../../game/saveManager';
import { loadMetaProgression } from '../../game/metaProgression';
import { clearWeeklyRiftRun } from '../../game/weeklyRiftRun';
import { loadRetentionProfile, type RetentionProfile } from '../../game/runRetention';
import { MainMenuDungeonScene } from '../MainMenuDungeonScene';
import { DailyQuestPanel } from '../DailyQuestPanel';
import { WeeklyRiftPanel } from '../WeeklyRiftPanel';
import { CodexScreen } from './CodexScreen';

interface Props {
  saveData: SaveData | null;
  onNewGame: () => void;
  onContinue: () => void;
  onVeilChamber: () => void;
  onSettings: () => void;
  onCredits: () => void;
}

type SidePanel = 'daily' | 'rift' | null;

export function MainMenuScreen(props: Props) {
  const { t, language } = useLanguage();
  const [meta, setMeta] = useState(loadMetaProgression);
  const [retention, setRetention] = useState<RetentionProfile>(loadRetentionProfile);
  const [codexOpen, setCodexOpen] = useState(false);
  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
  const gifts = props.saveData
    ? Object.entries(props.saveData.runSkills ?? {}).reduce((sum, [key, value]) => key === 'heal' ? sum : sum + (value ?? 0), 0)
    : 0;

  useEffect(() => {
    const refreshMeta = () => setMeta(loadMetaProgression());
    const refreshRetention = (event?: Event) => setRetention((event as CustomEvent<RetentionProfile> | undefined)?.detail ?? loadRetentionProfile());
    window.addEventListener('dungeon-veil-meta-changed', refreshMeta);
    window.addEventListener('dungeon-veil-retention-update', refreshRetention as EventListener);
    return () => {
      window.removeEventListener('dungeon-veil-meta-changed', refreshMeta);
      window.removeEventListener('dungeon-veil-retention-update', refreshRetention as EventListener);
    };
  }, []);

  if (codexOpen) return <CodexScreen onBack={() => setCodexOpen(false)} />;

  const button = (label: string, action: () => void, subtitle?: string, kind: 'normal' | 'primary' | 'chamber' = 'normal', disabled = false) => {
    const kindClass = kind === 'primary'
      ? 'border-amber-300/50 bg-amber-900/45 text-amber-100'
      : kind === 'chamber'
        ? 'border-violet-300/25 bg-violet-950/50 text-violet-100'
        : 'border-white/10 bg-black/55 text-white/82';
    return (
      <button type="button" disabled={disabled} onPointerDown={event => { event.preventDefault(); if (!disabled) action(); }} className={`w-full rounded-2xl border px-5 py-3.5 text-left backdrop-blur-xl active:scale-[.975] ${kindClass} ${disabled ? 'opacity-35' : ''}`}>
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1"><div className="text-[15px] font-black tracking-[.14em]">{label}</div>{subtitle && <div className="mt-1 truncate text-[9px] uppercase tracking-[.14em] text-white/38">{subtitle}</div>}</div>
          {!disabled && <span className="text-xl opacity-45">›</span>}
        </div>
      </button>
    );
  };

  const startNormalRun = () => {
    clearWeeklyRiftRun();
    props.onNewGame();
  };
  const continueText = props.saveData
    ? language === 'de'
      ? `Kapitel ${props.saveData.chapter ?? 1} · Raum ${props.saveData.floor} · ${gifts} Gaben`
      : `Chapter ${props.saveData.chapter ?? 1} · Room ${props.saveData.floor} · ${gifts} gifts`
    : t.noSave;

  return (
    <div className="fixed inset-0 z-50 select-none overflow-hidden bg-[#070706] text-white">
      <MainMenuDungeonScene />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-black/20 to-black" />

      <button type="button" onPointerDown={event => { event.preventDefault(); setSidePanel('daily'); }} className="absolute left-3 top-[42%] z-20 grid h-12 w-12 place-items-center rounded-full border border-amber-300/30 bg-black/70 shadow-xl backdrop-blur-xl active:scale-95">
        <span className="text-lg text-amber-200">✦</span>
        <span className="absolute -right-1 -top-1 rounded-full border border-amber-200/30 bg-amber-500/90 px-1.5 py-0.5 text-[7px] font-black text-black">{retention.daily.claimed.length}/3</span>
      </button>
      <button type="button" onPointerDown={event => { event.preventDefault(); setSidePanel('rift'); }} className="absolute right-3 top-[42%] z-20 grid h-12 w-12 place-items-center rounded-full border border-violet-300/30 bg-black/70 shadow-xl backdrop-blur-xl active:scale-95">
        <span className="text-xl text-violet-200">◈</span>
      </button>

      <div className="relative flex h-full flex-col px-5 pb-[max(22px,calc(env(safe-area-inset-bottom)+8px))] pt-[max(30px,calc(env(safe-area-inset-top)+8px))]">
        <header className="text-center">
          <div className="text-[8px] font-black uppercase tracking-[.52em] text-amber-200/48">{language === 'de' ? 'BETRITT DEN SCHLEIER' : 'ENTER THE VEIL'}</div>
          <h1 className="mt-2 font-serif text-[clamp(2.65rem,11.5vw,4.05rem)] font-black leading-[.88] tracking-[.08em] text-[#e4b14e]">DUNGEON<br />VEIL</h1>
          <p className="mt-3 text-[8px] uppercase tracking-[.32em] text-white/34">{t.subtitle}</p>
        </header>
        <div className="flex-1" />
        <div className="mx-auto max-h-[55dvh] w-full max-w-sm space-y-2.5 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ touchAction: 'pan-y' }}>
          {button(t.newGame, startNormalRun, undefined, 'primary')}
          {button(t.continueGame, props.onContinue, continueText, 'normal', !props.saveData)}
          {button(language === 'de' ? 'Schleierkammer' : 'Veil Chamber', props.onVeilChamber, language === 'de' ? `Rang ${meta.rank} · ${meta.dust} Schleierstaub` : `Rank ${meta.rank} · ${meta.dust} Veil Dust`, 'chamber')}
          {button(language === 'de' ? 'Kodex' : 'Codex', () => setCodexOpen(true), language === 'de' ? 'Bestien · Jagd · Wächter · Relikte' : 'Beasts · Hunts · Wardens · Relics')}
          <div className="grid grid-cols-2 gap-2.5">{button(t.settings, props.onSettings)}{button(t.credits, props.onCredits)}</div>
        </div>
      </div>

      {sidePanel && <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/72 px-5 backdrop-blur-md" onPointerDown={() => setSidePanel(null)}>
        <div className="w-full max-w-sm" onPointerDown={event => event.stopPropagation()}>
          {sidePanel === 'daily' ? <DailyQuestPanel /> : <WeeklyRiftPanel language={language} />}
          <button type="button" onPointerDown={event => { event.preventDefault(); setSidePanel(null); }} className="mt-3 w-full rounded-2xl border border-white/10 bg-black/70 py-3 text-[9px] font-black uppercase tracking-[.2em] text-white/55">{language === 'de' ? 'SCHLIESSEN' : 'CLOSE'}</button>
        </div>
      </div>}
    </div>
  );
}
