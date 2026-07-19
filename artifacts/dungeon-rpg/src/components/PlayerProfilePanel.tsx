import React, { useEffect, useMemo, useState } from 'react';
import { EQUIPMENT, type EquipmentId, type MetaProgression } from '../game/metaProgression';
import {
  PROFILE_AVATARS,
  PROFILE_CARDS,
  PROFILE_TITLES,
  cosmeticProgress,
  cosmeticUnlocked,
  selectPlayerProfileAvatar,
  selectPlayerProfileCard,
  selectPlayerProfileTitle,
  selectedProfileAvatar,
  selectedProfileCard,
  selectedProfileTitle,
  type PlayerProfileProgress,
  type ProfileAvatarDefinition,
  type ProfileCardDefinition,
  type ProfileTitleDefinition,
} from '../game/playerProfile';
import type { RetentionProfile } from '../game/runRetention';
import type { SaveData } from '../game/saveManager';
import { getMySocialProfile, type SocialProfile } from '../game/socialProgressOnline';
import { currentOnlineSession, getMyGuildMembership, type OnlineGuildMembership } from '../game/supabaseOnline';
import { ProfileAvatarPortrait } from './ProfileAvatarPortrait';

type Tab = 'overview' | 'stats' | 'titles' | 'cards' | 'avatars';
type Props = {
  profile: PlayerProfileProgress;
  saveData: SaveData | null;
  meta: MetaProgression;
  retention: RetentionProfile;
  language: 'de' | 'en';
  onProfileChange: (profile: PlayerProfileProgress) => void;
  onClose: () => void;
};

const formatNumber = (value: number) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(Math.max(0, Number(value) || 0));

function formatTime(value: number, de: boolean) {
  const minutes = Math.floor(Math.max(0, value) / 60000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? (de ? `${hours} Std. ${rest} Min.` : `${hours}h ${rest}m`) : (de ? `${rest} Min.` : `${rest} min`);
}

function rarity(value: unknown) {
  const key = String(value ?? '').toLowerCase();
  if (key === 'mythic' || key === 'mythisch') return 'mythic';
  if (key === 'epic' || key === 'episch') return 'epic';
  if (key === 'rare' || key === 'selten') return 'rare';
  return 'common';
}

function rarityLabel(value: unknown, de: boolean) {
  const key = rarity(value);
  if (key === 'mythic') return de ? 'Mythisch' : 'Mythic';
  if (key === 'epic') return de ? 'Episch' : 'Epic';
  if (key === 'rare') return de ? 'Selten' : 'Rare';
  return de ? 'Gewöhnlich' : 'Common';
}

function rarityTone(value: unknown) {
  const key = rarity(value);
  if (key === 'mythic') return 'border-fuchsia-300/18 bg-fuchsia-400/[.06] text-fuchsia-200';
  if (key === 'epic') return 'border-violet-300/18 bg-violet-400/[.06] text-violet-200';
  if (key === 'rare') return 'border-cyan-300/18 bg-cyan-400/[.06] text-cyan-200';
  return 'border-white/10 bg-white/[.035] text-white/48';
}

function Stat({ label, value, tone = 'text-white/88', testId }: { label: string; value: React.ReactNode; tone?: string; testId?: string }) {
  return <div data-testid={testId} className="flex min-h-[72px] flex-col justify-center rounded-2xl border border-white/8 bg-white/[.025] p-3 text-center md:min-h-[86px] md:p-4">
    <div className="text-[6px] font-black uppercase leading-relaxed tracking-[.13em] text-white/32 md:text-[7px]">{label}</div>
    <div className={`mt-1 text-[15px] font-black md:text-lg ${tone}`}>{value}</div>
  </div>;
}

function Progress({ value, target }: { value: number; target: number }) {
  const width = Math.max(0, Math.min(100, target ? value / target * 100 : 100));
  return <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/45"><div className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-200" style={{ width: `${width}%` }} /></div>;
}

export function PlayerProfilePanel({ profile, saveData, meta, retention, language, onProfileChange, onClose }: Props) {
  const de = language === 'de';
  const [tab, setTab] = useState<Tab>('overview');
  const [onlineProfile, setOnlineProfile] = useState<SocialProfile | null>(null);
  const [membership, setMembership] = useState<OnlineGuildMembership | null>(null);
  const title = selectedProfileTitle(profile);
  const card = selectedProfileCard(profile);
  const avatar = selectedProfileAvatar(profile);
  const playerName = saveData?.playerName?.trim() || onlineProfile?.display_name || (de ? 'Waldläufer' : 'Ranger');
  const ownedItems = (Object.keys(meta.owned) as EquipmentId[]).filter(id => EQUIPMENT[id]?.active).length;
  const codexEntries = retention.codex.enemies.length + retention.codex.bosses.length + retention.codex.hunts.length + retention.codex.relics.length;

  useEffect(() => {
    let cancelled = false;
    if (!currentOnlineSession()) return;
    void Promise.all([getMySocialProfile(), getMyGuildMembership()])
      .then(([nextProfile, nextMembership]) => {
        if (!cancelled) {
          setOnlineProfile(nextProfile);
          setMembership(nextMembership);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const tabs = useMemo(() => [
    ['overview', de ? 'Übersicht' : 'Overview'],
    ['stats', de ? 'Statistik' : 'Stats'],
    ['titles', de ? 'Titel' : 'Titles'],
    ['cards', de ? 'Visitenkarten' : 'Calling Cards'],
    ['avatars', de ? 'Avatare' : 'Avatars'],
  ] as const, [de]);
  const unlockedTitles = PROFILE_TITLES.filter(item => cosmeticUnlocked(item, profile, meta.rank)).length;
  const unlockedCards = PROFILE_CARDS.filter(item => cosmeticUnlocked(item, profile, meta.rank)).length;
  const unlockedAvatars = PROFILE_AVATARS.filter(item => cosmeticUnlocked(item, profile, meta.rank)).length;

  const tile = <T extends ProfileTitleDefinition | ProfileCardDefinition | ProfileAvatarDefinition>(definition: T, selected: boolean, equip: () => void, preview: React.ReactNode) => {
    const unlocked = cosmeticUnlocked(definition, profile, meta.rank);
    const progress = cosmeticProgress(definition, profile, meta.rank);
    return <article key={definition.id} className={`rounded-2xl border p-3 md:p-4 ${selected ? 'border-amber-300/32 bg-amber-400/[.07]' : unlocked ? 'border-white/10 bg-white/[.025]' : 'border-white/8 bg-black/24'}`}>
      <div className="flex items-center gap-3">
        {preview}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="truncate text-[11px] font-black text-white/88 md:text-xs">{de ? definition.nameDe : definition.nameEn}</div>
            <span className={`rounded-full border px-1.5 py-0.5 text-[5px] font-black uppercase tracking-[.1em] ${rarityTone(definition.rarity)}`}>{rarityLabel(definition.rarity, de)}</span>
          </div>
          <div className={`mt-1 text-[7px] leading-relaxed md:text-[8px] ${unlocked ? 'text-white/36' : 'text-white/48'}`}>{de ? definition.requirementDe : definition.requirementEn}</div>
        </div>
        <button type="button" disabled={!unlocked || selected} onClick={equip} className={`shrink-0 rounded-lg border px-2.5 py-2 text-[6px] font-black uppercase tracking-[.12em] ${selected ? 'border-amber-300/20 bg-amber-400/10 text-amber-100' : unlocked ? 'border-white/12 bg-white/[.04] text-white/62 active:scale-[.97]' : 'border-white/8 bg-black/24 text-white/30'}`}>{selected ? (de ? 'Aktiv' : 'Active') : unlocked ? (de ? 'Ausrüsten' : 'Equip') : (de ? 'Gesperrt' : 'Locked')}</button>
      </div>
      {!unlocked && <><Progress value={progress.value} target={progress.target} /><div className="mt-1 text-right text-[6px] font-black text-white/34">{formatNumber(progress.value)}/{formatNumber(progress.target)}</div></>}
    </article>;
  };

  return <div className="fixed inset-0 z-[180] overflow-hidden bg-[#07080b]/96 text-white backdrop-blur-xl" data-testid="player-profile-panel">
    <div data-testid="player-profile-responsive-shell" className="mx-auto flex h-full w-full max-w-6xl flex-col px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-[max(14px,env(safe-area-inset-top))] md:px-6">
      <div className="flex items-center justify-between gap-3">
        <div><div className="text-[7px] font-black uppercase tracking-[.3em] text-amber-100/42">{de ? 'SPIELERPROFIL' : 'PLAYER PROFILE'}</div><div className="mt-1 text-xl font-black text-amber-50 md:text-2xl">{de ? 'Dein Weg im Schleier' : 'Your path through the Veil'}</div></div>
        <button type="button" aria-label={de ? 'Profil schließen' : 'Close profile'} onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[.035] text-lg text-white/55 active:scale-[.96]">×</button>
      </div>

      <section className="mt-4 grid gap-4 rounded-3xl border p-4 shadow-2xl md:grid-cols-[minmax(0,1.4fr)_minmax(260px,.6fr)] md:p-6" style={{ background: card.background, borderColor: card.border, boxShadow: `0 18px 52px rgba(0,0,0,.45),0 0 26px ${card.glow}` }}>
        <div className="flex min-w-0 items-center gap-3 md:gap-5">
          <ProfileAvatarPortrait avatar={avatar} className="h-16 w-16 shrink-0 rounded-2xl border border-white/20 md:h-24 md:w-24 md:rounded-3xl" />
          <div className="min-w-0 flex-1"><div className="truncate text-lg font-black text-white md:text-2xl">{playerName}</div><div className="mt-1 text-[8px] font-black uppercase tracking-[.16em] text-white/55 md:text-[10px]">{de ? `Rang ${meta.rank}` : `Rank ${meta.rank}`} · {de ? title.nameDe : title.nameEn}</div><div className="mt-2 flex flex-wrap gap-1.5 text-[6px] font-black uppercase tracking-[.12em] text-white/38 md:text-[7px]"><span className="rounded-full border border-white/10 bg-black/16 px-2 py-1">{de ? card.nameDe : card.nameEn}</span>{membership && <span className="rounded-full border border-white/10 bg-black/16 px-2 py-1">[{membership.guild.tag}] {membership.guild.name}</span>}</div></div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
          <div className="rounded-2xl border border-white/10 bg-black/16 px-3 py-3"><div className="text-[6px] font-black uppercase tracking-[.15em] text-white/35">{de ? 'BESTER FORTSCHRITT' : 'BEST PROGRESS'}</div><div className="mt-1 text-sm font-black text-white/78">{de ? `Kapitel ${profile.stats.highestChapter} · Raum ${profile.stats.highestRoom}` : `Chapter ${profile.stats.highestChapter} · Room ${profile.stats.highestRoom}`}</div></div>
          <div className="rounded-2xl border border-white/10 bg-black/16 px-3 py-3"><div className="text-[6px] font-black uppercase tracking-[.15em] text-white/35">{de ? 'FREUNDESCODE' : 'FRIEND CODE'}</div><div className="mt-1 truncate text-sm font-black tracking-[.14em] text-white/72">{onlineProfile?.friend_code || '—'}</div></div>
        </div>
      </section>

      <div data-testid="player-profile-tabs" className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] md:grid md:grid-cols-5 md:overflow-visible">
        {tabs.map(([key, label]) => <button key={key} type="button" onClick={() => setTab(key)} className={`min-h-10 shrink-0 rounded-xl border px-3 text-[7px] font-black uppercase tracking-[.12em] active:scale-[.98] md:w-full md:text-[8px] ${tab === key ? 'border-amber-300/34 bg-amber-400/12 text-amber-100' : 'border-white/8 bg-black/22 text-white/36'}`}>{label}</button>)}
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pb-4">
        {tab === 'overview' && <div data-testid="player-profile-tablet-overview" className="grid gap-3 md:grid-cols-2 md:gap-4">
          <div className="space-y-3">
            <div data-testid="profile-collection-summary" className="grid grid-cols-3 gap-2"><Stat label={de ? 'Titel' : 'Titles'} value={`${unlockedTitles}/${PROFILE_TITLES.length}`} tone="text-amber-100" /><Stat label={de ? 'Visitenkarten' : 'Cards'} value={`${unlockedCards}/${PROFILE_CARDS.length}`} tone="text-violet-100" /><Stat label={de ? 'Avatare' : 'Avatars'} value={`${unlockedAvatars}/${PROFILE_AVATARS.length}`} tone="text-cyan-100" /></div>
            <div className="grid grid-cols-2 gap-2"><Stat label={de ? 'Höchstes Kapitel' : 'Highest chapter'} value={profile.stats.highestChapter} tone="text-violet-100" /><Stat label={de ? 'Höchster Raum' : 'Highest room'} value={profile.stats.highestRoom} tone="text-cyan-100" /></div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2"><Stat label={de ? 'Rang' : 'Rank'} value={meta.rank} tone="text-amber-100" /><Stat testId="profile-distinct-equipment-count" label={de ? 'Verschiedene Ausrüstungsteile' : 'Distinct equipment pieces'} value={ownedItems} tone="text-emerald-100" /><Stat label={de ? 'Kodex' : 'Codex'} value={codexEntries} tone="text-sky-100" /></div>
            <section className="rounded-2xl border border-white/8 bg-white/[.025] p-4"><div className="text-[7px] font-black uppercase tracking-[.2em] text-white/30">{de ? 'AUSGERÜSTETE IDENTITÄT' : 'EQUIPPED IDENTITY'}</div><div className="mt-3 space-y-2 text-[9px]"><div className="flex items-center justify-between gap-3"><span className="text-white/34">{de ? 'Titel' : 'Title'}</span><span className="truncate font-black text-amber-100/78">{title.icon} {de ? title.nameDe : title.nameEn}</span></div><div className="flex items-center justify-between gap-3"><span className="text-white/34">{de ? 'Visitenkarte' : 'Calling card'}</span><span className="truncate font-black text-white/72">{card.icon} {de ? card.nameDe : card.nameEn}</span></div><div className="flex items-center justify-between gap-3"><span className="text-white/34">{de ? 'Profilbild' : 'Avatar'}</span><span className="truncate font-black text-white/72">{de ? avatar.nameDe : avatar.nameEn}</span></div></div></section>
          </div>
        </div>}

        {tab === 'stats' && <div data-testid="player-profile-statistics-grid" className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5"><Stat label={de ? 'Höchstes Kapitel' : 'Highest chapter'} value={profile.stats.highestChapter} tone="text-violet-100" /><Stat label={de ? 'Höchster Raum' : 'Highest room'} value={profile.stats.highestRoom} tone="text-cyan-100" /><Stat label={de ? 'Gestartete Runs' : 'Runs started'} value={formatNumber(profile.stats.runsStarted)} /><Stat label={de ? 'Räume abgeschlossen' : 'Rooms cleared'} value={formatNumber(profile.stats.roomsCleared)} /><Stat label={de ? 'Gegner besiegt' : 'Enemies defeated'} value={formatNumber(profile.stats.enemiesDefeated)} /><Stat label={de ? 'Bosse besiegt' : 'Bosses defeated'} value={formatNumber(profile.stats.bossesDefeated)} tone="text-amber-100" /><Stat label={de ? 'Gesamtschaden' : 'Total damage'} value={formatNumber(profile.stats.totalDamage)} tone="text-orange-100" /><Stat testId="profile-lifetime-equipment-rewards" label={de ? 'Ausrüstungsbelohnungen insgesamt' : 'Equipment rewards total'} value={formatNumber(profile.stats.itemsFound)} tone="text-emerald-100" /><Stat label={de ? 'Aufträge abgeschlossen' : 'Quests completed'} value={formatNumber(profile.stats.questsCompleted)} tone="text-violet-100" /><Stat label={de ? 'Spielzeit' : 'Play time'} value={formatTime(profile.stats.playTimeMs, de)} tone="text-sky-100" /></div>}
        {tab === 'titles' && <div className="grid gap-2 md:grid-cols-2">{PROFILE_TITLES.map(definition => tile(definition, profile.selectedTitle === definition.id, () => onProfileChange(selectPlayerProfileTitle(definition.id, meta.rank)), <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-300/16 bg-amber-400/[.05] text-lg text-amber-100">{definition.icon}</div>))}</div>}
        {tab === 'cards' && <div className="grid gap-2 md:grid-cols-2">{PROFILE_CARDS.map(definition => tile(definition, profile.selectedCard === definition.id, () => onProfileChange(selectPlayerProfileCard(definition.id, meta.rank)), <div className="grid h-10 w-14 shrink-0 place-items-center rounded-xl border text-lg" style={{ background: definition.background, borderColor: definition.border, color: definition.border }}>{definition.icon}</div>))}</div>}
        {tab === 'avatars' && <div className="grid gap-2 md:grid-cols-2">{PROFILE_AVATARS.map(definition => tile(definition, profile.selectedAvatar === definition.id, () => onProfileChange(selectPlayerProfileAvatar(definition.id, meta.rank)), <ProfileAvatarPortrait avatar={definition} className="h-12 w-12 shrink-0 rounded-xl border border-white/14" />))}</div>}
      </div>
    </div>
  </div>;
}
