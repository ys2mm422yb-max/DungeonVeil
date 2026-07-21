import React, { useEffect, useState } from 'react';
import { currentOnlineSession, onlineSessionEventName } from '../game/supabaseOnline';
import { GuildAccessOverlay } from './GuildAccessOverlay';
import { GuildPanelMobile } from './GuildPanelMobile';
import { PlayerProfileCard } from './PlayerProfileCard';

type Props = { language: 'de' | 'en'; onClose: () => void; onOpenOnline: () => void };

export function GuildSocialPanel({ language, onClose, onOpenOnline }: Props) {
  const de = language === 'de';
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [signedIn, setSignedIn] = useState(() => Boolean(currentOnlineSession()));

  useEffect(() => {
    const refresh = () => setSignedIn(Boolean(currentOnlineSession()));
    window.addEventListener(onlineSessionEventName(), refresh);
    return () => window.removeEventListener(onlineSessionEventName(), refresh);
  }, []);

  if (!signedIn) return <section data-testid="guild-signed-out-panel" className="relative overflow-hidden rounded-3xl border border-amber-300/18 bg-[#0d0b08]/98 p-4 text-white shadow-2xl">
    <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-amber-400/8 blur-3xl" />
    <button data-testid="guild-close-button" type="button" aria-label={de ? 'Gilde schließen' : 'Close guild'} onPointerDown={event => { event.preventDefault(); onClose(); }} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-xl border border-white/12 bg-black/45 text-lg font-black text-white/72 active:scale-90">×</button>
    <header className="relative pr-12">
      <div className="text-[7px] font-black uppercase tracking-[.28em] text-amber-200/48">{de ? 'GILDE' : 'GUILD'}</div>
      <h2 className="mt-1 text-xl font-black text-amber-100">{de ? 'Gilde gründen' : 'Create Guild'}</h2>
      <p className="mt-2 text-[9px] leading-relaxed text-white/44">{de ? 'Melde dich an, um eine Gilde zu gründen, Einladungen anzunehmen und deine Mitglieder zu verwalten.' : 'Sign in to create a guild, accept invitations and manage your members.'}</p>
    </header>
    <div className="relative mt-4 grid grid-cols-3 gap-2">
      {[
        ['✦', de ? 'GILDENCHAT' : 'GUILD CHAT'],
        ['♜', de ? 'MITGLIEDER' : 'MEMBERS'],
        ['⌁', de ? 'EINLADUNGEN' : 'INVITES'],
      ].map(([icon, label]) => <div key={label} className="rounded-2xl border border-amber-300/10 bg-amber-400/[.035] px-2 py-3 text-center"><div className="text-lg text-amber-100/72">{icon}</div><div className="mt-1 text-[6px] font-black uppercase tracking-[.11em] text-white/38">{label}</div></div>)}
    </div>
    <button type="button" onPointerDown={event => { event.preventDefault(); onOpenOnline(); }} className="relative mt-4 min-h-11 w-full rounded-xl border border-amber-300/30 bg-amber-500/12 px-3 text-[8px] font-black uppercase tracking-[.14em] text-amber-100 active:scale-[.99]">{de ? 'ONLINE & CLOUD ÖFFNEN' : 'OPEN ONLINE & CLOUD'}</button>
  </section>;

  return <div data-testid="guild-social-panel" className="relative min-h-0 flex-1">
    <GuildPanelMobile
      language={language}
      onClose={onClose}
      onOpenOnline={onOpenOnline}
      onOpenMemberProfile={setSelectedProfileId}
    />
    <GuildAccessOverlay language={language} />
    {selectedProfileId && <PlayerProfileCard userId={selectedProfileId} language={language} onClose={() => setSelectedProfileId('')} />}
  </div>;
}
