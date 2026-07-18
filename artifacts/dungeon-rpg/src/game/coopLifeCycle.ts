import type { DuoRunContext } from './coopRunMode';

export const COOP_DOWNED_DURATION_MS = 20_000;
export const COOP_REVIVE_HOLD_MS = 3_000;
export const COOP_REVIVE_RANGE = 112;
export const COOP_REVIVE_HP_RATIO = 0.35;
export const COOP_ROOM_RESPAWN_HP_RATIO = 0.25;
export const COOP_MAX_REVIVES_PER_ROOM = 1;
export const COOP_REVIVE_INVULNERABLE_MS = 2_000;

export type CoopLifeState = 'alive' | 'downed' | 'fallen';

export type CoopReviveRequest = {
  version: 1;
  lobbyId: string;
  runSeed: number;
  userId: string;
  targetUserId: string;
  chapter: number;
  room: number;
  sequence: number;
  sentAt: number;
};

export type CoopReviveConfirm = CoopReviveRequest;

export type CoopTeamGameOverEvent = {
  version: 1;
  lobbyId: string;
  runSeed: number;
  userId: string;
  chapter: number;
  room: number;
  sequence: number;
  sentAt: number;
};

export type CoopTeamRetryEvent = CoopTeamGameOverEvent;
export type CoopRoomAdvanceRequest = CoopTeamGameOverEvent;

export type CoopReviveParticipant = {
  userId: string;
  chapter: number;
  room: number;
  x: number;
  y: number;
  lifeState: CoopLifeState;
  revivesUsed: number;
};

type ExpectedRun = Pick<DuoRunContext, 'lobbyId' | 'runSeed'>;

function finite(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeEnvelope(value: unknown, expected: ExpectedRun, localUserId: string) {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const lobbyId = String(raw.lobbyId ?? '');
  const runSeed = Math.floor(finite(raw.runSeed, -1));
  const userId = String(raw.userId ?? '');
  if (!lobbyId || lobbyId !== expected.lobbyId || runSeed !== expected.runSeed || !userId || userId === localUserId) return null;
  return {
    raw,
    lobbyId,
    runSeed,
    userId,
    chapter: Math.max(1, Math.floor(finite(raw.chapter, 1))),
    room: clamp(Math.floor(finite(raw.room, 1)), 1, 50),
    sequence: Math.max(0, Math.floor(finite(raw.sequence))),
    sentAt: Math.max(0, Math.floor(finite(raw.sentAt))),
  };
}

function normalizeTargetEvent(value: unknown, expected: ExpectedRun, localUserId: string) {
  const parsed = normalizeEnvelope(value, expected, localUserId);
  if (!parsed) return null;
  const targetUserId = String(parsed.raw.targetUserId ?? '');
  if (!targetUserId) return null;
  return {
    version: 1 as const,
    lobbyId: parsed.lobbyId,
    runSeed: parsed.runSeed,
    userId: parsed.userId,
    targetUserId,
    chapter: parsed.chapter,
    room: parsed.room,
    sequence: parsed.sequence,
    sentAt: parsed.sentAt,
  };
}

function normalizeRunEvent(value: unknown, expected: ExpectedRun, localUserId: string) {
  const parsed = normalizeEnvelope(value, expected, localUserId);
  if (!parsed) return null;
  return {
    version: 1 as const,
    lobbyId: parsed.lobbyId,
    runSeed: parsed.runSeed,
    userId: parsed.userId,
    chapter: parsed.chapter,
    room: parsed.room,
    sequence: parsed.sequence,
    sentAt: parsed.sentAt,
  };
}

export function normalizeCoopReviveRequest(value: unknown, expected: ExpectedRun, localUserId: string): CoopReviveRequest | null {
  return normalizeTargetEvent(value, expected, localUserId);
}

export function normalizeCoopReviveConfirm(value: unknown, expected: ExpectedRun, localUserId: string): CoopReviveConfirm | null {
  const event = normalizeTargetEvent(value, expected, localUserId);
  return event?.targetUserId === localUserId ? event : null;
}

export function normalizeCoopTeamGameOverEvent(value: unknown, expected: ExpectedRun, localUserId: string): CoopTeamGameOverEvent | null {
  return normalizeRunEvent(value, expected, localUserId);
}

export function normalizeCoopTeamRetryEvent(value: unknown, expected: ExpectedRun, localUserId: string): CoopTeamRetryEvent | null {
  return normalizeRunEvent(value, expected, localUserId);
}

export function normalizeCoopRoomAdvanceRequest(value: unknown, expected: ExpectedRun, localUserId: string): CoopRoomAdvanceRequest | null {
  return normalizeRunEvent(value, expected, localUserId);
}

export function coopReviveHp(maxHp: number): number {
  return Math.max(1, Math.ceil(maxHp * COOP_REVIVE_HP_RATIO));
}

export function coopRoomRespawnHp(maxHp: number): number {
  return Math.max(1, Math.ceil(maxHp * COOP_ROOM_RESPAWN_HP_RATIO));
}

export function coopDownedUntil(now = Date.now()): number {
  return now + COOP_DOWNED_DURATION_MS;
}

export function coopNextRoom(room: number, chapter: number) {
  return room >= 50 ? { room: 1, chapter: chapter + 1 } : { room: room + 1, chapter };
}

export function canCoopRevive(reviver: CoopReviveParticipant, target: CoopReviveParticipant): boolean {
  if (reviver.lifeState !== 'alive' || target.lifeState !== 'downed') return false;
  if (target.revivesUsed >= COOP_MAX_REVIVES_PER_ROOM) return false;
  if (reviver.chapter !== target.chapter || reviver.room !== target.room) return false;
  return Math.hypot(reviver.x - target.x, reviver.y - target.y) <= COOP_REVIVE_RANGE;
}

export function coopTeamIsDefeated(local: CoopLifeState, remote: CoopLifeState | null): boolean {
  return remote !== null && local !== 'alive' && remote !== 'alive';
}
