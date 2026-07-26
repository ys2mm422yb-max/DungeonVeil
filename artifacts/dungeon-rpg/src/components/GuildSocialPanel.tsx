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
      className="absolute bottom-3 right-3 z-20 min-h-11 rounded-2xl border border-violet-300/35 bg-violet-500/20 px-4 text-[8px] font-black uppercase tracking-[.16em] text-violet-100 shadow-xl backdrop-blur active:scale-[.98]"
    >{language === 'de' ? 'Gildenraid' : 'Guild raid'}</button>}
    {!qaMode && <GuildAccessOverlay language={language} />}
    {!qaMode && selectedProfileId && <PlayerProfileCard userId={selectedProfileId} language={language} onClose={() => setSelectedProfileId('')} />}
    {!qaMode && raidOpen && <GuildRaidLobbyPanel language={language} onClose={() => setRaidOpen(false)} />}
  </div>;
}
