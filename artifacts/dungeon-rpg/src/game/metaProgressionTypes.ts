import type { GameEngine } from './runEngine';

export type EquipmentSlot = 'bow' | 'quiver' | 'talisman' | 'armor';
export type CurrentEquipmentSlot = Exclude<EquipmentSlot, 'talisman'>;
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
  active?: boolean;
};

export type EquipmentCombatModifiers = {
  attackFlat: number;
  attackPercent: number;
  critChance: number;
  critDamageMultiplier: number;
  maxHp: number;
  defense: number;
  speedPercent: number;
  attackRange: number;
  attackSpeedPercent: number;
  attackCooldownMultiplier: number;
  dodgeCooldownMultiplier: number;
  grantedSkills: Record<string, never>;
};

export type EquipmentProgress = { level: number; copies: number };
/**
 * `talisman` is retained only as a compile-time bridge for old render adapters.
 * Normalized runtime objects assign `undefined` through a compatibility cast, so
 * JSON serialization omits the key and all current gameplay/profile paths use
 * bow, quiver and armor only.
 */
export type EquippedEquipment = Record<CurrentEquipmentSlot, EquipmentId> & { talisman: EquipmentId };
export type MetaProgression = {
  version: 4;
  rank: number;
  xp: number;
  dust: number;
  gold: number;
  owned: Partial<Record<EquipmentId, EquipmentProgress>>;
  equipped: EquippedEquipment;
  cosmeticUnlocks: EquipmentId[];
  migrationCompensation: { gold: number; dust: number; copies: number };
  rewardLedger: string[];
  currentRunId: string;
};
export type MetaReward = { xp: number; dust: number; gold: number; rankBefore: number; rankAfter: number; item?: EquipmentId; duplicate?: boolean; source?: EquipmentDropSource; rarity?: EquipmentRarity };
export type PendingEquipmentDrop = { item: EquipmentId; duplicate: boolean; source: EquipmentDropSource; rarity: EquipmentRarity };

export type MetaProgressionRuntime = {
  spawnEquipmentDrop(engine: GameEngine, drop: PendingEquipmentDrop, x: number, y: number): string;
};
