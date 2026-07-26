import React, { useState } from 'react';
import { currentOnlineSession } from '../game/supabaseOnline';
import { GuildAccessOverlay } from './GuildAccessOverlay';
import { GuildPanelMobile } from './GuildPanelMobile';
import { GuildRaidLobbyPanel } from './GuildRaidLobbyPanel';
import { PlayerProfileCard } from './PlayerProfileCard';

type Props = { language: 'de' | 'en'; onClose: () => void; onOpenOnline: () => void };

function filledSocialQaEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('visualQa') === 'filled-social';
}

export function GuildSocialPanel({ language, onClose, onOpenOnline }: Props) {
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [raidOpen, setRaidOpen] = useState(false);
  const qaMode = filledSocialQaEnabled();
  const signedOut = !qaMode && !currentOnlineSession();

  return <div data-testid="guild-social-panel" className="relative min-h-0 flex-1">
    {signedOut && <span data-testid="guild-signed-out-panel" className="sr-only">Signed out</span>}
    <GuildPanelMobile
      language={language}
      onClose={onClose}
      onOpenOnline={onOpenOnline}
      onOpenMemberProfile={qaMode ? undefined : setSelectedProfileId}
    />
    {!signedOut && <button
      type="button"
      data-testid="guild-raid-entry"
      onClick={() => setRaidOpen(true)}
      className="absolute bottom-3 right-3 z-20 min-h-12 rounded-2xl border border-violet-200/35 bg-[linear-gradient(135deg,rgba(111,57,164,.92),rgba(60,30,88,.92))] px-4 text-left shadow-[0_12px_32px_rgba(25,10,42,.55)] backdrop-blur active:scale-[.98]"
    ><span className="block text-[6px] font-black uppercase tracking-[.18em] text-violet-100/55">{language === 'de' ? '4 Spieler · gleiche Gilde' : '4 players · same guild'}</span><span className="mt-0.5 block text-[9px] font-black uppercase tracking-[.14em] text-violet-50">{language === 'de' ? 'Gildenraid' : 'Guild raid'}</span></button>}
    {!qaMode && <GuildAccessOverlay language={language} />}
    {!qaMode && selectedProfileId && <PlayerProfileCard userId={selectedProfileId} language={language} onClose={() => setSelectedProfileId('')} />}
    {raidOpen && <GuildRaidLobbyPanel language={language} onClose={() => setRaidOpen(false)} />}
  </div>;
}
