import type { GameEngine } from './runEngine';
import { applyWeeklyRiftToEngine, currentWeeklyRift, type WeeklyRiftId } from './weeklyRift';

const PENDING_KEY = 'dungeon-veil-weekly-rift-pending';
const ACTIVE_KEY = 'dungeon-veil-weekly-rift-active';
const RECORDS_KEY = 'dungeon-veil-weekly-rift-records-v1';

export type WeeklyRiftRecords = Partial<Record<WeeklyRiftId, number>>;

export type WeeklyRiftRunState = {
  applied: boolean;
  balancedEnemyIds: Set<string>;
  skippedGiftFloors: Set<string>;
  lastRoomKey: string;
};

export function queueWeeklyRiftRun(): void {
  try { sessionStorage.setItem(PENDING_KEY, '1'); } catch {}
}

export function clearWeeklyRiftRun(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY);
    localStorage.removeItem(ACTIVE_KEY);
  } catch {}
}

export function activatePendingWeeklyRift(): boolean {
  try {
    if (sessionStorage.getItem(PENDING_KEY) !== '1') return false;
    sessionStorage.removeItem(PENDING_KEY);
    localStorage.setItem(ACTIVE_KEY, currentWeeklyRift().id);
    return true;
  } catch {
    return false;
  }
}

export function activeWeeklyRiftId(): WeeklyRiftId | null {
  try {
    const value = localStorage.getItem(ACTIVE_KEY);
    return value === 'blood-week' || value === 'frozen-veil' || value === 'empty-veil' ? value : null;
  } catch {
    return null;
  }
}

export function isWeeklyRiftActive(): boolean {
  return activeWeeklyRiftId() !== null;
}

export function loadWeeklyRiftRecords(): WeeklyRiftRecords {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    return raw ? JSON.parse(raw) as WeeklyRiftRecords : {};
  } catch {
    return {};
  }
}

function saveDepthRecord(id: WeeklyRiftId, room: number): void {
  const records = loadWeeklyRiftRecords();
  if ((records[id] ?? 0) >= room) return;
  records[id] = room;
  try { localStorage.setItem(RECORDS_KEY, JSON.stringify(records)); } catch {}
  window.dispatchEvent(new CustomEvent('dungeon-veil-weekly-rift-record', { detail: { id, room } }));
}

export function createWeeklyRiftRunState(): WeeklyRiftRunState {
  return { applied: false, balancedEnemyIds: new Set<string>(), skippedGiftFloors: new Set<string>(), lastRoomKey: '' };
}

export function updateWeeklyRiftRun(engine: GameEngine, state: WeeklyRiftRunState): void {
  const activeId = activeWeeklyRiftId();
  if (!activeId) return;
  const rift = currentWeeklyRift();
  if (rift.id !== activeId) {
    clearWeeklyRiftRun();
    return;
  }

  if (!state.applied && engine.state.player.playerName !== 'Hero') {
    state.applied = true;
    applyWeeklyRiftToEngine(engine, rift);
    window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', { detail: { title: 'WOCHEN-RISS BETRETEN', text: `${rift.nameDe} · ${rift.ruleDe}`, tone: 'relic' } }));
  }

  const roomKey = `${engine.state.chapter}:${engine.state.floor}`;
  if (state.lastRoomKey !== roomKey) {
    state.lastRoomKey = roomKey;
    saveDepthRecord(activeId, engine.state.floor);
  }

  for (const enemy of engine.state.enemies) {
    const key = enemy.id.replace(/-hunt-\d+$/, '');
    if (state.balancedEnemyIds.has(key)) continue;
    state.balancedEnemyIds.add(key);
    if (activeId === 'empty-veil') {
      enemy.maxHp = Math.round(enemy.maxHp * 1.15);
      enemy.hp = Math.min(enemy.maxHp, Math.round(enemy.hp * 1.15));
      enemy.attack = Math.round(enemy.attack * 1.08);
    } else if (activeId === 'blood-week') {
      enemy.attack = Math.round(enemy.attack * 1.12);
    } else if (activeId === 'frozen-veil') {
      enemy.speed *= 1.08;
    }
  }

  if (activeId === 'empty-veil' && engine.state.status === 'levelup') {
    const floorKey = `${engine.state.chapter}:${engine.state.floor}`;
    if (engine.state.floor % 2 === 1 && !state.skippedGiftFloors.has(floorKey)) {
      state.skippedGiftFloors.add(floorKey);
      engine.state.upgradeChoices = [];
      engine.state.status = 'playing';
      engine.onStateChange({ ...engine.state });
      window.dispatchEvent(new CustomEvent('dungeon-veil-retention-toast', { detail: { title: 'DER LEERE SCHLEIER SCHWEIGT', text: 'In diesem Raum erscheint keine Gabe.', tone: 'relic' } }));
    }
  }
}
