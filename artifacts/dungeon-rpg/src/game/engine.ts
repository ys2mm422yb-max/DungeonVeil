import { UpgradeKey } from '../i18n/translations';
import { ClassKey, CLASS_DEFS } from './classes';
import { DungeonMap, generateDungeon, TILE_SIZE, isWalkable, TileType, ChestSpawn } from './dungeon';
import { ROOM_TYPE_DEFS } from './roomTypes';
import { performPlayerAttack, performPlayerSkill, distance, checkCollision, makeParticles, makeHitSpark, makeStepDust } from './combat';
import { saveGame, SaveData } from './saveManager';
import { Player, Enemy, EnemyType, Item, Chest, DamageNumber, Particle, VisualEffect } from './entities';

export interface GameState {
  status: 'playing' | 'gameover' | 'levelup' | 'paused';
  floor: number;
  map: DungeonMap;
  player: Player;
  enemies: Enemy[];
  items: Item[];
  chests: Chest[];
  damageNumbers: DamageNumber[];
  particles: Particle[];
  effects: VisualEffect[];
  upgradeChoices: UpgradeKey[];
  killCount: number;
  camera: { x: number; y: number };
}

// Stats for each enemy type
interface EnemyStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  color: string;
  size: number;
  xp: number;
  chaseRange: number;
  attackRange: number;
}

const ENEMY_BASE_STATS: Record<EnemyType, EnemyStats> = {
  slime:    { hp: 25,  attack: 4,  defense: 0, speed: 38,  color: '#33cc66', size: 24, xp: 8,  chaseRange: 130, attackRange: 36 },
  goblin:   { hp: 35,  attack: 6,  defense: 1, speed: 75,  color: '#88aa44', size: 22, xp: 12, chaseRange: 160, attackRange: 34 },
  skeleton: { hp: 55,  attack: 9,  defense: 2, speed: 65,  color: '#ccccaa', size: 26, xp: 20, chaseRange: 150, attackRange: 38 },
  orc:      { hp: 100, attack: 13, defense: 5, speed: 50,  color: '#5a7733', size: 30, xp: 30, chaseRange: 120, attackRange: 42 },
  spider:   { hp: 40,  attack: 7,  defense: 1, speed: 90,  color: '#222222', size: 22, xp: 15, chaseRange: 180, attackRange: 30 },
  vampire:  { hp: 80,  attack: 14, defense: 3, speed: 85,  color: '#aa2244', size: 28, xp: 35, chaseRange: 200, attackRange: 40 },
  demon:    { hp: 130, attack: 18, defense: 4, speed: 88,  color: '#cc2200', size: 32, xp: 45, chaseRange: 180, attackRange: 44 },
  golem:    { hp: 200, attack: 20, defense: 10, speed: 35, color: '#5a5a7a', size: 34, xp: 55, chaseRange: 100, attackRange: 50 },
  boss:     { hp: 450, attack: 28, defense: 8, speed: 60,  color: '#ff0000', size: 40, xp: 200, chaseRange: 250, attackRange: 52 },
};

export class GameEngine {
  state: GameState;
  lastTime: number = 0;
  private lastSaveKillCount: number = 0;
  private lastStepTime: number = 0;

  input = {
    joyX: 0,
    joyY: 0,
    attack: false,
    skill: false,
    dodge: false,
    interact: false,
  };

  onStateChange: (state: GameState) => void = () => {};

  constructor() {
    this.state = this.makePlaceholderState();
  }

  private makePlaceholderState(): GameState {
    const map = generateDungeon(20, 20, 3, 1);
    return {
      status: 'playing',
      floor: 1,
      map,
      player: this.buildPlayer('Hero', 'warrior', map, 1, 0, CLASS_DEFS['warrior'].maxHp),
      enemies: [],
      items: [],
      chests: [],
      damageNumbers: [],
      particles: [],
      effects: [],
      upgradeChoices: [],
      killCount: 0,
      camera: { x: 0, y: 0 },
    };
  }

  private buildPlayer(
    name: string,
    cls: ClassKey,
    map: DungeonMap,
    level: number,
    xp: number,
    hp: number,
    overrides?: Partial<Player>,
  ): Player {
    const def = CLASS_DEFS[cls];
    const startX = map.startX * TILE_SIZE + TILE_SIZE / 2 - 16;
    const startY = map.startY * TILE_SIZE + TILE_SIZE / 2 - 16;
    return {
      id: 'player',
      type: 'player',
      playerName: name,
      playerClass: cls,
      x: startX,
      y: startY,
      width: 32,
      height: 32,
      vx: 0,
      vy: 0,
      hp: Math.min(hp, overrides?.maxHp ?? def.maxHp),
      maxHp: overrides?.maxHp ?? def.maxHp,
      attack: overrides?.attack ?? def.attack,
      defense: overrides?.defense ?? def.defense,
      speed: overrides?.speed ?? def.speed,
      attackRange: overrides?.attackRange ?? def.attackRange,
      skillRange: overrides?.skillRange ?? def.skillRange,
      level,
      xp,
      color: def.color,
      state: 'idle',
      facing: { x: 1, y: 0 },
      invincibleUntil: 0,
      skillCooldown: 0,
      dodgeCooldown: 0,
      attackCooldown: 0,
      spawnTime: Date.now(),
      lastAttackTime: 0,
    };
  }

  startNewGame(name: string, cls: ClassKey): void {
    const map = generateDungeon(32, 32, 8, 1);
    this.state = {
      status: 'playing',
      floor: 1,
      map,
      player: this.buildPlayer(name, cls, map, 1, 0, CLASS_DEFS[cls].maxHp),
      enemies: [],
      items: [],
      chests: [],
      damageNumbers: [],
      particles: [],
      effects: [],
      upgradeChoices: [],
      killCount: 0,
      camera: { x: 0, y: 0 },
    };
    this.lastTime = 0;
    this.lastSaveKillCount = 0;
    this.spawnEntities(1);
    this.doSave();
    this.onStateChange({ ...this.state });
  }

  continueGame(save: SaveData): void {
    const numRooms = Math.min(15, 6 + Math.floor(save.floor / 2));
    const w = 32 + save.floor * 2;
    const h = 32 + save.floor * 2;
    const map = generateDungeon(w, h, numRooms, save.floor);
    const def = CLASS_DEFS[save.playerClass];

    this.state = {
      status: 'playing',
      floor: save.floor,
      map,
      player: this.buildPlayer(save.playerName, save.playerClass, map, save.level, save.xp, save.hp, {
        maxHp: save.maxHp,
        attack: save.attack,
        defense: save.defense,
        speed: save.speed,
        attackRange: save.attackRange || def.attackRange,
        skillRange: save.skillRange || def.skillRange,
      } as Partial<Player>),
      enemies: [],
      items: [],
      chests: [],
      damageNumbers: [],
      particles: [],
      effects: [],
      upgradeChoices: [],
      killCount: save.killCount,
      camera: { x: 0, y: 0 },
    };
    this.lastTime = 0;
    this.lastSaveKillCount = save.killCount;
    this.spawnEntities(save.floor);
    this.onStateChange({ ...this.state });
  }

  private doSave(): void {
    const { player, floor, killCount } = this.state;
    const data: SaveData = {
      playerName: player.playerName,
      playerClass: player.playerClass,
      floor,
      level: player.level,
      xp: player.xp,
      hp: player.hp,
      maxHp: player.maxHp,
      attack: player.attack,
      defense: player.defense,
      speed: player.speed,
      attackRange: player.attackRange,
      skillRange: player.skillRange,
      killCount,
      savedAt: Date.now(),
    };
    saveGame(data);
  }

  nextFloor(): void {
    this.state.floor++;
    const numRooms = Math.min(15, 6 + Math.floor(this.state.floor / 2));
    const width  = 32 + this.state.floor * 2;
    const height = 32 + this.state.floor * 2;
    this.state.map = generateDungeon(width, height, numRooms, this.state.floor);
    this.state.player.x = this.state.map.startX * TILE_SIZE + TILE_SIZE / 2 - 16;
    this.state.player.y = this.state.map.startY * TILE_SIZE + TILE_SIZE / 2 - 16;
    this.state.enemies = [];
    this.state.items = [];
    this.state.chests = [];
    this.state.effects = [];
    this.state.damageNumbers = [];
    this.state.particles = [];
    this.spawnEntities(this.state.floor);
    this.doSave();
    this.onStateChange({ ...this.state });
  }

  spawnEntities(floor: number): void {
    const { map } = this.state;
    const now = Date.now();

    this.state.chests = map.chests.map((c: ChestSpawn, idx: number) =>
      this.makeChest(c, idx, floor),
    );

    for (let i = 1; i < map.rooms.length; i++) {
      const room = map.rooms[i];
      const def = ROOM_TYPE_DEFS[room.roomType];

      if (def.peaceful) {
        this.spawnPotions(room, def.potionBonus + Math.floor(Math.random() * 2), floor);
        continue;
      }

      const baseCount = Math.floor(Math.random() * 3) + Math.floor(floor / 2);
      const count = Math.round(baseCount * def.enemyMult);
      const pool = def.enemyTypes.length > 0 ? def.enemyTypes : this.defaultPool(floor);

      for (let j = 0; j < count; j++) {
        const type = pool[Math.floor(Math.random() * pool.length)] as EnemyType;
        const base = ENEMY_BASE_STATS[type];

        const ex = (room.x + 1 + Math.random() * (room.w - 2)) * TILE_SIZE;
        const ey = (room.y + 1 + Math.random() * (room.h - 2)) * TILE_SIZE;
        const floorScale = 1 + (floor - 1) * 0.18;

        this.state.enemies.push({
          id: `${now}-${i}-${j}`,
          type: 'enemy',
          enemyType: type,
          x: ex, y: ey,
          width: base.size, height: base.size,
          vx: 0, vy: 0,
          hp: Math.round(base.hp * floorScale),
          maxHp: Math.round(base.hp * floorScale),
          attack: Math.round(base.attack + floor * 1.5),
          defense: base.defense,
          speed: base.speed,
          color: base.color,
          state: 'patrol',
          targetX: ex, targetY: ey,
          nextAttackTime: 0,
          flashUntil: 0,
          spawnTime: now + Math.random() * 1000,
          lastAttackTime: 0,
          deathTime: 0,
          isDead: false,
        });
      }

      this.spawnPotions(room, def.potionBonus, floor);
    }
  }

  private makeChest(c: ChestSpawn, _idx: number, floor: number): Chest {
    const lootRoll = Math.random();
    const lootType: 'gold' | 'potion' | 'big_potion' =
      lootRoll < 0.5 ? 'potion' :
      lootRoll < 0.8 ? 'big_potion' : 'gold';
    return {
      id: `chest-${c.tx}-${c.ty}`,
      type: 'chest',
      x: c.tx * TILE_SIZE + 4,
      y: c.ty * TILE_SIZE + 4,
      width: TILE_SIZE - 8,
      height: TILE_SIZE - 8,
      vx: 0, vy: 0,
      locked: c.locked,
      opened: false,
      lootType,
      lootValue: lootType === 'big_potion' ? 60 + floor * 10 : 25 + floor * 5,
      roomIndex: c.roomIndex,
      openTime: 0,
    };
  }

  private spawnPotions(
    room: { x: number; y: number; w: number; h: number },
    count: number,
    floor: number,
  ): void {
    const now = Date.now();
    for (let p = 0; p < count; p++) {
      const px = (room.x + 1 + Math.random() * (room.w - 2)) * TILE_SIZE;
      const py = (room.y + 1 + Math.random() * (room.h - 2)) * TILE_SIZE;
      this.state.items.push({
        id: Math.random().toString(36),
        type: 'item',
        itemType: 'potion',
        value: 20 + floor * 5,
        color: '#33cc66',
        x: px, y: py,
        width: 16, height: 16,
        vx: 0, vy: 0,
        spawnTime: now + Math.random() * 500,
      });
    }
  }

  private defaultPool(floor: number): EnemyType[] {
    if (floor <= 1) return ['slime', 'goblin'];
    if (floor <= 2) return ['slime', 'goblin', 'skeleton'];
    if (floor <= 3) return ['goblin', 'skeleton', 'orc', 'spider'];
    if (floor <= 5) return ['skeleton', 'orc', 'spider', 'vampire'];
    return ['orc', 'vampire', 'demon', 'golem'];
  }

  update(timestamp: number): void {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min(timestamp - this.lastTime, 100);
    this.lastTime = timestamp;

    if (this.state.status !== 'playing') return;

    this.updatePlayer(dt, timestamp);
    this.updateEnemies(dt, timestamp);
    this.updateItems(timestamp);
    this.updateEffects(dt);
    this.updateParticles(dt);
    this.updateCamera();

    const px = Math.floor((this.state.player.x + 16) / TILE_SIZE);
    const py = Math.floor((this.state.player.y + 16) / TILE_SIZE);
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const ny = py + dy, nx = px + dx;
        if (ny >= 0 && ny < this.state.map.height && nx >= 0 && nx < this.state.map.width)
          this.state.map.explored[ny][nx] = true;
      }
    }

    if (this.state.player.hp <= 0) {
      this.state.status = 'gameover';
      this.onStateChange({ ...this.state });
      return;
    }

    const xpNeeded = this.state.player.level * 100;
    if (this.state.player.xp >= xpNeeded) {
      this.state.player.xp -= xpNeeded;
      this.state.player.level++;
      this.state.status = 'levelup';
      this.generateUpgradeChoices();
      this.doSave();
      this.onStateChange({ ...this.state });
      return;
    }

    if (this.state.killCount >= this.lastSaveKillCount + 5) {
      this.lastSaveKillCount = this.state.killCount;
      this.doSave();
    }

    if (this.input.interact) {
      this.input.interact = false;
      if (this.state.map.tiles[py]?.[px] === TileType.STAIRS_DOWN) {
        this.nextFloor();
        return;
      }
      this.tryOpenNearbyChest(timestamp);
    }
  }

  private tryOpenNearbyChest(time: number): void {
    const { player, chests } = this.state;
    const pcx = player.x + 16, pcy = player.y + 16;

    for (const chest of chests) {
      if (chest.opened) continue;
      const ccx = chest.x + chest.width / 2;
      const ccy = chest.y + chest.height / 2;
      if (distance(pcx, pcy, ccx, ccy) < 64) {
        if (chest.locked) {
          const cost = Math.max(1, Math.floor(player.maxHp * 0.06));
          player.hp = Math.max(1, player.hp - cost);
          this.state.damageNumbers.push({
            id: Math.random().toString(36),
            x: ccx, y: chest.y - 10,
            value: `-${cost} HP`, color: '#e74c3c',
            lifeTime: 0, maxLifeTime: 1200,
            scale: 1.2,
          });
          chest.locked = false;
        }
        chest.opened = true;
        chest.openTime = time;
        this.applyChestLoot(chest);
        return;
      }
    }
  }

  private applyChestLoot(chest: Chest): void {
    const { player } = this.state;
    const cx = chest.x + chest.width / 2;
    const cy = chest.y + chest.height / 2;

    if (chest.lootType === 'potion' || chest.lootType === 'big_potion') {
      const heal = chest.lootValue;
      player.hp = Math.min(player.maxHp, player.hp + heal);
      this.state.damageNumbers.push({
        id: Math.random().toString(36),
        x: cx, y: cy - 10,
        value: `+${heal} HP`, color: '#33cc66',
        lifeTime: 0, maxLifeTime: 1500,
        scale: 1.3,
      });
    } else {
      player.xp += chest.lootValue;
      this.state.damageNumbers.push({
        id: Math.random().toString(36),
        x: cx, y: cy - 10,
        value: `+${chest.lootValue} XP`, color: '#ffdd33',
        lifeTime: 0, maxLifeTime: 1500,
        scale: 1.3,
      });
    }

    this.state.effects.push({
      id: Math.random().toString(36),
      x: cx, y: cy,
      radius: 0, maxRadius: 50,
      color: 'rgba(255,220,50,0.6)',
      lifeTime: 0, maxLifeTime: 400,
      type: 'sweep',
    });
    this.state.particles.push(...makeParticles(cx, cy, '#ffdd33', 12, 70, 2.5));

    this.onStateChange({ ...this.state });
  }

  generateUpgradeChoices(): void {
    const options: UpgradeKey[] = ['maxHp', 'attack', 'speed', 'defense', 'heal'];
    this.state.upgradeChoices = options.sort(() => 0.5 - Math.random()).slice(0, 3);
  }

  applyUpgrade(choice: UpgradeKey): void {
    const { player } = this.state;
    if (choice === 'maxHp')   { player.maxHp += 20; player.hp += 20; }
    else if (choice === 'attack')  { player.attack += 5; }
    else if (choice === 'speed')   { player.speed += 15; }
    else if (choice === 'defense') { player.defense += 1; }
    else if (choice === 'heal')    { player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.5); }
    this.state.status = 'playing';
    this.doSave();
    this.onStateChange({ ...this.state });
  }

  updatePlayer(dt: number, time: number): void {
    const { player } = this.state;
    const def = CLASS_DEFS[player.playerClass];

    if (player.attackCooldown > 0) player.attackCooldown -= dt;
    if (player.skillCooldown   > 0) player.skillCooldown   -= dt;
    if (player.dodgeCooldown   > 0) player.dodgeCooldown   -= dt;

    let isDodging = false;
    if (this.input.dodge && player.dodgeCooldown <= 0) {
      player.dodgeCooldown = def.dodgeCooldownMs;
      player.invincibleUntil = time + 280;
      const mag = Math.sqrt(this.input.joyX ** 2 + this.input.joyY ** 2);
      let dx = player.facing.x, dy = player.facing.y;
      if (mag > 0) { dx = this.input.joyX / mag; dy = this.input.joyY / mag; }
      this.moveEntity(player, dx * def.dashDistance, dy * def.dashDistance);
      isDodging = true;
      this.input.dodge = false;
      // Dash dust
      const cx = player.x + player.width / 2;
      const cy = player.y + player.height / 2;
      this.state.particles.push(...makeStepDust(cx, cy + 12, '#a0a0c0'));
      this.state.particles.push(...makeStepDust(cx, cy + 12, def.glowColor));
    }

    if (!isDodging) {
      const mx = this.input.joyX * player.speed * (dt / 1000);
      const my = this.input.joyY * player.speed * (dt / 1000);
      if (mx !== 0 || my !== 0) {
        if (mx !== 0) player.facing.x = Math.sign(mx);
        if (my !== 0) player.facing.y = Math.sign(my);
        player.state = 'moving';
        // step dust every 240ms
        if (time - this.lastStepTime > 240) {
          this.lastStepTime = time;
          const cx = player.x + player.width / 2;
          const cy = player.y + player.height - 4;
          this.state.particles.push(...makeStepDust(cx, cy));
        }
      } else {
        player.state = 'idle';
      }
      this.moveEntity(player, mx, my);
    }

    if (this.input.attack && player.attackCooldown <= 0) {
      player.attackCooldown = def.attackCooldownMs;
      const result = performPlayerAttack(player, this.state.enemies, time);
      this.state.damageNumbers.push(...result.damageNumbers);
      this.state.effects.push(...result.effects);
      this.state.particles.push(...result.particles);
      this.input.attack = false;
    }

    if (this.input.skill && player.skillCooldown <= 0) {
      player.skillCooldown = def.skillCooldownMs;
      const result = performPlayerSkill(player, this.state.enemies, time);
      this.state.damageNumbers.push(...result.damageNumbers);
      this.state.effects.push(...result.effects);
      this.state.particles.push(...result.particles);
      this.input.skill = false;
    }
  }

  updateEnemies(dt: number, time: number): void {
    const { enemies, player } = this.state;

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      if (enemy.hp <= 0) {
        if (!enemy.isDead) {
          // Rewards are given immediately when the enemy dies, preserving original mechanics.
          enemy.isDead = true;
          enemy.state = 'dead';
          enemy.deathTime = time;
          this.state.killCount++;
          const base = ENEMY_BASE_STATS[enemy.enemyType];
          player.xp += base.xp;

          const cx = enemy.x + enemy.width / 2;
          const cy = enemy.y + enemy.height / 2;
          this.state.particles.push(...makeParticles(cx, cy, enemy.color, 16, 90, 3));
          this.state.particles.push(...makeParticles(cx, cy, '#ffcc00', 8, 70, 2));

          this.state.items.push({
            id: Math.random().toString(36),
            type: 'item',
            itemType: 'xp_orb',
            value: 0,
            color: '#ffaa00',
            x: cx - 8,
            y: cy - 8,
            width: 12, height: 12, vx: 0, vy: 0,
            spawnTime: time,
          });

          if (Math.random() < 0.15) {
            this.state.items.push({
              id: Math.random().toString(36),
              type: 'item',
              itemType: 'potion',
              value: 15 + this.state.floor * 3,
              color: '#33cc66',
              x: cx - 8,
              y: cy + 10,
              width: 14, height: 14, vx: 0, vy: 0,
              spawnTime: time,
            });
          }

          this.onStateChange({ ...this.state });
        }
        // Leave corpse for 400ms, then remove it
        if (time - enemy.deathTime > 400) {
          enemies.splice(i, 1);
        }
        continue;
      }

      const base = ENEMY_BASE_STATS[enemy.enemyType];
      const distToPlayer = distance(
        enemy.x + enemy.width / 2, enemy.y + enemy.height / 2,
        player.x + 16, player.y + 16,
      );

      if (distToPlayer < base.chaseRange) enemy.state = 'chase';
      else if (distToPlayer > base.chaseRange * 2) enemy.state = 'patrol';

      let dx = 0, dy = 0;

      if (enemy.state === 'chase') {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        dx = Math.cos(angle) * enemy.speed * (dt / 1000);
        dy = Math.sin(angle) * enemy.speed * (dt / 1000);

        if (distToPlayer < base.attackRange && time > enemy.nextAttackTime) {
          const attackInterval = enemy.enemyType === 'golem' ? 1800 :
                                 enemy.enemyType === 'boss'  ? 700  :
                                 enemy.enemyType === 'slime' ? 1200 : 1000;
          enemy.nextAttackTime = time + attackInterval;
          enemy.lastAttackTime = time;
          if (time > player.invincibleUntil) {
            const dmg = Math.max(1, enemy.attack - player.defense + Math.floor(Math.random() * 3));
            player.hp -= dmg;
            this.state.damageNumbers.push({
              id: Math.random().toString(36),
              x: player.x + 16, y: player.y - 10,
              value: `-${dmg}`, color: '#c0392b',
              lifeTime: 0, maxLifeTime: 1000,
              scale: 1.2,
            });
            // Player hit particles
            this.state.particles.push(...makeHitSpark(player.x + 16, player.y + 16, '#ff3333', 10));
            this.onStateChange({ ...this.state });
          }
        }
      } else {
        if (Math.random() < 0.015) {
          enemy.targetX = enemy.x + (Math.random() * 120 - 60);
          enemy.targetY = enemy.y + (Math.random() * 120 - 60);
        }
        const ang2 = Math.atan2(enemy.targetY - enemy.y, enemy.targetX - enemy.x);
        dx = Math.cos(ang2) * enemy.speed * 0.4 * (dt / 1000);
        dy = Math.sin(ang2) * enemy.speed * 0.4 * (dt / 1000);
      }

      this.moveEntity(enemy, dx, dy);
    }
  }

  updateItems(time: number): void {
    const { items, player } = this.state;
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (checkCollision(player, item)) {
        if (item.itemType === 'potion') {
          player.hp = Math.min(player.maxHp, player.hp + item.value);
          this.state.damageNumbers.push({
            id: Math.random().toString(36),
            x: player.x, y: player.y - 10,
            value: `+${item.value}`, color: '#33cc66',
            lifeTime: 0, maxLifeTime: 1000,
            scale: 1.2,
          });
          this.state.particles.push(...makeHitSpark(player.x + 16, player.y + 16, '#33cc66', 6));
        }
        items.splice(i, 1);
        this.onStateChange({ ...this.state });
      }
    }
  }

  updateEffects(dt: number): void {
    const { damageNumbers, effects } = this.state;
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
      damageNumbers[i].lifeTime += dt;
      damageNumbers[i].y -= (dt / 1000) * 22;
      if (damageNumbers[i].lifeTime >= damageNumbers[i].maxLifeTime) damageNumbers.splice(i, 1);
    }
    for (let i = effects.length - 1; i >= 0; i--) {
      effects[i].lifeTime += dt;
      if (effects[i].type === 'sweep') {
        effects[i].radius = (effects[i].lifeTime / effects[i].maxLifeTime) * effects[i].maxRadius;
      }
      if (effects[i].lifeTime >= effects[i].maxLifeTime) effects.splice(i, 1);
    }
  }

  updateParticles(dt: number): void {
    const { particles } = this.state;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.lifeTime += dt;
      p.x += p.vx * (dt / 1000);
      p.y += p.vy * (dt / 1000);
      if (p.drag) {
        p.vx *= p.drag;
        p.vy *= p.drag;
      }
      if (p.gravity) {
        p.vy += p.gravity * (dt / 1000);
      }
      if (p.lifeTime >= p.maxLifeTime) particles.splice(i, 1);
    }
  }

  updateCamera(): void {
    this.state.camera.x = this.state.player.x + 16;
    this.state.camera.y = this.state.player.y + 16;
  }

  moveEntity(
    entity: { x: number; y: number; width: number; height: number },
    dx: number,
    dy: number,
  ): void {
    if (dx !== 0) {
      entity.x += dx;
      const ex = entity.x + (dx > 0 ? entity.width : 0);
      if (
        !isWalkable(this.state.map, ex, entity.y + entity.height / 2) ||
        !isWalkable(this.state.map, ex, entity.y) ||
        !isWalkable(this.state.map, ex, entity.y + entity.height)
      ) entity.x -= dx;
    }
    if (dy !== 0) {
      entity.y += dy;
      const ey = entity.y + (dy > 0 ? entity.height : 0);
      if (
        !isWalkable(this.state.map, entity.x + entity.width / 2, ey) ||
        !isWalkable(this.state.map, entity.x, ey) ||
        !isWalkable(this.state.map, entity.x + entity.width, ey)
      ) entity.y -= dy;
    }
  }
}
