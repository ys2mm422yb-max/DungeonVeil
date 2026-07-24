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
export const FORGE_MARK_DROP_CHANCES = Object.freeze({ hunt: 0.01, intermediateBoss: 0.025, chapterBoss: 0.075 });
export const FORGE_MARK_CATEGORY_WEIGHTS: Readonly<Record<CurrentEquipmentSlot, number>> = Object.freeze({ bow: 40, quiver: 30, armor: 30 });
export const FORGE_MARK_RARITY_WEIGHTS: Readonly<Record<EquipmentRarity, number>> = Object.freeze({ common: 55, rare: 32, epic: 13 });

const LEGACY_KEYS = ['dungeon-veil-equipment-targeting-v2', 'dungeon-veil-equipment-targeting-v1'] as const;
const RECEIPT_LIMIT = 80;
const LEDGER_LIMIT = 500;
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
type PendingExchange = Omit<ForgeMarkExchangeReceipt, 'marksAfter'> & { marksBefore: number };
export type ForgeMarkProfile = {
  version: 1;
  marks: number;
  migratedLegacyMarks: boolean;
  rollLedger: string[];
  exchangeReceipts: ForgeMarkExchangeReceipt[];
  pendingExchange: PendingExchange | null;
};
export type ForgeMarkExchangeResult = {
  profile: ForgeMarkProfile;
  exchanged: boolean;
  replayed: boolean;
  busy: boolean;
  reason: 'ok' | 'busy' | 'invalid-id' | 'insufficient-marks' | 'empty-pool' | 'failed';
  receipt: ForgeMarkExchangeReceipt | null;
};

function integer(value: unknown, max = FORGE_MARK_MAX_BALANCE): number {
  return Math.max(0, Math.min(max, Math.floor(Number(value) || 0)));
}
function id(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 120) : '';
}
function strings(value: unknown, limit: number): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0))].slice(-limit) : [];
}
function activeId(value: unknown): value is ActiveEquipmentId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ACTIVE_EQUIPMENT, value);
}
function legacyMarks(): number {
  if (typeof localStorage === 'undefined') return 0;
  for (const key of LEGACY_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { sourceMarks?: Record<string, unknown> };
      return integer(Object.values(parsed.sourceMarks ?? {}).reduce<number>((sum, value) => sum + integer(value), 0));
    } catch {}
  }
  return 0;
}
function receipt(value: unknown): ForgeMarkExchangeReceipt | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<ForgeMarkExchangeReceipt>;
  const exchangeId = id(raw.id);
  if (!exchangeId || !activeId(raw.item)) return null;
  const definition = ACTIVE_EQUIPMENT[raw.item];
  return {
    id: exchangeId,
    item: raw.item,
    category: definition.slot,
    rarity: definition.rarity,
    duplicate: Boolean(raw.duplicate),
    convertedDust: integer(raw.convertedDust, 999_999),
    marksAfter: integer(raw.marksAfter),
    rewardKey: typeof raw.rewardKey === 'string' && raw.rewardKey ? raw.rewardKey.slice(0, 180) : `forge-mark-exchange:${exchangeId}`,
    createdAt: Math.max(0, Math.floor(Number(raw.createdAt) || 0)),
  };
}
function pending(value: unknown): PendingExchange | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<PendingExchange>;
  const base = receipt({ ...raw, marksAfter: 0 });
  return base ? { ...base, marksBefore: integer(raw.marksBefore) } : null;
}
function normalize(value: unknown): ForgeMarkProfile {
  const raw = value && typeof value === 'object' ? value as Partial<ForgeMarkProfile> : {};
  const receipts = Array.isArray(raw.exchangeReceipts)
    ? raw.exchangeReceipts.map(receipt).filter((entry): entry is ForgeMarkExchangeReceipt => entry !== null).slice(-RECEIPT_LIMIT)
    : [];
  return {
    version: 1,
    marks: integer(raw.marks),
    migratedLegacyMarks: raw.migratedLegacyMarks !== false,
    rollLedger: strings(raw.rollLedger, LEDGER_LIMIT),
    exchangeReceipts: receipts,
    pendingExchange: pending(raw.pendingExchange),
  };
}
function write(profile: ForgeMarkProfile, dispatch = true): ForgeMarkProfile {
  const saved = normalize(profile);
  localStorage.setItem(FORGE_MARKS_KEY, JSON.stringify(saved));
  if (dispatch && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(FORGE_MARK_EVENT));
    window.dispatchEvent(new Event('dungeon-veil-meta-changed'));
  }
  return saved;
}
function finalize(profile: ForgeMarkProfile, transaction: PendingExchange): ForgeMarkProfile {
  const existing = profile.exchangeReceipts.find(entry => entry.id === transaction.id);
  if (existing) return write({ ...profile, marks: existing.marksAfter, pendingExchange: null }, false);
  const completed: ForgeMarkExchangeReceipt = { ...transaction, marksAfter: Math.max(0, transaction.marksBefore - FORGE_MARK_EXCHANGE_COST) };
  return write({
    ...profile,
    marks: completed.marksAfter,
    pendingExchange: null,
    exchangeReceipts: [...profile.exchangeReceipts.filter(entry => entry.id !== completed.id), completed].slice(-RECEIPT_LIMIT),
  }, false);
}
function recover(profile: ForgeMarkProfile): ForgeMarkProfile {
  const transaction = profile.pendingExchange;
  if (!transaction) return profile;
  const meta = loadMetaProgression();
  return meta.rewardLedger.includes(transaction.rewardKey)
    ? finalize(profile, transaction)
    : write({ ...profile, marks: transaction.marksBefore, pendingExchange: null }, false);
}

export function loadForgeMarks(): ForgeMarkProfile {
  try {
    const raw = localStorage.getItem(FORGE_MARKS_KEY);
    if (!raw) return write({ version: 1, marks: legacyMarks(), migratedLegacyMarks: true, rollLedger: [], exchangeReceipts: [], pendingExchange: null }, false);
    return recover(normalize(JSON.parse(raw)));
  } catch {
    return { version: 1, marks: legacyMarks(), migratedLegacyMarks: true, rollLedger: [], exchangeReceipts: [], pendingExchange: null };
  }
}
export function saveForgeMarks(profile: ForgeMarkProfile): ForgeMarkProfile { return write(profile); }
export function grantForgeMarks(amount: number, ledgerKey: string): { profile: ForgeMarkProfile; granted: number } {
  const key = id(ledgerKey);
  const profile = loadForgeMarks();
  const requested = integer(amount);
  if (!key || requested <= 0 || profile.rollLedger.includes(key)) return { profile, granted: 0 };
  const before = profile.marks;
  profile.rollLedger.push(key);
  profile.marks = integer(profile.marks + requested);
  return { profile: saveForgeMarks(profile), granted: profile.marks - before };
}
export function rollForgeMarkReward(source: ForgeMarkRollSource, ledgerKey: string, random: () => number = Math.random) {
  const key = id(ledgerKey);
  const profile = loadForgeMarks();
  if (!key || profile.rollLedger.includes(key)) return { profile, attempted: false, granted: false, source };
  profile.rollLedger.push(key);
  const granted = Math.max(0, Math.min(1, Number(random()) || 0)) < FORGE_MARK_DROP_CHANCES[source];
  if (granted) profile.marks = integer(profile.marks + 1);
  return { profile: saveForgeMarks(profile), attempted: true, granted, source };
}
export function eligibleForgeMarkEquipment(meta: MetaProgression = loadMetaProgression(), chapter = highestReachedChapter()): ActiveEquipmentId[] {
  const safeChapter = Math.max(1, Math.floor(Number(chapter) || 1));
  return ACTIVE_EQUIPMENT_IDS.filter(itemId => ACTIVE_EQUIPMENT[itemId].unlockRank <= meta.rank && ACTIVE_EQUIPMENT[itemId].unlockChapter <= safeChapter);
}
function weightedPick<T>(entries: readonly T[], weight: (entry: T) => number, random: () => number): T | null {
  const total = entries.reduce<number>((sum, entry) => sum + Math.max(0, weight(entry)), 0);
  if (!entries.length || total <= 0) return null;
  let cursor = Math.max(0, Math.min(0.999999999, Number(random()) || 0)) * total;
  for (const entry of entries) {
    cursor -= Math.max(0, weight(entry));
    if (cursor < 0) return entry;
  }
  return entries.at(-1) ?? null;
}
export function selectForgeMarkEquipment(meta: MetaProgression = loadMetaProgression(), chapter = highestReachedChapter(), random: () => number = Math.random): ActiveEquipmentId | null {
  const pool = eligibleForgeMarkEquipment(meta, chapter);
  const categories = (Object.keys(FORGE_MARK_CATEGORY_WEIGHTS) as CurrentEquipmentSlot[]).filter(category => pool.some(itemId => ACTIVE_EQUIPMENT[itemId].slot === category));
  const category = weightedPick(categories, entry => FORGE_MARK_CATEGORY_WEIGHTS[entry], random);
  const categoryPool = category ? pool.filter(itemId => ACTIVE_EQUIPMENT[itemId].slot === category) : pool;
  return weightedPick(categoryPool, itemId => FORGE_MARK_RARITY_WEIGHTS[ACTIVE_EQUIPMENT[itemId].rarity], random);
}
function applyItem(meta: MetaProgression, transaction: PendingExchange): MetaProgression {
  if (meta.rewardLedger.includes(transaction.rewardKey)) return meta;
  meta.rewardLedger.push(transaction.rewardKey);
  const existing = meta.owned[transaction.item];
  if (existing?.level === 5) meta.dust += transaction.convertedDust;
  else if (existing) existing.copies = Math.min(999, existing.copies + 1);
  else meta.owned[transaction.item] = { level: 1, copies: 0 };
  return saveMetaProgression(meta);
}
export function exchangeForgeMarks(exchangeId: string, random: () => number = Math.random): ForgeMarkExchangeResult {
  const safeId = id(exchangeId);
  let profile = loadForgeMarks();
  if (!safeId) return { profile, exchanged: false, replayed: false, busy: false, reason: 'invalid-id', receipt: null };
  const replay = profile.exchangeReceipts.find(entry => entry.id === safeId) ?? null;
  if (replay) return { profile, exchanged: true, replayed: true, busy: false, reason: 'ok', receipt: replay };
  if (exchangeExecuting) return { profile, exchanged: false, replayed: false, busy: true, reason: 'busy', receipt: null };
  if (profile.marks < FORGE_MARK_EXCHANGE_COST) return { profile, exchanged: false, replayed: false, busy: false, reason: 'insufficient-marks', receipt: null };
  exchangeExecuting = true;
  try {
    const meta = loadMetaProgression();
    const item = selectForgeMarkEquipment(meta, highestReachedChapter(), random);
    if (!item) return { profile, exchanged: false, replayed: false, busy: false, reason: 'empty-pool', receipt: null };
    const definition = ACTIVE_EQUIPMENT[item];
    const existing = meta.owned[item];
    const transaction: PendingExchange = {
      id: safeId,
      item,
      category: definition.slot,
      rarity: definition.rarity,
      duplicate: Boolean(existing),
      convertedDust: existing?.level === 5 ? MAX_LEVEL_DUPLICATE_DUST[EQUIPMENT[item].rarity] : 0,
      marksBefore: profile.marks,
      rewardKey: `forge-mark-exchange:${safeId}`,
      createdAt: Date.now(),
    };
    write({ ...profile, pendingExchange: transaction }, false);
    applyItem(meta, transaction);
    profile = finalize(loadForgeMarks(), transaction);
    const completed = profile.exchangeReceipts.find(entry => entry.id === safeId) ?? null;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(FORGE_MARK_EVENT));
      window.dispatchEvent(new Event('dungeon-veil-meta-changed'));
    }
    return { profile, exchanged: completed !== null, replayed: false, busy: false, reason: completed ? 'ok' : 'failed', receipt: completed };
  } catch {
    return { profile: loadForgeMarks(), exchanged: false, replayed: false, busy: false, reason: 'failed', receipt: null };
  } finally {
    exchangeExecuting = false;
  }
}
