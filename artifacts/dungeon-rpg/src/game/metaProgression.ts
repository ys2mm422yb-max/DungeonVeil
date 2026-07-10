import type { GameEngine } from './runEngine';
import { skillRank } from './runSkills';
import { isBossRoom } from './chapterRun';

export type EquipmentSlot = 'bow' | 'quiver' | 'talisman';
export type EquipmentRarity = 'common' | 'uncommon' | 'rare' | 'epic';
export type EquipmentSource = 'depths' | 'hunt' | 'warden' | 'ritual' | 'forge';
export type EquipmentId =
  | 'ash-bow' | 'ember-bow' | 'hunter-bow' | 'bone-string' | 'warden-bow' | 'frost-string'
  | 'ranger-quiver' | 'black-quiver' | 'rune-quiver' | 'ember-quiver' | 'splinter-quiver' | 'hunt-quiver'
  | 'veil-key' | 'guardian-sigil' | 'frost-grimoire' | 'ash-mark' | 'blood-stone' | 'rune-compass' | 'broken-oath' | 'depth-heart';

export type EquipmentDefinition = {
  id: EquipmentId;
  slot: EquipmentSlot;
  nameDe: string;
  nameEn: string;
  descriptionDe: string;
  descriptionEn: string;
  pack: 'adventurers' | 'weapons' | 'dungeon' | 'tools' | 'halloween';
  assetPath: string;
  unlockRank: number;
  accent: string;
  rarity: EquipmentRarity;
  source: EquipmentSource;
};

const ADV = 'adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf';
const WPN = 'weapons/KayKit_FantasyWeaponsBits_1.0_FREE/Assets/gltf';
const DUN = 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf';
const TLS = 'tools/Assets/gltf';
const HAL = 'halloween/KayKit_HalloweenBits_1.0_FREE/Assets/gltf';

export const EQUIPMENT: Record<EquipmentId, EquipmentDefinition> = {
  'ash-bow': { id: 'ash-bow', slot: 'bow', nameDe: 'Aschenbogen', nameEn: 'Ash Bow', descriptionDe: '+6 % Angriff pro Stufe', descriptionEn: '+6% attack per level', pack: 'adventurers', assetPath: `${ADV}/bow_withString.gltf`, unlockRank: 1, accent: '#d59b45', rarity: 'common', source: 'depths' },
  'ember-bow': { id: 'ember-bow', slot: 'bow', nameDe: 'Glutbogen', nameEn: 'Ember Bow', descriptionDe: 'Startet jeden Run mit Feuerpfeil I', descriptionEn: 'Start each run with Fire Arrow I', pack: 'weapons', assetPath: `${WPN}/bow_A_withString.gltf`, unlockRank: 3, accent: '#ff673d', rarity: 'uncommon', source: 'forge' },
  'hunter-bow': { id: 'hunter-bow', slot: 'bow', nameDe: 'Bogen des Jägers', nameEn: "Hunter's Bow", descriptionDe: '+2 Angriff und +2 % Bewegung pro Stufe', descriptionEn: '+2 attack and +2% movement per level', pack: 'weapons', assetPath: `${WPN}/bow_B_withString.gltf`, unlockRank: 5, accent: '#a8d381', rarity: 'rare', source: 'hunt' },
  'bone-string': { id: 'bone-string', slot: 'bow', nameDe: 'Knochensehne', nameEn: 'Bone String', descriptionDe: '+4 % Angriff und +3 Leben pro Stufe', descriptionEn: '+4% attack and +3 health per level', pack: 'adventurers', assetPath: `${ADV}/bow_withString.gltf`, unlockRank: 4, accent: '#d9c7a4', rarity: 'uncommon', source: 'depths' },
  'warden-bow': { id: 'warden-bow', slot: 'bow', nameDe: 'Wächterbogen', nameEn: 'Warden Bow', descriptionDe: '+3 Angriff und +1 Verteidigung pro Stufe', descriptionEn: '+3 attack and +1 defense per level', pack: 'weapons', assetPath: `${WPN}/bow_B_withString.gltf`, unlockRank: 7, accent: '#d5b55c', rarity: 'epic', source: 'warden' },
  'frost-string': { id: 'frost-string', slot: 'bow', nameDe: 'Frostsehne', nameEn: 'Frost String', descriptionDe: 'Startet mit Frostpfeil I und +2 % Angriff pro Stufe', descriptionEn: 'Start with Frost Arrow I and +2% attack per level', pack: 'weapons', assetPath: `${WPN}/bow_A_withString.gltf`, unlockRank: 8, accent: '#78ddff', rarity: 'rare', source: 'ritual' },

  'ranger-quiver': { id: 'ranger-quiver', slot: 'quiver', nameDe: 'Waldläuferköcher', nameEn: 'Ranger Quiver', descriptionDe: '+3 % Bewegung pro Stufe', descriptionEn: '+3% movement per level', pack: 'adventurers', assetPath: `${ADV}/quiver.gltf`, unlockRank: 1, accent: '#63c8d8', rarity: 'common', source: 'depths' },
  'black-quiver': { id: 'black-quiver', slot: 'quiver', nameDe: 'Schwarzer Köcher', nameEn: 'Black Quiver', descriptionDe: 'Startet jeden Run mit Mehrfachpfeil I', descriptionEn: 'Start each run with Multishot I', pack: 'adventurers', assetPath: `${ADV}/arrow_bow_bundle.gltf`, unlockRank: 4, accent: '#8b78ba', rarity: 'uncommon', source: 'depths' },
  'rune-quiver': { id: 'rune-quiver', slot: 'quiver', nameDe: 'Runenköcher', nameEn: 'Rune Quiver', descriptionDe: 'Startet jeden Run mit Abpraller I', descriptionEn: 'Start each run with Ricochet I', pack: 'weapons', assetPath: `${WPN}/arrow_B.gltf`, unlockRank: 7, accent: '#b184ff', rarity: 'rare', source: 'ritual' },
  'ember-quiver': { id: 'ember-quiver', slot: 'quiver', nameDe: 'Glutköcher', nameEn: 'Ember Quiver', descriptionDe: 'Feuerpfeil I und +2 % Bewegung pro Stufe', descriptionEn: 'Fire Arrow I and +2% movement per level', pack: 'weapons', assetPath: `${WPN}/arrow_A.gltf`, unlockRank: 5, accent: '#ff7448', rarity: 'rare', source: 'forge' },
  'splinter-quiver': { id: 'splinter-quiver', slot: 'quiver', nameDe: 'Splitterköcher', nameEn: 'Splinter Quiver', descriptionDe: 'Mehrfachpfeil I und +1 Angriff pro Stufe', descriptionEn: 'Multishot I and +1 attack per level', pack: 'adventurers', assetPath: `${ADV}/arrow_crossbow_bundle.gltf`, unlockRank: 6, accent: '#d8b36b', rarity: 'rare', source: 'depths' },
  'hunt-quiver': { id: 'hunt-quiver', slot: 'quiver', nameDe: 'Jagdköcher', nameEn: 'Hunt Quiver', descriptionDe: '+4 % Bewegung und +1 Angriff pro Stufe', descriptionEn: '+4% movement and +1 attack per level', pack: 'adventurers', assetPath: `${ADV}/arrow_bow_bundle.gltf`, unlockRank: 6, accent: '#85c67a', rarity: 'epic', source: 'hunt' },

  'veil-key': { id: 'veil-key', slot: 'talisman', nameDe: 'Schleierschlüssel', nameEn: 'Veil Key', descriptionDe: '+4 % Bewegung und +2 Leben pro Stufe', descriptionEn: '+4% movement and +2 health per level', pack: 'dungeon', assetPath: `${DUN}/key.gltf`, unlockRank: 1, accent: '#a58aff', rarity: 'common', source: 'depths' },
  'guardian-sigil': { id: 'guardian-sigil', slot: 'talisman', nameDe: 'Wächtersiegel', nameEn: 'Guardian Sigil', descriptionDe: '+8 Leben und +1 Verteidigung pro Stufe', descriptionEn: '+8 health and +1 defense per level', pack: 'adventurers', assetPath: `${ADV}/shield_badge_color.gltf`, unlockRank: 5, accent: '#79d69d', rarity: 'rare', source: 'warden' },
  'frost-grimoire': { id: 'frost-grimoire', slot: 'talisman', nameDe: 'Frostgrimoire', nameEn: 'Frost Grimoire', descriptionDe: 'Startet jeden Run mit Frostpfeil I', descriptionEn: 'Start each run with Frost Arrow I', pack: 'adventurers', assetPath: `${ADV}/spellbook_closed.gltf`, unlockRank: 8, accent: '#78ddff', rarity: 'epic', source: 'ritual' },
  'ash-mark': { id: 'ash-mark', slot: 'talisman', nameDe: 'Aschenmarke', nameEn: 'Ash Mark', descriptionDe: '+5 % Angriff pro Stufe', descriptionEn: '+5% attack per level', pack: 'halloween', assetPath: `${HAL}/plaque.gltf`, unlockRank: 3, accent: '#d98c57', rarity: 'uncommon', source: 'depths' },
  'blood-stone': { id: 'blood-stone', slot: 'talisman', nameDe: 'Blutstein', nameEn: 'Blood Stone', descriptionDe: '+6 Leben und +2 Angriff pro Stufe', descriptionEn: '+6 health and +2 attack per level', pack: 'dungeon', assetPath: `${DUN}/keyring.gltf`, unlockRank: 6, accent: '#d84b4b', rarity: 'rare', source: 'ritual' },
  'rune-compass': { id: 'rune-compass', slot: 'talisman', nameDe: 'Runenkompass', nameEn: 'Rune Compass', descriptionDe: '+3 % Bewegung und Abpraller I', descriptionEn: '+3% movement and Ricochet I', pack: 'tools', assetPath: `${TLS}/compass_base.gltf`, unlockRank: 7, accent: '#a979ff', rarity: 'rare', source: 'ritual' },
  'broken-oath': { id: 'broken-oath', slot: 'talisman', nameDe: 'Gebrochener Eid', nameEn: 'Broken Oath', descriptionDe: '+2 Verteidigung und +3 Angriff pro Stufe', descriptionEn: '+2 defense and +3 attack per level', pack: 'adventurers', assetPath: `${ADV}/shield_badge.gltf`, unlockRank: 9, accent: '#c2b6a0', rarity: 'epic', source: 'warden' },
  'depth-heart': { id: 'depth-heart', slot: 'talisman', nameDe: 'Herz des Tiefengangs', nameEn: 'Heart of the Depths', descriptionDe: '+10 Leben und +2 % Bewegung pro Stufe', descriptionEn: '+10 health and +2% movement per level', pack: 'dungeon', assetPath: `${DUN}/coin_stack_small.gltf`, unlockRank: 10, accent: '#8f67e8', rarity: 'epic', source: 'depths' },
};

export type MetaProgression = {
  version: 2;
  rank: number;
  xp: number;
  dust: number;
  owned: Partial<Record<EquipmentId, number>>;
  equipped: Record<EquipmentSlot, EquipmentId>;
  seenItems: EquipmentId[];
  rewardLedger: string[];
  currentRunId: string;
};

export type MetaReward = { xp: number; dust: number; rankBefore: number; rankAfter: number; item?: EquipmentId; duplicate?: boolean; };

const META_KEY = 'dungeon-veil-meta';
const DEFAULT_META: MetaProgression = {
  version: 2,
  rank: 1,
  xp: 0,
  dust: 0,
  owned: { 'ash-bow': 1, 'ranger-quiver': 1, 'veil-key': 1 },
  equipped: { bow: 'ash-bow', quiver: 'ranger-quiver', talisman: 'veil-key' },
  seenItems: ['ash-bow', 'ranger-quiver', 'veil-key'],
  rewardLedger: [],
  currentRunId: '',
};

export function xpForNextRank(rank: number) { return 100 + Math.max(0, rank - 1) * 65; }

export function loadMetaProgression(): MetaProgression {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return structuredClone(DEFAULT_META);
    const parsed = JSON.parse(raw) as Partial<MetaProgression>;
    const owned = { ...DEFAULT_META.owned, ...(parsed.owned ?? {}) };
    const ownedIds = Object.keys(owned).filter(id => Boolean(owned[id as EquipmentId])) as EquipmentId[];
    return {
      ...structuredClone(DEFAULT_META),
      ...parsed,
      version: 2,
      owned,
      equipped: { ...DEFAULT_META.equipped, ...(parsed.equipped ?? {}) },
      seenItems: Array.isArray(parsed.seenItems) ? parsed.seenItems.filter(id => id in EQUIPMENT) : ownedIds,
      rewardLedger: Array.isArray(parsed.rewardLedger) ? parsed.rewardLedger.slice(-240) : [],
    };
  } catch {
    return structuredClone(DEFAULT_META);
  }
}

export function saveMetaProgression(meta: MetaProgression) {
  localStorage.setItem(META_KEY, JSON.stringify({ ...meta, rewardLedger: meta.rewardLedger.slice(-240) }));
  window.dispatchEvent(new Event('dungeon-veil-meta-changed'));
  return meta;
}

export function markMetaItemSeen(id: EquipmentId) {
  const meta = loadMetaProgression();
  if (!meta.seenItems.includes(id)) meta.seenItems.push(id);
  return saveMetaProgression(meta);
}

export function beginMetaRun() {
  const meta = loadMetaProgression();
  meta.currentRunId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  saveMetaProgression(meta);
  return meta.currentRunId;
}

function addRankXp(meta: MetaProgression, xp: number) {
  meta.xp += xp;
  while (meta.xp >= xpForNextRank(meta.rank)) { meta.xp -= xpForNextRank(meta.rank); meta.rank++; }
}

function availableDrops(meta: MetaProgression): EquipmentDefinition[] {
  return Object.values(EQUIPMENT).filter(item => item.unlockRank <= meta.rank && !['ash-bow', 'ranger-quiver', 'veil-key'].includes(item.id));
}

export function rewardMetaRoomClear(chapter: number, floor: number): MetaReward | null {
  const meta = loadMetaProgression();
  if (!meta.currentRunId) beginMetaRun();
  const live = loadMetaProgression();
  const rewardKey = `${live.currentRunId}:${chapter}:${floor}`;
  if (live.rewardLedger.includes(rewardKey)) return null;
  live.rewardLedger.push(rewardKey);

  const boss = isBossRoom(floor);
  const finalBoss = floor === 20;
  const xp = finalBoss ? 260 + chapter * 30 : boss ? 130 + chapter * 20 : 14 + floor * 4 + Math.max(0, chapter - 1) * 8;
  let dust = finalBoss ? 105 + chapter * 15 : boss ? 55 + chapter * 10 : 4 + Math.ceil(floor * 0.8);
  const rankBefore = live.rank;
  addRankXp(live, xp);

  let item: EquipmentId | undefined;
  let duplicate = false;
  const shouldDrop = boss || (floor >= 3 && Math.random() < 0.2);
  if (shouldDrop) {
    const pool = availableDrops(live);
    const weighted: EquipmentDefinition[] = [];
    for (const candidate of pool) {
      const copies = candidate.rarity === 'common' ? 5 : candidate.rarity === 'uncommon' ? 4 : candidate.rarity === 'rare' ? 2 : 1;
      const sourceBoost = (candidate.source === 'warden' && boss)
        || (candidate.source === 'forge' && [6, 18].includes(floor))
        || (candidate.source === 'ritual' && [9, 15, 19].includes(floor)) ? 3 : 1;
      for (let index = 0; index < copies * sourceBoost; index++) weighted.push(candidate);
    }
    const unowned = weighted.filter(candidate => !live.owned[candidate.id]);
    const dropPool: EquipmentDefinition[] = unowned.length ? unowned : weighted;
    const chosen = dropPool[Math.floor(Math.random() * dropPool.length)];
    if (chosen) {
      item = chosen.id;
      duplicate = Boolean(live.owned[item]);
      if (duplicate) dust += 22 + (live.owned[item] ?? 1) * 6;
      else live.owned[item] = 1;
    }
  }

  live.dust += dust;
  saveMetaProgression(live);
  return { xp, dust, rankBefore, rankAfter: live.rank, item, duplicate };
}

export function equipMetaItem(id: EquipmentId) {
  const meta = loadMetaProgression();
  if (!meta.owned[id]) return meta;
  meta.equipped[EQUIPMENT[id].slot] = id;
  return saveMetaProgression(meta);
}

export function upgradeMetaItem(id: EquipmentId) {
  const meta = loadMetaProgression();
  const level = meta.owned[id] ?? 0;
  if (level <= 0 || level >= 5) return meta;
  const cost = 35 + level * 30;
  if (meta.dust < cost) return meta;
  meta.dust -= cost;
  meta.owned[id] = level + 1;
  return saveMetaProgression(meta);
}

export function equipmentUpgradeCost(id: EquipmentId, meta = loadMetaProgression()) {
  const level = meta.owned[id] ?? 0;
  return level <= 0 || level >= 5 ? 0 : 35 + level * 30;
}

function ensureSkill(engine: GameEngine, key: 'fireArrow' | 'iceArrow' | 'multishot' | 'ricochet', rank = 1) {
  engine.state.runSkills[key] = Math.max(skillRank(engine.state.runSkills, key), rank);
}

export function applyMetaLoadoutToNewRun(engine: GameEngine) {
  const meta = loadMetaProgression();
  const p = engine.state.player;

  for (const slot of ['bow', 'quiver', 'talisman'] as EquipmentSlot[]) {
    const id = meta.equipped[slot];
    const level = Math.max(1, meta.owned[id] ?? 1);
    if (id === 'ash-bow') p.attack = Math.round(p.attack * (1 + 0.06 * level));
    else if (id === 'ember-bow') ensureSkill(engine, 'fireArrow');
    else if (id === 'hunter-bow') { p.attack += 2 * level; p.speed *= 1 + 0.02 * level; }
    else if (id === 'bone-string') { p.attack = Math.round(p.attack * (1 + 0.04 * level)); p.maxHp += 3 * level; p.hp += 3 * level; }
    else if (id === 'warden-bow') { p.attack += 3 * level; p.defense += level; }
    else if (id === 'frost-string') { ensureSkill(engine, 'iceArrow'); p.attack = Math.round(p.attack * (1 + 0.02 * level)); }
    else if (id === 'ranger-quiver') p.speed *= 1 + 0.03 * level;
    else if (id === 'black-quiver') ensureSkill(engine, 'multishot');
    else if (id === 'rune-quiver') ensureSkill(engine, 'ricochet');
    else if (id === 'ember-quiver') { ensureSkill(engine, 'fireArrow'); p.speed *= 1 + 0.02 * level; }
    else if (id === 'splinter-quiver') { ensureSkill(engine, 'multishot'); p.attack += level; }
    else if (id === 'hunt-quiver') { p.speed *= 1 + 0.04 * level; p.attack += level; }
    else if (id === 'veil-key') { p.speed *= 1 + 0.04 * level; p.maxHp += 2 * level; p.hp += 2 * level; }
    else if (id === 'guardian-sigil') { p.maxHp += 8 * level; p.hp += 8 * level; p.defense += level; }
    else if (id === 'frost-grimoire') ensureSkill(engine, 'iceArrow');
    else if (id === 'ash-mark') p.attack = Math.round(p.attack * (1 + 0.05 * level));
    else if (id === 'blood-stone') { p.maxHp += 6 * level; p.hp += 6 * level; p.attack += 2 * level; }
    else if (id === 'rune-compass') { p.speed *= 1 + 0.03 * level; ensureSkill(engine, 'ricochet'); }
    else if (id === 'broken-oath') { p.defense += 2 * level; p.attack += 3 * level; }
    else if (id === 'depth-heart') { p.maxHp += 10 * level; p.hp += 10 * level; p.speed *= 1 + 0.02 * level; }
  }

  p.speed = Math.round(p.speed);
  engine.saveNow('meta-loadout');
}
