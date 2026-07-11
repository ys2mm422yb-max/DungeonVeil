import { CLASS_DEFS, ClassKey } from './classes';
import { DungeonMap, TILE_SIZE, isWalkable, TileType } from './dungeon';
import { CHAPTER_ROOMS, generateRunRoom, isBossRoom } from './chapterRun';
import { saveGame, SaveData } from './saveManager';
import { Enemy, EnemyType, Item, Chest, DamageNumber, Particle, Player, VisualEffect } from './entities';
import { makeHitSpark, makeParticles, makeStepDust, distance } from './combat';
import { UpgradeKey } from '../i18n/translations';
import { enemyArchetype, planEnemyMove } from './enemyRunAI';
import { collidesWithRoomProp, shotBlockedByRoomProp } from './roomCollision3D';
import { getRoomSpawnPoints, sceneSpawnToGame } from './roomSpawn3D';
import { availableRunSkills, nextSkillRank, skillRank } from './runSkills';
import { getEncounterPlan } from './encounterPlan';

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
  roomClearReady: boolean;
  roomClearAt: number;
  exitHintUntil: number;
  exitHintCount: number;
}

type RoomEntrySnapshot = {
  floor: number;
  chapter: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  level: number;
  killCount: number;
  runSkills: Partial<Record<UpgradeKey, number>>;
};

type EnemyWindup = {
  hitAt: number;
  range: number;
  archetype: ReturnType<typeof enemyArchetype>;
  index: number;
};

const ENEMY_STATS: Record<EnemyType, { hp: number; attack: number; defense: number; speed: number; size: number; xp: number; color: string }> = {
  slime: { hp: 24, attack: 4, defense: 0, speed: 42, size: 32, xp: 18, color: '#43c968' },
  goblin: { hp: 34, attack: 6, defense: 1, speed: 68, size: 30, xp: 24, color: '#89a94b' },
  skeleton: { hp: 52, attack: 8, defense: 2, speed: 72, size: 26, xp: 30, color: '#d1ccb0' },
  orc: { hp: 92, attack: 12, defense: 4, speed: 56, size: 30, xp: 42, color: '#627c38' },
  spider: { hp: 38, attack: 7, defense: 1, speed: 88, size: 38, xp: 28, color: '#342d42' },
  vampire: { hp: 82, attack: 14, defense: 3, speed: 82, size: 34, xp: 48, color: '#9e304b' },
  demon: { hp: 128, attack: 18, defense: 4, speed: 76, size: 36, xp: 58, color: '#c53827' },
  golem: { hp: 190, attack: 20, defense: 9, speed: 40, size: 34, xp: 70, color: '#696985' },
  boss: { hp: 520, attack: 24, defense: 7, speed: 54, size: 74, xp: 180, color: '#ff493a' },
};

const RUN_UPGRADES: UpgradeKey[] = ['multishot', 'ricochet', 'fireArrow', 'iceArrow', 'attackSpeed', 'piercing', 'attack', 'maxHp', 'speed', 'defense'];
const NORMAL_DEATH_MS = 680;
const BOSS_DEATH_MS = 1650;
const UNSTUCK_MS = 7000;
const UI_EMIT_MS = 100;

export class GameEngine {
  state: RunGameState;
  lastTime = 0;
  private lastStepTime = 0;
  private lastUiEmitTime = 0;
  private roomAnnouncedClear = false;
  private lootCounter = 0;
  private roomEntrySnapshot: RoomEntrySnapshot | null = null;
  private enemyWindups = new Map<string, EnemyWindup>();

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
      skillCooldown: 0, dodgeCooldown: 0, lastDodgeTime: 0, attackCooldown: 0, spawnTime: performance.now(), lastAttackTime: 0,
      lastHitTime: 0, lastGuardTime: 0, lastGiftTime: 0, lastGiftKey: '',
    };
  }

  private makeState(name: string, map: DungeonMap, room: number, chapter: number): RunGameState {
    return {
      status: 'playing', floor: room, chapter, map, inDungeon: true,
      player: this.makePlayer(name, map), enemies: [], items: [], chests: [], damageNumbers: [], particles: [], effects: [],
      upgradeChoices: [], runSkills: {}, killCount: 0, camera: { x: map.startX * TILE_SIZE, y: map.startY * TILE_SIZE },
      roomClearReady: false, roomClearAt: 0, exitHintUntil: 0, exitHintCount: 0,
    };
  }

  startNewGame(name: string, _cls: ClassKey = 'archer'): void {
    const map = generateRunRoom(1);
    this.state = this.makeState(name, map, 1, 1);
    this.lastTime = 0;
    this.lastUiEmitTime = 0;
    this.enemyWindups.clear();
    this.spawnRoom();
    this.captureRoomEntrySnapshot();
    this.saveNow('new-run');
    this.emit();
  }

  continueGame(save: SaveData): void {
    const room = Math.max(1, Math.min(CHAPTER_ROOMS, save.floor || 1));
    const chapter = Math.max(1, save.chapter ?? 1);
    const map = generateRunRoom(room);
    this.state = this.makeState(save.playerName, map, room, chapter);
    this.state.player = this.makePlayer(save.playerName, map, save.level, 0, save.hp, {
      maxHp: save.maxHp, attack: save.attack, defense: save.defense, speed: save.speed, attackRange: 520,
    });
    this.state.killCount = save.killCount || 0;
    this.state.runSkills = save.runSkills ?? {};
    this.lastTime = 0;
    this.lastUiEmitTime = 0;
    this.enemyWindups.clear();
    this.spawnRoom();
    this.captureRoomEntrySnapshot();
    this.emit();
  }

  saveNow(reason = 'manual'): boolean {
    const p = this.state.player;
    return saveGame({
      playerName: p.playerName, playerClass: 'archer', floor: this.state.floor, chapter: this.state.chapter,
      level: p.level, xp: 0, hp: p.hp, maxHp: p.maxHp, attack: p.attack, defense: p.defense, speed: p.speed,
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
    if (this.state.status !== 'levelup' || !this.state.upgradeChoices.includes(choice)) return;
    const p = this.state.player;
    const rank = nextSkillRank(this.state.runSkills, choice);
    this.state.runSkills[choice] = rank;
    if (choice === 'maxHp') {
      const gain = rank === 1 ? 20 : rank === 2 ? 25 : 30;
      p.maxHp += gain;
      p.hp = Math.min(p.maxHp, p.hp + gain);
    } else if (choice === 'attack') p.attack += rank === 3 ? 5 : 4;
    else if (choice === 'speed') p.speed += rank === 1 ? 12 : rank === 2 ? 10 : 8;
    else if (choice === 'defense') p.defense += rank === 1 ? 1 : 2;
    else if (choice === 'heal') p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.5);
    p.lastGiftTime = Date.now();
    p.lastGiftKey = choice;
    this.state.upgradeChoices = [];
    this.state.status = 'playing';
    this.captureRoomEntrySnapshot();
    this.saveNow('ability');
    this.emit();
  }

  private generateUpgradeChoices(): void {
    const available = availableRunSkills(this.state.runSkills, RUN_UPGRADES);
    const pool = available.length >= 3 ? available : [...available, 'heal' as UpgradeKey];
    this.state.upgradeChoices = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
  }

  private captureRoomEntrySnapshot(): void {
    const p = this.state.player;
    this.roomEntrySnapshot = {
      floor: this.state.floor, chapter: this.state.chapter, hp: p.hp, maxHp: p.maxHp, attack: p.attack,
      defense: p.defense, speed: p.speed, level: p.level, killCount: this.state.killCount,
      runSkills: { ...this.state.runSkills },
    };
  }

  restartCurrentRoom(): void {
    const snapshot = this.roomEntrySnapshot;
    if (!snapshot || snapshot.floor !== this.state.floor || snapshot.chapter !== this.state.chapter) this.captureRoomEntrySnapshot();
    const entry = this.roomEntrySnapshot!;
    const p = this.state.player;
    this.state.map = generateRunRoom(this.state.floor);
    p.hp = entry.hp;
    p.maxHp = entry.maxHp;
    p.attack = entry.attack;
    p.defense = entry.defense;
    p.speed = entry.speed;
    p.level = entry.level;
    p.x = this.state.map.startX * TILE_SIZE + 4;
    p.y = this.state.map.startY * TILE_SIZE + 4;
    p.state = 'idle';
    p.attackCooldown = 0;
    p.dodgeCooldown = 0;
    p.invincibleUntil = 0;
    this.state.killCount = entry.killCount;
    this.state.runSkills = { ...entry.runSkills };
    this.state.enemies = [];
    this.state.items = [];
    this.state.effects = [];
    this.state.particles = [];
    this.state.damageNumbers = [];
    this.state.upgradeChoices = [];
    this.state.roomClearReady = false;
    this.state.roomClearAt = 0;
    this.state.exitHintUntil = 0;
    this.state.exitHintCount = 0;
    this.roomAnnouncedClear = false;
    this.enemyWindups.clear();
    this.lastTime = performance.now();
    this.lastUiEmitTime = this.lastTime;
    this.spawnRoom();
    this.state.status = 'playing';
    this.saveNow('restart-room');
    this.emit();
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
    this.updateRoomFlow(timestamp);
    this.state.camera.x = this.state.player.x + 16;
    this.state.camera.y = this.state.player.y + 16;

    if (this.state.player.hp <= 0) {
      this.state.status = 'gameover';
      this.emit();
      return;
    }

    if (timestamp - this.lastUiEmitTime >= UI_EMIT_MS) {
      this.lastUiEmitTime = timestamp;
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
      const speedRank = skillRank(this.state.runSkills, 'speed');
      const dashScale = speedRank >= 3 ? 1.15 : 1;
      p.dodgeCooldown = def.dodgeCooldownMs;
      p.invincibleUntil = time + 260;
      p.lastDodgeTime = time;
      p.state = 'dodging';
      const dx = mag > 0 ? this.input.joyX / mag : p.facing.x;
      const dy = mag > 0 ? this.input.joyY / mag : p.facing.y;
      const startX = p.x + 16;
      const startY = p.y + 16;
      this.moveEntity(p, dx * def.dashDistance * dashScale, dy * def.dashDistance * dashScale);
      const endX = p.x + 16;
      const endY = p.y + 16;
      const dashDistance = Math.max(24, Math.hypot(endX - startX, endY - startY));
      this.state.effects.push({
        id: `dash-${time}`, x: startX, y: startY, radius: 0, maxRadius: dashDistance,
        color: speedRank >= 2 ? '#c7f4ff' : '#efb44f', lifeTime: 0, maxLifeTime: 180, type: 'dash',
        angle: Math.atan2(endY - startY, endX - startX), width: speedRank >= 2 ? 7 : 5,
      });
      this.state.particles.push(...makeStepDust(p.x + 16, p.y + 24, speedRank >= 2 ? '#c7f4ff' : '#efb44f'));
      this.input.dodge = false;
    } else if (mag > 0.08) {
      const dx = this.input.joyX * p.speed * dt / 1000;
      const dy = this.input.joyY * p.speed * dt / 1000;
      p.facing = { x: this.input.joyX / mag, y: this.input.joyY / mag };
      p.state = 'moving';
      this.moveEntity(p, dx, dy);
      const speedRank = skillRank(this.state.runSkills, 'speed');
      const stepDelay = speedRank >= 2 ? 150 : 250;
      if (time - this.lastStepTime > stepDelay) {
        this.lastStepTime = time;
        this.state.particles.push(...makeStepDust(p.x + 16, p.y + 27, speedRank >= 2 ? '#d9f7ff' : undefined));
      }
    } else {
      p.state = 'idle';
      if (p.attackCooldown <= 0 && this.livingEnemies().length > 0) this.autoShoot(time);
    }

    this.pickupItems(time);
    if (this.input.attack) {
      this.input.attack = false;
      if (p.attackCooldown <= 0) this.autoShoot(time);
    }
    this.input.skill = false;
    this.input.interact = false;
  }

  private autoShoot(time: number): void {
    const p = this.state.player;
    const px = p.x + 16;
    const py = p.y + 16;
    const visible = this.visibleEnemiesFrom(px, py);
    if (!visible.length) return;

    const speedRank = skillRank(this.state.runSkills, 'attackSpeed');
    const cooldownFactors = [1, 0.84, 0.70, 0.58];
    p.attackCooldown = Math.max(120, CLASS_DEFS.archer.attackCooldownMs * cooldownFactors[speedRank]);
    p.lastAttackTime = time;

    const primary = visible[0];
    const tx = primary.x + primary.width / 2;
    const ty = primary.y + primary.height / 2;
    const baseAngle = Math.atan2(ty - py, tx - px);
    p.facing = { x: Math.cos(baseAngle), y: Math.sin(baseAngle) };

    const multiRank = skillRank(this.state.runSkills, 'multishot');
    const arrowCount = 1 + multiRank;
    const spread = multiRank === 0 ? 0 : multiRank === 1 ? 0.12 : multiRank === 2 ? 0.13 : 0.15;
    const offsets = Array.from({ length: arrowCount }, (_, index) => (index - (arrowCount - 1) / 2) * spread);
    const hitIds = new Set<string>();

    offsets.forEach((offset, index) => {
      const angle = baseAngle + offset;
      const target = this.findEnemyAlongRay(px, py, angle, p.attackRange, hitIds) ?? (index === 0 ? primary : null);
      if (!target) return;
      const endX = target.x + target.width / 2;
      const endY = target.y + target.height / 2;
      const element = this.chooseShotElement(time, index);
      this.addShotEffect(`shot-${time}-${index}`, px, py, endX, endY, angle, element.color, element.kind, index === 0 ? 4 : 3);
      hitIds.add(target.id);
      const damage = this.baseArrowDamage(target, index === 0 ? 1 : 0.82);
      this.damageEnemy(target, damage, time, px, py, element.kind, index === 0 ? 1.2 : 1);
      this.applyElementStatus(target, element.kind, time);
      if (index === 0) {
        this.applyPiercing(target, px, py, angle, damage, time, element.kind, hitIds);
        this.applyRicochet(target, damage, time, element.kind, hitIds);
      }
    });
  }

  private shotPathBlocked(fromX: number, fromY: number, toX: number, toY: number, padding = 0.035) {
    if (shotBlockedByRoomProp(this.state.floor, this.state.map.width, this.state.map.height, fromX, fromY, toX, toY, padding)) return true;
    const length = Math.hypot(toX - fromX, toY - fromY);
    const steps = Math.max(2, Math.ceil(length / 7));
    for (let step = 1; step < steps; step++) {
      const progress = step / steps;
      const x = fromX + (toX - fromX) * progress;
      const y = fromY + (toY - fromY) * progress;
      if (!isWalkable(this.state.map, x, y)) return true;
    }
    return false;
  }

  private visibleEnemiesFrom(x: number, y: number, excluded = new Set<string>()) {
    return this.livingEnemies()
      .filter(enemy => !excluded.has(enemy.id))
      .filter(enemy => {
        const ex = enemy.x + enemy.width / 2;
        const ey = enemy.y + enemy.height / 2;
        return !this.shotPathBlocked(x, y, ex, ey);
      })
      .sort((a, b) => distance(x, y, a.x + a.width / 2, a.y + a.height / 2) - distance(x, y, b.x + b.width / 2, b.y + b.height / 2));
  }

  private findEnemyAlongRay(x: number, y: number, angle: number, range: number, excluded = new Set<string>()) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    return this.livingEnemies()
      .filter(enemy => !excluded.has(enemy.id))
      .map(enemy => {
        const ex = enemy.x + enemy.width / 2;
        const ey = enemy.y + enemy.height / 2;
        const rx = ex - x;
        const ry = ey - y;
        const forward = rx * dx + ry * dy;
        const perpendicular = Math.abs(rx * dy - ry * dx);
        return { enemy, forward, perpendicular };
      })
      .filter(hit => hit.forward > 0 && hit.forward <= range && hit.perpendicular <= hit.enemy.width * 0.72 + 12)
      .filter(hit => !this.shotPathBlocked(x, y, hit.enemy.x + hit.enemy.width / 2, hit.enemy.y + hit.enemy.height / 2))
      .sort((a, b) => a.forward - b.forward)[0]?.enemy ?? null;
  }

  private chooseShotElement(time: number, index: number) {
    const fire = skillRank(this.state.runSkills, 'fireArrow');
    const ice = skillRank(this.state.runSkills, 'iceArrow');
    if (fire && ice) return (Math.floor(time / 240) + index) % 2 === 0
      ? { kind: 'fire' as const, color: '#ff642c' }
      : { kind: 'ice' as const, color: '#62d9ff' };
    if (fire) return { kind: 'fire' as const, color: '#ff642c' };
    if (ice) return { kind: 'ice' as const, color: '#62d9ff' };
    return { kind: 'normal' as const, color: '#ffe5a3' };
  }

  private addShotEffect(id: string, x: number, y: number, toX: number, toY: number, angle: number, color: string, element: VisualEffect['element'], width: number, fromEnemyId?: string, toEnemyId?: string) {
    this.state.effects.push({
      id, x, y, radius: 0, maxRadius: distance(x, y, toX, toY), color, lifeTime: 0, maxLifeTime: element === 'arcane' ? 190 : 165,
      type: 'beam', angle, width, element, fromEnemyId, toEnemyId,
    });
  }

  private baseArrowDamage(enemy: Enemy, multiplier = 1) {
    return Math.max(1, Math.round((this.state.player.attack - (enemy.defense ?? 0) * 0.5) * multiplier));
  }

  private damageEnemy(enemy: Enemy, damage: number, time: number, fromX: number, fromY: number, element: VisualEffect['element'], scale = 1) {
    enemy.hp -= damage;
    enemy.flashUntil = time + 80;
    enemy.lastHitTime = time;
    enemy.hitFromX = fromX;
    enemy.hitFromY = fromY;
    const ex = enemy.x + enemy.width / 2;
    const ey = enemy.y + enemy.height / 2;
    const attackRank = skillRank(this.state.runSkills, 'attack');
    const color = element === 'fire' ? '#ff642c' : element === 'ice' ? '#62d9ff' : element === 'arcane' ? '#b693ff' : element === 'piercing' ? '#f3fbff' : '#ffe5a3';
    const numberX = ex + (Math.random() - 0.5) * 18;
    this.state.damageNumbers.push({ id: `dmg-${time}-${enemy.id}-${Math.random()}`, x: numberX, y: enemy.y - 8, value: `-${damage}`, color, lifeTime: 0, maxLifeTime: 700, scale: scale + attackRank * 0.08 });
    this.state.particles.push(...makeHitSpark(ex, ey, color, 5 + attackRank * 2 + (element === 'fire' || element === 'ice' ? 4 : 0)));
  }

  private applyElementStatus(enemy: Enemy, element: VisualEffect['element'], time: number) {
    if (element === 'fire') {
      const rank = skillRank(this.state.runSkills, 'fireArrow');
      const ticks = rank === 1 ? 3 : rank === 2 ? 4 : 5;
      enemy.burnRanks = rank;
      enemy.burnDamage = rank + 1;
      enemy.burnUntil = time + ticks * 520;
      enemy.nextBurnTick = time + 520;
    } else if (element === 'ice') {
      const rank = skillRank(this.state.runSkills, 'iceArrow');
      const slows = [0, 0.2, 0.32, 0.45];
      const duration = [0, 2000, 2500, 3000];
      enemy.frostSlow = slows[rank];
      enemy.frostUntil = time + duration[rank];
    }
  }

  private applyPiercing(primary: Enemy, x: number, y: number, angle: number, baseDamage: number, time: number, element: VisualEffect['element'], hitIds: Set<string>) {
    const rank = skillRank(this.state.runSkills, 'piercing');
    if (!rank) return;
    let fromX = primary.x + primary.width / 2;
    let fromY = primary.y + primary.height / 2;
    for (let i = 0; i < rank; i++) {
      const target = this.findEnemyAlongRay(fromX, fromY, angle, this.state.player.attackRange, hitIds);
      if (!target) break;
      hitIds.add(target.id);
      const tx = target.x + target.width / 2;
      const ty = target.y + target.height / 2;
      const multiplier = rank === 1 ? 0.7 : rank === 2 ? 0.75 : 0.8;
      const damage = Math.max(1, Math.round(baseDamage * multiplier));
      this.addShotEffect(`pierce-${time}-${i}`, fromX, fromY, tx, ty, angle, '#f3fbff', 'piercing', 5, primary.id, target.id);
      this.damageEnemy(target, damage, time, fromX, fromY, 'piercing', 1.05);
      this.applyElementStatus(target, element, time);
      fromX = tx;
      fromY = ty;
    }
  }

  private applyRicochet(primary: Enemy, baseDamage: number, time: number, element: VisualEffect['element'], hitIds: Set<string>) {
    const rank = skillRank(this.state.runSkills, 'ricochet');
    if (!rank) return;
    let source = primary;
    for (let i = 0; i < rank; i++) {
      const sx = source.x + source.width / 2;
      const sy = source.y + source.height / 2;
      const next = this.visibleEnemiesFrom(sx, sy, hitIds)[0];
      if (!next) break;
      hitIds.add(next.id);
      const tx = next.x + next.width / 2;
      const ty = next.y + next.height / 2;
      const angle = Math.atan2(ty - sy, tx - sx);
      const multiplier = rank === 1 ? 0.65 : rank === 2 ? 0.7 : 0.75;
      const damage = Math.max(1, Math.round(baseDamage * multiplier));
      this.addShotEffect(`rico-${time}-${i}`, sx, sy, tx, ty, angle, '#b693ff', 'arcane', 4, source.id, next.id);
      this.damageEnemy(next, damage, time, sx, sy, 'arcane', 1);
      this.applyElementStatus(next, element, time);
      source = next;
    }
  }

  private attackWindupMs(archetype: ReturnType<typeof enemyArchetype>) {
    if (archetype === 'skirmisher') return 165;
    if (archetype === 'guardian') return 270;
    if (archetype === 'dragon') return this.state.floor === 50 ? 480 : 410;
    return 185;
  }

  private resolveEnemyAttack(enemy: Enemy, windup: EnemyWindup, time: number): void {
    const p = this.state.player;
    const dist = Math.hypot((p.x + 16) - (enemy.x + enemy.width / 2), (p.y + 16) - (enemy.y + enemy.height / 2));
    if (windup.archetype !== 'dragon' && dist > windup.range * 1.18) return;

    if (windup.archetype === 'dragon') {
      const ex = enemy.x + enemy.width / 2;
      const ey = enemy.y + enemy.height / 2;
      const targetX = p.x + 16;
      const targetY = p.y + 16;
      const angle = Math.atan2(targetY - ey, targetX - ex);
      const color = this.state.floor === 50 ? '#765cff' : '#ff633d';
      const element = this.state.floor === 50 ? 'arcane' as const : 'fire' as const;
      if (this.shotPathBlocked(ex, ey, targetX, targetY, 0.08)) return;
      this.addShotEffect(`boss-shot-${time}-${windup.index}`, ex, ey, targetX, targetY, angle, color, element, 7);
      this.state.particles.push(...makeHitSpark(targetX, targetY, color, 10));
    }

    if (time <= p.invincibleUntil) return;
    const raw = enemy.attack - p.defense + Math.floor(Math.random() * 3);
    const damage = Math.max(1, raw);
    p.hp -= damage;
    p.lastHitTime = time;
    if (skillRank(this.state.runSkills, 'defense') > 0) p.lastGuardTime = time;
    this.state.damageNumbers.push({
      id: `hit-${time}-${windup.index}`,
      x: p.x + 16 + (Math.random() - 0.5) * 14,
      y: p.y - 8,
      value: `-${damage}`,
      color: '#e34b43',
      lifeTime: 0,
      maxLifeTime: 800,
      scale: windup.archetype === 'dragon' ? 1.35 : 1.1,
    });
    this.state.particles.push(...makeHitSpark(p.x + 16, p.y + 16, skillRank(this.state.runSkills, 'defense') >= 2 ? '#83d6af' : '#ff453f', windup.archetype === 'dragon' ? 12 : 7));
  }

  private updateEnemies(dt: number, time: number): void {
    const p = this.state.player;
    for (let i = this.state.enemies.length - 1; i >= 0; i--) {
      const enemy = this.state.enemies[i];

      if (!enemy.isDead && enemy.burnUntil && time < enemy.burnUntil && enemy.nextBurnTick && time >= enemy.nextBurnTick) {
        enemy.nextBurnTick += 520;
        const burnDamage = enemy.burnDamage ?? 2;
        enemy.hp -= burnDamage;
        const ex = enemy.x + enemy.width / 2;
        const ey = enemy.y + enemy.height / 2;
        this.state.damageNumbers.push({ id: `burn-${time}-${enemy.id}`, x: ex + (Math.random() - 0.5) * 14, y: enemy.y - 5, value: `-${burnDamage}`, color: '#ff6a2c', lifeTime: 0, maxLifeTime: 550, scale: 0.78 });
        this.state.particles.push(...makeHitSpark(ex, ey, '#ff6a2c', 4));
      }

      if (enemy.hp <= 0) {
        this.enemyWindups.delete(enemy.id);
        if (!enemy.isDead) this.beginEnemyDeath(enemy, time);
        if (time - enemy.deathTime >= (enemy.deathDuration ?? NORMAL_DEATH_MS)) this.state.enemies.splice(i, 1);
        continue;
      }

      const activeWindup = this.enemyWindups.get(enemy.id);
      if (activeWindup) {
        enemy.state = 'attack';
        if (time >= activeWindup.hitAt) {
          this.enemyWindups.delete(enemy.id);
          this.resolveEnemyAttack(enemy, activeWindup, time);
        }
        continue;
      }

      const dist = Math.max(1, Math.hypot(p.x - enemy.x, p.y - enemy.y));
      const plan = planEnemyMove(enemy, p, dt, time);
      enemy.state = dist <= plan.attackRange ? 'attack' : 'chase';
      const frostFactor = enemy.frostUntil && time < enemy.frostUntil ? 1 - (enemy.frostSlow ?? 0) : 1;
      if (enemy.state === 'chase' || enemyArchetype(enemy.enemyType) === 'dragon') this.moveEntity(enemy, plan.dx * frostFactor, plan.dy * frostFactor);
      this.checkEnemyStuck(enemy, time, dist, plan.attackRange);

      if (dist < plan.attackRange && time > enemy.nextAttackTime) {
        const archetype = enemyArchetype(enemy.enemyType);
        const windupMs = this.attackWindupMs(archetype);
        enemy.nextAttackTime = time + plan.attackDelay + windupMs;
        enemy.lastAttackTime = time;
        enemy.state = 'attack';
        this.enemyWindups.set(enemy.id, { hitAt: time + windupMs, range: plan.attackRange, archetype, index: i });
        const ex = enemy.x + enemy.width / 2;
        const ey = enemy.y + enemy.height / 2;
        const warningColor = archetype === 'dragon' ? (this.state.floor === 50 ? '#765cff' : '#ff633d') : archetype === 'guardian' ? '#e8a45d' : '#e6c987';
        this.state.effects.push({
          id: `telegraph-${time}-${enemy.id}`,
          x: ex,
          y: ey,
          radius: 0,
          maxRadius: Math.max(30, plan.attackRange * 0.58),
          color: warningColor,
          lifeTime: 0,
          maxLifeTime: windupMs,
          type: 'circle',
          element: archetype === 'dragon' ? (this.state.floor === 50 ? 'arcane' : 'fire') : 'normal',
        });
      }
    }
    this.separateEnemies();
  }

  private separateEnemies(): void {
    const living = this.livingEnemies();
    for (let i = 0; i < living.length; i++) {
      for (let j = i + 1; j < living.length; j++) {
        const a = living[i];
        const b = living[j];
        const ax = a.x + a.width / 2;
        const ay = a.y + a.height / 2;
        const bx = b.x + b.width / 2;
        const by = b.y + b.height / 2;
        let dx = ax - bx;
        let dy = ay - by;
        let dist = Math.hypot(dx, dy);
        const minDistance = Math.max(18, (a.width + b.width) * 0.34);
        if (dist >= minDistance) continue;
        if (dist < 0.01) {
          dx = i % 2 === 0 ? 1 : -1;
          dy = j % 2 === 0 ? 0.5 : -0.5;
          dist = Math.hypot(dx, dy);
        }
        const push = Math.min(1.6, (minDistance - dist) * 0.16);
        const nx = dx / dist;
        const ny = dy / dist;
        this.moveEntity(a, nx * push, ny * push);
        this.moveEntity(b, -nx * push, -ny * push);
      }
    }
  }

  private beginEnemyDeath(enemy: Enemy, time: number) {
    enemy.isDead = true;
    enemy.state = 'dead';
    enemy.deathTime = time;
    enemy.deathDuration = enemy.enemyType === 'boss' ? BOSS_DEATH_MS : NORMAL_DEATH_MS;
    this.state.killCount++;
    const cx = enemy.x + enemy.width / 2;
    const cy = enemy.y + enemy.height / 2;
    this.spawnLoot(cx, cy, enemy.enemyType);
    this.state.particles.push(...makeParticles(cx, cy, enemy.color, enemy.enemyType === 'boss' ? 28 : 12, enemy.enemyType === 'boss' ? 130 : 80, enemy.enemyType === 'boss' ? 4 : 2.5));
    if ((enemy.burnRanks ?? 0) >= 3) {
      this.state.effects.push({ id: `fire-death-${time}-${enemy.id}`, x: cx, y: cy, radius: 0, maxRadius: 72, color: '#ff642c', lifeTime: 0, maxLifeTime: 360, type: 'circle', element: 'fire' });
      this.state.particles.push(...makeParticles(cx, cy, '#ff642c', 20, 120, 3.5));
    }
  }

  private checkEnemyStuck(enemy: Enemy, time: number, dist: number, attackRange: number) {
    if (enemy.state !== 'chase' || dist <= attackRange + 20) {
      enemy.lastProgressX = enemy.x;
      enemy.lastProgressY = enemy.y;
      enemy.lastProgressTime = time;
      return;
    }
    if (enemy.lastProgressTime === undefined) {
      enemy.lastProgressX = enemy.x;
      enemy.lastProgressY = enemy.y;
      enemy.lastProgressTime = time;
      return;
    }
    const progress = Math.hypot(enemy.x - (enemy.lastProgressX ?? enemy.x), enemy.y - (enemy.lastProgressY ?? enemy.y));
    if (progress >= 8) {
      enemy.lastProgressX = enemy.x;
      enemy.lastProgressY = enemy.y;
      enemy.lastProgressTime = time;
      return;
    }
    if (time - enemy.lastProgressTime >= UNSTUCK_MS) this.relocateStuckEnemy(enemy, time);
  }

  private relocateStuckEnemy(enemy: Enemy, time: number) {
    const candidates = getRoomSpawnPoints(this.state.floor);
    const p = this.state.player;
    for (const point of candidates) {
      const spawn = sceneSpawnToGame(point, this.state.map.width, this.state.map.height, enemy.width);
      const farEnough = Math.hypot(spawn.x - p.x, spawn.y - p.y) > 120;
      if (!farEnough || !isWalkable(this.state.map, spawn.x + enemy.width / 2, spawn.y + enemy.height / 2)) continue;
      if (collidesWithRoomProp(this.state.floor, this.state.map.width, this.state.map.height, spawn.x, spawn.y, enemy.width, enemy.height, 0.22)) continue;
      enemy.x = spawn.x;
      enemy.y = spawn.y;
      enemy.targetX = spawn.x;
      enemy.targetY = spawn.y;
      enemy.lastProgressX = spawn.x;
      enemy.lastProgressY = spawn.y;
      enemy.lastProgressTime = time;
      enemy.nextAttackTime = time + 500;
      this.enemyWindups.delete(enemy.id);
      this.state.effects.push({ id: `unstuck-${time}-${enemy.id}`, x: spawn.x + enemy.width / 2, y: spawn.y + enemy.height / 2, radius: 0, maxRadius: 38, color: '#8c62ff', lifeTime: 0, maxLifeTime: 280, type: 'circle', element: 'arcane' });
      return;
    }
    enemy.lastProgressTime = time;
  }

  canExitRoom(): boolean {
    return this.state.status === 'playing' && this.state.enemies.length === 0 && this.state.roomClearReady;
  }

  private updateRoomFlow(time: number): void {
    const living = this.livingEnemies().length;
    const deathPending = this.state.enemies.some(enemy => enemy.isDead);
    if (living === 0 && !deathPending && this.state.enemies.length === 0 && !this.roomAnnouncedClear) {
      this.roomAnnouncedClear = true;
      this.state.roomClearReady = true;
      this.state.roomClearAt = time;
      this.state.damageNumbers.push({ id: `clear-${time}`, x: this.state.player.x + 16, y: this.state.player.y - 24, value: isBossRoom(this.state.floor) ? 'BOSS BESIEGT · AUSGANG OFFEN' : 'RAUM FREI · AUSGANG OFFEN', color: '#d9b8ff', lifeTime: 0, maxLifeTime: 1800, scale: 0.9 });
      this.state.effects.push({ id: `clear-wave-${time}`, x: this.state.player.x + 16, y: this.state.player.y + 16, radius: 0, maxRadius: 64, color: '#b693ff', lifeTime: 0, maxLifeTime: 360, type: 'circle', element: 'arcane' });
    }

    const p = this.state.player;
    const tx = Math.floor((p.x + 16) / TILE_SIZE);
    const ty = Math.floor((p.y + 16) / TILE_SIZE);
    if (this.state.map.tiles[ty]?.[tx] !== TileType.STAIRS_DOWN) return;
    if (!this.canExitRoom()) {
      this.state.exitHintCount = living + (deathPending ? 1 : 0);
      this.state.exitHintUntil = time + 850;
      return;
    }
    this.nextRoom();
  }

  private nextRoom(): void {
    if (!this.canExitRoom()) return;
    const completedChapter = this.state.floor >= CHAPTER_ROOMS;
    this.state.floor = completedChapter ? 1 : this.state.floor + 1;
    if (completedChapter) this.state.chapter++;
    this.state.map = generateRunRoom(this.state.floor);
    this.state.player.x = this.state.map.startX * TILE_SIZE + 4;
    this.state.player.y = this.state.map.startY * TILE_SIZE + 4;
    this.state.player.level++;
    this.state.player.xp = 0;
    this.state.enemies = [];
    this.state.items = [];
    this.state.effects = [];
    this.state.particles = [];
    this.state.damageNumbers = [];
    this.state.roomClearReady = false;
    this.state.roomClearAt = 0;
    this.state.exitHintUntil = 0;
    this.state.exitHintCount = 0;
    this.roomAnnouncedClear = false;
    this.enemyWindups.clear();
    this.spawnRoom();
    this.generateUpgradeChoices();
    this.state.status = 'levelup';
    this.saveNow(completedChapter ? 'chapter-complete' : 'room-complete');
    this.emit();
  }

  private spawnRoom(): void {
    const room = this.state.floor;
    const chapterScale = 1 + (this.state.chapter - 1) * 0.36;
    const roomScale = 1 + (room - 1) * 0.055;
    const map = this.state.map;
    const now = performance.now();
    const spawnId = Date.now();
    this.roomAnnouncedClear = false;
    this.state.roomClearReady = false;
    this.state.roomClearAt = 0;
    this.enemyWindups.clear();

    if (isBossRoom(room)) {
      const bossPoint = getRoomSpawnPoints(room)[0];
      const bossSize = ENEMY_STATS.boss.size;
      const spawn = sceneSpawnToGame(bossPoint, map.width, map.height, bossSize);
      const bossScale = chapterScale * roomScale * (room === 50 ? 1.18 : 1);
      this.state.enemies.push(this.makeEnemy('boss', spawn.x, spawn.y, bossScale, now, spawnId, 0));
      return;
    }

    const encounter = getEncounterPlan(room);
    const points = getRoomSpawnPoints(room);
    const count = Math.min(points.length, encounter.length);

    for (let i = 0; i < count; i++) {
      const type = encounter[i];
      const size = ENEMY_STATS[type].size;
      const point = points[i % points.length];
      const spawn = sceneSpawnToGame(point, map.width, map.height, size);
      if (!isWalkable(map, spawn.x + size / 2, spawn.y + size / 2)) continue;
      if (collidesWithRoomProp(room, map.width, map.height, spawn.x, spawn.y, size, size, 0.22)) continue;
      this.state.enemies.push(this.makeEnemy(type, spawn.x, spawn.y, chapterScale * roomScale, now, spawnId, i));
    }
  }

  private makeEnemy(type: EnemyType, x: number, y: number, scale: number, now: number, spawnId: number, index: number): Enemy {
    const base = ENEMY_STATS[type];
    const attackScale = 1 + Math.max(0, scale - 1) * 0.62;
    return {
      id: `${spawnId}-${this.state.floor}-${index}`, type: 'enemy', enemyType: type, x, y, width: base.size, height: base.size, vx: 0, vy: 0,
      hp: Math.round(base.hp * scale), maxHp: Math.round(base.hp * scale), attack: Math.round(base.attack * attackScale), defense: base.defense,
      speed: base.speed, color: base.color, state: 'chase', targetX: x, targetY: y, nextAttackTime: now + 500, flashUntil: 0,
      spawnTime: now + index * 40, lastAttackTime: 0, deathTime: 0, deathDuration: type === 'boss' ? BOSS_DEATH_MS : NORMAL_DEATH_MS, isDead: false,
      lastHitTime: 0, burnUntil: 0, nextBurnTick: 0, frostUntil: 0, frostSlow: 0,
      lastProgressX: x, lastProgressY: y, lastProgressTime: now,
    };
  }

  private livingEnemies(): Enemy[] {
    return this.state.enemies.filter(enemy => enemy.hp > 0 && !enemy.isDead);
  }

  private updateEffects(dt: number): void {
    for (let i = this.state.damageNumbers.length - 1; i >= 0; i--) {
      const damage = this.state.damageNumbers[i];
      damage.lifeTime += dt;
      damage.y -= dt / 1000 * 20;
      if (damage.lifeTime >= damage.maxLifeTime) this.state.damageNumbers.splice(i, 1);
    }
    for (let i = this.state.effects.length - 1; i >= 0; i--) {
      const effect = this.state.effects[i];
      effect.lifeTime += dt;
      if (effect.lifeTime >= effect.maxLifeTime) this.state.effects.splice(i, 1);
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i];
      p.lifeTime += dt;
      p.x += p.vx * dt / 1000;
      p.y += p.vy * dt / 1000;
      if (p.drag) { p.vx *= p.drag; p.vy *= p.drag; }
      if (p.gravity) p.vy += p.gravity * dt / 1000;
      if (p.lifeTime >= p.maxLifeTime) this.state.particles.splice(i, 1);
    }
  }

  private blockedByRoomProp(entity: { x: number; y: number; width: number; height: number }) {
    return collidesWithRoomProp(this.state.floor, this.state.map.width, this.state.map.height, entity.x, entity.y, entity.width, entity.height);
  }

  private moveEntity(entity: { x: number; y: number; width: number; height: number }, dx: number, dy: number): void {
    const distance = Math.max(Math.abs(dx), Math.abs(dy));
    const steps = Math.max(1, Math.ceil(distance / 6));
    const stepX = dx / steps;
    const stepY = dy / steps;

    for (let step = 0; step < steps; step++) {
      if (stepX !== 0) {
        entity.x += stepX;
        const ex = entity.x + (stepX > 0 ? entity.width : 0);
        const blockedByTiles = !isWalkable(this.state.map, ex, entity.y + entity.height / 2)
          || !isWalkable(this.state.map, ex, entity.y + 2)
          || !isWalkable(this.state.map, ex, entity.y + entity.height - 2);
        if (blockedByTiles || this.blockedByRoomProp(entity)) entity.x -= stepX;
      }
      if (stepY !== 0) {
        entity.y += stepY;
        const ey = entity.y + (stepY > 0 ? entity.height : 0);
        const blockedByTiles = !isWalkable(this.state.map, entity.x + entity.width / 2, ey)
          || !isWalkable(this.state.map, entity.x + 2, ey)
          || !isWalkable(this.state.map, entity.x + entity.width - 2, ey);
        if (blockedByTiles || this.blockedByRoomProp(entity)) entity.y -= stepY;
      }
    }
  }

  private emit(): void {
    this.onStateChange({
      ...this.state,
      player: { ...this.state.player, facing: { ...this.state.player.facing } },
      enemies: this.state.enemies.map(enemy => ({ ...enemy })),
      items: this.state.items.map(item => ({ ...item })),
      damageNumbers: this.state.damageNumbers.map(number => ({ ...number })),
      particles: this.state.particles.map(particle => ({ ...particle })),
      effects: this.state.effects.map(effect => ({ ...effect })),
      upgradeChoices: [...this.state.upgradeChoices],
      runSkills: { ...this.state.runSkills },
      camera: { ...this.state.camera },
    });
  }

  private spawnLoot(x: number, y: number, _enemyType: EnemyType): void {
    if (Math.random() >= 0.05) return;
    const now = Date.now();
    const id = ++this.lootCounter;
    let cx = x + (Math.random() - 0.5) * 14;
    let cy = y + (Math.random() - 0.5) * 14;
    if (!isWalkable(this.state.map, cx, cy) || collidesWithRoomProp(this.state.floor, this.state.map.width, this.state.map.height, cx - 8, cy - 8, 16, 16)) { cx = x; cy = y; }
    this.state.items.push({
      id: `potion-${id}`, type: 'item', itemType: 'potion', value: 25,
      x: cx - 8, y: cy - 8, width: 16, height: 16, vx: 0, vy: 0, color: '#ff6b6b', spawnTime: now,
    });
  }

  private pickupItems(time: number): void {
    const p = this.state.player;
    const px = p.x + p.width / 2;
    const py = p.y + p.height / 2;
    const pickupRadius = 30;
    const magnetRadius = 92;
    for (let i = this.state.items.length - 1; i >= 0; i--) {
      const item = this.state.items[i];
      const ix = item.x + item.width / 2;
      const iy = item.y + item.height / 2;
      const dist = Math.max(1, Math.hypot(px - ix, py - iy));
      if (dist < pickupRadius) {
        if (item.itemType === 'potion') {
          const heal = Math.min(item.value, p.maxHp - p.hp);
          if (heal > 0) p.hp += heal;
          this.state.damageNumbers.push({ id: `heal-${time}-${i}`, x: ix + (Math.random() - 0.5) * 10, y: iy - 8, value: `+${heal}`, color: '#43c968', lifeTime: 0, maxLifeTime: 700, scale: 1.05 });
          this.state.effects.push({ id: `heal-wave-${time}-${i}`, x: px, y: py, radius: 0, maxRadius: 54, color: '#67e89a', lifeTime: 0, maxLifeTime: 420, type: 'circle', element: 'normal' });
          this.state.particles.push(...makeParticles(px, py, '#67e89a', 10, 64, 2.4));
        }
        this.state.items.splice(i, 1);
        continue;
      }
      if (dist < magnetRadius) {
        const speed = 210;
        item.x += (px - ix) / dist * speed * 0.016;
        item.y += (py - iy) / dist * speed * 0.016;
      }
    }
  }
}

export type GameState = RunGameState;
