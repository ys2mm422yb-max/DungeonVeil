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

export function CompanionStatusChip({ role, language = 'de', onRoleChange }: Props) {
  const copy = COMPANION_ROLE_COPY_V4[role];
  const de = language === 'de';
  return (
    <button
      type="button"
      data-testid="run-companion-chip"
      data-companion-role={role}
      aria-label={de ? `Begleiter wechseln: ${copy.de}` : `Change companion: ${copy.en}`}
      onClick={() => onRoleChange(nextCompanionRoleV4(role))}
      className="absolute bottom-[max(82px,calc(env(safe-area-inset-bottom)+76px))] left-1/2 z-40 flex max-w-[58vw] -translate-x-1/2 items-center gap-2 rounded-full border border-violet-200/20 bg-black/64 px-3 py-1.5 text-left shadow-[0_8px_24px_rgba(0,0,0,.32)] backdrop-blur-md active:scale-[.98] md:bottom-[max(92px,calc(env(safe-area-inset-bottom)+86px))]"
    >
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-violet-200/24 bg-violet-400/12 text-[13px] text-violet-100" aria-hidden="true">{ROLE_GLYPHS[role]}</span>
      <span className="min-w-0">
        <span className="block truncate text-[8px] font-black uppercase tracking-[.16em] text-violet-100/92">{de ? copy.de : copy.en}</span>
        <span className="block truncate text-[6px] font-bold uppercase tracking-[.11em] text-violet-100/52">{de ? copy.bonusDe : copy.bonusEn}</span>
      </span>
    </button>
  );
}
