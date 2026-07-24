import { MAX_LEVEL_DUPLICATE_DUST } from './equipmentCollection';
import { highestReachedChapter } from './equipmentChapterGates';
import { ACTIVE_EQUIPMENT, ACTIVE_EQUIPMENT_IDS, type ActiveEquipmentId } from './equipmentRedesign';
import {
  EQUIPMENT,
  loadMetaProgression,
  saveMetaProgression,
  type CurrentEquipmentSlot,
  type EquipmentRarity,
  type MetaProgression,
} from './metaProgression';

export const FORGE_MARKS_KEY = 'dungeon-veil-forge-marks-v1';
export const FORGE_MARK_EXCHANGE_COST = 10;
export const FORGE_MARK_MAX_BALANCE = 9_999;
export const FORGE_MARK_EVENT = 'dungeon-veil-forge-marks-changed';

export const FORGE_MARK_DROP_CHANCES = Object.freeze({
  hunt: 0.01,
  intermediateBoss: 0.025,
  chapterBoss: 0.075,
});

export const FORGE_MARK_CATEGORY_WEIGHTS: Readonly<Record<CurrentEquipmentSlot, number>> = Object.freeze({
  bow: 40,
  quiver: 30,
  armor: 30,
});

export const FORGE_MARK_RARITY_WEIGHTS: Readonly<Record<EquipmentRarity, number>> = Object.freeze({
  common: 55,
  rare: 32,
  epic: 13,
});

const LEGACY_TARGETING_KEYS = ['dungeon-veil-equipment-targeting-v2', 'dungeon-veil-equipment-targeting-v1'] as const;
const RECEIPT_LIMIT = 80;
const ROLL_LEDGER_LIMIT = 500;
const EXCHANGE_ID_LIMIT = 120;
let exchangeExecuting = false;

export type ForgeMarkRollSource = keyof typeof FORGE_MARK_DROP_CHANCES;

export type ForgeMarkExchangeReceipt = {
  id: string;
  item: ActiveEquipmentId;
  category: CurrentEquipmentSlot;
  rarity: EquipmentRarity;
  duplicate: boolean;
  convertedDust: number;
  marksAfter: number;
  rewardKey: string;
  createdAt: number;
};

type PendingForgeMarkExchange = Omit<ForgeMarkExchangeReceipt, 'marksAfter'> & {
  marksBefore: number;
};

export type ForgeMarkProfile = {
  version: 1;
  marks: number;
  migratedLegacyMarks: boolean;
  rollLedger: string[];
  exchangeReceipts: ForgeMarkExchangeReceipt[];
  pendingExchange: PendingForgeMarkExchange | null;
};

export type ForgeMarkRollResult = {
  profile: ForgeMarkProfile;
  attempted: boolean;
  granted: boolean;
  source: ForgeMarkRollSource;
};

export type ForgeMarkExchangeResult = {
  profile: ForgeMarkProfile;
  exchanged: boolean;
  replayed: boolean;
  busy: boolean;
  reason: 'ok' | 'busy' | 'invalid-id' | 'insufficient-marks' | 'empty-pool' | 'failed';
  receipt: ForgeMarkExchangeReceipt | null;
};

function integer(value: unknown, maximum = FORGE_MARK_MAX_BALANCE): number {
  return Math.max(0, Math.min(maximum, Math.floor(Number(value) || 0)));
}

function stringLedger(value: unknown, limit: number): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0))].slice(-limit)
    : [];
}

function safeExchangeId(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, EXCHANGE_ID_LIMIT) : '';
}

function validActiveItem(value: unknown): value is ActiveEquipmentId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ACTIVE_EQUIPMENT, value);
}

function normalizeReceipt(value: unknown): ForgeMarkExchangeReceipt | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<ForgeMarkExchangeReceipt>;
  const id = safeExchangeId(raw.id);
  if (!id || !validActiveItem(raw.item)) return null;
  const definition = ACTIVE_EQUIPMENT[raw.item];
  const rewardKey = typeof raw.rewardKey === 'string' && raw.rewardKey
    ? raw.rewardKey.slice(0, 180)
    : `forge-mark-exchange:${id}`;
  return {
    id,
    item: raw.item,
    category: definition.slot,
    rarity: definition.rarity,
    duplicate: Boolean(raw.duplicate),
    convertedDust: integer(raw.convertedDust, 999_999),
    marksAfter: integer(raw.marksAfter),
    rewardKey,
    createdAt: Math.max(0, Math.floor(Number(raw.createdAt) || 0)),
  };
}

function normalizePending(value: unknown): PendingForgeMarkExchange | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<PendingForgeMarkExchange>;
  const receipt = normalizeReceipt({ ...raw, marksAfter: 0 });
  if (!receipt) return null;
  return {
    id: receipt.id,
    item: receipt.item,
    category: receipt.category,
    rarity: receipt.rarity,
    duplicate: receipt.duplicate,
    convertedDust: receipt.convertedDust,
    rewardKey: receipt.rewardKey,
    createdAt: receipt.createdAt,
    marksBefore: integer(raw.marksBefore),
  };
}

function legacySourceMarks(): number {
  if (typeof localStorage === 'undefined') return 0;
  for (const key of LEGACY_TARGETING_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { sourceMarks?: Record<string, unknown> };
      const marks = Object.values(parsed?.sourceMarks ?? {}).reduce((total, value) => total + integer(value), 0);
      return integer(marks);
    } catch {}
  }
  return 0;
}

function defaultProfile(): ForgeMarkProfile {
  return {
    version: 1,
    marks: legacySourceMarks(),
    migratedLegacyMarks: true,
    rollLedger: [],
    exchangeReceipts: [],
    pendingExchange: null,
  };
}

function normalizeProfile(value: unknown): ForgeMarkProfile {
  const raw = value && typeof value === 'object' ? value as Partial<ForgeMarkProfile> : {};
  const receipts = Array.isArray(raw.exchangeReceipts)
    ? raw.exchangeReceipts.map(normalizeReceipt).filter((entry): entry is ForgeMarkExchangeReceipt => Boolean(entry)).slice(-RECEIPT_LIMIT)
    : [];
  return {
    version: 1,
    marks: integer(raw.marks),
    migratedLegacyMarks: raw.migratedLegacyMarks !== false,
    rollLedger: stringLedger(raw.rollLedger, ROLL_LEDGER_LIMIT),
    exchangeReceipts: receipts,
    pendingExchange: normalizePending(raw.pendingExchange),
  };
}

function writeProfile(profile: ForgeMarkProfile, dispatch = true): ForgeMarkProfile {
  const normalized = normalizeProfile(profile);
  localStorage.setItem(FORGE_MARKS_KEY, JSON.stringify(normalized));
  if (dispatch && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(FORGE_MARK_EVENT));
    window.dispatchEvent(new Event('dungeon-veil-meta-changed'));
  }
  return normalized;
}

function finalizePending(profile: ForgeMarkProfile, pending: PendingForgeMarkExchange): ForgeMarkProfile {
  const existing = profile.exchangeReceipts.find(receipt => receipt.id === pending.id);
  if (existing) {
    profile.pendingExchange = null;
    profile.marks = existing.marksAfter;
    return writeProfile(profile, false);
  }
  const marksAfter = Math.max(0, pending.marksBefore - FORGE_MARK_EXCHANGE_COST);
  const receipt: ForgeMarkExchangeReceipt = {
    id: pending.id,
    item: pending.item,
    category: pending.category,
    rarity: pending.rarity,
    duplicate: pending.duplicate,
    convertedDust: pending.convertedDust,
    marksAfter,
    rewardKey: pending.rewardKey,
    createdAt: pending.createdAt,
  };
  profile.marks = marksAfter;
  profile.pendingExchange = null;
  profile.exchangeReceipts = [...profile.exchangeReceipts.filter(entry => entry.id !== receipt.id), receipt].slice(-RECEIPT_LIMIT);
  return writeProfile(profile, false);
}

function recoverPending(profile: ForgeMarkProfile): ForgeMarkProfile {
  const pending = profile.pendingExchange;
  if (!pending) return profile;
  const meta = loadMetaProgression();
  if (meta.rewardLedger.includes(pending.rewardKey)) return finalizePending(profile, pending);
  profile.pendingExchange = null;
  profile.marks = pending.marksBefore;
  return writeProfile(profile, false);
}

export function loadForgeMarks(): ForgeMarkProfile {
  try {
    const raw = localStorage.getItem(FORGE_MARKS_KEY);
    if (!raw) return writeProfile(defaultProfile(), false);
    const normalized = normalizeProfile(JSON.parse(raw));
    const recovered = recoverPending(normalized);
    const serialized = JSON.stringify(recovered);
    if (serialized !== raw) localStorage.setItem(FORGE_MARKS_KEY, serialized);
    return recovered;
  } catch {
    return defaultProfile();
  }
}

export function saveForgeMarks(profile: ForgeMarkProfile): ForgeMarkProfile {
  return writeProfile(profile);
}

export function grantForgeMarks(amount: number, ledgerKey: string): { profile: ForgeMarkProfile; granted: number } {
  const key = safeExchangeId(ledgerKey);
  const requested = integer(amount);
  const profile = loadForgeMarks();
  if (!key || requested <= 0 || profile.rollLedger.includes(key)) return { profile, granted: 0 };
  profile.rollLedger.push(key);
  const before = profile.marks;
  profile.marks = integer(profile.marks + requested);
  return { profile: saveForgeMarks(profile), granted: profile.marks - before };
}

export function rollForgeMarkReward(
  source: ForgeMarkRollSource,
  ledgerKey: string,
  random: () => number = Math.random,
): ForgeMarkRollResult {
  const key = safeExchangeId(ledgerKey);
  const profile = loadForgeMarks();
  if (!key || profile.rollLedger.includes(key)) return { profile, attempted: false, granted: false, source };
  profile.rollLedger.push(key);
  const granted = Math.max(0, Math.min(1, Number(random()) || 0)) < FORGE_MARK_DROP_CHANCES[source];
  if (granted) profile.marks = integer(profile.marks + 1);
  return { profile: saveForgeMarks(profile), attempted: true, granted, source };
}

export function eligibleForgeMarkEquipment(
  meta: MetaProgression = loadMetaProgression(),
  chapter = highestReachedChapter(),
): ActiveEquipmentId[] {
  const safeChapter = Math.max(1, Math.floor(Number(chapter) || 1));
  return ACTIVE_EQUIPMENT_IDS.filter(id => {
    const item = ACTIVE_EQUIPMENT[id];
    return item.unlockRank <= meta.rank && item.unlockChapter <= safeChapter;
  });
}

function weightedPick<T>(entries: readonly T[], weight: (entry: T) => number, random: () => number): T | null {
  const total = entries.reduce((sum, entry) => sum + Math.max(0, weight(entry)), 0);
  if (!entries.length || total <= 0) return null;
  let cursor = Math.max(0, Math.min(0.999999999, Number(random()) || 0)) * total;
  for (const entry of entries) {
    cursor -= Math.max(0, weight(entry));
    if (cursor < 0) return entry;
  }
  return entries[entries.length - 1] ?? null;
}

export function selectForgeMarkEquipment(
  meta: MetaProgression = loadMetaProgression(),
  chapter = highestReachedChapter(),
  random: () => number = Math.random,
): ActiveEquipmentId | null {
  const pool = eligibleForgeMarkEquipment(meta, chapter);
  if (!pool.length) return null;
  const categories = (Object.keys(FORGE_MARK_CATEGORY_WEIGHTS) as CurrentEquipmentSlot[])
    .filter(category => pool.some(id => ACTIVE_EQUIPMENT[id].slot === category));
  const category = weightedPick(categories, entry => FORGE_MARK_CATEGORY_WEIGHTS[entry], random);
  const categoryPool = category ? pool.filter(id => ACTIVE_EQUIPMENT[id].slot === category) : pool;
  return weightedPick(categoryPool.length ? categoryPool : pool, id => FORGE_MARK_RARITY_WEIGHTS[ACTIVE_EQUIPMENT[id].rarity], random);
}

function applyExchangeItem(meta: MetaProgression, pending: PendingForgeMarkExchange): MetaProgression {
  if (meta.rewardLedger.includes(pending.rewardKey)) return meta;
  meta.rewardLedger.push(pending.rewardKey);
  const existing = meta.owned[pending.item];
  if (existing && existing.level >= 5) {
    meta.dust += pending.convertedDust;
  } else if (existing) {
    existing.copies = Math.min(999, existing.copies + 1);
  } else {
    meta.owned[pending.item] = { level: 1, copies: 0 };
  }
  return saveMetaProgression(meta);
}

export function exchangeForgeMarks(
  exchangeId: string,
  random: () => number = Math.random,
): ForgeMarkExchangeResult {
  const id = safeExchangeId(exchangeId);
  let profile = loadForgeMarks();
  if (!id) return { profile, exchanged: false, replayed: false, busy: false, reason: 'invalid-id', receipt: null };
  const existingReceipt = profile.exchangeReceipts.find(receipt => receipt.id === id) ?? null;
  if (existingReceipt) return { profile, exchanged: true, replayed: true, busy: false, reason: 'ok', receipt: existingReceipt };
  if (exchangeExecuting) return { profile, exchanged: false, replayed: false, busy: true, reason: 'busy', receipt: null };
  if (profile.marks < FORGE_MARK_EXCHANGE_COST) return { profile, exchanged: false, replayed: false, busy: false, reason: 'insufficient-marks', receipt: null };

  exchangeExecuting = true;
  try {
    const meta = loadMetaProgression();
    const item = selectForgeMarkEquipment(meta, highestReachedChapter(), random);
    if (!item) return { profile, exchanged: false, replayed: false, busy: false, reason: 'empty-pool', receipt: null };
    const definition = ACTIVE_EQUIPMENT[item];
    const existing = meta.owned[item];
    const pending: PendingForgeMarkExchange = {
      id,
      item,
      category: definition.slot,
      rarity: definition.rarity,
      duplicate: Boolean(existing),
      convertedDust: existing && existing.level >= 5 ? MAX_LEVEL_DUPLICATE_DUST[EQUIPMENT[item].rarity] : 0,
      marksBefore: profile.marks,
      rewardKey: `forge-mark-exchange:${id}`,
      createdAt: Date.now(),
    };

    profile.pendingExchange = pending;
    writeProfile(profile, false);
    applyExchangeItem(meta, pending);
    profile = finalizePending(loadForgeMarks(), pending);
    const receipt = profile.exchangeReceipts.find(entry => entry.id === id) ?? null;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(FORGE_MARK_EVENT));
      window.dispatchEvent(new Event('dungeon-veil-meta-changed'));
    }
    return { profile, exchanged: Boolean(receipt), replayed: false, busy: false, reason: receipt ? 'ok' : 'failed', receipt };
  } catch {
    profile = loadForgeMarks();
    return { profile, exchanged: false, replayed: false, busy: false, reason: 'failed', receipt: null };
  } finally {
    exchangeExecuting = false;
  }
}
