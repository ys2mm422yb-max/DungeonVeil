import {
  createGuildRaidMutationKey,
  mutateGuildRaidRunState,
  type GuildRaidRunSnapshot,
} from './guildRaidRunOnline';

export type GuildRaidRoomId = 1 | 2 | 3 | 4 | 5;
export type GuildRaidRoomAction =
  | { type: 'anchor'; slot: number; active: boolean }
  | { type: 'line'; slot: number; line: 'left' | 'right' | null }
  | { type: 'interrupt'; slot: number; channelId: string }
  | { type: 'burden-pass'; fromSlot: number; toSlot: number }
  | { type: 'cleanse'; slot: number; zoneId: string; active: boolean }
  | { type: 'seal'; slot: number; seal: number };

export type GuildRaidRoomMechanicState = {
  room: GuildRaidRoomId;
  phase: 'active' | 'cleared';
  revision: number;
  anchors?: Record<string, boolean>;
  anchorProgress?: number;
  lines?: Record<string, 'left' | 'right' | null>;
  interruptedChannels?: string[];
  missedChannels?: number;
  burdenCarrier?: number;
  burdenStacks?: number;
  burdenPasses?: number;
  cleanseZones?: Record<string, number[]>;
  cleansedZones?: string[];
  sealSequence?: number[];
  sealStep?: number;
  mistakes?: number;
};

export const GUILD_RAID_ROOM_DEFINITIONS = [
  { room: 1, key: 'veil-anchors', titleDe: 'Schleieranker', titleEn: 'Veil Anchors', objectiveDe: 'Alle vier Anker gleichzeitig halten.', objectiveEn: 'Hold all four anchors at once.' },
  { room: 2, key: 'split-guard-lines', titleDe: 'Geteilte Schutzlinien', titleEn: 'Split Guard Lines', objectiveDe: 'Zwei Linien halten und Elitekanäle unterbrechen.', objectiveEn: 'Hold both lines and interrupt elite channels.' },
  { room: 3, key: 'veil-burden', titleDe: 'Schleierlast', titleEn: 'Veil Burden', objectiveDe: 'Die Last vor fünf Stapeln sicher weitergeben.', objectiveEn: 'Pass the burden before five stacks.' },
  { room: 4, key: 'cleansing-circle', titleDe: 'Reinigungskreis', titleEn: 'Cleansing Circle', objectiveDe: 'Alle Zonen gemeinsam reinigen.', objectiveEn: 'Cleanse every zone together.' },
  { room: 5, key: 'four-seals', titleDe: 'Vier Siegel', titleEn: 'Four Seals', objectiveDe: 'Die vier Siegel in der Serverreihenfolge aktivieren.', objectiveEn: 'Activate all four seals in server order.' },
] as const;

const isSlot = (slot: number) => Number.isInteger(slot) && slot >= 1 && slot <= 4;
const unique = <T,>(values: T[]) => Array.from(new Set(values));

export function initialGuildRaidRoomState(room: GuildRaidRoomId): GuildRaidRoomMechanicState {
  if (room === 1) return { room, phase: 'active', revision: 0, anchors: { '1': false, '2': false, '3': false, '4': false }, anchorProgress: 0 };
  if (room === 2) return { room, phase: 'active', revision: 0, lines: { '1': null, '2': null, '3': null, '4': null }, interruptedChannels: [], missedChannels: 0 };
  if (room === 3) return { room, phase: 'active', revision: 0, burdenCarrier: 1, burdenStacks: 0, burdenPasses: 0 };
  if (room === 4) return { room, phase: 'active', revision: 0, cleanseZones: { north: [], south: [], east: [] }, cleansedZones: [] };
  return { room, phase: 'active', revision: 0, sealSequence: [2, 4, 1, 3], sealStep: 0, mistakes: 0 };
}

export function normalizeGuildRaidRoomState(room: GuildRaidRoomId, raw: Record<string, unknown>): GuildRaidRoomMechanicState {
  const base = initialGuildRaidRoomState(room);
  return { ...base, ...raw, room, revision: Math.max(0, Number(raw.revision ?? 0) || 0), phase: raw.phase === 'cleared' ? 'cleared' : 'active' } as GuildRaidRoomMechanicState;
}

export function reduceGuildRaidRoomAction(state: GuildRaidRoomMechanicState, action: GuildRaidRoomAction): GuildRaidRoomMechanicState {
  if (state.phase === 'cleared') return state;
  if ('slot' in action && !isSlot(action.slot)) throw new Error('Ungültiger Raid-Slot.');
  let next = { ...state, revision: state.revision + 1 };

  if (state.room === 1 && action.type === 'anchor') {
    const anchors = { ...state.anchors, [String(action.slot)]: action.active };
    const active = Object.values(anchors).filter(Boolean).length;
    const anchorProgress = active === 4 ? Math.min(100, (state.anchorProgress ?? 0) + 25) : Math.max(0, (state.anchorProgress ?? 0) - 10);
    next = { ...next, anchors, anchorProgress, phase: anchorProgress >= 100 ? 'cleared' : 'active' };
  } else if (state.room === 2 && action.type === 'line') {
    next = { ...next, lines: { ...state.lines, [String(action.slot)]: action.line } };
  } else if (state.room === 2 && action.type === 'interrupt') {
    const interruptedChannels = unique([...(state.interruptedChannels ?? []), action.channelId]);
    const held = Object.values(state.lines ?? {}).filter(Boolean);
    next = { ...next, interruptedChannels, phase: new Set(held).size === 2 && interruptedChannels.length >= 4 ? 'cleared' : 'active' };
  } else if (state.room === 3 && action.type === 'burden-pass') {
    if (state.burdenCarrier !== action.fromSlot || !isSlot(action.toSlot) || action.fromSlot === action.toSlot) throw new Error('Ungültige Schleierlast-Übergabe.');
    next = { ...next, burdenCarrier: action.toSlot, burdenStacks: 0, burdenPasses: (state.burdenPasses ?? 0) + 1, phase: (state.burdenPasses ?? 0) + 1 >= 8 ? 'cleared' : 'active' };
  } else if (state.room === 4 && action.type === 'cleanse') {
    const zones = { ...state.cleanseZones };
    const slots = new Set(zones[action.zoneId] ?? []);
    action.active ? slots.add(action.slot) : slots.delete(action.slot);
    zones[action.zoneId] = Array.from(slots).sort();
    const cleansedZones = unique([...(state.cleansedZones ?? []), ...(slots.size >= 2 ? [action.zoneId] : [])]);
    next = { ...next, cleanseZones: zones, cleansedZones, phase: cleansedZones.length >= 3 ? 'cleared' : 'active' };
  } else if (state.room === 5 && action.type === 'seal') {
    const expected = state.sealSequence?.[state.sealStep ?? 0];
    if (action.seal === expected) {
      const sealStep = (state.sealStep ?? 0) + 1;
      next = { ...next, sealStep, phase: sealStep >= 4 ? 'cleared' : 'active' };
    } else {
      next = { ...next, sealStep: 0, mistakes: (state.mistakes ?? 0) + 1 };
    }
  } else {
    throw new Error('Aktion passt nicht zum aktiven Raid-Raum.');
  }
  return next;
}

export async function submitGuildRaidRoomAction(
  snapshot: GuildRaidRunSnapshot,
  action: GuildRaidRoomAction,
  idempotencyKey = createGuildRaidMutationKey(),
): Promise<GuildRaidRunSnapshot> {
  const room = snapshot.currentRoom as GuildRaidRoomId;
  if (room < 1 || room > 5) throw new Error('Block 12 unterstützt nur Raid-Räume 1–5.');
  const current = normalizeGuildRaidRoomState(room, snapshot.roomState?.mechanicState ?? {});
  const next = reduceGuildRaidRoomAction(current, action);
  return mutateGuildRaidRunState(snapshot.raidRunId, snapshot.stateVersion, {
    roomMechanicPatch: { block12: next },
    playerState: { mechanicState: { lastRoomAction: action.type, roomRevision: next.revision } },
  }, idempotencyKey);
}
