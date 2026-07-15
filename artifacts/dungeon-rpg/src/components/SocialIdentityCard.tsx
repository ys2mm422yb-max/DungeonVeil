import React from 'react';
import { resolveOnlineAvatar, resolveOnlineCard, resolveOnlineTitle } from '../game/onlineProfileCosmetics';

export function SocialIdentityCard({
  displayName,
  avatarKey,
  language,
  online = false,
  statusLabel,
  detail,
  compact = false,
  onClick,
}: {
  displayName: string;
  avatarKey: string | null | undefined;
  language: 'de' | 'en';
  online?: boolean;
  statusLabel?: string;
  detail?: string;
  compact?: boolean;
  onClick?: () => void;
}) {
  const avatar = resolveOnlineAvatar(avatarKey);
  const title = resolveOnlineTitle(avatarKey);
  const card = resolveOnlineCard(avatarKey);
  const content = <>
    <div className={`relative grid shrink-0 place-items-center rounded-2xl border border-white/18 text-xl shadow-inner ${compact ? 'h-11 w-11' : 'h-12 w-12'}`} style={{ background: avatar.background }}>
      {avatar.icon}
      <span className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#08090c] ${online ? 'bg-emerald-400' : 'bg-white/25'}`} />
    </div>
    <div className="min-w-0 flex-1 text-left">
      <div className="flex min-w-0 items-center gap-2"><div className="min-w-0 flex-1 truncate text-[12px] font-black text-white/90">{displayName}</div>{statusLabel && <span className={`shrink-0 text-[7px] font-black uppercase ${online ? 'text-emerald-200/78' : 'text-white/30'}`}>{statusLabel}</span>}</div>
      <div className="mt-1 truncate text-[7px] font-black uppercase tracking-[.13em] text-white/52">{language === 'de' ? title.nameDe : title.nameEn}</div>
      {detail && <div className="mt-1 truncate text-[7px] uppercase tracking-[.11em] text-white/32">{detail}</div>}
    </div>
  </>;

  const className = 'flex w-full min-w-0 items-center gap-3 rounded-2xl border p-2.5 active:scale-[.995]';
  const style = { background: card.background, borderColor: `${card.border}70`, boxShadow: `0 0 18px ${card.glow}` };
  return onClick
    ? <button type="button" onClick={onClick} className={className} style={style}>{content}<span className="shrink-0 text-base text-white/28">›</span></button>
    : <div className={className} style={style}>{content}</div>;
}
