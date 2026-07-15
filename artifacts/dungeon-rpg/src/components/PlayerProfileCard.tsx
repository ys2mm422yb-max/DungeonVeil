import React, { useEffect, useId, useMemo, useState } from 'react';
import { getSocialProfileCard, type SocialProfileCardData } from '../game/socialProgressOnline';

type Props = {
  userId: string;
  language: 'de' | 'en';
  onClose: () => void;
};

type Achievement = { icon: string; de: string; en: string };

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('') || '?';
}

function formatDate(value: string, language: 'de' | 'en', withTime = false): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', withTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function formatNumber(value: number, language: 'de' | 'en'): string {
  return new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-US', { maximumFractionDigits: 0 }).format(Number(value) || 0);
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
  const titleId = useId();
  const [profile, setProfile] = useState<SocialProfileCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setProfile(null);
    setLoading(true);
    setError('');
    void getSocialProfileCard(userId)
      .then(result => { if (!cancelled) setProfile(result); })
      .catch(() => { if (!cancelled) setError(de ? 'Das öffentliche Profil konnte nicht geladen werden.' : 'The public profile could not be loaded.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [de, userId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const achievements = useMemo(() => (profile?.achievement_keys ?? [])
    .map(key => ACHIEVEMENTS[key])
    .filter((achievement): achievement is Achievement => Boolean(achievement)), [profile?.achievement_keys]);

  const copyCode = async () => {
    if (!profile?.friend_code) return;
    try {
      await navigator.clipboard?.writeText(profile.friend_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return <div
    className="fixed inset-0 z-[180] flex items-center justify-center overflow-hidden bg-black/82 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-md"
    role="dialog"
    aria-modal="true"
    aria-labelledby={titleId}
    data-testid="public-player-profile-dialog"
    onPointerDown={onClose}
  >
    <div
      data-testid="player-profile-card"
      className="relative max-h-full w-full max-w-sm overflow-y-auto overscroll-contain rounded-3xl border border-cyan-300/20 bg-[linear-gradient(150deg,rgba(11,23,29,.99),rgba(7,8,12,.99))] p-4 text-white shadow-2xl [-webkit-overflow-scrolling:touch]"
      onPointerDown={event => event.stopPropagation()}
    >
      <button
        data-testid="public-player-profile-close"
        type="button"
        aria-label={de ? 'Öffentliches Profil schließen' : 'Close public profile'}
        onClick={onClose}
        className="sticky top-0 z-20 float-right grid h-9 w-9 place-items-center rounded-xl border border-white/12 bg-black/75 text-lg font-black text-white/72 shadow-lg active:scale-90"
      >×</button>

      <div className="pr-12">
        <div className="text-[7px] font-black uppercase tracking-[.24em] text-cyan-100/42">{de ? 'ÖFFENTLICHES PROFIL' : 'PUBLIC PROFILE'}</div>
        <h2 id={titleId} className="mt-1 text-[15px] font-black text-cyan-50">{de ? 'Spielerprofil' : 'Player profile'}</h2>
      </div>

      {loading && <div data-testid="public-player-profile-loading" className="grid min-h-52 place-items-center py-8 text-center text-[9px] font-black uppercase tracking-[.2em] text-white/35">{de ? 'Profil wird geladen …' : 'Loading profile …'}</div>}
      {!loading && error && <div data-testid="public-player-profile-error" className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-[10px] leading-relaxed text-red-200">{error}</div>}
      {!loading && !error && !profile && <div data-testid="public-player-profile-empty" className="mt-4 rounded-2xl border border-white/8 bg-white/[.025] px-4 py-8 text-center text-[9px] leading-relaxed text-white/38">{de ? 'Dieses Profil ist nicht mehr verfügbar.' : 'This profile is no longer available.'}</div>}

      {!loading && !error && profile && <>
        <section data-testid="public-player-profile-header" className="mt-4 rounded-2xl border border-cyan-300/12 bg-cyan-400/[.035] p-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-cyan-300/22 bg-cyan-400/10 text-base font-black text-cyan-100">{initials(profile.display_name)}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-lg font-black text-cyan-50">{profile.display_name}</div>
              <div className="mt-1 truncate text-[7px] font-black uppercase tracking-[.13em] text-white/36">{profile.character_key === 'archer' ? (de ? 'Jäger' : 'Ranger') : profile.character_key}</div>
            </div>
          </div>
          <button
            data-testid="public-player-profile-friend-code"
            type="button"
            onClick={() => void copyCode()}
            disabled={!profile.friend_code}
            className="mt-3 flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border border-cyan-300/14 bg-black/24 px-3 text-[8px] active:scale-[.99] disabled:opacity-35"
          >
            <span className="text-white/34">{de ? 'Freundescode' : 'Friend code'}</span>
            <span className="truncate font-black tracking-[.16em] text-cyan-100/72">{copied ? (de ? 'KOPIERT' : 'COPIED') : (profile.friend_code || '—')}</span>
          </button>
        </section>

        <section data-testid="public-player-profile-progress" className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3 text-center"><div className="text-[7px] font-black uppercase tracking-[.15em] text-white/30">Level</div><div className="mt-1 text-lg font-black text-cyan-100">{profile.account_level}</div></div>
          <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3 text-center"><div className="text-[7px] font-black uppercase tracking-[.15em] text-white/30">{de ? 'Rang' : 'Rank'}</div><div className="mt-1 text-lg font-black text-amber-100">{profile.current_rank}</div></div>
          <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3 text-center"><div className="text-[7px] font-black uppercase tracking-[.15em] text-white/30">{de ? 'Kapitel' : 'Chapter'}</div><div className="mt-1 text-lg font-black text-violet-100">{profile.current_chapter}</div></div>
        </section>

        <section data-testid="public-player-profile-social-stats" className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-orange-300/10 bg-orange-400/[.025] p-3 text-center"><div className="text-[7px] font-black uppercase tracking-[.13em] text-white/30">{de ? 'Boss-Schaden' : 'Boss Damage'}</div><div className="mt-1 text-[12px] font-black text-orange-100">{formatNumber(profile.lifetime_world_boss_damage, language)}</div></div>
          <div className="rounded-2xl border border-orange-300/10 bg-orange-400/[.025] p-3 text-center"><div className="text-[7px] font-black uppercase tracking-[.13em] text-white/30">{de ? 'Bosswochen' : 'Boss Weeks'}</div><div className="mt-1 text-[12px] font-black text-orange-100">{profile.world_boss_events}</div></div>
          <div className="rounded-2xl border border-cyan-300/10 bg-cyan-400/[.025] p-3 text-center"><div className="text-[7px] font-black uppercase tracking-[.13em] text-white/30">{de ? 'Freunde' : 'Friends'}</div><div className="mt-1 text-[12px] font-black text-cyan-100">{profile.friend_count}</div></div>
        </section>

        <section data-testid="public-player-profile-details" className="mt-3 space-y-2 rounded-2xl border border-white/8 bg-white/[.02] p-3 text-[9px]">
          <div className="flex items-center justify-between gap-3"><span className="text-white/34">{de ? 'Gilde' : 'Guild'}</span><span className="min-w-0 truncate text-right font-black text-white/70">{profile.guild_name ? `[${profile.guild_tag ?? ''}] ${profile.guild_name}` : (de ? 'Keine Gilde' : 'No guild')}</span></div>
          <div className="flex items-center justify-between gap-3"><span className="text-white/34">{de ? 'Dabei seit' : 'Joined'}</span><span className="text-right text-white/58">{formatDate(profile.joined_at, language)}</span></div>
          <div className="flex items-center justify-between gap-3"><span className="text-white/34">{de ? 'Zuletzt aktiv' : 'Last active'}</span><span className="text-right text-white/58">{formatDate(profile.last_active_at, language, true)}</span></div>
        </section>

        <section data-testid="public-player-profile-achievements" className="mt-3 rounded-2xl border border-amber-300/10 bg-amber-400/[.025] p-3">
          <div className="text-[7px] font-black uppercase tracking-[.18em] text-amber-100/46">{de ? 'ERFOLGE' : 'ACHIEVEMENTS'}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {achievements.map((achievement, index) => <div key={`${achievement.de}-${index}`} className="rounded-full border border-amber-300/14 bg-amber-400/[.05] px-2.5 py-1 text-[7px] font-black text-amber-100/76"><span className="mr-1">{achievement.icon}</span>{de ? achievement.de : achievement.en}</div>)}
            {!achievements.length && <div className="text-[8px] text-white/32">{de ? 'Noch keine öffentlichen Erfolge.' : 'No public achievements yet.'}</div>}
          </div>
        </section>
      </>}
    </div>
  </div>;
}
