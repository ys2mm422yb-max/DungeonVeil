import { equipmentUnlockedForCurrentProgress } from './equipmentChapterGates';
import {
  EQUIPMENT,
  collectMetaEquipmentDrop,
  loadMetaProgression,
  type EquipmentDropSource,
  type EquipmentId,
  type MetaProgression,
} from './metaProgression';

const TARGETING_KEY = 'dungeon-veil-equipment-targeting-v1';
export const EQUIPMENT_SOURCE_MARK_COST = 3;
export const SOURCE_WISH_CHANCE = 0.35;
export const CHAPTER_WISH_CHANCE = 0.5;
export const WISH_PITY_MISSES = 2;

export const EQUIPMENT_DROP_SOURCES: readonly EquipmentDropSource[] = ['forge', 'hunt', 'warden', 'ritual', 'depth'];

export type EquipmentTargetingProfile = {
  version: 1;
  wishItem: EquipmentId | null;
  sourceMarks: Record<EquipmentDropSource, number>;
  chapterWishMisses: number;
  sourceWishMisses: Record<EquipmentDropSource, number>;
  huntMarkLedger: string[];
  huntWishLedger: string[];
};

function emptySourceRecord(): Record<EquipmentDropSource, number> {
  return { forge: 0, hunt: 0, warden: 0, ritual: 0, depth: 0 };
}

const DEFAULT_TARGETING: EquipmentTargetingProfile = {
  version: 1,
  wishItem: null,
  sourceMarks: emptySourceRecord(),
  chapterWishMisses: 0,
  sourceWishMisses: emptySourceRecord(),
  huntMarkLedger: [],
  huntWishLedger: [],
};

function safeNumber(value: unknown): number {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function isEquipmentId(value: unknown): value is EquipmentId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(EQUIPMENT, value);
}

function sourceRecord(value: unknown): Record<EquipmentDropSource, number> {
  const raw = value && typeof value === 'object' ? value as Partial<Record<EquipmentDropSource, unknown>> : {};
  return Object.fromEntries(EQUIPMENT_DROP_SOURCES.map(source => [source, safeNumber(raw[source])])) as Record<EquipmentDropSource, number>;
}

function stringLedger(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((key): key is string => typeof key === 'string'))].slice(-80) : [];
}

export function equipmentCanBeTargeted(id: EquipmentId, meta: MetaProgression = loadMetaProgression()): boolean {
  const item = EQUIPMENT[id];
  const level = meta.owned[id]?.level ?? 0;
  return item.unlockRank <= meta.rank && equipmentUnlockedForCurrentProgress(id) && level < 5;
}

export function loadEquipmentTargeting(): EquipmentTargetingProfile {
  try {
    const raw = localStorage.getItem(TARGETING_KEY);
    if (!raw) return structuredClone(DEFAULT_TARGETING);
    const parsed = JSON.parse(raw) as Partial<EquipmentTargetingProfile>;
    const meta = loadMetaProgression();
    const wishItem = isEquipmentId(parsed.wishItem) && equipmentCanBeTargeted(parsed.wishItem, meta) ? parsed.wishItem : null;
    return {
      version: 1,
      wishItem,
      sourceMarks: sourceRecord(parsed.sourceMarks),
      chapterWishMisses: safeNumber(parsed.chapterWishMisses),
      sourceWishMisses: sourceRecord(parsed.sourceWishMisses),
      huntMarkLedger: stringLedger(parsed.huntMarkLedger),
      huntWishLedger: stringLedger(parsed.huntWishLedger),
    };
  } catch {
    return structuredClone(DEFAULT_TARGETING);
  }
}

export function saveEquipmentTargeting(profile: EquipmentTargetingProfile): EquipmentTargetingProfile {
  const normalized: EquipmentTargetingProfile = {
    version: 1,
    wishItem: profile.wishItem,
    sourceMarks: sourceRecord(profile.sourceMarks),
    chapterWishMisses: safeNumber(profile.chapterWishMisses),
    sourceWishMisses: sourceRecord(profile.sourceWishMisses),
    huntMarkLedger: stringLedger(profile.huntMarkLedger),
    huntWishLedger: stringLedger(profile.huntWishLedger),
  };
  localStorage.setItem(TARGETING_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event('dungeon-veil-equipment-targeting-changed'));
  window.dispatchEvent(new Event('dungeon-veil-meta-changed'));
  return normalized;
}

export function setEquipmentWishItem(id: EquipmentId | null): EquipmentTargetingProfile {
  const profile = loadEquipmentTargeting();
  if (id !== null && !equipmentCanBeTargeted(id)) return profile;
  profile.wishItem = id;
  profile.chapterWishMisses = 0;
  profile.sourceWishMisses = emptySourceRecord();
  return saveEquipmentTargeting(profile);
}

export function clearEquipmentWishItemIfMatches(id: EquipmentId): EquipmentTargetingProfile {
  const profile = loadEquipmentTargeting();
  if (profile.wishItem !== id) return profile;
  profile.wishItem = null;
  profile.chapterWishMisses = 0;
  profile.sourceWishMisses = emptySourceRecord();
  return saveEquipmentTargeting(profile);
}

export function grantEquipmentSourceMark(source: EquipmentDropSource, amount = 1): EquipmentTargetingProfile {
  const profile = loadEquipmentTargeting();
  profile.sourceMarks[source] += safeNumber(amount);
  return saveEquipmentTargeting(profile);
}

export function grantHuntEquipmentSourceMark(chapter: number): { profile: EquipmentTargetingProfile; granted: boolean } {
  const meta = loadMetaProgression();
  const profile = loadEquipmentTargeting();
  const runId = meta.currentRunId;
  if (!runId) return { profile, granted: false };
  const key = `${runId}:${Math.max(1, Math.floor(Number(chapter) || 1))}:hunt`;
  if (profile.huntMarkLedger.includes(key)) return { profile, granted: false };
  profile.huntMarkLedger.push(key);
  profile.sourceMarks.hunt += 1;
  return { profile: saveEquipmentTargeting(profile), granted: true };
}

export function craftEquipmentCopy(id: EquipmentId): {
  profile: EquipmentTargetingProfile;
  crafted: boolean;
  newUnlock: boolean;
  copies: number;
} {
  const meta = loadMetaProgression();
  const profile = loadEquipmentTargeting();
  const source = EQUIPMENT[id].dropSource;
  if (!equipmentCanBeTargeted(id, meta) || profile.sourceMarks[source] < EQUIPMENT_SOURCE_MARK_COST) {
    return { profile, crafted: false, newUnlock: false, copies: meta.owned[id]?.copies ?? 0 };
  }
  profile.sourceMarks[source] -= EQUIPMENT_SOURCE_MARK_COST;
  saveEquipmentTargeting(profile);
  const result = collectMetaEquipmentDrop(id);
  return {
    profile: loadEquipmentTargeting(),
    crafted: true,
    newUnlock: !result.duplicate,
    copies: result.progress.copies,
  };
}
