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
    className="absolute left-3 top-[max(12px,calc(env(safe-area-inset-top)+5px))] z-30 flex min-w-[150px] max-w-[58vw] items-center gap-2 rounded-2xl border px-2.5 py-2 text-left shadow-[0_10px_26px_rgba(0,0,0,.35)] backdrop-blur-lg active:scale-[.97]"
    style={{ background: card.background, borderColor: card.border, boxShadow: `0 10px 28px rgba(0,0,0,.38),0 0 18px ${card.glow}` }}
    data-testid="main-menu-profile-badge"
  >
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/18 text-[18px] shadow-inner" style={{ background: avatar.background }} aria-hidden="true">{avatar.icon}</div>
    <div className="min-w-0 flex-1">
      <div className="truncate text-[10px] font-black tracking-[.04em] text-white/92">{playerName}</div>
      <div className="mt-0.5 truncate text-[6px] font-black uppercase tracking-[.13em] text-white/52">
        {language === 'de' ? `Rang ${rank}` : `Rank ${rank}`} · {language === 'de' ? title.nameDe : title.nameEn}
      </div>
    </div>
    <span className="text-sm text-white/38">›</span>
  </button>;
}
