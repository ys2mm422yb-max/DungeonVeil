import { EXPANDED_ROOM_BLUEPRINTS } from './expandedWorldRooms';
import { logicalRoomSetpieces } from './logicalRoomSetpieces';
export type RoomPhaseId = 'inhabited-mine' | 'abandoned-quarters' | 'ancient-ruins' | 'warden-veil' | 'meadow-forest' | 'darkwood-village' | 'fortress-ember';
export type RoomSilhouette = 'tri-island' | 'axial' | 'three-lane' | 'diagonal' | 's-curve' | 'ring' | 'zigzag' | 's-lane' | 'cross' | 'arena' | 'orbit';
export type RoomPack = 'furniture' | 'tools' | 'resources' | 'forest' | 'halloween';
export type RoomShell = 'intact' | 'abandoned' | 'monumental' | 'veil';

export type RoomBiblePoint = { x: number; z: number };

export type RoomBibleSpec = {
  room: number;
  nameDe: string;
  nameEn: string;
  phase: RoomPhaseId;
  silhouette: RoomSilhouette;
  heroObject: string;
  packs: RoomPack[];
  keywords: string[];
  forbiddenKeywords: string[];
  density: number;
  shell: RoomShell;
  portal: RoomBiblePoint;
  enemySpawns: RoomBiblePoint[];
  light: {
    background: number;
    fog: number;
    ambient: number;
    hemisphereSky: number;
    hemisphereGround: number;
    key: number;
    fill: number;
    exposure: number;
  };
};

const P = (x: number, z: number): RoomBiblePoint => ({ x, z });

const PHASE_LIGHTS: Record<RoomPhaseId, RoomBibleSpec['light']> = {
  'inhabited-mine': {
    background: 0x17130f, fog: 0x17130f, ambient: 0xd7c8b2,
    hemisphereSky: 0xe0c59c, hemisphereGround: 0x21170f,
    key: 0xffb96d, fill: 0x64548e, exposure: 1.12,
  },
  'abandoned-quarters': {
    background: 0x10151a, fog: 0x10151a, ambient: 0xb6c4ca,
    hemisphereSky: 0xb9d3df, hemisphereGround: 0x111820,
    key: 0x8fb8cf, fill: 0x55457f, exposure: 1.08,
  },
  'ancient-ruins': {
    background: 0x141218, fog: 0x141218, ambient: 0xc4bccd,
    hemisphereSky: 0xd9cce8, hemisphereGround: 0x18131d,
    key: 0xd1b17d, fill: 0x76529c, exposure: 1.1,
  },
  'warden-veil': {
    background: 0x100c13, fog: 0x100c13, ambient: 0xb9a9bf,
    hemisphereSky: 0xc8b1d6, hemisphereGround: 0x160d18,
    key: 0xb86a68, fill: 0x7643ba, exposure: 1.14,
  },
  'meadow-forest': {
    background: 0x789c99, fog: 0x8eb0a7, ambient: 0xdce7c8,
    hemisphereSky: 0xcfe8e4, hemisphereGround: 0x31452d,
    key: 0xffdfa2, fill: 0x84b9c2, exposure: 1.18,
  },
  'darkwood-village': {
    background: 0x0d171f, fog: 0x101a23, ambient: 0x8f9da4,
    hemisphereSky: 0x7891a8, hemisphereGround: 0x10151a,
    key: 0x91a8c9, fill: 0x59447a, exposure: 1.04,
  },
  'fortress-ember': {
    background: 0x1d0d08, fog: 0x1b0b07, ambient: 0xc5a08f,
    hemisphereSky: 0xd09a7d, hemisphereGround: 0x24100b,
    key: 0xff7042, fill: 0x6d3458, exposure: 1.12,
  },
};

const room = (
  roomNumber: number,
  nameDe: string,
  nameEn: string,
  phase: RoomPhaseId,
  silhouette: RoomSilhouette,
  heroObject: string,
  packs: RoomPack[],
  keywords: string[],
  forbiddenKeywords: string[],
  density: number,
  shell: RoomShell,
  portal: RoomBiblePoint,
  enemySpawns: RoomBiblePoint[],
): RoomBibleSpec => ({
  room: roomNumber,
  nameDe,
  nameEn,
  phase,
  silhouette,
  heroObject,
  packs,
  keywords,
  forbiddenKeywords,
  density,
  shell,
  portal,
  enemySpawns,
  light: PHASE_LIGHTS[phase],
});

export const ROOM_BIBLE: Record<number, RoomBibleSpec> = {
  1: room(1, 'Versorgungsposten', 'Supply Post', 'inhabited-mine', 'tri-island', 'markierter Lieferplatz', ['furniture', 'resources'], ['shelf', 'pallet', 'crate', 'barrel', 'rope'], ['pillar', 'ritual', 'anvil', 'grave'], 5, 'intact', P(0, -13.7), [P(-4.4, -5.8), P(4.4, -5.4), P(0, -1.0), P(-3.8, 3.3), P(3.8, 3.6)]),
  2: room(2, 'Wachstube', 'Guardroom', 'inhabited-mine', 'axial', 'Kommandotisch und Waffenstand', ['furniture', 'tools'], ['table', 'chair', 'banner', 'sword', 'shield', 'pillar'], ['barrel_stack', 'shelf_row', 'ritual', 'grave'], 4, 'intact', P(0, -13.7), [P(-3.2, -6.5), P(3.2, -6.5), P(0, -3.8), P(-4.0, 1.0), P(4.0, 1.0)]),
  3: room(3, 'Säulenhalle', 'Column Hall', 'inhabited-mine', 'three-lane', 'zwei klare Säulenreihen', ['halloween'], ['column', 'torch', 'statue', 'banner'], ['crate', 'barrel', 'workbench', 'anvil'], 3, 'intact', P(0, -13.7), [P(-4.2, -6.0), P(0, -6.5), P(4.2, -6.0), P(-4.2, 0.6), P(4.2, 0.6), P(0, 4.0)]),
  4: room(4, 'Bergarbeiterlager', 'Miners Camp', 'inhabited-mine', 'diagonal', 'Erz- und Schienenachse', ['tools', 'resources'], ['pickaxe', 'ore', 'coal', 'rail', 'bucket', 'lantern'], ['ritual', 'grave', 'guard_banner'], 5, 'intact', P(5.4, -12.2), [P(-5.0, -6.4), P(-2.2, -3.2), P(1.0, -0.2), P(3.4, 2.4), P(5.2, 5.0)]),
  5: room(5, 'Werkstatt', 'Workshop', 'inhabited-mine', 's-curve', 'Reparaturplattform', ['tools', 'furniture'], ['workbench', 'grindstone', 'saw', 'wrench', 'blueprint'], ['column', 'grave', 'ritual', 'rock_mass'], 5, 'intact', P(-4.8, -12.0), [P(4.4, -6.2), P(0.8, -4.2), P(-3.4, -1.5), P(2.8, 1.3), P(-4.2, 4.7), P(2.8, 5.5)]),
  6: room(6, 'Schmiede', 'Forge', 'inhabited-mine', 'ring', 'zentraler Schmiedeherd', ['tools', 'resources'], ['anvil', 'forge', 'grindstone', 'ingot', 'coal', 'torch'], ['dining', 'bed', 'ritual', 'grave'], 4, 'intact', P(0, -13.5), [P(-4.7, -5.0), P(0, -6.4), P(4.7, -5.0), P(-5.2, 0.7), P(5.2, 0.7), P(-3.6, 5.0), P(3.6, 5.0)]),

  7: room(7, 'Schlafquartier', 'Sleeping Quarters', 'abandoned-quarters', 'zigzag', 'erloschenes Gemeinschaftsfeuer', ['furniture'], ['bed', 'trunk', 'rug', 'pillow', 'cabinet'], ['anvil', 'column', 'barrel_stack', 'ritual'], 5, 'abandoned', P(-5.2, -11.6), [P(4.8, -6.0), P(0.4, -4.1), P(-4.4, -1.8), P(3.8, 1.0), P(-3.8, 4.2), P(2.8, 5.4)]),
  8: room(8, 'Materiallager', 'Material Vault', 'abandoned-quarters', 's-lane', 'umgestürztes Hochregal', ['resources', 'tools'], ['shelf', 'sack', 'wood', 'rope', 'ore', 'bucket'], ['bed', 'ritual', 'grave', 'forge'], 6, 'abandoned', P(5.0, -11.8), [P(-4.7, -6.4), P(2.8, -4.5), P(-2.8, -1.5), P(3.7, 1.5), P(-3.8, 4.0), P(2.8, 5.6)]),
  9: room(9, 'Ritualkammer', 'Ritual Chamber', 'abandoned-quarters', 'ring', 'zentraler Runenkreis', ['halloween', 'resources'], ['candle', 'crystal', 'skull', 'cauldron', 'rune'], ['table', 'barrel', 'shelf', 'bed'], 3, 'abandoned', P(0, -13.7), [P(-4.5, -4.0), P(0, -5.5), P(4.5, -4.0), P(-5.2, 1.2), P(5.2, 1.2), P(-3.5, 5.0), P(3.5, 5.0)]),
  10: room(10, 'Grabwächterhalle', 'Tomb Guardian Hall', 'abandoned-quarters', 'axial', 'Sarkophagachse', ['halloween'], ['tomb', 'coffin', 'grave', 'statue', 'candle'], ['workbench', 'pallet', 'barrel_stack', 'forge'], 4, 'abandoned', P(0, -13.7), [P(0, -3.2)]),

  11: room(11, 'Kreuzgang', 'Crossing Cloister', 'ancient-ruins', 'cross', 'kleiner Zentralschrein', ['halloween', 'forest'], ['shrine', 'statue', 'root', 'mushroom', 'stone'], ['barrel', 'workbench', 'anvil'], 4, 'monumental', P(0, -13.7), [P(0, -6.0), P(-4.8, -1.5), P(4.8, -1.5), P(0, 2.0), P(-4.5, 5.0), P(4.5, 5.0)]),
  12: room(12, 'Galerie', 'Gallery', 'ancient-ruins', 'axial', 'monumentale Hauptstatue', ['halloween', 'furniture'], ['statue', 'banner', 'pedestal', 'candle'], ['crate', 'barrel', 'forge', 'pallet'], 3, 'monumental', P(0, -13.7), [P(-3.4, -6.4), P(3.4, -6.4), P(0, -3.0), P(-3.8, 1.6), P(3.8, 1.6), P(0, 5.2)]),
  13: room(13, 'Gefängnisring', 'Prison Ring', 'ancient-ruins', 'ring', 'zentraler Schlüsselmechanismus', ['halloween', 'tools'], ['fence', 'chain', 'lock', 'cage', 'key'], ['barrel', 'bed', 'workbench', 'forge'], 4, 'monumental', P(0, -1.0), [P(-4.8, -4.2), P(0, -5.8), P(4.8, -4.2), P(-5.4, 1.0), P(5.4, 1.0), P(-3.8, 5.0), P(3.8, 5.0)]),
  14: room(14, 'Knochenhof', 'Bone Yard', 'ancient-ruins', 'diagonal', 'Knochensteg', ['halloween'], ['bone', 'skull', 'grave', 'mist', 'rubble'], ['shelf', 'weapon_rack', 'forge', 'bed'], 4, 'monumental', P(5.2, -12.2), [P(-5.0, -6.0), P(-2.4, -3.0), P(0.5, -0.4), P(3.0, 2.1), P(5.0, 4.8), P(-4.2, 4.8)]),
  15: room(15, 'Ritualarena', 'Ritual Arena', 'ancient-ruins', 'arena', 'großer Altar', ['halloween', 'resources'], ['altar', 'rune', 'crystal', 'candle', 'shrine'], ['table', 'barrel', 'shelf', 'bed'], 3, 'monumental', P(0, -1.0), [P(-4.5, -4.3), P(0, -6.0), P(4.5, -4.3), P(-5.0, 1.5), P(5.0, 1.5), P(-3.5, 5.2), P(3.5, 5.2)]),

  16: room(16, 'Warden-Passage', 'Warden Passage', 'warden-veil', 'axial', 'monumentale Wächterstatue', ['halloween', 'resources'], ['statue', 'banner', 'spear', 'gate', 'sigil'], ['barrel', 'bed', 'workbench', 'pallet'], 3, 'veil', P(0, -13.7), [P(-3.4, -7.0), P(0, -6.2), P(3.4, -7.0), P(-3.4, -1.5), P(0, -0.5), P(3.4, -1.5), P(0, 4.2)]),
  17: room(17, 'Eingestürztes Gewölbe', 'Collapsed Vault', 'warden-veil', 'diagonal', 'gebrochener Bodenriss', ['halloween', 'resources'], ['rubble', 'crack', 'pillar', 'stone', 'crystal'], ['barrel', 'bed', 'workbench', 'shelf'], 4, 'veil', P(-5.0, -12.0), [P(4.7, -6.2), P(1.8, -3.2), P(-1.0, -0.6), P(-3.6, 2.3), P(3.5, 4.6), P(-4.7, 5.4)]),
  18: room(18, 'Veil-Riss', 'Veil Rift', 'warden-veil', 'orbit', 'großer Schleier-Riss', ['resources', 'halloween'], ['crystal', 'gem', 'rift', 'floating', 'rune'], ['barrel', 'workbench', 'bed', 'table'], 2, 'veil', P(0, -0.8), [P(-4.5, -4.0), P(0, -5.6), P(4.5, -4.0), P(-5.3, 0.8), P(5.3, 0.8), P(-3.7, 4.8), P(0, 5.8), P(3.7, 4.8)]),
  19: room(19, 'Vorhalle des Wächters', 'Warden Antechamber', 'warden-veil', 'axial', 'großes Wardentor und zwei Statuen', ['halloween', 'resources'], ['gate', 'statue', 'banner', 'sigil', 'stone'], ['barrel', 'bed', 'workbench', 'crate'], 2, 'veil', P(0, -13.7), [P(-4.2, -7.0), P(0, -6.3), P(4.2, -7.0), P(-3.8, -1.6), P(0, -0.8), P(3.8, -1.6), P(0, 4.0)]),
  20: room(20, 'Kapitelboss-Arena', 'Chapter Boss Arena', 'warden-veil', 'arena', 'Bosskern und vier Phasenanker', ['halloween', 'resources'], ['boss', 'anchor', 'rune', 'statue', 'crystal'], ['crate', 'barrel', 'table', 'bed'], 1, 'veil', P(0, -0.5), [P(0, -3.2)]),
};

for (const blueprint of EXPANDED_ROOM_BLUEPRINTS) {
  ROOM_BIBLE[blueprint.room] = room(
    blueprint.room, blueprint.nameDe, blueprint.nameEn, blueprint.phase, blueprint.silhouette, blueprint.heroObject,
    [...blueprint.packs], [...blueprint.keywords], [...blueprint.forbiddenKeywords], blueprint.density, blueprint.shell,
    { ...blueprint.portal }, blueprint.enemySpawns.map(point => ({ ...point })),
  );
}

const RESOLVED_ROOM_SPECS = new Map<number, RoomBibleSpec>();

const SPAWN_GRID_X = [-4.2, -2.1, 0, 2.1, 4.2] as const;
const SPAWN_GRID_Z = [-6.4, -4.1, -1.8, 0.7, 3.1, 5.3] as const;

function resolvedEnemySpawns(roomNumber: number, spec: RoomBibleSpec): RoomBiblePoint[] {
  if (roomNumber % 10 === 0) {
    return spec.enemySpawns.slice(0, 1).map(point => ({ ...point }));
  }

  const blockers = logicalRoomSetpieces(roomNumber)
    .filter(piece => piece.collider)
    .map(piece => {
      const collider = piece.collider!;
      const scale = (piece.scale ?? 1) * 0.9;
      const width = collider[0] * scale;
      const height = collider[1] * scale;
      const angle = piece.rotation ?? 0;
      const cos = Math.abs(Math.cos(angle));
      const sin = Math.abs(Math.sin(angle));

      return {
        x: piece.x,
        z: piece.z,
        halfW: (width * cos + height * sin) / 2,
        halfH: (width * sin + height * cos) / 2,
      };
    });

  const portal = {
    x: spec.portal.x,
    z: spec.portal.z < -8 ? -8.5 : spec.portal.z,
  };

  const selected: RoomBiblePoint[] = [];

  const valid = (point: RoomBiblePoint) => {
    if (Math.abs(point.x) > 4.25 || point.z < -6.6 || point.z > 5.5) return false;
    if (Math.hypot(point.x - portal.x, point.z - portal.z) <= 3.1) return false;

    const blocked = blockers.some(blocker =>
      Math.abs(point.x - blocker.x) < blocker.halfW + 0.42 &&
      Math.abs(point.z - blocker.z) < blocker.halfH + 0.42
    );
    if (blocked) return false;

    return selected.every(existing =>
      Math.hypot(point.x - existing.x, point.z - existing.z) >= 1.55
    );
  };

  const add = (point: RoomBiblePoint) => {
    if (valid(point)) selected.push({ ...point });
  };

  spec.enemySpawns.forEach(add);

  for (const z of SPAWN_GRID_Z) {
    for (const x of SPAWN_GRID_X) {
      if (selected.length >= 8) break;
      add({ x, z });
    }
    if (selected.length >= 8) break;
  }

  if (selected.length < 8) {
    throw new Error(
      'Raum ' + roomNumber + ' besitzt nur ' + selected.length +
      ' sichere Gegner-Spawnpunkte.'
    );
  }

  return selected.slice(0, 8);
}

export function roomBibleSpec(roomNumber: number): RoomBibleSpec {
  const safeRoom = Math.max(1, Math.min(50, roomNumber));
  const cached = RESOLVED_ROOM_SPECS.get(safeRoom);
  if (cached) return cached;

  const base = ROOM_BIBLE[safeRoom] ?? ROOM_BIBLE[1];
  const resolved: RoomBibleSpec = {
    ...base,
    portal: { ...base.portal },
    enemySpawns: resolvedEnemySpawns(safeRoom, base),
  };

  RESOLVED_ROOM_SPECS.set(safeRoom, resolved);
  return resolved;
}

export function roomPortalTile(roomNumber: number, mapWidth = 24, mapHeight = 32) {
  const point = roomBibleSpec(roomNumber).portal;
  return {
    x: Math.max(2, Math.min(mapWidth - 3, Math.round(point.x + mapWidth / 2 - 0.5))),
    y: Math.max(2, Math.min(mapHeight - 3, Math.round(point.z + mapHeight / 2 - 0.5))),
  };
}
