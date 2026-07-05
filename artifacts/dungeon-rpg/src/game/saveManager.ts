import { ClassKey } from './classes';
import { DungeonMap } from './dungeon';

const SAVE_KEY = 'dungeon-veil-save';

export interface SaveData {
  playerName: string;
  playerClass: ClassKey;
  floor: number;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  attackRange: number;
  skillRange: number;
  killCount: number;
  // Open-world persistent state
  worldX: number;
  worldY: number;
  dungeonEntranceX: number;
  dungeonEntranceY: number;
  playerX: number;
  playerY: number;
  inDungeon: boolean;
  overworldMap: DungeonMap;
  dungeonMap?: DungeonMap;
  savedAt: number;
}

export function saveGame(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

export function loadGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SaveData;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
