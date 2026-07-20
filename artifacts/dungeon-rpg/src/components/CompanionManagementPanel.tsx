import { useEffect, useState } from 'react';
import type { CompanionRoleV4 } from '../game/companionReserveV4';
import {
  COMPANION_ROLE_COPY_V4,
  COMPANION_ROLE_ORDER_V4,
  COMPANION_SELECTION_EVENT,
  loadCompanionRoleV4,
  saveCompanionRoleV4,
} from '../game/companionSelectionV4';

const ROLE_GLYPHS: Readonly<Record<CompanionRoleV4, string>> = {
  'single-target': '⌁',
  'critical-support': '✦',
  shield: '◇',
  'loot-comfort': '◈',
  distraction: '◎',
};

const ROLE_POWER: Readonly<Record<CompanionRoleV4, string>> = {
  'single-target': '12%',
  'critical-support': '10%',
  shield: '10%',
  'loot-comfort': '8%',
  distraction: '8%',
};

type Props = {
  language?: 'de' | 'en';
  embedded?: boolean;
};

export function CompanionManagementPanel({ language = 'de', embedded = false }: Props) {
  const de = language === 'de';
  const [activeRole, setActiveRole] = useState<CompanionRoleV4>(() => loadCompanionRoleV4());

  useEffect(() => {
    const refresh = (event: Event) => {
      const role = (event as CustomEvent<{ role?: CompanionRoleV4 }>).detail?.role;
      setActiveRole(role ?? loadCompanionRoleV4());
    };
    window.addEventListener(COMPANION_SELECTION_EVENT, refresh as EventListener);
    return () => window.removeEventListener(COMPANION_SELECTION_EVENT, refresh as EventListener);
  }, []);

  const select = (role: CompanionRoleV4) => setActiveRole(saveCompanionRoleV4(role));
  const reserve = COMPANION_ROLE_ORDER_V4.filter(role => role !== activeRole);
  const activeCopy = COMPANION_ROLE_COPY_V4[activeRole];
  const shellClass = embedded
    ? 'rounded-3xl border border-violet-200/16 bg-black/46 p-4 text-white shadow-[0_18px_40px_rgba(0,0,0,.3)] md:p-6'
    : 'max-h-[min(76vh,760px)] overflow-y-auto overscroll-contain rounded-3xl border border-violet-200/16 bg-[#111019]/98 p-4 text-white shadow-2xl [-webkit-overflow-scrolling:touch] md:p-6';

  return <section data-testid="companion-management-panel" data-embedded={embedded ? 'true' : 'false'} className={shellClass}>
    <header className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div><div className="text-[7px] font-black uppercase tracking-[.3em] text-violet-100/42">{embedded ? (de ? 'BEGLEITER' : 'COMPANIONS') : (de ? 'BEGLEITER-RESERVE' : 'COMPANION RESERVE')}</div><h2 className="mt-1 text-xl font-black text-violet-50 md:text-2xl">{de ? 'Dein Gefährte im Schleier' : 'Your companion in the Veil'}</h2><p className="mt-2 max-w-2xl text-[9px] leading-relaxed text-white/42 md:text-[10px]">{de ? 'Wähle genau einen aktiven Begleiter. Vier Rollen bleiben in Reserve und können jederzeit vor oder während eines Runs gewechselt werden.' : 'Choose exactly one active companion. Four roles stay in reserve and can be switched before or during a run.'}</p></div>
      <div className="grid grid-cols-2 gap-2 text-center"><div className="rounded-xl border border-violet-200/12 bg-violet-400/[.05] px-3 py-2"><div className="text-[6px] font-black uppercase tracking-[.14em] text-white/30">Solo</div><div className="mt-1 text-sm font-black text-violet-100">1</div></div><div className="rounded-xl border border-violet-200/12 bg-violet-400/[.05] px-3 py-2"><div className="text-[6px] font-black uppercase tracking-[.14em] text-white/30">Duo</div><div className="mt-1 text-sm font-black text-violet-100">2</div></div></div>
    </header>

    <article data-testid="companion-active-role" data-companion-role={activeRole} className="mt-4 grid gap-3 rounded-2xl border border-violet-200/24 bg-[radial-gradient(circle_at_20%_0%,rgba(139,92,246,.2),rgba(255,255,255,.025)_62%)] p-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:p-5">
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-violet-200/22 bg-black/30 text-2xl text-violet-100">{ROLE_GLYPHS[activeRole]}</div>
      <div><div className="text-[6px] font-black uppercase tracking-[.18em] text-violet-100/42">{de ? 'AKTIV' : 'ACTIVE'}</div><div className="mt-1 text-base font-black text-white md:text-lg">{de ? activeCopy.de : activeCopy.en}</div><div className="mt-1 text-[8px] leading-relaxed text-white/42">{de ? activeCopy.bonusDe : activeCopy.bonusEn}</div></div>
      <div className="rounded-full border border-violet-200/18 bg-violet-400/10 px-3 py-2 text-center text-[8px] font-black text-violet-100">{ROLE_POWER[activeRole]} {de ? 'Reserve' : 'reserve'}</div>
    </article>

    <div className="mt-4 flex items-center justify-between"><div className="text-[7px] font-black uppercase tracking-[.2em] text-white/34">{de ? 'RESERVE · 4 ROLLEN' : 'RESERVE · 4 ROLES'}</div><div data-testid="companion-reserve-count" className="text-[7px] font-black text-white/34">{reserve.length}/4</div></div>
    <div data-testid="companion-reserve-grid" className="mt-2 grid gap-2 sm:grid-cols-2">
      {reserve.map(role => {
        const copy = COMPANION_ROLE_COPY_V4[role];
        return <button key={role} data-testid={`companion-role-${role}`} type="button" onClick={() => select(role)} className="grid min-h-[86px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/9 bg-white/[.025] p-3 text-left active:scale-[.985]">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-black/28 text-lg text-violet-100/76">{ROLE_GLYPHS[role]}</span><span className="min-w-0"><span className="block truncate text-[10px] font-black text-white/82">{de ? copy.de : copy.en}</span><span className="mt-1 block text-[7px] leading-relaxed text-white/36">{de ? copy.bonusDe : copy.bonusEn}</span></span><span className="rounded-full border border-white/10 px-2 py-1 text-[7px] font-black text-white/46">{ROLE_POWER[role]}</span>
        </button>;
      })}
    </div>

    <footer className="mt-4 grid gap-2 text-[7px] leading-relaxed text-white/35 sm:grid-cols-3"><div className="rounded-xl border border-white/8 bg-black/22 p-3"><strong className="block text-white/55">{de ? 'Nicht blockierend' : 'Nonblocking'}</strong>{de ? 'Begleiter haben keine Kollision mit Spielern oder Gegnern.' : 'Companions never collide with players or enemies.'}</div><div className="rounded-xl border border-white/8 bg-black/22 p-3"><strong className="block text-white/55">{de ? 'Keine Wiederbelebung' : 'No revive target'}</strong>{de ? 'Der sichere Duo-Wiederbelebungsvertrag bleibt unverändert.' : 'The safe Duo revive contract stays unchanged.'}</div><div className="rounded-xl border border-white/8 bg-black/22 p-3"><strong className="block text-white/55">{de ? 'Begrenzte Leistung' : 'Bounded power'}</strong>{de ? 'Alle Rollen bleiben im vorgesehenen Korridor von 8–12 %.' : 'Every role remains inside the intended 8–12% band.'}</div></footer>
  </section>;
}
