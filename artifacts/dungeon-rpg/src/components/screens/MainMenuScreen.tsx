import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { SaveData } from '../../game/saveManager';
import { loadMetaProgression } from '../../game/metaProgression';
import { MainMenuDungeonScene } from '../MainMenuDungeonScene';
import { DailyQuestPanel } from '../DailyQuestPanel';

interface Props {
  saveData: SaveData | null;
  onNewGame: () => void;
  onContinue: () => void;
  onVeilChamber: () => void;
  onSettings: () => void;
  onCredits: () => void;
}

export function MainMenuScreen({ saveData, onNewGame, onContinue, onVeilChamber, onSettings, onCredits }: Props) {
  const { t, language } = useLanguage();
  const [meta, setMeta] = useState(loadMetaProgression);
  const hasSaveData = saveData !== null;
  const gifts = saveData
    ? Object.entries(saveData.runSkills ?? {}).reduce((sum, [key, value]) => key === 'heal' ? sum : sum + (value ?? 0), 0)
    : 0;
  const continueMeta = saveData
    ? language === 'de'
      ? `Kapitel ${saveData.chapter ?? 1} · Raum ${saveData.floor} · ${gifts} Gaben`
      : `Chapter ${saveData.chapter ?? 1} · Room ${saveData.floor} · ${gifts} gifts`
    : t.noSave;
  const veilLabel = language === 'de' ? 'BETRITT DEN SCHLEIER' : 'ENTER THE VEIL';
  const chamberLabel = language === 'de' ? 'Schleierkammer' : 'Veil Chamber';
  const chamberMeta = language === 'de'
    ? `Rang ${meta.rank} · ${meta.dust} Schleierstaub`
    : `Rank ${meta.rank} · ${meta.dust} Veil Dust`;

  useEffect(() => {
    const refresh = () => setMeta(loadMetaProgression());
    window.addEventListener('dungeon-veil-meta-changed', refresh);
    refresh();
    return () => window.removeEventListener('dungeon-veil-meta-changed', refresh);
  }, []);

  const menuButton = (
    label: string,
    action: () => void,
    options?: { disabled?: boolean; meta?: string; primary?: boolean; chamber?: boolean },
  ) => (
    <button
      key={label}
      type="button"
      onPointerDown={event => {
        event.preventDefault();
        if (!options?.disabled) action();
      }}
      disabled={options?.disabled}
      className={`group relative w-full overflow-hidden rounded-2xl border px-5 py-3.5 text-left backdrop-blur-xl transition-transform active:scale-[.975] ${
        options?.primary
          ? 'border-amber-300/50 bg-[linear-gradient(115deg,rgba(132,88,18,.64),rgba(34,25,13,.86))] shadow-[0_14px_42px_rgba(0,0,0,.42),0_0_34px_rgba(207,143,35,.12)]'
          : options?.chamber
            ? 'border-violet-300/25 bg-[linear-gradient(115deg,rgba(69,43,112,.58),rgba(15,12,22,.84))] shadow-[0_12px_34px_rgba(0,0,0,.35),0_0_28px_rgba(126,88,211,.08)]'
            : 'border-white/10 bg-black/55 shadow-[0_12px_34px_rgba(0,0,0,.35)]'
      } ${options?.disabled ? 'opacity-35' : ''}`}
    >
      <div className={`absolute inset-y-0 left-0 w-[3px] ${options?.primary ? 'bg-amber-300/90' : options?.chamber ? 'bg-violet-300/70' : 'bg-white/10'}`} />
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className={`text-[15px] font-black tracking-[.14em] ${options?.primary ? 'text-amber-100' : options?.chamber ? 'text-violet-100' : 'text-white/82'}`}>{label}</div>
          {options?.meta ? <div className="mt-1 truncate text-[9px] uppercase tracking-[.14em] text-white/38">{options.meta}</div> : null}
        </div>
        {!options?.disabled && <span className={`text-xl ${options?.primary ? 'text-amber-200' : options?.chamber ? 'text-violet-200' : 'text-white/25'}`}>›</span>}
      </div>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 select-none overflow-hidden bg-[#070706] text-white">
      <MainMenuDungeonScene />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,.2)_0%,rgba(5,5,5,.08)_28%,rgba(5,5,5,.4)_56%,rgba(5,5,5,.96)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[40%] bg-[radial-gradient(circle_at_50%_8%,rgba(180,117,29,.18),transparent_58%)]" />

      <div className="relative flex h-full flex-col px-5 pb-[max(22px,calc(env(safe-area-inset-bottom)+8px))] pt-[max(30px,calc(env(safe-area-inset-top)+8px))]">
        <header className="text-center">
          <div className="text-[8px] font-black uppercase tracking-[.52em] text-amber-200/48">{veilLabel}</div>
          <h1 className="mx-auto mt-2 max-w-[92vw] font-serif text-[clamp(2.65rem,11.5vw,4.05rem)] font-black leading-[.88] tracking-[.08em] text-[#e4b14e] drop-shadow-[0_8px_30px_rgba(0,0,0,.78)]">
            <span className="block">DUNGEON</span>
            <span className="mt-1 block">VEIL</span>
          </h1>
          <p className="mt-3 text-[8px] uppercase tracking-[.32em] text-white/34">{t.subtitle}</p>
        </header>

        <div className="flex-1" />

        <div className="mx-auto w-full max-w-sm space-y-2.5">
          <DailyQuestPanel />
          {menuButton(t.newGame, onNewGame, { primary: true })}
          {menuButton(t.continueGame, onContinue, { disabled: !hasSaveData, meta: continueMeta })}
          {menuButton(chamberLabel, onVeilChamber, { chamber: true, meta: chamberMeta })}
          <div className="grid grid-cols-2 gap-2.5">
            {menuButton(t.settings, onSettings)}
            {menuButton(t.credits, onCredits)}
          </div>
        </div>
      </div>
    </div>
  );
}
