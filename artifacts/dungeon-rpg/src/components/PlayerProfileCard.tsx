import React, { useEffect, useState } from 'react';
import { getSocialProfileCard, type SocialProfileCardData } from '../game/socialProgressOnline';

type Props = {
  userId: string;
  language: 'de' | 'en';
  onClose: () => void;
};

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('') || '?';
}

function formatLastActive(value: string, language: 'de' | 'en'): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

export function PlayerProfileCard({ userId, language, onClose }: Props) {
  const de = language === 'de';
  const [profile, setProfile] = useState<SocialProfileCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    void getSocialProfileCard(userId)
      .then(result => { if (!cancelled) setProfile(result); })
      .catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  const copyCode = async () => {
    if (!profile?.friend_code) return;
    await navigator.clipboard?.writeText(profile.friend_code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/78 px-5 backdrop-blur-md" onPointerDown={onClose}>
    <div data-testid="player-profile-card" className="w-full max-w-sm rounded-3xl border border-cyan-300/20 bg-[linear-gradient(150deg,rgba(11,23,29,.98),rgba(7,8,12,.98))] p-4 text-white shadow-2xl" onPointerDown={event => event.stopPropagation()}>
      {loading && <div className="py-8 text-center text-[9px] font-black uppercase tracking-[.2em] text-white/35">{de ? 'Profil wird geladen …' : 'Loading profile …'}</div>}
      {error && <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-[10px] text-red-200">{error}</div>}
      {!loading && profile && <>
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-cyan-300/22 bg-cyan-400/10 text-base font-black text-cyan-100">{initials(profile.display_name)}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-black text-cyan-50">{profile.display_name}</div>
            <button type="button" onClick={() => void copyCode()} className="mt-1 rounded-lg border border-cyan-300/14 bg-cyan-400/[.05] px-2.5 py-1 text-[8px] font-black uppercase tracking-[.16em] text-cyan-100/64 active:scale-[.98]">{copied ? (de ? 'Kopiert' : 'Copied') : profile.friend_code}</button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3 text-center"><div className="text-[7px] font-black uppercase tracking-[.15em] text-white/28">{de ? 'Rang' : 'Rank'}</div><div className="mt-1 text-lg font-black text-amber-100">{profile.current_rank}</div></div>
          <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3 text-center"><div className="text-[7px] font-black uppercase tracking-[.15em] text-white/28">{de ? 'Kapitel' : 'Chapter'}</div><div className="mt-1 text-lg font-black text-violet-100">{profile.current_chapter}</div></div>
          <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3 text-center"><div className="text-[7px] font-black uppercase tracking-[.15em] text-white/28">{de ? 'Klasse' : 'Class'}</div><div className="mt-2 text-[9px] font-black uppercase text-emerald-100">{profile.character_key === 'archer' ? (de ? 'Jäger' : 'Ranger') : profile.character_key}</div></div>
        </div>

        <div className="mt-3 space-y-2 rounded-2xl border border-white/8 bg-white/[.02] p-3 text-[9px]">
          <div className="flex items-center justify-between gap-3"><span className="text-white/30">{de ? 'Gilde' : 'Guild'}</span><span className="text-right font-black text-white/66">{profile.guild_name ? `[${profile.guild_tag ?? ''}] ${profile.guild_name}` : (de ? 'Keine Gilde' : 'No guild')}</span></div>
          <div className="flex items-center justify-between gap-3"><span className="text-white/30">{de ? 'Zuletzt aktiv' : 'Last active'}</span><span className="text-right text-white/54">{formatLastActive(profile.last_active_at, language)}</span></div>
        </div>
      </>}

      <button type="button" onClick={onClose} className="mt-4 w-full rounded-xl border border-white/10 bg-white/[.035] py-2.5 text-[8px] font-black uppercase tracking-[.16em] text-white/48 active:scale-[.98]">{de ? 'Schließen' : 'Close'}</button>
    </div>
  </div>;
}
