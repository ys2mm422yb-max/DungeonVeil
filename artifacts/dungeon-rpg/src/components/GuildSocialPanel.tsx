import React, { useState } from 'react';
import { GuildAccessOverlay } from './GuildAccessOverlay';
import { GuildPanelMobile } from './GuildPanelMobile';
import { PlayerProfileCard } from './PlayerProfileCard';

type Props = { language: 'de' | 'en'; onClose: () => void; onOpenOnline: () => void };

export function GuildSocialPanel({ language, onClose, onOpenOnline }: Props) {
  const [selectedProfileId, setSelectedProfileId] = useState('');

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
