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
  attackCooldown: number;
  /** Timestamp when this player was created (for animation) */
  spawnTime: number;
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
  targetX: number;
  targetY: number;
  nextAttackTime: number;
  flashUntil: number;
  /** Timestamp when this enemy spawned (for animation phase offset) */
  spawnTime: number;
}

export interface Chest extends Entity {
  type: 'chest';
  locked: boolean;
  opened: boolean;
  lootType: 'gold' | 'potion' | 'big_potion';
  lootValue: number;
  roomIndex: number;
}

export interface Item extends Entity {
  type: 'item';
  itemType: 'potion' | 'xp_orb';
  value: number;
  color: string;
}

export interface DamageNumber {
  id: string;
  x: number;
  y: number;
  value: string;
  color: string;
  lifeTime: number;
  maxLifeTime: number;
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
  type: 'sweep' | 'flash' | 'circle';
}
