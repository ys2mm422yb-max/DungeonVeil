import type { DungeonMap } from './dungeon';
import { generateRunRoom } from './chapterRun';
import type { SaveData } from './saveManager';
import type { UpgradeKey } from '../i18n/translations';

export const SAVE_V2_FORMAT = 'dungeon-veil-save-v2';
export const SAVE_V2_VERSION = 5;

export type SaveEnvelopeV2 = {
  format: typeof SAVE_V2_FORMAT;
  envelopeVersion: 2;
  checksum: string;
  savedAt: number;
  payload: SaveData;
};

export type DecodedSave = { data: SaveData; legacy: boolean };

function persistentRunSkills(skills: Partial<Record<UpgradeKey, number>> | undefined) {
  const persistent = { ...(skills ?? {}) };
  delete persistent.heal;
  return persistent;
}

function hash(value: string): string {
  let result = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 0x01000193);
  }
  return (result >>> 0).toString(16).padStart(8, '0');
}

function validMap(map: unknown): map is DungeonMap {
  if (!map || typeof map !== 'object') return false;
  const value = map as Partial<DungeonMap>;
  return Number.isInteger(value.width) && Number(value.width) > 0
    && Number.isInteger(value.height) && Number(value.height) > 0
    && Array.isArray(value.tiles) && value.tiles.length === value.height;
}

function finite(value: unknown, fallback: number): number {
  return Number.isFinite(value) ? Number(value) : fallback;
}

export function normalizeSaveV2(parsed: SaveData): SaveData | null {
  if (!parsed || typeof parsed.playerName !== 'string' || !parsed.playerName.trim()) return null;
  if (!['warrior', 'mage', 'archer'].includes(parsed.playerClass)) return null;

  const floor = Math.max(1, Math.min(20, Math.round(finite(parsed.floor, 1))));
  const chapter = Math.max(1, Math.round(finite(parsed.chapter, 1)));
  const fallbackMap = generateRunRoom(floor);
  const overworldMap = validMap(parsed.overworldMap) ? parsed.overworldMap : fallbackMap;
  const inDungeon = parsed.inDungeon !== false;
  const maxHp = Math.max(1, finite(parsed.maxHp, 100));
  const hp = Math.max(0, Math.min(maxHp, finite(parsed.hp, maxHp)));

  return {
    ...parsed,
    playerName: parsed.playerName.trim().slice(0, 32),
    floor,
    chapter,
    runSkills: persistentRunSkills(parsed.runSkills),
    level: Math.max(1, Math.round(finite(parsed.level, 1))),
    xp: Math.max(0, finite(parsed.xp, 0)),
    hp,
    maxHp,
    attack: Math.max(1, finite(parsed.attack, 1)),
    defense: Math.max(0, finite(parsed.defense, 0)),
    speed: Math.max(1, finite(parsed.speed, 1)),
    attackRange: Math.max(1, finite(parsed.attackRange, 520)),
    skillRange: Math.max(1, finite(parsed.skillRange, 1)),
    killCount: Math.max(0, Math.round(finite(parsed.killCount, 0))),
    worldX: finite(parsed.worldX, finite(parsed.playerX, 0)),
    worldY: finite(parsed.worldY, finite(parsed.playerY, 0)),
    dungeonEntranceX: finite(parsed.dungeonEntranceX, 0),
    dungeonEntranceY: finite(parsed.dungeonEntranceY, 0),
    playerX: finite(parsed.playerX, finite(parsed.worldX, 0)),
    playerY: finite(parsed.playerY, finite(parsed.worldY, 0)),
    inDungeon,
    overworldMap,
    dungeonMap: inDungeon && validMap(parsed.dungeonMap) ? parsed.dungeonMap : undefined,
    savedAt: finite(parsed.savedAt, Date.now()),
    saveVersion: SAVE_V2_VERSION,
  };
}

export function encodeSaveV2(data: SaveData): string {
  const payloadJson = JSON.stringify(data);
  const envelope: SaveEnvelopeV2 = {
    format: SAVE_V2_FORMAT,
    envelopeVersion: 2,
    checksum: hash(payloadJson),
    savedAt: data.savedAt,
    payload: data,
  };
  return JSON.stringify(envelope);
}

export function decodeSaveV2(raw: string | null): DecodedSave | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SaveEnvelopeV2 | SaveData;
    if ((parsed as SaveEnvelopeV2).format === SAVE_V2_FORMAT) {
      const envelope = parsed as SaveEnvelopeV2;
      if (envelope.envelopeVersion !== 2 || !envelope.payload) return null;
      const payloadJson = JSON.stringify(envelope.payload);
      if (hash(payloadJson) !== envelope.checksum) return null;
      const data = normalizeSaveV2(envelope.payload);
      return data ? { data, legacy: false } : null;
    }
    const data = normalizeSaveV2(parsed as SaveData);
    return data ? { data, legacy: true } : null;
  } catch {
    return null;
  }
}
