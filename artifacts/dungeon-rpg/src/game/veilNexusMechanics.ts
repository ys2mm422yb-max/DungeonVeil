import type { GameEngine } from './runEngine';
import { isVeilNexusRoom, veilNexusRoomSpec } from './veilNexusRooms';

type PendingNexus = {
  id: string;
  triggerAt: number;
  x: number;
  y: number;
  radius: number;
  damage: number;
  color: string;
};

type NexusRuntimeState = {
  room: number;
  cycle: number;
  phase: number;
  nextHazardAt: number;
  pending: PendingNexus[];
  bossTuned: boolean;
};

const runtime = new WeakMap<GameEngine, NexusRuntimeState>();
const EFFECT_PREFIX = 'veil-nexus-';

function createState(room: number, now: number): NexusRuntimeState {
  return { room, cycle: 0, phase: 1, nextHazardAt: now + 2100, pending: [], bossTuned: false };
}

function getState(engine: GameEngine, now: number): NexusRuntimeState {
  const room = engine.state.floor;
  const current = runtime.get(engine);
  if (current && current.room === room) return current;
  const next = createState(room, now);
  runtime.set(engine, next);
  return next;
}

function scenePoint(engine: GameEngine, room: number, cycle: number, phase: number) {
  const points = [
    [-4.6, -5.1], [0, -5.8], [4.6, -5.1],
    [-5.1, -0.4], [5.1, -0.4],
    [-4.1, 4.0], [0, 5.1], [4.1, 4.0],
  ] as const;
  const [x, z] = points[(room * 19 + cycle * 5 + phase * 3) % points.length];
  return {
    x: (x + engine.state.map.width / 2 - 0.5) * 40,
    y: (z + engine.state.map.height / 2 - 0.5) * 40,
  };
}

function clearNexusHazards(engine: GameEngine, state: NexusRuntimeState) {
  state.pending = [];
  state.nextHazardAt = Number.POSITIVE_INFINITY;
  engine.state.effects = engine.state.effects.filter(effect => !effect.id.startsWith(EFFECT_PREFIX));
  engine.state.damageNumbers = engine.state.damageNumbers.filter(number => !number.id.startsWith(EFFECT_PREFIX));
}

function tuneVeilCore(engine: GameEngine, state: NexusRuntimeState, now: number) {
  if (engine.state.floor !== 100 || state.bossTuned) return;
  const boss = engine.state.enemies.find(enemy => enemy.enemyType === 'boss' && !enemy.isDead && enemy.hp > 0);
  if (!boss) return;
  state.bossTuned = true;
  boss.maxHp = Math.max(15000, boss.maxHp);
  boss.hp = boss.maxHp;
  boss.attack = Math.max(90, Math.min(118, boss.attack));
  boss.speed *= 1.1;
  boss.nextAttackTime = now + 1350;
  boss.color = '#c9a7ff';
  engine.state.damageNumbers.push({
    id: `${EFFECT_PREFIX}boss-awaken-${now}`,
    x: boss.x + boss.width / 2,
    y: boss.y - 28,
    value: 'DER SCHLEIERKERN',
    color: boss.color,
    lifeTime: 0,
    maxLifeTime: 2200,
    scale: 1.08,
  });
}

function updateVeilCorePhase(engine: GameEngine, state: NexusRuntimeState, now: number) {
  if (engine.state.floor !== 100) return;
  const boss = engine.state.enemies.find(enemy => enemy.enemyType === 'boss' && !enemy.isDead && enemy.hp > 0);
  if (!boss || boss.maxHp <= 0) return;
  const ratio = boss.hp / boss.maxHp;
  const nextPhase = ratio <= 0.22 ? 4 : ratio <= 0.48 ? 3 : ratio <= 0.72 ? 2 : 1;
  if (nextPhase <= state.phase) return;
  state.phase = nextPhase;
  boss.attack = Math.min(118, Math.round(boss.attack * (nextPhase === 2 ? 1.04 : 1.06)));
  boss.speed *= nextPhase === 4 ? 1.05 : 1.03;
  boss.nextAttackTime = Math.max(boss.nextAttackTime, now + (nextPhase === 4 ? 900 : 1050));
  boss.color = nextPhase === 2 ? '#9fdcff' : nextPhase === 3 ? '#f0c56d' : '#f4e8ff';
  state.nextHazardAt = now + 760;
  engine.state.damageNumbers.push({
    id: `${EFFECT_PREFIX}phase-${nextPhase}-${now}`,
    x: boss.x + boss.width / 2,
    y: boss.y - 28,
    value: `SCHLEIERKERN · PHASE ${['I', 'II', 'III', 'IV'][nextPhase - 1]}`,
    color: boss.color,
    lifeTime: 0,
    maxLifeTime: 1900,
    scale: 1.06,
  });
}

function queueHazard(engine: GameEngine, state: NexusRuntimeState, now: number) {
  const spec = veilNexusRoomSpec(engine.state.floor);
  if (!spec) return;
  const player = engine.state.player;
  const point = scenePoint(engine, spec.room, state.cycle, state.phase);
  const tracksPlayer = spec.hazard === 'marked-echo-impacts'
    || spec.hazard === 'gravity-pulses'
    || spec.hazard === 'veil-core-phases';
  const x = tracksPlayer ? player.x + player.width / 2 : point.x;
  const y = tracksPlayer ? player.y + player.height / 2 : point.y;
  const radius = Math.min(138, 76 + (state.cycle % 3) * 14 + Math.max(0, state.phase - 1) * 8);
  const damage = Math.min(48, Math.max(12, Math.round(player.maxHp * (0.105 + Math.max(0, state.phase - 1) * 0.015))));
  const color = state.phase >= 4 ? '#f4e8ff' : state.cycle % 2 === 0 ? '#b991ff' : '#6bc8ff';
  const id = `${EFFECT_PREFIX}${spec.room}-${state.cycle}`;
  state.pending.push({ id, triggerAt: now + spec.telegraphMs, x, y, radius, damage, color });
  engine.state.effects.push({
    id: `${id}-warning`, x, y, radius: 8, maxRadius: radius, color,
    lifeTime: 0, maxLifeTime: spec.telegraphMs, type: 'circle', element: 'arcane',
  });
  state.cycle += 1;
  const phaseCompression = Math.max(0, state.phase - 1) * 110;
  state.nextHazardAt = now + spec.telegraphMs + spec.activeMs + spec.recoveryMs + Math.max(420, 880 - phaseCompression);
}

function resolveHazards(engine: GameEngine, state: NexusRuntimeState, now: number) {
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
        maxLifeTime: 840,
        scale: 1.35,
      });
    }
    engine.state.effects.push({
      id: `${hazard.id}-burst`, x: hazard.x, y: hazard.y, radius: 0,
      maxRadius: hazard.radius + 14, color: hazard.color, lifeTime: 0,
      maxLifeTime: 600, type: 'circle', element: 'arcane',
    });
  }
}

export function updateVeilNexusMechanics(engine: GameEngine, now = performance.now()): void {
  if (!isVeilNexusRoom(engine.state.floor) || engine.state.status !== 'playing') return;
  const state = getState(engine, now);
  const combatActive = !engine.state.roomClearReady && engine.state.enemies.some(enemy => !enemy.isDead && enemy.hp > 0);
  if (!combatActive) {
    clearNexusHazards(engine, state);
    return;
  }
  tuneVeilCore(engine, state, now);
  updateVeilCorePhase(engine, state, now);
  resolveHazards(engine, state, now);
  if (now >= state.nextHazardAt) queueHazard(engine, state, now);
}
