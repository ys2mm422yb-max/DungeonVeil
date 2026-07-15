import React from 'react';
import type { PlayerProfileProgress } from '../game/playerProfile';
import { selectedProfileAvatar, selectedProfileCard, selectedProfileTitle } from '../game/playerProfile';

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
    className="absolute left-3 top-[max(10px,calc(env(safe-area-inset-top)+4px))] z-30 flex h-[52px] w-[min(47vw,184px)] items-center gap-2 rounded-[15px] border px-2 py-1.5 text-left shadow-[0_8px_22px_rgba(0,0,0,.34)] backdrop-blur-lg active:scale-[.97]"
    style={{ background: card.background, borderColor: `${card.border}b8`, boxShadow: `0 8px 22px rgba(0,0,0,.34),0 0 14px ${card.glow}` }}
    data-testid="main-menu-profile-badge"
  >
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border border-white/16 text-[16px] shadow-inner" style={{ background: avatar.background }} aria-hidden="true">{avatar.icon}</div>
    <div className="min-w-0 flex-1 leading-none">
      <div className="truncate text-[9px] font-black tracking-[.04em] text-white/92">{playerName}</div>
      <div className="mt-1 truncate text-[5.5px] font-black uppercase tracking-[.11em] text-white/50">
        {language === 'de' ? `Rang ${rank}` : `Rank ${rank}`} · {language === 'de' ? title.nameDe : title.nameEn}
      </div>
    </div>
    <span className="shrink-0 text-[12px] text-white/34">›</span>
  </button>;
}
