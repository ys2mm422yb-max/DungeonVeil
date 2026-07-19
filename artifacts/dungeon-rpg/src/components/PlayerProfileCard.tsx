import React, { useEffect, useId, useMemo, useState } from 'react';
import { resolveOnlineAvatar, resolveOnlineCard, resolveOnlineTitle } from '../game/onlineProfileCosmetics';
import type { CosmeticRarity } from '../game/playerProfile';
import { normalizeProfileEquipmentItems } from '../game/profileEquipment';
import { getSocialProfileCard, type SocialProfileCardData } from '../game/socialProgressOnline';
import { companionRoleForOwnerV4 } from '../game/companionSelectionV4';
import { ProfileAvatarPortrait } from './ProfileAvatarPortrait';
import { ProfileEquipmentLoadout } from './ProfileEquipmentLoadout';
import { CompanionProfileSummary } from './CompanionProfileSummary';

type Props = { userId: string; language: 'de' | 'en'; onClose: () => void; profileOverride?: SocialProfileCardData | null };
type Achievement = { icon: string; de: string; en: string };

function formatDate(value: string, language: 'de' | 'en', withTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(language === 'de' ? 'de-DE' : 'en-US', withTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function formatNumber(value: number, language: 'de' | 'en') {
  return new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-US', { maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function formatPlayTime(value: number) {
  const minutes = Math.max(0, Math.floor((Number(value) || 0) / 60000));
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
}

function rarityLabel(rarity: CosmeticRarity | undefined, de: boolean) {
  if (rarity === 'mythic') return de ? 'Mythisch' : 'Mythic';
  if (rarity === 'epic') return de ? 'Episch' : 'Epic';
  if (rarity === 'rare') return de ? 'Selten' : 'Rare';
  return de ? 'Gewöhnlich' : 'Common';
}

function activityLabel(profile: SocialProfileCardData, de: boolean) {
  const online = Date.now() - new Date(profile.last_active_at).getTime() <= 5 * 60 * 1000;
  if (!online) return 'Offline';
  if (profile.activity_state === 'run') return de ? `Im Run · K${profile.activity_chapter} R${profile.activity_room}` : `In run · C${profile.activity_chapter} R${profile.activity_room}`;
  if (profile.activity_state === 'paused') return de ? 'Run pausiert' : 'Run paused';
  return de ? 'Im Menü' : 'In menu';
}

const ACHIEVEMENTS: Record<string, Achievement> = {
  first_steps: { icon: '➜', de: 'Erste Schritte', en: 'First Steps' },
  veil_walker: { icon: '◈', de: 'Schleierwanderer', en: 'Veil Walker' },
  boss_hunter: { icon: '♛', de: 'Bossjäger', en: 'Boss Hunter' },
  guild_bound: { icon: '♜', de: 'Gildengebunden', en: 'Guild Bound' },
  companion: { icon: '♡', de: 'Gefährte', en: 'Companion' },
};

export function PlayerProfileCard({ userId, language, onClose, profileOverride }: Props) {
  const de = language === 'de';
  const titleId = useId();
  const [profile, setProfile] = useState<SocialProfileCardData | null>(profileOverride ?? null);
  const [loading, setLoading] = useState(profileOverride === undefined);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const companionRole = companionRoleForOwnerV4(userId);

  useEffect(() => {
    if (profileOverride !== undefined) { setProfile(profileOverride); setLoading(false); setError(''); return; }
    let cancelled = false;
    setProfile(null); setLoading(true); setError('');
    void getSocialProfileCard(userId).then(result => { if (!cancelled) setProfile(result); }).catch(() => { if (!cancelled) setError(de ? 'Das öffentliche Profil konnte nicht geladen werden.' : 'The public profile could not be loaded.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [de, profileOverride, userId]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  const activeEquipment = useMemo(() => normalizeProfileEquipmentItems(profile?.equipped_items), [profile?.equipped_items]);
  const achievements = useMemo(() => (profile?.achievement_keys ?? []).map(key => ACHIEVEMENTS[key]).filter((item): item is Achievement => Boolean(item)), [profile?.achievement_keys]);
  const avatar = resolveOnlineAvatar(profile?.avatar_key);
  const title = resolveOnlineTitle(profile?.avatar_key);
  const card = resolveOnlineCard(profile?.avatar_key);
  const copyCode = async () => {
    if (!profile?.friend_code) return;
    try { await navigator.clipboard?.writeText(profile.friend_code); setCopied(true); window.setTimeout(() => setCopied(false), 1400); }
    catch { setCopied(false); }
  };
  const careerStats = profile ? [
    [de ? 'Räume abgeschlossen' : 'Rooms cleared', profile.rooms_cleared, 'text-cyan-100'],
    [de ? 'Gegner besiegt' : 'Enemies defeated', profile.enemies_defeated, 'text-red-100'],
    [de ? 'Bosse besiegt' : 'Bosses defeated', profile.bosses_defeated, 'text-amber-100'],
    [de ? 'Aufträge' : 'Quests', profile.quests_completed, 'text-violet-100'],
    [de ? 'Gesamtschaden' : 'Total damage', profile.total_damage, 'text-orange-100'],
    [de ? 'Spielzeit' : 'Play time', formatPlayTime(profile.play_time_ms), 'text-emerald-100'],
  ] as const : [];

  return <div className="fixed inset-0 z-[180] flex items-center justify-center overflow-hidden bg-black/82 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-md md:px-6" role="dialog" aria-modal="true" aria-labelledby={titleId} data-testid="public-player-profile-dialog" onPointerDown={onClose}>
    <div data-testid="player-profile-card" className="relative max-h-full w-full max-w-6xl overflow-y-auto overscroll-contain rounded-3xl border bg-[#08090c]/98 p-4 text-white shadow-2xl [-webkit-overflow-scrolling:touch] md:p-6" style={{ borderColor: `${card.border}70`, boxShadow: `0 20px 70px rgba(0,0,0,.7),0 0 30px ${card.glow}` }} onPointerDown={event => event.stopPropagation()}>
      <button data-testid="public-player-profile-close" type="button" aria-label={de ? 'Öffentliches Profil schließen' : 'Close public profile'} onClick={onClose} className="sticky top-0 z-20 float-right grid h-10 w-10 place-items-center rounded-xl border border-white/12 bg-black/75 text-lg font-black text-white/72 shadow-lg active:scale-90">×</button>
      <div className="pr-12"><div className="text-[7px] font-black uppercase tracking-[.24em] text-cyan-100/42">{de ? 'FREUNDESPROFIL' : 'FRIEND PROFILE'}</div><h2 id={titleId} className="mt-1 text-[15px] font-black text-cyan-50 md:text-xl">{de ? 'Öffentliches Spielerprofil' : 'Public player profile'}</h2></div>
      {loading && <div data-testid="public-player-profile-loading" className="grid min-h-52 place-items-center py-8 text-center text-[9px] font-black uppercase tracking-[.2em] text-white/35">{de ? 'Profil wird geladen …' : 'Loading profile …'}</div>}
      {!loading && error && <div data-testid="public-player-profile-error" className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-[10px] leading-relaxed text-red-200">{error}</div>}
      {!loading && !error && !profile && <div data-testid="public-player-profile-empty" className="mt-4 rounded-2xl border border-white/8 bg-white/[.025] px-4 py-8 text-center text-[9px] leading-relaxed text-white/38">{de ? 'Dieses Profil ist nicht mehr verfügbar.' : 'This profile is no longer available.'}</div>}
      {!loading && !error && profile && <div data-testid="public-player-profile-tablet-columns" className="mt-4 grid gap-4 md:grid-cols-[minmax(0,.92fr)_minmax(0,1.08fr)] md:gap-5">
        <div className="space-y-3">
          <section data-testid="public-player-profile-header" className="overflow-hidden rounded-2xl border p-4 md:p-5" style={{ background: card.background, borderColor: card.border, boxShadow: `0 0 22px ${card.glow}` }}><div className="flex min-w-0 items-center gap-3 md:gap-4"><ProfileAvatarPortrait avatar={avatar} className="h-20 w-20 shrink-0 rounded-2xl border border-white/20 md:h-28 md:w-28 md:rounded-3xl" /><div className="min-w-0 flex-1"><div className="truncate text-lg font-black text-white md:text-2xl">{profile.display_name}</div><div className="mt-1 truncate text-[8px] font-black uppercase tracking-[.14em] text-white/66 md:text-[10px]">{de ? title.nameDe : title.nameEn}</div><div className="mt-2 flex flex-wrap gap-1.5"><span className="rounded-full border border-amber-200/20 bg-black/24 px-2 py-1 text-[7px] font-black uppercase tracking-[.12em] text-amber-100">{de ? `Rang ${profile.current_rank}` : `Rank ${profile.current_rank}`}</span>{profile.guild_name && <span className="rounded-full border border-white/12 bg-black/24 px-2 py-1 text-[7px] font-black uppercase tracking-[.12em] text-white/62">[{profile.guild_tag ?? ''}] {profile.guild_name}</span>}</div><div className={`mt-2 text-[7px] font-black uppercase tracking-[.13em] ${profile.activity_state === 'run' ? 'text-emerald-200' : 'text-white/45'}`}>{activityLabel(profile, de)}</div></div></div><button data-testid="public-player-profile-friend-code" type="button" onClick={() => void copyCode()} disabled={!profile.friend_code} className="mt-3 flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border border-white/12 bg-black/30 px-3 text-[8px] active:scale-[.99] disabled:opacity-35"><span className="text-white/38">{de ? 'Freundescode' : 'Friend code'}</span><span className="truncate font-black tracking-[.16em] text-white/76">{copied ? (de ? 'KOPIERT' : 'COPIED') : (profile.friend_code || '—')}</span></button></section>
          <section data-testid="public-player-profile-best-progress" className="rounded-2xl border border-violet-300/16 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,.16),rgba(255,255,255,.02)_58%)] p-4 text-center"><div className="text-[7px] font-black uppercase tracking-[.22em] text-violet-100/48">{de ? 'HÖCHSTER FORTSCHRITT' : 'HIGHEST PROGRESS'}</div><div className="mt-2 font-serif text-[25px] font-black tracking-[.06em] text-violet-100 md:text-3xl">{de ? 'Kapitel' : 'Chapter'} {profile.highest_chapter}</div><div className="mt-1 text-[11px] font-black uppercase tracking-[.18em] text-white/58">{de ? 'Raum' : 'Room'} {profile.highest_room}</div></section>
          <section data-testid="public-player-profile-career-stats" className="grid grid-cols-2 gap-2 md:grid-cols-3">{careerStats.map(([label, value, tone]) => <div key={label} className="rounded-2xl border border-white/8 bg-white/[.025] p-3 text-center"><div className="text-[6px] font-black uppercase leading-relaxed tracking-[.13em] text-white/30">{label}</div><div className={`mt-1 text-[13px] font-black ${tone}`}>{typeof value === 'number' ? formatNumber(value, language) : value}</div></div>)}</section>
          <section data-testid="public-player-profile-cosmetics" className="rounded-2xl border border-white/8 bg-white/[.02] p-3"><div className="text-[7px] font-black uppercase tracking-[.18em] text-white/35">{de ? 'PROFIL-AUSSTATTUNG' : 'PROFILE LOADOUT'}</div><div className="mt-2 grid grid-cols-2 gap-2 text-center"><div data-testid="public-player-profile-title-cosmetic" className="min-w-0 rounded-xl border border-white/8 bg-black/25 p-2"><div className="text-[6px] font-black uppercase text-white/28">{de ? 'Titel' : 'Title'}</div><div className="mt-1 truncate text-[7px] font-black text-white/70">{de ? title.nameDe : title.nameEn}</div><div className="mt-1 text-[6px] uppercase text-amber-100/52">{rarityLabel(title.rarity, de)}</div></div><div data-testid="public-player-profile-calling-card-cosmetic" className="min-w-0 rounded-xl border border-white/8 bg-black/25 p-2"><div className="text-[6px] font-black uppercase text-white/28">{de ? 'Visitenkarte' : 'Calling card'}</div><div className="mt-1 truncate text-[7px] font-black text-white/70">{de ? card.nameDe : card.nameEn}</div><div className="mt-1 text-[6px] uppercase text-amber-100/52">{rarityLabel(card.rarity, de)}</div></div></div></section>
        </div>
        <div className="space-y-3">
          <CompanionProfileSummary role={companionRole} language={language} testId="public-player-profile-companion" />
          <ProfileEquipmentLoadout items={activeEquipment} language={language} testId="public-player-profile-equipment" />
          <div className="grid gap-3 sm:grid-cols-2"><section data-testid="public-player-profile-worldboss" className="rounded-2xl border border-orange-300/12 bg-orange-400/[.025] p-3"><div className="text-[7px] font-black uppercase tracking-[.18em] text-orange-100/46">{de ? 'WELTBOSS' : 'WORLD BOSS'}</div><div className="mt-3 grid grid-cols-2 gap-2 text-center"><div className="rounded-xl border border-white/8 bg-black/25 p-2"><div className="text-[6px] uppercase text-white/28">{de ? 'Gesamtschaden' : 'Lifetime damage'}</div><div className="mt-1 text-sm font-black text-orange-100">{formatNumber(profile.lifetime_world_boss_damage, language)}</div></div><div className="rounded-xl border border-white/8 bg-black/25 p-2"><div className="text-[6px] uppercase text-white/28">{de ? 'Events' : 'Events'}</div><div className="mt-1 text-sm font-black text-amber-100">{formatNumber(profile.world_boss_events, language)}</div></div></div></section><section data-testid="public-player-profile-details" className="space-y-2 rounded-2xl border border-white/8 bg-white/[.02] p-3 text-[9px]"><div className="flex items-center justify-between gap-3"><span className="text-white/34">{de ? 'Gilde' : 'Guild'}</span><span className="min-w-0 truncate text-right font-black text-white/70">{profile.guild_name ? `[${profile.guild_tag ?? ''}] ${profile.guild_name}` : (de ? 'Keine Gilde' : 'No guild')}</span></div><div className="flex items-center justify-between gap-3"><span className="text-white/34">{de ? 'Dabei seit' : 'Joined'}</span><span className="text-right text-white/58">{formatDate(profile.joined_at, language)}</span></div><div className="flex items-center justify-between gap-3"><span className="text-white/34">{de ? 'Zuletzt aktiv' : 'Last active'}</span><span className="text-right text-white/58">{formatDate(profile.last_active_at, language, true)}</span></div></section></div>
          <section data-testid="public-player-profile-achievements" className="rounded-2xl border border-amber-300/10 bg-amber-400/[.025] p-3"><div className="text-[7px] font-black uppercase tracking-[.18em] text-amber-100/46">{de ? 'ERFOLGE' : 'ACHIEVEMENTS'}</div><div className="mt-2 flex flex-wrap gap-1.5">{achievements.map((achievement, index) => <div key={`${achievement.de}-${index}`} className="rounded-full border border-amber-300/14 bg-amber-400/[.05] px-2.5 py-1 text-[7px] font-black text-amber-100/76"><span className="mr-1">{achievement.icon}</span>{de ? achievement.de : achievement.en}</div>)}{!achievements.length && <div className="text-[8px] text-white/32">{de ? 'Noch keine öffentlichen Erfolge.' : 'No public achievements yet.'}</div>}</div></section>
        </div>
      </div>}
    </div>
  </div>;
}
