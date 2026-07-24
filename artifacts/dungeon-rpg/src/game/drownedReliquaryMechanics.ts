import type { GameEngine } from './runEngine';
import { drownedReliquaryRoomSpec, isDrownedReliquaryRoom } from './drownedReliquaryRooms';

type PendingTide = {
  id: string;
  triggerAt: number;
  x: number;
  y: number;
  radius: number;
  damage: number;
  color: string;
};

type ReliquaryRuntimeState = {
  room: number;
  cycle: number;
  phase: number;
  nextHazardAt: number;
  pending: PendingTide[];
  bossTuned: boolean;
};

const runtime = new WeakMap<GameEngine, ReliquaryRuntimeState>();
const EFFECT_PREFIX = 'drowned-reliquary-';

function createState(room: number, now: number): ReliquaryRuntimeState {
  return { room, cycle: 0, phase: 1, nextHazardAt: now + 2100, pending: [], bossTuned: false };
}

function getState(engine: GameEngine, now: number): ReliquaryRuntimeState {
  const room = engine.state.floor;
  const current = runtime.get(engine);
  if (current && current.room === room) return current;
  const next = createState(room, now);
  runtime.set(engine, next);
  return next;
}

function scenePoint(engine: GameEngine, room: number, cycle: number, phase: number) {
  const points = [
    [-4.3, -4.9], [0, -5.5], [4.3, -4.9],
    [-4.9, -0.4], [4.9, -0.4],
    [-3.9, 4.1], [0, 4.9], [3.9, 4.1],
  ] as const;
  const [x, z] = points[(room * 13 + cycle * 5 + phase) % points.length];
  return {
    x: (x + engine.state.map.width / 2 - 0.5) * 40,
    y: (z + engine.state.map.height / 2 - 0.5) * 40,
  };
}

function clearReliquaryHazards(engine: GameEngine, state: ReliquaryRuntimeState) {
  state.pending = [];
  state.nextHazardAt = Number.POSITIVE_INFINITY;
  engine.state.effects = engine.state.effects.filter(effect => !effect.id.startsWith(EFFECT_PREFIX));
  engine.state.damageNumbers = engine.state.damageNumbers.filter(number => !number.id.startsWith(EFFECT_PREFIX));
}

function tuneLeviathan(engine: GameEngine, state: ReliquaryRuntimeState, now: number) {
  if (engine.state.floor !== 80 || state.bossTuned) return;
  const boss = engine.state.enemies.find(enemy => enemy.enemyType === 'boss' && !enemy.isDead && enemy.hp > 0);
  if (!boss) return;
  state.bossTuned = true;
  boss.maxHp = Math.max(9200, boss.maxHp);
  boss.hp = boss.maxHp;
  boss.attack = Math.max(74, Math.min(98, boss.attack));
  boss.speed *= 1.06;
  boss.nextAttackTime = now + 1200;
  boss.color = '#59e0cf';
  engine.state.damageNumbers.push({
    id: `${EFFECT_PREFIX}boss-awaken-${now}`,
    x: boss.x + boss.width / 2,
    y: boss.y - 28,
    value: 'DER RELIQUIAR-LEVIATHAN',
    color: boss.color,
    lifeTime: 0,
    maxLifeTime: 2000,
    scale: 1.05,
  });
}

function updateLeviathanPhase(engine: GameEngine, state: ReliquaryRuntimeState, now: number) {
  if (engine.state.floor !== 80) return;
  const boss = engine.state.enemies.find(enemy => enemy.enemyType === 'boss' && !enemy.isDead && enemy.hp > 0);
  if (!boss || boss.maxHp <= 0) return;
  const ratio = boss.hp / boss.maxHp;
  const nextPhase = ratio <= 0.3 ? 3 : ratio <= 0.62 ? 2 : 1;
  if (nextPhase <= state.phase) return;
  state.phase = nextPhase;
  boss.attack = Math.min(98, Math.round(boss.attack * (nextPhase === 2 ? 1.06 : 1.09)));
  boss.speed *= nextPhase === 2 ? 1.03 : 1.05;
  boss.nextAttackTime = Math.max(boss.nextAttackTime, now + (nextPhase === 2 ? 980 : 840));
  boss.color = nextPhase === 2 ? '#50cfd2' : '#75f0b2';
  state.nextHazardAt = now + 700;
  engine.state.damageNumbers.push({
    id: `${EFFECT_PREFIX}phase-${nextPhase}-${now}`,
    x: boss.x + boss.width / 2,
    y: boss.y - 28,
    value: `LEVIATHAN · PHASE ${nextPhase === 2 ? 'II' : 'III'}`,
    color: boss.color,
    lifeTime: 0,
    maxLifeTime: 1800,
    scale: 1.05,
  });
}

function queueHazard(engine: GameEngine, state: ReliquaryRuntimeState, now: number) {
  const spec = drownedReliquaryRoomSpec(engine.state.floor);
  if (!spec) return;
  const player = engine.state.player;
  const point = scenePoint(engine, spec.room, state.cycle, state.phase);
  const tracksPlayer = spec.hazard === 'delayed-tide-circles'
    || spec.hazard === 'shrinking-island-overlap'
    || spec.hazard === 'leviathan-phases';
  const x = tracksPlayer ? player.x + player.width / 2 : point.x;
  const y = tracksPlayer ? player.y + player.height / 2 : point.y;
  const radius = Math.min(126, 72 + (state.cycle % 3) * 14 + Math.max(0, state.phase - 1) * 9);
  const damage = Math.min(38, Math.max(9, Math.round(player.maxHp * (0.09 + Math.max(0, state.phase - 1) * 0.018))));
  const color = state.phase >= 3 ? '#75f0b2' : state.cycle % 2 === 0 ? '#46d6d1' : '#52a9c9';
  const id = `${EFFECT_PREFIX}${spec.room}-${state.cycle}`;
  state.pending.push({ id, triggerAt: now + spec.telegraphMs, x, y, radius, damage, color });
  engine.state.effects.push({
    id: `${id}-warning`, x, y, radius: 8, maxRadius: radius, color,
    lifeTime: 0, maxLifeTime: spec.telegraphMs, type: 'circle', element: 'arcane',
  });
  state.cycle += 1;
  const phaseCompression = Math.max(0, state.phase - 1) * 130;
  state.nextHazardAt = now + spec.telegraphMs + spec.activeMs + spec.recoveryMs + Math.max(360, 820 - phaseCompression);
}

function resolveHazards(engine: GameEngine, state: ReliquaryRuntimeState, now: number) {
  const player = engine.state.player;
  const px = player.x + player.width / 2;
  const py = player.y + player.height / 2;
  for (let index = state.pending.length - 1; index >= 0; index -= 1) {
    const hazard = state.pending[index];
    if (now < hazard.triggerAt) continue;
    state.pending.splice(index, 1);
    if (Math.hypot(px - hazard.x, py - hazard.y) <= hazard.radius && now > player.invincibleUntil) {
      player.hp -= hazard.damage;
      player.lastHitTime = now;
      engine.state.damageNumbers.push({
        id: `${hazard.id}-hit-${now}`,
        x: px,
        y: player.y - 10,
        value: `-${hazard.damage}`,
        color: hazard.color,
        lifeTime: 0,
        maxLifeTime: 820,
        scale: 1.35,
      });
    }
    engine.state.effects.push({
      id: `${hazard.id}-burst`, x: hazard.x, y: hazard.y, radius: 0,
      maxRadius: hazard.radius + 14, color: hazard.color, lifeTime: 0,
      maxLifeTime: 560, type: 'circle', element: 'arcane',
    });
  }
}

export function updateDrownedReliquaryMechanics(engine: GameEngine, now = performance.now()): void {
  if (!isDrownedReliquaryRoom(engine.state.floor) || engine.state.status !== 'playing') return;
  const state = getState(engine, now);
  const combatActive = !engine.state.roomClearReady && engine.state.enemies.some(enemy => !enemy.isDead && enemy.hp > 0);
  if (!combatActive) {
    clearReliquaryHazards(engine, state);
    return;
  }
  tuneLeviathan(engine, state, now);
  updateLeviathanPhase(engine, state, now);
  resolveHazards(engine, state, now);
  if (now >= state.nextHazardAt) queueHazard(engine, state, now);
}
