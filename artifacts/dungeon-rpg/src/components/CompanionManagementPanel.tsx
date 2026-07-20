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

const ROLE_TONE: Readonly<Record<CompanionRoleV4, string>> = {
  'single-target': 'border-cyan-200/30 bg-cyan-400/[.08] text-cyan-100',
  'critical-support': 'border-amber-200/30 bg-amber-400/[.08] text-amber-100',
  shield: 'border-emerald-200/30 bg-emerald-400/[.08] text-emerald-100',
  'loot-comfort': 'border-yellow-200/30 bg-yellow-400/[.08] text-yellow-100',
  distraction: 'border-violet-200/30 bg-violet-400/[.08] text-violet-100',
};

type Props = {
  language?: 'de' | 'en';
  embedded?: boolean;
};

function VeilWolfPortrait({ role }: { role: CompanionRoleV4 }) {
  return <div className={`relative grid h-24 w-24 place-items-center overflow-hidden rounded-[26px] border ${ROLE_TONE[role]}`}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,.14),transparent_42%)]" />
    <svg viewBox="0 0 120 120" aria-hidden="true" className="relative h-[86px] w-[86px] drop-shadow-[0_16px_20px_rgba(0,0,0,.5)]">
      <path d="M24 19 47 35l13-5 13 5 23-16-7 35c6 8 9 17 9 28 0 23-17 37-38 37S22 105 22 82c0-11 3-20 9-28l-7-35Z" fill="#171321" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M40 71c7-5 13-7 20-7s13 2 20 7l-5 18-15 12-15-12-5-18Z" fill="#292139"/>
      <path d="m40 71 11 6M80 71l-11 6M53 89l7 4 7-4" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="47" cy="69" r="3.2" fill="#f4ecff"/><circle cx="73" cy="69" r="3.2" fill="#f4ecff"/>
    </svg>
    <span className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full border border-white/12 bg-black/72 text-sm font-black text-current">{ROLE_GLYPHS[role]}</span>
  </div>;
}

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
    ? 'text-white'
    : 'max-h-[min(76vh,760px)] overflow-y-auto overscroll-contain rounded-3xl border border-violet-200/16 bg-[#111019]/98 p-4 text-white shadow-2xl [-webkit-overflow-scrolling:touch] md:p-6';

  return <section
    data-testid="companion-management-panel"
    data-embedded={embedded ? 'true' : 'false'}
    data-companion-species="veil-wolf"
    className={shellClass}
  >
    <header>
      <div className="text-[7px] font-black uppercase tracking-[.3em] text-violet-100/42">{de ? 'SCHLEIERWOLF' : 'VEIL WOLF'}</div>
      <h2 className="mt-1 text-2xl font-black text-violet-50">{de ? 'Ein Gefährte. Fünf Taktiken.' : 'One companion. Five tactics.'}</h2>
      <p className="mt-2 max-w-2xl text-[10px] leading-relaxed text-white/46">{de ? 'Der Schleierwolf bleibt immer an deiner Seite. Hier änderst du nur seine Kampfrolle – Aussehen, Begleiterzahl und Spielfeld bleiben unverändert.' : 'The Veil Wolf always stays at your side. Only its combat role changes here; appearance, companion count and play space stay unchanged.'}</p>
    </header>

    <article data-testid="companion-active-role" data-companion-role={activeRole} className="mt-4 grid grid-cols-[96px_minmax(0,1fr)] items-center gap-4 rounded-[26px] border border-violet-200/22 bg-[radial-gradient(circle_at_12%_10%,rgba(139,92,246,.2),rgba(255,255,255,.025)_58%)] p-3.5">
      <VeilWolfPortrait role={activeRole} />
      <div className="min-w-0">
        <div className="text-[7px] font-black uppercase tracking-[.2em] text-violet-100/42">{de ? 'AKTIVE TAKTIK' : 'ACTIVE TACTIC'}</div>
        <div className="mt-1 text-lg font-black text-white">{de ? activeCopy.de : activeCopy.en}</div>
        <div className="mt-1 text-[9px] leading-relaxed text-white/48">{de ? activeCopy.bonusDe : activeCopy.bonusEn}</div>
        <div className={`mt-3 inline-flex rounded-full border px-3 py-1.5 text-[8px] font-black ${ROLE_TONE[activeRole]}`}>{ROLE_POWER[activeRole]} {de ? 'WIRKUNG' : 'EFFECT'}</div>
      </div>
    </article>

    <div className="mt-4 flex items-center justify-between">
      <div className="text-[7px] font-black uppercase tracking-[.2em] text-white/38">{de ? 'ANDERE TAKTIKEN' : 'OTHER TACTICS'}</div>
      <div data-testid="companion-reserve-count" className="text-[7px] font-black text-white/38">{reserve.length} {de ? 'VERFÜGBAR' : 'AVAILABLE'}</div>
    </div>

    <div data-testid="companion-reserve-grid" className="mt-2 grid grid-cols-2 gap-2">
      {reserve.map(role => {
        const copy = COMPANION_ROLE_COPY_V4[role];
        return <button
          key={role}
          data-testid={`companion-role-${role}`}
          type="button"
          onPointerDown={event => { event.preventDefault(); select(role); }}
          className={`min-w-0 rounded-2xl border p-3 text-left transition active:scale-[.98] ${ROLE_TONE[role]}`}
        >
          <span className="flex items-start justify-between gap-2"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/30 text-base">{ROLE_GLYPHS[role]}</span><span className="rounded-full border border-white/10 bg-black/24 px-2 py-1 text-[7px] font-black text-white/58">{ROLE_POWER[role]}</span></span>
          <span className="mt-3 block text-[10px] font-black leading-tight text-white/88">{de ? copy.de : copy.en}</span>
          <span className="mt-1 block text-[7px] leading-relaxed text-white/42">{de ? copy.bonusDe : copy.bonusEn}</span>
        </button>;
      })}
    </div>
  </section>;
}
