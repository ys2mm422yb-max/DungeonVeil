import React from 'react';
import type { MetaProgression } from '../game/metaProgression';
import {
  selectedProfileAvatar,
  selectedProfileCard,
  selectedProfileTitle,
  type PlayerProfileProgress,
} from '../game/playerProfile';

export function PlayerProfileBadge({
  profile,
  meta,
  playerName,
  language,
  onOpen,
}: {
  profile: PlayerProfileProgress;
  meta: MetaProgression;
  playerName: string;
  language: 'de' | 'en';
  onOpen: () => void;
}) {
  const avatar = selectedProfileAvatar(profile);
  const title = selectedProfileTitle(profile);
  const card = selectedProfileCard(profile);
  const de = language === 'de';

  return <button
    type="button"
    aria-label={de ? 'Spielerprofil öffnen' : 'Open player profile'}
    data-testid="main-menu-profile-badge"
    onPointerDown={event => { event.preventDefault(); onOpen(); }}
    className="absolute left-3 top-[max(12px,calc(env(safe-area-inset-top)+5px))] z-30 flex max-w-[min(62vw,250px)] items-center gap-2.5 rounded-2xl border px-2.5 py-2 text-left shadow-[0_12px_32px_rgba(0,0,0,.42)] backdrop-blur-xl active:scale-[.975]"
    style={{ background: card.background, borderColor: `${card.border}88`, boxShadow: `0 12px 32px rgba(0,0,0,.42),0 0 18px ${card.glow}` }}
  >
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/18 text-lg shadow-inner" style={{ background: avatar.background }}>{avatar.icon}</span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[11px] font-black text-white/92">{playerName}</span>
      <span className="mt-0.5 block truncate text-[6.5px] font-black uppercase tracking-[.12em] text-white/48">{de ? `Rang ${meta.rank}` : `Rank ${meta.rank}`} · {de ? title.nameDe : title.nameEn}</span>
    </span>
    <span className="shrink-0 text-sm text-white/35">›</span>
  </button>;
}
