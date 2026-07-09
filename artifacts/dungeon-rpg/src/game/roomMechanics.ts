import type { GameEngine } from './runEngine';
import { roomIdentity } from './roomIdentity';
import { roomSetpieces } from './roomSetpieceLayout';

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

export function createRoomMechanicState(): RoomMechanicState {
  return {
    roomKey: '', kind: null, nextTriggerAt: 0, warningAt: 0, targetX: 0, targetY: 0,
    ritualChargeMs: 0, ritualBroken: false, ritualBuffedIds: new Set<string>(), graveTriggered: false,
  };
}

export function roomMechanicFor(room: number): RoomMechanicKind {
  if (room === 15 || room === 19) return 'ritual-core';
  if (room === 16) return 'arc-line';
  if (room === 17) return 'grave-call';
  if (room === 18) return 'forge-burst';
  return null;
}

function announce(title: string, text: string, tone: 'hunt' | 'daily' | 'relic' = 'hunt') {
  window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', { detail: { title, text, tone } }));
}

function sceneToGame(engine: GameEngine, sceneX: number, sceneZ: number) {
  return {
    x: (sceneX + engine.state.map.width / 2 - 0.5) * 40,
    y: (sceneZ + engine.state.map.height / 2 - 0.5) * 40,
  };
}

function sourceFor(engine: GameEngine, terms: string[]) {
  const piece = roomSetpieces(engine.state.floor).find(entry => terms.some(term => entry.model.toLowerCase().includes(term)));
  return piece ? sceneToGame(engine, piece.x, piece.z) : { x: engine.state.map.width * 20, y: engine.state.map.height * 20 };
}

function damagePlayer(engine: GameEngine, time: number, damage: number, color: string, source: string) {
  const player = engine.state.player;
  if (time <= player.invincibleUntil) return;
  player.hp -= damage;
  player.lastHitTime = time;
  engine.state.damageNumbers.push({
    id: `${source}-${time}`,
    x: player.x + player.width / 2,
    y: player.y - 8,
    value: `-${damage}`,
    color,
    lifeTime: 0,
    maxLifeTime: 780,
    scale: 1.45,
  });
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

  const identity = roomIdentity(engine.state.floor);
  if (state.kind === 'forge-burst') announce(identity.nameDe, 'Die Gießerei markiert Glutadern. Verlasse die leuchtende Zone vor dem Ausbruch.', 'relic');
  else if (state.kind === 'arc-line') announce(identity.nameDe, 'Die Werkbank lädt eine violette Schneidlinie. Weiche der hellen Bahn aus.', 'hunt');
  else if (state.kind === 'ritual-core') announce('SCHLEIERKERN AKTIV', 'Der sichtbare Ritualkern stärkt Feinde. Halte dich am Kern, bis er bricht.', 'relic');
  else if (state.kind === 'grave-call') announce('DIE GRÄBER HÖREN ZU', 'Die letzten Wächter der Grabgalerie können in Schleierwut geraten.', 'relic');
}

function updateForgeBurst(engine: GameEngine, state: RoomMechanicState, time: number) {
  const player = engine.state.player;
  if (state.warningAt > 0 && time >= state.warningAt) {
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    if (Math.hypot(px - state.targetX, py - state.targetY) <= 82) damagePlayer(engine, time, 16, '#ff7040', 'forge-burst');
    engine.state.effects.push({ id: `forge-impact-${time}`, x: state.targetX, y: state.targetY, radius: 8, maxRadius: 112, color: '#ff4d1f', lifeTime: 0, maxLifeTime: 700, type: 'circle', element: 'fire' });
    engine.state.effects.push({ id: `forge-impact-inner-${time}`, x: state.targetX, y: state.targetY, radius: 0, maxRadius: 62, color: '#ffd26a', lifeTime: 0, maxLifeTime: 420, type: 'circle', element: 'fire' });
    state.warningAt = 0;
    state.nextTriggerAt = time + 4300;
    return;
  }
  if (state.warningAt || time < state.nextTriggerAt) return;
  state.targetX = player.x + player.width / 2;
  state.targetY = player.y + player.height / 2;
  state.warningAt = time + 1250;
  engine.state.effects.push({ id: `forge-warning-outer-${time}`, x: state.targetX, y: state.targetY, radius: 8, maxRadius: 86, color: '#ff8a32', lifeTime: 0, maxLifeTime: 1250, type: 'circle', element: 'fire' });
  engine.state.effects.push({ id: `forge-warning-inner-${time}`, x: state.targetX, y: state.targetY, radius: 4, maxRadius: 54, color: '#ffe095', lifeTime: 0, maxLifeTime: 1250, type: 'circle', element: 'fire' });
  engine.state.damageNumbers.push({ id: `forge-warning-text-${time}`, x: state.targetX, y: state.targetY - 32, value: 'GLUT — RAUS!', color: '#ffcc73', lifeTime: 0, maxLifeTime: 1050, scale: 1.05 });
}

function updateArcLine(engine: GameEngine, state: RoomMechanicState, time: number) {
  const mapWidth = engine.state.map.width * 40;
  const mapHeight = engine.state.map.height * 40;
  const source = sourceFor(engine, ['table_medium_long', 'blueprint_stacked']);

  if (state.warningAt > 0 && time >= state.warningAt) {
    const player = engine.state.player;
    const py = player.y + player.height / 2;
    if (Math.abs(py - state.targetY) <= 34) damagePlayer(engine, time, 14, '#a58bff', 'arc-line');
    engine.state.effects.push({ id: `arc-fire-${time}`, x: 0, y: state.targetY, radius: 0, maxRadius: mapWidth, color: '#8d5cff', lifeTime: 0, maxLifeTime: 520, type: 'beam', angle: 0, width: 16, element: 'arcane' });
    engine.state.effects.push({ id: `arc-source-fire-${time}`, x: source.x, y: source.y, radius: 8, maxRadius: 78, color: '#d8c5ff', lifeTime: 0, maxLifeTime: 620, type: 'circle', element: 'arcane' });
    state.warningAt = 0;
    state.nextTriggerAt = time + 4800;
    return;
  }
  if (state.warningAt || time < state.nextTriggerAt) return;
  const player = engine.state.player;
  state.targetY = Math.max(80, Math.min(mapHeight - 80, player.y + player.height / 2));
  state.warningAt = time + 1400;
  engine.state.effects.push({ id: `arc-warning-wide-${time}`, x: 0, y: state.targetY, radius: 0, maxRadius: mapWidth, color: '#bda5ff', lifeTime: 0, maxLifeTime: 1400, type: 'beam', angle: 0, width: 12, element: 'arcane' });
  engine.state.effects.push({ id: `arc-source-charge-${time}`, x: source.x, y: source.y, radius: 5, maxRadius: 68, color: '#cdbaff', lifeTime: 0, maxLifeTime: 1400, type: 'circle', element: 'arcane' });
  engine.state.damageNumbers.push({ id: `arc-warning-text-${time}`, x: source.x, y: source.y - 34, value: 'STRAHL LÄDT', color: '#cdbaff', lifeTime: 0, maxLifeTime: 1200, scale: 1.05 });
}

function updateRitualCore(engine: GameEngine, state: RoomMechanicState, time: number, dt: number) {
  if (state.ritualBroken) return;
  const core = sourceFor(engine, ['cauldron']);
  for (const enemy of engine.state.enemies) {
    if (enemy.isDead || enemy.hp <= 0 || state.ritualBuffedIds.has(enemy.id)) continue;
    state.ritualBuffedIds.add(enemy.id);
    enemy.attack = Math.max(enemy.attack + 2, Math.round(enemy.attack * 1.18));
    enemy.speed *= 1.08;
  }

  const player = engine.state.player;
  const nearCore = Math.hypot(player.x + player.width / 2 - core.x, player.y + player.height / 2 - core.y) <= 78;
  state.ritualChargeMs = nearCore ? state.ritualChargeMs + dt : Math.max(0, state.ritualChargeMs - dt * 0.55);
  if (time >= state.nextTriggerAt) {
    state.nextTriggerAt = time + 650;
    engine.state.effects.push({ id: `ritual-core-outer-${time}`, x: core.x, y: core.y, radius: 10, maxRadius: 82, color: '#8f54ff', lifeTime: 0, maxLifeTime: 650, type: 'circle', element: 'arcane' });
    engine.state.effects.push({ id: `ritual-core-inner-${time}`, x: core.x, y: core.y, radius: 4, maxRadius: 44, color: '#eadfff', lifeTime: 0, maxLifeTime: 650, type: 'circle', element: 'arcane' });
    engine.state.damageNumbers.push({ id: `ritual-progress-${time}`, x: core.x, y: core.y - 28, value: `KERN ${Math.min(100, Math.floor(state.ritualChargeMs / 20))}%`, color: '#e0ccff', lifeTime: 0, maxLifeTime: 600, scale: .9 });
  }
  if (state.ritualChargeMs < 2000) return;
  state.ritualBroken = true;
  for (const enemy of engine.state.enemies) {
    if (!state.ritualBuffedIds.has(enemy.id) || enemy.isDead) continue;
    enemy.attack = Math.max(1, Math.round(enemy.attack / 1.18) - 2);
    enemy.speed /= 1.08;
  }
  engine.state.effects.push({ id: `ritual-break-${time}`, x: core.x, y: core.y, radius: 0, maxRadius: 180, color: '#eee3ff', lifeTime: 0, maxLifeTime: 1100, type: 'circle', element: 'arcane' });
  announce('RITUAL GEBROCHEN', 'Der sichtbare Schleierkern ist erloschen. Die Verstärkung der Gegner endet.', 'daily');
}

function updateGraveCall(engine: GameEngine, state: RoomMechanicState, time: number) {
  if (state.graveTriggered) return;
  const living = engine.state.enemies.filter(enemy => enemy.hp > 0 && !enemy.isDead);
  if (living.length > 3 || engine.state.killCount < 2) return;
  state.graveTriggered = true;
  for (const enemy of living) {
    enemy.speed *= 1.18;
    enemy.attack = Math.round(enemy.attack * 1.15);
    engine.state.effects.push({ id: `grave-call-${time}-${enemy.id}`, x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2, radius: 0, maxRadius: 62, color: '#a77cff', lifeTime: 0, maxLifeTime: 720, type: 'circle', element: 'arcane' });
  }
  announce('GRABESRUF', 'Die letzten Wächter geraten sichtbar in Schleierwut.', 'relic');
}

export function updateRoomMechanics(engine: GameEngine, state: RoomMechanicState, time: number, dt: number) {
  enterRoom(engine, state, time);
  if (!state.kind || engine.state.roomClearReady) return;
  if (state.kind === 'forge-burst') updateForgeBurst(engine, state, time);
  else if (state.kind === 'arc-line') updateArcLine(engine, state, time);
  else if (state.kind === 'ritual-core') updateRitualCore(engine, state, time, dt);
  else if (state.kind === 'grave-call') updateGraveCall(engine, state, time);
}
