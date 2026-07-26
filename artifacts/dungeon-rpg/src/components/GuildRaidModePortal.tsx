import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { currentOnlineSession, getMyGuildMembership, onlineSessionEventName } from '../game/supabaseOnline';
import { GuildRaidLobbyPanel } from './GuildRaidLobbyPanel';

function findPlayModeTarget(): HTMLElement | null {
  const headings = Array.from(document.querySelectorAll('div'));
  const heading = headings.find(node => {
    const text = node.textContent?.trim();
    return text === 'SPIELMODUS WÄHLEN' || text === 'CHOOSE GAME MODE';
  });
  const target = heading?.nextElementSibling;
  return target instanceof HTMLElement ? target : null;
}

export function GuildRaidModePortal() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [eligible, setEligible] = useState(false);
  const [checking, setChecking] = useState(false);
  const [open, setOpen] = useState(false);

  const refreshEligibility = useCallback(async () => {
    const session = currentOnlineSession();
    if (!session) {
      setEligible(false);
      setChecking(false);
      return;
    }
    setChecking(true);
    try { setEligible(Boolean(await getMyGuildMembership())); }
    catch { setEligible(false); }
    finally { setChecking(false); }
  }, []);

  useEffect(() => {
    const refreshTarget = () => setTarget(findPlayModeTarget());
    refreshTarget();
    const observer = new MutationObserver(refreshTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!target) return;
    void refreshEligibility();
    const eventName = onlineSessionEventName();
    const refresh = () => { void refreshEligibility(); };
    window.addEventListener(eventName, refresh);
    return () => window.removeEventListener(eventName, refresh);
  }, [refreshEligibility, target]);

  const language = document.documentElement.lang === 'en' ? 'en' : 'de';
  const button = target ? createPortal(
    <button
      type="button"
      data-testid="main-menu-guild-raid-mode"
      disabled={!eligible || checking}
      onClick={event => {
        event.preventDefault();
        event.stopPropagation();
        if (eligible) setOpen(true);
      }}
      className={`group min-h-[54px] w-full rounded-[16px] border px-2.5 py-2 text-left shadow-[0_10px_22px_rgba(0,0,0,.3)] backdrop-blur-md transition active:scale-[.975] ${eligible ? 'border-violet-300/24 bg-[linear-gradient(135deg,rgba(61,31,91,.98),rgba(18,11,29,.99))]' : 'border-white/[.08] bg-[linear-gradient(135deg,rgba(24,21,28,.96),rgba(9,8,12,.98))] opacity-55'}`}
    >
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border border-violet-100/12 bg-black/28 text-violet-100/80 shadow-inner">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h12v11l-6 5-6-5Z"/><path d="m12 7 1.2 2.5 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4Z"/></svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="whitespace-nowrap text-[11px] font-black uppercase tracking-[.025em] text-[#f4ebdf]">{language === 'de' ? 'Gildenraid' : 'Guild Raid'}</div>
          <div className="mt-0.5 whitespace-nowrap text-[6.2px] uppercase tracking-[.045em] text-white/44">{checking ? (language === 'de' ? 'GILDE WIRD GEPRÜFT' : 'CHECKING GUILD') : eligible ? (language === 'de' ? 'PRIVATE LOBBY · 4 GILDENMITGLIEDER' : 'PRIVATE LOBBY · 4 GUILD MEMBERS') : (language === 'de' ? 'NUR MIT GILDENMITGLIEDSCHAFT' : 'GUILD MEMBERSHIP REQUIRED')}</div>
        </div>
        {eligible && <span className="text-base text-white/28 group-active:translate-x-0.5">›</span>}
      </div>
    </button>,
    target,
  ) : null;

  return <>
    {button}
    {open && createPortal(
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#06070b]/82 px-3 py-[max(12px,env(safe-area-inset-top))] backdrop-blur-md" onClick={() => setOpen(false)}>
        <div className="w-full max-w-sm" onClick={event => event.stopPropagation()}>
          <GuildRaidLobbyPanel language={language} onClose={() => setOpen(false)} />
        </div>
      </div>,
      document.body,
    )}
  </>;
}
