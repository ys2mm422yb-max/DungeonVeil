import type { CompanionRoleV4 } from '../game/companionReserveV4';
import { COMPANION_DEFINITIONS_V5, activeCompanionV5 } from '../game/companionCollectionV5';

export function CompanionProfileSummary({ role, level = 1, language = 'de', testId = 'companion-profile-summary' }: {
  role: CompanionRoleV4;
  level?: number;
  language?: 'de' | 'en';
  testId?: string;
}) {
  const de = language === 'de';
  const ownProfile = testId === 'own-player-profile-companion';
  const ownedActive = ownProfile ? activeCompanionV5() : null;
  if (ownProfile && !ownedActive) {
    return <section data-testid={testId} data-companion-role="none" data-companion-species="none" data-companion-level="0" className="grid gap-3 rounded-2xl border border-violet-300/10 bg-[radial-gradient(circle_at_15%_0%,rgba(139,92,246,.08),rgba(255,255,255,.015)_62%)] p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/8 bg-black/30 text-lg text-white/30">◆</div>
      <div className="min-w-0"><div className="text-[6px] font-black uppercase tracking-[.19em] text-violet-100/34">{de ? 'BEGLEITER' : 'COMPANION'}</div><div className="mt-1 text-[12px] font-black text-white/68">{de ? 'Noch kein Begleiter gefunden' : 'No companion found yet'}</div><div className="mt-1 text-[7px] leading-relaxed text-white/34">{de ? 'Der erste seltene Fund wird ab Kapitel 2 verfügbar.' : 'The first rare find becomes available from chapter 2.'}</div></div>
    </section>;
  }
  const activeRole = ownedActive?.id ?? role;
  const activeLevel = ownedActive?.level ?? level;
  const definition = COMPANION_DEFINITIONS_V5[activeRole];
  return <section data-testid={testId} data-companion-role={activeRole} data-companion-species={definition.species} data-companion-level={activeLevel} className="grid gap-3 rounded-2xl border border-violet-300/14 bg-[radial-gradient(circle_at_15%_0%,rgba(139,92,246,.14),rgba(255,255,255,.02)_62%)] p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
    <div className="grid h-12 w-12 place-items-center rounded-2xl border border-violet-200/18 bg-black/30 text-xl text-violet-100">{definition.glyph}</div>
    <div className="min-w-0"><div className="text-[6px] font-black uppercase tracking-[.19em] text-violet-100/42">{de ? 'AKTIVER BEGLEITER' : 'ACTIVE COMPANION'}</div><div className="mt-1 truncate text-[12px] font-black text-white/86">{de ? `${definition.nameDe} · ${definition.titleDe}` : `${definition.nameEn} · ${definition.titleEn}`}</div><div className="mt-1 text-[7px] leading-relaxed text-white/38">{de ? definition.bonusDe : definition.bonusEn}</div></div>
    <div className="rounded-xl border border-white/8 bg-black/22 px-3 py-2 text-center"><div className="text-[5px] font-black uppercase tracking-[.12em] text-white/28">{de ? 'Stufe' : 'Level'}</div><div className="mt-1 text-sm font-black text-violet-100">{activeLevel}</div></div>
  </section>;
}
