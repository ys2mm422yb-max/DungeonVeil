export type RoomComposition = {
  focus: { x: number; z: number; color: number; intensity: number; range: number };
  secondary?: { x: number; z: number; color: number; intensity: number; range: number };
  shadow?: { x: number; z: number };
};

/**
 * Authored visual hierarchy for chapter one. These anchors follow the room story:
 * the main light marks what the room was built for, the secondary light connects the next functional zone.
 */
export const ROOM_COMPOSITIONS: Record<number, RoomComposition> = {
  1: { focus: { x: -2.0, z: -2.8, color: 0xffb15c, intensity: 3.0, range: 8.5 }, secondary: { x: 5.9, z: -5.3, color: 0xd5914e, intensity: 1.8, range: 6.2 }, shadow: { x: -7.2, z: 4.8 } },
  2: { focus: { x: -1.8, z: -4.0, color: 0xffc06c, intensity: 3.3, range: 8.0 }, secondary: { x: 5.8, z: -5.0, color: 0xd89955, intensity: 1.5, range: 5.2 }, shadow: { x: 5.5, z: 4.2 } },
  3: { focus: { x: 0.4, z: -6.5, color: 0xd4b080, intensity: 2.8, range: 9.5 }, secondary: { x: -5.5, z: 3.8, color: 0x8a796b, intensity: 1.2, range: 5.4 }, shadow: { x: -5.8, z: 4.2 } },
  4: { focus: { x: 1.8, z: -0.8, color: 0xe3a25d, intensity: 2.7, range: 8.6 }, secondary: { x: -5.7, z: -5.0, color: 0xffb35f, intensity: 2.1, range: 6.2 }, shadow: { x: 6.4, z: 5.0 } },
  5: { focus: { x: -3.7, z: -4.4, color: 0xf0b56c, intensity: 3.0, range: 8.0 }, secondary: { x: 4.8, z: -0.7, color: 0xc98b55, intensity: 1.7, range: 5.5 }, shadow: { x: 6.0, z: 5.0 } },
  6: { focus: { x: -5.2, z: -4.8, color: 0xff6b2f, intensity: 4.2, range: 9.6 }, secondary: { x: 4.8, z: -1.0, color: 0xffa44f, intensity: 2.3, range: 6.4 }, shadow: { x: 3.6, z: 5.5 } },
  7: { focus: { x: 0, z: 0.8, color: 0xe9b879, intensity: 2.4, range: 8.0 }, secondary: { x: -5.8, z: -5.5, color: 0xc08a59, intensity: 1.3, range: 5.2 }, shadow: { x: 5.5, z: 4.5 } },
  8: { focus: { x: 0.8, z: -1.0, color: 0xe0a65d, intensity: 2.6, range: 8.5 }, secondary: { x: 5.0, z: 4.6, color: 0xb9824b, intensity: 1.5, range: 5.5 }, shadow: { x: -5.2, z: 3.4 } },
  9: { focus: { x: 0.2, z: -5.6, color: 0x8d67ff, intensity: 4.5, range: 11.5 }, secondary: { x: 0, z: 2.6, color: 0xc7a1ff, intensity: 1.8, range: 6.0 }, shadow: { x: -5.2, z: 0.5 } },
  10: { focus: { x: 0, z: -6.2, color: 0xa883ff, intensity: 4.0, range: 12.0 }, secondary: { x: -4.8, z: -1.8, color: 0xc6a47b, intensity: 1.7, range: 6.4 }, shadow: { x: 6.0, z: 3.5 } },
  11: { focus: { x: 4.8, z: -1.2, color: 0x83bd6a, intensity: 3.0, range: 9.4 }, secondary: { x: -4.8, z: -5.0, color: 0xd2a571, intensity: 1.5, range: 5.5 }, shadow: { x: 6.0, z: 2.5 } },
  12: { focus: { x: -0.8, z: -2.0, color: 0xba5e77, intensity: 3.3, range: 9.0 }, secondary: { x: -6.4, z: -5.0, color: 0x8e4d62, intensity: 1.7, range: 6.2 }, shadow: { x: 5.8, z: 3.2 } },
  13: { focus: { x: 0, z: 0.4, color: 0x8068ff, intensity: 4.0, range: 10.5 }, secondary: { x: -5.0, z: -4.5, color: 0xb29cff, intensity: 1.7, range: 5.8 }, shadow: { x: -4.5, z: 5.0 } },
  14: { focus: { x: -1.2, z: 0.6, color: 0x7fb266, intensity: 3.1, range: 9.8 }, secondary: { x: 4.5, z: 4.0, color: 0x557b4b, intensity: 1.5, range: 5.8 }, shadow: { x: -5.5, z: -4.2 } },
  15: { focus: { x: 0, z: -5.5, color: 0x8b65ff, intensity: 4.8, range: 12.5 }, secondary: { x: 2.8, z: 1.2, color: 0xb291ff, intensity: 1.8, range: 6.3 }, shadow: { x: -5.6, z: 2.8 } },
  16: { focus: { x: -5.0, z: -4.4, color: 0xd96b58, intensity: 3.4, range: 8.8 }, secondary: { x: 4.6, z: -1.0, color: 0x9a6cff, intensity: 2.0, range: 6.2 }, shadow: { x: 6.0, z: 4.5 } },
  17: { focus: { x: 0.5, z: -6.0, color: 0xc3a079, intensity: 3.1, range: 10.5 }, secondary: { x: -5.8, z: -2.8, color: 0x8a7569, intensity: 1.5, range: 6.0 }, shadow: { x: 5.8, z: 2.0 } },
  18: { focus: { x: 0, z: 1.2, color: 0xaf68ff, intensity: 4.2, range: 10.8 }, secondary: { x: -5.3, z: -4.6, color: 0xff7440, intensity: 2.8, range: 7.0 }, shadow: { x: 5.8, z: 4.6 } },
  19: { focus: { x: 0.7, z: -5.4, color: 0x8a5cff, intensity: 4.8, range: 12.2 }, secondary: { x: -3.7, z: -0.8, color: 0x713f9d, intensity: 1.8, range: 6.5 }, shadow: { x: -5.6, z: 2.6 } },
  20: { focus: { x: 0, z: -6.2, color: 0x9a79ff, intensity: 5.2, range: 14.0 }, secondary: { x: -4.8, z: 0.8, color: 0xd0a473, intensity: 2.0, range: 7.0 }, shadow: { x: 6.0, z: 1.8 } },
};

export function roomComposition(room: number): RoomComposition {
  return ROOM_COMPOSITIONS[Math.max(1, Math.min(20, room))] ?? ROOM_COMPOSITIONS[1];
}
