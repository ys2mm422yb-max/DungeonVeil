import { CINDER_CROWN_ROOMS, type CinderCrownSilhouette } from './cinderCrownRooms';
import { ROOM_BIBLE, type RoomPhaseId, type RoomShell, type RoomSilhouette } from './roomBible';
import { CHAPTER_ROOMS } from './chapterRun';

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
  | 'first-warden'
  | `world-room-${number}`;

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

const CINDER_SILHOUETTES: Record<CinderCrownSilhouette, RoomSilhouette> = {
  'cinder-gate': 'three-lane',
  'chain-court': 'cross',
  'bellows-hall': 'diagonal',
  'black-anvil': 'ring',
  'shattered-battlements': 'tri-island',
  'ember-procession': 's-curve',
  'crown-crucible': 'orbit',
  'slag-throne': 'axial',
  'last-coronation': 'tri-island',
  'ashen-king-arena': 'arena',
};

const bibleIdentities = Object.values(ROOM_BIBLE).map(spec => [spec.room, {
  id: STABLE_IDS[spec.room] ?? `world-room-${spec.room}`,
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
}] as const);

const cinderIdentities = Object.values(CINDER_CROWN_ROOMS).map(spec => [spec.room, {
  id: `world-room-${spec.room}` as RoomIdentityId,
  nameDe: spec.titleDe,
  nameEn: spec.titleEn,
  packs: ['tools', 'resources', 'halloween'] as RoomIdentity['packs'],
  keywords: ['cinder', 'ember', 'forge', 'basalt', 'chain', 'crown', spec.hazard],
  forbiddenKeywords: ['water', 'tide', 'forest', 'village', 'star-dominant', 'gold-dominant'],
  density: spec.room === 90 ? 1 : 3,
  heroObject: spec.room === 90 ? 'Aschenkönig-Arena mit Kronenankern' : `Aschenkronen-Struktur: ${spec.silhouette}`,
  phase: 'fortress-ember' as RoomPhaseId,
  silhouette: CINDER_SILHOUETTES[spec.silhouette],
  shell: 'veil' as RoomShell,
}] as const);

export const ROOM_IDENTITIES: Record<number, RoomIdentity> = Object.fromEntries([
  ...bibleIdentities,
  ...cinderIdentities,
]) as Record<number, RoomIdentity>;

export function roomIdentity(room: number): RoomIdentity {
  return ROOM_IDENTITIES[Math.max(1, Math.min(CHAPTER_ROOMS, room))] ?? ROOM_IDENTITIES[1];
}
