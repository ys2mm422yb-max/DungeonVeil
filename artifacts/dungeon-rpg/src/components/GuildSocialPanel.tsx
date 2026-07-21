import React, { useState } from 'react';
import { currentOnlineSession } from '../game/supabaseOnline';
import { GuildAccessOverlay } from './GuildAccessOverlay';
import { GuildPanelMobile } from './GuildPanelMobile';
import { PlayerProfileCard } from './PlayerProfileCard';

type Props = { language: 'de' | 'en'; onClose: () => void; onOpenOnline: () => void };

function filledSocialQaEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('visualQa') === 'filled-social';
}

export function GuildSocialPanel({ language, onClose, onOpenOnline }: Props) {
  const [selectedProfileId, setSelectedProfileId] = useState('');
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
    {!qaMode && <GuildAccessOverlay language={language} />}
    {!qaMode && selectedProfileId && <PlayerProfileCard userId={selectedProfileId} language={language} onClose={() => setSelectedProfileId('')} />}
  </div>;
}
