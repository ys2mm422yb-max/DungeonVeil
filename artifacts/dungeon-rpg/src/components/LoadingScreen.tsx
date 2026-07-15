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
  const accent = isBoss ? 'text-orange-100' : variant === 'run' ? 'text-violet-100' : 'text-amber-100';
  const border = isBoss ? 'border-orange-300/28' : variant === 'run' ? 'border-violet-300/25' : 'border-amber-200/24';
  const glow = isBoss ? 'shadow-[0_0_80px_rgba(234,88,12,.22)]' : variant === 'run' ? 'shadow-[0_0_80px_rgba(139,92,246,.2)]' : 'shadow-[0_0_80px_rgba(217,164,65,.18)]';
  const background = isBoss
    ? 'bg-[radial-gradient(circle_at_50%_44%,rgba(180,66,12,.3),rgba(8,4,1,.97)_38%,#080401_76%)]'
    : variant === 'run'
      ? 'bg-[radial-gradient(circle_at_50%_43%,rgba(99,55,170,.3),rgba(7,6,12,.97)_39%,#050507_78%)]'
      : 'bg-[radial-gradient(circle_at_50%_38%,rgba(151,100,34,.26),rgba(8,7,6,.97)_42%,#050505_80%)]';
  const bar = isBoss ? 'bg-orange-300' : variant === 'run' ? 'bg-violet-300' : 'bg-amber-300';

  return <div
    data-testid={testId ?? `loading-screen-${variant}`}
    role="status"
    aria-live="polite"
    className={`${layer === 'fixed' ? 'fixed' : 'absolute'} inset-0 z-[180] flex items-center justify-center overflow-hidden px-6 text-white ${background}`}
  >
    <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:34px_34px]" />
    <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/55 to-transparent" />

    <div className={`relative w-full max-w-sm rounded-[2rem] border bg-black/58 px-6 py-8 text-center backdrop-blur-xl ${border} ${glow}`}>
      <div className="text-[8px] font-black uppercase tracking-[.42em] text-white/34">DUNGEON VEIL</div>

      <div className="relative mx-auto mt-7 h-24 w-24">
        <div className={`absolute inset-0 rounded-full border ${border} animate-[spin_3s_linear_infinite]`} />
        <div className={`absolute inset-3 rounded-full border border-dashed ${border} animate-[spin_1.8s_linear_infinite_reverse]`} />
        <div className={`absolute inset-7 rounded-full border ${border} bg-white/[.035] animate-pulse`} />
        <div className={`absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${bar} shadow-[0_0_28px_currentColor]`} />
      </div>

      <h2 className={`mt-6 font-serif text-[18px] font-black tracking-[.14em] ${accent}`}>{title ?? defaultTitle}</h2>
      <p className="mx-auto mt-2 max-w-xs text-[10px] leading-relaxed text-white/42">{subtitle ?? defaultSubtitle}</p>

      <div className="mx-auto mt-6 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full border border-white/8 bg-black/55">
        <div className={`h-full w-2/3 rounded-full ${bar} animate-pulse`} />
      </div>
      <div className="mt-3 text-[7px] font-black uppercase tracking-[.3em] text-white/24">{de ? 'BITTE KURZ WARTEN' : 'PLEASE WAIT'}</div>
    </div>
  </div>;
}
