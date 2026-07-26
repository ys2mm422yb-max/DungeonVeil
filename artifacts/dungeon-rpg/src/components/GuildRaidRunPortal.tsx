import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { GuildRaidRunPanel } from './GuildRaidRunPanel';

function findHandoff(): { target: HTMLElement; raidRunId: string } | null {
  const target = document.querySelector<HTMLElement>('[data-testid="guild-raid-started-handoff"]');
  if (!target) return null;
  const raidRunId = target.querySelector<HTMLElement>('.font-mono')?.textContent?.trim() ?? '';
  return raidRunId ? { target, raidRunId } : null;
}

export function GuildRaidRunPortal() {
  const [handoff, setHandoff] = useState<{ target: HTMLElement; raidRunId: string } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const refresh = () => setHandoff(findHandoff());
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  if (!handoff) return null;
  const language = document.documentElement.lang === 'en' ? 'en' : 'de';
  return <>
    {createPortal(<button type="button" data-testid="guild-raid-enter-run" onClick={() => setOpen(true)} className="mt-3 min-h-12 w-full rounded-xl border border-emerald-200/30 bg-emerald-500/14 px-4 text-[9px] font-black uppercase tracking-[.16em] text-emerald-100 active:scale-[.985]">{language === 'de' ? 'Raid-Raum betreten' : 'Enter raid room'}</button>, handoff.target)}
    {open && createPortal(<GuildRaidRunPanel raidRunId={handoff.raidRunId} language={language} onClose={() => setOpen(false)} />, document.body)}
  </>;
}
