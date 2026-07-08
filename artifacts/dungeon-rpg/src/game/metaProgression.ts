import type { GameEngine } from './runEngine';
import { skillRank } from './runSkills';

export type EquipmentSlot = 'bow' | 'quiver' | 'talisman';
export type EquipmentId =
  | 'ash-bow' | 'ember-bow' | 'hunter-bow'
  | 'ranger-quiver' | 'black-quiver' | 'rune-quiver'
  | 'veil-key' | 'guardian-sigil' | 'frost-grimoire';

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
};

export const EQUIPMENT: Record<EquipmentId, EquipmentDefinition> = {
  'ash-bow': {
    id: 'ash-bow', slot: 'bow', nameDe: 'Aschenbogen', nameEn: 'Ash Bow',
    descriptionDe: '+6 % Angriff pro Stufe', descriptionEn: '+6% attack per level', pack: 'weapons',
    assetPath: 'weapons/KayKit_FantasyWeaponsBits_1.0_FREE/Assets/gltf/bow_A_withString.gltf', unlockRank: 1, accent: '#d59b45',
  },
  'ember-bow': {
    id: 'ember-bow', slot: 'bow', nameDe: 'Glutbogen', nameEn: 'Ember Bow',
    descriptionDe: 'Startet jeden Run mit Feuerpfeil I', descriptionEn: 'Start each run with Fire Arrow I', pack: 'weapons',
    assetPath: 'weapons/KayKit_FantasyWeaponsBits_1.0_FREE/Assets/gltf/bow_B_withString.gltf', unlockRank: 3, accent: '#ff673d',
  },
  'hunter-bow': {
    id: 'hunter-bow', slot: 'bow', nameDe: 'Bogen des Jägers', nameEn: "Hunter's Bow",
    descriptionDe: '+2 Angriff und +2 % Bewegung pro Stufe', descriptionEn: '+2 attack and +2% movement per level', pack: 'adventurers',
    assetPath: 'adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf/bow_withString.gltf', unlockRank: 6, accent: '#a8d381',
  },
  'ranger-quiver': {
    id: 'ranger-quiver', slot: 'quiver', nameDe: 'Waldläuferköcher', nameEn: 'Ranger Quiver',
    descriptionDe: '+3 % Bewegung pro Stufe', descriptionEn: '+3% movement per level', pack: 'adventurers',
    assetPath: 'adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf/quiver.gltf', unlockRank: 1, accent: '#63c8d8',
  },
  'black-quiver': {
    id: 'black-quiver', slot: 'quiver', nameDe: 'Schwarzer Köcher', nameEn: 'Black Quiver',
    descriptionDe: 'Startet jeden Run mit Mehrfachpfeil I', descriptionEn: 'Start each run with Multishot I', pack: 'adventurers',
    assetPath: 'adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf/arrow_bow_bundle.gltf', unlockRank: 4, accent: '#8b78ba',
  },
  'rune-quiver': {
    id: 'rune-quiver', slot: 'quiver', nameDe: 'Runenköcher', nameEn: 'Rune Quiver',
    descriptionDe: 'Startet jeden Run mit Abpraller I', descriptionEn: 'Start each run with Ricochet I', pack: 'adventurers',
    assetPath: 'adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf/arrow_bow_bundle.gltf', unlockRank: 7, accent: '#b184ff',
  },
  'veil-key': {
    id: 'veil-key', slot: 'talisman', nameDe: 'Schleierschlüssel', nameEn: 'Veil Key',
    descriptionDe: '+4 % Bewegung und -2 % Dash-Cooldown pro Stufe', descriptionEn: '+4% movement and -2% dash cooldown per level', pack: 'dungeon',
    assetPath: 'dungeon/KayKit_DungeonRemastered_1.1_FREE/Assets/gltf/key.gltf', unlockRank: 1, accent: '#a58aff',
  },
  'guardian-sigil': {
    id: 'guardian-sigil', slot: 'talisman', nameDe: 'Wächtersiegel', nameEn: 'Guardian Sigil',
    descriptionDe: '+8 Leben und +1 Verteidigung pro Stufe', descriptionEn: '+8 health and +1 defense per level', pack: 'adventurers',
    assetPath: 'adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf/shield_badge_color.gltf', unlockRank: 5, accent: '#79d69d',
  },
  'frost-grimoire': {
    id: 'frost-grimoire', slot: 'talisman', nameDe: 'Frostgrimoire', nameEn: 'Frost Grimoire',
    descriptionDe: 'Startet jeden Run mit Frostpfeil I', descriptionEn: 'Start each run with Frost Arrow I', pack: 'adventurers',
    assetPath: 'adventurers/KayKit_Adventurers_2.0_FREE/Assets/gltf/spellbook_closed.gltf', unlockRank: 8, accent: '#78ddff',
  },
};

export type MetaProgression = {
  version: 1;
  rank: number;
  xp: number;
  dust: number;
  owned: Partial<Record<EquipmentId, number>>;
  equipped: Record<EquipmentSlot, EquipmentId>;
  rewardLedger: string[];
  currentRunId: string;
};

export type MetaReward = {
  xp: number;
  dust: number;
  rankBefore: number;
  rankAfter: number;
  item?: EquipmentId;
  duplicate?: boolean;
};

const META_KEY = 'dungeon-veil-meta';

const DEFAULT_META: MetaProgression = {
  version: 1,
  rank: 1,
  xp: 0,
  dust: 0,
  owned: { 'ash-bow': 1, 'ranger-quiver': 1, 'veil-key': 1 },
  equipped: { bow: 'ash-bow', quiver: 'ranger-quiver', talisman: 'veil-key' },
  rewardLedger: [],
  currentRunId: '',
};

export function xpForNextRank(rank: number) {
  return 100 + Math.max(0, rank - 1) * 65;
}

export function loadMetaProgression(): MetaProgression {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return structuredClone(DEFAULT_META);
    const parsed = JSON.parse(raw) as Partial<MetaProgression>;
    return {
      ...structuredClone(DEFAULT_META),
      ...parsed,
      owned: { ...DEFAULT_META.owned, ...(parsed.owned ?? {}) },
      equipped: { ...DEFAULT_META.equipped, ...(parsed.equipped ?? {}) },
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

export function beginMetaRun() {
  const meta = loadMetaProgression();
  meta.currentRunId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  meta.rewardLedger = meta.rewardLedger.filter(key => !key.startsWith(`${meta.currentRunId}:`));
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

function availableDrops(meta: MetaProgression) {
  return Object.values(EQUIPMENT).filter(item => item.unlockRank <= meta.rank && item.id !== 'ash-bow' && item.id !== 'ranger-quiver' && item.id !== 'veil-key');
}

export function rewardMetaRoomClear(chapter: number, floor: number): MetaReward | null {
  const meta = loadMetaProgression();
  if (!meta.currentRunId) beginMetaRun();
  const live = loadMetaProgression();
  const rewardKey = `${live.currentRunId}:${chapter}:${floor}`;
  if (live.rewardLedger.includes(rewardKey)) return null;
  live.rewardLedger.push(rewardKey);

  const boss = floor === 10;
  const xp = boss ? 130 + chapter * 20 : 14 + floor * 4 + Math.max(0, chapter - 1) * 8;
  let dust = boss ? 55 + chapter * 10 : 4 + Math.ceil(floor * 0.8);
  const rankBefore = live.rank;
  addRankXp(live, xp);

  let item: EquipmentId | undefined;
  let duplicate = false;
  const shouldDrop = boss || (floor >= 3 && Math.random() < 0.16);
  if (shouldDrop) {
    const pool = availableDrops(live);
    if (pool.length) {
      const unowned = pool.filter(candidate => !live.owned[candidate.id]);
      const dropPool = unowned.length ? unowned : pool;
      item = dropPool[Math.floor(Math.random() * dropPool.length)].id;
      duplicate = Boolean(live.owned[item]);
      if (duplicate) dust += 22 + (live.owned[item] ?? 1) * 6;
      else live.owned[item] = 1;
    }
  }

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
    else if (id === 'ranger-quiver') p.speed *= 1 + 0.03 * level;
    else if (id === 'black-quiver') ensureSkill(engine, 'multishot');
    else if (id === 'rune-quiver') ensureSkill(engine, 'ricochet');
    else if (id === 'veil-key') { p.speed *= 1 + 0.04 * level; p.dodgeCooldown = Math.max(0, p.dodgeCooldown - 18 * level); }
    else if (id === 'guardian-sigil') { p.maxHp += 8 * level; p.hp += 8 * level; p.defense += level; }
    else if (id === 'frost-grimoire') ensureSkill(engine, 'iceArrow');
  }

  p.speed = Math.round(p.speed);
  engine.saveNow('meta-loadout');
}
