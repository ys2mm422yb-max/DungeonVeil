export type ObjAssetSpec = {
  folder: 'dungeon' | 'props' | 'weapons';
  file: string;
  targetSize: number;
};

export type MonsterAssetSpec = {
  file: string;
  targetSize: number;
};

export const OBJ_LIBRARY_ROOT = '/assets/3d/library/';
export const MONSTER_LIBRARY_ROOT = '/assets/3d/library/monsters/';

export const DUNGEON_ASSETS: Record<string, ObjAssetSpec> = {
  arch: { folder: 'dungeon', file: 'Arch', targetSize: 4.6 },
  archDoor: { folder: 'dungeon', file: 'Arch_Door', targetSize: 4.6 },
  archBars: { folder: 'dungeon', file: 'Arch_bars', targetSize: 4.6 },
  wall: { folder: 'dungeon', file: 'Wall_Modular', targetSize: 4.1 },
  wallCover: { folder: 'dungeon', file: 'WallCover_Modular', targetSize: 4.1 },
  decorativeWall: { folder: 'dungeon', file: 'Decorative_Wall', targetSize: 4.0 },
  floor: { folder: 'dungeon', file: 'Floor_Modular', targetSize: 4.0 },
  floorBricks: { folder: 'dungeon', file: 'Floor_BricksSeparate', targetSize: 4.0 },
  stairs: { folder: 'dungeon', file: 'Stairs_Modular', targetSize: 3.0 },
  column: { folder: 'dungeon', file: 'Column', targetSize: 3.2 },
  column2: { folder: 'dungeon', file: 'Column2', targetSize: 3.2 },
  pedestal: { folder: 'dungeon', file: 'Pedestal', targetSize: 1.6 },
  statueHorse: { folder: 'dungeon', file: 'Statue_Horse', targetSize: 3.0 },
  banner: { folder: 'dungeon', file: 'Banner', targetSize: 2.4 },
  bannerWall: { folder: 'dungeon', file: 'Banner_wall', targetSize: 2.2 },
  barrel: { folder: 'dungeon', file: 'Barrel', targetSize: 1.0 },
  barrel2: { folder: 'dungeon', file: 'Barrel2', targetSize: 1.0 },
  crate: { folder: 'dungeon', file: 'Crate', targetSize: 1.0 },
  chest: { folder: 'dungeon', file: 'Chest', targetSize: 1.2 },
  chestGold: { folder: 'dungeon', file: 'Chest_Gold', targetSize: 1.25 },
  cobweb: { folder: 'dungeon', file: 'Cobweb', targetSize: 1.8 },
  cobweb2: { folder: 'dungeon', file: 'Cobweb2', targetSize: 1.8 },
  torch: { folder: 'dungeon', file: 'Torch', targetSize: 1.7 },
  woodfire: { folder: 'dungeon', file: 'Woodfire', targetSize: 1.35 },
  trapEmpty: { folder: 'dungeon', file: 'Trap_empty', targetSize: 2.0 },
  trapSpikes: { folder: 'dungeon', file: 'Trap_spikes', targetSize: 2.0 },
  trapdoor: { folder: 'dungeon', file: 'Trapdoor', targetSize: 2.0 },
  vase: { folder: 'dungeon', file: 'Vase', targetSize: 0.85 },
  skull: { folder: 'dungeon', file: 'Skull', targetSize: 0.55 },
  swordWallMount: { folder: 'dungeon', file: 'Sword_WallMount', targetSize: 1.4 },
  tableBig: { folder: 'dungeon', file: 'Table_Big', targetSize: 2.2 },
  tableSmall: { folder: 'dungeon', file: 'Table_Small', targetSize: 1.6 },
};

export const PROP_ASSETS: Record<string, ObjAssetSpec> = {
  anvil: { folder: 'props', file: 'Anvil', targetSize: 1.1 },
  barrelApples: { folder: 'props', file: 'Barrel_Apples', targetSize: 1.0 },
  bench: { folder: 'props', file: 'Bench', targetSize: 1.8 },
  bookcase: { folder: 'props', file: 'Bookcase_2', targetSize: 2.3 },
  bookStand: { folder: 'props', file: 'BookStand', targetSize: 1.35 },
  cage: { folder: 'props', file: 'Cage_Small', targetSize: 1.6 },
  cauldron: { folder: 'props', file: 'Cauldron', targetSize: 1.15 },
  candleTriple: { folder: 'props', file: 'CandleStick_Triple', targetSize: 0.8 },
  chandelier: { folder: 'props', file: 'Chandelier', targetSize: 1.5 },
  chestLegendary: { folder: 'props', file: 'Chest_Legendary', targetSize: 1.35 },
  crateWood: { folder: 'props', file: 'Crate_Wooden', targetSize: 1.0 },
  dummy: { folder: 'props', file: 'Dummy', targetSize: 1.7 },
  lanternWall: { folder: 'props', file: 'Lantern_Wall', targetSize: 1.0 },
  potion: { folder: 'props', file: 'Potion_1', targetSize: 0.5 },
  rope: { folder: 'props', file: 'Rope_1', targetSize: 0.8 },
  shelfArch: { folder: 'props', file: 'Shelf_Arch', targetSize: 2.1 },
  shelfBottles: { folder: 'props', file: 'Shelf_Small_Bottles', targetSize: 1.7 },
  shieldWood: { folder: 'props', file: 'Shield_Wooden', targetSize: 1.0 },
  torchMetal: { folder: 'props', file: 'Torch_Metal', targetSize: 1.5 },
  weaponStand: { folder: 'props', file: 'WeaponStand', targetSize: 2.2 },
  workbench: { folder: 'props', file: 'Workbench', targetSize: 2.3 },
  workbenchDrawers: { folder: 'props', file: 'Workbench_Drawers', targetSize: 2.3 },
};

export const WEAPON_ASSETS: Record<string, ObjAssetSpec> = {
  bowWooden: { folder: 'weapons', file: 'Bow_Wooden', targetSize: 1.3 },
  bowWooden2: { folder: 'weapons', file: 'Bow_Wooden2', targetSize: 1.3 },
  bowGolden: { folder: 'weapons', file: 'Bow_Golden', targetSize: 1.3 },
  bowEvil: { folder: 'weapons', file: 'Bow_Evil', targetSize: 1.3 },
  arrow: { folder: 'weapons', file: 'Arrow', targetSize: 1.0 },
};

export const MONSTER_ASSETS: Record<string, MonsterAssetSpec> = {
  bat: { file: 'Bat.fbx', targetSize: 1.25 },
  skeleton: { file: 'Skeleton.fbx', targetSize: 1.7 },
  slime: { file: 'Slime.fbx', targetSize: 1.0 },
  dragon: { file: 'Dragon.fbx', targetSize: 3.4 },
};

export const ROOM_ASSETS: Record<string, ObjAssetSpec> = {
  ...DUNGEON_ASSETS,
  ...PROP_ASSETS,
  ...WEAPON_ASSETS,
};
