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

function DungeonVeilDMark() {
  const runes = [
    { left: '50%', top: '5%' },
    { left: '95%', top: '50%' },
    { left: '50%', top: '95%' },
    { left: '5%', top: '50%' },
  ];

  return <div data-testid="dungeon-veil-d-mark" className="relative h-[min(62vw,270px)] w-[min(62vw,270px)]" aria-hidden="true">
    <div className="absolute inset-0 rounded-[28%] border border-violet-100/12 bg-[radial-gradient(circle_at_50%_48%,rgba(67,32,142,.68),rgba(9,7,17,.96)_54%,#030305_78%)] shadow-[0_0_110px_rgba(109,40,217,.28),inset_0_0_70px_rgba(0,0,0,.86)]" />
    <div className="absolute inset-[8%] animate-[spin_11s_linear_infinite] rounded-full border border-violet-200/18 shadow-[0_0_38px_rgba(139,92,246,.28)]" />
    <div className="absolute inset-[14%] animate-[spin_7s_linear_infinite_reverse] rounded-full border border-dashed border-fuchsia-200/28" />
    <div className="absolute inset-[19%] animate-[spin_5s_linear_infinite] rounded-full bg-[conic-gradient(from_40deg,transparent_0_8%,rgba(139,92,246,.74)_12%,transparent_25%,rgba(196,181,253,.62)_38%,transparent_54%,rgba(124,58,237,.78)_69%,transparent_84%)] opacity-70 blur-[2px]" />
    <div className="absolute inset-[25%] rounded-full bg-[radial-gradient(circle,rgba(12,7,34,.72),rgba(35,15,82,.78)_38%,rgba(88,28,135,.32)_62%,transparent_70%)] shadow-[inset_0_0_36px_rgba(0,0,0,.88)]" />

    <svg className="absolute inset-[11%] h-[78%] w-[78%] overflow-visible drop-shadow-[0_0_22px_rgba(196,181,253,.44)]" viewBox="0 0 140 140">
      <defs>
        <linearGradient id="dv-stone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5f3ff" />
          <stop offset="0.35" stopColor="#b9b7c9" />
          <stop offset="0.62" stopColor="#f0eef8" />
          <stop offset="1" stopColor="#777386" />
        </linearGradient>
        <linearGradient id="dv-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".92" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity=".42" />
        </linearGradient>
        <filter id="dv-rough">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="8" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.7" />
        </filter>
      </defs>
      <path
        fill="url(#dv-stone)"
        stroke="url(#dv-edge)"
        strokeWidth="2.4"
        fillRule="evenodd"
        filter="url(#dv-rough)"
        d="M24 20 L76 20 C105 20 122 40 122 69 C122 99 103 119 73 119 L23 119 L34 107 L34 32 Z M55 40 L55 98 L72 98 C89 98 100 87 100 69 C100 51 90 40 72 40 Z"
      />
      <path d="M38 29 L49 39 M83 24 L76 37 M42 103 L56 94 M93 101 L84 88" stroke="#6d6678" strokeWidth="1.2" strokeLinecap="round" opacity=".72" />
    </svg>

    {runes.map((rune, index) => <div
      key={index}
      className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-violet-100/42 bg-violet-400/16 shadow-[0_0_18px_rgba(167,139,250,.62)]"
      style={rune}
    >
      <div className="absolute inset-[4px] border border-violet-100/35" />
    </div>)}
  </div>;
}

export function LoadingScreen({ variant, language, title, subtitle, testId, layer = 'fixed', progress = 66, phase }: Props) {
  const de = language === 'de';
  const [defaultTitle, defaultSubtitle] = DEFAULT_COPY[variant][language];
  const normalizedProgress = Math.max(0, Math.min(100, Math.round(progress)));

  if (variant === 'boot') {
    return <div
      data-testid={testId ?? 'loading-screen-boot'}
      data-boot-presentation="veil-gate"
      data-boot-visual="violet-d-monogram-v2"
      role="status"
      aria-live="polite"
      className={`${layer === 'fixed' ? 'fixed' : 'absolute'} inset-0 z-[180] overflow-hidden bg-[#020204] text-white`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(91,33,182,.28),transparent_30%),radial-gradient(circle_at_50%_78%,rgba(49,16,101,.24),transparent_46%),linear-gradient(180deg,#020204,#080511_52%,#010102)]" />
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(196,181,253,.026)_1px,transparent_1px),linear-gradient(90deg,rgba(196,181,253,.026)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="pointer-events-none absolute left-1/2 top-[-24vh] h-[78vh] w-[78vh] -translate-x-1/2 rounded-full border border-violet-200/8 shadow-[0_0_150px_rgba(109,40,217,.18)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[36vh] bg-[linear-gradient(180deg,transparent,rgba(0,0,0,.88))]" />

      <div className="relative z-10 flex h-full min-h-[100dvh] flex-col items-center justify-center px-6 pb-[max(28px,env(safe-area-inset-bottom))] pt-[max(28px,env(safe-area-inset-top))] text-center">
        <div className="text-[8px] font-black uppercase tracking-[.52em] text-violet-100/42">ENTER THE VEIL</div>
        <div className="mt-5"><DungeonVeilDMark /></div>
        <h1 className="mt-4 font-serif text-[28px] font-black tracking-[.18em] text-violet-50 drop-shadow-[0_0_28px_rgba(167,139,250,.34)]">{title ?? defaultTitle}</h1>
        <p className="mt-2 max-w-xs text-[10px] leading-relaxed text-violet-50/46">{subtitle ?? defaultSubtitle}</p>

        <div className="mt-7 w-full max-w-[286px]">
          <div className="flex items-end justify-between gap-3 text-left">
            <div>
              <div className="text-[6px] font-black uppercase tracking-[.28em] text-violet-100/34">{de ? 'SCHLEIERSTATUS' : 'VEIL STATUS'}</div>
              <div data-testid="app-boot-phase" className="mt-1 text-[8px] font-bold text-violet-50/70">{phase ?? (de ? 'Der Schleier erwacht' : 'The veil awakens')}</div>
            </div>
            <div className="font-mono text-[9px] font-black text-violet-100/58">{normalizedProgress}%</div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full border border-violet-100/14 bg-black/78">
            <div data-testid="app-boot-progress" className="h-full rounded-full bg-[linear-gradient(90deg,#5b21b6,#a78bfa,#f5f3ff)] shadow-[0_0_20px_rgba(139,92,246,.7)] transition-[width] duration-300" style={{ width: `${normalizedProgress}%` }} />
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
