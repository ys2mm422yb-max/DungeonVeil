import { EQUIPMENT } from './equipmentDefinitionsV4';
import { ACTIVE_EQUIPMENT, isActiveEquipmentId, legacyReplacementFor, type ActiveEquipmentId } from './equipmentRedesign';
import type { EquipmentId, EquipmentProgress, MetaProgression } from './metaProgressionTypes';

const RECEIPT_KEY = 'dungeon-veil-equipment-redesign-v1';
const LEGACY_COSTS = {
  1: { gold: 2000, copies: 1, dust: 75 },
  2: { gold: 6000, copies: 2, dust: 250 },
  3: { gold: 15000, copies: 3, dust: 700 },
  4: { gold: 35000, copies: 5, dust: 1800 },
} as const;

function safeNumber(value: unknown) { return Math.max(0, Number(value ?? 0) || 0); }
function isEquipmentId(value: unknown): value is EquipmentId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(EQUIPMENT, value);
}
function safeProgress(value: unknown): EquipmentProgress | null {
  if (typeof value === 'number' && value > 0) return { level: Math.max(1, Math.min(5, Math.floor(value))), copies: 0 };
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<EquipmentProgress>;
  const level = Math.floor(safeNumber(raw.level));
  if (level <= 0) return null;
  return { level: Math.max(1, Math.min(5, level)), copies: Math.min(999, Math.floor(safeNumber(raw.copies))) };
}
function invested(level: number) {
  let gold = 0; let dust = 0; let copies = 0;
  for (let current = 1; current < Math.max(1, Math.min(5, level)); current++) {
    const cost = LEGACY_COSTS[current as keyof typeof LEGACY_COSTS];
    gold += cost.gold; dust += cost.dust; copies += cost.copies;
  }
  return { gold, dust, copies };
}
function mergeProgress(target: EquipmentProgress | undefined, source: EquipmentProgress, extraCopies = 0): EquipmentProgress {
  return { level: Math.max(target?.level ?? 1, source.level), copies: Math.min(999, (target?.copies ?? 0) + source.copies + extraCopies) };
}
function replacementForSlot(parsed: any, slot: 'bow' | 'quiver' | 'armor', fallback: ActiveEquipmentId): ActiveEquipmentId {
  const raw = parsed?.equipped?.[slot];
  if (!isEquipmentId(raw)) return fallback;
  const replacement = legacyReplacementFor(raw);
  return ACTIVE_EQUIPMENT[replacement].slot === slot ? replacement : fallback;
}

export function migrateLegacyMetaToV4(parsed: any): MetaProgression {
  const owned: MetaProgression['owned'] = {};
  const cosmetics = new Set<EquipmentId>();
  let refundGold = 0; let refundDust = 0; let refundCopies = 0;
  const rawOwned = parsed?.owned && typeof parsed.owned === 'object' ? parsed.owned as Record<string, unknown> : {};

  for (const [rawId, rawProgress] of Object.entries(rawOwned)) {
    if (!isEquipmentId(rawId)) continue;
    const progress = safeProgress(rawProgress);
    if (!progress) continue;
    cosmetics.add(rawId);
    const replacement = legacyReplacementFor(rawId);
    const legacyRefund = isActiveEquipmentId(rawId) ? { gold: 0, dust: 0, copies: 0 } : invested(progress.level);
    owned[replacement] = mergeProgress(owned[replacement], progress, legacyRefund.copies);
    refundGold += legacyRefund.gold;
    refundDust += legacyRefund.dust;
    refundCopies += legacyRefund.copies;
  }

  owned['ash-bow'] ??= { level: 1, copies: 0 };
  owned['ranger-quiver'] ??= { level: 1, copies: 0 };
  owned['ranger-cloak'] ??= { level: 1, copies: 0 };

  const migrated: MetaProgression = {
    version: 4,
    rank: Math.max(1, Math.floor(safeNumber(parsed?.rank) || 1)),
    xp: safeNumber(parsed?.xp),
    dust: safeNumber(parsed?.dust) + refundDust,
    gold: safeNumber(parsed?.gold) + refundGold,
    owned,
    equipped: {
      bow: replacementForSlot(parsed, 'bow', 'ash-bow'),
      quiver: replacementForSlot(parsed, 'quiver', 'ranger-quiver'),
      talisman: isEquipmentId(parsed?.equipped?.talisman) ? parsed.equipped.talisman : 'veil-key',
      armor: replacementForSlot(parsed, 'armor', 'ranger-cloak'),
    },
    cosmeticUnlocks: [...cosmetics],
    migrationCompensation: { gold: refundGold, dust: refundDust, copies: refundCopies },
    rewardLedger: Array.isArray(parsed?.rewardLedger) ? parsed.rewardLedger.filter((key: unknown): key is string => typeof key === 'string').slice(-300) : [],
    currentRunId: typeof parsed?.currentRunId === 'string' ? parsed.currentRunId : '',
  };
  try {
    localStorage.setItem(RECEIPT_KEY, JSON.stringify({ version: 1, completedAt: Date.now(), cosmeticUnlocks: migrated.cosmeticUnlocks, compensation: migrated.migrationCompensation }));
  } catch {}
  return migrated;
}

export function normalizeProgress(value: unknown) { return safeProgress(value); }
export function numericProgressValue(value: unknown) { return safeNumber(value); }
export function knownEquipmentId(value: unknown): value is EquipmentId { return isEquipmentId(value); }
