export type ProfileTitleId =
  | 'veil-initiate' | 'room-runner' | 'chapter-breaker' | 'boss-hunter' | 'relentless' | 'quest-keeper' | 'veil-veteran'
  | 'untouched' | 'crypt-lord' | 'ash-walker' | 'world-savior' | 'immortal' | 'weekly-breaker' | 'veil-executioner';
export type ProfileCardId =
  | 'ash' | 'hunter' | 'frost' | 'warden' | 'quest' | 'veil'
  | 'crypt' | 'demon-gate' | 'worldboss' | 'guild-founder' | 'rift-seal' | 'iron-veil';
export type ProfileAvatarId =
  | 'ranger' | 'ember' | 'frost' | 'warden' | 'sigil' | 'veil'
  | 'ash-mask' | 'demon-eye' | 'rune-bow' | 'worldboss-seal' | 'night-watch' | 'arcane-eye';

export type PlayerProfileStats = {
  runsStarted: number;
  roomsCleared: number;
  enemiesDefeated: number;
  bossesDefeated: number;
  totalDamage: number;
  itemsFound: number;
  questsCompleted: number;
  playTimeMs: number;
  highestChapter: number;
  highestRoom: number;
};

export type PlayerProfileProgress = {
  version: 1;
  selectedTitle: ProfileTitleId;
  selectedCard: ProfileCardId;
  selectedAvatar: ProfileAvatarId;
  stats: PlayerProfileStats;
  updatedAt: number;
};

type UnlockProgress = { value: number; target: number };
type UnlockContext = { profile: PlayerProfileProgress; rank: number };
export type CosmeticRarity = 'common' | 'rare' | 'epic' | 'mythic';

type CosmeticDefinition<T extends string> = {
  id: T;
  icon: string;
  nameDe: string;
  nameEn: string;
  requirementDe: string;
  requirementEn: string;
  rarity?: CosmeticRarity;
  progress: (context: UnlockContext) => UnlockProgress;
};

export type ProfileTitleDefinition = CosmeticDefinition<ProfileTitleId>;
export type ProfileCardDefinition = CosmeticDefinition<ProfileCardId> & {
  background: string;
  border: string;
  glow: string;
};
export type ProfileAvatarDefinition = CosmeticDefinition<ProfileAvatarId> & {
  background: string;
};

const STORAGE_KEY = 'dungeon-veil-player-profile-v1';
const WEEKLY_STORAGE_KEY = 'dungeon-veil-weekly-elite-v1';
export const PLAYER_PROFILE_EVENT = 'dungeon-veil-player-profile-changed';

const stats = (profile: PlayerProfileProgress) => profile.stats;
const fixed = (): UnlockProgress => ({ value: 1, target: 1 });
const valueTarget = (value: number, target: number): UnlockProgress => ({ value, target });
const room = (target: number) => ({ profile }: UnlockContext) => valueTarget(stats(profile).highestRoom, target);
const chapter = (target: number) => ({ profile }: UnlockContext) => valueTarget(stats(profile).highestChapter, target);
const bosses = (target: number) => ({ profile }: UnlockContext) => valueTarget(stats(profile).bossesDefeated, target);
const enemies = (target: number) => ({ profile }: UnlockContext) => valueTarget(stats(profile).enemiesDefeated, target);
const quests = (target: number) => ({ profile }: UnlockContext) => valueTarget(stats(profile).questsCompleted, target);
const items = (target: number) => ({ profile }: UnlockContext) => valueTarget(stats(profile).itemsFound, target);
const damage = (target: number) => ({ profile }: UnlockContext) => valueTarget(stats(profile).totalDamage, target);
const rooms = (target: number) => ({ profile }: UnlockContext) => valueTarget(stats(profile).roomsCleared, target);
const rank = (target: number) => ({ rank: current }: UnlockContext) => valueTarget(current, target);
const playHours = (target: number) => ({ profile }: UnlockContext) => valueTarget(Math.floor(stats(profile).playTimeMs / 3600000), target);

function weeklyOwned(id: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const state = JSON.parse(localStorage.getItem(WEEKLY_STORAGE_KEY) || '{}') as { ownedRewardIds?: unknown };
    return Array.isArray(state.ownedRewardIds) && state.ownedRewardIds.includes(id);
  } catch { return false; }
}
const weekly = (id: string) => (): UnlockProgress => ({ value: weeklyOwned(id) ? 1 : 0, target: 1 });

export const PROFILE_TITLES: ProfileTitleDefinition[] = [
  { id: 'veil-initiate', icon: '◇', nameDe: 'Schleiernovize', nameEn: 'Veil Initiate', requirementDe: 'Von Beginn an verfügbar', requirementEn: 'Available from the start', rarity: 'common', progress: fixed },
  { id: 'room-runner', icon: '➜', nameDe: 'Schleierläufer', nameEn: 'Veil Runner', requirementDe: 'Raum 10 erreichen', requirementEn: 'Reach room 10', rarity: 'common', progress: room(10) },
  { id: 'chapter-breaker', icon: '◈', nameDe: 'Wächterbrecher', nameEn: 'Warden Breaker', requirementDe: 'Kapitel 2 erreichen', requirementEn: 'Reach chapter 2', rarity: 'rare', progress: chapter(2) },
  { id: 'boss-hunter', icon: '♛', nameDe: 'Bossjäger', nameEn: 'Boss Hunter', requirementDe: '5 Bosse besiegen', requirementEn: 'Defeat 5 bosses', rarity: 'rare', progress: bosses(5) },
  { id: 'relentless', icon: '⚔', nameDe: 'Unbeugsam', nameEn: 'Relentless', requirementDe: '250 Gegner besiegen', requirementEn: 'Defeat 250 enemies', rarity: 'rare', progress: enemies(250) },
  { id: 'quest-keeper', icon: '✦', nameDe: 'Auftragsmeister', nameEn: 'Quest Keeper', requirementDe: '20 Aufträge abschließen', requirementEn: 'Complete 20 quests', rarity: 'epic', progress: quests(20) },
  { id: 'veil-veteran', icon: '◆', nameDe: 'Veteran des Schleiers', nameEn: 'Veil Veteran', requirementDe: 'Kapitel 5 erreichen', requirementEn: 'Reach chapter 5', rarity: 'epic', progress: chapter(5) },
  { id: 'untouched', icon: '✧', nameDe: 'Unberührt', nameEn: 'Untouched', requirementDe: '150 Räume abschließen', requirementEn: 'Clear 150 rooms', rarity: 'epic', progress: rooms(150) },
  { id: 'crypt-lord', icon: '♜', nameDe: 'Herr der Krypta', nameEn: 'Lord of the Crypt', requirementDe: '25 Bosse besiegen', requirementEn: 'Defeat 25 bosses', rarity: 'epic', progress: bosses(25) },
  { id: 'ash-walker', icon: '♨', nameDe: 'Aschenwanderer', nameEn: 'Ash Walker', requirementDe: 'Kapitel 8 erreichen', requirementEn: 'Reach chapter 8', rarity: 'mythic', progress: chapter(8) },
  { id: 'world-savior', icon: '☀', nameDe: 'Weltenretter', nameEn: 'World Savior', requirementDe: '100.000 Gesamtschaden verursachen', requirementEn: 'Deal 100,000 total damage', rarity: 'mythic', progress: damage(100000) },
  { id: 'immortal', icon: '∞', nameDe: 'Der Unsterbliche', nameEn: 'The Immortal', requirementDe: '50 Spielstunden erreichen', requirementEn: 'Reach 50 hours played', rarity: 'mythic', progress: playHours(50) },
  { id: 'weekly-breaker', icon: '✹', nameDe: 'Wochenbrecher', nameEn: 'Weekbreaker', requirementDe: 'Elite-Auftrag „Jagd ohne Ende“ abschließen', requirementEn: 'Complete the Endless Hunt elite contract', rarity: 'mythic', progress: weekly('weekly-breaker') },
  { id: 'veil-executioner', icon: '⟡', nameDe: 'Schleierhenker', nameEn: 'Veil Executioner', requirementDe: 'Elite-Auftrag „Zorn des Schleiers“ abschließen', requirementEn: 'Complete the Wrath of the Veil elite contract', rarity: 'mythic', progress: weekly('veil-executioner') },
];

export const PROFILE_CARDS: ProfileCardDefinition[] = [
  { id: 'ash', icon: '◇', nameDe: 'Aschepfad', nameEn: 'Ash Path', requirementDe: 'Von Beginn an verfügbar', requirementEn: 'Available from the start', rarity: 'common', progress: fixed, background: 'radial-gradient(circle at 14% 20%,rgba(255,160,75,.24),transparent 26%),linear-gradient(135deg,#71391d,#211512 68%)', border: '#d9a25a', glow: 'rgba(217,162,90,.22)' },
  { id: 'hunter', icon: '➶', nameDe: 'Jägerzeichen', nameEn: 'Hunter Mark', requirementDe: 'Rang 5 erreichen', requirementEn: 'Reach rank 5', rarity: 'rare', progress: rank(5), background: 'radial-gradient(circle at 82% 16%,rgba(126,229,158,.22),transparent 28%),linear-gradient(135deg,#214936,#0e1916 70%)', border: '#7fc39a', glow: 'rgba(78,170,112,.2)' },
  { id: 'frost', icon: '❄', nameDe: 'Frostschleier', nameEn: 'Frost Veil', requirementDe: 'Kapitel 2 erreichen', requirementEn: 'Reach chapter 2', rarity: 'rare', progress: chapter(2), background: 'repeating-linear-gradient(125deg,transparent 0 28px,rgba(170,235,255,.08) 29px 30px),linear-gradient(135deg,#1e4c60,#101926 72%)', border: '#83d9f3', glow: 'rgba(78,190,229,.22)' },
  { id: 'warden', icon: '♜', nameDe: 'Wächterbanner', nameEn: 'Warden Banner', requirementDe: '10 Bosse besiegen', requirementEn: 'Defeat 10 bosses', rarity: 'epic', progress: bosses(10), background: 'linear-gradient(90deg,transparent 48%,rgba(255,220,120,.12) 49% 51%,transparent 52%),linear-gradient(135deg,#5d4519,#1d170f 72%)', border: '#e3c36b', glow: 'rgba(227,195,107,.24)' },
  { id: 'quest', icon: '✦', nameDe: 'Siegelträger', nameEn: 'Sigil Bearer', requirementDe: '10 Aufträge abschließen', requirementEn: 'Complete 10 quests', rarity: 'rare', progress: quests(10), background: 'radial-gradient(circle at 50% 50%,rgba(208,158,255,.16),transparent 34%),linear-gradient(135deg,#412b66,#181226 74%)', border: '#bb92f2', glow: 'rgba(176,119,238,.22)' },
  { id: 'veil', icon: '◉', nameDe: 'Auge des Schleiers', nameEn: 'Eye of the Veil', requirementDe: 'Kapitel 5 erreichen', requirementEn: 'Reach chapter 5', rarity: 'epic', progress: chapter(5), background: 'radial-gradient(ellipse at 50% 48%,rgba(218,150,255,.28),transparent 17%),linear-gradient(135deg,#3d2258,#08131f 76%)', border: '#c994ff', glow: 'rgba(167,93,238,.3)' },
  { id: 'crypt', icon: '▥', nameDe: 'Kryptenfluch', nameEn: 'Crypt Curse', requirementDe: '500 Gegner besiegen', requirementEn: 'Defeat 500 enemies', rarity: 'epic', progress: enemies(500), background: 'repeating-linear-gradient(90deg,rgba(255,255,255,.025) 0 2px,transparent 2px 24px),linear-gradient(145deg,#312a37,#0c0a10 72%)', border: '#9f8ca8', glow: 'rgba(142,112,161,.24)' },
  { id: 'demon-gate', icon: '♢', nameDe: 'Dämonenportal', nameEn: 'Demon Gate', requirementDe: 'Kapitel 7 erreichen', requirementEn: 'Reach chapter 7', rarity: 'mythic', progress: chapter(7), background: 'radial-gradient(circle at 50% 52%,rgba(255,64,50,.34),transparent 24%),linear-gradient(135deg,#5c1818,#15080b 74%)', border: '#f26d5f', glow: 'rgba(242,71,59,.32)' },
  { id: 'worldboss', icon: '☄', nameDe: 'Weltboss-Siegel', nameEn: 'World Boss Seal', requirementDe: '40 Bosse besiegen', requirementEn: 'Defeat 40 bosses', rarity: 'mythic', progress: bosses(40), background: 'radial-gradient(circle at 16% 22%,rgba(255,190,73,.32),transparent 23%),radial-gradient(circle at 82% 72%,rgba(137,78,255,.22),transparent 25%),linear-gradient(135deg,#45220f,#130c18 72%)', border: '#ffb34e', glow: 'rgba(255,135,36,.34)' },
  { id: 'guild-founder', icon: '⚑', nameDe: 'Gildengründer', nameEn: 'Guild Founder', requirementDe: 'Rang 15 erreichen', requirementEn: 'Reach rank 15', rarity: 'epic', progress: rank(15), background: 'linear-gradient(120deg,transparent 0 45%,rgba(244,205,106,.14) 46% 54%,transparent 55%),linear-gradient(135deg,#58431d,#17130c 75%)', border: '#e7c86f', glow: 'rgba(231,200,111,.26)' },
  { id: 'rift-seal', icon: '⬡', nameDe: 'Riss-Siegel', nameEn: 'Rift Seal', requirementDe: 'Wöchentlichen Elite-Auftrag abschließen', requirementEn: 'Complete its weekly elite contract', rarity: 'mythic', progress: weekly('rift-seal'), background: 'repeating-conic-gradient(from 35deg at 50% 50%,rgba(132,91,255,.16) 0 8deg,transparent 8deg 26deg),linear-gradient(135deg,#372463,#0a0c1c 76%)', border: '#a98cff', glow: 'rgba(130,90,255,.38)' },
  { id: 'iron-veil', icon: '▰', nameDe: 'Eiserner Schleier', nameEn: 'Iron Veil', requirementDe: 'Wöchentlichen Elite-Auftrag abschließen', requirementEn: 'Complete its weekly elite contract', rarity: 'mythic', progress: weekly('iron-veil'), background: 'repeating-linear-gradient(135deg,rgba(255,255,255,.045) 0 1px,transparent 1px 13px),linear-gradient(135deg,#343943,#0b0e13 76%)', border: '#aeb7c8', glow: 'rgba(162,178,205,.3)' },
];

export const PROFILE_AVATARS: ProfileAvatarDefinition[] = [
  { id: 'ranger', icon: '🏹', nameDe: 'Waldläufer', nameEn: 'Ranger', requirementDe: 'Von Beginn an verfügbar', requirementEn: 'Available from the start', rarity: 'common', progress: fixed, background: 'radial-gradient(circle at 35% 28%,#d9c08a,#5f3b24 72%)' },
  { id: 'ember', icon: '🔥', nameDe: 'Aschenjäger', nameEn: 'Ash Hunter', requirementDe: 'Raum 10 erreichen', requirementEn: 'Reach room 10', rarity: 'common', progress: room(10), background: 'radial-gradient(circle at 35% 28%,#ffbb68,#7d2c20 72%)' },
  { id: 'frost', icon: '❄', nameDe: 'Frostläufer', nameEn: 'Frost Runner', requirementDe: 'Kapitel 2 erreichen', requirementEn: 'Reach chapter 2', rarity: 'rare', progress: chapter(2), background: 'radial-gradient(circle at 35% 28%,#b8efff,#25637d 72%)' },
  { id: 'warden', icon: '♜', nameDe: 'Wächter', nameEn: 'Warden', requirementDe: '5 Bosse besiegen', requirementEn: 'Defeat 5 bosses', rarity: 'rare', progress: bosses(5), background: 'radial-gradient(circle at 35% 28%,#f0d77c,#6f4a20 72%)' },
  { id: 'sigil', icon: '✦', nameDe: 'Siegelmeister', nameEn: 'Sigil Keeper', requirementDe: '25 Items erhalten', requirementEn: 'Find 25 items', rarity: 'rare', progress: items(25), background: 'radial-gradient(circle at 35% 28%,#d1adff,#59407d 72%)' },
  { id: 'veil', icon: '◈', nameDe: 'Schleierauge', nameEn: 'Veil Eye', requirementDe: 'Kapitel 5 erreichen', requirementEn: 'Reach chapter 5', rarity: 'epic', progress: chapter(5), background: 'radial-gradient(circle at 35% 28%,#d49bff,#172d4b 72%)' },
  { id: 'ash-mask', icon: '◒', nameDe: 'Aschenmaske', nameEn: 'Ash Mask', requirementDe: '750 Gegner besiegen', requirementEn: 'Defeat 750 enemies', rarity: 'epic', progress: enemies(750), background: 'radial-gradient(circle at 35% 28%,#f19a60,#421d1d 72%)' },
  { id: 'demon-eye', icon: '◉', nameDe: 'Dämonenauge', nameEn: 'Demon Eye', requirementDe: 'Kapitel 7 erreichen', requirementEn: 'Reach chapter 7', rarity: 'mythic', progress: chapter(7), background: 'radial-gradient(circle at 50% 45%,#ff665c 0 12%,#5c1721 35%,#17070c 74%)' },
  { id: 'rune-bow', icon: '➶', nameDe: 'Runenbogen', nameEn: 'Rune Bow', requirementDe: 'Rang 20 erreichen', requirementEn: 'Reach rank 20', rarity: 'epic', progress: rank(20), background: 'radial-gradient(circle at 35% 28%,#8ef0c1,#174b42 72%)' },
  { id: 'worldboss-seal', icon: '☄', nameDe: 'Weltboss-Emblem', nameEn: 'World Boss Emblem', requirementDe: '50 Bosse besiegen', requirementEn: 'Defeat 50 bosses', rarity: 'mythic', progress: bosses(50), background: 'radial-gradient(circle at 35% 28%,#ffc46a,#74251c 72%)' },
  { id: 'night-watch', icon: '☾', nameDe: 'Nachtwache', nameEn: 'Night Watch', requirementDe: 'Wöchentlichen Elite-Auftrag abschließen', requirementEn: 'Complete its weekly elite contract', rarity: 'mythic', progress: weekly('night-watch'), background: 'radial-gradient(circle at 35% 28%,#b7c7ff,#1d2448 72%)' },
  { id: 'arcane-eye', icon: '◉', nameDe: 'Arkanes Auge', nameEn: 'Arcane Eye', requirementDe: 'Wöchentlichen Elite-Auftrag abschließen', requirementEn: 'Complete its weekly elite contract', rarity: 'mythic', progress: weekly('arcane-eye'), background: 'radial-gradient(circle at 35% 28%,#e0b2ff,#3e1d63 72%)' },
];

const DEFAULT_PROFILE: PlayerProfileProgress = {
  version: 1,
  selectedTitle: 'veil-initiate',
  selectedCard: 'ash',
  selectedAvatar: 'ranger',
  stats: { runsStarted: 0, roomsCleared: 0, enemiesDefeated: 0, bossesDefeated: 0, totalDamage: 0, itemsFound: 0, questsCompleted: 0, playTimeMs: 0, highestChapter: 1, highestRoom: 1 },
  updatedAt: 0,
};

function number(value: unknown, minimum = 0): number { return Math.max(minimum, Math.floor(Number(value ?? 0) || 0)); }
function normalizeProfile(value: unknown): PlayerProfileProgress {
  const parsed = value && typeof value === 'object' ? value as Partial<PlayerProfileProgress> : {};
  const rawStats = parsed.stats && typeof parsed.stats === 'object' ? parsed.stats as Partial<PlayerProfileStats> : {};
  return {
    version: 1,
    selectedTitle: PROFILE_TITLES.some(item => item.id === parsed.selectedTitle) ? parsed.selectedTitle as ProfileTitleId : 'veil-initiate',
    selectedCard: PROFILE_CARDS.some(item => item.id === parsed.selectedCard) ? parsed.selectedCard as ProfileCardId : 'ash',
    selectedAvatar: PROFILE_AVATARS.some(item => item.id === parsed.selectedAvatar) ? parsed.selectedAvatar as ProfileAvatarId : 'ranger',
    stats: {
      runsStarted: number(rawStats.runsStarted), roomsCleared: number(rawStats.roomsCleared), enemiesDefeated: number(rawStats.enemiesDefeated), bossesDefeated: number(rawStats.bossesDefeated), totalDamage: number(rawStats.totalDamage), itemsFound: number(rawStats.itemsFound), questsCompleted: number(rawStats.questsCompleted), playTimeMs: number(rawStats.playTimeMs), highestChapter: number(rawStats.highestChapter, 1), highestRoom: number(rawStats.highestRoom, 1),
    },
    updatedAt: number(parsed.updatedAt),
  };
}

export function loadPlayerProfile(): PlayerProfileProgress {
  if (typeof localStorage === 'undefined') return structuredClone(DEFAULT_PROFILE);
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? normalizeProfile(JSON.parse(raw)) : structuredClone(DEFAULT_PROFILE); }
  catch { return structuredClone(DEFAULT_PROFILE); }
}
export function cosmeticUnlocked(definition: CosmeticDefinition<string>, profile: PlayerProfileProgress, rankValue: number): boolean { const progress = definition.progress({ profile, rank: rankValue }); return progress.value >= progress.target; }
export function cosmeticProgress(definition: CosmeticDefinition<string>, profile: PlayerProfileProgress, rankValue: number): UnlockProgress { const progress = definition.progress({ profile, rank: rankValue }); return { value: Math.min(progress.target, Math.max(0, progress.value)), target: Math.max(1, progress.target) }; }
export function selectedProfileTitle(profile: PlayerProfileProgress): ProfileTitleDefinition { return PROFILE_TITLES.find(item => item.id === profile.selectedTitle) ?? PROFILE_TITLES[0]; }
export function selectedProfileCard(profile: PlayerProfileProgress): ProfileCardDefinition { return PROFILE_CARDS.find(item => item.id === profile.selectedCard) ?? PROFILE_CARDS[0]; }
export function selectedProfileAvatar(profile: PlayerProfileProgress): ProfileAvatarDefinition { return PROFILE_AVATARS.find(item => item.id === profile.selectedAvatar) ?? PROFILE_AVATARS[0]; }

function persist(profile: PlayerProfileProgress): PlayerProfileProgress { profile.updatedAt = Date.now(); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch {} if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PLAYER_PROFILE_EVENT, { detail: profile })); return profile; }
function mutate(mutator: (profile: PlayerProfileProgress) => void): PlayerProfileProgress { const profile = loadPlayerProfile(); mutator(profile); return persist(profile); }

export function recordPlayerProfileProgress(chapterValue: number, roomValue: number): PlayerProfileProgress { return mutate(profile => { const nextChapter = Math.max(1, Math.floor(chapterValue || 1)); const nextRoom = Math.max(1, Math.floor(roomValue || 1)); if (nextChapter > profile.stats.highestChapter) { profile.stats.highestChapter = nextChapter; profile.stats.highestRoom = nextRoom; } else if (nextChapter === profile.stats.highestChapter) profile.stats.highestRoom = Math.max(profile.stats.highestRoom, nextRoom); }); }
export function beginPlayerProfileRun(chapterValue = 1, roomValue = 1): PlayerProfileProgress { return mutate(profile => { profile.stats.runsStarted++; if (chapterValue > profile.stats.highestChapter) { profile.stats.highestChapter = chapterValue; profile.stats.highestRoom = roomValue; } }); }
export function recordPlayerProfileSession(input: { playTimeMs: number; kills: number; damage: number; chapter: number; room: number }): PlayerProfileProgress { return mutate(profile => { profile.stats.playTimeMs += Math.max(0, Math.floor(input.playTimeMs || 0)); profile.stats.enemiesDefeated += Math.max(0, Math.floor(input.kills || 0)); profile.stats.totalDamage += Math.max(0, Math.floor(input.damage || 0)); const chapterValue = Math.max(1, Math.floor(input.chapter || 1)); const roomValue = Math.max(1, Math.floor(input.room || 1)); if (chapterValue > profile.stats.highestChapter) { profile.stats.highestChapter = chapterValue; profile.stats.highestRoom = roomValue; } else if (chapterValue === profile.stats.highestChapter) profile.stats.highestRoom = Math.max(profile.stats.highestRoom, roomValue); }); }
export function recordPlayerProfileRoomClear(chapterValue: number, roomValue: number, boss: boolean): PlayerProfileProgress { return mutate(profile => { profile.stats.roomsCleared++; if (boss) profile.stats.bossesDefeated++; if (chapterValue > profile.stats.highestChapter) { profile.stats.highestChapter = chapterValue; profile.stats.highestRoom = roomValue; } else if (chapterValue === profile.stats.highestChapter) profile.stats.highestRoom = Math.max(profile.stats.highestRoom, roomValue); }); }
export function recordPlayerProfileItemFound(count = 1): PlayerProfileProgress { return mutate(profile => { profile.stats.itemsFound += Math.max(0, Math.floor(count)); }); }
export function recordPlayerProfileQuestCompleted(count = 1): PlayerProfileProgress { return mutate(profile => { profile.stats.questsCompleted += Math.max(0, Math.floor(count)); }); }
export function selectPlayerProfileTitle(id: ProfileTitleId, rankValue: number): PlayerProfileProgress { return mutate(profile => { const definition = PROFILE_TITLES.find(item => item.id === id); if (definition && cosmeticUnlocked(definition, profile, rankValue)) profile.selectedTitle = id; }); }
export function selectPlayerProfileCard(id: ProfileCardId, rankValue: number): PlayerProfileProgress { return mutate(profile => { const definition = PROFILE_CARDS.find(item => item.id === id); if (definition && cosmeticUnlocked(definition, profile, rankValue)) profile.selectedCard = id; }); }
export function selectPlayerProfileAvatar(id: ProfileAvatarId, rankValue: number): PlayerProfileProgress { return mutate(profile => { const definition = PROFILE_AVATARS.find(item => item.id === id); if (definition && cosmeticUnlocked(definition, profile, rankValue)) profile.selectedAvatar = id; }); }
