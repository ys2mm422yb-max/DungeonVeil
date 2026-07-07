import { ClassKey } from './classes';
import { DungeonMap } from './dungeon';

const SAVE_KEY = 'dungeon-veil-save';
export const SAVE_VERSION = 2;

export interface SaveData {
  saveVersion?: number;
  saveReason?: string;
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

export function saveGame(data: SaveData): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...data, saveVersion: SAVE_VERSION }));
    return true;
  } catch (error) {
    console.error('Dungeon Veil save failed', error);
    return false;
  }
}

export function loadGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveData;
    if (!parsed || typeof parsed.playerName !== 'string' || !parsed.overworldMap) return null;
    if (!['warrior', 'mage', 'archer'].includes(parsed.playerClass)) return null;
    return {
      ...parsed,
      saveVersion: parsed.saveVersion ?? 1,
      worldX: Number.isFinite(parsed.worldX) ? parsed.worldX : parsed.playerX ?? 0,
      worldY: Number.isFinite(parsed.worldY) ? parsed.worldY : parsed.playerY ?? 0,
      playerX: Number.isFinite(parsed.playerX) ? parsed.playerX : parsed.worldX ?? 0,
      playerY: Number.isFinite(parsed.playerY) ? parsed.playerY : parsed.worldY ?? 0,
      savedAt: Number.isFinite(parsed.savedAt) ? parsed.savedAt : Date.now(),
    };
  } catch (error) {
    console.error('Dungeon Veil save load failed', error);
    return null;
  }
}

export function hasSave(): boolean {
  return loadGame() !== null;
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
