import { GameEngine } from './runEngine';
import type { Enemy, EnemyType } from './entities';
import { isBossRoom } from './chapterRun';
import { getEncounterPlan } from './encounterPlan';
import { getRoomSpawnPoints, sceneSpawnToGame } from './roomSpawn3D';
import { collidesWithRoomProp } from './roomCollision3D';
import { isWalkable } from './dungeon';

const ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
const PATCH_FLAG = Symbol.for('dungeon-veil-room20-runtime-override');

const ENEMY_STATS: Record<EnemyType, { hp: number; attack: number; defense: number; speed: number; size: number; color: string }> = {
  slime: { hp: 24, attack: 4, defense: 0, speed: 42, size: 24, color: '#43c968' },
  goblin: { hp: 34, attack: 6, defense: 1, speed: 68, size: 23, color: '#89a94b' },
  skeleton: { hp: 52, attack: 8, defense: 2, speed: 62, size: 26, color: '#d1ccb0' },
  orc: { hp: 92, attack: 12, defense: 4, speed: 48, size: 30, color: '#627c38' },
  spider: { hp: 38, attack: 7, defense: 1, speed: 88, size: 22, color: '#342d42' },
  vampire: { hp: 82, attack: 14, defense: 3, speed: 82, size: 28, color: '#9e304b' },
  demon: { hp: 128, attack: 18, defense: 4, speed: 76, size: 32, color: '#c53827' },
  golem: { hp: 190, attack: 20, defense: 9, speed: 35, size: 34, color: '#696985' },
  boss: { hp: 520, attack: 24, defense: 7, speed: 54, size: 44, color: '#ff493a' },
};

function applyAndroidProfile(): void {
  if (!ANDROID) return;
  try { sessionStorage.setItem('dungeon-veil-low-gpu', '1'); } catch {}
  try {
    const current = window.devicePixelRatio || 1;
    if (current > 1) Object.defineProperty(window, 'devicePixelRatio', { configurable: true, get: () => 1 });
  } catch {}
}

function makeEnemy(engine: GameEngine, type: EnemyType, index: number, scale: number, spawnId: number): Enemy | null {
  const room = engine.state.floor;
  const base = ENEMY_STATS[type];
  const point = getRoomSpawnPoints(room)[index % getRoomSpawnPoints(room).length];
  const spawn = sceneSpawnToGame(point, engine.state.map.width, engine.state.map.height, base.size);
  if (!isWalkable(engine.state.map, spawn.x + base.size / 2, spawn.y + base.size / 2)) return null;
  if (collidesWithRoomProp(room, engine.state.map.width, engine.state.map.height, spawn.x, spawn.y, base.size, base.size, 0.22)) return null;
  const now = performance.now();
  const roomPressure = 1 + Math.max(0, room - 1) * 0.1;
  const chapterPressure = 1 + Math.max(0, engine.state.chapter - 1) * 0.42;
  const finalBoss = room === 20 && type === 'boss';
  const totalScale = scale * roomPressure * chapterPressure * (finalBoss ? 1.18 : 1);
  return {
    id: `${spawnId}-${room}-${index}`,
    type: 'enemy', enemyType: type,
    x: spawn.x, y: spawn.y, width: base.size, height: base.size, vx: 0, vy: 0,
    hp: Math.round(base.hp * totalScale), maxHp: Math.round(base.hp * totalScale),
    attack: Math.round(base.attack * totalScale), defense: base.defense,
    speed: base.speed, color: finalBoss ? '#765bff' : base.color,
    state: 'chase', targetX: spawn.x, targetY: spawn.y,
    nextAttackTime: now + 450 + index * 35, flashUntil: 0,
    spawnTime: now + index * 40, lastAttackTime: 0, deathTime: 0,
    deathDuration: type === 'boss' ? (finalBoss ? 2200 : 1650) : 920,
    isDead: false, lastHitTime: 0, burnUntil: 0, nextBurnTick: 0,
    frostUntil: 0, frostSlow: 0,
    lastProgressX: spawn.x, lastProgressY: spawn.y, lastProgressTime: now,
  };
}

export function installRunEncounterOverride(): void {
  applyAndroidProfile();
  const proto = GameEngine.prototype as any;
  if (proto[PATCH_FLAG]) return;
  proto[PATCH_FLAG] = true;

  const originalSpawnRoom = proto.spawnRoom;
  proto.spawnRoom = function(this: GameEngine) {
    originalSpawnRoom.call(this);
    const room = this.state.floor;
    const spawnId = Date.now();
    if (isBossRoom(room)) {
      const boss = makeEnemy(this, 'boss', 0, 1, spawnId);
      this.state.enemies = boss ? [boss] : [];
      return;
    }

    const encounter = getEncounterPlan(room);
    this.state.enemies = encounter
      .map((type, index) => makeEnemy(this, type, index, 1, spawnId))
      .filter((enemy): enemy is Enemy => Boolean(enemy));
  };

  const originalRoomFlow = proto.updateRoomFlow;
  proto.updateRoomFlow = function(this: GameEngine, time: number) {
    originalRoomFlow.call(this, time);
    if (!isBossRoom(this.state.floor) || !this.state.roomClearReady) return;
    const clear = this.state.damageNumbers.find(number => number.id.startsWith('clear-'));
    if (clear) clear.value = 'BOSS BESIEGT · AUSGANG OFFEN';
  };
}

installRunEncounterOverride();
