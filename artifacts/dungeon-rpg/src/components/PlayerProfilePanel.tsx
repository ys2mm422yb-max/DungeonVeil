import React, { useEffect, useMemo, useState } from 'react';
import type { SaveData } from '../game/saveManager';
import type { MetaProgression } from '../game/metaProgression';
import type { RetentionProfile } from '../game/runRetention';
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
import { syncOnlineProfileCosmetics } from '../game/onlineProfileCosmetics';
import {
  claimWeeklyEliteQuest,
  loadWeeklyEliteState,
  WEEKLY_ELITE_EVENT,
  weeklyEliteProgress,
  weeklyEliteQuests,
  weeklyEliteTimeLabel,
  type WeeklyEliteState,
} from '../game/weeklyElite';
import { currentOnlineSession, getMyGuildMembership, type OnlineGuildMembership } from '../game/supabaseOnline';
import { getMySocialProfile, type SocialProfile } from '../game/socialProgressOnline';

type Tab = 'overview' | 'stats' | 'titles' | 'cards' | 'avatars' | 'elite';

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
type CosmeticRarity = 'gewöhnlich' | 'selten' | 'episch' | 'mythisch';

const RARITY_STYLE: Record<CosmeticRarity, string> = {
  gewöhnlich: 'border-white/10 bg-white/[.035] text-white/48',
  selten: 'border-cyan-300/20 bg-cyan-400/[.06] text-cyan-100/70',
  episch: 'border-violet-300/22 bg-violet-400/[.07] text-violet-100/72',
  mythisch: 'border-amber-300/24 bg-amber-400/[.08] text-amber-100/78',
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(Math.max(0, Number(value) || 0));
}

function formatTime(value: number, de: boolean): string {
  const minutes = Math.floor(Math.max(0, value) / 60000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours <= 0) return de ? `${rest} Min.` : `${rest} min`;
  return de ? `${hours} Std. ${rest} Min.` : `${hours}h ${rest}m`;
}

function rarityOf(definition: CosmeticDefinition): CosmeticRarity {
  return ((definition as CosmeticDefinition & { rarity?: CosmeticRarity }).rarity ?? 'gewöhnlich');
}

function rarityLabel(rarity: CosmeticRarity, de: boolean): string {
  if (de) return rarity.toUpperCase();
  if (rarity === 'gewöhnlich') return 'COMMON';
  if (rarity === 'selten') return 'RARE';
  if (rarity === 'episch') return 'EPIC';
  return 'MYTHIC';
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`min-h-11 shrink-0 rounded-xl border px-4 text-[7px] font-black uppercase tracking-[.12em] active:scale-[.98] ${active ? 'border-amber-300/34 bg-amber-400/12 text-amber-100' : 'border-white/8 bg-black/22 text-white/38'}`}>{label}</button>;
}

function Stat({ label, value, tone = 'text-white/88' }: { label: string; value: React.ReactNode; tone?: string }) {
  return <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3 text-center">
    <div className="text-[6px] font-black uppercase tracking-[.14em] text-white/32">{label}</div>
    <div className={`mt-1 text-[15px] font-black ${tone}`}>{value}</div>
  </div>;
}

function ProgressBar({ value, target }: { value: number; target: number }) {
  const percent = Math.max(0, Math.min(100, target > 0 ? value / target * 100 : 100));
  return <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/45"><div className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-200" style={{ width: `${percent}%` }} /></div>;
}

function CollectionSummary({ label, owned, total, tone }: { label: string; owned: number; total: number; tone: string }) {
  return <div className="rounded-xl border border-white/8 bg-black/24 px-3 py-2.5">
    <div className="flex items-center justify-between gap-2"><span className="text-[7px] font-black uppercase tracking-[.14em] text-white/35">{label}</span><span className={`text-[10px] font-black ${tone}`}>{owned}/{total}</span></div>
    <ProgressBar value={owned} target={total} />
  </div>;
}

export function PlayerProfilePanel({ profile, saveData, meta, retention, language, onProfileChange, onClose }: Props) {
  const de = language === 'de';
  const [tab, setTab] = useState<Tab>('overview');
  const [onlineProfile, setOnlineProfile] = useState<SocialProfile | null>(null);
  const [membership, setMembership] = useState<OnlineGuildMembership | null>(null);
  const [weeklyState, setWeeklyState] = useState<WeeklyEliteState>(() => loadWeeklyEliteState(profile.stats));
  const title = selectedProfileTitle(profile);
  const card = selectedProfileCard(profile);
  const avatar = selectedProfileAvatar(profile);
  const playerName = saveData?.playerName?.trim() || onlineProfile?.display_name || (de ? 'Waldläufer' : 'Ranger');
  const ownedEquipment = Object.keys(meta.owned).length;
  const codexEntries = retention.codex.enemies.length + retention.codex.bosses.length + retention.codex.hunts.length + retention.codex.relics.length;

  const titleCount = PROFILE_TITLES.filter(definition => cosmeticUnlocked(definition, profile, meta.rank)).length;
  const cardCount = PROFILE_CARDS.filter(definition => cosmeticUnlocked(definition, profile, meta.rank)).length;
  const avatarCount = PROFILE_AVATARS.filter(definition => cosmeticUnlocked(definition, profile, meta.rank)).length;
  const weeklyQuests = useMemo(() => weeklyEliteQuests(weeklyState.weekKey), [weeklyState.weekKey]);

  useEffect(() => {
    let cancelled = false;
    if (!currentOnlineSession()) return undefined;
    void Promise.all([getMySocialProfile(), getMyGuildMembership()])
      .then(([nextProfile, nextMembership]) => {
        if (cancelled) return;
        setOnlineProfile(nextProfile);
        setMembership(nextMembership);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => setWeeklyState(loadWeeklyEliteState(profile.stats)), [profile.updatedAt]);
  useEffect(() => {
    const handleWeekly = (event: Event) => setWeeklyState((event as CustomEvent<WeeklyEliteState>).detail ?? loadWeeklyEliteState(profile.stats));
    window.addEventListener(WEEKLY_ELITE_EVENT, handleWeekly as EventListener);
    return () => window.removeEventListener(WEEKLY_ELITE_EVENT, handleWeekly as EventListener);
  }, [profile.stats]);

  const tabs = useMemo(() => [
    ['overview', de ? 'Übersicht' : 'Overview'],
    ['stats', de ? 'Statistik' : 'Stats'],
    ['titles', de ? 'Titel' : 'Titles'],
    ['cards', de ? 'Visitenkarten' : 'Calling Cards'],
    ['avatars', de ? 'Avatare' : 'Avatars'],
    ['elite', de ? 'Elite der Woche' : 'Weekly Elite'],
  ] as const, [de]);

  const commitSelection = (next: PlayerProfileProgress) => {
    onProfileChange(next);
    void syncOnlineProfileCosmetics(next).catch(error => console.warn('Dungeon Veil profile cosmetic sync failed', error));
  };
  const equipTitle = (definition: ProfileTitleDefinition) => commitSelection(selectPlayerProfileTitle(definition.id, meta.rank));
  const equipCard = (definition: ProfileCardDefinition) => commitSelection(selectPlayerProfileCard(definition.id, meta.rank));
  const equipAvatar = (definition: ProfileAvatarDefinition) => commitSelection(selectPlayerProfileAvatar(definition.id, meta.rank));

  const cosmeticTile = <T extends CosmeticDefinition>(
    definition: T,
    selected: boolean,
    onEquip: () => void,
    preview: React.ReactNode,
  ) => {
    const unlocked = cosmeticUnlocked(definition, profile, meta.rank);
    const progress = cosmeticProgress(definition, profile, meta.rank);
    const rarity = rarityOf(definition);
    return <article key={definition.id} className={`rounded-2xl border p-3 ${selected ? 'border-amber-300/34 bg-amber-400/[.08]' : unlocked ? 'border-white/11 bg-white/[.03]' : 'border-white/8 bg-black/26'}`}>
      <div className="flex items-center gap-3">
        {preview}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5"><div className={`truncate text-[11px] font-black ${unlocked ? 'text-white/88' : 'text-white/52'}`}>{de ? definition.nameDe : definition.nameEn}</div><span className={`rounded-full border px-1.5 py-0.5 text-[5px] font-black uppercase tracking-[.1em] ${RARITY_STYLE[rarity]}`}>{rarityLabel(rarity, de)}</span></div>
          <div className={`mt-1 text-[7px] leading-relaxed ${unlocked ? 'text-white/38' : 'text-white/42'}`}>{de ? definition.requirementDe : definition.requirementEn}</div>
        </div>
        <button type="button" disabled={!unlocked || selected} onClick={onEquip} className={`rounded-lg border px-2.5 py-2 text-[6px] font-black uppercase tracking-[.12em] ${selected ? 'border-amber-300/20 bg-amber-400/10 text-amber-100' : unlocked ? 'border-white/12 bg-white/[.04] text-white/68 active:scale-[.97]' : 'border-white/8 bg-black/25 text-white/32'}`}>{selected ? (de ? 'Aktiv' : 'Active') : unlocked ? (de ? 'Ausrüsten' : 'Equip') : '🔒'}</button>
      </div>
      {!unlocked && <><ProgressBar value={progress.value} target={progress.target} /><div className="mt-1 text-right text-[6px] font-black text-white/32">{formatNumber(progress.value)}/{formatNumber(progress.target)}</div></>}
    </article>;
  };

  return <div className="fixed inset-0 z-[180] overflow-hidden bg-[#07080b]/96 text-white backdrop-blur-xl" data-testid="player-profile-panel">
    <div className="mx-auto flex h-full w-full max-w-lg flex-col px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-[max(14px,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between gap-3">
        <div><div className="text-[7px] font-black uppercase tracking-[.3em] text-amber-100/42">{de ? 'SPIELERPROFIL' : 'PLAYER PROFILE'}</div><div className="mt-1 text-xl font-black text-amber-50">{de ? 'Dein Weg im Schleier' : 'Your path through the Veil'}</div></div>
        <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[.035] text-lg text-white/55 active:scale-[.96]">×</button>
      </div>

      <section className="mt-4 overflow-hidden rounded-3xl border p-4 shadow-2xl" style={{ background: card.background, borderColor: card.border, boxShadow: `0 18px 52px rgba(0,0,0,.45),0 0 26px ${card.glow}` }}>
        <div className="flex items-center gap-3">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/20 text-2xl shadow-inner" style={{ background: avatar.background }}>{avatar.icon}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-black text-white">{playerName}</div>
            <div className="mt-1 text-[8px] font-black uppercase tracking-[.16em] text-white/58">{de ? `Rang ${meta.rank}` : `Rank ${meta.rank}`} · {de ? title.nameDe : title.nameEn}</div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[6px] font-black uppercase tracking-[.12em] text-white/44">
              <span className="rounded-full border border-white/12 bg-black/18 px-2 py-1">{de ? card.nameDe : card.nameEn}</span>
              {membership && <span className="rounded-full border border-white/12 bg-black/18 px-2 py-1">[{membership.guild.tag}] {membership.guild.name}</span>}
            </div>
          </div>
        </div>
        {onlineProfile?.friend_code && <div className="mt-3 flex items-center justify-between rounded-xl border border-white/12 bg-black/18 px-3 py-2 text-[8px]"><span className="text-white/40">{de ? 'Freundescode' : 'Friend code'}</span><span className="font-black tracking-[.16em] text-white/76">{onlineProfile.friend_code}</span></div>}
      </section>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map(([key, label]) => <TabButton key={key} active={tab === key} label={label} onClick={() => setTab(key)} />)}
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pb-4">
        {tab === 'overview' && <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label={de ? 'Höchstes Kapitel' : 'Highest chapter'} value={profile.stats.highestChapter} tone="text-violet-100" />
            <Stat label={de ? 'Höchster Raum' : 'Highest room'} value={profile.stats.highestRoom} tone="text-cyan-100" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Stat label={de ? 'Rang' : 'Rank'} value={meta.rank} tone="text-amber-100" />
            <Stat label={de ? 'Ausrüstung' : 'Equipment'} value={ownedEquipment} tone="text-emerald-100" />
            <Stat label={de ? 'Kodex' : 'Codex'} value={codexEntries} tone="text-sky-100" />
          </div>
          <section className="grid gap-2 rounded-2xl border border-white/8 bg-white/[.025] p-3">
            <div className="text-[7px] font-black uppercase tracking-[.2em] text-white/32">{de ? 'SAMMLUNGSFORTSCHRITT' : 'COLLECTION PROGRESS'}</div>
            <CollectionSummary label={de ? 'Titel' : 'Titles'} owned={titleCount} total={PROFILE_TITLES.length} tone="text-amber-100" />
            <CollectionSummary label={de ? 'Visitenkarten' : 'Calling Cards'} owned={cardCount} total={PROFILE_CARDS.length} tone="text-cyan-100" />
            <CollectionSummary label={de ? 'Avatare' : 'Avatars'} owned={avatarCount} total={PROFILE_AVATARS.length} tone="text-violet-100" />
          </section>
          <section className="rounded-2xl border border-white/8 bg-white/[.025] p-4">
            <div className="text-[7px] font-black uppercase tracking-[.2em] text-white/32">{de ? 'AUSGERÜSTETE IDENTITÄT' : 'EQUIPPED IDENTITY'}</div>
            <div className="mt-3 space-y-2 text-[9px]">
              <div className="flex items-center justify-between"><span className="text-white/38">{de ? 'Titel' : 'Title'}</span><span className="font-black text-amber-100/82">{title.icon} {de ? title.nameDe : title.nameEn}</span></div>
              <div className="flex items-center justify-between"><span className="text-white/38">{de ? 'Visitenkarte' : 'Calling card'}</span><span className="font-black text-white/76">{card.icon} {de ? card.nameDe : card.nameEn}</span></div>
              <div className="flex items-center justify-between"><span className="text-white/38">{de ? 'Profilbild' : 'Avatar'}</span><span className="font-black text-white/76">{avatar.icon} {de ? avatar.nameDe : avatar.nameEn}</span></div>
            </div>
          </section>
        </div>}

        {tab === 'stats' && <div className="grid grid-cols-2 gap-2">
          <Stat label={de ? 'Höchstes Kapitel' : 'Highest chapter'} value={profile.stats.highestChapter} tone="text-violet-100" />
          <Stat label={de ? 'Höchster Raum' : 'Highest room'} value={profile.stats.highestRoom} tone="text-cyan-100" />
          <Stat label={de ? 'Gestartete Runs' : 'Runs started'} value={formatNumber(profile.stats.runsStarted)} />
          <Stat label={de ? 'Räume abgeschlossen' : 'Rooms cleared'} value={formatNumber(profile.stats.roomsCleared)} />
          <Stat label={de ? 'Gegner besiegt' : 'Enemies defeated'} value={formatNumber(profile.stats.enemiesDefeated)} />
          <Stat label={de ? 'Bosse besiegt' : 'Bosses defeated'} value={formatNumber(profile.stats.bossesDefeated)} tone="text-amber-100" />
          <Stat label={de ? 'Gesamtschaden' : 'Total damage'} value={formatNumber(profile.stats.totalDamage)} tone="text-orange-100" />
          <Stat label={de ? 'Ausrüstungs-Drops' : 'Equipment drops'} value={formatNumber(profile.stats.itemsFound)} tone="text-emerald-100" />
          <Stat label={de ? 'Aufträge abgeschlossen' : 'Quests completed'} value={formatNumber(profile.stats.questsCompleted)} tone="text-violet-100" />
          <Stat label={de ? 'Spielzeit' : 'Play time'} value={formatTime(profile.stats.playTimeMs, de)} tone="text-sky-100" />
        </div>}

        {tab === 'titles' && <div className="space-y-2">{PROFILE_TITLES.map(definition => cosmeticTile(definition, profile.selectedTitle === definition.id, () => equipTitle(definition), <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-amber-300/18 bg-amber-400/[.06] text-lg text-amber-100">{definition.icon}</div>))}</div>}

        {tab === 'cards' && <div className="space-y-2">{PROFILE_CARDS.map(definition => cosmeticTile(definition, profile.selectedCard === definition.id, () => equipCard(definition), <div className="h-11 w-[72px] shrink-0 rounded-xl border" style={{ background: definition.background, borderColor: definition.border, boxShadow: `0 0 14px ${definition.glow}` }} />))}</div>}

        {tab === 'avatars' && <div className="space-y-2">{PROFILE_AVATARS.map(definition => cosmeticTile(definition, profile.selectedAvatar === definition.id, () => equipAvatar(definition), <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/16 text-lg" style={{ background: definition.background }}>{definition.icon}</div>))}</div>}

        {tab === 'elite' && <div className="space-y-3">
          <section className="rounded-2xl border border-amber-300/18 bg-[radial-gradient(circle_at_15%_15%,rgba(217,164,65,.13),transparent_40%),rgba(255,255,255,.025)] p-4">
            <div className="flex items-start justify-between gap-3"><div><div className="text-[7px] font-black uppercase tracking-[.22em] text-amber-100/52">{de ? 'WÖCHENTLICHE ELITE-AUFTRÄGE' : 'WEEKLY ELITE CONTRACTS'}</div><div className="mt-1 text-[15px] font-black text-amber-50">{de ? 'Drei schwere Prüfungen' : 'Three hard trials'}</div></div><div className="rounded-full border border-amber-300/18 bg-amber-400/[.07] px-2.5 py-1 text-[7px] font-black text-amber-100">{weeklyEliteTimeLabel(language)}</div></div>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-white/8 bg-black/22 px-3 py-2 text-[8px]"><span className="text-white/38">{de ? 'Dauerhafte Elite-Marken' : 'Permanent Elite Marks'}</span><span className="font-black text-amber-100">◆ {weeklyState.eliteMarks}</span></div>
            <p className="mt-3 text-[8px] leading-relaxed text-white/38">{de ? 'Fortschritt zählt ab Wochenbeginn. Exklusive Belohnungen bleiben nach dem Reset dauerhaft in deiner Sammlung.' : 'Progress starts at the weekly reset. Exclusive rewards remain permanently in your collection.'}</p>
          </section>
          {weeklyQuests.map(quest => {
            const progress = weeklyEliteProgress(quest, profile.stats, weeklyState);
            const completed = progress >= quest.target;
            const claimed = weeklyState.claimedQuestIds.includes(quest.id);
            const percent = Math.max(0, Math.min(100, progress / quest.target * 100));
            return <article key={quest.id} className={`overflow-hidden rounded-2xl border p-4 ${claimed ? 'border-emerald-300/22 bg-emerald-400/[.055]' : completed ? 'border-amber-300/28 bg-amber-400/[.065]' : 'border-white/9 bg-white/[.025]'}`}>
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="text-[12px] font-black text-white/88">{de ? quest.titleDe : quest.titleEn}</div><div className="mt-1 text-[8px] leading-relaxed text-white/40">{de ? quest.descriptionDe : quest.descriptionEn}</div></div><div className="shrink-0 rounded-full border border-violet-300/18 bg-violet-400/[.06] px-2 py-1 text-[6px] font-black uppercase text-violet-100/72">{quest.reward.kind === 'card' ? (de ? 'VISITENKARTE' : 'CALLING CARD') : quest.reward.kind === 'title' ? (de ? 'TITEL' : 'TITLE') : (de ? 'AVATAR' : 'AVATAR')}</div></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/48"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 via-amber-500 to-amber-200" style={{ width: `${percent}%` }} /></div>
              <div className="mt-2 flex items-center justify-between gap-3"><div><div className="text-[6px] font-black uppercase tracking-[.14em] text-white/28">{de ? 'BELOHNUNG' : 'REWARD'}</div><div className="mt-0.5 text-[9px] font-black text-amber-100">{de ? quest.reward.nameDe : quest.reward.nameEn}</div></div><div className="text-right"><div className="text-[8px] font-black text-white/62">{formatNumber(Math.min(progress, quest.target))}/{formatNumber(quest.target)}</div><button type="button" disabled={!completed || claimed} onClick={() => setWeeklyState(claimWeeklyEliteQuest(quest.id, profile.stats))} className={`mt-1 rounded-lg border px-3 py-2 text-[6px] font-black uppercase tracking-[.12em] ${claimed ? 'border-emerald-300/18 bg-emerald-400/[.07] text-emerald-100' : completed ? 'border-amber-300/28 bg-amber-400/[.12] text-amber-100 active:scale-[.97]' : 'border-white/8 bg-black/20 text-white/24'}`}>{claimed ? (de ? 'ERHALTEN' : 'CLAIMED') : completed ? (de ? 'ABHOLEN' : 'CLAIM') : (de ? 'OFFEN' : 'IN PROGRESS')}</button></div></div>
            </article>;
          })}
        </div>}
      </div>
    </div>
  </div>;
}
