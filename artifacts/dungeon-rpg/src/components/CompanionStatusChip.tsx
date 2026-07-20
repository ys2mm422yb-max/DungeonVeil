import type { CompanionRoleV4 } from '../game/companionReserveV4';
import { COMPANION_ROLE_COPY_V4, nextCompanionRoleV4 } from '../game/companionSelectionV4';

type Props = {
  role: CompanionRoleV4;
  language?: string;
  onRoleChange: (role: CompanionRoleV4) => void;
};

const ROLE_GLYPHS: Readonly<Record<CompanionRoleV4, string>> = {
  'single-target': '⌁',
  'critical-support': '✦',
  shield: '◇',
  'loot-comfort': '◈',
  distraction: '◎',
};

const ROLE_TONE: Readonly<Record<CompanionRoleV4, string>> = {
  'single-target': 'border-cyan-200/35 bg-cyan-400/12 text-cyan-100 shadow-[0_0_22px_rgba(103,232,249,.14)]',
  'critical-support': 'border-amber-200/35 bg-amber-400/12 text-amber-100 shadow-[0_0_22px_rgba(251,191,36,.14)]',
  shield: 'border-emerald-200/35 bg-emerald-400/12 text-emerald-100 shadow-[0_0_22px_rgba(52,211,153,.14)]',
  'loot-comfort': 'border-yellow-200/35 bg-yellow-400/12 text-yellow-100 shadow-[0_0_22px_rgba(250,204,21,.14)]',
  distraction: 'border-violet-200/35 bg-violet-400/12 text-violet-100 shadow-[0_0_22px_rgba(167,139,250,.14)]',
};

function WolfMark() {
  return <svg viewBox="0 0 32 32" aria-hidden="true" className="h-7 w-7">
    <path d="M7 5.5 12 9l4-1.6L20 9l5-3.5-1.7 8.2c1 1.4 1.5 3 1.5 4.8 0 5-3.9 8.4-8.8 8.4s-8.8-3.4-8.8-8.4c0-1.8.5-3.4 1.5-4.8L7 5.5Z" fill="currentColor" opacity=".2"/>
    <path d="M7 5.5 12 9l4-1.6L20 9l5-3.5-1.7 8.2c1 1.4 1.5 3 1.5 4.8 0 5-3.9 8.4-8.8 8.4s-8.8-3.4-8.8-8.4c0-1.8.5-3.4 1.5-4.8L7 5.5Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
    <path d="m11.7 18 2.4 1.2M20.3 18l-2.4 1.2M14 22.2l2 1.1 2-1.1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}

export function CompanionStatusChip({ role, language = 'de', onRoleChange }: Props) {
  const copy = COMPANION_ROLE_COPY_V4[role];
  const de = language === 'de';
  return (
    <button
      type="button"
      data-testid="run-companion-chip"
      data-companion-role={role}
      data-presentation="compact-wolf-orb"
      aria-label={de ? `Wolf-Taktik wechseln: ${copy.de}` : `Change wolf tactic: ${copy.en}`}
      title={de ? `${copy.de} · ${copy.bonusDe}` : `${copy.en} · ${copy.bonusEn}`}
      onClick={() => onRoleChange(nextCompanionRoleV4(role))}
      className={`pointer-events-auto absolute right-[max(14px,env(safe-area-inset-right))] top-[max(196px,calc(env(safe-area-inset-top)+154px))] z-40 grid h-12 w-12 touch-manipulation place-items-center rounded-2xl border backdrop-blur-md transition active:scale-[.94] ${ROLE_TONE[role]}`}
    >
      <WolfMark />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full border border-black/70 bg-[#08070c] px-1 text-[9px] font-black leading-none text-white/80">{ROLE_GLYPHS[role]}</span>
      <span className="sr-only">{de ? copy.de : copy.en}</span>
    </button>
  );
}
