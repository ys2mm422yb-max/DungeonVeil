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

const AVATAR_ICONS: Record<string, string> = {
  ranger: '🏹', ember: '🔥', frost: '❄', warden: '♜', sigil: '✦', veil: '◈',
  'night-watch': '☾', 'arcane-eye': '◉',
};

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('') || '?';
}

function avatarFor(member: OnlineGuildMember): string {
  const key = member.profile?.avatar_key ?? '';
  return AVATAR_ICONS[key] ?? initials(member.profile?.display_name ?? '?');
}

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
        <div className="text-[7px] font-black uppercase tracking-[.2em] text-cyan-100/46">{de ? `${members.length} MITGLIEDERPROFILE` : `${members.length} MEMBER PROFILES`}</div>
        <div className="text-[7px] text-white/24">{de ? 'Antippen zum Öffnen' : 'Tap to open'}</div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch]">
        {members.map(member => {
          const name = member.profile?.display_name ?? (de ? 'Abenteurer' : 'Adventurer');
          return <button
            key={member.user_id}
            type="button"
            onClick={() => setSelectedProfileId(member.user_id)}
            className="flex min-w-[148px] items-center gap-2.5 rounded-xl border border-white/8 bg-white/[.035] p-2 text-left active:scale-[.98]"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-300/18 bg-[radial-gradient(circle_at_35%_28%,rgba(103,232,249,.22),rgba(12,32,42,.92)_72%)] text-base font-black text-cyan-50">{avatarFor(member)}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[10px] font-black text-white/86">{name}</div>
              <div className="mt-1 truncate text-[6px] font-black uppercase tracking-[.13em] text-cyan-100/46">{roleLabel(member.role, de)}</div>
            </div>
            <span className="text-base text-white/20">›</span>
          </button>;
        })}
      </div>
    </section>}

    {selectedProfileId && <PlayerProfileCard userId={selectedProfileId} language={language} onClose={() => setSelectedProfileId('')} />}
  </div>;
}
