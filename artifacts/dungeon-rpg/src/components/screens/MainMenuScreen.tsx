import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { SaveData } from '../../game/saveManager';
import { loadMetaProgression } from '../../game/metaProgression';
import { clearWeeklyRiftRun } from '../../game/weeklyRiftRun';
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

export function MainMenuScreen(props: Props) {
  const { t, language } = useLanguage();
  const [meta, setMeta] = useState(loadMetaProgression);
  const [codexOpen, setCodexOpen] = useState(false);
  const gifts = props.saveData
    ? Object.entries(props.saveData.runSkills ?? {}).reduce((sum, [key, value]) => key === 'heal' ? sum : sum + (value ?? 0), 0)
    : 0;

  useEffect(() => {
    const refresh = () => setMeta(loadMetaProgression());
    window.addEventListener('dungeon-veil-meta-changed', refresh);
    return () => window.removeEventListener('dungeon-veil-meta-changed', refresh);
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
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-black tracking-[.14em]">{label}</div>
            {subtitle && <div className="mt-1 truncate text-[9px] uppercase tracking-[.14em] text-white/38">{subtitle}</div>}
          </div>
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
      <div className="relative flex h-full flex-col px-5 pb-[max(22px,calc(env(safe-area-inset-bottom)+8px))] pt-[max(30px,calc(env(safe-area-inset-top)+8px))]">
        <header className="text-center">
          <div className="text-[8px] font-black uppercase tracking-[.52em] text-amber-200/48">{language === 'de' ? 'BETRITT DEN SCHLEIER' : 'ENTER THE VEIL'}</div>
          <h1 className="mt-2 font-serif text-[clamp(2.65rem,11.5vw,4.05rem)] font-black leading-[.88] tracking-[.08em] text-[#e4b14e]">DUNGEON<br />VEIL</h1>
          <p className="mt-3 text-[8px] uppercase tracking-[.32em] text-white/34">{t.subtitle}</p>
        </header>
        <div className="flex-1" />
        <div className="mx-auto max-h-[62dvh] w-full max-w-sm space-y-2.5 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ touchAction: 'pan-y' }}>
          <DailyQuestPanel />
          <WeeklyRiftPanel language={language} onEnter={props.onNewGame} />
          {button(t.newGame, startNormalRun, undefined, 'primary')}
          {button(t.continueGame, props.onContinue, continueText, 'normal', !props.saveData)}
          {button(language === 'de' ? 'Schleierkammer' : 'Veil Chamber', props.onVeilChamber, language === 'de' ? `Rang ${meta.rank} · ${meta.dust} Schleierstaub` : `Rank ${meta.rank} · ${meta.dust} Veil Dust`, 'chamber')}
          {button(language === 'de' ? 'Kodex' : 'Codex', () => setCodexOpen(true), language === 'de' ? 'Bestien · Jagd · Wächter · Relikte' : 'Beasts · Hunts · Wardens · Relics')}
          <div className="grid grid-cols-2 gap-2.5">
            {button(t.settings, props.onSettings)}
            {button(t.credits, props.onCredits)}
          </div>
        </div>
      </div>
    </div>
  );
}
