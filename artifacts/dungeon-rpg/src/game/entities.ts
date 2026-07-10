import { ClassKey } from './classes';
import { EnemyTypeName } from './sprites';
import type { VeilRelicId } from './veilRelics';
import type { EquipmentDropSource, EquipmentId, EquipmentRarity } from './metaProgression';

export interface Entity {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
}

export type PlayerState = 'idle' | 'moving' | 'attacking' | 'dodging' | 'hurt' | 'dead';

export interface Player extends Entity {
  type: 'player';
  playerName: string;
  playerClass: ClassKey;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  attackRange: number;
  skillRange: number;
  level: number;
  xp: number;
  color: string;
  state: PlayerState;
  facing: { x: number; y: number };
  invincibleUntil: number;
  skillCooldown: number;
  dodgeCooldown: number;
  lastDodgeTime: number;
  attackCooldown: number;
  spawnTime: number;
  lastAttackTime: number;
  lastHitTime: number;
  lastGuardTime: number;
  lastGiftTime: number;
  lastGiftKey: string;
  relicAttackSpeedUntil?: number;
}

export type EnemyType = EnemyTypeName;
export type EnemyState = 'idle' | 'chase' | 'attack' | 'hurt' | 'dead';

export interface Enemy extends Entity {
  type: 'enemy';
  enemyType: EnemyType;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  color: string;
  state: EnemyState;
  targetX: number;
  targetY: number;
  nextAttackTime: number;
  flashUntil: number;
  spawnTime: number;
  lastAttackTime: number;
  deathTime: number;
  deathDuration: number;
  isDead: boolean;
  lastHitTime: number;
  hitFromX?: number;
  hitFromY?: number;
  burnRanks?: number;
  burnDamage?: number;
  burnUntil?: number;
  nextBurnTick?: number;
  frostUntil?: number;
  frostSlow?: number;
  lastProgressX?: number;
  lastProgressY?: number;
  lastProgressTime?: number;
  isHuntTarget?: boolean;
  huntName?: string;
  huntReward?: number;
  huntVisualVariant?: number;
}

export interface Chest extends Entity {
  type: 'chest';
  locked: boolean;
  opened: boolean;
  lootType: 'gold' | 'potion' | 'big_potion';
  lootValue: number;
  roomIndex: number;
  openTime: number;
}

export interface Item extends Entity {
  type: 'item';
  itemType: 'potion' | 'xp_orb' | 'relic' | 'equipment';
  value: number;
  color: string;
  spawnTime: number;
  relicId?: VeilRelicId;
  equipmentId?: EquipmentId;
  equipmentRarity?: EquipmentRarity;
  equipmentSource?: EquipmentDropSource;
  isNewEquipment?: boolean;
}

export interface DamageNumber {
  id: string;
  x: number;
  y: number;
  value: string;
  color: string;
  lifeTime: number;
  maxLifeTime: number;
  scale?: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  lifeTime: number;
  maxLifeTime: number;
  size: number;
  drag?: number;
  gravity?: number;
}

export interface VisualEffect {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  lifeTime: number;
  maxLifeTime: number;
  type: 'circle' | 'beam' | 'pickup' | 'dash';
  angle?: number;
  width?: number;
  element?: 'normal' | 'fire' | 'ice' | 'arcane' | 'piercing';
  fromEnemyId?: string;
  toEnemyId?: string;
}
