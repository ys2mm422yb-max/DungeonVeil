import React, { useCallback, useEffect, useState } from 'react';
import { currentOnlineSession, getMyGuildMembership, onlineSessionEventName } from '../game/supabaseOnline';
import { GuildAccessOverlay } from './GuildAccessOverlay';
import { GuildPanelMobile } from './GuildPanelMobile';
import { GuildRaidLobbyPanel } from './GuildRaidLobbyPanel';
import { PlayerProfileCard } from './PlayerProfileCard';
import './guildRaidTouchTargets.css';

type Props = { language: 'de' | 'en'; onClose: () => void; onOpenOnline: () => void };

function filledSocialQaEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('visualQa') === 'filled-social';
}

export function GuildSocialPanel({ language, onClose, onOpenOnline }: Props) {
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [raidOpen, setRaidOpen] = useState(false);
  const [raidEligible, setRaidEligible] = useState(false);
  const qaMode = filledSocialQaEnabled();
  const signedOut = !qaMode && !currentOnlineSession();

  const refreshRaidEligibility = useCallback(async () => {
    if (qaMode) {
      setRaidEligible(true);
      return;
    }
    if (!currentOnlineSession()) {
      setRaidEligible(false);
      return;
    }
    try { setRaidEligible(Boolean(await getMyGuildMembership())); }
    catch { setRaidEligible(false); }
  }, [qaMode]);

  useEffect(() => {
    void refreshRaidEligibility();
    const eventName = onlineSessionEventName();
    const refresh = () => { void refreshRaidEligibility(); };
    window.addEventListener(eventName, refresh);
    return () => window.removeEventListener(eventName, refresh);
  }, [refreshRaidEligibility]);

  return <div data-testid="guild-social-panel" className="relative flex min-h-0 flex-1 flex-col gap-2">
    {signedOut && <span data-testid="guild-signed-out-panel" className="sr-only">Signed out</span>}
    <GuildPanelMobile
      language={language}
      onClose={onClose}
      onOpenOnline={onOpenOnline}
      onOpenMemberProfile={qaMode ? undefined : setSelectedProfileId}
    />
    {raidEligible && <button
      type="button"
      data-testid="guild-raid-entry"
      aria-label={language === 'de' ? 'Gildenraid öffnen' : 'Open guild raid'}
      onClick={() => setRaidOpen(true)}
      className="min-h-12 w-full shrink-0 rounded-2xl border border-violet-200/28 bg-[linear-gradient(135deg,rgba(70,35,105,.96),rgba(28,17,43,.98))] px-4 py-2.5 text-left shadow-[0_12px_28px_rgba(25,10,42,.42)] active:scale-[.985]"
    >
      <span className="block text-[6px] font-black uppercase tracking-[.18em] text-violet-100/52">{language === 'de' ? 'PRIVATE LOBBY · 4 GILDENMITGLIEDER' : 'PRIVATE LOBBY · 4 GUILD MEMBERS'}</span>
      <span className="mt-1 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[.14em] text-violet-50"><span>{language === 'de' ? 'Gildenraid öffnen' : 'Open guild raid'}</span><span className="text-violet-100/45">›</span></span>
    </button>}
    {!qaMode && <GuildAccessOverlay language={language} />}
    {!qaMode && selectedProfileId && <PlayerProfileCard userId={selectedProfileId} language={language} onClose={() => setSelectedProfileId('')} />}
    {raidOpen && <GuildRaidLobbyPanel language={language} onClose={() => setRaidOpen(false)} />}
  </div>;
}
