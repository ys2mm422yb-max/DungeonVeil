import type { CompanionRoleV4 } from '../game/companionReserveV4';
import { COMPANION_DEFINITIONS_V5 } from '../game/companionCollectionV5';

const ROLE_TONE: Readonly<Record<CompanionRoleV4, string>> = {
  'single-target': 'border-cyan-200/35 bg-cyan-400/12 text-cyan-100 shadow-[0_0_22px_rgba(103,232,249,.14)]',
  'critical-support': 'border-amber-200/35 bg-amber-400/12 text-amber-100 shadow-[0_0_22px_rgba(251,191,36,.14)]',
  shield: 'border-emerald-200/35 bg-emerald-400/12 text-emerald-100 shadow-[0_0_22px_rgba(52,211,153,.14)]',
  'loot-comfort': 'border-yellow-200/35 bg-yellow-400/12 text-yellow-100 shadow-[0_0_22px_rgba(250,204,21,.14)]',
  distraction: 'border-violet-200/35 bg-violet-400/12 text-violet-100 shadow-[0_0_22px_rgba(167,139,250,.14)]',
};

type Props = {
  role: CompanionRoleV4;
  level: number;
  language?: string;
};

function CompanionMark({ role }: { role: CompanionRoleV4 }) {
  const definition = COMPANION_DEFINITIONS_V5[role];
  return <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-black/30 text-base font-black">{definition.glyph}</span>;
}

export function CompanionStatusChip({ role, level, language = 'de' }: Props) {
  const definition = COMPANION_DEFINITIONS_V5[role];
  const de = language === 'de';
  return (
    <div
      data-testid="run-companion-chip"
      data-companion-role={role}
      data-companion-species={definition.species}
      data-companion-level={level}
      data-presentation="read-only-companion-status"
      aria-label={de ? `${definition.nameDe}, ${definition.titleDe}, Stufe ${level}` : `${definition.nameEn}, ${definition.titleEn}, level ${level}`}
      title={de ? `${definition.nameDe} · ${definition.titleDe} · Stufe ${level}` : `${definition.nameEn} · ${definition.titleEn} · Level ${level}`}
      className={`pointer-events-none absolute right-[max(14px,env(safe-area-inset-right))] top-[max(196px,calc(env(safe-area-inset-top)+154px))] z-40 flex h-12 min-w-12 items-center gap-2 rounded-2xl border px-2 backdrop-blur-md ${ROLE_TONE[role]}`}
    >
      <CompanionMark role={role} />
      <span className="hidden min-w-0 pr-1 sm:block">
        <span className="block truncate text-[8px] font-black uppercase tracking-[.08em] text-white/88">{de ? definition.nameDe : definition.nameEn}</span>
        <span className="mt-0.5 block text-[6px] font-black uppercase tracking-[.12em] text-white/45">{de ? 'STUFE' : 'LEVEL'} {level}</span>
      </span>
    </div>
  );
}
