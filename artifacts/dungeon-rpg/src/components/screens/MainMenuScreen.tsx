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

type Overlay = 'daily' | 'rift' | 'more' | null;

export function MainMenuScreen(props: Props) {
  const { t, language } = useLanguage();
  const [meta, setMeta] = useState(loadMetaProgression);
  const [retention, setRetention] = useState<RetentionProfile>(loadRetentionProfile);
  const [codexOpen, setCodexOpen] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const gifts = props.saveData ? Object.entries(props.saveData.runSkills ?? {}).reduce((sum, [key, value]) => key === 'heal' ? sum : sum + (value ?? 0), 0) : 0;

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
      ? 'border-amber-300/45 bg-[linear-gradient(110deg,rgba(112,48,12,.88),rgba(67,25,8,.86))] text-amber-100 shadow-[0_14px_34px_rgba(0,0,0,.34)]'
      : kind === 'chamber'
        ? 'border-violet-300/22 bg-[linear-gradient(110deg,rgba(53,25,86,.86),rgba(31,14,52,.88))] text-violet-100'
        : 'border-white/10 bg-black/62 text-white/82';
    return <button type="button" disabled={disabled} onPointerDown={event => { event.preventDefault(); if (!disabled) action(); }} className={`w-full rounded-[1.35rem] border px-5 py-3.5 text-left backdrop-blur-xl active:scale-[.975] ${kindClass} ${disabled ? 'opacity-35' : ''}`}>
      <div className="flex items-center gap-4"><div className="min-w-0 flex-1"><div className="text-[15px] font-black tracking-[.13em]">{label}</div>{subtitle && <div className="mt-1 truncate text-[8px] uppercase tracking-[.14em] text-white/35">{subtitle}</div>}</div>{!disabled && <span className="text-lg opacity-38">›</span>}</div>
    </button>;
  };

  const startNormalRun = () => { clearWeeklyRiftRun(); props.onNewGame(); };
  const continueText = props.saveData
    ? language === 'de' ? `Kapitel ${props.saveData.chapter ?? 1} · Raum ${props.saveData.floor} · ${gifts} Gaben` : `Chapter ${props.saveData.chapter ?? 1} · Room ${props.saveData.floor} · ${gifts} gifts`
    : t.noSave;

  return <div className="fixed inset-0 z-50 select-none overflow-hidden bg-[#070706] text-white">
    <MainMenuDungeonScene />
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,.18),rgba(0,0,0,.1)_35%,rgba(0,0,0,.84)_76%,#050505)]" />
    <button type="button" onPointerDown={event => { event.preventDefault(); setOverlay('more'); }} className="absolute right-4 top-[max(18px,calc(env(safe-area-inset-top)+8px))] z-20 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/58 text-lg text-white/60 backdrop-blur-xl active:scale-95">•••</button>

    <div className="relative flex h-full flex-col px-5 pb-[max(22px,calc(env(safe-area-inset-bottom)+8px))] pt-[max(34px,calc(env(safe-area-inset-top)+14px))]">
      <header className="text-center"><div className="text-[7px] font-black uppercase tracking-[.5em] text-amber-200/42">{language === 'de' ? 'BETRITT DEN SCHLEIER' : 'ENTER THE VEIL'}</div><h1 className="mt-1.5 font-serif text-[clamp(2.45rem,10.5vw,3.7rem)] font-black leading-[.86] tracking-[.07em] text-[#d7a347]">DUNGEON<br />VEIL</h1><p className="mt-2.5 text-[7px] uppercase tracking-[.28em] text-white/28">{t.subtitle}</p></header>
      <div className="mt-5 flex justify-center gap-3">
        <button type="button" onPointerDown={event => { event.preventDefault(); setOverlay('daily'); }} className="relative grid h-11 w-11 place-items-center rounded-full border border-amber-300/22 bg-black/58 text-base text-amber-200 backdrop-blur-xl active:scale-95">✦<span className="absolute -right-1 -top-1 rounded-full border border-amber-100/25 bg-amber-500 px-1.5 py-0.5 text-[7px] font-black text-black">{retention.daily.claimed.length}/3</span></button>
        <button type="button" onPointerDown={event => { event.preventDefault(); setOverlay('rift'); }} className="grid h-11 w-11 place-items-center rounded-full border border-violet-300/22 bg-black/58 text-lg text-violet-200 backdrop-blur-xl active:scale-95">◈</button>
      </div>
      <div className="flex-1" />
      <div className="mx-auto w-full max-w-sm space-y-2.5">{button(t.newGame, startNormalRun, undefined, 'primary')}{button(t.continueGame, props.onContinue, continueText, 'normal', !props.saveData)}{button(language === 'de' ? 'Schleierkammer' : 'Veil Chamber', props.onVeilChamber, language === 'de' ? `Rang ${meta.rank} · ${meta.dust} Schleierstaub` : `Rank ${meta.rank} · ${meta.dust} Veil Dust`, 'chamber')}{button(language === 'de' ? 'Kodex' : 'Codex', () => setCodexOpen(true), language === 'de' ? 'Bestien · Jagd · Wächter · Relikte' : 'Beasts · Hunts · Wardens · Relics')}</div>
    </div>

    {overlay && <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/74 px-5 backdrop-blur-md" onPointerDown={() => setOverlay(null)}><div className="w-full max-w-sm" onPointerDown={event => event.stopPropagation()}>
      {overlay === 'daily' && <DailyQuestPanel defaultOpen />}
      {overlay === 'rift' && <WeeklyRiftPanel language={language} />}
      {overlay === 'more' && <div className="rounded-3xl border border-white/10 bg-[#0c0b0a]/95 p-4 shadow-2xl"><div className="mb-3 px-2 text-[8px] font-black uppercase tracking-[.25em] text-white/32">{language === 'de' ? 'WEITERE OPTIONEN' : 'MORE OPTIONS'}</div><div className="space-y-2">{button(t.settings, () => { setOverlay(null); props.onSettings(); })}{button(t.credits, () => { setOverlay(null); props.onCredits(); })}</div></div>}
      <button type="button" onPointerDown={event => { event.preventDefault(); setOverlay(null); }} className="mt-3 w-full rounded-2xl border border-white/10 bg-black/72 py-3 text-[9px] font-black uppercase tracking-[.2em] text-white/50">{language === 'de' ? 'SCHLIESSEN' : 'CLOSE'}</button>
    </div></div>}
  </div>;
}
