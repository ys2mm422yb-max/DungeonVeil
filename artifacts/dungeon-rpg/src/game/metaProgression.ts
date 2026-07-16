import type { GameEngine } from './runEngine';
import { skillRank } from './runSkills';
import { isBossRoom } from './chapterRun';
import { equipmentUnlockedForCurrentProgress, recordReachedChapter } from './equipmentChapterGates';

export type EquipmentSlot = 'bow' | 'quiver' | 'talisman' | 'armor';
export type EquipmentRarity = 'common' | 'rare' | 'epic';
export type EquipmentDropSource = 'forge' | 'hunt' | 'warden' | 'ritual' | 'depth';
export type EquipmentId =
  | 'ash-bow' | 'ember-bow' | 'hunter-bow' | 'frost-bow' | 'splinter-bow' | 'veil-bow' | 'warden-bow'
  | 'ranger-quiver' | 'black-quiver' | 'rune-quiver' | 'frost-quiver' | 'splinter-quiver' | 'warden-quiver'
  | 'veil-key' | 'guardian-sigil' | 'frost-grimoire' | 'ritual-shard' | 'ash-amulet' | 'depth-seal' | 'veil-eye'
  | 'ranger-cloak' | 'ash-armor' | 'frost-armor' | 'warden-armor' | 'veil-mantle' | 'depth-armor';

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
};

const ADVENTURER_ASSETS = 'adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf';
const ADVENTURER_CHARACTERS = 'adventurers/KayKit_Adventurers_2.0_FREE/Characters/gltf';
const WEAPON_ASSETS = 'weapons/KayKit_FantasyWeaponsBits_1.0_FREE/Assets/gltf';
const DUNGEON_ASSETS = 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';

export const EQUIPMENT: Record<EquipmentId, EquipmentDefinition> = {
  'ash-bow': { id: 'ash-bow', slot: 'bow', nameDe: 'Aschenbogen', nameEn: 'Ash Bow', descriptionDe: '+6 % Angriff pro Stufe', descriptionEn: '+6% attack per level', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/bow_withString.gltf`, unlockRank: 1, accent: '#d59b45', rarity: 'common', dropSource: 'forge' },
  'ember-bow': { id: 'ember-bow', slot: 'bow', nameDe: 'Glutbogen', nameEn: 'Ember Bow', descriptionDe: 'Startet jeden Run mit Feuerpfeil I', descriptionEn: 'Start each run with Fire Arrow I', pack: 'weapons', assetPath: `${WEAPON_ASSETS}/bow_A_withString.gltf`, unlockRank: 2, accent: '#ff673d', rarity: 'common', dropSource: 'forge' },
  'hunter-bow': { id: 'hunter-bow', slot: 'bow', nameDe: 'Bogen des Jägers', nameEn: "Hunter's Bow", descriptionDe: '+2 Angriff und +2 % Bewegung pro Stufe', descriptionEn: '+2 attack and +2% movement per level', pack: 'weapons', assetPath: `${WEAPON_ASSETS}/bow_B_withString.gltf`, unlockRank: 4, accent: '#a8d381', rarity: 'rare', dropSource: 'hunt' },
  'frost-bow': { id: 'frost-bow', slot: 'bow', nameDe: 'Frostbogen', nameEn: 'Frost Bow', descriptionDe: 'Frostpfeil I und +3 Reichweite pro Stufe', descriptionEn: 'Ice Arrow I and +3 range per level', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/crossbow_1handed.gltf`, unlockRank: 5, accent: '#79ddff', rarity: 'rare', dropSource: 'depth' },
  'splinter-bow': { id: 'splinter-bow', slot: 'bow', nameDe: 'Splitterbogen', nameEn: 'Splinter Bow', descriptionDe: 'Durchschlag I und +2 Angriff pro Stufe', descriptionEn: 'Piercing I and +2 attack per level', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/crossbow_2handed.gltf`, unlockRank: 6, accent: '#e0c089', rarity: 'rare', dropSource: 'forge' },
  'veil-bow': { id: 'veil-bow', slot: 'bow', nameDe: 'Schleierbogen', nameEn: 'Veil Bow', descriptionDe: 'Abpraller I und +4 % Bewegung pro Stufe', descriptionEn: 'Ricochet I and +4% movement per level', pack: 'weapons', assetPath: `${WEAPON_ASSETS}/bow_A.gltf`, unlockRank: 8, accent: '#a88cff', rarity: 'epic', dropSource: 'ritual' },
  'warden-bow': { id: 'warden-bow', slot: 'bow', nameDe: 'Wächterbogen', nameEn: 'Warden Bow', descriptionDe: '+4 Angriff und +1 Verteidigung pro Stufe', descriptionEn: '+4 attack and +1 defense per level', pack: 'weapons', assetPath: `${WEAPON_ASSETS}/bow_B.gltf`, unlockRank: 10, accent: '#f1c66c', rarity: 'epic', dropSource: 'warden' },

  'ranger-quiver': { id: 'ranger-quiver', slot: 'quiver', nameDe: 'Waldläuferköcher', nameEn: 'Ranger Quiver', descriptionDe: '+3 % Bewegung pro Stufe', descriptionEn: '+3% movement per level', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/quiver.gltf`, unlockRank: 1, accent: '#63c8d8', rarity: 'common', dropSource: 'hunt' },
  'black-quiver': { id: 'black-quiver', slot: 'quiver', nameDe: 'Schwarzer Köcher', nameEn: 'Black Quiver', descriptionDe: 'Startet jeden Run mit Mehrfachpfeil I', descriptionEn: 'Start each run with Multishot I', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/arrow_bow_bundle.gltf`, unlockRank: 3, accent: '#8b78ba', rarity: 'common', dropSource: 'hunt' },
  'rune-quiver': { id: 'rune-quiver', slot: 'quiver', nameDe: 'Runenköcher', nameEn: 'Rune Quiver', descriptionDe: 'Startet jeden Run mit Abpraller I', descriptionEn: 'Start each run with Ricochet I', pack: 'weapons', assetPath: `${WEAPON_ASSETS}/arrow_B.gltf`, unlockRank: 6, accent: '#b184ff', rarity: 'epic', dropSource: 'ritual' },
  'frost-quiver': { id: 'frost-quiver', slot: 'quiver', nameDe: 'Frostköcher', nameEn: 'Frost Quiver', descriptionDe: 'Frostpfeil I und +3 Skill-Reichweite pro Stufe', descriptionEn: 'Ice Arrow I and +3 skill range per level', pack: 'weapons', assetPath: `${WEAPON_ASSETS}/arrow_A.gltf`, unlockRank: 4, accent: '#6fd8ff', rarity: 'rare', dropSource: 'depth' },
  'splinter-quiver': { id: 'splinter-quiver', slot: 'quiver', nameDe: 'Splitterköcher', nameEn: 'Splinter Quiver', descriptionDe: 'Durchschlag I und +3 Angriffsreichweite pro Stufe', descriptionEn: 'Piercing I and +3 attack range per level', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/arrow_crossbow_bundle.gltf`, unlockRank: 6, accent: '#d8bd82', rarity: 'rare', dropSource: 'forge' },
  'warden-quiver': { id: 'warden-quiver', slot: 'quiver', nameDe: 'Wächterköcher', nameEn: 'Warden Quiver', descriptionDe: '-4 % Angriffsabklingzeit und +1 Verteidigung pro Stufe', descriptionEn: '-4% attack cooldown and +1 defense per level', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/arrow_crossbow.gltf`, unlockRank: 8, accent: '#e6c46d', rarity: 'epic', dropSource: 'warden' },

  'veil-key': { id: 'veil-key', slot: 'talisman', nameDe: 'Schleierschlüssel', nameEn: 'Veil Key', descriptionDe: '+4 % Bewegung und +2 Leben pro Stufe', descriptionEn: '+4% movement and +2 health per level', pack: 'dungeon', assetPath: `${DUNGEON_ASSETS}/key.gltf`, unlockRank: 1, accent: '#a58aff', rarity: 'common', dropSource: 'depth' },
  'guardian-sigil': { id: 'guardian-sigil', slot: 'talisman', nameDe: 'Wächtersiegel', nameEn: 'Guardian Sigil', descriptionDe: '+8 Leben und +1 Verteidigung pro Stufe', descriptionEn: '+8 health and +1 defense per level', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/shield_spikes_color.gltf`, unlockRank: 5, accent: '#79d69d', rarity: 'rare', dropSource: 'warden' },
  'frost-grimoire': { id: 'frost-grimoire', slot: 'talisman', nameDe: 'Frostgrimoire', nameEn: 'Frost Grimoire', descriptionDe: 'Frostpfeil I und -4 % Skill-Abklingzeit pro Stufe', descriptionEn: 'Ice Arrow I and -4% skill cooldown per level', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/spellbook_closed.gltf`, unlockRank: 8, accent: '#78ddff', rarity: 'epic', dropSource: 'depth' },
  'ritual-shard': { id: 'ritual-shard', slot: 'talisman', nameDe: 'Ritualsplitter', nameEn: 'Ritual Shard', descriptionDe: 'Abpraller I und +4 Skill-Reichweite pro Stufe', descriptionEn: 'Ricochet I and +4 skill range per level', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/spellbook_open.gltf`, unlockRank: 5, accent: '#d684ff', rarity: 'epic', dropSource: 'ritual' },
  'ash-amulet': { id: 'ash-amulet', slot: 'talisman', nameDe: 'Aschenamulett', nameEn: 'Ash Amulet', descriptionDe: '+3 Angriff und +2 Leben pro Stufe', descriptionEn: '+3 attack and +2 health per level', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/smokebomb.gltf`, unlockRank: 4, accent: '#e7804f', rarity: 'rare', dropSource: 'forge' },
  'depth-seal': { id: 'depth-seal', slot: 'talisman', nameDe: 'Tiefensiegel', nameEn: 'Depth Seal', descriptionDe: '+5 Leben und +2 Angriffsreichweite pro Stufe', descriptionEn: '+5 health and +2 attack range per level', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/shield_badge.gltf`, unlockRank: 7, accent: '#5db2b8', rarity: 'rare', dropSource: 'depth' },
  'veil-eye': { id: 'veil-eye', slot: 'talisman', nameDe: 'Auge des Schleiers', nameEn: 'Veil Eye', descriptionDe: '+5 % Angriff und -3 % Dash-Abklingzeit pro Stufe', descriptionEn: '+5% attack and -3% dash cooldown per level', pack: 'adventurers', assetPath: `${ADVENTURER_ASSETS}/wand.gltf`, unlockRank: 10, accent: '#c375ff', rarity: 'epic', dropSource: 'ritual' },

  'ranger-cloak': { id: 'ranger-cloak', slot: 'armor', nameDe: 'Waldläufermantel', nameEn: 'Ranger Cloak', descriptionDe: '+5 Leben und +2 % Bewegung pro Stufe', descriptionEn: '+5 health and +2% movement per level', pack: 'adventurers', assetPath: `${ADVENTURER_CHARACTERS}/Ranger.glb`, unlockRank: 1, accent: '#78caa0', rarity: 'common', dropSource: 'hunt' },
  'ash-armor': { id: 'ash-armor', slot: 'armor', nameDe: 'Aschenpanzer', nameEn: 'Ash Armor', descriptionDe: '+2 Angriff und +3 Leben pro Stufe', descriptionEn: '+2 attack and +3 health per level', pack: 'adventurers', assetPath: `${ADVENTURER_CHARACTERS}/Rogue_Hooded.glb`, unlockRank: 4, accent: '#db754b', rarity: 'rare', dropSource: 'forge' },
  'frost-armor': { id: 'frost-armor', slot: 'armor', nameDe: 'Frostharnisch', nameEn: 'Frost Harness', descriptionDe: '+4 Leben und +3 Skill-Reichweite pro Stufe', descriptionEn: '+4 health and +3 skill range per level', pack: 'adventurers', assetPath: `${ADVENTURER_CHARACTERS}/Mage.glb`, unlockRank: 5, accent: '#72d8ff', rarity: 'rare', dropSource: 'depth' },
  'warden-armor': { id: 'warden-armor', slot: 'armor', nameDe: 'Wächterrüstung', nameEn: 'Warden Armor', descriptionDe: '+1 Verteidigung und +6 Leben pro Stufe', descriptionEn: '+1 defense and +6 health per level', pack: 'adventurers', assetPath: `${ADVENTURER_CHARACTERS}/Knight.glb`, unlockRank: 7, accent: '#e5c36b', rarity: 'epic', dropSource: 'warden' },
  'veil-mantle': { id: 'veil-mantle', slot: 'armor', nameDe: 'Schleiergewand', nameEn: 'Veil Mantle', descriptionDe: '+3 % Bewegung und +2 Angriffsreichweite pro Stufe', descriptionEn: '+3% movement and +2 attack range per level', pack: 'adventurers', assetPath: `${ADVENTURER_CHARACTERS}/Rogue.glb`, unlockRank: 8, accent: '#a786ff', rarity: 'epic', dropSource: 'ritual' },
  'depth-armor': { id: 'depth-armor', slot: 'armor', nameDe: 'Rüstung der Tiefe', nameEn: 'Depth Armor', descriptionDe: '+8 Leben und alle zwei Stufen +1 Verteidigung', descriptionEn: '+8 health and +1 defense every two levels', pack: 'adventurers', assetPath: `${ADVENTURER_CHARACTERS}/Barbarian.glb`, unlockRank: 10, accent: '#5fb4ba', rarity: 'epic', dropSource: 'depth' },
};

export type EquipmentProgress = { level: number; copies: number };
export type MetaProgression = {
  version: 3;
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
export type EquipmentUpgradeCost = { gold: number; copies: number };

export const EQUIPMENT_SLOTS: readonly EquipmentSlot[] = ['bow', 'quiver', 'talisman', 'armor'];
const META_KEY = 'dungeon-veil-meta';
const STARTER_OWNED: Partial<Record<EquipmentId, EquipmentProgress>> = {
  'ash-bow': { level: 1, copies: 0 },
  'ranger-quiver': { level: 1, copies: 0 },
  'veil-key': { level: 1, copies: 0 },
  'ranger-cloak': { level: 1, copies: 0 },
};
const DEFAULT_META: MetaProgression = {
  version: 3,
  rank: 1,
  xp: 0,
  dust: 0,
  gold: 0,
  owned: structuredClone(STARTER_OWNED),
  equipped: { bow: 'ash-bow', quiver: 'ranger-quiver', talisman: 'veil-key', armor: 'ranger-cloak' },
  rewardLedger: [],
  currentRunId: '',
};
const UPGRADE_COSTS: Record<number, EquipmentUpgradeCost> = {
  1: { gold: 250, copies: 1 },
  2: { gold: 650, copies: 2 },
  3: { gold: 1300, copies: 3 },
  4: { gold: 2400, copies: 5 },
};

export function xpForNextRank(rank: number) { return 100 + Math.max(0, rank - 1) * 65; }
function safeNumber(value: unknown) { return Math.max(0, Number(value ?? 0) || 0); }

function normalizeOwned(value: unknown): MetaProgression['owned'] {
  const source = value && typeof value === 'object' ? value as Partial<Record<EquipmentId, unknown>> : {};
  const owned: MetaProgression['owned'] = structuredClone(STARTER_OWNED);
  for (const id of Object.keys(EQUIPMENT) as EquipmentId[]) {
    const raw = source[id];
    if (typeof raw === 'number' && raw > 0) {
      owned[id] = { level: Math.max(1, Math.min(5, Math.floor(raw))), copies: 0 };
      continue;
    }
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as Partial<EquipmentProgress>;
    const level = Math.floor(safeNumber(item.level));
    if (level <= 0) continue;
    owned[id] = { level: Math.max(1, Math.min(5, level)), copies: Math.floor(safeNumber(item.copies)) };
  }
  return owned;
}

function ownedShapeNeedsMigration(value: unknown) {
  if (!value || typeof value !== 'object') return false;
  return Object.values(value as Record<string, unknown>).some(item => typeof item === 'number');
}

export function loadMetaProgression(): MetaProgression {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return structuredClone(DEFAULT_META);
    const parsed = JSON.parse(raw) as any;
    const migrated: MetaProgression = {
      version: 3,
      rank: Math.max(1, Math.floor(safeNumber(parsed.rank) || 1)),
      xp: safeNumber(parsed.xp),
      dust: safeNumber(parsed.dust),
      gold: safeNumber(parsed.gold),
      owned: normalizeOwned(parsed.owned),
      equipped: { ...DEFAULT_META.equipped, ...(parsed.equipped ?? {}) },
      rewardLedger: Array.isArray(parsed.rewardLedger) ? parsed.rewardLedger.filter((key: unknown): key is string => typeof key === 'string').slice(-240) : [],
      currentRunId: typeof parsed.currentRunId === 'string' ? parsed.currentRunId : '',
    };
    for (const slot of EQUIPMENT_SLOTS) {
      const id = migrated.equipped[slot];
      if (!migrated.owned[id] || EQUIPMENT[id]?.slot !== slot) migrated.equipped[slot] = DEFAULT_META.equipped[slot];
    }
    if (parsed.version !== 3 || ownedShapeNeedsMigration(parsed.owned) || !parsed.equipped?.armor || !parsed.owned?.['ranger-cloak']) saveMetaProgression(migrated);
    return migrated;
  } catch {
    return structuredClone(DEFAULT_META);
  }
}

export function saveMetaProgression(meta: MetaProgression) {
  localStorage.setItem(META_KEY, JSON.stringify({ ...meta, version: 3, rewardLedger: meta.rewardLedger.slice(-240) }));
  window.dispatchEvent(new Event('dungeon-veil-meta-changed'));
  return meta;
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
  return id === 'ash-bow' || id === 'ranger-quiver' || id === 'veil-key' || id === 'ranger-cloak';
}
function availableDrops(meta: MetaProgression, source: EquipmentDropSource) {
  return Object.values(EQUIPMENT).filter(item => item.unlockRank <= meta.rank && equipmentUnlockedForCurrentProgress(item.id) && item.dropSource === source && !isStarterItem(item.id));
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
  const existing = meta.owned[id];
  const duplicate = Boolean(existing);
  if (existing) existing.copies += 1;
  else meta.owned[id] = { level: 1, copies: 0 };
  saveMetaProgression(meta);
  return { meta, duplicate, progress: meta.owned[id]! };
}
export function equipMetaItem(id: EquipmentId) {
  const meta = loadMetaProgression();
  if (!meta.owned[id]) return meta;
  meta.equipped[EQUIPMENT[id].slot] = id;
  return saveMetaProgression(meta);
}
export function equipmentUpgradeCost(id: EquipmentId, meta = loadMetaProgression()): EquipmentUpgradeCost | null {
  const level = meta.owned[id]?.level ?? 0;
  return level <= 0 || level >= 5 ? null : UPGRADE_COSTS[level];
}
export function upgradeMetaItem(id: EquipmentId) {
  const meta = loadMetaProgression();
  const progress = meta.owned[id];
  if (!progress) return meta;
  const cost = equipmentUpgradeCost(id, meta);
  if (!cost || meta.gold < cost.gold || progress.copies < cost.copies) return meta;
  meta.gold -= cost.gold;
  progress.copies -= cost.copies;
  progress.level += 1;
  return saveMetaProgression(meta);
}

function ensureSkill(engine: GameEngine, key: 'fireArrow' | 'iceArrow' | 'multishot' | 'ricochet' | 'piercing', rank = 1) {
  engine.state.runSkills[key] = Math.max(skillRank(engine.state.runSkills, key), rank);
}
function addHealth(engine: GameEngine, amount: number) {
  engine.state.player.maxHp += amount;
  engine.state.player.hp += amount;
}

export function applyMetaLoadoutToNewRun(engine: GameEngine) {
  const meta = loadMetaProgression();
  const p = engine.state.player;
  for (const slot of EQUIPMENT_SLOTS) {
    const id = meta.equipped[slot];
    const level = Math.max(1, meta.owned[id]?.level ?? 1);
    if (id === 'ash-bow') p.attack = Math.round(p.attack * (1 + 0.06 * level));
    else if (id === 'ember-bow') ensureSkill(engine, 'fireArrow');
    else if (id === 'hunter-bow') { p.attack += 2 * level; p.speed *= 1 + 0.02 * level; }
    else if (id === 'frost-bow') { ensureSkill(engine, 'iceArrow'); p.attackRange += 3 * level; }
    else if (id === 'splinter-bow') { ensureSkill(engine, 'piercing'); p.attack += 2 * level; }
    else if (id === 'veil-bow') { ensureSkill(engine, 'ricochet'); p.speed *= 1 + 0.04 * level; }
    else if (id === 'warden-bow') { p.attack += 4 * level; p.defense += level; }
    else if (id === 'ranger-quiver') p.speed *= 1 + 0.03 * level;
    else if (id === 'black-quiver') ensureSkill(engine, 'multishot');
    else if (id === 'rune-quiver') ensureSkill(engine, 'ricochet');
    else if (id === 'frost-quiver') { ensureSkill(engine, 'iceArrow'); p.skillRange += 3 * level; }
    else if (id === 'splinter-quiver') { ensureSkill(engine, 'piercing'); p.attackRange += 3 * level; }
    else if (id === 'warden-quiver') { p.attackCooldown = Math.max(90, Math.round(p.attackCooldown * (1 - 0.04 * level))); p.defense += level; }
    else if (id === 'veil-key') { p.speed *= 1 + 0.04 * level; addHealth(engine, 2 * level); }
    else if (id === 'guardian-sigil') { addHealth(engine, 8 * level); p.defense += level; }
    else if (id === 'frost-grimoire') { ensureSkill(engine, 'iceArrow'); p.skillCooldown = Math.max(700, Math.round(p.skillCooldown * (1 - 0.04 * level))); }
    else if (id === 'ritual-shard') { ensureSkill(engine, 'ricochet'); p.skillRange += 4 * level; }
    else if (id === 'ash-amulet') { p.attack += 3 * level; addHealth(engine, 2 * level); }
    else if (id === 'depth-seal') { addHealth(engine, 5 * level); p.attackRange += 2 * level; }
    else if (id === 'veil-eye') { p.attack = Math.round(p.attack * (1 + 0.05 * level)); p.dodgeCooldown = Math.max(250, Math.round(p.dodgeCooldown * (1 - 0.03 * level))); }
    else if (id === 'ranger-cloak') { addHealth(engine, 5 * level); p.speed *= 1 + 0.02 * level; }
    else if (id === 'ash-armor') { p.attack += 2 * level; addHealth(engine, 3 * level); }
    else if (id === 'frost-armor') { addHealth(engine, 4 * level); p.skillRange += 3 * level; }
    else if (id === 'warden-armor') { p.defense += level; addHealth(engine, 6 * level); }
    else if (id === 'veil-mantle') { p.speed *= 1 + 0.03 * level; p.attackRange += 2 * level; }
    else if (id === 'depth-armor') { addHealth(engine, 8 * level); p.defense += Math.ceil(level / 2); }
  }
  p.speed = Math.round(p.speed);
  engine.saveNow('meta-loadout');
}
