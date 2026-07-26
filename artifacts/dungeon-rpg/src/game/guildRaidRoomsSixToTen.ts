import {
  createGuildRaidMutationKey,
  mutateGuildRaidRunState,
  type GuildRaidRunSnapshot,
} from './guildRaidRunOnline';

export type GuildRaidAdvancedRoomId = 6 | 7 | 8 | 9 | 10;
export type GuildRaidAdvancedRoomAction =
  | { type: 'mirror'; slot: number; stance: 'sun' | 'moon' }
  | { type: 'relay'; fromSlot: number; toSlot: number }
  | { type: 'mark'; slot: number; targetRevision: number }
  | { type: 'strike'; slot: number; targetRevision: number }
  | { type: 'stabilize'; slot: number; pulse: number }
  | { type: 'gate-role'; slot: number; role: 'warden' | 'runner' | 'breaker' | 'binder' }
  | { type: 'gate-rune'; slot: number; rune: number }
  | { type: 'gate-channel'; slot: number; active: boolean };

export type GuildRaidAdvancedRoomState = {
  room: GuildRaidAdvancedRoomId;
  phase: 'active' | 'cleared';
  revision: number;
  mirrorStances?: Record<string, 'sun' | 'moon' | null>;
  mirrorRounds?: number;
  relayCarrier?: number;
  relayStep?: number;
  relayMistakes?: number;
  shadowTargetRevision?: number;
  shadowMarks?: number[];
  shadowStrikes?: number[];
  sharedStability?: number;
  lastPulse?: number;
  pulseContributors?: number[];
  gateRoles?: Record<string, string>;
  gateRuneSequence?: number[];
  gateRuneStep?: number;
  gateChannels?: Record<string, boolean>;
  bossHandoffReady?: boolean;
};

export const GUILD_RAID_ADVANCED_ROOM_DEFINITIONS = [
  { room: 6, key: 'mirror-pairs', titleDe: 'Spiegelpaare', titleEn: 'Mirror Pairs', objectiveDe: 'Zwei Paare bestätigen dieselbe Haltung.', objectiveEn: 'Two pairs confirm matching stances.' },
  { room: 7, key: 'rune-relay', titleDe: 'Runenstaffel', titleEn: 'Rune Relay', objectiveDe: 'Gebt die Rune in der bestätigten Reihenfolge weiter.', objectiveEn: 'Pass the rune in the confirmed order.' },
  { room: 8, key: 'shadow-hunt', titleDe: 'Schattenjagd', titleEn: 'Shadow Hunt', objectiveDe: 'Markiert und trefft dieselbe Zielrevision.', objectiveEn: 'Mark and strike the same target revision.' },
  { room: 9, key: 'shared-breath', titleDe: 'Geteilter Atem', titleEn: 'Shared Breath', objectiveDe: 'Stabilisiert den gemeinsamen Vorrat ohne Impuls-Spam.', objectiveEn: 'Stabilize the shared pool without pulse spam.' },
  { room: 10, key: 'raid-gate', titleDe: 'Tor des Raid-Bosses', titleEn: 'Raid Boss Gate', objectiveDe: 'Rollen, Runen und vier Kanäle synchronisieren.', objectiveEn: 'Synchronize roles, runes and four channels.' },
] as const;

const validSlot = (slot: number) => Number.isInteger(slot) && slot >= 1 && slot <= 4;
const uniq = (values: number[]) => Array.from(new Set(values)).sort((a, b) => a - b);

export function initialGuildRaidAdvancedRoomState(room: GuildRaidAdvancedRoomId): GuildRaidAdvancedRoomState {
  if (room === 6) return { room, phase: 'active', revision: 0, mirrorStances: { '1': null, '2': null, '3': null, '4': null }, mirrorRounds: 0 };
  if (room === 7) return { room, phase: 'active', revision: 0, relayCarrier: 1, relayStep: 0, relayMistakes: 0 };
  if (room === 8) return { room, phase: 'active', revision: 0, shadowTargetRevision: 1, shadowMarks: [], shadowStrikes: [] };
  if (room === 9) return { room, phase: 'active', revision: 0, sharedStability: 0, lastPulse: 1, pulseContributors: [] };
  return { room, phase: 'active', revision: 0, gateRoles: {}, gateRuneSequence: [3, 1, 4, 2], gateRuneStep: 0, gateChannels: { '1': false, '2': false, '3': false, '4': false }, bossHandoffReady: false };
}

export function normalizeGuildRaidAdvancedRoomState(room: GuildRaidAdvancedRoomId, raw: Record<string, unknown>): GuildRaidAdvancedRoomState {
  return { ...initialGuildRaidAdvancedRoomState(room), ...raw, room, revision: Math.max(0, Number(raw.revision ?? 0) || 0), phase: raw.phase === 'cleared' ? 'cleared' : 'active' } as GuildRaidAdvancedRoomState;
}

export function reduceGuildRaidAdvancedRoomAction(state: GuildRaidAdvancedRoomState, action: GuildRaidAdvancedRoomAction): GuildRaidAdvancedRoomState {
  if (state.phase === 'cleared') return state;
  if ('slot' in action && !validSlot(action.slot)) throw new Error('Ungültiger Raid-Slot.');
  let next: GuildRaidAdvancedRoomState = { ...state, revision: state.revision + 1 };

  if (state.room === 6 && action.type === 'mirror') {
    const stances = { ...state.mirrorStances, [String(action.slot)]: action.stance };
    const pairA = Boolean(stances['1'] && stances['1'] === stances['2']);
    const pairB = Boolean(stances['3'] && stances['3'] === stances['4']);
    const rounds = pairA && pairB ? (state.mirrorRounds ?? 0) + 1 : state.mirrorRounds ?? 0;
    next = { ...next, mirrorStances: pairA && pairB ? { '1': null, '2': null, '3': null, '4': null } : stances, mirrorRounds: rounds, phase: rounds >= 3 ? 'cleared' : 'active' };
  } else if (state.room === 7 && action.type === 'relay') {
    const expected = ((state.relayCarrier ?? 1) % 4) + 1;
    if (action.fromSlot !== state.relayCarrier || action.toSlot !== expected) {
      next = { ...next, relayMistakes: (state.relayMistakes ?? 0) + 1 };
    } else {
      const step = (state.relayStep ?? 0) + 1;
      next = { ...next, relayCarrier: action.toSlot, relayStep: step, phase: step >= 8 ? 'cleared' : 'active' };
    }
  } else if (state.room === 8 && action.type === 'mark') {
    if (action.targetRevision !== state.shadowTargetRevision) throw new Error('Veraltete Schattenmarkierung.');
    next = { ...next, shadowMarks: uniq([...(state.shadowMarks ?? []), action.slot]) };
  } else if (state.room === 8 && action.type === 'strike') {
    if (action.targetRevision !== state.shadowTargetRevision || (state.shadowMarks?.length ?? 0) < 2) throw new Error('Schattenziel ist nicht gültig markiert.');
    const strikes = uniq([...(state.shadowStrikes ?? []), action.slot]);
    if (strikes.length >= 2) {
      const targetRevision = (state.shadowTargetRevision ?? 1) + 1;
      next = { ...next, shadowTargetRevision: targetRevision, shadowMarks: [], shadowStrikes: [], phase: targetRevision > 4 ? 'cleared' : 'active' };
    } else next = { ...next, shadowStrikes: strikes };
  } else if (state.room === 9 && action.type === 'stabilize') {
    const lastPulse = state.lastPulse ?? 1;
    if (action.pulse < lastPulse) return state;
    const contributors = action.pulse === lastPulse
      ? uniq([...(state.pulseContributors ?? []), action.slot])
      : [action.slot];
    const previousCount = action.pulse === lastPulse ? (state.pulseContributors?.length ?? 0) : 0;
    const gained = contributors.length >= 2 && previousCount < 2 ? 20 : contributors.length === 1 && previousCount === 0 ? 5 : 0;
    const stability = Math.min(100, (state.sharedStability ?? 0) + gained);
    next = { ...next, lastPulse: action.pulse, pulseContributors: contributors, sharedStability: stability, phase: stability >= 100 ? 'cleared' : 'active' };
  } else if (state.room === 10 && action.type === 'gate-role') {
    const roles = { ...state.gateRoles };
    for (const [slot, role] of Object.entries(roles)) if (role === action.role && slot !== String(action.slot)) delete roles[slot];
    roles[String(action.slot)] = action.role;
    next = { ...next, gateRoles: roles, gateRuneStep: 0, gateChannels: { '1': false, '2': false, '3': false, '4': false }, bossHandoffReady: false };
  } else if (state.room === 10 && action.type === 'gate-rune') {
    if (new Set(Object.values(state.gateRoles ?? {})).size < 4) throw new Error('Alle vier unterschiedlichen Rollen müssen zuerst bestätigt sein.');
    const expected = state.gateRuneSequence?.[state.gateRuneStep ?? 0];
    next = action.rune === expected ? { ...next, gateRuneStep: (state.gateRuneStep ?? 0) + 1 } : { ...next, gateRuneStep: 0 };
  } else if (state.room === 10 && action.type === 'gate-channel') {
    if ((state.gateRuneStep ?? 0) < 4) throw new Error('Die Runenfolge ist noch nicht vollständig.');
    const channels = { ...state.gateChannels, [String(action.slot)]: action.active };
    const ready = Object.values(channels).filter(Boolean).length === 4;
    next = { ...next, gateChannels: channels, bossHandoffReady: ready, phase: ready ? 'cleared' : 'active' };
  } else throw new Error('Aktion passt nicht zum aktiven Raid-Raum.');

  return next;
}

export async function submitGuildRaidAdvancedRoomAction(
  snapshot: GuildRaidRunSnapshot,
  action: GuildRaidAdvancedRoomAction,
  idempotencyKey = createGuildRaidMutationKey(),
): Promise<GuildRaidRunSnapshot> {
  const room = snapshot.currentRoom as GuildRaidAdvancedRoomId;
  if (room < 6 || room > 10) throw new Error('Block 13 unterstützt nur Raid-Räume 6–10.');
  const current = normalizeGuildRaidAdvancedRoomState(room, (snapshot.roomState?.mechanicState?.block13 as Record<string, unknown>) ?? {});
  const next = reduceGuildRaidAdvancedRoomAction(current, action);
  return mutateGuildRaidRunState(snapshot.raidRunId, snapshot.stateVersion, {
    roomMechanicPatch: { block13: next },
    playerState: { mechanicState: { lastRoomAction: action.type, roomRevision: next.revision } },
  }, idempotencyKey);
}