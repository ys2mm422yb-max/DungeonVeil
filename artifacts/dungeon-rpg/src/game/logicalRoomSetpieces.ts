import { logicalRoomSetpieces as legacyLogicalRoomSetpieces, type LogicalRoomSetpiece } from './logicalRoomSetpiecesLegacy';
import { shatteredObservatorySetpieces } from './shatteredObservatorySetpieces';

export type { LogicalRoomSetpiece } from './logicalRoomSetpiecesLegacy';

export function logicalRoomSetpieces(room: number): LogicalRoomSetpiece[] {
  const safeRoom = Math.max(1, Math.min(70, Math.floor(room)));
  const observatory = shatteredObservatorySetpieces(safeRoom);
  if (observatory.length) return observatory.map(piece => ({ ...piece }));
  return legacyLogicalRoomSetpieces(safeRoom);
}
