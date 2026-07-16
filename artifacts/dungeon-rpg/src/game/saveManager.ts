import { ClassKey } from './classes';
import { DungeonMap, generateDungeon } from './dungeon';
import { UpgradeKey } from '../i18n/translations';
import { shouldRestorePendingGift } from './runGiftProgression';

const SAVE_KEY = 'dungeon-veil-save';
export const SAVE_VERSION = 5;

export interface SaveData {
  saveVersion?: number;
  saveReason?: string;
  pendingGift?: boolean;
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

function previousPendingGiftAtSamePosition(data: SaveData): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const previous = JSON.parse(raw) as Partial<SaveData>;
    return previous.pendingGift === true
      && Math.max(1, previous.chapter ?? 1) === Math.max(1, data.chapter ?? 1)
      && Math.max(1, previous.floor ?? 1) === Math.max(1, data.floor ?? 1);
  } catch {
    return false;
  }
}

function pendingGiftForSave(data: SaveData): boolean {
  if (data.saveReason === 'ability' || data.saveReason === 'restart-room' || data.saveReason === 'leave-run') return false;
  if (shouldRestorePendingGift({ ...data, pendingGift: undefined })) return true;
  return previousPendingGiftAtSamePosition(data);
}

export function saveGame(data: SaveData): boolean {
  try {
    const { dungeonMap: _dungeonMap, ...compactData } = data;
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      ...compactData,
      runSkills: persistentRunSkills(compactData.runSkills),
      pendingGift: pendingGiftForSave(data),
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
      pendingGift: typeof parsed.pendingGift === 'boolean' ? parsed.pendingGift : undefined,
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
