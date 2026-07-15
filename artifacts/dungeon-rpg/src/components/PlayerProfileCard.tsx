import React, { useEffect, useMemo, useState } from 'react';
import { resolveOnlineAvatar, resolveOnlineCard, resolveOnlineTitle } from '../game/onlineProfileCosmetics';
import { getSocialProfileCard, type SocialProfileCardData } from '../game/socialProgressOnline';

type Props = {
  userId: string;
  language: 'de' | 'en';
  onClose: () => void;
};

type Achievement = { icon: string; de: string; en: string };

function formatDate(value: string, language: 'de' | 'en', withTime = false): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', withTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(Number(value) || 0);
}

const ACHIEVEMENTS: Record<string, Achievement> = {
  first_steps: { icon: '➜', de: 'Erste Schritte', en: 'First Steps' },
  veil_walker: { icon: '◈', de: 'Schleierwanderer', en: 'Veil Walker' },
  boss_hunter: { icon: '♛', de: 'Bossjäger', en: 'Boss Hunter' },
  guild_bound: { icon: '♜', de: 'Gildengebunden', en: 'Guild Bound' },
  companion: { icon: '♡', de: 'Gefährte', en: 'Companion' },
};

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

  const achievements = useMemo(() => (profile?.achievement_keys ?? [])
    .map(key => ACHIEVEMENTS[key])
    .filter((achievement): achievement is Achievement => Boolean(achievement)), [profile?.achievement_keys]);
  const avatar = resolveOnlineAvatar(profile?.avatar_key);
  const title = resolveOnlineTitle(profile?.avatar_key);
  const card = resolveOnlineCard(profile?.avatar_key);

  const copyCode = async () => {
    if (!profile?.friend_code) return;
    await navigator.clipboard?.writeText(profile.friend_code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/82 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-md" onPointerDown={onClose}>
    <div data-testid="player-profile-card" className="max-h-full w-full max-w-sm overflow-y-auto rounded-3xl border bg-[#08090c]/98 p-4 text-white shadow-2xl" style={{ borderColor: `${card.border}70`, boxShadow: `0 20px 70px rgba(0,0,0,.7),0 0 30px ${card.glow}` }} onPointerDown={event => event.stopPropagation()}>
      {loading && <div className="py-8 text-center text-[9px] font-black uppercase tracking-[.2em] text-white/35">{de ? 'Profil wird geladen …' : 'Loading profile …'}</div>}
      {error && <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-[10px] text-red-200">{error}</div>}
      {!loading && profile && <>
        <section className="overflow-hidden rounded-2xl border p-4" style={{ background: card.background, borderColor: card.border, boxShadow: `0 0 22px ${card.glow}` }}>
          <div className="flex items-center gap-3">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/20 text-2xl shadow-inner" style={{ background: avatar.background }}>{avatar.icon}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-black text-white">{profile.display_name}</div>
              <div className="mt-1 truncate text-[8px] font-black uppercase tracking-[.14em] text-white/58">{de ? `Rang ${profile.current_rank}` : `Rank ${profile.current_rank}`} · {de ? title.nameDe : title.nameEn}</div>
              <div className="mt-2 flex flex-wrap gap-1.5"><span className="rounded-full border border-white/12 bg-black/18 px-2 py-1 text-[6px] font-black uppercase tracking-[.12em] text-white/58">{de ? card.nameDe : card.nameEn}</span>{profile.guild_name && <span className="rounded-full border border-white/12 bg-black/18 px-2 py-1 text-[6px] font-black uppercase tracking-[.12em] text-white/58">[{profile.guild_tag ?? ''}] {profile.guild_name}</span>}</div>
            </div>
          </div>
          <button type="button" onClick={() => void copyCode()} className="mt-3 flex w-full items-center justify-between rounded-xl border border-white/12 bg-black/18 px-3 py-2 text-[8px] active:scale-[.99]"><span className="text-white/38">{de ? 'Freundescode' : 'Friend code'}</span><span className="font-black tracking-[.16em] text-white/76">{copied ? (de ? 'KOPIERT' : 'COPIED') : profile.friend_code}</span></button>
        </section>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3 text-center"><div className="text-[7px] font-black uppercase tracking-[.15em] text-white/30">{de ? 'Level' : 'Level'}</div><div className="mt-1 text-lg font-black text-cyan-100">{profile.account_level}</div></div>
          <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3 text-center"><div className="text-[7px] font-black uppercase tracking-[.15em] text-white/30">{de ? 'Rang' : 'Rank'}</div><div className="mt-1 text-lg font-black text-amber-100">{profile.current_rank}</div></div>
          <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3 text-center"><div className="text-[7px] font-black uppercase tracking-[.15em] text-white/30">{de ? 'Kapitel' : 'Chapter'}</div><div className="mt-1 text-lg font-black text-violet-100">{profile.current_chapter}</div></div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-orange-300/10 bg-orange-400/[.025] p-3 text-center"><div className="text-[7px] font-black uppercase tracking-[.13em] text-white/30">{de ? 'Boss-Schaden' : 'Boss Damage'}</div><div className="mt-1 text-[12px] font-black text-orange-100">{formatNumber(profile.lifetime_world_boss_damage)}</div></div>
          <div className="rounded-2xl border border-orange-300/10 bg-orange-400/[.025] p-3 text-center"><div className="text-[7px] font-black uppercase tracking-[.13em] text-white/30">{de ? 'Bosswochen' : 'Boss Weeks'}</div><div className="mt-1 text-[12px] font-black text-orange-100">{profile.world_boss_events}</div></div>
          <div className="rounded-2xl border border-cyan-300/10 bg-cyan-400/[.025] p-3 text-center"><div className="text-[7px] font-black uppercase tracking-[.13em] text-white/30">{de ? 'Freunde' : 'Friends'}</div><div className="mt-1 text-[12px] font-black text-cyan-100">{profile.friend_count}</div></div>
        </div>

        <div className="mt-3 space-y-2 rounded-2xl border border-white/8 bg-white/[.02] p-3 text-[9px]">
          <div className="flex items-center justify-between gap-3"><span className="text-white/34">{de ? 'Klasse' : 'Class'}</span><span className="text-right font-black uppercase text-emerald-100/74">{profile.character_key === 'archer' ? (de ? 'Jäger' : 'Ranger') : profile.character_key}</span></div>
          <div className="flex items-center justify-between gap-3"><span className="text-white/34">{de ? 'Gilde' : 'Guild'}</span><span className="text-right font-black text-white/70">{profile.guild_name ? `[${profile.guild_tag ?? ''}] ${profile.guild_name}` : (de ? 'Keine Gilde' : 'No guild')}</span></div>
          <div className="flex items-center justify-between gap-3"><span className="text-white/34">{de ? 'Dabei seit' : 'Joined'}</span><span className="text-right text-white/58">{formatDate(profile.joined_at, language)}</span></div>
          <div className="flex items-center justify-between gap-3"><span className="text-white/34">{de ? 'Zuletzt aktiv' : 'Last active'}</span><span className="text-right text-white/58">{formatDate(profile.last_active_at, language, true)}</span></div>
        </div>

        <section className="mt-3 rounded-2xl border border-amber-300/10 bg-amber-400/[.025] p-3">
          <div className="text-[7px] font-black uppercase tracking-[.18em] text-amber-100/46">{de ? 'ERFOLGE' : 'ACHIEVEMENTS'}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {achievements.map((achievement, index) => <div key={`${achievement.de}-${index}`} className="rounded-full border border-amber-300/14 bg-amber-400/[.05] px-2.5 py-1 text-[7px] font-black text-amber-100/76"><span className="mr-1">{achievement.icon}</span>{de ? achievement.de : achievement.en}</div>)}
            {!achievements.length && <div className="text-[8px] text-white/32">{de ? 'Noch keine Erfolge freigeschaltet.' : 'No achievements unlocked yet.'}</div>}
          </div>
        </section>
      </>}

      <button type="button" onClick={onClose} className="mt-4 w-full rounded-xl border border-white/10 bg-white/[.035] py-2.5 text-[8px] font-black uppercase tracking-[.16em] text-white/52 active:scale-[.98]">{de ? 'Schließen' : 'Close'}</button>
    </div>
  </div>;
}
