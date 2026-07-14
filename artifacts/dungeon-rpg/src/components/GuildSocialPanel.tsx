import React, { useCallback, useEffect, useState } from 'react';
import {
  currentOnlineSession,
  getMyGuildMembership,
  listGuildMembers,
  onlineSessionEventName,
  type OnlineGuildMember,
  type OnlineGuildMembership,
} from '../game/supabaseOnline';
import { GuildPanelMobile } from './GuildPanelMobile';
import { PlayerProfileCard } from './PlayerProfileCard';

type Props = { language: 'de' | 'en'; onClose: () => void; onOpenOnline: () => void };

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('') || '?';
}

export function GuildSocialPanel({ language, onClose, onOpenOnline }: Props) {
  const de = language === 'de';
  const [membership, setMembership] = useState<OnlineGuildMembership | null>(null);
  const [members, setMembers] = useState<OnlineGuildMember[]>([]);
  const [profilesOpen, setProfilesOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState('');

  const refresh = useCallback(async () => {
    if (!currentOnlineSession()) {
      setMembership(null);
      setMembers([]);
      return;
    }
    const nextMembership = await getMyGuildMembership();
    setMembership(nextMembership);
    setMembers(nextMembership ? await listGuildMembers(nextMembership.guild.id) : []);
  }, []);

  useEffect(() => {
    const handleChange = () => { void refresh().catch(() => {}); };
    window.addEventListener(onlineSessionEventName(), handleChange);
    handleChange();
    return () => window.removeEventListener(onlineSessionEventName(), handleChange);
  }, [refresh]);

  return <div data-testid="guild-social-panel" className="relative min-h-0 flex-1">
    <GuildPanelMobile language={language} onClose={onClose} onOpenOnline={onOpenOnline} />
    {membership && members.length > 0 && <button
      data-testid="guild-profile-list-button"
      type="button"
      onClick={() => setProfilesOpen(true)}
      className="absolute right-14 top-3 z-20 rounded-xl border border-cyan-300/16 bg-[#071218]/92 px-3 py-2 text-[7px] font-black uppercase tracking-[.12em] text-cyan-100 shadow-lg active:scale-[.98]"
    >{de ? 'Profile' : 'Profiles'} · {members.length}</button>}

    {profilesOpen && membership && <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/80 px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-md" onPointerDown={() => setProfilesOpen(false)}>
      <div className="max-h-full w-full max-w-sm overflow-y-auto rounded-3xl border border-cyan-300/18 bg-[#081014]/98 p-4 text-white shadow-2xl" onPointerDown={event => event.stopPropagation()}>
        <div className="text-[8px] font-black uppercase tracking-[.25em] text-cyan-100/45">{de ? 'GILDENPROFILE' : 'GUILD PROFILES'}</div>
        <div className="mt-1 text-lg font-black text-cyan-50">[{membership.guild.tag}] {membership.guild.name}</div>
        <div className="mt-3 space-y-2">{members.map(member => {
          const name = member.profile?.display_name ?? (de ? 'Abenteurer' : 'Adventurer');
          return <button key={member.user_id} type="button" onClick={() => setSelectedProfileId(member.user_id)} className="flex w-full items-center gap-3 rounded-2xl border border-cyan-300/10 bg-cyan-400/[.025] p-3 text-left active:scale-[.99]">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-cyan-300/16 bg-cyan-400/8 text-[10px] font-black text-cyan-100">{initials(name)}</div>
            <div className="min-w-0 flex-1"><div className="truncate text-[11px] font-black text-white/82">{name}</div><div className="mt-1 text-[7px] font-black uppercase tracking-[.12em] text-white/28">{member.role}</div></div>
            <span className="text-lg text-white/22">›</span>
          </button>;
        })}</div>
        <button type="button" onClick={() => setProfilesOpen(false)} className="mt-3 w-full rounded-xl border border-white/9 bg-white/[.03] py-2.5 text-[8px] font-black uppercase tracking-[.15em] text-white/42">{de ? 'Schließen' : 'Close'}</button>
      </div>
    </div>}

    {selectedProfileId && <PlayerProfileCard userId={selectedProfileId} language={language} onClose={() => setSelectedProfileId('')} />}
  </div>;
}
