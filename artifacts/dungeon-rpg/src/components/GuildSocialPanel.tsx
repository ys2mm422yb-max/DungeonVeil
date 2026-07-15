import React, { useCallback, useEffect, useState } from 'react';
import { resolveOnlineAvatar, resolveOnlineCard, resolveOnlineTitle } from '../game/onlineProfileCosmetics';
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

function roleLabel(role: OnlineGuildMember['role'], de: boolean): string {
  if (role === 'owner') return de ? 'Anführer' : 'Leader';
  if (role === 'officer') return de ? 'Offizier' : 'Officer';
  return de ? 'Mitglied' : 'Member';
}

export function GuildSocialPanel({ language, onClose, onOpenOnline }: Props) {
  const de = language === 'de';
  const [membership, setMembership] = useState<OnlineGuildMembership | null>(null);
  const [members, setMembers] = useState<OnlineGuildMember[]>([]);
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

  return <div data-testid="guild-social-panel" className="relative flex min-h-0 flex-1 flex-col">
    <div className="min-h-0 flex-1">
      <GuildPanelMobile language={language} onClose={onClose} onOpenOnline={onOpenOnline} />
    </div>

    {membership && members.length > 0 && <section data-testid="guild-member-profile-strip" className="absolute inset-x-3 bottom-3 z-30 rounded-2xl border border-cyan-300/14 bg-[#071116]/96 p-2.5 shadow-2xl backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-[7px] font-black uppercase tracking-[.2em] text-cyan-100/46">{de ? `${members.length} MITGLIEDER` : `${members.length} MEMBERS`}</div>
        <div className="text-[7px] text-white/28">{de ? 'Profil antippen' : 'Tap a profile'}</div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {members.map(member => {
          const name = member.profile?.display_name ?? (de ? 'Abenteurer' : 'Adventurer');
          const avatar = resolveOnlineAvatar(member.profile?.avatar_key);
          const title = resolveOnlineTitle(member.profile?.avatar_key);
          const card = resolveOnlineCard(member.profile?.avatar_key);
          return <button
            key={member.user_id}
            type="button"
            aria-label={de ? `Profil von ${name} öffnen` : `Open ${name}'s profile`}
            onClick={() => setSelectedProfileId(member.user_id)}
            className="flex min-w-[172px] items-center gap-2.5 rounded-xl border p-2 text-left active:scale-[.98]"
            style={{ background: card.background, borderColor: `${card.border}66`, boxShadow: `0 0 14px ${card.glow}` }}
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/18 text-base shadow-inner" style={{ background: avatar.background }}>{avatar.icon}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[10px] font-black text-white/90">{name}</div>
              <div className="mt-1 truncate text-[6px] font-black uppercase tracking-[.1em] text-white/52">{de ? title.nameDe : title.nameEn}</div>
              <div className="mt-0.5 truncate text-[5.5px] font-black uppercase tracking-[.12em] text-white/34">{roleLabel(member.role, de)}</div>
            </div>
            <span className="text-base text-white/24">›</span>
          </button>;
        })}
      </div>
    </section>}

    {selectedProfileId && <PlayerProfileCard userId={selectedProfileId} language={language} onClose={() => setSelectedProfileId('')} />}
  </div>;
}
