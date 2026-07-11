import { ROOM_BIBLE, type RoomPhaseId, type RoomShell, type RoomSilhouette } from './roomBible';

export type RoomIdentityId =
  | 'storehouse'
  | 'guardroom'
  | 'old-passage'
  | 'miners-camp'
  | 'workshop'
  | 'forge'
  | 'quarters'
  | 'material-vault'
  | 'ritual-antechamber'
  | 'guardian-hall'
  | 'overgrown-vault'
  | 'blood-archive'
  | 'rune-sanctum'
  | 'root-chamber'
  | 'veil-shrine'
  | 'fractured-workshop'
  | 'grave-gallery'
  | 'crystal-foundry'
  | 'broken-ritual'
  | 'first-warden';

export type RoomIdentity = {
  id: RoomIdentityId;
  nameDe: string;
  nameEn: string;
  packs: Array<'furniture' | 'tools' | 'resources' | 'forest' | 'halloween'>;
  keywords: string[];
  forbiddenKeywords: string[];
  density: number;
  heroObject: string;
  phase: RoomPhaseId;
  silhouette: RoomSilhouette;
  shell: RoomShell;
};

// IDs remain stable for saves, diagnostics and drop provenance. Everything visual
// and tactical now comes from the binding room bible instead of a second list.
const STABLE_IDS: Record<number, RoomIdentityId> = {
  1: 'storehouse',
  2: 'guardroom',
  3: 'old-passage',
  4: 'miners-camp',
  5: 'workshop',
  6: 'forge',
  7: 'quarters',
  8: 'material-vault',
  9: 'ritual-antechamber',
  10: 'guardian-hall',
  11: 'overgrown-vault',
  12: 'blood-archive',
  13: 'rune-sanctum',
  14: 'root-chamber',
  15: 'veil-shrine',
  16: 'fractured-workshop',
  17: 'grave-gallery',
  18: 'crystal-foundry',
  19: 'broken-ritual',
  20: 'first-warden',
};

export const ROOM_IDENTITIES: Record<number, RoomIdentity> = Object.fromEntries(
  Object.values(ROOM_BIBLE).map(spec => [spec.room, {
    id: STABLE_IDS[spec.room],
    nameDe: spec.nameDe,
    nameEn: spec.nameEn,
    packs: [...spec.packs],
    keywords: [...spec.keywords],
    forbiddenKeywords: [...spec.forbiddenKeywords],
    density: spec.density,
    heroObject: spec.heroObject,
    phase: spec.phase,
    silhouette: spec.silhouette,
    shell: spec.shell,
  }]),
) as Record<number, RoomIdentity>;

export function roomIdentity(room: number): RoomIdentity {
  return ROOM_IDENTITIES[Math.max(1, Math.min(20, room))] ?? ROOM_IDENTITIES[1];
}
