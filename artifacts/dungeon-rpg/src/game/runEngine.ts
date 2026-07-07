import { CLASS_DEFS, ClassKey } from './classes';
import { DungeonMap, TILE_SIZE, isWalkable, TileType } from './dungeon';
import { CHAPTER_ROOMS, generateRunRoom } from './chapterRun';
import { saveGame, SaveData } from './saveManager';
import { Enemy, EnemyType, Item, Chest, DamageNumber, Particle, Player, VisualEffect } from './entities';
import { makeHitSpark, makeParticles, makeStepDust, distance } from './combat';
import { UpgradeKey } from '../i18n/translations';

export interface RunGameState {
  status: 'playing' | 'gameover' | 'levelup' | 'paused';
  floor: number;
  chapter: number;
  map: DungeonMap;
  inDungeon: boolean;
  player: Player;
  enemies: Enemy[];
  items: Item[];
  chests: Chest[];
  damageNumbers: DamageNumber[];
  particles: Particle[];
  effects: VisualEffect[];
  upgradeChoices: UpgradeKey[];
  runSkills: Partial<Record<UpgradeKey, number>>;
  killCount: number;
  camera: { x: number; y: number };
}

const ENEMY_STATS: Record<EnemyType, { hp: number; attack: number; defense: number; speed: number; size: number; xp: number; color: string }> = {
  slime: { hp: 24, attack: 4, defense: 0, speed: 42, size: 24, xp: 18, color: '#43c968' },
  goblin: { hp: 34, attack: 6, defense: 1, speed: 68, size: 23, xp: 24, color: '#89a94b' },
  skeleton: { hp: 52, attack: 8, defense: 2, speed: 62, size: 26, xp: 30, color: '#d1ccb0' },
  orc: { hp: 92, attack: 12, defense: 4, speed: 48, size: 30, xp: 42, color: '#627c38' },
  spider: { hp: 38, attack: 7, defense: 1, speed: 88, size: 22, xp: 28, color: '#342d42' },
  vampire: { hp: 82, attack: 14, defense: 3, speed: 82, size: 28, xp: 48, color: '#9e304b' },
  demon: { hp: 128, attack: 18, defense: 4, speed: 76, size: 32, xp: 58, color: '#c53827' },
  golem: { hp: 190, attack: 20, defense: 9, speed: 35, size: 34, xp: 70, color: '#696985' },
  boss: { hp: 520, attack: 24, defense: 7, speed: 54, size: 44, xp: 180, color: '#ff493a' },
};

const RUN_UPGRADES: UpgradeKey[] = ['multishot', 'ricochet', 'fireArrow', 'attackSpeed', 'piercing', 'attack', 'maxHp', 'speed', 'heal'];

export class GameEngine {
  state: RunGameState;
  lastTime = 0;
  private lastStepTime = 0;
  private roomAnnouncedClear = false;

  input = { joyX: 0, joyY: 0, attack: false, skill: false, dodge: false, interact: false };
  onStateChange: (state: RunGameState) => void = () => {};

  constructor() {
    const map = generateRunRoom(1);
    this.state = this.makeState('Hero', map, 1, 1);
  }

  private makePlayer(name: string, map: DungeonMap, level = 1, xp = 0, hp = CLASS_DEFS.archer.maxHp, overrides: Partial<Player> = {}): Player {
    const def = CLASS_DEFS.archer;
    return {
      id: 'player', type: 'player', playerName: name, playerClass: 'archer',
      x: map.startX * TILE_SIZE + 4, y: map.startY * TILE_SIZE + 4, width: 32, height: 32, vx: 0, vy: 0,
      hp: Math.min(hp, overrides.maxHp ?? def.maxHp), maxHp: overrides.maxHp ?? def.maxHp,
      attack: overrides.attack ?? def.attack, defense: overrides.defense ?? def.defense, speed: overrides.speed ?? def.speed,
      attackRange: overrides.attackRange ?? 520, skillRange: overrides.skillRange ?? def.skillRange,
      level, xp, color: def.color, state: 'idle', facing: { x: 0, y: -1 }, invincibleUntil: 0,
      skillCooldown: 0, dodgeCooldown: 0, attackCooldown: 0, spawnTime: Date.now(), lastAttackTime: 0,
    };
  }

  private makeState(name: string, map: DungeonMap, room: number, chapter: number): RunGameState {
    return {
      status: 'playing', floor: room, chapter, map, inDungeon: true,
      player: this.makePlayer(name, map), enemies: [], items: [], chests: [], damageNumbers: [], particles: [], effects: [],
      upgradeChoices: [], runSkills: {}, killCount: 0, camera: { x: map.startX * TILE_SIZE, y: map.startY * TILE_SIZE },
    };
  }

  startNewGame(name: string, _cls: ClassKey = 'archer'): void {
    const map = generateRunRoom(1);
    this.state = this.makeState(name, map, 1, 1);
    this.lastTime = 0;
    this.spawnRoom();
    this.saveNow('new-run');
    this.emit();
  }

  continueGame(save: SaveData): void {
    const room = Math.max(1, Math.min(CHAPTER_ROOMS, save.floor || 1));
    const chapter = Math.max(1, save.chapter ?? 1);
    const map = generateRunRoom(room);
    this.state = this.makeState(save.playerName, map, room, chapter);
    this.state.player = this.makePlayer(save.playerName, map, save.level, save.xp, save.hp, {
      maxHp: save.maxHp, attack: save.attack, defense: save.defense, speed: save.speed, attackRange: 520,
    });
    this.state.killCount = save.killCount || 0;
    this.state.runSkills = save.runSkills ?? {};
    this.lastTime = 0;
    this.spawnRoom();
    this.emit();
  }

  saveNow(reason = 'manual'): boolean {
    const p = this.state.player;
    return saveGame({
      playerName: p.playerName, playerClass: 'archer', floor: this.state.floor, chapter: this.state.chapter,
      level: p.level, xp: p.xp, hp: p.hp, maxHp: p.maxHp, attack: p.attack, defense: p.defense, speed: p.speed,
      attackRange: p.attackRange, skillRange: p.skillRange, killCount: this.state.killCount,
      worldX: p.x, worldY: p.y, dungeonEntranceX: 0, dungeonEntranceY: 0, playerX: p.x, playerY: p.y,
      inDungeon: false, overworldMap: this.state.map, savedAt: Date.now(), saveReason: reason, runSkills: this.state.runSkills,
    });
  }

  exitDungeon(): void {
    this.saveNow('leave-run');
    this.state.status = 'paused';
    this.emit();
  }

  applyUpgrade(choice: UpgradeKey): void {
    const p = this.state.player;
    this.state.runSkills[choice] = (this.state.runSkills[choice] ?? 0) + 1;
    if (choice === 'maxHp') { p.maxHp += 20; p.hp += 20; }
    else if (choice === 'attack') p.attack += 4;
    else if (choice === 'speed') p.speed += 12;
    else if (choice === 'defense') p.defense += 1;
    else if (choice === 'heal') p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.5);
    this.state.status = 'playing';
    this.saveNow('ability');
    this.emit();
  }

  private generateUpgradeChoices(): void {
    this.state.upgradeChoices = [...RUN_UPGRADES].sort(() => Math.random() - 0.5).slice(0, 3);
  }

  update(timestamp: number): void {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min(timestamp - this.lastTime, 100);
    this.lastTime = timestamp;
    if (this.state.status !== 'playing') return;

    this.updatePlayer(dt, timestamp);
    this.updateEnemies(dt, timestamp);
    this.updateEffects(dt);
    this.updateParticles(dt);
    this.updateRoomFlow();
    this.state.camera.x = this.state.player.x + 16;
    this.state.camera.y = this.state.player.y + 16;

    if (this.state.player.hp <= 0) {
      this.state.status = 'gameover';
      this.emit();
      return;
    }

    const xpNeeded = 70 + (this.state.player.level - 1) * 55;
    if (this.state.player.xp >= xpNeeded) {
      this.state.player.xp -= xpNeeded;
      this.state.player.level++;
      this.state.status = 'levelup';
      this.generateUpgradeChoices();
      this.emit();
    }
  }

  private updatePlayer(dt: number, time: number): void {
    const p = this.state.player;
    const def = CLASS_DEFS.archer;
    p.attackCooldown = Math.max(0, p.attackCooldown - dt);
    p.dodgeCooldown = Math.max(0, p.dodgeCooldown - dt);

    const mag = Math.hypot(this.input.joyX, this.input.joyY);
    if (this.input.dodge && p.dodgeCooldown <= 0) {
      p.dodgeCooldown = def.dodgeCooldownMs;
      p.invincibleUntil = time + 260;
      const dx = mag > 0 ? this.input.joyX / mag : p.facing.x;
      const dy = mag > 0 ? this.input.joyY / mag : p.facing.y;
      this.moveEntity(p, dx * def.dashDistance, dy * def.dashDistance);
      this.state.particles.push(...makeStepDust(p.x + 16, p.y + 24, '#efb44f'));
      this.input.dodge = false;
    } else if (mag > 0.08) {
      const dx = this.input.joyX * p.speed * dt / 1000;
      const dy = this.input.joyY * p.speed * dt / 1000;
      p.facing = { x: this.input.joyX / mag, y: this.input.joyY / mag };
      p.state = 'moving';
      this.moveEntity(p, dx, dy);
      if (time - this.lastStepTime > 250) {
        this.lastStepTime = time;
        this.state.particles.push(...makeStepDust(p.x + 16, p.y + 27));
      }
    } else {
      p.state = 'idle';
      if (p.attackCooldown <= 0 && this.livingEnemies().length > 0) this.autoShoot(time);
    }

    if (this.input.attack) {
      this.input.attack = false;
      if (p.attackCooldown <= 0) this.autoShoot(time);
    }
    this.input.skill = false;
    this.input.interact = false;
  }

  private autoShoot(time: number): void {
    const p = this.state.player;
    const enemies = this.livingEnemies().sort((a, b) => distance(p.x, p.y, a.x, a.y) - distance(p.x, p.y, b.x, b.y));
    if (!enemies.length) return;
    const speedRanks = this.state.runSkills.attackSpeed ?? 0;
    p.attackCooldown = Math.max(120, CLASS_DEFS.archer.attackCooldownMs * Math.pow(0.84, speedRanks));
    p.lastAttackTime = time;

    const multishot = this.state.runSkills.multishot ?? 0;
    const ricochet = this.state.runSkills.ricochet ?? 0;
    const piercing = this.state.runSkills.piercing ?? 0;
    const targetCount = Math.min(enemies.length, 1 + multishot + (ricochet > 0 ? 1 : 0) + (piercing > 0 ? 1 : 0));
    const targets = enemies.slice(0, targetCount);

    targets.forEach((enemy, index) => {
      const ex = enemy.x + enemy.width / 2;
      const ey = enemy.y + enemy.height / 2;
      const px = p.x + 16;
      const py = p.y + 16;
      const angle = Math.atan2(ey - py, ex - px);
      p.facing = { x: Math.cos(angle), y: Math.sin(angle) };
      const baseDamage = Math.max(1, Math.round((p.attack - (enemy.defense ?? 0) * 0.5) * (index === 0 ? 1 : 0.72)));
      const fireBonus = (this.state.runSkills.fireArrow ?? 0) > 0 ? Math.max(1, Math.round(baseDamage * 0.35)) : 0;
      const damage = baseDamage + fireBonus;
      enemy.hp -= damage;
      enemy.flashUntil = time + 130;
      this.state.damageNumbers.push({ id: `arrow-${time}-${index}`, x: ex, y: enemy.y - 8, value: `-${damage}`, color: fireBonus ? '#ff8d32' : '#ffd76a', lifeTime: 0, maxLifeTime: 700, scale: index === 0 ? 1.15 : 0.95 });
      this.state.effects.push({ id: `shot-${time}-${index}`, x: px, y: py, radius: 0, maxRadius: distance(px, py, ex, ey), color: fireBonus ? '#ff8a32' : '#ffe5a3', lifeTime: 0, maxLifeTime: 120, type: 'beam', angle, width: index === 0 ? 3 : 2 });
      this.state.particles.push(...makeHitSpark(ex, ey, fireBonus ? '#ff7a28' : '#ffe08a', 5));
    });
  }

  private updateEnemies(dt: number, time: number): void {
    const p = this.state.player;
    for (let i = this.state.enemies.length - 1; i >= 0; i--) {
      const enemy = this.state.enemies[i];
      if (enemy.hp <= 0) {
        if (!enemy.isDead) {
          enemy.isDead = true; enemy.state = 'dead'; enemy.deathTime = time;
          this.state.killCount++;
          p.xp += ENEMY_STATS[enemy.enemyType].xp;
          const cx = enemy.x + enemy.width / 2, cy = enemy.y + enemy.height / 2;
          this.state.particles.push(...makeParticles(cx, cy, enemy.color, 12, 80, 2.5));
        }
        if (time - enemy.deathTime > 320) this.state.enemies.splice(i, 1);
        continue;
      }

      const dx0 = p.x - enemy.x, dy0 = p.y - enemy.y;
      const dist = Math.max(1, Math.hypot(dx0, dy0));
      const dx = dx0 / dist * enemy.speed * dt / 1000;
      const dy = dy0 / dist * enemy.speed * dt / 1000;
      enemy.state = 'chase';
      this.moveEntity(enemy, dx, dy);

      if (dist < 42 + enemy.width / 2 && time > enemy.nextAttackTime) {
        enemy.nextAttackTime = time + (enemy.enemyType === 'boss' ? 650 : 1050);
        if (time > p.invincibleUntil) {
          const damage = Math.max(1, enemy.attack - p.defense + Math.floor(Math.random() * 3));
          p.hp -= damage;
          this.state.damageNumbers.push({ id: `hit-${time}-${i}`, x: p.x + 16, y: p.y - 8, value: `-${damage}`, color: '#e34b43', lifeTime: 0, maxLifeTime: 800, scale: 1.1 });
          this.state.particles.push(...makeHitSpark(p.x + 16, p.y + 16, '#ff453f', 7));
        }
      }
    }
  }

  private updateRoomFlow(): void {
    const alive = this.livingEnemies().length;
    if (alive === 0 && !this.roomAnnouncedClear) {
      this.roomAnnouncedClear = true;
      this.state.damageNumbers.push({ id: `clear-${Date.now()}`, x: this.state.player.x + 16, y: this.state.player.y - 24, value: this.state.floor === CHAPTER_ROOMS ? 'BOSS BESIEGT · AUSGANG OFFEN' : 'RAUM GESCHAFFT · AUSGANG OFFEN', color: '#d9b8ff', lifeTime: 0, maxLifeTime: 1800, scale: 0.9 });
    }
    if (alive > 0) return;
    const p = this.state.player;
    const tx = Math.floor((p.x + 16) / TILE_SIZE);
    const ty = Math.floor((p.y + 16) / TILE_SIZE);
    if (this.state.map.tiles[ty]?.[tx] !== TileType.STAIRS_DOWN) return;
    this.nextRoom();
  }

  private nextRoom(): void {
    const completedChapter = this.state.floor >= CHAPTER_ROOMS;
    this.state.floor = completedChapter ? 1 : this.state.floor + 1;
    if (completedChapter) this.state.chapter++;
    this.state.map = generateRunRoom(this.state.floor);
    this.state.player.x = this.state.map.startX * TILE_SIZE + 4;
    this.state.player.y = this.state.map.startY * TILE_SIZE + 4;
    this.state.enemies = [];
    this.state.items = [];
    this.state.effects = [];
    this.state.damageNumbers = [];
    this.roomAnnouncedClear = false;
    this.spawnRoom();
    this.saveNow(completedChapter ? 'chapter-complete' : 'room-complete');
    this.emit();
  }

  private spawnRoom(): void {
    const room = this.state.floor;
    const chapterScale = 1 + (this.state.chapter - 1) * 0.42;
    const roomScale = 1 + (room - 1) * 0.1;
    const map = this.state.map;
    const now = Date.now();
    this.roomAnnouncedClear = false;

    if (room === CHAPTER_ROOMS) {
      this.state.enemies.push(this.makeEnemy('boss', 9 * TILE_SIZE, 8 * TILE_SIZE, chapterScale * roomScale, now, 0));
      return;
    }

    const pool: EnemyType[] = room <= 3 ? ['slime', 'goblin'] : room <= 6 ? ['goblin', 'skeleton', 'spider'] : ['skeleton', 'orc', 'spider', 'vampire'];
    const count = Math.min(9, 2 + room);
    for (let i = 0; i < count; i++) {
      const type = pool[(i + room + this.state.chapter) % pool.length];
      const x = (4 + ((i * 4 + room * 2) % 10)) * TILE_SIZE;
      const y = (5 + ((i * 5 + room) % 11)) * TILE_SIZE;
      if (!isWalkable(map, x + 16, y + 16)) continue;
      this.state.enemies.push(this.makeEnemy(type, x, y, chapterScale * roomScale, now, i));
    }
  }

  private makeEnemy(type: EnemyType, x: number, y: number, scale: number, now: number, index: number): Enemy {
    const base = ENEMY_STATS[type];
    return {
      id: `${now}-${this.state.floor}-${index}`, type: 'enemy', enemyType: type, x, y, width: base.size, height: base.size, vx: 0, vy: 0,
      hp: Math.round(base.hp * scale), maxHp: Math.round(base.hp * scale), attack: Math.round(base.attack * scale), defense: base.defense,
      speed: base.speed, color: base.color, state: 'chase', targetX: x, targetY: y, nextAttackTime: now + 500, flashUntil: 0,
      spawnTime: now + index * 40, lastAttackTime: 0, deathTime: 0, isDead: false,
    };
  }

  private livingEnemies(): Enemy[] {
    return this.state.enemies.filter(enemy => enemy.hp > 0 && !enemy.isDead);
  }

  private updateEffects(dt: number): void {
    for (let i = this.state.damageNumbers.length - 1; i >= 0; i--) {
      const damage = this.state.damageNumbers[i]; damage.lifeTime += dt; damage.y -= dt / 1000 * 20;
      if (damage.lifeTime >= damage.maxLifeTime) this.state.damageNumbers.splice(i, 1);
    }
    for (let i = this.state.effects.length - 1; i >= 0; i--) {
      const effect = this.state.effects[i]; effect.lifeTime += dt;
      if (effect.lifeTime >= effect.maxLifeTime) this.state.effects.splice(i, 1);
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i]; p.lifeTime += dt; p.x += p.vx * dt / 1000; p.y += p.vy * dt / 1000;
      if (p.drag) { p.vx *= p.drag; p.vy *= p.drag; }
      if (p.gravity) p.vy += p.gravity * dt / 1000;
      if (p.lifeTime >= p.maxLifeTime) this.state.particles.splice(i, 1);
    }
  }

  private moveEntity(entity: { x: number; y: number; width: number; height: number }, dx: number, dy: number): void {
    if (dx !== 0) {
      entity.x += dx;
      const ex = entity.x + (dx > 0 ? entity.width : 0);
      if (!isWalkable(this.state.map, ex, entity.y + entity.height / 2) || !isWalkable(this.state.map, ex, entity.y + 2) || !isWalkable(this.state.map, ex, entity.y + entity.height - 2)) entity.x -= dx;
    }
    if (dy !== 0) {
      entity.y += dy;
      const ey = entity.y + (dy > 0 ? entity.height : 0);
      if (!isWalkable(this.state.map, entity.x + entity.width / 2, ey) || !isWalkable(this.state.map, entity.x + 2, ey) || !isWalkable(this.state.map, entity.x + entity.width - 2, ey)) entity.y -= dy;
    }
  }

  private emit(): void {
    this.onStateChange({ ...this.state });
  }
}

export type GameState = RunGameState;
