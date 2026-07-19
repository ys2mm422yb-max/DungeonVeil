import type { CompanionRoleV4 } from '../game/companionReserveV4';
import { COMPANION_ROLE_COPY_V4 } from '../game/companionSelectionV4';

const ROLE_GLYPHS: Readonly<Record<CompanionRoleV4, string>> = {
  'single-target': '⌁',
  'critical-support': '✦',
  shield: '◇',
  'loot-comfort': '◈',
  distraction: '◎',
};

export function CompanionProfileSummary({ role, language = 'de', testId = 'companion-profile-summary' }: {
  role: CompanionRoleV4;
  language?: 'de' | 'en';
  testId?: string;
}) {
  const de = language === 'de';
  const copy = COMPANION_ROLE_COPY_V4[role];
  return <section data-testid={testId} data-companion-role={role} className="grid gap-3 rounded-2xl border border-violet-300/14 bg-[radial-gradient(circle_at_15%_0%,rgba(139,92,246,.14),rgba(255,255,255,.02)_62%)] p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
    <div className="grid h-12 w-12 place-items-center rounded-2xl border border-violet-200/18 bg-black/30 text-xl text-violet-100">{ROLE_GLYPHS[role]}</div>
    <div className="min-w-0"><div className="text-[6px] font-black uppercase tracking-[.19em] text-violet-100/42">{de ? 'AKTIVER BEGLEITER' : 'ACTIVE COMPANION'}</div><div className="mt-1 truncate text-[12px] font-black text-white/86">{de ? copy.de : copy.en}</div><div className="mt-1 text-[7px] leading-relaxed text-white/38">{de ? copy.bonusDe : copy.bonusEn}</div></div>
    <div className="grid grid-cols-2 gap-1 text-center"><div className="rounded-xl border border-white/8 bg-black/22 px-2.5 py-2"><div className="text-[5px] font-black uppercase tracking-[.12em] text-white/28">{de ? 'Aktiv' : 'Active'}</div><div className="mt-1 text-sm font-black text-violet-100">1</div></div><div className="rounded-xl border border-white/8 bg-black/22 px-2.5 py-2"><div className="text-[5px] font-black uppercase tracking-[.12em] text-white/28">{de ? 'Reserve' : 'Reserve'}</div><div className="mt-1 text-sm font-black text-white/68">4</div></div></div>
  </section>;
}
