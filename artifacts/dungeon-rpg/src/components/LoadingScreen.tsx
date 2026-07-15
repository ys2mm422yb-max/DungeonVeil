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
  const line = isBoss ? 'bg-orange-300/70' : variant === 'run' ? 'bg-violet-300/70' : 'bg-amber-300/70';
  const ring = isBoss ? 'border-orange-300/35' : variant === 'run' ? 'border-violet-300/32' : 'border-amber-200/30';
  const glow = isBoss ? 'shadow-[0_0_36px_rgba(251,146,60,.35)]' : variant === 'run' ? 'shadow-[0_0_36px_rgba(167,139,250,.32)]' : 'shadow-[0_0_36px_rgba(252,211,77,.3)]';
  const background = isBoss
    ? 'bg-[radial-gradient(circle_at_50%_42%,rgba(153,55,12,.28),rgba(8,4,2,.98)_42%,#050302_82%)]'
    : variant === 'run'
      ? 'bg-[radial-gradient(circle_at_50%_42%,rgba(76,45,132,.28),rgba(7,6,11,.98)_42%,#040406_82%)]'
      : 'bg-[radial-gradient(circle_at_50%_38%,rgba(128,84,27,.24),rgba(8,7,6,.98)_43%,#040404_82%)]';

  return <div
    data-testid={testId ?? `loading-screen-${variant}`}
    role="status"
    aria-live="polite"
    className={`${layer === 'fixed' ? 'fixed' : 'absolute'} inset-0 z-[180] overflow-hidden text-white ${background}`}
  >
    <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.018)_1px,transparent_1px)] [background-size:44px_44px]" />
    <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/65 to-transparent" />
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/80 to-transparent" />

    <div
      className="relative flex h-full w-full flex-col items-center px-7 text-center"
      style={{
        paddingTop: 'max(2rem, env(safe-area-inset-top))',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="flex w-full max-w-md items-center gap-4 text-[8px] font-black uppercase tracking-[.46em] text-white/32">
        <span className="h-px flex-1 bg-white/10" />
        <span>DUNGEON VEIL</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center pb-12">
        <div className="relative h-20 w-20">
          <div className={`absolute inset-0 rounded-full border ${ring} animate-[spin_3.2s_linear_infinite]`} />
          <div className={`absolute inset-3 rounded-full border border-dashed ${ring} animate-[spin_2s_linear_infinite_reverse]`} />
          <div className={`absolute inset-[1.65rem] rounded-full ${line} ${glow} animate-pulse`} />
        </div>

        <div className={`mt-7 h-px w-14 ${line}`} />
        <h2 className={`mt-5 max-w-md font-serif text-[clamp(1.5rem,6vw,2.15rem)] font-black leading-[1.08] tracking-[.12em] ${accent}`}>
          {title ?? defaultTitle}
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-[11px] leading-relaxed text-white/46">
          {subtitle ?? defaultSubtitle}
        </p>
      </div>

      <div className="w-full max-w-xs">
        <div className="h-px w-full overflow-hidden bg-white/10">
          <div className={`h-full w-2/5 ${line} ${glow} animate-pulse`} />
        </div>
        <div className="mt-4 text-[7px] font-black uppercase tracking-[.34em] text-white/25">
          {de ? 'BITTE KURZ WARTEN' : 'PLEASE WAIT'}
        </div>
      </div>
    </div>
  </div>;
}
