import type { GameEngine } from './runEngine';
import { roomIdentity } from './roomIdentity';

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
  if (room === 6 || room === 18) return 'forge-burst';
  if (room === 5 || room === 16) return 'arc-line';
  if (room === 9 || room === 15 || room === 19) return 'ritual-core';
  if (room === 17) return 'grave-call';
  return null;
}

function announce(title: string, text: string, tone: 'hunt' | 'daily' | 'relic' = 'hunt') {
  window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', { detail: { title, text, tone } }));
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
    scale: 1.35,
  });
}

function enterRoom(engine: GameEngine, state: RoomMechanicState, time: number) {
  const key = `${engine.state.chapter}:${engine.state.floor}`;
  if (state.roomKey === key) return;
  state.roomKey = key;
  state.kind = roomMechanicFor(engine.state.floor);
  state.nextTriggerAt = time + 2600;
  state.warningAt = 0;
  state.ritualChargeMs = 0;
  state.ritualBroken = false;
  state.ritualBuffedIds.clear();
  state.graveTriggered = false;

  const identity = roomIdentity(engine.state.floor);
  if (state.kind === 'forge-burst') announce(identity.nameDe, 'Glutadern im Boden brechen regelmäßig auf.', 'relic');
  else if (state.kind === 'arc-line') announce(identity.nameDe, 'Eine instabile Apparatur lädt quer durch den Raum.', 'hunt');
  else if (state.kind === 'ritual-core') announce('SCHLEIERKERN AKTIV', 'Bleib am Kern, um das Ritual zu brechen. Solange stärkt er die Feinde.', 'relic');
  else if (state.kind === 'grave-call') announce('DIE GRÄBER HÖREN ZU', 'Wenn die Reihen dünner werden, ruft die Gruft die Verbliebenen.', 'relic');
}

function updateForgeBurst(engine: GameEngine, state: RoomMechanicState, time: number) {
  const player = engine.state.player;
  if (state.warningAt > 0 && time >= state.warningAt) {
    const px = player.x + player.width / 2;
    const py = player.y + player.height / 2;
    if (Math.hypot(px - state.targetX, py - state.targetY) <= 72) damagePlayer(engine, time, 12 + Math.floor(engine.state.floor / 8), '#ff7040', 'forge-burst');
    engine.state.effects.push({ id: `forge-impact-${time}`, x: state.targetX, y: state.targetY, radius: 0, maxRadius: 88, color: '#ff5e2f', lifeTime: 0, maxLifeTime: 520, type: 'circle', element: 'fire' });
    state.warningAt = 0;
    state.nextTriggerAt = time + 3900;
    return;
  }
  if (state.warningAt || time < state.nextTriggerAt) return;
  state.targetX = player.x + player.width / 2;
  state.targetY = player.y + player.height / 2;
  state.warningAt = time + 900;
  engine.state.effects.push({ id: `forge-warning-${time}`, x: state.targetX, y: state.targetY, radius: 0, maxRadius: 72, color: '#ffb066', lifeTime: 0, maxLifeTime: 900, type: 'circle', element: 'fire' });
}

function updateArcLine(engine: GameEngine, state: RoomMechanicState, time: number) {
  const mapWidth = engine.state.map.width * 40;
  const mapHeight = engine.state.map.height * 40;
  if (state.warningAt > 0 && time >= state.warningAt) {
    const player = engine.state.player;
    const py = player.y + player.height / 2;
    if (Math.abs(py - state.targetY) <= 28) damagePlayer(engine, time, 10 + Math.floor(engine.state.floor / 10), '#a58bff', 'arc-line');
    engine.state.effects.push({ id: `arc-fire-${time}`, x: 0, y: state.targetY, radius: 0, maxRadius: mapWidth, color: '#916cff', lifeTime: 0, maxLifeTime: 420, type: 'beam', angle: 0, width: 8, element: 'arcane' });
    state.warningAt = 0;
    state.nextTriggerAt = time + 4300;
    return;
  }
  if (state.warningAt || time < state.nextTriggerAt) return;
  const player = engine.state.player;
  state.targetY = Math.max(80, Math.min(mapHeight - 80, player.y + player.height / 2));
  state.warningAt = time + 1100;
  engine.state.effects.push({ id: `arc-warning-${time}`, x: 0, y: state.targetY, radius: 0, maxRadius: mapWidth, color: '#c8baff', lifeTime: 0, maxLifeTime: 1100, type: 'beam', angle: 0, width: 3, element: 'arcane' });
}

function updateRitualCore(engine: GameEngine, state: RoomMechanicState, time: number, dt: number) {
  if (state.ritualBroken) return;
  const centerX = engine.state.map.width * 20;
  const centerY = engine.state.map.height * 20;
  for (const enemy of engine.state.enemies) {
    if (enemy.isDead || enemy.hp <= 0 || state.ritualBuffedIds.has(enemy.id)) continue;
    state.ritualBuffedIds.add(enemy.id);
    enemy.attack = Math.max(enemy.attack + 2, Math.round(enemy.attack * 1.18));
    enemy.speed *= 1.08;
  }

  const player = engine.state.player;
  const nearCore = Math.hypot(player.x + player.width / 2 - centerX, player.y + player.height / 2 - centerY) <= 70;
  state.ritualChargeMs = nearCore ? state.ritualChargeMs + dt : Math.max(0, state.ritualChargeMs - dt * 0.7);
  if (time >= state.nextTriggerAt) {
    state.nextTriggerAt = time + 800;
    engine.state.effects.push({ id: `ritual-core-${time}`, x: centerX, y: centerY, radius: 12, maxRadius: 62, color: '#a66dff', lifeTime: 0, maxLifeTime: 720, type: 'circle', element: 'arcane' });
    engine.state.damageNumbers.push({ id: `ritual-progress-${time}`, x: centerX, y: centerY - 24, value: `${Math.min(100, Math.floor(state.ritualChargeMs / 18))}%`, color: '#d6bdff', lifeTime: 0, maxLifeTime: 650, scale: 0.8 });
  }
  if (state.ritualChargeMs < 1800) return;
  state.ritualBroken = true;
  for (const enemy of engine.state.enemies) {
    if (!state.ritualBuffedIds.has(enemy.id) || enemy.isDead) continue;
    enemy.attack = Math.max(1, Math.round(enemy.attack / 1.18) - 2);
    enemy.speed /= 1.08;
  }
  engine.state.effects.push({ id: `ritual-break-${time}`, x: centerX, y: centerY, radius: 0, maxRadius: 150, color: '#d9c2ff', lifeTime: 0, maxLifeTime: 1000, type: 'circle', element: 'arcane' });
  announce('RITUAL GEBROCHEN', 'Die Schleierverstärkung der Gegner ist erloschen.', 'daily');
}

function updateGraveCall(engine: GameEngine, state: RoomMechanicState, time: number) {
  if (state.graveTriggered) return;
  const living = engine.state.enemies.filter(enemy => enemy.hp > 0 && !enemy.isDead);
  if (living.length > 3 || engine.state.killCount < 2) return;
  state.graveTriggered = true;
  for (const enemy of living) {
    enemy.speed *= 1.18;
    enemy.attack = Math.round(enemy.attack * 1.15);
    engine.state.effects.push({ id: `grave-call-${time}-${enemy.id}`, x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2, radius: 0, maxRadius: 50, color: '#a77cff', lifeTime: 0, maxLifeTime: 620, type: 'circle', element: 'arcane' });
  }
  announce('GRABESRUF', 'Die letzten Wächter geraten in Schleierwut.', 'relic');
}

export function updateRoomMechanics(engine: GameEngine, state: RoomMechanicState, time: number, dt: number) {
  enterRoom(engine, state, time);
  if (!state.kind || engine.state.roomClearReady) return;
  if (state.kind === 'forge-burst') updateForgeBurst(engine, state, time);
  else if (state.kind === 'arc-line') updateArcLine(engine, state, time);
  else if (state.kind === 'ritual-core') updateRitualCore(engine, state, time, dt);
  else if (state.kind === 'grave-call') updateGraveCall(engine, state, time);
}
