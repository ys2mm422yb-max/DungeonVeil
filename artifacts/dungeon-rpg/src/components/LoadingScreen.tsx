import React from 'react';

export type LoadingScreenVariant = 'boot' | 'run' | 'worldBoss';

type Props = {
  variant: LoadingScreenVariant;
  language: 'de' | 'en';
  title?: string;
  subtitle?: string;
  testId?: string;
  layer?: 'fixed' | 'absolute';
};

const DEFAULT_COPY: Record<LoadingScreenVariant, { de: [string, string]; en: [string, string] }> = {
  boot: {
    de: ['SCHLEIER WIRD GEÖFFNET', 'Die Welt und dein Spielstand werden vorbereitet.'],
    en: ['OPENING THE VEIL', 'Preparing the world and your save.'],
  },
  run: {
    de: ['DUNGEON WIRD GELADEN', 'Raum, Gegner und Ausrüstung werden aufgebaut.'],
    en: ['LOADING DUNGEON', 'Building the room, enemies and equipment.'],
  },
  worldBoss: {
    de: ['BOSSARENA WIRD GELADEN', 'Der Angriff startet erst, wenn die Arena vollständig bereit ist.'],
    en: ['LOADING BOSS ARENA', 'The attack starts only when the arena is fully ready.'],
  },
};

export function LoadingScreen({ variant, language, title, subtitle, testId, layer = 'fixed' }: Props) {
  const de = language === 'de';
  const [defaultTitle, defaultSubtitle] = DEFAULT_COPY[variant][language];
  const isBoss = variant === 'worldBoss';
  const isRun = variant === 'run';
  const accentText = isBoss ? 'text-orange-100' : isRun ? 'text-violet-100' : 'text-amber-100';
  const accentBorder = isBoss ? 'border-orange-300/45' : isRun ? 'border-violet-300/40' : 'border-amber-200/42';
  const accentFill = isBoss ? 'bg-orange-300' : isRun ? 'bg-violet-300' : 'bg-amber-300';
  const accentGlow = isBoss
    ? 'shadow-[0_0_45px_rgba(249,115,22,.32)]'
    : isRun
      ? 'shadow-[0_0_45px_rgba(167,139,250,.28)]'
      : 'shadow-[0_0_45px_rgba(251,191,36,.24)]';
  const background = isBoss
    ? 'bg-[radial-gradient(circle_at_50%_43%,rgba(161,56,12,.28),rgba(8,4,2,.93)_38%,#050302_74%)]'
    : isRun
      ? 'bg-[radial-gradient(circle_at_50%_43%,rgba(91,53,150,.27),rgba(7,6,12,.94)_39%,#040407_76%)]'
      : 'bg-[radial-gradient(circle_at_50%_40%,rgba(139,92,32,.25),rgba(8,7,6,.93)_40%,#040404_76%)]';

  return <div
    data-testid={testId ?? `loading-screen-${variant}`}
    role="status"
    aria-live="polite"
    className={`${layer === 'fixed' ? 'fixed' : 'absolute'} inset-0 z-[180] overflow-hidden text-white ${background}`}
  >
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.62),transparent_28%,transparent_68%,rgba(0,0,0,.76))]" />
    <div className="pointer-events-none absolute left-1/2 top-[42%] h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[.025]" />
    <div className="pointer-events-none absolute left-1/2 top-[42%] h-[27rem] w-[27rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[.035]" />

    <div className="relative flex h-full min-h-0 flex-col items-center justify-center px-7 pb-24 pt-[max(2rem,env(safe-area-inset-top))] text-center">
      <div className="mb-8 flex items-center gap-4 text-[8px] font-black uppercase tracking-[.5em] text-white/34">
        <span className="h-px w-9 bg-white/14" />
        DUNGEON VEIL
        <span className="h-px w-9 bg-white/14" />
      </div>

      <div className="relative h-[76px] w-[76px]">
        <div className={`absolute inset-0 rotate-45 rounded-[1.35rem] border ${accentBorder} ${accentGlow} animate-[spin_7s_linear_infinite]`} />
        <div className={`absolute inset-[13px] rotate-45 rounded-[.9rem] border border-dashed ${accentBorder} animate-[spin_4s_linear_infinite_reverse]`} />
        <div className={`absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[3px] ${accentFill} ${accentGlow} animate-pulse`} />
      </div>

      <h2 className={`mt-9 max-w-sm font-serif text-[23px] font-black leading-[1.15] tracking-[.13em] sm:text-[27px] ${accentText}`}>
        {title ?? defaultTitle}
      </h2>
      <p className="mx-auto mt-3 max-w-[19rem] text-[11px] leading-relaxed text-white/48">
        {subtitle ?? defaultSubtitle}
      </p>
    </div>

    <div className="absolute inset-x-0 bottom-[max(2rem,env(safe-area-inset-bottom))] flex flex-col items-center px-8">
      <div className="relative h-px w-full max-w-[250px] overflow-hidden bg-white/10">
        <div className={`absolute inset-y-0 left-1/2 w-2/5 -translate-x-1/2 ${accentFill} ${accentGlow} animate-pulse`} />
      </div>
      <div className="mt-4 text-[7px] font-black uppercase tracking-[.42em] text-white/25">
        {de ? 'BITTE KURZ WARTEN' : 'PLEASE WAIT'}
      </div>
    </div>
  </div>;
}
