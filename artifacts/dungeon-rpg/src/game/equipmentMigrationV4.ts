import {
  loadMetaProgression,
  saveMetaProgression,
  type EquipmentId,
  type EquipmentProgress,
  type MetaProgression,
} from './metaProgression';
import {
  ACTIVE_EQUIPMENT,
  ACTIVE_EQUIPMENT_IDS,
  isActiveEquipmentId,
  legacyReplacementFor,
  type ActiveEquipmentId,
} from './equipmentRedesign';

const MIGRATION_KEY = 'dungeon-veil-equipment-redesign-v1';

const LEGACY_UPGRADE_COSTS = {
  1: { gold: 2000, copies: 1, dust: 75 },
  2: { gold: 6000, copies: 2, dust: 250 },
  3: { gold: 15000, copies: 3, dust: 700 },
  4: { gold: 35000, copies: 5, dust: 1800 },
} as const;

export type EquipmentMigrationReceipt = {
  version: 1;
  completedAt: number;
  cosmeticUnlocks: EquipmentId[];
  replacementByLegacyId: Partial<Record<EquipmentId, ActiveEquipmentId>>;
  compensation: { gold: number; dust: number; copies: number };
};

function investedResources(level: number) {
  let gold = 0;
  let dust = 0;
  let copies = 0;
  const safeLevel = Math.max(1, Math.min(5, Math.floor(Number(level) || 1)));
  for (let current = 1; current < safeLevel; current++) {
    const cost = LEGACY_UPGRADE_COSTS[current as keyof typeof LEGACY_UPGRADE_COSTS];
    gold += cost.gold;
    dust += cost.dust;
    copies += cost.copies;
  }
  return { gold, dust, copies };
}

function readReceipt(): EquipmentMigrationReceipt | null {
  try {
    const raw = localStorage.getItem(MIGRATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EquipmentMigrationReceipt>;
    if (parsed.version !== 1) return null;
    return parsed as EquipmentMigrationReceipt;
  } catch {
    return null;
  }
}

function writeReceipt(receipt: EquipmentMigrationReceipt) {
  localStorage.setItem(MIGRATION_KEY, JSON.stringify(receipt));
  window.dispatchEvent(new Event('dungeon-veil-equipment-migration-complete'));
  return receipt;
}

function mergeProgress(target: EquipmentProgress | undefined, source: EquipmentProgress, extraCopies: number): EquipmentProgress {
  return {
    level: Math.max(target?.level ?? 1, Math.max(1, Math.min(5, source.level))),
    copies: Math.min(999, (target?.copies ?? 0) + Math.max(0, source.copies) + Math.max(0, extraCopies)),
  };
}

function activeEquippedItem(meta: MetaProgression, slot: 'bow' | 'quiver' | 'armor', fallback: ActiveEquipmentId): ActiveEquipmentId {
  const current = meta.equipped[slot];
  if (!current) return fallback;
  const replacement = legacyReplacementFor(current);
  return ACTIVE_EQUIPMENT[replacement].slot === slot ? replacement : fallback;
}

export function ensureEquipmentRedesignMigration(): { meta: MetaProgression; receipt: EquipmentMigrationReceipt } {
  const existingReceipt = readReceipt();
  if (existingReceipt) return { meta: loadMetaProgression(), receipt: existingReceipt };

  const meta = loadMetaProgression();
  const originalOwned = structuredClone(meta.owned);
  const nextOwned: MetaProgression['owned'] = {};
  const cosmeticUnlocks = new Set<EquipmentId>();
  const replacementByLegacyId: Partial<Record<EquipmentId, ActiveEquipmentId>> = {};
  let compensationGold = 0;
  let compensationDust = 0;
  let compensationCopies = 0;

  for (const [rawId, progress] of Object.entries(originalOwned) as Array<[EquipmentId, EquipmentProgress | undefined]>) {
    if (!progress) continue;
    const replacement = legacyReplacementFor(rawId);
    replacementByLegacyId[rawId] = replacement;
    cosmeticUnlocks.add(rawId);
    const invested = investedResources(progress.level);
    const legacy = !isActiveEquipmentId(rawId);
    const extraCopies = legacy ? invested.copies : 0;
    nextOwned[replacement] = mergeProgress(nextOwned[replacement], progress, extraCopies);
    if (legacy) {
      compensationGold += invested.gold;
      compensationDust += invested.dust;
      compensationCopies += extraCopies;
    }
  }

  nextOwned['ash-bow'] ??= { level: 1, copies: 0 };
  nextOwned['ranger-quiver'] ??= { level: 1, copies: 0 };
  nextOwned['ranger-cloak'] ??= { level: 1, copies: 0 };

  for (const id of ACTIVE_EQUIPMENT_IDS) {
    const progress = nextOwned[id];
    if (!progress) continue;
    progress.level = Math.max(1, Math.min(5, Math.floor(progress.level)));
    progress.copies = Math.max(0, Math.min(999, Math.floor(progress.copies)));
  }

  meta.owned = nextOwned;
  meta.equipped.bow = activeEquippedItem(meta, 'bow', 'ash-bow');
  meta.equipped.quiver = activeEquippedItem(meta, 'quiver', 'ranger-quiver');
  meta.equipped.armor = activeEquippedItem(meta, 'armor', 'ranger-cloak');
  meta.gold += compensationGold;
  meta.dust += compensationDust;
  saveMetaProgression(meta);

  const receipt: EquipmentMigrationReceipt = {
    version: 1,
    completedAt: Date.now(),
    cosmeticUnlocks: [...cosmeticUnlocks],
    replacementByLegacyId,
    compensation: { gold: compensationGold, dust: compensationDust, copies: compensationCopies },
  };
  return { meta: loadMetaProgression(), receipt: writeReceipt(receipt) };
}

export function loadEquipmentMigrationReceipt(): EquipmentMigrationReceipt | null {
  return readReceipt();
}

export function activeOwnedEquipment(meta: MetaProgression = ensureEquipmentRedesignMigration().meta) {
  return Object.fromEntries(ACTIVE_EQUIPMENT_IDS.flatMap(id => meta.owned[id] ? [[id, meta.owned[id]]] : []));
}
