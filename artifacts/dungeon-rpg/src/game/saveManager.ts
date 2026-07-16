import { ClassKey } from './classes';
import { DungeonMap, generateDungeon } from './dungeon';
import { UpgradeKey } from '../i18n/translations';

const SAVE_KEY = 'dungeon-veil-save';
export const SAVE_VERSION = 4;

export interface SaveData {
  saveVersion?: number;
  saveReason?: string;
  playerName: string;
  playerClass: ClassKey;
  floor: number;
  chapter?: number;
  runSkills?: Partial<Record<UpgradeKey, number>>;
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

function rebuildDungeon(floor: number): DungeonMap {
  if (floor <= 1) return generateDungeon(32, 32, 8, 1);
  const numRooms = Math.min(15, 6 + Math.floor(floor / 2));
  const width = 32 + floor * 2;
  const height = 32 + floor * 2;
  return generateDungeon(width, height, numRooms, floor);
}

function persistentRunSkills(skills: Partial<Record<UpgradeKey, number>> | undefined): Partial<Record<UpgradeKey, number>> {
  const persistent = { ...(skills ?? {}) };
  delete persistent.heal;
  delete persistent.veilCache;
  delete persistent.goldCache;
  return persistent;
}

export function saveGame(data: SaveData): boolean {
  try {
    const { dungeonMap: _dungeonMap, ...compactData } = data;
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      ...compactData,
      runSkills: persistentRunSkills(compactData.runSkills),
      saveVersion: SAVE_VERSION,
    }));
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

    const inDungeon = !!parsed.inDungeon;
    return {
      ...parsed,
      saveVersion: parsed.saveVersion ?? 1,
      chapter: Math.max(1, parsed.chapter ?? 1),
      runSkills: persistentRunSkills(parsed.runSkills),
      inDungeon,
      dungeonMap: inDungeon ? (parsed.dungeonMap ?? rebuildDungeon(parsed.floor)) : undefined,
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
