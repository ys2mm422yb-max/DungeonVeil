import type { GameEngine } from './runEngine';
import { isShatteredObservatoryRoom, shatteredObservatoryRoomSpec } from './shatteredObservatoryRooms';

type PendingStarfall = {
  id: string;
  triggerAt: number;
  x: number;
  y: number;
  radius: number;
  damage: number;
  color: string;
};

type ObservatoryRuntimeState = {
  room: number;
  cycle: number;
  phase: number;
  nextHazardAt: number;
  pending: PendingStarfall[];
  bossTuned: boolean;
};

const runtime = new WeakMap<GameEngine, ObservatoryRuntimeState>();
const EFFECT_PREFIX = 'shattered-observatory-';

function createState(room: number, now: number): ObservatoryRuntimeState {
  return { room, cycle: 0, phase: 1, nextHazardAt: now + 1900, pending: [], bossTuned: false };
}

function getState(engine: GameEngine, now: number): ObservatoryRuntimeState {
  const room = engine.state.floor;
  const current = runtime.get(engine);
  if (current && current.room === room) return current;
  const next = createState(room, now);
  runtime.set(engine, next);
  return next;
}

function scenePoint(engine: GameEngine, room: number, cycle: number, phase: number) {
  const points = [
    [-4.1, -4.8], [0, -5.4], [4.1, -4.8],
    [-4.8, -0.5], [4.8, -0.5],
    [-3.8, 4.0], [0, 4.8], [3.8, 4.0],
  ] as const;
  const [x, z] = points[(room * 11 + cycle * 3 + phase) % points.length];
  return {
    x: (x + engine.state.map.width / 2 - 0.5) * 40,
    y: (z + engine.state.map.height / 2 - 0.5) * 40,
  };
}

function clearObservatoryHazards(engine: GameEngine, state: ObservatoryRuntimeState) {
  state.pending = [];
  state.nextHazardAt = Number.POSITIVE_INFINITY;
  engine.state.effects = engine.state.effects.filter(effect => !effect.id.startsWith(EFFECT_PREFIX));
  engine.state.damageNumbers = engine.state.damageNumbers.filter(number => !number.id.startsWith(EFFECT_PREFIX));
}

function tuneAstronomer(engine: GameEngine, state: ObservatoryRuntimeState, now: number) {
  if (engine.state.floor !== 70 || state.bossTuned) return;
  const boss = engine.state.enemies.find(enemy => enemy.enemyType === 'boss' && !enemy.isDead && enemy.hp > 0);
  if (!boss) return;
  state.bossTuned = true;
  boss.maxHp = Math.max(7600, boss.maxHp);
  boss.hp = boss.maxHp;
  boss.attack = Math.max(68, Math.min(92, boss.attack));
  boss.speed *= 1.08;
  boss.nextAttackTime = now + 1100;
  boss.color = '#8fe7ff';
  engine.state.damageNumbers.push({
    id: `${EFFECT_PREFIX}boss-awaken-${now}`,
    x: boss.x + boss.width / 2,
    y: boss.y - 28,
    value: 'DER ENTFESSELTE ASTRONOM',
    color: boss.color,
    lifeTime: 0,
    maxLifeTime: 1900,
    scale: 1.05,
  });
}

function updateAstronomerPhase(engine: GameEngine, state: ObservatoryRuntimeState, now: number) {
  if (engine.state.floor !== 70) return;
  const boss = engine.state.enemies.find(enemy => enemy.enemyType === 'boss' && !enemy.isDead && enemy.hp > 0);
  if (!boss || boss.maxHp <= 0) return;
  const ratio = boss.hp / boss.maxHp;
  const nextPhase = ratio <= 0.33 ? 3 : ratio <= 0.66 ? 2 : 1;
  if (nextPhase <= state.phase) return;
  state.phase = nextPhase;
  boss.attack = Math.min(92, Math.round(boss.attack * (nextPhase === 2 ? 1.07 : 1.1)));
  boss.speed *= nextPhase === 2 ? 1.04 : 1.06;
  boss.nextAttackTime = Math.max(boss.nextAttackTime, now + (nextPhase === 2 ? 950 : 820));
  boss.color = nextPhase === 2 ? '#9ec8ff' : '#c493ff';
  state.nextHazardAt = now + 650;
  engine.state.damageNumbers.push({
    id: `${EFFECT_PREFIX}phase-${nextPhase}-${now}`,
    x: boss.x + boss.width / 2,
    y: boss.y - 28,
    value: `ASTRONOM · PHASE ${nextPhase === 2 ? 'II' : 'III'}`,
    color: boss.color,
    lifeTime: 0,
    maxLifeTime: 1800,
    scale: 1.05,
  });
  engine.state.effects.push({
    id: `${EFFECT_PREFIX}phase-wave-${nextPhase}-${now}`,
    x: boss.x + boss.width / 2,
    y: boss.y + boss.height / 2,
    radius: 0,
    maxRadius: 185,
    color: boss.color,
    lifeTime: 0,
    maxLifeTime: 720,
    type: 'circle',
    element: 'arcane',
  });
}

function queueHazard(engine: GameEngine, state: ObservatoryRuntimeState, now: number) {
  const spec = shatteredObservatoryRoomSpec(engine.state.floor);
  if (!spec) return;
  const player = engine.state.player;
  const point = scenePoint(engine, spec.room, state.cycle, state.phase);
  const tracksPlayer = spec.hazard === 'lens-burn-zones' || spec.hazard === 'calculation-overlap' || spec.hazard === 'astronomer-phases';
  const x = tracksPlayer ? player.x + player.width / 2 : point.x;
  const y = tracksPlayer ? player.y + player.height / 2 : point.y;
  const radius = Math.min(118, 66 + (state.cycle % 3) * 13 + Math.max(0, state.phase - 1) * 8);
  const damage = Math.min(34, Math.max(8, Math.round(player.maxHp * (0.085 + Math.max(0, state.phase - 1) * 0.018))));
  const color = state.phase >= 3 ? '#c493ff' : state.cycle % 2 === 0 ? '#79e9ff' : '#8fa8ff';
  const id = `${EFFECT_PREFIX}${spec.room}-${state.cycle}`;
  state.pending.push({ id, triggerAt: now + spec.telegraphMs, x, y, radius, damage, color });
  engine.state.effects.push({
    id: `${id}-warning`, x, y, radius: 8, maxRadius: radius, color,
    lifeTime: 0, maxLifeTime: spec.telegraphMs, type: 'circle', element: 'arcane',
  });
  state.cycle += 1;
  const phaseCompression = Math.max(0, state.phase - 1) * 120;
  state.nextHazardAt = now + spec.telegraphMs + spec.activeMs + spec.recoveryMs + Math.max(350, 760 - phaseCompression);
}

function resolveHazards(engine: GameEngine, state: ObservatoryRuntimeState, now: number) {
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
      maxRadius: hazard.radius + 12, color: hazard.color, lifeTime: 0,
      maxLifeTime: 520, type: 'circle', element: 'arcane',
    });
  }
}

export function updateShatteredObservatoryMechanics(engine: GameEngine, now = performance.now()): void {
  if (!isShatteredObservatoryRoom(engine.state.floor) || engine.state.status !== 'playing') return;
  const state = getState(engine, now);
  const combatActive = !engine.state.roomClearReady && engine.state.enemies.some(enemy => !enemy.isDead && enemy.hp > 0);
  if (!combatActive) {
    clearObservatoryHazards(engine, state);
    return;
  }
  tuneAstronomer(engine, state, now);
  updateAstronomerPhase(engine, state, now);
  resolveHazards(engine, state, now);
  if (now >= state.nextHazardAt) queueHazard(engine, state, now);
}
