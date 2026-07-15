import {
  PLAYER_PROFILE_EVENT,
  PROFILE_AVATARS,
  PROFILE_CARDS,
  PROFILE_TITLES,
  type PlayerProfileProgress,
  type PlayerProfileStats,
  type ProfileAvatarId,
  type ProfileCardId,
  type ProfileTitleId,
} from './playerProfile';

const PROFILE_KEY = 'dungeon-veil-player-profile-v1';
const BACKUP_KEY = 'dungeon-veil-player-profile-backup-v1';
const HEALTH_KEY = 'dungeon-veil-player-profile-health-v1';

export type ProfileStorageStatus = 'ok' | 'repaired' | 'restored' | 'reset';
export type ProfileStorageHealth = {
  status: ProfileStorageStatus;
  checkedAt: number;
  backupAvailable: boolean;
};

const DEFAULT_STATS: PlayerProfileStats = {
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
};

function number(value: unknown, minimum = 0): number {
  return Math.max(minimum, Math.floor(Number(value ?? 0) || 0));
}

function normalize(value: unknown): PlayerProfileProgress {
  const parsed = value && typeof value === 'object' ? value as Partial<PlayerProfileProgress> : {};
  const rawStats = parsed.stats && typeof parsed.stats === 'object' ? parsed.stats as Partial<PlayerProfileStats> : {};
  const selectedTitle = PROFILE_TITLES.some(item => item.id === parsed.selectedTitle) ? parsed.selectedTitle as ProfileTitleId : 'veil-initiate';
  const selectedCard = PROFILE_CARDS.some(item => item.id === parsed.selectedCard) ? parsed.selectedCard as ProfileCardId : 'ash';
  const selectedAvatar = PROFILE_AVATARS.some(item => item.id === parsed.selectedAvatar) ? parsed.selectedAvatar as ProfileAvatarId : 'ranger';
  return {
    version: 1,
    selectedTitle,
    selectedCard,
    selectedAvatar,
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
}

function parse(raw: string | null): PlayerProfileProgress | null {
  if (!raw) return null;
  try { return normalize(JSON.parse(raw)); }
  catch { return null; }
}

function equivalentRaw(raw: string, normalized: PlayerProfileProgress): boolean {
  try { return JSON.stringify(normalize(JSON.parse(raw))) === JSON.stringify(normalized) && JSON.stringify(JSON.parse(raw)) === JSON.stringify(normalized); }
  catch { return false; }
}

function writeHealth(status: ProfileStorageStatus): ProfileStorageHealth {
  const health = { status, checkedAt: Date.now(), backupAvailable: Boolean(parse(localStorage.getItem(BACKUP_KEY))) };
  try { localStorage.setItem(HEALTH_KEY, JSON.stringify(health)); } catch {}
  return health;
}

function saveCurrent(profile: PlayerProfileProgress): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function repairProfileStorage(): ProfileStorageHealth {
  if (typeof localStorage === 'undefined') return { status: 'ok', checkedAt: Date.now(), backupAvailable: false };
  const currentRaw = localStorage.getItem(PROFILE_KEY);
  const current = parse(currentRaw);
  if (current && currentRaw) {
    if (!equivalentRaw(currentRaw, current)) {
      try { localStorage.setItem(BACKUP_KEY, currentRaw); } catch {}
      saveCurrent(current);
      return writeHealth('repaired');
    }
    return writeHealth('ok');
  }

  const backup = parse(localStorage.getItem(BACKUP_KEY));
  if (backup) {
    saveCurrent(backup);
    return writeHealth('restored');
  }

  const reset: PlayerProfileProgress = {
    version: 1,
    selectedTitle: 'veil-initiate',
    selectedCard: 'ash',
    selectedAvatar: 'ranger',
    stats: { ...DEFAULT_STATS },
    updatedAt: Date.now(),
  };
  saveCurrent(reset);
  return writeHealth(currentRaw ? 'reset' : 'ok');
}

export function loadProfileStorageHealth(): ProfileStorageHealth {
  try {
    const parsed = JSON.parse(localStorage.getItem(HEALTH_KEY) ?? '{}') as Partial<ProfileStorageHealth>;
    const status: ProfileStorageStatus = parsed.status === 'repaired' || parsed.status === 'restored' || parsed.status === 'reset' ? parsed.status : 'ok';
    return { status, checkedAt: number(parsed.checkedAt), backupAvailable: Boolean(parse(localStorage.getItem(BACKUP_KEY))) };
  } catch {
    return { status: 'ok', checkedAt: 0, backupAvailable: Boolean(parse(localStorage.getItem(BACKUP_KEY))) };
  }
}

export function restoreProfileStorageBackup(): PlayerProfileProgress | null {
  const backup = parse(localStorage.getItem(BACKUP_KEY));
  if (!backup) return null;
  const current = parse(localStorage.getItem(PROFILE_KEY));
  if (current) localStorage.setItem(BACKUP_KEY, JSON.stringify(current));
  saveCurrent(backup);
  writeHealth('restored');
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(PLAYER_PROFILE_EVENT, { detail: backup }));
  return backup;
}

export function installProfileStorageIntegrity(): void {
  if (typeof window === 'undefined') return;
  repairProfileStorage();
  let previousRaw = localStorage.getItem(PROFILE_KEY);
  window.addEventListener(PLAYER_PROFILE_EVENT, () => {
    const nextRaw = localStorage.getItem(PROFILE_KEY);
    if (previousRaw && parse(previousRaw) && previousRaw !== nextRaw) {
      try { localStorage.setItem(BACKUP_KEY, previousRaw); } catch {}
    }
    previousRaw = nextRaw;
    writeHealth('ok');
  });
}
