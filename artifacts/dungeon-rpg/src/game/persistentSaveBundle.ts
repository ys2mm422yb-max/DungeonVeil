const PLAYER_ID_KEY = 'dungeon-veil-player-id';
const CLOUD_REVISION_KEY = 'dungeon-veil-cloud-revision';
const PRE_RESTORE_BACKUP_KEY = 'dungeon-veil-pre-cloud-restore-v1';
const BUNDLE_KEYS = [
  'dungeon-veil-save',
  'dungeon-veil-meta',
  'dungeon-veil-equipment-targeting-v1',
  'dungeon-veil-relics-v1',
  'dungeon-veil-retention-v2',
  'dungeon-veil-weekly-rift-records-v1',
  'dungeon-veil-player-profile-v1',
  'dungeon-veil-weekly-elite-v1',
  'dungeon-veil-seen-unlocks-v1',
  'dungeon-veil-highest-chapter-v1',
  'dungeon-veil-control-settings-v1',
  'dungeon-veil-accessibility-v1',
  'dungeon-veil-language',
] as const;

export type DungeonVeilSaveBundle = {
  version: 1;
  playerId: string;
  updatedAt: string;
  data: Record<string, string>;
};

type JsonRecord = Record<string, unknown>;

function createPlayerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `veil-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function parseBundleValue(bundle: DungeonVeilSaveBundle, key: string): JsonRecord {
  const raw = bundle.data[key];
  if (typeof raw !== 'string') return {};
  try { return record(JSON.parse(raw)); } catch { return {}; }
}

function number(value: unknown): number {
  return Math.max(0, Number(value) || 0);
}

function stringArrayLength(value: unknown): number {
  return Array.isArray(value) ? value.filter(item => typeof item === 'string').length : 0;
}

function equipmentProgressWeight(value: unknown): number {
  return Object.values(record(value)).reduce<number>((total, raw) => {
    if (typeof raw === 'number') return total + Math.max(1, Math.floor(number(raw))) * 2_500;
    const item = record(raw);
    const level = Math.max(1, Math.floor(number(item.level) || 1));
    const copies = Math.floor(number(item.copies));
    return total + level * 2_500 + copies * 300;
  }, 0);
}

function sourceMarkWeight(value: unknown): number {
  return Object.values(record(value)).reduce<number>((total, raw) => total + Math.floor(number(raw)) * 3_000, 0);
}

export function persistentPlayerId(): string {
  try {
    const stored = localStorage.getItem(PLAYER_ID_KEY);
    if (stored) return stored;
    const id = createPlayerId();
    localStorage.setItem(PLAYER_ID_KEY, id);
    return id;
  } catch {
    return createPlayerId();
  }
}

export function cloudRevision(): string {
  try { return localStorage.getItem(CLOUD_REVISION_KEY) ?? ''; } catch { return ''; }
}

export function markCloudRevision(updatedAt: string): void {
  try { localStorage.setItem(CLOUD_REVISION_KEY, updatedAt); } catch {}
}

export function clearCloudRevision(): void {
  try { localStorage.removeItem(CLOUD_REVISION_KEY); } catch {}
}

export function exportSaveBundle(): DungeonVeilSaveBundle {
  const data: Record<string, string> = {};
  for (const key of BUNDLE_KEYS) {
    try {
      const value = localStorage.getItem(key);
      if (value !== null) data[key] = value;
    } catch {}
  }
  return { version: 1, playerId: persistentPlayerId(), updatedAt: new Date().toISOString(), data };
}

export function bundleProgressWeight(bundle: DungeonVeilSaveBundle): number {
  const save = parseBundleValue(bundle, 'dungeon-veil-save');
  const profile = parseBundleValue(bundle, 'dungeon-veil-player-profile-v1');
  const stats = record(profile.stats);
  const meta = parseBundleValue(bundle, 'dungeon-veil-meta');
  const owned = record(meta.owned);
  const targeting = parseBundleValue(bundle, 'dungeon-veil-equipment-targeting-v1');
  const retention = parseBundleValue(bundle, 'dungeon-veil-retention-v2');
  const codex = record(retention.codex);
  const elite = parseBundleValue(bundle, 'dungeon-veil-weekly-elite-v1');
  const relics = parseBundleValue(bundle, 'dungeon-veil-relics-v1');

  let weight = 0;
  if (typeof save.playerName === 'string' && save.playerName.trim()) {
    weight += 1_000_000;
    weight += number(save.chapter) * 100_000 + number(save.floor) * 1_000 + number(save.level) * 100 + number(save.xp);
    weight += number(save.killCount) * 10;
  }
  weight += number(stats.runsStarted) * 20_000;
  weight += number(stats.roomsCleared) * 1_000;
  weight += number(stats.enemiesDefeated) * 20;
  weight += number(stats.bossesDefeated) * 5_000;
  weight += number(stats.totalDamage);
  weight += number(stats.itemsFound) * 2_000;
  weight += number(stats.questsCompleted) * 3_000;
  weight += number(stats.playTimeMs) / 1_000;
  weight += Math.max(0, number(stats.highestChapter) - 1) * 100_000;
  weight += Math.max(0, number(stats.highestRoom) - 1) * 1_000;
  if (profile.selectedTitle && profile.selectedTitle !== 'veil-initiate') weight += 5_000;
  if (profile.selectedCard && profile.selectedCard !== 'ash') weight += 5_000;
  if (profile.selectedAvatar && profile.selectedAvatar !== 'ranger') weight += 5_000;
  weight += Math.max(0, number(meta.rank) - 1) * 50_000;
  // Old Veil Sigils migrate 1:1 into Veil Dust. Both values must carry the same
  // conflict-resolution weight so migration cannot make a save look weaker.
  weight += number(meta.dust) * 100;
  weight += Object.keys(owned).length * 10_000;
  weight += equipmentProgressWeight(owned);
  weight += sourceMarkWeight(targeting.sourceMarks);
  if (typeof targeting.wishItem === 'string' && targeting.wishItem) weight += 2_000;
  weight += number(retention.sigils) * 100;
  weight += stringArrayLength(codex.enemies) * 500 + stringArrayLength(codex.bosses) * 2_000;
  weight += stringArrayLength(codex.hunts) * 1_000 + stringArrayLength(codex.relics) * 3_000;
  weight += number(elite.eliteMarks) * 20_000 + stringArrayLength(elite.ownedRewardIds) * 25_000;
  weight += stringArrayLength(relics.owned) * 8_000;
  return Math.floor(weight);
}

export function bundleActivityTimestamp(bundle: DungeonVeilSaveBundle): number {
  const save = parseBundleValue(bundle, 'dungeon-veil-save');
  const profile = parseBundleValue(bundle, 'dungeon-veil-player-profile-v1');
  const hasProgress = bundleProgressWeight(bundle) > 0;
  if (!hasProgress) return 0;
  return Math.max(number(save.savedAt), number(profile.updatedAt));
}

export function shouldRestoreRemoteBundle(local: DungeonVeilSaveBundle, remote: DungeonVeilSaveBundle): boolean {
  const localWeight = bundleProgressWeight(local);
  const remoteWeight = bundleProgressWeight(remote);
  if (localWeight <= 0) return remoteWeight > 0;
  if (remoteWeight <= 0) return false;

  const localActivity = bundleActivityTimestamp(local);
  const remoteActivity = bundleActivityTimestamp(remote);
  if (remoteActivity > localActivity) return true;
  if (localActivity > remoteActivity) return false;
  return remoteWeight > localWeight;
}

function preserveLocalBeforeRestore(): void {
  const local = exportSaveBundle();
  if (bundleProgressWeight(local) <= 0) return;
  try { localStorage.setItem(PRE_RESTORE_BACKUP_KEY, JSON.stringify(local)); } catch {}
}

export function importSaveBundle(bundle: DungeonVeilSaveBundle): boolean {
  if (!bundle || bundle.version !== 1 || typeof bundle.playerId !== 'string' || !bundle.data) return false;
  try {
    preserveLocalBeforeRestore();
    for (const key of BUNDLE_KEYS) {
      const value = bundle.data[key];
      if (typeof value === 'string') localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    }
    localStorage.setItem(PLAYER_ID_KEY, bundle.playerId);
    markCloudRevision(bundle.updatedAt);
    window.dispatchEvent(new Event('dungeon-veil-cloud-save-restored'));
    return true;
  } catch {
    return false;
  }
}
