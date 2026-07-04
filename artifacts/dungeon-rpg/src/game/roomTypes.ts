// 22 distinct room types with unique spawning rules and visual floors.

import { EnemyTypeName } from './sprites';

export type RoomType =
  | 'entrance'
  | 'exit'
  | 'treasure_room'
  | 'vault'
  | 'armory'
  | 'library'
  | 'throne_room'
  | 'boss_arena'
  | 'crypt'
  | 'catacomb'
  | 'cemetery'
  | 'barracks'
  | 'jail'
  | 'torture_chamber'
  | 'shrine'
  | 'chapel'
  | 'cathedral'
  | 'garden'
  | 'cave'
  | 'sewer'
  | 'laboratory'
  | 'forge';

export interface RoomTypeDef {
  label: string;
  /** Floor colour palette variant index (0-3) */
  floorVariant: number;
  /** Accent wall colour overlay (nullable) */
  wallTint?: string;
  /** Preferred enemy types, chosen randomly */
  enemyTypes: EnemyTypeName[];
  /** Chest spawn probability 0-1 */
  chestChance: number;
  /** Locked chest probability given a chest spawns */
  lockedChestChance: number;
  /** Enemy count modifier relative to base */
  enemyMult: number;
  /** True if no enemies should spawn */
  peaceful: boolean;
  /** Special decoration type (torch, shrine, skull) */
  decoration?: 'torch' | 'shrine' | 'skull' | 'forge' | 'bookshelf' | 'altar';
  /** Potion count bonus */
  potionBonus: number;
}

export const ROOM_TYPE_DEFS: Record<RoomType, RoomTypeDef> = {
  entrance: {
    label: 'Entrance',
    floorVariant: 0,
    enemyTypes: [],
    chestChance: 0,
    lockedChestChance: 0,
    enemyMult: 0,
    peaceful: true,
    decoration: 'torch',
    potionBonus: 0,
  },
  exit: {
    label: 'Exit Chamber',
    floorVariant: 0,
    wallTint: '#6633aa40',
    enemyTypes: ['demon', 'vampire'],
    chestChance: 0.4,
    lockedChestChance: 0.5,
    enemyMult: 1.5,
    peaceful: false,
    potionBonus: 0,
  },
  treasure_room: {
    label: 'Treasure Room',
    floorVariant: 0,
    enemyTypes: [],
    chestChance: 1.0,
    lockedChestChance: 0.3,
    enemyMult: 0,
    peaceful: true,
    potionBonus: 2,
  },
  vault: {
    label: 'Vault',
    floorVariant: 0,
    enemyTypes: ['golem'],
    chestChance: 1.0,
    lockedChestChance: 0.9,
    enemyMult: 0.5,
    peaceful: false,
    potionBonus: 1,
  },
  armory: {
    label: 'Armory',
    floorVariant: 0,
    wallTint: '#88441120',
    enemyTypes: ['goblin', 'orc'],
    chestChance: 0.6,
    lockedChestChance: 0.4,
    enemyMult: 1.0,
    peaceful: false,
    decoration: 'forge',
    potionBonus: 0,
  },
  library: {
    label: 'Library',
    floorVariant: 0,
    enemyTypes: ['vampire', 'skeleton'],
    chestChance: 0.5,
    lockedChestChance: 0.2,
    enemyMult: 0.6,
    peaceful: false,
    decoration: 'bookshelf',
    potionBonus: 1,
  },
  throne_room: {
    label: 'Throne Room',
    floorVariant: 0,
    wallTint: '#44004420',
    enemyTypes: ['vampire', 'demon', 'golem'],
    chestChance: 0.8,
    lockedChestChance: 0.6,
    enemyMult: 1.8,
    peaceful: false,
    decoration: 'altar',
    potionBonus: 0,
  },
  boss_arena: {
    label: 'Boss Arena',
    floorVariant: 3,
    wallTint: '#88000030',
    enemyTypes: ['boss', 'demon'],
    chestChance: 1.0,
    lockedChestChance: 0.0,
    enemyMult: 0.5,
    peaceful: false,
    potionBonus: 2,
  },
  crypt: {
    label: 'Crypt',
    floorVariant: 3,
    wallTint: '#00113320',
    enemyTypes: ['skeleton', 'vampire', 'goblin'],
    chestChance: 0.5,
    lockedChestChance: 0.5,
    enemyMult: 1.2,
    peaceful: false,
    decoration: 'skull',
    potionBonus: 0,
  },
  catacomb: {
    label: 'Catacomb',
    floorVariant: 3,
    enemyTypes: ['skeleton', 'goblin'],
    chestChance: 0.3,
    lockedChestChance: 0.3,
    enemyMult: 1.4,
    peaceful: false,
    decoration: 'skull',
    potionBonus: 0,
  },
  cemetery: {
    label: 'Cemetery',
    floorVariant: 2,
    enemyTypes: ['skeleton', 'vampire', 'slime'],
    chestChance: 0.4,
    lockedChestChance: 0.2,
    enemyMult: 1.3,
    peaceful: false,
    decoration: 'skull',
    potionBonus: 0,
  },
  barracks: {
    label: 'Barracks',
    floorVariant: 0,
    enemyTypes: ['goblin', 'orc', 'skeleton'],
    chestChance: 0.3,
    lockedChestChance: 0.1,
    enemyMult: 2.0,
    peaceful: false,
    potionBonus: 0,
  },
  jail: {
    label: 'Jail',
    floorVariant: 1,
    enemyTypes: ['goblin', 'skeleton'],
    chestChance: 0.5,
    lockedChestChance: 0.8,
    enemyMult: 0.8,
    peaceful: false,
    potionBonus: 0,
  },
  torture_chamber: {
    label: 'Torture Chamber',
    floorVariant: 3,
    wallTint: '#44000020',
    enemyTypes: ['skeleton', 'demon', 'goblin'],
    chestChance: 0.4,
    lockedChestChance: 0.4,
    enemyMult: 1.1,
    peaceful: false,
    decoration: 'skull',
    potionBonus: 0,
  },
  shrine: {
    label: 'Shrine',
    floorVariant: 2,
    enemyTypes: ['golem', 'vampire'],
    chestChance: 0.3,
    lockedChestChance: 0.1,
    enemyMult: 0.4,
    peaceful: false,
    decoration: 'shrine',
    potionBonus: 2,
  },
  chapel: {
    label: 'Chapel',
    floorVariant: 2,
    enemyTypes: [],
    chestChance: 0.4,
    lockedChestChance: 0.0,
    enemyMult: 0,
    peaceful: true,
    decoration: 'altar',
    potionBonus: 3,
  },
  cathedral: {
    label: 'Cathedral',
    floorVariant: 0,
    wallTint: '#220011',
    enemyTypes: ['vampire', 'demon', 'golem'],
    chestChance: 0.7,
    lockedChestChance: 0.5,
    enemyMult: 1.6,
    peaceful: false,
    decoration: 'torch',
    potionBonus: 0,
  },
  garden: {
    label: 'Garden',
    floorVariant: 2,
    enemyTypes: ['slime', 'spider'],
    chestChance: 0.5,
    lockedChestChance: 0.0,
    enemyMult: 0.6,
    peaceful: false,
    potionBonus: 3,
  },
  cave: {
    label: 'Cave',
    floorVariant: 1,
    enemyTypes: ['slime', 'spider', 'goblin'],
    chestChance: 0.2,
    lockedChestChance: 0.0,
    enemyMult: 1.0,
    peaceful: false,
    potionBonus: 1,
  },
  sewer: {
    label: 'Sewer',
    floorVariant: 1,
    wallTint: '#00330020',
    enemyTypes: ['slime', 'goblin', 'spider'],
    chestChance: 0.2,
    lockedChestChance: 0.0,
    enemyMult: 1.2,
    peaceful: false,
    potionBonus: 0,
  },
  laboratory: {
    label: 'Laboratory',
    floorVariant: 0,
    wallTint: '#00334420',
    enemyTypes: ['golem', 'vampire', 'spider'],
    chestChance: 0.6,
    lockedChestChance: 0.3,
    enemyMult: 0.8,
    peaceful: false,
    decoration: 'shrine',
    potionBonus: 1,
  },
  forge: {
    label: 'Forge',
    floorVariant: 0,
    wallTint: '#44220020',
    enemyTypes: ['orc', 'golem'],
    chestChance: 0.7,
    lockedChestChance: 0.2,
    enemyMult: 0.8,
    peaceful: false,
    decoration: 'forge',
    potionBonus: 0,
  },
};

/** Pool of non-special room types for random assignment */
const GENERIC_ROOM_POOL: RoomType[] = [
  'crypt', 'catacomb', 'cemetery', 'barracks', 'jail', 'torture_chamber',
  'shrine', 'chapel', 'garden', 'cave', 'sewer', 'laboratory', 'forge',
  'armory', 'library', 'vault', 'treasure_room', 'cathedral', 'throne_room', 'cemetery',
];

export function pickRoomType(roomIndex: number, totalRooms: number, floor: number, isBossFloor: boolean): RoomType {
  if (roomIndex === 0) return 'entrance';
  if (roomIndex === totalRooms - 1) return isBossFloor ? 'boss_arena' : 'exit';

  // Sprinkle some guaranteed specials
  if (roomIndex === 1) return 'treasure_room';
  if (totalRooms > 4 && roomIndex === Math.floor(totalRooms / 2)) {
    return floor > 3 ? 'shrine' : 'chapel';
  }

  // Floor-biased random selection
  const pool = floor >= 3
    ? GENERIC_ROOM_POOL
    : GENERIC_ROOM_POOL.filter(t => !['boss_arena', 'cathedral', 'throne_room', 'vault'].includes(t));

  const seed = (roomIndex * 7 + floor * 13) % pool.length;
  return pool[seed];
}
