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
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  level: number;
  xp: number;
  color: string;
  state: 'idle' | 'moving' | 'attacking' | 'dodging' | 'dead';
  facing: { x: number; y: number };
  invincibleUntil: number;
  skillCooldown: number;
  dodgeCooldown: number;
  attackCooldown: number;
}

export type EnemyType = 'slime' | 'skeleton' | 'demon';

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
