import type { GameEngine } from './runEngine';
import { roomIdentity } from './roomIdentity';
import { calibratedRoomSetpieces } from './roomSetpieceCalibrated';

export type RoomMechanicKind = 'forge-burst' | 'arc-line' | 'ritual-core' | 'grave-call' | null;
export type RoomMechanicState = {
  roomKey: string;
  kind: RoomMechanicKind;
  nextTriggerAt: number;
  warningAt: number;
  targetX: number;
  targetY: number;
  ritualChargeMs: number;
  ritualBroken: boolean;
  ritualBuffedIds: Set<string>;
  graveTriggered: boolean;
};

const HAZARD_EFFECT_PREFIXES = [
  'forge-warn-', 'forge-hit-', 'forge-hit-inner-',
  'arc-warn-', 'arc-charge-', 'arc-fire-', 'arc-source-',
  'core-', 'core-inner-',
];
const HAZARD_TEXT_PREFIXES = ['forge-text-', 'arc-text-', 'core-text-'];

export function createRoomMechanicState(): RoomMechanicState {
  return { roomKey: '', kind: null, nextTriggerAt: 0, warningAt: 0, targetX: 0, targetY: 0, ritualChargeMs: 0, ritualBroken: false, ritualBuffedIds: new Set(), graveTriggered: false };
}

export function roomMechanicFor(room: number): RoomMechanicKind {
  if (room === 15 || room === 19) return 'ritual-core';
  if (room === 16) return 'arc-line';
  if (room === 17) return 'grave-call';
  if (room === 18) return 'forge-burst';
  return null;
}

function toast(title: string, text: string, tone: 'hunt' | 'daily' | 'relic' = 'hunt') {
  window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', { detail: { title, text, tone } }));
}

function scenePoint(engine: GameEngine, terms: string[]) {
  const piece = calibratedRoomSetpieces(engine.state.floor).find(entry => terms.some(term => entry.model.toLowerCase().includes(term)));
  if (!piece) return { x: engine.state.map.width * 20, y: engine.state.map.height * 20 };
  return {
    x: (piece.x + engine.state.map.width / 2 - 0.5) * 40,
    y: (piece.z + engine.state.map.height / 2 - 0.5) * 40,
  };
}

function hasLivingEnemies(engine: GameEngine): boolean {
  return engine.state.enemies.some(enemy => enemy.hp > 0 && !enemy.isDead);
}

function clearPendingHazards(engine: GameEngine, state: RoomMechanicState): void {
  state.warningAt = 0;
  state.nextTriggerAt = Number.POSITIVE_INFINITY;
  state.targetX = 0;
  state.targetY = 0;
  engine.state.effects = engine.state.effects.filter(effect => !HAZARD_EFFECT_PREFIXES.some(prefix => effect.id.startsWith(prefix)));
  engine.state.damageNumbers = engine.state.damageNumbers.filter(number => !HAZARD_TEXT_PREFIXES.some(prefix => number.id.startsWith(prefix)));
}

function damage(engine: GameEngine, time: number, amount: number, color: string, id: string) {
  if (engine.state.roomClearReady || !hasLivingEnemies(engine)) return;
  const p = engine.state.player;
  if (time <= p.invincibleUntil) return;
  p.hp -= amount;
  p.lastHitTime = time;
  engine.state.damageNumbers.push({ id: `${id}-${time}`, x: p.x + p.width / 2, y: p.y - 8, value: `-${amount}`, color, lifeTime: 0, maxLifeTime: 780, scale: 1.45 });
}

function enterRoom(engine: GameEngine, state: RoomMechanicState, time: number) {
  const key = `${engine.state.chapter}:${engine.state.floor}`;
  if (state.roomKey === key) return;
  state.roomKey = key;
  state.kind = roomMechanicFor(engine.state.floor);
  state.nextTriggerAt = time + 3400;
  state.warningAt = 0;
  state.ritualChargeMs = 0;
  state.ritualBroken = false;
  state.ritualBuffedIds.clear();
  state.graveTriggered = false;
  const name = roomIdentity(engine.state.floor).nameDe;
  if (state.kind === 'forge-burst') toast(name, 'Leuchtende Glutadern brechen kurz nach der Warnung auf.', 'relic');
  if (state.kind === 'arc-line') toast(name, 'Die Werkbank lädt eine helle violette Schneidlinie.', 'hunt');
  if (state.kind === 'ritual-core') toast('SCHLEIERKERN AKTIV', 'Der sichtbare Schrein stärkt Feinde. Halte dich an ihm, bis der Kern bricht.', 'relic');
  if (state.kind === 'grave-call') toast('DIE GRÄBER HÖREN ZU', 'Die letzten Wächter können in Schleierwut geraten.', 'relic');
}

function forge(engine: GameEngine, state: RoomMechanicState, time: number) {
  const p = engine.state.player;
  if (state.warningAt && time >= state.warningAt) {
    if (Math.hypot(p.x + p.width / 2 - state.targetX, p.y + p.height / 2 - state.targetY) <= 82) damage(engine, time, 16, '#ff7040', 'forge');
    if (!hasLivingEnemies(engine)) { clearPendingHazards(engine, state); return; }
    engine.state.effects.push({ id: `forge-hit-${time}`, x: state.targetX, y: state.targetY, radius: 8, maxRadius: 112, color: '#ff4d1f', lifeTime: 0, maxLifeTime: 700, type: 'circle', element: 'fire' });
    engine.state.effects.push({ id: `forge-hit-inner-${time}`, x: state.targetX, y: state.targetY, radius: 0, maxRadius: 62, color: '#ffd26a', lifeTime: 0, maxLifeTime: 420, type: 'circle', element: 'fire' });
    state.warningAt = 0;
    state.nextTriggerAt = time + 4300;
    return;
  }
  if (state.warningAt || time < state.nextTriggerAt) return;
  state.targetX = p.x + p.width / 2;
  state.targetY = p.y + p.height / 2;
  state.warningAt = time + 1250;
  engine.state.effects.push({ id: `forge-warn-${time}`, x: state.targetX, y: state.targetY, radius: 8, maxRadius: 88, color: '#ff8a32', lifeTime: 0, maxLifeTime: 1250, type: 'circle', element: 'fire' });
  engine.state.effects.push({ id: `forge-warn-inner-${time}`, x: state.targetX, y: state.targetY, radius: 4, maxRadius: 54, color: '#ffe095', lifeTime: 0, maxLifeTime: 1250, type: 'circle', element: 'fire' });
  engine.state.damageNumbers.push({ id: `forge-text-${time}`, x: state.targetX, y: state.targetY - 32, value: 'GLUT — RAUS!', color: '#ffcc73', lifeTime: 0, maxLifeTime: 1050, scale: 1.05 });
}

function arcLine(engine: GameEngine, state: RoomMechanicState, time: number) {
  const mapWidth = engine.state.map.width * 40;
  const source = scenePoint(engine, ['table_medium_long', 'blueprint_stacked']);
  if (state.warningAt && time >= state.warningAt) {
    const p = engine.state.player;
    if (Math.abs(p.y + p.height / 2 - state.targetY) <= 34) damage(engine, time, 14, '#a58bff', 'arc');
    if (!hasLivingEnemies(engine)) { clearPendingHazards(engine, state); return; }
    engine.state.effects.push({ id: `arc-fire-${time}`, x: 0, y: state.targetY, radius: 0, maxRadius: mapWidth, color: '#8d5cff', lifeTime: 0, maxLifeTime: 520, type: 'beam', angle: 0, width: 16, element: 'arcane' });
    engine.state.effects.push({ id: `arc-source-${time}`, x: source.x, y: source.y, radius: 8, maxRadius: 78, color: '#d8c5ff', lifeTime: 0, maxLifeTime: 620, type: 'circle', element: 'arcane' });
    state.warningAt = 0;
    state.nextTriggerAt = time + 4800;
    return;
  }
  if (state.warningAt || time < state.nextTriggerAt) return;
  const p = engine.state.player;
  state.targetY = Math.max(80, Math.min(engine.state.map.height * 40 - 80, p.y + p.height / 2));
  state.warningAt = time + 1400;
  engine.state.effects.push({ id: `arc-warn-${time}`, x: 0, y: state.targetY, radius: 0, maxRadius: mapWidth, color: '#bda5ff', lifeTime: 0, maxLifeTime: 1400, type: 'beam', angle: 0, width: 12, element: 'arcane' });
  engine.state.effects.push({ id: `arc-charge-${time}`, x: source.x, y: source.y, radius: 5, maxRadius: 68, color: '#cdbaff', lifeTime: 0, maxLifeTime: 1400, type: 'circle', element: 'arcane' });
  engine.state.damageNumbers.push({ id: `arc-text-${time}`, x: source.x, y: source.y - 34, value: 'STRAHL LÄDT', color: '#cdbaff', lifeTime: 0, maxLifeTime: 1200, scale: 1.05 });
}

function ritual(engine: GameEngine, state: RoomMechanicState, time: number, dt: number) {
  if (state.ritualBroken) return;
  const core = scenePoint(engine, ['shrine_candles', 'shrine']);
  for (const enemy of engine.state.enemies) {
    if (enemy.isDead || enemy.hp <= 0 || state.ritualBuffedIds.has(enemy.id)) continue;
    state.ritualBuffedIds.add(enemy.id);
    enemy.attack = Math.max(enemy.attack + 2, Math.round(enemy.attack * 1.18));
    enemy.speed *= 1.08;
  }
  const p = engine.state.player;
  const near = Math.hypot(p.x + p.width / 2 - core.x, p.y + p.height / 2 - core.y) <= 78;
  state.ritualChargeMs = near ? state.ritualChargeMs + dt : Math.max(0, state.ritualChargeMs - dt * 0.55);
  if (time >= state.nextTriggerAt) {
    state.nextTriggerAt = time + 650;
    engine.state.effects.push({ id: `core-${time}`, x: core.x, y: core.y, radius: 10, maxRadius: 82, color: '#8f54ff', lifeTime: 0, maxLifeTime: 650, type: 'circle', element: 'arcane' });
    engine.state.effects.push({ id: `core-inner-${time}`, x: core.x, y: core.y, radius: 4, maxRadius: 44, color: '#eadfff', lifeTime: 0, maxLifeTime: 650, type: 'circle', element: 'arcane' });
    engine.state.damageNumbers.push({ id: `core-text-${time}`, x: core.x, y: core.y - 28, value: `KERN ${Math.min(100, Math.floor(state.ritualChargeMs / 20))}%`, color: '#e0ccff', lifeTime: 0, maxLifeTime: 600, scale: .9 });
  }
  if (state.ritualChargeMs < 2000) return;
  state.ritualBroken = true;
  for (const enemy of engine.state.enemies) {
    if (!state.ritualBuffedIds.has(enemy.id) || enemy.isDead) continue;
    enemy.attack = Math.max(1, Math.round(enemy.attack / 1.18) - 2);
    enemy.speed /= 1.08;
  }
  engine.state.effects.push({ id: `core-break-${time}`, x: core.x, y: core.y, radius: 0, maxRadius: 180, color: '#eee3ff', lifeTime: 0, maxLifeTime: 1100, type: 'circle', element: 'arcane' });
  toast('RITUAL GEBROCHEN', 'Der sichtbare Schleierkern ist erloschen.', 'daily');
}

function graveCall(engine: GameEngine, state: RoomMechanicState, time: number) {
  if (state.graveTriggered) return;
  const living = engine.state.enemies.filter(enemy => enemy.hp > 0 && !enemy.isDead);
  if (living.length > 3 || engine.state.killCount < 2) return;
  state.graveTriggered = true;
  for (const enemy of living) {
    enemy.speed *= 1.18;
    enemy.attack = Math.round(enemy.attack * 1.15);
    engine.state.effects.push({ id: `grave-${time}-${enemy.id}`, x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2, radius: 0, maxRadius: 62, color: '#a77cff', lifeTime: 0, maxLifeTime: 720, type: 'circle', element: 'arcane' });
  }
  toast('GRABESRUF', 'Die letzten Wächter geraten sichtbar in Schleierwut.', 'relic');
}

export function updateRoomMechanics(engine: GameEngine, state: RoomMechanicState, time: number, dt: number) {
  enterRoom(engine, state, time);
  if (!state.kind) return;
  if (engine.state.roomClearReady || !hasLivingEnemies(engine)) {
    clearPendingHazards(engine, state);
    return;
  }
  if (state.kind === 'forge-burst') forge(engine, state, time);
  if (state.kind === 'arc-line') arcLine(engine, state, time);
  if (state.kind === 'ritual-core') ritual(engine, state, time, dt);
  if (state.kind === 'grave-call') graveCall(engine, state, time);
}
