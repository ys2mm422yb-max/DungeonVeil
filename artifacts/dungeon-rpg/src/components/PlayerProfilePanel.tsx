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
  type CosmeticRarity,
  type PlayerProfileProgress,
  type ProfileAvatarDefinition,
  type ProfileCardDefinition,
  type ProfileTitleDefinition,
} from '../game/playerProfile';
import {
  claimWeeklyEliteQuest,
  loadWeeklyEliteState,
  weeklyEliteProgress,
  weeklyEliteQuests,
  weeklyEliteTimeLabel,
  type WeeklyEliteQuest,
} from '../game/weeklyElite';
import { currentOnlineSession, getMyGuildMembership, type OnlineGuildMembership } from '../game/supabaseOnline';
import { getMySocialProfile, type SocialProfile } from '../game/socialProgressOnline';

type Tab = 'overview' | 'stats' | 'titles' | 'cards' | 'avatars' | 'weekly';

type Props = {
  profile: PlayerProfileProgress;
  saveData: SaveData | null;
  meta: MetaProgression;
  retention: RetentionProfile;
  language: 'de' | 'en';
  onProfileChange: (profile: PlayerProfileProgress) => void;
  onClose: () => void;
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

function rarityLabel(rarity: CosmeticRarity | undefined, de: boolean): string {
  if (rarity === 'mythic') return de ? 'Mythisch' : 'Mythic';
  if (rarity === 'epic') return de ? 'Episch' : 'Epic';
  if (rarity === 'rare') return de ? 'Selten' : 'Rare';
  return de ? 'Gewöhnlich' : 'Common';
}

function rarityTone(rarity: CosmeticRarity | undefined): string {
  if (rarity === 'mythic') return 'text-fuchsia-200 border-fuchsia-300/18 bg-fuchsia-400/[.06]';
  if (rarity === 'epic') return 'text-violet-200 border-violet-300/18 bg-violet-400/[.06]';
  if (rarity === 'rare') return 'text-cyan-200 border-cyan-300/18 bg-cyan-400/[.06]';
  return 'text-white/48 border-white/10 bg-white/[.035]';
}

function Stat({ label, value, tone = 'text-white/88' }: { label: string; value: React.ReactNode; tone?: string }) {
  return <div className="rounded-2xl border border-white/8 bg-white/[.025] p-3 text-center">
    <div className="text-[6px] font-black uppercase tracking-[.14em] text-white/28">{label}</div>
    <div className={`mt-1 text-[15px] font-black ${tone}`}>{value}</div>
  </div>;
}

function ProgressBar({ value, target, tone = 'from-amber-600 to-amber-200' }: { value: number; target: number; tone?: string }) {
  const percent = Math.max(0, Math.min(100, target > 0 ? value / target * 100 : 100));
  return <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/45"><div className={`h-full rounded-full bg-gradient-to-r ${tone}`} style={{ width: `${percent}%` }} /></div>;
}

export function PlayerProfilePanel({ profile, saveData, meta, retention, language, onProfileChange, onClose }: Props) {
  const de = language === 'de';
  const [tab, setTab] = useState<Tab>('overview');
  const [onlineProfile, setOnlineProfile] = useState<SocialProfile | null>(null);
  const [membership, setMembership] = useState<OnlineGuildMembership | null>(null);
  const [weeklyState, setWeeklyState] = useState(() => loadWeeklyEliteState(profile.stats));
  const title = selectedProfileTitle(profile);
  const card = selectedProfileCard(profile);
  const avatar = selectedProfileAvatar(profile);
  const playerName = saveData?.playerName?.trim() || onlineProfile?.display_name || (de ? 'Waldläufer' : 'Ranger');
  const ownedItems = Object.keys(meta.owned).length;
  const codexEntries = retention.codex.enemies.length + retention.codex.bosses.length + retention.codex.hunts.length + retention.codex.relics.length;

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

  useEffect(() => {
    const refresh = () => setWeeklyState(loadWeeklyEliteState(profile.stats));
    window.addEventListener('dungeon-veil-weekly-elite-changed', refresh);
    return () => window.removeEventListener('dungeon-veil-weekly-elite-changed', refresh);
  }, [profile.stats]);

  const tabs = useMemo(() => [
    ['overview', de ? 'Übersicht' : 'Overview'],
    ['stats', de ? 'Statistik' : 'Stats'],
    ['titles', de ? 'Titel' : 'Titles'],
    ['cards', de ? 'Visitenkarten' : 'Calling Cards'],
    ['avatars', de ? 'Avatare' : 'Avatars'],
    ['weekly', de ? 'Elite' : 'Elite'],
  ] as const, [de]);

  const unlockedTitles = PROFILE_TITLES.filter(item => cosmeticUnlocked(item, profile, meta.rank)).length;
  const unlockedCards = PROFILE_CARDS.filter(item => cosmeticUnlocked(item, profile, meta.rank)).length;
  const unlockedAvatars = PROFILE_AVATARS.filter(item => cosmeticUnlocked(item, profile, meta.rank)).length;

  const equipTitle = (definition: ProfileTitleDefinition) => onProfileChange(selectPlayerProfileTitle(definition.id, meta.rank));
  const equipCard = (definition: ProfileCardDefinition) => onProfileChange(selectPlayerProfileCard(definition.id, meta.rank));
  const equipAvatar = (definition: ProfileAvatarDefinition) => onProfileChange(selectPlayerProfileAvatar(definition.id, meta.rank));

  const cosmeticTile = <T extends ProfileTitleDefinition | ProfileCardDefinition | ProfileAvatarDefinition>(definition: T, selected: boolean, onEquip: () => void, preview: React.ReactNode) => {
    const unlocked = cosmeticUnlocked(definition, profile, meta.rank);
    const progress = cosmeticProgress(definition, profile, meta.rank);
    return <article key={definition.id} className={`rounded-2xl border p-3 ${selected ? 'border-amber-300/32 bg-amber-400/[.07]' : unlocked ? 'border-white/10 bg-white/[.025]' : 'border-white/8 bg-black/24'}`}>
      <div className="flex items-center gap-3">
        {preview}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><div className="truncate text-[11px] font-black text-white/88">{de ? definition.nameDe : definition.nameEn}</div><span className={`rounded-full border px-1.5 py-0.5 text-[5px] font-black uppercase tracking-[.1em] ${rarityTone(definition.rarity)}`}>{rarityLabel(definition.rarity, de)}</span></div>
          <div className={`mt-1 text-[7px] leading-relaxed ${unlocked ? 'text-white/36' : 'text-white/48'}`}>{de ? definition.requirementDe : definition.requirementEn}</div>
        </div>
        <button type="button" disabled={!unlocked || selected} onClick={onEquip} className={`rounded-lg border px-2.5 py-2 text-[6px] font-black uppercase tracking-[.12em] ${selected ? 'border-amber-300/20 bg-amber-400/10 text-amber-100' : unlocked ? 'border-white/12 bg-white/[.04] text-white/62 active:scale-[.97]' : 'border-white/8 bg-black/24 text-white/30'}`}>{selected ? (de ? 'Aktiv' : 'Active') : unlocked ? (de ? 'Ausrüsten' : 'Equip') : (de ? 'Gesperrt' : 'Locked')}</button>
      </div>
      {!unlocked && <><ProgressBar value={progress.value} target={progress.target} /><div className="mt-1 text-right text-[6px] font-black text-white/34">{progress.value}/{progress.target}</div></>}
    </article>;
  };

  const claimWeekly = (quest: WeeklyEliteQuest) => {
    const next = claimWeeklyEliteQuest(quest.id, profile.stats);
    setWeeklyState(next);
    onProfileChange({ ...profile });
  };

  return <div className="fixed inset-0 z-[180] overflow-hidden bg-[#07080b]/96 text-white backdrop-blur-xl" data-testid="player-profile-panel">
    <div className="mx-auto flex h-full w-full max-w-lg flex-col px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-[max(14px,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between gap-3">
        <div><div className="text-[7px] font-black uppercase tracking-[.3em] text-amber-100/42">{de ? 'SPIELERPROFIL' : 'PLAYER PROFILE'}</div><div className="mt-1 text-xl font-black text-amber-50">{de ? 'Dein Weg im Schleier' : 'Your path through the Veil'}</div></div>
        <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[.035] text-lg text-white/55 active:scale-[.96]">×</button>
      </div>

      <section className="mt-4 rounded-3xl border p-4 shadow-2xl" style={{ background: card.background, borderColor: card.border, boxShadow: `0 18px 52px rgba(0,0,0,.45),0 0 26px ${card.glow}` }}>
        <div className="flex items-center gap-3">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/20 text-2xl shadow-inner" style={{ background: avatar.background }}>{avatar.icon}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-black text-white">{playerName}</div>
            <div className="mt-1 text-[8px] font-black uppercase tracking-[.16em] text-white/55">{de ? `Rang ${meta.rank}` : `Rank ${meta.rank}`} · {de ? title.nameDe : title.nameEn}</div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[6px] font-black uppercase tracking-[.12em] text-white/38"><span className="rounded-full border border-white/10 bg-black/16 px-2 py-1">{de ? card.nameDe : card.nameEn}</span>{membership && <span className="rounded-full border border-white/10 bg-black/16 px-2 py-1">[{membership.guild.tag}] {membership.guild.name}</span>}</div>
          </div>
        </div>
      </section>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
        {tabs.map(([key, label]) => <button key={key} type="button" onClick={() => setTab(key)} className={`min-h-10 shrink-0 rounded-xl border px-3 text-[7px] font-black uppercase tracking-[.12em] active:scale-[.98] ${tab === key ? 'border-amber-300/34 bg-amber-400/12 text-amber-100' : 'border-white/8 bg-black/22 text-white/36'}`}>{label}</button>)}
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pb-4">
        {tab === 'overview' && <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2"><Stat label={de ? 'Titel' : 'Titles'} value={`${unlockedTitles}/${PROFILE_TITLES.length}`} tone="text-amber-100" /><Stat label={de ? 'Visitenkarten' : 'Cards'} value={`${unlockedCards}/${PROFILE_CARDS.length}`} tone="text-violet-100" /><Stat label={de ? 'Avatare' : 'Avatars'} value={`${unlockedAvatars}/${PROFILE_AVATARS.length}`} tone="text-cyan-100" /></div>
          <div className="grid grid-cols-2 gap-2"><Stat label={de ? 'Höchstes Kapitel' : 'Highest chapter'} value={profile.stats.highestChapter} tone="text-violet-100" /><Stat label={de ? 'Höchster Raum' : 'Highest room'} value={profile.stats.highestRoom} tone="text-cyan-100" /></div>
          <div className="grid grid-cols-3 gap-2"><Stat label={de ? 'Rang' : 'Rank'} value={meta.rank} tone="text-amber-100" /><Stat label={de ? 'Items' : 'Items'} value={ownedItems} tone="text-emerald-100" /><Stat label={de ? 'Kodex' : 'Codex'} value={codexEntries} tone="text-sky-100" /></div>
        </div>}

        {tab === 'stats' && <div className="grid grid-cols-2 gap-2"><Stat label={de ? 'Gestartete Runs' : 'Runs started'} value={formatNumber(profile.stats.runsStarted)} /><Stat label={de ? 'Räume abgeschlossen' : 'Rooms cleared'} value={formatNumber(profile.stats.roomsCleared)} /><Stat label={de ? 'Gegner besiegt' : 'Enemies defeated'} value={formatNumber(profile.stats.enemiesDefeated)} /><Stat label={de ? 'Bosse besiegt' : 'Bosses defeated'} value={formatNumber(profile.stats.bossesDefeated)} tone="text-amber-100" /><Stat label={de ? 'Gesamtschaden' : 'Total damage'} value={formatNumber(profile.stats.totalDamage)} tone="text-orange-100" /><Stat label={de ? 'Items erhalten' : 'Items found'} value={formatNumber(profile.stats.itemsFound)} tone="text-emerald-100" /><Stat label={de ? 'Aufträge abgeschlossen' : 'Quests completed'} value={formatNumber(profile.stats.questsCompleted)} tone="text-violet-100" /><Stat label={de ? 'Spielzeit' : 'Play time'} value={formatTime(profile.stats.playTimeMs, de)} tone="text-sky-100" /></div>}

        {tab === 'titles' && <div className="space-y-2">{PROFILE_TITLES.map(definition => cosmeticTile(definition, profile.selectedTitle === definition.id, () => equipTitle(definition), <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-300/16 bg-amber-400/[.05] text-lg text-amber-100">{definition.icon}</div>))}</div>}
        {tab === 'cards' && <div className="space-y-2">{PROFILE_CARDS.map(definition => cosmeticTile(definition, profile.selectedCard === definition.id, () => equipCard(definition), <div className="h-11 w-20 shrink-0 rounded-xl border" style={{ background: definition.background, borderColor: definition.border, boxShadow: `0 0 12px ${definition.glow}` }} />))}</div>}
        {tab === 'avatars' && <div className="space-y-2">{PROFILE_AVATARS.map(definition => cosmeticTile(definition, profile.selectedAvatar === definition.id, () => equipAvatar(definition), <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/14 text-lg" style={{ background: definition.background }}>{definition.icon}</div>))}</div>}

        {tab === 'weekly' && <div className="space-y-3">
          <section className="rounded-2xl border border-fuchsia-300/16 bg-fuchsia-400/[.045] p-4"><div className="flex items-center justify-between gap-3"><div><div className="text-[7px] font-black uppercase tracking-[.22em] text-fuchsia-100/48">{de ? 'WÖCHENTLICHE ELITE-AUFTRÄGE' : 'WEEKLY ELITE CONTRACTS'}</div><div className="mt-1 text-[10px] text-white/42">{de ? 'Schwer, nicht kaufbar und nur durch Spielen abschließbar.' : 'Hard, not purchasable, earned only by playing.'}</div></div><div className="rounded-xl border border-white/8 bg-black/24 px-2.5 py-2 text-[8px] font-black text-fuchsia-100">{weeklyEliteTimeLabel(language)}</div></div><div className="mt-3 text-[8px] text-white/34">{de ? `Elite-Marken: ${weeklyState.eliteMarks}` : `Elite Marks: ${weeklyState.eliteMarks}`}</div></section>
          {weeklyEliteQuests(weeklyState.weekKey).map(quest => { const progress = weeklyEliteProgress(quest, profile.stats, weeklyState); const complete = progress >= quest.target; const claimed = weeklyState.claimedQuestIds.includes(quest.id); return <article key={quest.id} className="rounded-2xl border border-white/9 bg-white/[.025] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="text-[11px] font-black text-white/86">{de ? quest.titleDe : quest.titleEn}</div><div className="mt-1 text-[8px] leading-relaxed text-white/38">{de ? quest.descriptionDe : quest.descriptionEn}</div></div><span className="rounded-full border border-fuchsia-300/16 bg-fuchsia-400/[.06] px-2 py-1 text-[6px] font-black uppercase text-fuchsia-100">{de ? quest.reward.nameDe : quest.reward.nameEn}</span></div><ProgressBar value={progress} target={quest.target} tone="from-fuchsia-700 to-fuchsia-200" /><div className="mt-2 flex items-center justify-between gap-3"><span className="text-[7px] font-black text-white/34">{formatNumber(Math.min(progress, quest.target))}/{formatNumber(quest.target)}</span><button type="button" disabled={!complete || claimed} onClick={() => claimWeekly(quest)} className={`rounded-xl border px-3 py-2 text-[7px] font-black uppercase tracking-[.12em] ${claimed ? 'border-emerald-300/16 bg-emerald-400/[.06] text-emerald-100' : complete ? 'border-fuchsia-300/24 bg-fuchsia-500/12 text-fuchsia-100 active:scale-[.98]' : 'border-white/8 bg-black/20 text-white/24'}`}>{claimed ? (de ? 'Erhalten' : 'Claimed') : complete ? (de ? 'Belohnung holen' : 'Claim reward') : (de ? 'Noch offen' : 'In progress')}</button></div></article>; })}
        </div>}
      </div>
    </div>
  </div>;
}
