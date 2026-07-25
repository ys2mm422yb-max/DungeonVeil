import { cinderCrownSetpieces } from './cinderCrownSetpieces';
import { drownedReliquarySetpieces } from './drownedReliquarySetpieces';
import { logicalRoomSetpieces as legacyLogicalRoomSetpieces, type LogicalRoomSetpiece } from './logicalRoomSetpiecesLegacy';
import { shatteredObservatorySetpieces } from './shatteredObservatorySetpieces';

export type { LogicalRoomSetpiece } from './logicalRoomSetpiecesLegacy';

export function logicalRoomSetpieces(room: number): LogicalRoomSetpiece[] {
  const safeRoom = Math.max(1, Math.min(90, Math.floor(room)));
  const cinder = cinderCrownSetpieces(safeRoom);
  if (cinder.length) return cinder.map(piece => ({ ...piece }));
  const reliquary = drownedReliquarySetpieces(safeRoom);
  if (reliquary.length) return reliquary.map(piece => ({ ...piece }));
  const observatory = shatteredObservatorySetpieces(safeRoom);
  if (observatory.length) return observatory.map(piece => ({ ...piece }));
  return legacyLogicalRoomSetpieces(safeRoom);
}
