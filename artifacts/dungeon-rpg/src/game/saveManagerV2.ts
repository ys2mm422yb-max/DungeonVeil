import type { ClassKey } from './classes';
import type { DungeonMap } from './dungeon';
import type { UpgradeKey } from '../i18n/translations';
import { decodeSaveV2, encodeSaveV2, normalizeSaveV2, SAVE_V2_VERSION } from './saveV2Codec';

const SAVE_KEY = 'dungeon-veil-save';
const BACKUP_KEY = 'dungeon-veil-save-backup';
const TEMP_KEY = 'dungeon-veil-save-temp';
export const SAVE_VERSION = SAVE_V2_VERSION;

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

export function saveGame(data: SaveData): boolean {
  try {
    const compactData = { ...data, dungeonMap: undefined };
    const normalized = normalizeSaveV2({ ...compactData, saveVersion: SAVE_VERSION, savedAt: Date.now() });
    if (!normalized) return false;

    const encoded = encodeSaveV2(normalized);
    localStorage.setItem(TEMP_KEY, encoded);
    if (!decodeSaveV2(localStorage.getItem(TEMP_KEY))) throw new Error('Save verification failed');

    const current = localStorage.getItem(SAVE_KEY);
    if (current && decodeSaveV2(current)) localStorage.setItem(BACKUP_KEY, current);
    localStorage.setItem(SAVE_KEY, encoded);
    localStorage.removeItem(TEMP_KEY);
    window.dispatchEvent(new CustomEvent('dungeon-veil-save-complete', {
      detail: { savedAt: normalized.savedAt, reason: normalized.saveReason ?? 'manual' },
    }));
    return true;
  } catch (error) {
    console.error('Dungeon Veil save failed', error);
    return false;
  }
}

export function loadGame(): SaveData | null {
  try {
    const main = decodeSaveV2(localStorage.getItem(SAVE_KEY));
    if (main) {
      if (main.legacy) saveGame(main.data);
      return main.data;
    }

    const backupRaw = localStorage.getItem(BACKUP_KEY);
    const backup = decodeSaveV2(backupRaw);
    if (backup && backupRaw) {
      localStorage.setItem(SAVE_KEY, backupRaw);
      window.dispatchEvent(new CustomEvent('dungeon-veil-save-recovered', {
        detail: { savedAt: backup.data.savedAt },
      }));
      return backup.data;
    }

    const tempRaw = localStorage.getItem(TEMP_KEY);
    const temp = decodeSaveV2(tempRaw);
    if (temp && tempRaw) {
      localStorage.setItem(SAVE_KEY, tempRaw);
      localStorage.removeItem(TEMP_KEY);
      return temp.data;
    }
    return null;
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
  localStorage.removeItem(BACKUP_KEY);
  localStorage.removeItem(TEMP_KEY);
}
