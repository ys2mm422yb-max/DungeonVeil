import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { SaveData } from '../../game/saveManager';
import { MainMenuDungeonScene } from '../MainMenuDungeonScene';

interface Props {
  saveData: SaveData | null;
  onNewGame: () => void;
  onContinue: () => void;
  onSettings: () => void;
  onCredits: () => void;
}

export function MainMenuScreen({ saveData, onNewGame, onContinue, onSettings, onCredits }: Props) {
  const { t, language } = useLanguage();
  const hasSaveData = saveData !== null;
  const gifts = saveData
    ? Object.entries(saveData.runSkills ?? {}).reduce((sum, [key, value]) => key === 'heal' ? sum : sum + (value ?? 0), 0)
    : 0;
  const continueMeta = saveData
    ? language === 'de'
      ? `Kapitel ${saveData.chapter ?? 1} · Raum ${saveData.floor} · ${gifts} Gaben`
      : `Chapter ${saveData.chapter ?? 1} · Room ${saveData.floor} · ${gifts} gifts`
    : t.noSave;

  const menuButton = (
    label: string,
    action: () => void,
    options?: { disabled?: boolean; meta?: string; primary?: boolean },
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
          : 'border-white/10 bg-black/55 shadow-[0_12px_34px_rgba(0,0,0,.35)]'
      } ${options?.disabled ? 'opacity-35' : ''}`}
    >
      <div className={`absolute inset-y-0 left-0 w-[3px] ${options?.primary ? 'bg-amber-300/90' : 'bg-white/10'}`} />
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className={`text-[15px] font-black tracking-[.14em] ${options?.primary ? 'text-amber-100' : 'text-white/82'}`}>{label}</div>
          {options?.meta ? <div className="mt-1 truncate text-[9px] uppercase tracking-[.14em] text-white/38">{options.meta}</div> : null}
        </div>
        {!options?.disabled && <span className={`text-xl ${options?.primary ? 'text-amber-200' : 'text-white/25'}`}>›</span>}
      </div>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 select-none overflow-hidden bg-[#070706] text-white">
      <MainMenuDungeonScene />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,.32)_0%,rgba(5,5,5,.12)_26%,rgba(5,5,5,.46)_57%,rgba(5,5,5,.94)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[42%] bg-[radial-gradient(circle_at_50%_12%,rgba(180,117,29,.17),transparent_58%)]" />

      <div className="relative flex h-full flex-col px-5 pb-[max(24px,calc(env(safe-area-inset-bottom)+10px))] pt-[max(34px,calc(env(safe-area-inset-top)+12px))]">
        <header className="text-center">
          <div className="text-[8px] font-black uppercase tracking-[.52em] text-amber-200/45">Enter the veil</div>
          <h1 className="mx-auto mt-2 max-w-[92vw] font-serif text-[clamp(2.7rem,12vw,4.15rem)] font-black leading-[.9] tracking-[.08em] text-[#e4b14e] drop-shadow-[0_8px_30px_rgba(0,0,0,.78)]">
            <span className="block">DUNGEON</span>
            <span className="mt-1 block">VEIL</span>
          </h1>
          <p className="mt-3 text-[8px] uppercase tracking-[.32em] text-white/32">{t.subtitle}</p>
        </header>

        <div className="flex-1" />

        <div className="mx-auto w-full max-w-sm space-y-2.5">
          {menuButton(t.newGame, onNewGame, { primary: true })}
          {menuButton(t.continueGame, onContinue, { disabled: !hasSaveData, meta: continueMeta })}
          <div className="grid grid-cols-2 gap-2.5">
            {menuButton(t.settings, onSettings)}
            {menuButton(t.credits, onCredits)}
          </div>
        </div>
      </div>
    </div>
  );
}
