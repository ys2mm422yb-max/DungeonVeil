export type EnemyType = 'slime' | 'goblin' | 'skeleton' | 'orc' | 'spider' | 'vampire' | 'demon' | 'golem' | 'boss';

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

export interface Player extends Entity {
  type: 'player';
  playerName: string;
  playerClass: 'archer';
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
  state: 'idle' | 'walk' | 'attack' | 'dead';
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
}

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
  avoidUntil?: number;
  avoidDirX?: number;
  avoidDirY?: number;
  avoidWaypointX?: number;
  avoidWaypointY?: number;
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
}

export interface Item extends Entity {
  type: 'item';
  itemType: string;
  value: number;
  color: string;
  pulseOffset?: number;
  equipmentId?: string;
  equipmentRarity?: string;
}

export interface DamageNumber {
  id: string;
  x: number;
  y: number;
  value: number;
  color: string;
  createdAt: number;
  critical?: boolean;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha?: number;
}

export interface VisualEffect {
  id: string;
  type: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  rotation?: number;
}
