import { roomArchitecturePieces } from './roomArchitectureLayout';
import { roomSetpieces } from './roomSetpieceLayout';

type ColliderProfile = {
  width: number;
  depth: number;
  offsetX?: number;
  offsetZ?: number;
};

type RoomPiece = ReturnType<typeof roomArchitecturePieces>[number] | ReturnType<typeof roomSetpieces>[number];

function entityCenterToScene(value: number, size: number, mapTiles: number) {
  return (value + size / 2) / 40 - mapTiles / 2 + 0.5;
}

function modelKey(model: string) {
  return model.split('/').at(-1)?.toLowerCase().replace(/\.(?:gltf|glb)$/i, '') ?? model.toLowerCase();
}

const COLLIDER_PROFILES: Array<[RegExp, ColliderProfile]> = [
  [/rubble_large/, { width: 4.9, depth: 3.7 }],
  [/rock_.*large|rock_large/, { width: 4.4, depth: 3.5 }],
  [/rock_.*medium|rock_medium/, { width: 3, depth: 2.6 }],
  [/rock_/, { width: 2, depth: 1.8 }],
  [/wall_pillar/, { width: 1.65, depth: 1.65 }],
  [/pillar/, { width: 1.85, depth: 1.85 }],
  [/barrier_half/, { width: 3.2, depth: 1.2 }],
  [/fence_/, { width: 3, depth: 1.15 }],
  [/table_medium_long/, { width: 4.2, depth: 2.05 }],
  [/table_medium/, { width: 3.05, depth: 2 }],
  [/table_low/, { width: 2.8, depth: 1.95 }],
  [/table_small/, { width: 2.05, depth: 1.9 }],
  [/shelf_.*(?:large|big)/, { width: 1.75, depth: 3.45 }],
  [/shelf_.*small/, { width: 1.65, depth: 2 }],
  [/cabinet_medium/, { width: 1.8, depth: 2.15 }],
  [/cabinet_small/, { width: 1.55, depth: 1.65 }],
  [/bed_single/, { width: 2.05, depth: 3.55 }],
  [/bench/, { width: 1.65, depth: 3 }],
  [/chair_/, { width: 1.15, depth: 1.15 }],
  [/crypt/, { width: 3, depth: 2.45 }],
  [/coffin/, { width: 2.2, depth: 3.55 }],
  [/grave_|gravestone/, { width: 1.75, depth: 2.2 }],
  [/shrine_candles/, { width: 2.7, depth: 2.55 }],
  [/shrine/, { width: 2.3, depth: 2.25 }],
  [/anvil/, { width: 1.9, depth: 1.55 }],
  [/grindstone/, { width: 2.25, depth: 1.85 }],
  [/pallet_wood/, { width: 2.7, depth: 2 }],
  [/bars_stack_large/, { width: 2.75, depth: 2 }],
  [/bars_stack_medium/, { width: 2.25, depth: 1.65 }],
  [/bars_stack_small/, { width: 1.7, depth: 1.4 }],
  [/tree_dead/, { width: 2.1, depth: 2.1 }],
  [/bush_/, { width: 1.55, depth: 1.55 }],
];

function colliderProfileForModel(model: string): ColliderProfile | undefined {
  const key = modelKey(model);
  if (key.startsWith('floor_') || key.startsWith('path_') || key.startsWith('rug_') || key.startsWith('stairs_') || key === 'wall_arched') return undefined;
  return COLLIDER_PROFILES.find(([pattern]) => pattern.test(key))?.[1];
}

function combinedProfile(piece: RoomPiece): ColliderProfile | undefined {
  const inferred = colliderProfileForModel(piece.model);
  if (!piece.collider) return inferred;
  if (!inferred) return { width: piece.collider[0], depth: piece.collider[1] };
  return {
    width: Math.max(piece.collider[0], inferred.width),
    depth: Math.max(piece.collider[1], inferred.depth),
    offsetX: inferred.offsetX,
    offsetZ: inferred.offsetZ,
  };
}

function collidersForRoom(room: number) {
  return [...roomArchitecturePieces(room), ...roomSetpieces(room)]
    .map(piece => ({ piece, profile: combinedProfile(piece) }))
    .filter((entry): entry is { piece: RoomPiece; profile: ColliderProfile } => Boolean(entry.profile))
    .map(({ piece, profile }) => {
      const scale = piece.scale ?? 1;
      const rotation = piece.rotation ?? 0;
      const quarterTurn = Math.abs(Math.sin(rotation)) > 0.7;
      const width = (quarterTurn ? profile.depth : profile.width) * scale;
      const depth = (quarterTurn ? profile.width : profile.depth) * scale;
      const localOffsetX = (profile.offsetX ?? 0) * scale;
      const localOffsetZ = (profile.offsetZ ?? 0) * scale;
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const offsetX = localOffsetX * cos - localOffsetZ * sin;
      const offsetZ = localOffsetX * sin + localOffsetZ * cos;
      return {
        x: piece.x + offsetX,
        z: piece.z + offsetZ,
        halfW: width / 2,
        halfH: depth / 2,
      };
    });
}

const ROOM_COLLIDERS = new Map<number, ReturnType<typeof collidersForRoom>>();

function roomColliders(room: number) {
  const key = Math.max(1, Math.min(20, room));
  if (!ROOM_COLLIDERS.has(key)) ROOM_COLLIDERS.set(key, collidersForRoom(key));
  return ROOM_COLLIDERS.get(key)!;
}

export function collidesWithRoomProp(
  room: number,
  mapWidth: number,
  mapHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
  padding = 0.14,
) {
  const centerX = entityCenterToScene(x, width, mapWidth);
  const centerZ = entityCenterToScene(y, height, mapHeight);
  const halfW = width / 80 + padding;
  const halfH = height / 80 + padding;
  return roomColliders(room).some(collider =>
    Math.abs(centerX - collider.x) < halfW + collider.halfW
    && Math.abs(centerZ - collider.z) < halfH + collider.halfH,
  );
}

function segmentHitsAabb(x1: number, z1: number, x2: number, z2: number, cx: number, cz: number, halfW: number, halfH: number) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  let tMin = 0;
  let tMax = 1;
  const clip = (start: number, delta: number, min: number, max: number) => {
    if (Math.abs(delta) < 1e-6) return start >= min && start <= max;
    let t1 = (min - start) / delta;
    let t2 = (max - start) / delta;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    return tMin <= tMax;
  };
  return clip(x1, dx, cx - halfW, cx + halfW) && clip(z1, dz, cz - halfH, cz + halfH);
}

export function shotBlockedByRoomProp(
  room: number,
  mapWidth: number,
  mapHeight: number,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  padding = 0.05,
) {
  const x1 = fromX / 40 - mapWidth / 2 + 0.5;
  const z1 = fromY / 40 - mapHeight / 2 + 0.5;
  const x2 = toX / 40 - mapWidth / 2 + 0.5;
  const z2 = toY / 40 - mapHeight / 2 + 0.5;
  return roomColliders(room).some(collider => segmentHitsAabb(
    x1, z1, x2, z2,
    collider.x, collider.z,
    collider.halfW + padding,
    collider.halfH + padding,
  ));
}
