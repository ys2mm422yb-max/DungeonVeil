import React, { useEffect, useMemo, useState } from 'react';
import type { MetaProgression } from '../game/metaProgression';
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
import { activeOwnedEquipmentCount, currentProfileEquipmentFromMeta } from '../game/profileEquipment';
import type { RetentionProfile } from '../game/runRetention';
import type { SaveData } from '../game/saveManager';
import { getMySocialProfile, type SocialProfile } from '../game/socialProgressOnline';
import { currentOnlineSession, getMyGuildMembership, type OnlineGuildMembership } from '../game/supabaseOnline';
import type { CompanionRoleV4 } from '../game/companionReserveV4';
import { COMPANION_SELECTION_EVENT, loadCompanionRoleV4 } from '../game/companionSelectionV4';
import { ProfileAvatarPortrait } from './ProfileAvatarPortrait';
import { ProfileEquipmentLoadout } from './ProfileEquipmentLoadout';
import { CompanionProfileSummary } from './CompanionProfileSummary';

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
type CosmeticDefinition = ProfileTitleDefinition | ProfileCardDefinition | ProfileAvatarDefinition;

const formatNumber = (value: number, language: 'de' | 'en') => new Intl.NumberFormat(language === 'de' ? 'de-DE' : 'en-US', { maximumFractionDigits: 0 }).format(Math.max(0, Number(value) || 0));

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
  if (key === 'mythic') return 'border-fuchsia-300/24 bg-fuchsia-400/[.08] text-fuchsia-100';
  if (key === 'epic') return 'border-violet-300/22 bg-violet-400/[.07] text-violet-100';
  if (key === 'rare') return 'border-cyan-300/22 bg-cyan-400/[.07] text-cyan-100';
  return 'border-white/10 bg-white/[.035] text-white/48';
}

function Stat({ label, value, tone = 'text-white/88', testId }: { label: string; value: React.ReactNode; tone?: string; testId?: string }) {
  return <div data-testid={testId} className="flex min-h-[70px] flex-col justify-center rounded-2xl border border-white/8 bg-white/[.025] p-3 text-center md:min-h-[86px] md:p-4"><div className="text-[6px] font-black uppercase leading-relaxed tracking-[.13em] text-white/32 md:text-[7px]">{label}</div><div className={`mt-1 text-[15px] font-black md:text-lg ${tone}`}>{value}</div></div>;
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
  const [companionRole, setCompanionRole] = useState<CompanionRoleV4>(() => loadCompanionRoleV4());
  const title = selectedProfileTitle(profile);
  const card = selectedProfileCard(profile);
  const avatar = selectedProfileAvatar(profile);
  const playerName = saveData?.playerName?.trim() || onlineProfile?.display_name || (de ? 'Waldläufer' : 'Ranger');
  const ownedItems = activeOwnedEquipmentCount(meta);
  const currentEquipment = useMemo(() => currentProfileEquipmentFromMeta(meta), [meta]);
  const codexEntries = retention.codex.enemies.length + retention.codex.bosses.length + retention.codex.hunts.length + retention.codex.relics.length;

  useEffect(() => {
    let cancelled = false;
    if (!currentOnlineSession()) return;
    void Promise.all([getMySocialProfile(), getMyGuildMembership()]).then(([nextProfile, nextMembership]) => {
      if (!cancelled) { setOnlineProfile(nextProfile); setMembership(nextMembership); }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const refresh = (event: Event) => setCompanionRole((event as CustomEvent<{ role?: CompanionRoleV4 }>).detail?.role ?? loadCompanionRoleV4());
    window.addEventListener(COMPANION_SELECTION_EVENT, refresh as EventListener);
    return () => window.removeEventListener(COMPANION_SELECTION_EVENT, refresh as EventListener);
  }, []);

  const tabs = useMemo(() => [
    { key: 'overview' as const, full: de ? 'Übersicht' : 'Overview', short: de ? 'Übers.' : 'Overview', icon: '◇' },
    { key: 'stats' as const, full: de ? 'Statistik' : 'Stats', short: de ? 'Stats' : 'Stats', icon: '▥' },
    { key: 'titles' as const, full: de ? 'Titel' : 'Titles', short: de ? 'Titel' : 'Titles', icon: '♛' },
    { key: 'cards' as const, full: de ? 'Visitenkarten' : 'Calling Cards', short: de ? 'Karten' : 'Cards', icon: '▰' },
    { key: 'avatars' as const, full: de ? 'Avatare' : 'Avatars', short: de ? 'Avatar' : 'Avatar', icon: '◉' },
  ], [de]);
  const activeTab = tabs.find(item => item.key === tab)!;
  const unlockedTitles = PROFILE_TITLES.filter(item => cosmeticUnlocked(item, profile, meta.rank)).length;
  const unlockedCards = PROFILE_CARDS.filter(item => cosmeticUnlocked(item, profile, meta.rank)).length;
  const unlockedAvatars = PROFILE_AVATARS.filter(item => cosmeticUnlocked(item, profile, meta.rank)).length;

  const cosmeticTile = (definition: CosmeticDefinition, selected: boolean, equip: () => void, preview: React.ReactNode, category: 'title' | 'card' | 'avatar') => {
    const unlocked = cosmeticUnlocked(definition, profile, meta.rank);
    const progress = cosmeticProgress(definition, profile, meta.rank);
    const selectedLabel = category === 'avatar' ? (de ? 'Profilbild aktiv' : 'Avatar active') : category === 'card' ? (de ? 'Visitenkarte aktiv' : 'Calling card active') : (de ? 'Titel aktiv' : 'Title active');
    return <article key={definition.id} data-testid={`profile-${category}-tile-${definition.id}`} data-unlocked={unlocked ? 'true' : 'false'} data-selected={selected ? 'true' : 'false'} className={`group relative overflow-hidden rounded-3xl border p-3 transition md:p-4 ${selected ? 'border-amber-300/38 bg-amber-400/[.08] shadow-[0_0_28px_rgba(245,184,69,.08)]' : unlocked ? 'border-white/10 bg-white/[.025]' : 'border-white/7 bg-black/28'}`}>
      <div className="flex min-w-0 items-center gap-3">{preview}<div className="min-w-0 flex-1"><div className="flex min-w-0 flex-wrap items-center gap-1.5"><div className={`min-w-0 truncate text-[11px] font-black md:text-xs ${unlocked ? 'text-white/90' : 'text-white/32'}`}>{de ? definition.nameDe : definition.nameEn}</div><span className={`rounded-full border px-1.5 py-0.5 text-[5px] font-black uppercase tracking-[.1em] ${rarityTone(definition.rarity)}`}>{rarityLabel(definition.rarity, de)}</span></div><div className={`mt-1.5 text-[7px] leading-relaxed md:text-[8px] ${unlocked ? 'text-white/38' : 'text-white/28'}`}>{de ? definition.requirementDe : definition.requirementEn}</div>{selected && <div className="mt-1.5 text-[6px] font-black uppercase tracking-[.14em] text-amber-100/68">{selectedLabel}</div>}</div></div>
      {!unlocked && <><Progress value={progress.value} target={progress.target} /><div className="mt-1 text-right text-[6px] font-black text-white/34">{formatNumber(progress.value, language)}/{formatNumber(progress.target, language)}</div></>}
      <button type="button" disabled={!unlocked || selected} onClick={equip} className={`mt-3 min-h-9 w-full rounded-xl border text-[6px] font-black uppercase tracking-[.13em] ${selected ? 'border-amber-300/20 bg-amber-400/10 text-amber-100' : unlocked ? 'border-white/12 bg-white/[.04] text-white/62 active:scale-[.98]' : 'border-white/7 bg-black/24 text-white/22'}`}>{selected ? (de ? 'Aktiv' : 'Active') : unlocked ? (de ? 'Ausrüsten' : 'Equip') : (de ? 'Gesperrt' : 'Locked')}</button>
    </article>;
  };

  const titlePreview = (definition: ProfileTitleDefinition, unlocked: boolean) => <div className={`relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border ${unlocked ? rarityTone(definition.rarity) : 'border-white/7 bg-black/30 text-white/20'}`}><div className="absolute inset-1 rotate-45 rounded-xl border border-current/12"/><span className="relative text-2xl drop-shadow-[0_0_12px_currentColor]">{definition.icon}</span><span className="absolute bottom-1.5 text-[5px] font-black uppercase tracking-[.16em] opacity-55">{de ? 'TITEL' : 'TITLE'}</span></div>;
  const cardPreview = (definition: ProfileCardDefinition, unlocked: boolean) => <div className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-2xl border ${unlocked ? '' : 'grayscale opacity-35'}`} style={{ background: definition.background, borderColor: definition.border, boxShadow: unlocked ? `0 0 18px ${definition.glow}` : undefined }}><div className="absolute inset-x-3 top-3 h-px bg-white/22"/><div className="absolute bottom-2 left-3 text-xl" style={{ color: definition.border }}>{definition.icon}</div><div className="absolute bottom-2 right-2 text-[4px] font-black uppercase tracking-[.16em] text-white/42">DUNGEON<br/>VEIL</div></div>;
  const avatarPreview = (definition: ProfileAvatarDefinition, unlocked: boolean) => <div className={`relative shrink-0 ${unlocked ? '' : 'grayscale opacity-35'}`}><ProfileAvatarPortrait avatar={definition} className="h-16 w-16 rounded-2xl border border-white/14"/><span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border border-white/12 bg-black/78 text-[8px]" style={{ color: unlocked ? undefined : 'rgba(255,255,255,.24)' }}>{definition.icon}</span></div>;

  return <div className="fixed inset-0 z-[180] overflow-hidden bg-[#07080b]/96 text-white backdrop-blur-xl" data-testid="player-profile-panel">
    <div data-testid="player-profile-responsive-shell" className="mx-auto flex h-full w-full max-w-6xl flex-col px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-[max(12px,env(safe-area-inset-top))] md:px-6">
      <div className="flex shrink-0 items-center justify-between gap-3 px-1"><div><div className="text-[7px] font-black uppercase tracking-[.3em] text-amber-100/42">{de ? 'SPIELERPROFIL' : 'PLAYER PROFILE'}</div><div className="mt-1 text-lg font-black text-amber-50 md:text-2xl">{tab === 'overview' ? (de ? 'Dein Weg im Schleier' : 'Your path through the Veil') : activeTab.full}</div></div><button type="button" aria-label={de ? 'Profil schließen' : 'Close profile'} onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[.035] text-lg text-white/55 active:scale-[.96]">×</button></div>

      <section data-testid="player-profile-identity-card" data-compact={tab === 'overview' ? 'false' : 'true'} className={`mt-3 shrink-0 overflow-hidden rounded-3xl border shadow-2xl transition-all ${tab === 'overview' ? 'p-4 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(260px,.6fr)] md:gap-4 md:p-6' : 'p-3'}`} style={{ background: card.background, borderColor: card.border, boxShadow: `0 18px 52px rgba(0,0,0,.45),0 0 26px ${card.glow}` }}>
        <div className={`flex min-w-0 items-center ${tab === 'overview' ? 'gap-3 md:gap-5' : 'gap-2.5'}`}><ProfileAvatarPortrait avatar={avatar} className={`${tab === 'overview' ? 'h-16 w-16 md:h-24 md:w-24 md:rounded-3xl' : 'h-11 w-11'} shrink-0 rounded-2xl border border-white/20`} /><div className="min-w-0 flex-1"><div className={`${tab === 'overview' ? 'text-lg md:text-2xl' : 'text-sm'} truncate font-black text-white`}>{playerName}</div><div className={`${tab === 'overview' ? 'mt-1 text-[8px] md:text-[10px]' : 'mt-0.5 text-[7px]'} truncate font-black uppercase tracking-[.14em] text-white/58`}>{de ? `Rang ${meta.rank}` : `Rank ${meta.rank}`} · {de ? title.nameDe : title.nameEn}</div><div className="mt-1.5 flex min-w-0 flex-wrap gap-1 text-[5px] font-black uppercase tracking-[.11em] text-white/42"><span className="max-w-full truncate rounded-full border border-white/10 bg-black/18 px-2 py-1">{de ? card.nameDe : card.nameEn}</span>{membership && tab === 'overview' && <span className="max-w-full truncate rounded-full border border-white/10 bg-black/18 px-2 py-1">[{membership.guild.tag}] {membership.guild.name}</span>}</div></div></div>
        {tab === 'overview' && <div className="mt-3 grid gap-2 sm:grid-cols-2 md:mt-0 md:grid-cols-1"><div className="rounded-2xl border border-white/10 bg-black/18 px-3 py-3"><div className="text-[6px] font-black uppercase tracking-[.15em] text-white/35">{de ? 'BESTER FORTSCHRITT' : 'BEST PROGRESS'}</div><div className="mt-1 text-sm font-black text-white/78">{de ? `Kapitel ${profile.stats.highestChapter} · Raum ${profile.stats.highestRoom}` : `Chapter ${profile.stats.highestChapter} · Room ${profile.stats.highestRoom}`}</div></div><div className="rounded-2xl border border-white/10 bg-black/18 px-3 py-3"><div className="text-[6px] font-black uppercase tracking-[.15em] text-white/35">{de ? 'FREUNDESCODE' : 'FRIEND CODE'}</div><div className="mt-1 truncate text-sm font-black tracking-[.14em] text-white/72">{onlineProfile?.friend_code || '—'}</div></div></div>}
      </section>

      <div data-testid="player-profile-tabs" className="mt-2.5 grid shrink-0 grid-cols-5 gap-1">{tabs.map(item => <button key={item.key} type="button" aria-label={item.full} onClick={() => setTab(item.key)} className={`min-w-0 rounded-xl border px-0.5 py-2 text-center active:scale-[.98] ${tab === item.key ? 'border-amber-300/34 bg-amber-400/12 text-amber-100' : 'border-white/8 bg-black/22 text-white/34'}`}><span className="block text-[10px] leading-none">{item.icon}</span><span className="mt-1 block truncate text-[5.5px] font-black uppercase tracking-[.05em] sm:hidden">{item.short}</span><span className="mt-1 hidden truncate text-[7px] font-black uppercase tracking-[.1em] sm:block">{item.full}</span></button>)}</div>

      <div className="mt-2.5 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4 [-webkit-overflow-scrolling:touch]">
        {tab === 'overview' && <div data-testid="player-profile-tablet-overview" className="grid gap-3 md:grid-cols-2 md:gap-4"><div className="space-y-3"><div data-testid="profile-collection-summary" className="grid grid-cols-3 gap-2"><Stat label={de ? 'Titel' : 'Titles'} value={`${unlockedTitles}/${PROFILE_TITLES.length}`} tone="text-amber-100" /><Stat label={de ? 'Visitenkarten' : 'Cards'} value={`${unlockedCards}/${PROFILE_CARDS.length}`} tone="text-violet-100" /><Stat label={de ? 'Avatare' : 'Avatars'} value={`${unlockedAvatars}/${PROFILE_AVATARS.length}`} tone="text-cyan-100" /></div><div className="grid grid-cols-2 gap-2"><Stat label={de ? 'Höchstes Kapitel' : 'Highest chapter'} value={profile.stats.highestChapter} tone="text-violet-100" /><Stat label={de ? 'Höchster Raum' : 'Highest room'} value={profile.stats.highestRoom} tone="text-cyan-100" /></div></div><div className="space-y-3"><div className="grid grid-cols-3 gap-2"><Stat label={de ? 'Rang' : 'Rank'} value={meta.rank} tone="text-amber-100" /><Stat testId="profile-distinct-equipment-count" label={de ? 'Ausrüstung' : 'Equipment'} value={ownedItems} tone="text-emerald-100" /><Stat label={de ? 'Kodex' : 'Codex'} value={codexEntries} tone="text-sky-100" /></div><section className="overflow-hidden rounded-2xl border p-3" style={{ background: card.background, borderColor: `${card.border}55` }}><div className="text-[6px] font-black uppercase tracking-[.2em] text-white/32">{de ? 'AUSGERÜSTETE IDENTITÄT' : 'EQUIPPED IDENTITY'}</div><div className="mt-3 grid grid-cols-[48px_minmax(0,1fr)] gap-3"><ProfileAvatarPortrait avatar={avatar} className="h-12 w-12 rounded-xl border border-white/14"/><div className="min-w-0 space-y-1"><div className="truncate text-[9px] font-black text-amber-100/80">{title.icon} {de ? title.nameDe : title.nameEn}</div><div className="truncate text-[8px] font-black text-white/64">{card.icon} {de ? card.nameDe : card.nameEn}</div><div className="truncate text-[7px] text-white/38">{de ? avatar.nameDe : avatar.nameEn}</div></div></div></section></div><div className="md:col-span-2"><CompanionProfileSummary role={companionRole} language={language} testId="own-player-profile-companion" /></div><div className="md:col-span-2"><ProfileEquipmentLoadout items={currentEquipment} language={language} testId="own-player-profile-equipment" /></div></div>}
        {tab === 'stats' && <div data-testid="player-profile-statistics-grid" className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5"><Stat label={de ? 'Höchstes Kapitel' : 'Highest chapter'} value={profile.stats.highestChapter} tone="text-violet-100" /><Stat label={de ? 'Höchster Raum' : 'Highest room'} value={profile.stats.highestRoom} tone="text-cyan-100" /><Stat label={de ? 'Gestartete Runs' : 'Runs started'} value={formatNumber(profile.stats.runsStarted, language)} /><Stat label={de ? 'Räume abgeschlossen' : 'Rooms cleared'} value={formatNumber(profile.stats.roomsCleared, language)} /><Stat label={de ? 'Gegner besiegt' : 'Enemies defeated'} value={formatNumber(profile.stats.enemiesDefeated, language)} /><Stat label={de ? 'Bosse besiegt' : 'Bosses defeated'} value={formatNumber(profile.stats.bossesDefeated, language)} tone="text-amber-100" /><Stat label={de ? 'Gesamtschaden' : 'Total damage'} value={formatNumber(profile.stats.totalDamage, language)} tone="text-orange-100" /><Stat testId="profile-lifetime-equipment-rewards" label={de ? 'Ausrüstungsbelohnungen insgesamt' : 'Equipment rewards total'} value={formatNumber(profile.stats.itemsFound, language)} tone="text-emerald-100" /><Stat label={de ? 'Aufträge abgeschlossen' : 'Quests completed'} value={formatNumber(profile.stats.questsCompleted, language)} tone="text-violet-100" /><Stat label={de ? 'Spielzeit' : 'Play time'} value={formatTime(profile.stats.playTimeMs, de)} tone="text-sky-100" /></div>}
        {tab === 'titles' && <div className="grid gap-2 md:grid-cols-2">{PROFILE_TITLES.map(definition => cosmeticTile(definition, profile.selectedTitle === definition.id, () => onProfileChange(selectPlayerProfileTitle(definition.id, meta.rank)), titlePreview(definition, cosmeticUnlocked(definition, profile, meta.rank)), 'title'))}</div>}
        {tab === 'cards' && <div className="grid gap-2 md:grid-cols-2">{PROFILE_CARDS.map(definition => cosmeticTile(definition, profile.selectedCard === definition.id, () => onProfileChange(selectPlayerProfileCard(definition.id, meta.rank)), cardPreview(definition, cosmeticUnlocked(definition, profile, meta.rank)), 'card'))}</div>}
        {tab === 'avatars' && <div className="grid gap-2 md:grid-cols-2">{PROFILE_AVATARS.map(definition => cosmeticTile(definition, profile.selectedAvatar === definition.id, () => onProfileChange(selectPlayerProfileAvatar(definition.id, meta.rank)), avatarPreview(definition, cosmeticUnlocked(definition, profile, meta.rank)), 'avatar'))}</div>}
      </div>
    </div>
  </div>;
}
