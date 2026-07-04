import { Player, Enemy, Item, DamageNumber, Particle, VisualEffect, EnemyType } from './entities';
import { DungeonMap, generateDungeon, TILE_SIZE, isWalkable, TileType } from './dungeon';
import { performPlayerAttack, performPlayerSkill, distance, checkCollision } from './combat';

export interface GameState {
  status: 'start' | 'playing' | 'gameover' | 'levelup' | 'paused';
  floor: number;
  map: DungeonMap;
  player: Player;
  enemies: Enemy[];
  items: Item[];
  damageNumbers: DamageNumber[];
  particles: Particle[];
  effects: VisualEffect[];
  upgradeChoices: string[];
  killCount: number;
  camera: { x: number, y: number };
}

export class GameEngine {
  state: GameState;
  lastTime: number = 0;
  
  input = {
    joyX: 0,
    joyY: 0,
    attack: false,
    skill: false,
    dodge: false,
    interact: false
  };

  onStateChange: (state: GameState) => void = () => {};

  constructor() {
    this.state = this.createInitialState();
  }

  createInitialState(): GameState {
    const map = generateDungeon(30, 30, 8);
    const startX = map.startX * TILE_SIZE + TILE_SIZE / 2 - 15;
    const startY = map.startY * TILE_SIZE + TILE_SIZE / 2 - 15;

    return {
      status: 'start',
      floor: 1,
      map,
      player: {
        id: 'player',
        type: 'player',
        x: startX,
        y: startY,
        width: 30,
        height: 30,
        vx: 0,
        vy: 0,
        hp: 100,
        maxHp: 100,
        attack: 10,
        defense: 5,
        speed: 120,
        level: 1,
        xp: 0,
        color: '#3498db',
        state: 'idle',
        facing: { x: 1, y: 0 },
        invincibleUntil: 0,
        skillCooldown: 0,
        dodgeCooldown: 0,
        attackCooldown: 0
      },
      enemies: [],
      items: [],
      damageNumbers: [],
      particles: [],
      effects: [],
      upgradeChoices: [],
      killCount: 0,
      camera: { x: 0, y: 0 }
    };
  }

  startGame() {
    this.state = this.createInitialState();
    this.state.status = 'playing';
    this.spawnEntities(1);
    this.onStateChange({...this.state});
  }

  nextFloor() {
    this.state.floor++;
    const numRooms = Math.min(15, 6 + Math.floor(this.state.floor / 2));
    const width = 30 + this.state.floor * 2;
    const height = 30 + this.state.floor * 2;
    this.state.map = generateDungeon(width, height, numRooms);
    
    this.state.player.x = this.state.map.startX * TILE_SIZE + TILE_SIZE / 2 - 15;
    this.state.player.y = this.state.map.startY * TILE_SIZE + TILE_SIZE / 2 - 15;
    this.state.enemies = [];
    this.state.items = [];
    this.state.effects = [];
    this.state.damageNumbers = [];
    this.spawnEntities(this.state.floor);
    this.onStateChange({...this.state});
  }

  spawnEntities(floor: number) {
    const { map } = this.state;
    // Skip first room
    for (let i = 1; i < map.rooms.length; i++) {
      const room = map.rooms[i];
      const numEnemies = Math.floor(Math.random() * 3) + Math.floor(floor / 2);
      
      for (let j = 0; j < numEnemies; j++) {
        const x = (room.x + 1 + Math.random() * (room.w - 2)) * TILE_SIZE;
        const y = (room.y + 1 + Math.random() * (room.h - 2)) * TILE_SIZE;
        
        let type: EnemyType = 'slime';
        const rand = Math.random();
        if (floor > 2 && rand > 0.6) type = 'skeleton';
        if (floor > 4 && rand > 0.85) type = 'demon';

        let hp = 30, attack = 5, speed = 40, color = '#2ecc71', size = 24;
        if (type === 'skeleton') { hp = 60; attack = 8; speed = 70; color = '#95a5a6'; size = 26; }
        else if (type === 'demon') { hp = 120; attack = 15; speed = 90; color = '#e74c3c'; size = 32; }

        hp += floor * 10;
        attack += floor * 2;

        this.state.enemies.push({
          id: Math.random().toString(),
          type: 'enemy',
          enemyType: type,
          x, y, width: size, height: size,
          vx: 0, vy: 0,
          hp, maxHp: hp, attack, speed, color,
          state: 'patrol', targetX: x, targetY: y,
          nextAttackTime: 0, flashUntil: 0
        });
      }

      // Potions
      const numPotions = Math.floor(Math.random() * 3);
      for(let j=0; j<numPotions; j++){
         const x = (room.x + 1 + Math.random() * (room.w - 2)) * TILE_SIZE;
         const y = (room.y + 1 + Math.random() * (room.h - 2)) * TILE_SIZE;
         this.state.items.push({
           id: Math.random().toString(),
           type: 'item',
           itemType: 'potion',
           value: 20 + floor * 5,
           color: '#2ecc71',
           x, y, width: 16, height: 16, vx:0, vy:0
         })
      }
    }
  }

  update(timestamp: number) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;

    if (this.state.status !== 'playing') return;

    this.updatePlayer(dt, timestamp);
    this.updateEnemies(dt, timestamp);
    this.updateItems();
    this.updateEffects(dt);
    this.updateCamera();

    // Map exploration
    const px = Math.floor((this.state.player.x + this.state.player.width/2) / TILE_SIZE);
    const py = Math.floor((this.state.player.y + this.state.player.height/2) / TILE_SIZE);
    if (py >= 0 && py < this.state.map.height && px >= 0 && px < this.state.map.width) {
      this.state.map.explored[py][px] = true;
      // Reveal surrounding
      for(let dy=-2; dy<=2; dy++) {
        for(let dx=-2; dx<=2; dx++) {
          if (py+dy >= 0 && py+dy < this.state.map.height && px+dx >= 0 && px+dx < this.state.map.width) {
            this.state.map.explored[py+dy][px+dx] = true;
          }
        }
      }
    }

    if (this.state.player.hp <= 0) {
      this.state.status = 'gameover';
      this.onStateChange({...this.state});
    }

    // Check level up
    const xpNeeded = this.state.player.level * 100;
    if (this.state.player.xp >= xpNeeded) {
      this.state.player.xp -= xpNeeded;
      this.state.player.level++;
      this.state.status = 'levelup';
      this.generateUpgradeChoices();
      this.onStateChange({...this.state});
    }

    // Check stairs interact
    if (this.input.interact) {
       this.input.interact = false;
       if (this.state.map.tiles[py]?.[px] === TileType.STAIRS_DOWN) {
         this.nextFloor();
       }
    }
  }

  generateUpgradeChoices() {
    const options = ['+20 Max HP', '+5 Attack', '+1 Speed tier', '+1 Defense', '+50% Heal'];
    this.state.upgradeChoices = options.sort(() => 0.5 - Math.random()).slice(0, 3);
  }

  applyUpgrade(choice: string) {
    const { player } = this.state;
    if (choice === '+20 Max HP') {
      player.maxHp += 20;
      player.hp += 20;
    } else if (choice === '+5 Attack') {
      player.attack += 5;
    } else if (choice === '+1 Speed tier') {
      player.speed += 15;
    } else if (choice === '+1 Defense') {
      player.defense += 1;
    } else if (choice === '+50% Heal') {
      player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.5);
    }
    this.state.status = 'playing';
    this.onStateChange({...this.state});
  }

  updatePlayer(dt: number, time: number) {
    const { player } = this.state;
    
    // Cooldowns
    if (player.attackCooldown > 0) player.attackCooldown -= dt;
    if (player.skillCooldown > 0) player.skillCooldown -= dt;
    if (player.dodgeCooldown > 0) player.dodgeCooldown -= dt;
    
    let isDodging = false;
    
    if (this.input.dodge && player.dodgeCooldown <= 0) {
      player.dodgeCooldown = 1500;
      player.invincibleUntil = time + 300;
      // Dash
      const dashDist = 80;
      const mag = Math.sqrt(this.input.joyX*this.input.joyX + this.input.joyY*this.input.joyY);
      let dx = player.facing.x;
      let dy = player.facing.y;
      if (mag > 0) {
        dx = this.input.joyX / mag;
        dy = this.input.joyY / mag;
      }
      this.moveEntity(player, dx * dashDist, dy * dashDist);
      isDodging = true;
      this.input.dodge = false;
    }

    if (!isDodging) {
      const moveX = this.input.joyX * player.speed * (dt / 1000);
      const moveY = this.input.joyY * player.speed * (dt / 1000);
      
      if (moveX !== 0 || moveY !== 0) {
        player.facing.x = moveX !== 0 ? moveX / Math.abs(moveX) : 0;
        player.facing.y = moveY !== 0 ? moveY / Math.abs(moveY) : 0;
        player.state = 'moving';
      } else {
        player.state = 'idle';
      }
      
      this.moveEntity(player, moveX, moveY);
    }

    if (this.input.attack && player.attackCooldown <= 0) {
      player.attackCooldown = 400;
      const { hits, damageNumbers, effects } = performPlayerAttack(player, this.state.enemies, time);
      this.state.damageNumbers.push(...damageNumbers);
      this.state.effects.push(...effects);
      this.input.attack = false;
    }

    if (this.input.skill && player.skillCooldown <= 0) {
      player.skillCooldown = 3000;
      const { hits, damageNumbers, effects } = performPlayerSkill(player, this.state.enemies, time);
      this.state.damageNumbers.push(...damageNumbers);
      this.state.effects.push(...effects);
      this.input.skill = false;
    }
  }

  updateEnemies(dt: number, time: number) {
    const { enemies, player } = this.state;
    
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      if (enemy.hp <= 0) {
        this.state.killCount++;
        player.xp += (enemy.enemyType === 'demon' ? 40 : enemy.enemyType === 'skeleton' ? 20 : 10);
        
        // Spawn XP orb
        this.state.items.push({
          id: Math.random().toString(),
          type: 'item',
          itemType: 'xp_orb',
          value: 0,
          color: '#e8a020',
          x: enemy.x + enemy.width/2,
          y: enemy.y + enemy.height/2,
          width: 8, height: 8, vx: 0, vy: 0
        });

        enemies.splice(i, 1);
        continue;
      }

      const distToPlayer = distance(
        enemy.x + enemy.width/2, enemy.y + enemy.height/2,
        player.x + player.width/2, player.y + player.height/2
      );

      if (distToPlayer < 150) {
        enemy.state = 'chase';
      } else if (distToPlayer > 300) {
        enemy.state = 'patrol';
      }

      let dx = 0, dy = 0;

      if (enemy.state === 'chase') {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        dx = Math.cos(angle) * enemy.speed * (dt / 1000);
        dy = Math.sin(angle) * enemy.speed * (dt / 1000);

        if (distToPlayer < 40 && time > enemy.nextAttackTime) {
          enemy.nextAttackTime = time + 1000;
          if (time > player.invincibleUntil) {
            const dmg = Math.max(1, enemy.attack - player.defense);
            player.hp -= dmg;
            this.state.damageNumbers.push({
              id: Math.random().toString(),
              x: player.x + player.width/2, y: player.y - 10,
              value: `-${dmg}`, color: '#c0392b', lifeTime: 0, maxLifeTime: 1000
            });
            // screen shake effect could be added
            this.onStateChange({...this.state});
          }
        }
      } else if (enemy.state === 'patrol') {
        if (Math.random() < 0.02) {
          enemy.targetX = enemy.x + (Math.random() * 100 - 50);
          enemy.targetY = enemy.y + (Math.random() * 100 - 50);
        }
        const angle = Math.atan2(enemy.targetY - enemy.y, enemy.targetX - enemy.x);
        dx = Math.cos(angle) * enemy.speed * 0.5 * (dt / 1000);
        dy = Math.sin(angle) * enemy.speed * 0.5 * (dt / 1000);
      }

      this.moveEntity(enemy, dx, dy);
    }
  }

  updateItems() {
    const { items, player } = this.state;
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (checkCollision(player, item)) {
        if (item.itemType === 'potion') {
          player.hp = Math.min(player.maxHp, player.hp + item.value);
          this.state.damageNumbers.push({
            id: Math.random().toString(),
            x: player.x, y: player.y - 10, value: `+${item.value}`, color: '#2ecc71', lifeTime: 0, maxLifeTime: 1000
          });
        } else if (item.itemType === 'xp_orb') {
          // handled implicitly or add some visual feedback
        }
        items.splice(i, 1);
        this.onStateChange({...this.state});
      }
    }
  }

  updateEffects(dt: number) {
    const { damageNumbers, effects, particles } = this.state;
    
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
      damageNumbers[i].lifeTime += dt;
      damageNumbers[i].y -= (dt / 1000) * 20; // float up
      if (damageNumbers[i].lifeTime >= damageNumbers[i].maxLifeTime) {
        damageNumbers.splice(i, 1);
      }
    }

    for (let i = effects.length - 1; i >= 0; i--) {
      effects[i].lifeTime += dt;
      if (effects[i].type === 'sweep') {
        effects[i].radius = (effects[i].lifeTime / effects[i].maxLifeTime) * effects[i].maxRadius;
      }
      if (effects[i].lifeTime >= effects[i].maxLifeTime) {
        effects.splice(i, 1);
      }
    }
  }

  updateCamera() {
    this.state.camera.x = this.state.player.x + this.state.player.width / 2;
    this.state.camera.y = this.state.player.y + this.state.player.height / 2;
  }

  moveEntity(entity: {x: number, y: number, width: number, height: number}, dx: number, dy: number) {
    if (dx !== 0) {
      entity.x += dx;
      if (!isWalkable(this.state.map, entity.x + (dx>0?entity.width:0), entity.y + entity.height/2) ||
          !isWalkable(this.state.map, entity.x + (dx>0?entity.width:0), entity.y) ||
          !isWalkable(this.state.map, entity.x + (dx>0?entity.width:0), entity.y + entity.height)) {
        entity.x -= dx;
      }
    }
    if (dy !== 0) {
      entity.y += dy;
      if (!isWalkable(this.state.map, entity.x + entity.width/2, entity.y + (dy>0?entity.height:0)) ||
          !isWalkable(this.state.map, entity.x, entity.y + (dy>0?entity.height:0)) ||
          !isWalkable(this.state.map, entity.x + entity.width, entity.y + (dy>0?entity.height:0))) {
        entity.y -= dy;
      }
    }
  }
}
