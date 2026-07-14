export type ProfileTitleId = 'veil-initiate' | 'room-runner' | 'chapter-breaker' | 'boss-hunter' | 'relentless' | 'quest-keeper' | 'veil-veteran';
export type ProfileCardId = 'ash' | 'hunter' | 'frost' | 'warden' | 'quest' | 'veil';
export type ProfileAvatarId = 'ranger' | 'ember' | 'frost' | 'warden' | 'sigil' | 'veil';

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

type CosmeticDefinition<T extends string> = {
  id: T;
  icon: string;
  nameDe: string;
  nameEn: string;
  requirementDe: string;
  requirementEn: string;
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
export const PLAYER_PROFILE_EVENT = 'dungeon-veil-player-profile-changed';

const stats = (profile: PlayerProfileProgress) => profile.stats;
const fixed = (): UnlockProgress => ({ value: 1, target: 1 });
const roomProgress = ({ profile }: UnlockContext): UnlockProgress => ({ value: stats(profile).highestRoom, target: 10 });
const chapterTwo = ({ profile }: UnlockContext): UnlockProgress => ({ value: stats(profile).highestChapter, target: 2 });
const chapterFive = ({ profile }: UnlockContext): UnlockProgress => ({ value: stats(profile).highestChapter, target: 5 });
const bossFive = ({ profile }: UnlockContext): UnlockProgress => ({ value: stats(profile).bossesDefeated, target: 5 });
const bossTen = ({ profile }: UnlockContext): UnlockProgress => ({ value: stats(profile).bossesDefeated, target: 10 });
const enemy250 = ({ profile }: UnlockContext): UnlockProgress => ({ value: stats(profile).enemiesDefeated, target: 250 });
const questTen = ({ profile }: UnlockContext): UnlockProgress => ({ value: stats(profile).questsCompleted, target: 10 });
const questTwenty = ({ profile }: UnlockContext): UnlockProgress => ({ value: stats(profile).questsCompleted, target: 20 });
const itemsTwentyFive = ({ profile }: UnlockContext): UnlockProgress => ({ value: stats(profile).itemsFound, target: 25 });
const rankFive = ({ rank }: UnlockContext): UnlockProgress => ({ value: rank, target: 5 });

export const PROFILE_TITLES: ProfileTitleDefinition[] = [
  { id: 'veil-initiate', icon: '◇', nameDe: 'Schleiernovize', nameEn: 'Veil Initiate', requirementDe: 'Von Beginn an verfügbar', requirementEn: 'Available from the start', progress: fixed },
  { id: 'room-runner', icon: '➜', nameDe: 'Schleierläufer', nameEn: 'Veil Runner', requirementDe: 'Raum 10 erreichen', requirementEn: 'Reach room 10', progress: roomProgress },
  { id: 'chapter-breaker', icon: '◈', nameDe: 'Wächterbrecher', nameEn: 'Warden Breaker', requirementDe: 'Kapitel 2 erreichen', requirementEn: 'Reach chapter 2', progress: chapterTwo },
  { id: 'boss-hunter', icon: '♛', nameDe: 'Bossjäger', nameEn: 'Boss Hunter', requirementDe: '5 Bosse besiegen', requirementEn: 'Defeat 5 bosses', progress: bossFive },
  { id: 'relentless', icon: '⚔', nameDe: 'Unbeugsam', nameEn: 'Relentless', requirementDe: '250 Gegner besiegen', requirementEn: 'Defeat 250 enemies', progress: enemy250 },
  { id: 'quest-keeper', icon: '✦', nameDe: 'Auftragsmeister', nameEn: 'Quest Keeper', requirementDe: '20 Aufträge abschließen', requirementEn: 'Complete 20 quests', progress: questTwenty },
  { id: 'veil-veteran', icon: '◆', nameDe: 'Veteran des Schleiers', nameEn: 'Veil Veteran', requirementDe: 'Kapitel 5 erreichen', requirementEn: 'Reach chapter 5', progress: chapterFive },
];

export const PROFILE_CARDS: ProfileCardDefinition[] = [
  { id: 'ash', icon: '◇', nameDe: 'Aschepfad', nameEn: 'Ash Path', requirementDe: 'Von Beginn an verfügbar', requirementEn: 'Available from the start', progress: fixed, background: 'linear-gradient(135deg,rgba(111,58,28,.96),rgba(33,23,20,.96))', border: '#d9a25a', glow: 'rgba(217,162,90,.22)' },
  { id: 'hunter', icon: '➶', nameDe: 'Jägerzeichen', nameEn: 'Hunter Mark', requirementDe: 'Rang 5 erreichen', requirementEn: 'Reach rank 5', progress: rankFive, background: 'linear-gradient(135deg,rgba(33,73,54,.97),rgba(14,25,22,.97))', border: '#7fc39a', glow: 'rgba(78,170,112,.2)' },
  { id: 'frost', icon: '❄', nameDe: 'Frostschleier', nameEn: 'Frost Veil', requirementDe: 'Kapitel 2 erreichen', requirementEn: 'Reach chapter 2', progress: chapterTwo, background: 'linear-gradient(135deg,rgba(30,76,96,.97),rgba(16,25,38,.97))', border: '#83d9f3', glow: 'rgba(78,190,229,.22)' },
  { id: 'warden', icon: '♜', nameDe: 'Wächterbanner', nameEn: 'Warden Banner', requirementDe: '10 Bosse besiegen', requirementEn: 'Defeat 10 bosses', progress: bossTen, background: 'linear-gradient(135deg,rgba(93,69,25,.97),rgba(29,23,15,.97))', border: '#e3c36b', glow: 'rgba(227,195,107,.24)' },
  { id: 'quest', icon: '✦', nameDe: 'Siegelträger', nameEn: 'Sigil Bearer', requirementDe: '10 Aufträge abschließen', requirementEn: 'Complete 10 quests', progress: questTen, background: 'linear-gradient(135deg,rgba(65,43,102,.97),rgba(24,18,38,.97))', border: '#bb92f2', glow: 'rgba(176,119,238,.22)' },
  { id: 'veil', icon: '◉', nameDe: 'Auge des Schleiers', nameEn: 'Eye of the Veil', requirementDe: 'Kapitel 5 erreichen', requirementEn: 'Reach chapter 5', progress: chapterFive, background: 'linear-gradient(135deg,rgba(61,34,88,.98),rgba(8,19,31,.98))', border: '#c994ff', glow: 'rgba(167,93,238,.3)' },
];

export const PROFILE_AVATARS: ProfileAvatarDefinition[] = [
  { id: 'ranger', icon: '🏹', nameDe: 'Waldläufer', nameEn: 'Ranger', requirementDe: 'Von Beginn an verfügbar', requirementEn: 'Available from the start', progress: fixed, background: 'radial-gradient(circle at 35% 28%,#d9c08a,#5f3b24 72%)' },
  { id: 'ember', icon: '🔥', nameDe: 'Aschenjäger', nameEn: 'Ash Hunter', requirementDe: 'Raum 10 erreichen', requirementEn: 'Reach room 10', progress: roomProgress, background: 'radial-gradient(circle at 35% 28%,#ffbb68,#7d2c20 72%)' },
  { id: 'frost', icon: '❄', nameDe: 'Frostläufer', nameEn: 'Frost Runner', requirementDe: 'Kapitel 2 erreichen', requirementEn: 'Reach chapter 2', progress: chapterTwo, background: 'radial-gradient(circle at 35% 28%,#b8efff,#25637d 72%)' },
  { id: 'warden', icon: '♜', nameDe: 'Wächter', nameEn: 'Warden', requirementDe: '5 Bosse besiegen', requirementEn: 'Defeat 5 bosses', progress: bossFive, background: 'radial-gradient(circle at 35% 28%,#f0d77c,#6f4a20 72%)' },
  { id: 'sigil', icon: '✦', nameDe: 'Siegelmeister', nameEn: 'Sigil Keeper', requirementDe: '25 Items erhalten', requirementEn: 'Find 25 items', progress: itemsTwentyFive, background: 'radial-gradient(circle at 35% 28%,#d1adff,#59407d 72%)' },
  { id: 'veil', icon: '◈', nameDe: 'Schleierauge', nameEn: 'Veil Eye', requirementDe: 'Kapitel 5 erreichen', requirementEn: 'Reach chapter 5', progress: chapterFive, background: 'radial-gradient(circle at 35% 28%,#d49bff,#172d4b 72%)' },
];

const DEFAULT_PROFILE: PlayerProfileProgress = {
  version: 1,
  selectedTitle: 'veil-initiate',
  selectedCard: 'ash',
  selectedAvatar: 'ranger',
  stats: {
    runsStarted: 0,
    roomsCleared: 0,
    enemiesDefeated: 0,
    bossesDefeated: 0,
    totalDamage: 0,
    itemsFound: 0,
    questsCompleted: 0,
    playTimeMs: 0,
    highestChapter: 1,
    highestRoom: 1,
  },
  updatedAt: 0,
};

function number(value: unknown, minimum = 0): number {
  return Math.max(minimum, Math.floor(Number(value ?? 0) || 0));
}

function normalizeProfile(value: unknown): PlayerProfileProgress {
  const parsed = value && typeof value === 'object' ? value as Partial<PlayerProfileProgress> : {};
  const rawStats = parsed.stats && typeof parsed.stats === 'object' ? parsed.stats as Partial<PlayerProfileStats> : {};
  const profile: PlayerProfileProgress = {
    version: 1,
    selectedTitle: PROFILE_TITLES.some(item => item.id === parsed.selectedTitle) ? parsed.selectedTitle as ProfileTitleId : 'veil-initiate',
    selectedCard: PROFILE_CARDS.some(item => item.id === parsed.selectedCard) ? parsed.selectedCard as ProfileCardId : 'ash',
    selectedAvatar: PROFILE_AVATARS.some(item => item.id === parsed.selectedAvatar) ? parsed.selectedAvatar as ProfileAvatarId : 'ranger',
    stats: {
      runsStarted: number(rawStats.runsStarted),
      roomsCleared: number(rawStats.roomsCleared),
      enemiesDefeated: number(rawStats.enemiesDefeated),
      bossesDefeated: number(rawStats.bossesDefeated),
      totalDamage: number(rawStats.totalDamage),
      itemsFound: number(rawStats.itemsFound),
      questsCompleted: number(rawStats.questsCompleted),
      playTimeMs: number(rawStats.playTimeMs),
      highestChapter: number(rawStats.highestChapter, 1),
      highestRoom: number(rawStats.highestRoom, 1),
    },
    updatedAt: number(parsed.updatedAt),
  };
  return profile;
}

export function loadPlayerProfile(): PlayerProfileProgress {
  if (typeof localStorage === 'undefined') return structuredClone(DEFAULT_PROFILE);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeProfile(JSON.parse(raw)) : structuredClone(DEFAULT_PROFILE);
  } catch {
    return structuredClone(DEFAULT_PROFILE);
  }
}

export function cosmeticUnlocked(definition: CosmeticDefinition<string>, profile: PlayerProfileProgress, rank: number): boolean {
  const progress = definition.progress({ profile, rank });
  return progress.value >= progress.target;
}

export function cosmeticProgress(definition: CosmeticDefinition<string>, profile: PlayerProfileProgress, rank: number): UnlockProgress {
  const progress = definition.progress({ profile, rank });
  return { value: Math.min(progress.target, Math.max(0, progress.value)), target: Math.max(1, progress.target) };
}

export function selectedProfileTitle(profile: PlayerProfileProgress): ProfileTitleDefinition {
  return PROFILE_TITLES.find(item => item.id === profile.selectedTitle) ?? PROFILE_TITLES[0];
}

export function selectedProfileCard(profile: PlayerProfileProgress): ProfileCardDefinition {
  return PROFILE_CARDS.find(item => item.id === profile.selectedCard) ?? PROFILE_CARDS[0];
}

export function selectedProfileAvatar(profile: PlayerProfileProgress): ProfileAvatarDefinition {
  return PROFILE_AVATARS.find(item => item.id === profile.selectedAvatar) ?? PROFILE_AVATARS[0];
}

function persist(profile: PlayerProfileProgress): PlayerProfileProgress {
  profile.updatedAt = Date.now();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)); } catch {}
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PLAYER_PROFILE_EVENT, { detail: profile }));
  return profile;
}

function mutate(mutator: (profile: PlayerProfileProgress) => void): PlayerProfileProgress {
  const profile = loadPlayerProfile();
  mutator(profile);
  return persist(profile);
}

export function recordPlayerProfileProgress(chapter: number, room: number): PlayerProfileProgress {
  return mutate(profile => {
    const nextChapter = Math.max(1, Math.floor(chapter || 1));
    const nextRoom = Math.max(1, Math.floor(room || 1));
    if (nextChapter > profile.stats.highestChapter) {
      profile.stats.highestChapter = nextChapter;
      profile.stats.highestRoom = nextRoom;
    } else if (nextChapter === profile.stats.highestChapter) {
      profile.stats.highestRoom = Math.max(profile.stats.highestRoom, nextRoom);
    }
  });
}

export function beginPlayerProfileRun(chapter = 1, room = 1): PlayerProfileProgress {
  return mutate(profile => {
    profile.stats.runsStarted++;
    if (chapter > profile.stats.highestChapter) {
      profile.stats.highestChapter = chapter;
      profile.stats.highestRoom = room;
    }
  });
}

export function recordPlayerProfileSession(input: { playTimeMs: number; kills: number; damage: number; chapter: number; room: number }): PlayerProfileProgress {
  return mutate(profile => {
    profile.stats.playTimeMs += Math.max(0, Math.floor(input.playTimeMs || 0));
    profile.stats.enemiesDefeated += Math.max(0, Math.floor(input.kills || 0));
    profile.stats.totalDamage += Math.max(0, Math.floor(input.damage || 0));
    const chapter = Math.max(1, Math.floor(input.chapter || 1));
    const room = Math.max(1, Math.floor(input.room || 1));
    if (chapter > profile.stats.highestChapter) {
      profile.stats.highestChapter = chapter;
      profile.stats.highestRoom = room;
    } else if (chapter === profile.stats.highestChapter) {
      profile.stats.highestRoom = Math.max(profile.stats.highestRoom, room);
    }
  });
}

export function recordPlayerProfileRoomClear(chapter: number, room: number, boss: boolean): PlayerProfileProgress {
  return mutate(profile => {
    profile.stats.roomsCleared++;
    if (boss) profile.stats.bossesDefeated++;
    if (chapter > profile.stats.highestChapter) {
      profile.stats.highestChapter = chapter;
      profile.stats.highestRoom = room;
    } else if (chapter === profile.stats.highestChapter) {
      profile.stats.highestRoom = Math.max(profile.stats.highestRoom, room);
    }
  });
}

export function recordPlayerProfileItemFound(count = 1): PlayerProfileProgress {
  return mutate(profile => { profile.stats.itemsFound += Math.max(0, Math.floor(count)); });
}

export function recordPlayerProfileQuestCompleted(count = 1): PlayerProfileProgress {
  return mutate(profile => { profile.stats.questsCompleted += Math.max(0, Math.floor(count)); });
}

export function selectPlayerProfileTitle(id: ProfileTitleId, rank: number): PlayerProfileProgress {
  return mutate(profile => {
    const definition = PROFILE_TITLES.find(item => item.id === id);
    if (definition && cosmeticUnlocked(definition, profile, rank)) profile.selectedTitle = id;
  });
}

export function selectPlayerProfileCard(id: ProfileCardId, rank: number): PlayerProfileProgress {
  return mutate(profile => {
    const definition = PROFILE_CARDS.find(item => item.id === id);
    if (definition && cosmeticUnlocked(definition, profile, rank)) profile.selectedCard = id;
  });
}

export function selectPlayerProfileAvatar(id: ProfileAvatarId, rank: number): PlayerProfileProgress {
  return mutate(profile => {
    const definition = PROFILE_AVATARS.find(item => item.id === id);
    if (definition && cosmeticUnlocked(definition, profile, rank)) profile.selectedAvatar = id;
  });
}
