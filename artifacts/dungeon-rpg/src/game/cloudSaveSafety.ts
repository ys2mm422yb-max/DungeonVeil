import {
  bundleActivityTimestamp,
  bundleProgressWeight,
  type DungeonVeilSaveBundle,
} from './persistentSaveBundle';

type JsonRecord = Record<string, unknown>;

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

function hasRecordEntries(value: unknown): boolean {
  return Object.keys(record(value)).length > 0;
}

export function bundleHasCoreProgress(bundle: DungeonVeilSaveBundle): boolean {
  const save = parseBundleValue(bundle, 'dungeon-veil-save');
  const meta = parseBundleValue(bundle, 'dungeon-veil-meta');
  const hasRunSave = Object.keys(save).length > 0 && (
    (typeof save.playerName === 'string' && save.playerName.trim().length > 0)
    || number(save.savedAt) > 0
    || number(save.chapter) > 0
    || number(save.floor) > 0
  );
  const hasMetaProgress = Object.keys(meta).length > 0 && (
    number(meta.rank) > 0
    || number(meta.dust) > 0
    || hasRecordEntries(meta.owned)
    || hasRecordEntries(meta.equipped)
  );
  return hasRunSave || hasMetaProgress;
}

export function shouldRestoreRemoteBundleSafely(
  local: DungeonVeilSaveBundle,
  remote: DungeonVeilSaveBundle,
): boolean {
  const localHasCore = bundleHasCoreProgress(local);
  const remoteHasCore = bundleHasCoreProgress(remote);
  if (localHasCore !== remoteHasCore) return remoteHasCore;

  const localWeight = Math.max(bundleProgressWeight(local), number(local.progressWeight));
  const remoteWeight = Math.max(bundleProgressWeight(remote), number(remote.progressWeight));
  if (localWeight <= 0) return remoteWeight > 0;
  if (remoteWeight <= 0) return false;

  // A fresh device can create a newer profile timestamp without having any real
  // run or inventory progress. Never let a timestamp alone replace a save that
  // contains several times more permanent progress.
  if (localWeight > remoteWeight * 4) return false;
  if (remoteWeight > localWeight * 4) return true;

  const localActivity = bundleActivityTimestamp(local);
  const remoteActivity = bundleActivityTimestamp(remote);
  if (remoteActivity > localActivity) return true;
  if (localActivity > remoteActivity) return false;
  if (remoteWeight !== localWeight) return remoteWeight > localWeight;

  const remoteUpdatedAt = Date.parse(remote.updatedAt);
  const localUpdatedAt = Date.parse(local.updatedAt);
  if (!Number.isFinite(remoteUpdatedAt)) return false;
  if (!Number.isFinite(localUpdatedAt)) return true;
  return remoteUpdatedAt > localUpdatedAt;
}

export function recoveryBundleForThinRemote(
  local: DungeonVeilSaveBundle,
  remote: DungeonVeilSaveBundle,
): DungeonVeilSaveBundle {
  if (!bundleHasCoreProgress(local) || bundleHasCoreProgress(remote)) return local;
  const now = Date.now();
  return {
    ...local,
    updatedAt: new Date(now).toISOString(),
    activityAt: Math.max(number(local.activityAt), now),
    progressWeight: Math.max(number(local.progressWeight), bundleProgressWeight(local)),
  };
}
