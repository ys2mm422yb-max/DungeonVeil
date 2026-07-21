import React from 'react';
import type { PlayerProfileProgress } from '../game/playerProfile';
import { selectedProfileAvatar, selectedProfileCard, selectedProfileTitle } from '../game/playerProfile';
import { ProfileAvatarPortrait } from './ProfileAvatarPortrait';

type Props = {
  profile: PlayerProfileProgress;
  playerName: string;
  rank: number;
  language: 'de' | 'en';
  onOpen: () => void;
};

export function ProfileBadge({ profile, playerName, rank, language, onOpen }: Props) {
  const title = selectedProfileTitle(profile);
  const card = selectedProfileCard(profile);
  const avatar = selectedProfileAvatar(profile);

  return <button
    type="button"
    aria-label={language === 'de' ? 'Profil öffnen' : 'Open profile'}
    onPointerDown={event => { event.preventDefault(); onOpen(); }}
    className="absolute left-3 top-[max(10px,calc(env(safe-area-inset-top)+4px))] z-30 flex h-[44px] w-[min(43vw,160px)] items-center gap-1.5 rounded-[13px] border px-1.5 py-1 text-left shadow-[0_7px_18px_rgba(0,0,0,.38)] backdrop-blur-xl active:scale-[.97]"
    style={{ background: card.background, borderColor: `${card.border}9c`, boxShadow: `0 7px 18px rgba(0,0,0,.38),0 0 10px ${card.glow}` }}
    data-testid="main-menu-profile-badge"
  >
    <ProfileAvatarPortrait avatar={avatar} className="h-7 w-7 shrink-0 rounded-[9px] border border-white/14" />
    <div className="min-w-0 flex-1 leading-none">
      <div className="truncate text-[8.5px] font-black tracking-[.025em] text-white/90">{playerName}</div>
      <div className="mt-1 truncate text-[5px] font-black uppercase tracking-[.075em] text-white/46">
        {language === 'de' ? `Rang ${rank}` : `Rank ${rank}`} · {language === 'de' ? title.nameDe : title.nameEn}
      </div>
    </div>
    <span className="shrink-0 text-[10px] text-white/28">›</span>
  </button>;
}
