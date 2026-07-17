import React from 'react';

export type LoadingScreenVariant = 'boot' | 'run' | 'worldBoss';

type Props = {
  variant: LoadingScreenVariant;
  language: 'de' | 'en';
  title?: string;
  subtitle?: string;
  testId?: string;
  layer?: 'fixed' | 'absolute';
  progress?: number;
  phase?: string;
};

const DEFAULT_COPY: Record<LoadingScreenVariant, { de: [string, string]; en: [string, string] }> = {
  boot: {
    de: ['DUNGEON VEIL', 'Der Schleier öffnet den Weg in deine Welt.'],
    en: ['DUNGEON VEIL', 'The veil opens the path into your world.'],
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

export function LoadingScreen({ variant, language, title, subtitle, testId, layer = 'fixed', progress = 66, phase }: Props) {
  const de = language === 'de';
  const [defaultTitle, defaultSubtitle] = DEFAULT_COPY[variant][language];
  const normalizedProgress = Math.max(0, Math.min(100, Math.round(progress)));

  if (variant === 'boot') {
    return <div
      data-testid={testId ?? 'loading-screen-boot'}
      data-boot-presentation="veil-gate"
      role="status"
      aria-live="polite"
      className={`${layer === 'fixed' ? 'fixed' : 'absolute'} inset-0 z-[180] overflow-hidden bg-[#040405] text-white`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(218,167,70,.18),transparent_24%),radial-gradient(circle_at_50%_72%,rgba(96,60,22,.2),transparent_40%),linear-gradient(180deg,#050506,#090706_52%,#020203)]" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,235,187,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,235,187,.025)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="pointer-events-none absolute left-1/2 top-[-18vh] h-[72vh] w-[72vh] -translate-x-1/2 rounded-full border border-amber-200/8 shadow-[0_0_130px_rgba(212,159,58,.12)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[34vh] bg-[linear-gradient(180deg,transparent,rgba(0,0,0,.84))]" />

      <div className="relative z-10 flex h-full min-h-[100dvh] flex-col items-center justify-center px-6 pb-[max(28px,env(safe-area-inset-bottom))] pt-[max(34px,env(safe-area-inset-top))] text-center">
        <div className="text-[8px] font-black uppercase tracking-[.52em] text-amber-100/42">ENTER THE VEIL</div>

        <div className="relative mt-7 h-48 w-40" aria-hidden="true">
          <div className="absolute inset-x-2 bottom-0 top-3 rounded-t-[4rem] border border-amber-200/22 bg-[linear-gradient(90deg,rgba(18,14,10,.96),rgba(48,33,15,.72)_49%,rgba(18,14,10,.96)_51%)] shadow-[0_0_70px_rgba(214,159,54,.17),inset_0_0_48px_rgba(0,0,0,.9)]" />
          <div className="absolute inset-x-7 bottom-3 top-10 overflow-hidden rounded-t-[3rem] border border-amber-100/15 bg-black/90">
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-amber-200/30 shadow-[0_0_22px_rgba(253,224,138,.8)]" />
            <div className="absolute inset-y-0 left-0 w-1/2 border-r border-amber-200/8 bg-[linear-gradient(90deg,#090807,#171009)]" />
            <div className="absolute inset-y-0 right-0 w-1/2 border-l border-amber-200/8 bg-[linear-gradient(270deg,#090807,#171009)]" />
            <div className="absolute left-1/2 top-1/2 h-20 w-4 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-amber-200/12 blur-md" />
          </div>
          <div className="absolute left-1/2 top-[4.15rem] h-20 w-20 -translate-x-1/2 rounded-full border border-amber-200/25 shadow-[0_0_38px_rgba(244,194,89,.18)]">
            <div className="absolute inset-2 animate-[spin_7s_linear_infinite] rounded-full border border-dashed border-amber-100/20" />
            <div className="absolute inset-6 rounded-full border border-amber-100/25 bg-amber-200/8" />
            <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200 shadow-[0_0_24px_rgba(253,224,138,.95)]" />
          </div>
          <div className="absolute bottom-0 left-1/2 h-px w-48 -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-200/30 to-transparent" />
        </div>

        <h1 className="mt-5 font-serif text-[28px] font-black tracking-[.18em] text-amber-50 drop-shadow-[0_0_25px_rgba(244,199,108,.2)]">{title ?? defaultTitle}</h1>
        <p className="mt-2 max-w-xs text-[10px] leading-relaxed text-white/45">{subtitle ?? defaultSubtitle}</p>

        <div className="mt-8 w-full max-w-[270px]">
          <div className="flex items-end justify-between gap-3 text-left">
            <div>
              <div className="text-[6px] font-black uppercase tracking-[.28em] text-amber-100/34">{de ? 'SCHLEIERSTATUS' : 'VEIL STATUS'}</div>
              <div data-testid="app-boot-phase" className="mt-1 text-[8px] font-bold text-amber-50/68">{phase ?? (de ? 'Der Schleier erwacht' : 'The veil awakens')}</div>
            </div>
            <div className="font-mono text-[9px] font-black text-amber-100/55">{normalizedProgress}%</div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full border border-amber-100/12 bg-black/75">
            <div data-testid="app-boot-progress" className="h-full rounded-full bg-[linear-gradient(90deg,#8a621d,#f6d47a,#fff0b6)] shadow-[0_0_18px_rgba(250,204,92,.5)] transition-[width] duration-300" style={{ width: `${normalizedProgress}%` }} />
          </div>
        </div>
      </div>
    </div>;
  }

  const isBoss = variant === 'worldBoss';
  const accent = isBoss ? 'text-orange-100' : 'text-violet-100';
  const border = isBoss ? 'border-orange-300/28' : 'border-violet-300/25';
  const glow = isBoss ? 'shadow-[0_0_80px_rgba(234,88,12,.22)]' : 'shadow-[0_0_80px_rgba(139,92,246,.2)]';
  const background = isBoss
    ? 'bg-[radial-gradient(circle_at_50%_44%,rgba(180,66,12,.3),rgba(8,4,1,.97)_38%,#080401_76%)]'
    : 'bg-[radial-gradient(circle_at_50%_43%,rgba(99,55,170,.3),rgba(7,6,12,.97)_39%,#050507_78%)]';
  const bar = isBoss ? 'bg-orange-300' : 'bg-violet-300';

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
