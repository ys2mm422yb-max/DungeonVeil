import { equipmentUnlockedForCurrentProgress } from './equipmentChapterGates';
import { collectBalancedEquipmentDrop } from './equipmentCollection';
import { ACTIVE_EQUIPMENT, isActiveEquipmentId } from './equipmentRedesign';
import {
  EQUIPMENT,
  loadMetaProgression,
  type EquipmentDropSource,
  type EquipmentId,
  type MetaProgression,
} from './metaProgression';

const TARGETING_KEY = 'dungeon-veil-equipment-targeting-v2';
export const EQUIPMENT_SOURCE_MARK_COST = 8;
export const SOURCE_WISH_CHANCE = 0.18;
export const CHAPTER_WISH_CHANCE = 0.24;
export const WISH_PITY_MISSES = 7;
export const CHAPTER_WISH_PITY_MISSES = 9;

export const EQUIPMENT_DROP_SOURCES: readonly EquipmentDropSource[] = ['forge', 'hunt', 'warden', 'ritual', 'depth'];

export type EquipmentTargetingProfile = {
  version: 2;
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
  version: 2,
  wishItem: null,
  sourceMarks: emptySourceRecord(),
  chapterWishMisses: 0,
  sourceWishMisses: emptySourceRecord(),
  huntMarkLedger: [],
  huntWishLedger: [],
};

function safeNumber(value: unknown): number {
  return Math.max(0, Math.min(999, Math.floor(Number(value) || 0)));
}

function isTargetableEquipmentId(value: unknown): value is EquipmentId {
  return isActiveEquipmentId(value) && Object.prototype.hasOwnProperty.call(EQUIPMENT, value);
}

function sourceRecord(value: unknown): Record<EquipmentDropSource, number> {
  const raw = value && typeof value === 'object' ? value as Partial<Record<EquipmentDropSource, unknown>> : {};
  return Object.fromEntries(EQUIPMENT_DROP_SOURCES.map(source => [source, safeNumber(raw[source])])) as Record<EquipmentDropSource, number>;
}

function stringLedger(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((key): key is string => typeof key === 'string'))].slice(-120) : [];
}

export function equipmentSourceMarkCost(id: EquipmentId): number {
  if (!isActiveEquipmentId(id)) return Number.POSITIVE_INFINITY;
  const rarity = ACTIVE_EQUIPMENT[id].rarity;
  return rarity === 'common' ? 8 : rarity === 'rare' ? 11 : 15;
}

export function equipmentCanBeTargeted(id: EquipmentId, meta: MetaProgression = loadMetaProgression()): boolean {
  if (!isActiveEquipmentId(id)) return false;
  const item = ACTIVE_EQUIPMENT[id];
  const level = meta.owned[id]?.level ?? 0;
  return item.unlockRank <= meta.rank && equipmentUnlockedForCurrentProgress(id) && level < 5;
}

export function loadEquipmentTargeting(): EquipmentTargetingProfile {
  try {
    const raw = localStorage.getItem(TARGETING_KEY) ?? localStorage.getItem('dungeon-veil-equipment-targeting-v1');
    if (!raw) return structuredClone(DEFAULT_TARGETING);
    const parsed = JSON.parse(raw) as Partial<EquipmentTargetingProfile>;
    const meta = loadMetaProgression();
    const wishItem = isTargetableEquipmentId(parsed.wishItem) && equipmentCanBeTargeted(parsed.wishItem, meta) ? parsed.wishItem : null;
    const normalized: EquipmentTargetingProfile = {
      version: 2,
      wishItem,
      sourceMarks: sourceRecord(parsed.sourceMarks),
      chapterWishMisses: Math.min(CHAPTER_WISH_PITY_MISSES, safeNumber(parsed.chapterWishMisses)),
      sourceWishMisses: sourceRecord(parsed.sourceWishMisses),
      huntMarkLedger: stringLedger(parsed.huntMarkLedger),
      huntWishLedger: stringLedger(parsed.huntWishLedger),
    };
    if (parsed.version !== 2) saveEquipmentTargeting(normalized);
    return normalized;
  } catch {
    return structuredClone(DEFAULT_TARGETING);
  }
}

export function saveEquipmentTargeting(profile: EquipmentTargetingProfile): EquipmentTargetingProfile {
  const normalized: EquipmentTargetingProfile = {
    version: 2,
    wishItem: isTargetableEquipmentId(profile.wishItem) ? profile.wishItem : null,
    sourceMarks: sourceRecord(profile.sourceMarks),
    chapterWishMisses: Math.min(CHAPTER_WISH_PITY_MISSES, safeNumber(profile.chapterWishMisses)),
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
  const safeChapter = Math.max(1, Math.floor(Number(chapter) || 1));
  const key = `${runId}:${safeChapter}:hunt`;
  if (profile.huntMarkLedger.includes(key)) return { profile, granted: false };
  profile.huntMarkLedger.push(key);
  if (safeChapter % 2 === 0) profile.sourceMarks.hunt += 1;
  return { profile: saveEquipmentTargeting(profile), granted: safeChapter % 2 === 0 };
}

export function craftEquipmentCopy(id: EquipmentId) {
  const meta = loadMetaProgression();
  const profile = loadEquipmentTargeting();
  if (!isActiveEquipmentId(id)) return { profile, crafted: false, newUnlock: false, copies: 0, convertedDust: 0 };
  const source = ACTIVE_EQUIPMENT[id].dropSource;
  const cost = equipmentSourceMarkCost(id);
  if (!equipmentCanBeTargeted(id, meta) || profile.sourceMarks[source] < cost) {
    return { profile, crafted: false, newUnlock: false, copies: meta.owned[id]?.copies ?? 0, convertedDust: 0 };
  }
  profile.sourceMarks[source] -= cost;
  saveEquipmentTargeting(profile);
  const result = collectBalancedEquipmentDrop(id);
  return { profile: loadEquipmentTargeting(), crafted: true, newUnlock: !result.duplicate, copies: result.progress.copies, convertedDust: result.convertedDust };
}
