import type { GameEngine } from './runEngine';
import { goldenFractureRoomSpec, isGoldenFractureRoom } from './goldenFractureRooms';

type PendingHazard = {
  triggerAt: number;
  x: number;
  y: number;
  radius: number;
  damage: number;
  color: string;
  id: string;
};

type GoldenFractureRuntimeState = {
  room: number;
  cycle: number;
  nextHazardAt: number;
  pending: PendingHazard[];
  aurelPhase: number;
};

const runtime = new WeakMap<GameEngine, GoldenFractureRuntimeState>();

function createState(room: number, now: number): GoldenFractureRuntimeState {
  return { room, cycle: 0, nextHazardAt: now + 1800, pending: [], aurelPhase: 1 };
}

function getState(engine: GameEngine, now: number): GoldenFractureRuntimeState {
  const room = engine.state.floor;
  const existing = runtime.get(engine);
  if (existing && existing.room === room) return existing;
  const next = createState(room, now);
  runtime.set(engine, next);
  return next;
}

function arenaPoint(engine: GameEngine, room: number, cycle: number) {
  const map = engine.state.map;
  const seed = (room * 17 + cycle * 31) % 8;
  const offsets = [
    [-3.8, -3.6], [0, -4.8], [3.8, -3.6], [4.6, 0],
    [3.4, 3.8], [0, 4.8], [-3.4, 3.8], [-4.6, 0],
  ] as const;
  const [ox, oz] = offsets[seed];
  return {
    x: (ox + map.width / 2 - 0.5) * 40,
    y: (oz + map.height / 2 - 0.5) * 40,
  };
}

function queueHazard(engine: GameEngine, state: GoldenFractureRuntimeState, now: number) {
  const spec = goldenFractureRoomSpec(engine.state.floor);
  if (!spec) return;
  const player = engine.state.player;
  const center = arenaPoint(engine, spec.room, state.cycle);
  const tracksPlayer = spec.hazard === 'delayed-burst' || spec.hazard === 'throne-waves' || spec.hazard === 'aurel-phases';
  const x = tracksPlayer ? player.x + player.width / 2 : center.x;
  const y = tracksPlayer ? player.y + player.height / 2 : center.y;
  const phaseBonus = spec.room === 60 ? Math.max(0, state.aurelPhase - 1) : 0;
  const radius = Math.min(132, 72 + (state.cycle % 3) * 14 + phaseBonus * 10);
  const damage = Math.min(38, Math.max(10, Math.round(player.maxHp * (0.1 + phaseBonus * 0.025))));
  const color = spec.room === 60 ? '#f6c85f' : state.cycle % 2 === 0 ? '#d3a74f' : '#9c6be8';
  const id = `golden-fracture-${spec.room}-${state.cycle}`;
  state.pending.push({ triggerAt: now + spec.telegraphMs, x, y, radius, damage, color, id });
  engine.state.effects.push({
    id: `${id}-warning`, x, y, radius: 8, maxRadius: radius, color,
    lifeTime: 0, maxLifeTime: spec.telegraphMs, type: 'circle', element: 'arcane',
  });
  state.cycle++;
  state.nextHazardAt = now + spec.telegraphMs + spec.recoveryMs + Math.max(350, 900 - phaseBonus * 170);
}

function clearHazards(engine: GameEngine, state: GoldenFractureRuntimeState): void {
  state.pending = [];
  state.nextHazardAt = Number.POSITIVE_INFINITY;
  engine.state.effects = engine.state.effects.filter(effect => !effect.id.startsWith('golden-fracture-'));
  engine.state.damageNumbers = engine.state.damageNumbers.filter(number => !number.id.startsWith('golden-fracture-'));
}

function resolveHazards(engine: GameEngine, state: GoldenFractureRuntimeState, now: number) {
  const player = engine.state.player;
  const px = player.x + player.width / 2;
  const py = player.y + player.height / 2;
  for (let index = state.pending.length - 1; index >= 0; index--) {
    const hazard = state.pending[index];
    if (now < hazard.triggerAt) continue;
    state.pending.splice(index, 1);
    if (Math.hypot(px - hazard.x, py - hazard.y) <= hazard.radius && now > player.invincibleUntil) {
      player.hp -= hazard.damage;
      player.lastHitTime = now;
      engine.state.damageNumbers.push({
        id: `${hazard.id}-hit-${now}`, x: px, y: player.y - 10,
        value: `-${hazard.damage}`, color: hazard.color, lifeTime: 0, maxLifeTime: 820, scale: 1.35,
      });
    }
    engine.state.effects.push({
      id: `${hazard.id}-burst`, x: hazard.x, y: hazard.y, radius: 0,
      maxRadius: hazard.radius + 12, color: hazard.color, lifeTime: 0,
      maxLifeTime: 480, type: 'circle', element: 'arcane',
    });
  }
}

function updateAurelPhase(engine: GameEngine, state: GoldenFractureRuntimeState, now: number) {
  if (engine.state.floor !== 60) return;
  const boss = engine.state.enemies.find(enemy => enemy.enemyType === 'boss' && !enemy.isDead && enemy.hp > 0);
  if (!boss || boss.maxHp <= 0) return;
  const ratio = boss.hp / boss.maxHp;
  const nextPhase = ratio <= 0.33 ? 3 : ratio <= 0.66 ? 2 : 1;
  if (nextPhase <= state.aurelPhase) return;
  state.aurelPhase = nextPhase;
  boss.attack = Math.round(boss.attack * (nextPhase === 2 ? 1.08 : 1.12));
  boss.speed *= nextPhase === 2 ? 1.06 : 1.08;
  boss.nextAttackTime = Math.max(boss.nextAttackTime, now + (nextPhase === 2 ? 900 : 760));
  boss.color = nextPhase === 2 ? '#d7a95f' : '#f4d36b';
  state.nextHazardAt = now + 420;
  engine.state.damageNumbers.push({
    id: `aurel-phase-${nextPhase}-${now}`, x: boss.x + boss.width / 2, y: boss.y - 28,
    value: nextPhase === 2 ? 'AUREL · PHASE II' : 'AUREL · PHASE III',
    color: boss.color, lifeTime: 0, maxLifeTime: 1800, scale: 1.05,
  });
  engine.state.effects.push({
    id: `aurel-phase-wave-${nextPhase}-${now}`, x: boss.x + boss.width / 2, y: boss.y + boss.height / 2,
    radius: 0, maxRadius: 180, color: boss.color, lifeTime: 0, maxLifeTime: 680,
    type: 'circle', element: 'arcane',
  });
}

export function updateGoldenFractureMechanics(engine: GameEngine, now = performance.now()): void {
  if (!isGoldenFractureRoom(engine.state.floor) || engine.state.status !== 'playing') return;
  const state = getState(engine, now);
  const combatActive = !engine.state.roomClearReady && engine.state.enemies.some(enemy => !enemy.isDead && enemy.hp > 0);
  if (!combatActive) {
    clearHazards(engine, state);
    return;
  }
  updateAurelPhase(engine, state, now);
  resolveHazards(engine, state, now);
  if (now >= state.nextHazardAt) queueHazard(engine, state, now);
}
