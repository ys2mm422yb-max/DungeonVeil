import { roomBibleSpec } from './roomBible';

/**
 * Converts the authored Room Bible exit into the visible in-room portal stage.
 * Top-wall exits are deliberately pulled forward so the isometric camera never
 * hides the portal behind the tall perimeter wall.
 */
export function roomPortalStage(room: number) {
  const authored = roomBibleSpec(room).portal;
  return {
    x: authored.x,
    z: authored.z < -8 ? -8.5 : authored.z,
  };
}
