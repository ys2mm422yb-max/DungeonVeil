import { TILE_SIZE, TileType } from './dungeon';
import type { GameEngine } from './runEngine';
import {
  EQUIPMENT,
  collectMetaEquipmentDrop,
  rollMetaEquipmentDrop,
  spawnEquipmentDrop,
  type EquipmentId,
  type PendingEquipmentDrop,
} from './metaProgression';

export type EquipmentWorldLootState = {
  tracked: Map<string, { roomKey: string; item: EquipmentId }>;
  processedHuntDeaths: Set<string>;
  exitBlocked: boolean;
  auditedClearKey: string;
  warningRoomKey: string;
  lastWarningAt: number;
  originalCanExitRoom: GameEngine['canExitRoom'] | null;
};

export function createEquipmentWorldLootState(): EquipmentWorldLootState {
  return {
    tracked: new Map(),
    processedHuntDeaths: new Set(),
    exitBlocked: false,
    auditedClearKey: '',
    warningRoomKey: '',
    lastWarningAt: 0,
    originalCanExitRoom: null,
  };
}

function roomKey(engine: GameEngine) {
  return `${engine.state.chapter}:${engine.state.floor}`;
}

function roomClearKey(engine: GameEngine) {
  return `${roomKey(engine)}:${engine.state.roomClearAt}`;
}

function installExitGuard(engine: GameEngine, state: EquipmentWorldLootState) {
  if (state.originalCanExitRoom) return;
  const original = engine.canExitRoom;
  state.originalCanExitRoom = original;
  engine.canExitRoom = () => {
    if (!original.call(engine)) return false;
    if (engine.state.roomClearReady && state.auditedClearKey !== roomClearKey(engine)) return false;
    return !state.exitBlocked;
  };
}

export function disposeEquipmentWorldLoot(engine: GameEngine, state: EquipmentWorldLootState) {
  state.exitBlocked = false;
  state.auditedClearKey = '';
  state.warningRoomKey = '';
  if (!state.originalCanExitRoom) return;
  engine.canExitRoom = state.originalCanExitRoom;
  state.originalCanExitRoom = null;
}

function trackLiveEquipment(engine: GameEngine, state: EquipmentWorldLootState) {
  const key = roomKey(engine);
  for (const item of engine.state.items) {
    if (item.itemType !== 'equipment' || !item.equipmentId || state.tracked.has(item.id)) continue;
    state.tracked.set(item.id, { roomKey: key, item: item.equipmentId });
  }
}

function processCollectedEquipment(engine: GameEngine, state: EquipmentWorldLootState, time: number) {
  const key = roomKey(engine);
  for (const [itemId, tracked] of state.tracked) {
    if (engine.state.items.some(item => item.id === itemId)) continue;
    state.tracked.delete(itemId);
    if (tracked.roomKey !== key) continue;

    const definition = EQUIPMENT[tracked.item];
    const result = collectMetaEquipmentDrop(tracked.item);
    engine.state.damageNumbers.push({
      id: `equipment-pickup-${time}-${itemId}`,
      x: engine.state.player.x + engine.state.player.width / 2,
      y: engine.state.player.y - 16,
      value: result.duplicate ? `KOPIE +1 · ${definition.nameDe}` : `NEU · ${definition.nameDe}`,
      color: definition.accent,
      lifeTime: 0,
      maxLifeTime: 1600,
      scale: result.duplicate ? 1 : 1.25,
    });
    engine.state.effects.push({
      id: `equipment-pickup-wave-${time}-${itemId}`,
      x: engine.state.player.x + engine.state.player.width / 2,
      y: engine.state.player.y + engine.state.player.height / 2,
      radius: 0,
      maxRadius: result.duplicate ? 62 : 88,
      color: definition.accent,
      lifeTime: 0,
      maxLifeTime: 520,
      type: 'pickup',
      element: 'arcane',
    });
    window.dispatchEvent(new CustomEvent('dungeon-veil-equipment-picked', {
      detail: { item: tracked.item, duplicate: result.duplicate, copies: result.progress.copies, level: result.progress.level },
    }));
  }
}

function spawnHuntEquipment(engine: GameEngine, state: EquipmentWorldLootState) {
  for (const enemy of engine.state.enemies) {
    if (!enemy.isDead || !enemy.isHuntTarget || state.processedHuntDeaths.has(enemy.id)) continue;
    state.processedHuntDeaths.add(enemy.id);
    const drop = rollMetaEquipmentDrop('hunt', 0.32);
    if (!drop) continue;
    spawnEquipmentDrop(engine, drop, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
  }
}

function warningLoot(engine: GameEngine) {
  return engine.state.items.filter(item => item.itemType === 'relic' || (
    item.itemType === 'equipment'
    && (item.isNewEquipment || item.equipmentRarity === 'rare' || item.equipmentRarity === 'epic')
  ));
}

function playerNearExit(engine: GameEngine) {
  const p = engine.state.player;
  const px = p.x + p.width / 2;
  const py = p.y + p.height / 2;
  for (let y = 0; y < engine.state.map.tiles.length; y++) {
    const x = engine.state.map.tiles[y].findIndex(tile => tile === TileType.STAIRS_DOWN);
    if (x < 0) continue;
    const exitX = x * TILE_SIZE + TILE_SIZE / 2;
    const exitY = y * TILE_SIZE + TILE_SIZE / 2;
    return Math.hypot(px - exitX, py - exitY) <= TILE_SIZE * 2.2;
  }
  return false;
}

function applyPortalLootGuard(engine: GameEngine, state: EquipmentWorldLootState, time: number) {
  const key = roomKey(engine);
  const importantLoot = warningLoot(engine);
  state.exitBlocked = engine.state.roomClearReady && importantLoot.length > 0;
  state.auditedClearKey = engine.state.roomClearReady ? roomClearKey(engine) : '';

  if (!state.exitBlocked) {
    state.warningRoomKey = '';
    return;
  }

  state.warningRoomKey = key;
  if (!playerNearExit(engine) || time - state.lastWarningAt < 1100) return;
  state.lastWarningAt = time;
  engine.state.damageNumbers.push({
    id: `unclaimed-loot-${time}`,
    x: engine.state.player.x + engine.state.player.width / 2,
    y: engine.state.player.y - 28,
    value: 'UNAUFGEHOBENE BEUTE',
    color: '#f4c86c',
    lifeTime: 0,
    maxLifeTime: 1250,
    scale: 1.15,
  });
}

export function spawnRoomEquipmentReward(engine: GameEngine, drop: PendingEquipmentDrop) {
  const x = engine.state.map.width * TILE_SIZE / 2;
  const y = engine.state.map.height * TILE_SIZE / 2;
  return spawnEquipmentDrop(engine, drop, x, y);
}

export function updateEquipmentWorldLoot(engine: GameEngine, state: EquipmentWorldLootState, time: number) {
  installExitGuard(engine, state);
  spawnHuntEquipment(engine, state);
  trackLiveEquipment(engine, state);
  processCollectedEquipment(engine, state, time);
  applyPortalLootGuard(engine, state, time);
}
