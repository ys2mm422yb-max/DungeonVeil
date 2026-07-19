import { ACTIVE_EQUIPMENT, ACTIVE_EQUIPMENT_IDS, ACTIVE_EQUIPMENT_SLOTS, isActiveEquipmentId, legacyReplacementFor } from './equipmentRedesign';
import { knownEquipmentId, migrateLegacyMetaToV4, normalizeProgress, numericProgressValue } from './metaMigrationV4';
import type { EquipmentId, EquipmentSlot, MetaProgression } from './metaProgressionTypes';

const META_KEY = 'dungeon-veil-meta';
export const EQUIPMENT_SLOTS: readonly EquipmentSlot[] = ACTIVE_EQUIPMENT_SLOTS;

const DEFAULT_META: MetaProgression = {
  version: 4,
  rank: 1,
  xp: 0,
  dust: 0,
  gold: 0,
  owned: {
    'ash-bow': { level: 1, copies: 0 },
    'ranger-quiver': { level: 1, copies: 0 },
    'ranger-cloak': { level: 1, copies: 0 },
  },
  equipped: { bow: 'ash-bow', quiver: 'ranger-quiver', talisman: 'veil-key', armor: 'ranger-cloak' },
  cosmeticUnlocks: [],
  migrationCompensation: { gold: 0, dust: 0, copies: 0 },
  rewardLedger: [],
  currentRunId: '',
};

export function xpForNextRank(rank: number) {
  return 1200 + Math.max(0, Math.floor(Number(rank) || 1) - 1) * 300;
}

function normalizeV4(parsed: any): MetaProgression {
  const owned: MetaProgression['owned'] = {};
  for (const id of ACTIVE_EQUIPMENT_IDS) {
    const progress = normalizeProgress(parsed?.owned?.[id]);
    if (progress) owned[id] = progress;
  }
  owned['ash-bow'] ??= { level: 1, copies: 0 };
  owned['ranger-quiver'] ??= { level: 1, copies: 0 };
  owned['ranger-cloak'] ??= { level: 1, copies: 0 };

  const equipped = { ...DEFAULT_META.equipped, ...(parsed?.equipped ?? {}) } as Record<EquipmentSlot, EquipmentId>;
  for (const slot of ACTIVE_EQUIPMENT_SLOTS) {
    const id = equipped[slot];
    if (!isActiveEquipmentId(id) || ACTIVE_EQUIPMENT[id].slot !== slot || !owned[id]) equipped[slot] = DEFAULT_META.equipped[slot];
  }

  return {
    version: 4,
    rank: Math.max(1, Math.floor(numericProgressValue(parsed?.rank) || 1)),
    xp: numericProgressValue(parsed?.xp),
    dust: numericProgressValue(parsed?.dust),
    gold: numericProgressValue(parsed?.gold),
    owned,
    equipped,
    cosmeticUnlocks: Array.isArray(parsed?.cosmeticUnlocks) ? [...new Set(parsed.cosmeticUnlocks.filter(knownEquipmentId))] : [],
    migrationCompensation: {
      gold: numericProgressValue(parsed?.migrationCompensation?.gold),
      dust: numericProgressValue(parsed?.migrationCompensation?.dust),
      copies: numericProgressValue(parsed?.migrationCompensation?.copies),
    },
    rewardLedger: Array.isArray(parsed?.rewardLedger) ? parsed.rewardLedger.filter((key: unknown): key is string => typeof key === 'string').slice(-300) : [],
    currentRunId: typeof parsed?.currentRunId === 'string' ? parsed.currentRunId : '',
  };
}

export function loadMetaProgression(): MetaProgression {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return structuredClone(DEFAULT_META);
    const parsed = JSON.parse(raw) as any;
    const result = parsed?.version === 4 ? normalizeV4(parsed) : migrateLegacyMetaToV4(parsed);
    if (parsed?.version !== 4) saveMetaProgression(result);
    return result;
  } catch {
    return structuredClone(DEFAULT_META);
  }
}

export function saveMetaProgression(meta: MetaProgression): MetaProgression {
  const normalized = normalizeV4({ ...meta, version: 4 });
  localStorage.setItem(META_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event('dungeon-veil-meta-changed'));
  return normalized;
}

export function beginMetaRun() {
  const meta = loadMetaProgression();
  meta.currentRunId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  saveMetaProgression(meta);
  return meta.currentRunId;
}

export function collectMetaEquipmentDrop(rawId: EquipmentId) {
  const id = isActiveEquipmentId(rawId) ? rawId : legacyReplacementFor(rawId);
  const meta = loadMetaProgression();
  const existing = meta.owned[id];
  const duplicate = Boolean(existing);
  if (existing) existing.copies = Math.min(999, existing.copies + 1);
  else meta.owned[id] = { level: 1, copies: 0 };
  const saved = saveMetaProgression(meta);
  return { meta: saved, duplicate, progress: saved.owned[id]! };
}

export function equipMetaItem(rawId: EquipmentId) {
  const id = isActiveEquipmentId(rawId) ? rawId : legacyReplacementFor(rawId);
  const meta = loadMetaProgression();
  if (!meta.owned[id]) return meta;
  meta.equipped[ACTIVE_EQUIPMENT[id].slot] = id;
  return saveMetaProgression(meta);
}
