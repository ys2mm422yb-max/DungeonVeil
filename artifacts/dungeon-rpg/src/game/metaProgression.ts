import type { GameEngine } from './runEngine';
import { isBossRoom } from './chapterRun';
import { equipmentUnlockedForCurrentProgress, recordReachedChapter } from './equipmentChapterGates';
import {
  ACTIVE_EQUIPMENT_IDS,
  LEGACY_EQUIPMENT_MIGRATION,
  REMOVED_ITEM_COMPENSATION_DUST_PER_COPY,
  REMOVED_ITEM_COMPENSATION_DUST_PER_LEVEL,
  addEquipmentStats,
  equipmentStatsAtLevel,
  isActiveEquipmentId,
  totalCritChance,
  totalCritDamage,
  type ActiveEquipmentId,
} from './equipmentCore';

export type EquipmentSlot = 'bow' | 'quiver' | 'talisman' | 'armor';
export type ActiveEquipmentSlot = Exclude<EquipmentSlot, 'talisman'>;
export type EquipmentRarity = 'common' | 'rare' | 'epic';
export type EquipmentDropSource = 'forge' | 'hunt' | 'warden' | 'ritual' | 'depth';
export type EquipmentId =
  | 'ash-bow' | 'ember-bow' | 'hunter-bow' | 'frost-bow' | 'splinter-bow' | 'veil-bow' | 'warden-bow'
  | 'ranger-quiver' | 'black-quiver' | 'rune-quiver' | 'frost-quiver' | 'splinter-quiver' | 'warden-quiver'
  | 'veil-key' | 'guardian-sigil' | 'frost-grimoire' | 'ritual-shard' | 'ash-amulet' | 'depth-seal' | 'veil-eye'
  | 'ranger-cloak' | 'ash-armor' | 'frost-armor' | 'warden-armor' | 'veil-mantle' | 'depth-armor';

type GrantedSkill = 'fireArrow' | 'iceArrow' | 'multishot' | 'ricochet' | 'piercing';

export type EquipmentDefinition = {
  id: EquipmentId;
  slot: EquipmentSlot;
  nameDe: string;
  nameEn: string;
  descriptionDe: string;
  descriptionEn: string;
  pack: 'adventurers' | 'weapons' | 'dungeon';
  assetPath: string;
  unlockRank: number;
  accent: string;
  rarity: EquipmentRarity;
  dropSource: EquipmentDropSource;
  active: boolean;
};

export type EquipmentCombatModifiers = {
  attackFlat: number;
  attackPercent: number;
  maxHp: number;
  defense: number;
  speedPercent: number;
  attackRange: number;
  attackCooldownMultiplier: number;
  dodgeCooldownMultiplier: number;
  critChance: number;
  critDamage: number;
  grantedSkills: Partial<Record<GrantedSkill, number>>;
};

const ADVENTURER_ASSETS = 'adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf';
const ADVENTURER_CHARACTERS = 'adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf';
const WEAPON_ASSETS = 'weapons/KayKit_FantasyWeaponsBits_1.0_FREE/Assets/gltf';
const DUNGEON_ASSETS = 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';

function activeDefinition(definition: Omit<EquipmentDefinition, 'active'>): EquipmentDefinition {
  return { ...definition, active: true };
}

function legacyDefinition(definition: Omit<EquipmentDefinition, 'active' | 'descriptionDe' | 'descriptionEn'>): EquipmentDefinition {
  return {
    ...definition,
    active: false,
    descriptionDe: 'Kosmetisches Altmodell · keine Gameplay-Werte',
    descriptionEn: 'Legacy cosmetic model · no gameplay stats',
  };
}

export const EQUIPMENT: Record<EquipmentId, EquipmentDefinition> = {
  'ash-bow': activeDefinition({ id: 'ash-bow', slot: 'bow', nameDe: 'Aschenbogen', nameEn: 'Ash Bow', descriptionDe: 'Reiner Angriffsbogen', descriptionEn: 'Pure attack bow', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/bow_withString.gltf`, unlockRank: 1, accent: '#d59b45', rarity: 'common', dropSource: 'forge' }),
  'ember-bow': activeDefinition({ id: 'ember-bow', slot: 'bow', nameDe: 'Glutbogen', nameEn: 'Ember Bow', descriptionDe: 'Höchste Krit-Chance', descriptionEn: 'Highest critical chance', pack: 'weapons', assetPath: `${WEAPON_ASSETS}/bow_A_withString.gltf`, unlockRank: 3, accent: '#ff673d', rarity: 'rare', dropSource: 'forge' }),
  'veil-bow': activeDefinition({ id: 'veil-bow', slot: 'bow', nameDe: 'Schleierbogen', nameEn: 'Veil Bow', descriptionDe: 'Angriff und Krit-Chance', descriptionEn: 'Attack and critical chance', pack: 'weapons', assetPath: `${WEAPON_ASSETS}/bow_A.gltf`, unlockRank: 7, accent: '#a88cff', rarity: 'epic', dropSource: 'ritual' }),
  'warden-bow': activeDefinition({ id: 'warden-bow', slot: 'bow', nameDe: 'Wächterbogen', nameEn: 'Warden Bow', descriptionDe: 'Angriff, Krit-Chance und Krit-Schaden', descriptionEn: 'Attack, critical chance and critical damage', pack: 'weapons', assetPath: `${WEAPON_ASSETS}/bow_B.gltf`, unlockRank: 10, accent: '#f1c66c', rarity: 'epic', dropSource: 'warden' }),

  'ranger-quiver': activeDefinition({ id: 'ranger-quiver', slot: 'quiver', nameDe: 'Weitblickköcher', nameEn: 'Farshot Quiver', descriptionDe: 'Maximale Angriffsreichweite', descriptionEn: 'Maximum attack range', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/quiver.gltf`, unlockRank: 1, accent: '#63c8d8', rarity: 'common', dropSource: 'hunt' }),
  'black-quiver': activeDefinition({ id: 'black-quiver', slot: 'quiver', nameDe: 'Schnellzugköcher', nameEn: 'Quickdraw Quiver', descriptionDe: 'Maximales Angriffstempo', descriptionEn: 'Maximum attack speed', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/arrow_bow_bundle.gltf`, unlockRank: 4, accent: '#8b78ba', rarity: 'rare', dropSource: 'hunt' }),
  'rune-quiver': activeDefinition({ id: 'rune-quiver', slot: 'quiver', nameDe: 'Runenköcher', nameEn: 'Rune Quiver', descriptionDe: 'Reichweite und Angriffstempo', descriptionEn: 'Range and attack speed', pack: 'weapons', assetPath: `${WEAPON_ASSETS}/arrow_B.gltf`, unlockRank: 7, accent: '#b184ff', rarity: 'epic', dropSource: 'ritual' }),

  'ranger-cloak': activeDefinition({ id: 'ranger-cloak', slot: 'armor', nameDe: 'Waldläufermantel', nameEn: 'Ranger Cloak', descriptionDe: 'Maximales Leben', descriptionEn: 'Maximum health', pack: 'adventurers', assetPath: `${ADVENTURER_CHARACTERS}/Ranger.glb`, unlockRank: 1, accent: '#78caa0', rarity: 'common', dropSource: 'hunt' }),
  'ash-armor': activeDefinition({ id: 'ash-armor', slot: 'armor', nameDe: 'Aschenpanzer', nameEn: 'Ash Armor', descriptionDe: 'Leben und Verteidigung', descriptionEn: 'Health and defense', pack: 'adventurers', assetPath: `${ADVENTURER_CHARACTERS}/Barbarian.glb`, unlockRank: 5, accent: '#db754b', rarity: 'rare', dropSource: 'forge' }),
  'warden-armor': activeDefinition({ id: 'warden-armor', slot: 'armor', nameDe: 'Wächterrüstung', nameEn: 'Warden Armor', descriptionDe: 'Höchste Verteidigung', descriptionEn: 'Highest defense', pack: 'adventurers', assetPath: `${ADVENTURER_CHARACTERS}/Knight.glb`, unlockRank: 8, accent: '#e5c36b', rarity: 'epic', dropSource: 'warden' }),

  'hunter-bow': legacyDefinition({ id: 'hunter-bow', slot: 'bow', nameDe: 'Bogen des Jägers', nameEn: "Hunter's Bow", pack: 'weapons', assetPath: `${WEAPON_ASSETS}/bow_B_withString.gltf`, unlockRank: 99, accent: '#a8d381', rarity: 'rare', dropSource: 'hunt' }),
  'frost-bow': legacyDefinition({ id: 'frost-bow', slot: 'bow', nameDe: 'Frostbogen', nameEn: 'Frost Bow', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/crossbow_1handed.gltf`, unlockRank: 99, accent: '#79ddff', rarity: 'rare', dropSource: 'depth' }),
  'splinter-bow': legacyDefinition({ id: 'splinter-bow', slot: 'bow', nameDe: 'Splitterbogen', nameEn: 'Splinter Bow', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/crossbow_2handed.gltf`, unlockRank: 99, accent: '#e0c089', rarity: 'rare', dropSource: 'forge' }),
  'frost-quiver': legacyDefinition({ id: 'frost-quiver', slot: 'quiver', nameDe: 'Frostköcher', nameEn: 'Frost Quiver', pack: 'weapons', assetPath: `${WEAPON_ASSETS}/arrow_A.gltf`, unlockRank: 99, accent: '#6fd8ff', rarity: 'rare', dropSource: 'depth' }),
  'splinter-quiver': legacyDefinition({ id: 'splinter-quiver', slot: 'quiver', nameDe: 'Splitterköcher', nameEn: 'Splinter Quiver', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/arrow_crossbow_bundle.gltf`, unlockRank: 99, accent: '#d8bd82', rarity: 'rare', dropSource: 'forge' }),
  'warden-quiver': legacyDefinition({ id: 'warden-quiver', slot: 'quiver', nameDe: 'Wächterköcher', nameEn: 'Warden Quiver', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/arrow_crossbow.gltf`, unlockRank: 99, accent: '#e6c46d', rarity: 'epic', dropSource: 'warden' }),
  'veil-key': legacyDefinition({ id: 'veil-key', slot: 'talisman', nameDe: 'Schleierschlüssel', nameEn: 'Veil Key', pack: 'dungeon', assetPath: `${DUNGEON_ASSETS}/key.gltf`, unlockRank: 99, accent: '#a58aff', rarity: 'common', dropSource: 'depth' }),
  'guardian-sigil': legacyDefinition({ id: 'guardian-sigil', slot: 'talisman', nameDe: 'Wächtersiegel', nameEn: 'Guardian Sigil', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/shield_spikes_color.gltf`, unlockRank: 99, accent: '#79d69d', rarity: 'rare', dropSource: 'warden' }),
  'frost-grimoire': legacyDefinition({ id: 'frost-grimoire', slot: 'talisman', nameDe: 'Frostgrimoire', nameEn: 'Frost Grimoire', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/spellbook_closed.gltf`, unlockRank: 99, accent: '#78ddff', rarity: 'epic', dropSource: 'depth' }),
  'ritual-shard': legacyDefinition({ id: 'ritual-shard', slot: 'talisman', nameDe: 'Ritualsplitter', nameEn: 'Ritual Shard', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/spellbook_open.gltf`, unlockRank: 99, accent: '#d684ff', rarity: 'epic', dropSource: 'ritual' }),
  'ash-amulet': legacyDefinition({ id: 'ash-amulet', slot: 'talisman', nameDe: 'Aschenamulett', nameEn: 'Ash Amulet', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/smokebomb.gltf`, unlockRank: 99, accent: '#e7804f', rarity: 'rare', dropSource: 'forge' }),
  'depth-seal': legacyDefinition({ id: 'depth-seal', slot: 'talisman', nameDe: 'Tiefensiegel', nameEn: 'Depth Seal', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/shield_badge.gltf`, unlockRank: 99, accent: '#5db2b8', rarity: 'rare', dropSource: 'depth' }),
  'veil-eye': legacyDefinition({ id: 'veil-eye', slot: 'talisman', nameDe: 'Auge des Schleiers', nameEn: 'Veil Eye', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/wand.gltf`, unlockRank: 99, accent: '#c375ff', rarity: 'epic', dropSource: 'ritual' }),
  'frost-armor': legacyDefinition({ id: 'frost-armor', slot: 'armor', nameDe: 'Frostharnisch', nameEn: 'Frost Harness', pack: 'adventurers', assetPath: `${ADVENTURER_CHARACTERS}/Knight.glb`, unlockRank: 99, accent: '#72d8ff', rarity: 'rare', dropSource: 'depth' }),
  'veil-mantle': legacyDefinition({ id: 'veil-mantle', slot: 'armor', nameDe: 'Schleiergewand', nameEn: 'Veil Mantle', pack: 'adventurers', assetPath: `${ADVENTURER_CHARACTERS}/Ranger.glb`, unlockRank: 99, accent: '#a786ff', rarity: 'epic', dropSource: 'ritual' }),
  'depth-armor': legacyDefinition({ id: 'depth-armor', slot: 'armor', nameDe: 'Rüstung der Tiefe', nameEn: 'Depth Armor', pack: 'adventurers', assetPath: `${ADVENTURER_CHARACTERS}/Barbarian.glb`, unlockRank: 99, accent: '#5fb4ba', rarity: 'epic', dropSource: 'depth' }),
};

export const ACTIVE_EQUIPMENT: readonly EquipmentDefinition[] = ACTIVE_EQUIPMENT_IDS.map(id => EQUIPMENT[id]);
export type EquipmentProgress = { level: number; copies: number };
export type MetaProgression = {
  version: 4;
  rank: number;
  xp: number;
  dust: number;
  gold: number;
  owned: Partial<Record<EquipmentId, EquipmentProgress>>;
  equipped: Record<EquipmentSlot, EquipmentId>;
  rewardLedger: string[];
  currentRunId: string;
};
export type MetaReward = { xp: number; dust: number; gold: number; rankBefore: number; rankAfter: number; item?: EquipmentId; duplicate?: boolean; source?: EquipmentDropSource; rarity?: EquipmentRarity };
export type PendingEquipmentDrop = { item: EquipmentId; duplicate: boolean; source: EquipmentDropSource; rarity: EquipmentRarity };

export const EQUIPMENT_SLOTS: readonly ActiveEquipmentSlot[] = ['bow', 'quiver', 'armor'];
const META_KEY = 'dungeon-veil-meta';
const STARTER_OWNED: Partial<Record<EquipmentId, EquipmentProgress>> = {
  'ash-bow': { level: 1, copies: 0 },
  'ranger-quiver': { level: 1, copies: 0 },
  'ranger-cloak': { level: 1, copies: 0 },
};
const DEFAULT_META: MetaProgression = {
  version: 4,
  rank: 1,
  xp: 0,
  dust: 0,
  gold: 0,
  owned: structuredClone(STARTER_OWNED),
  equipped: { bow: 'ash-bow', quiver: 'ranger-quiver', talisman: 'veil-key', armor: 'ranger-cloak' },
  rewardLedger: [],
  currentRunId: '',
};

export function xpForNextRank(rank: number) { return 100 + Math.max(0, rank - 1) * 65; }
function safeNumber(value: unknown) { return Math.max(0, Number(value ?? 0) || 0); }

function progressFrom(value: unknown): EquipmentProgress | null {
  if (typeof value === 'number' && value > 0) return { level: Math.max(1, Math.min(5, Math.floor(value))), copies: 0 };
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<EquipmentProgress>;
  const level = Math.floor(safeNumber(item.level));
  if (level <= 0) return null;
  return { level: Math.max(1, Math.min(5, level)), copies: Math.floor(safeNumber(item.copies)) };
}

function normalizeOwned(value: unknown): { owned: MetaProgression['owned']; compensationDust: number } {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const owned: MetaProgression['owned'] = structuredClone(STARTER_OWNED);
  let compensationDust = 0;

  for (const [legacyId, raw] of Object.entries(source)) {
    const progress = progressFrom(raw);
    if (!progress) continue;
    const target = LEGACY_EQUIPMENT_MIGRATION[legacyId];
    if (!target) {
      const paidLevels = legacyId === 'veil-key' ? Math.max(0, progress.level - 1) : progress.level;
      compensationDust += paidLevels * REMOVED_ITEM_COMPENSATION_DUST_PER_LEVEL;
      compensationDust += progress.copies * REMOVED_ITEM_COMPENSATION_DUST_PER_COPY;
      continue;
    }
    const current = owned[target];
    if (!current) owned[target] = { ...progress };
    else {
      current.level = Math.max(current.level, progress.level);
      current.copies = Math.min(999, current.copies + progress.copies);
    }
  }
  return { owned, compensationDust };
}

function migratedEquipped(value: unknown, owned: MetaProgression['owned']): MetaProgression['equipped'] {
  const raw = value && typeof value === 'object' ? value as Partial<Record<EquipmentSlot, string>> : {};
  const resolve = (slot: ActiveEquipmentSlot, fallback: ActiveEquipmentId): EquipmentId => {
    const mapped = LEGACY_EQUIPMENT_MIGRATION[String(raw[slot] ?? '')];
    return mapped && EQUIPMENT[mapped].slot === slot && owned[mapped] ? mapped : fallback;
  };
  return {
    bow: resolve('bow', 'ash-bow'),
    quiver: resolve('quiver', 'ranger-quiver'),
    talisman: 'veil-key',
    armor: resolve('armor', 'ranger-cloak'),
  };
}

export function loadMetaProgression(): MetaProgression {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return structuredClone(DEFAULT_META);
    const parsed = JSON.parse(raw) as Partial<MetaProgression> & { version?: number };
    const normalized = normalizeOwned(parsed.owned);
    const migrated: MetaProgression = {
      version: 4,
      rank: Math.max(1, Math.floor(safeNumber(parsed.rank) || 1)),
      xp: safeNumber(parsed.xp),
      dust: safeNumber(parsed.dust) + (parsed.version === 4 ? 0 : normalized.compensationDust),
      gold: safeNumber(parsed.gold),
      owned: normalized.owned,
      equipped: migratedEquipped(parsed.equipped, normalized.owned),
      rewardLedger: Array.isArray(parsed.rewardLedger) ? parsed.rewardLedger.filter((key): key is string => typeof key === 'string').slice(-240) : [],
      currentRunId: typeof parsed.currentRunId === 'string' ? parsed.currentRunId : '',
    };
    if (parsed.version !== 4 || Object.keys(parsed.owned ?? {}).some(id => !isActiveEquipmentId(id))) saveMetaProgression(migrated);
    return migrated;
  } catch {
    return structuredClone(DEFAULT_META);
  }
}

export function saveMetaProgression(meta: MetaProgression) {
  const normalized = normalizeOwned(meta.owned).owned;
  const next: MetaProgression = {
    ...meta,
    version: 4,
    owned: normalized,
    equipped: migratedEquipped(meta.equipped, normalized),
    rewardLedger: meta.rewardLedger.slice(-240),
  };
  localStorage.setItem(META_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('dungeon-veil-meta-changed'));
  return next;
}

export function beginMetaRun() {
  const meta = loadMetaProgression();
  meta.currentRunId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  saveMetaProgression(meta);
  return meta.currentRunId;
}

function addRankXp(meta: MetaProgression, xp: number) {
  meta.xp += xp;
  while (meta.xp >= xpForNextRank(meta.rank)) {
    meta.xp -= xpForNextRank(meta.rank);
    meta.rank++;
  }
}

function isStarterItem(id: EquipmentId) {
  return id === 'ash-bow' || id === 'ranger-quiver' || id === 'ranger-cloak';
}
function availableDrops(meta: MetaProgression, source: EquipmentDropSource) {
  return ACTIVE_EQUIPMENT.filter(item => item.unlockRank <= meta.rank && equipmentUnlockedForCurrentProgress(item.id) && item.dropSource === source && !isStarterItem(item.id));
}
function chooseDrop(meta: MetaProgression, source: EquipmentDropSource): PendingEquipmentDrop | null {
  const pool = availableDrops(meta, source);
  if (!pool.length) return null;
  const unowned = pool.filter(candidate => !meta.owned[candidate.id]);
  const dropPool = unowned.length ? unowned : pool;
  const item = dropPool[Math.floor(Math.random() * dropPool.length)];
  return { item: item.id, duplicate: Boolean(meta.owned[item.id]), source, rarity: item.rarity };
}

export function rollMetaEquipmentDrop(source: EquipmentDropSource, chance = 1): PendingEquipmentDrop | null {
  if (Math.random() > chance) return null;
  return chooseDrop(loadMetaProgression(), source);
}
export function equipmentSourceForRoom(floor: number): EquipmentDropSource {
  if (isBossRoom(floor) || [16, 19].includes(floor)) return 'warden';
  if ([4, 5, 6].includes(floor)) return 'forge';
  if ([9, 15, 18].includes(floor)) return 'ritual';
  return 'depth';
}

export function rewardMetaRoomClear(chapter: number, floor: number): MetaReward | null {
  recordReachedChapter(chapter);
  const meta = loadMetaProgression();
  if (!meta.currentRunId) beginMetaRun();
  const live = loadMetaProgression();
  const rewardKey = `${live.currentRunId}:${chapter}:${floor}`;
  if (live.rewardLedger.includes(rewardKey)) return null;
  live.rewardLedger.push(rewardKey);

  const boss = isBossRoom(floor);
  const chapterBoss = floor === 20;
  const xp = chapterBoss ? 260 + chapter * 30 : boss ? 130 + chapter * 20 : 14 + floor * 4 + Math.max(0, chapter - 1) * 8;
  const dust = chapterBoss ? 105 + chapter * 15 : boss ? 55 + chapter * 10 : 4 + Math.ceil(floor * 0.8);
  const gold = chapterBoss ? 900 + chapter * 140 : boss ? 350 + chapter * 70 : 40 + floor * 18 + Math.max(0, chapter - 1) * 20;
  const rankBefore = live.rank;
  addRankXp(live, xp);
  live.dust += dust;
  live.gold += gold;

  const source = equipmentSourceForRoom(floor);
  const shouldDrop = boss || (floor >= 3 && Math.random() < 0.18);
  const drop = shouldDrop ? chooseDrop(live, source) : null;
  saveMetaProgression(live);
  return { xp, dust, gold, rankBefore, rankAfter: live.rank, item: drop?.item, duplicate: drop?.duplicate, source: drop?.source, rarity: drop?.rarity };
}

export function spawnEquipmentDrop(engine: GameEngine, drop: PendingEquipmentDrop, x: number, y: number) {
  const definition = EQUIPMENT[drop.item];
  if (!definition.active) return '';
  const itemId = `equipment-drop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  engine.state.items.push({
    id: itemId, type: 'item', itemType: 'equipment', equipmentId: drop.item, equipmentRarity: drop.rarity,
    equipmentSource: drop.source, isNewEquipment: !drop.duplicate, value: 0, x: x - 12, y: y - 12,
    width: 24, height: 24, vx: 0, vy: 0, color: definition.accent, spawnTime: performance.now(),
  });
  return itemId;
}

export function collectMetaEquipmentDrop(id: EquipmentId) {
  const meta = loadMetaProgression();
  if (!isActiveEquipmentId(id)) return { meta, duplicate: false, progress: { level: 0, copies: 0 } };
  const existing = meta.owned[id];
  const duplicate = Boolean(existing);
  if (existing) existing.copies += 1;
  else meta.owned[id] = { level: 1, copies: 0 };
  const saved = saveMetaProgression(meta);
  return { meta: saved, duplicate, progress: saved.owned[id]! };
}
export function equipMetaItem(id: EquipmentId) {
  const meta = loadMetaProgression();
  const definition = EQUIPMENT[id];
  if (!definition.active || definition.slot === 'talisman' || !meta.owned[id]) return meta;
  meta.equipped[definition.slot] = id;
  return saveMetaProgression(meta);
}

function levelOf(meta: MetaProgression, id: ActiveEquipmentId) {
  return Math.max(1, Math.min(5, meta.owned[id]?.level ?? 1));
}

export function equipmentCombatModifiers(meta = loadMetaProgression()): EquipmentCombatModifiers {
  const ids = [meta.equipped.bow, meta.equipped.quiver, meta.equipped.armor].filter(isActiveEquipmentId);
  const stats = addEquipmentStats(...ids.map(id => equipmentStatsAtLevel(id, levelOf(meta, id))));
  return {
    attackFlat: stats.attackFlat,
    attackPercent: 0,
    maxHp: stats.maxHp,
    defense: stats.defense,
    speedPercent: 0,
    attackRange: stats.attackRange,
    attackCooldownMultiplier: 1 / (1 + stats.attackSpeedPercent),
    dodgeCooldownMultiplier: 1,
    critChance: totalCritChance(stats.critChance),
    critDamage: totalCritDamage(stats.critDamage),
    grantedSkills: {},
  };
}

export function applyMetaLoadoutToNewRun(engine: GameEngine) {
  const modifiers = equipmentCombatModifiers();
  const p = engine.state.player;
  p.attack = Math.max(1, Math.round(p.attack + modifiers.attackFlat));
  p.defense += modifiers.defense;
  p.attackRange += modifiers.attackRange;
  p.maxHp += modifiers.maxHp;
  p.hp += modifiers.maxHp;
  p.critChance = modifiers.critChance;
  p.critDamage = modifiers.critDamage;
  engine.saveNow('meta-loadout');
}
