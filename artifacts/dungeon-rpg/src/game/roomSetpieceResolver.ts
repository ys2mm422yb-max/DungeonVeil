import { logicalRoomSetpieces, type LogicalRoomSetpiece } from './logicalRoomSetpieces';

export type { LogicalRoomSetpiece } from './logicalRoomSetpieces';

export function resolvedRoomSetpieces(room: number): LogicalRoomSetpiece[] {
  const safeRoom = Math.max(1, Math.min(90, Math.floor(room)));
  return logicalRoomSetpieces(safeRoom).map(piece => ({ ...piece }));
}
