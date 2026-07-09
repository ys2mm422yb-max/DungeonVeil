import { ClassKey } from './classes';
import { EnemyTypeName } from './sprites';

export interface Entity {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
}

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
  state: 'idle' | 'moving' | 'attacking' | 'dodging' | 'dead';
  facing: { x: number; y: number };
  invincibleUntil: number;
  skillCooldown: number;
  dodgeCooldown: number;
  lastDodgeTime: number;
  attackCooldown: number;
  spawnTime: number;
  lastAttackTime: number;
  lastHitTime?: number;
  lastGuardTime?: number;
  lastGiftTime?: number;
  lastGiftKey?: string;
  relicAttackSpeedUntil?: number;
}

export type EnemyType = EnemyTypeName;

export interface Enemy extends Entity {
  type: 'enemy';
  enemyType: EnemyType;
  hp: number;
  maxHp: number;
  attack: number;
  defense?: number;
  speed: number;
  color: string;
  state: 'patrol' | 'chase' | 'attack' | 'dead';
  isDead: boolean;
  targetX: number;
  targetY: number;
  nextAttackTime: number;
  flashUntil: number;
  spawnTime: number;
  lastAttackTime: number;
  deathTime: number;
  deathDuration?: number;
  lastHitTime?: number;
  hitFromX?: number;
  hitFromY?: number;
  burnUntil?: number;
  nextBurnTick?: number;
  burnDamage?: number;
  burnRanks?: number;
  frostUntil?: number;
  frostSlow?: number;
  stuckSince?: number;
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
  itemType: 'potion' | 'xp_orb';
  value: number;
  color: string;
  spawnTime: number;
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
  fade?: boolean;
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
  type: 'sweep' | 'flash' | 'circle' | 'slash' | 'beam' | 'dash' | 'pickup';
  angle?: number;
  width?: number;
  element?: 'fire' | 'ice' | 'arcane' | 'piercing' | 'normal';
  fromEnemyId?: string;
  toEnemyId?: string;
}
