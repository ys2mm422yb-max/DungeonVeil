import type { GameEngine } from './runEngine';
import type { SaveData } from './saveManager';
import { authenticatedSupabaseRest, currentOnlineSession } from './supabaseOnline';

export const COOP_ROOM_CLEAR_EVENT = 'dungeon-veil-coop-room-clear';
export const COOP_RUN_RESTART_EVENT = 'dungeon-veil-coop-run-restart';
export const COOP_CHECKPOINT_MS = 5_000;

export type CoopRoomClearDetail = {
  chapter: number;
  room: number;
};

export type CoopCheckpointRecord = {
  run_attempt: number;
  snapshot: SaveData;
  chapter: number;
  room: number;
  authoritative_chapter: number;
  authoritative_room: number;
  authoritative_room_clear: boolean;
  revision: number;
  updated_at: string;
  used_host_fallback: boolean;
};

export type CoopCheckpointReceipt = {
  run_attempt: number;
  revision: number;
  updated_at: string;
};

export type CoopRoomRewardEntitlement = {
  entitlement_id: string;
  run_attempt: number;
  chapter: number;
  room: number;
  xp: number;
  dust: number;
  gold: number;
  created_at: string;
};

export type CoopRoomRewardState = {
  entitlement_id: string;
  claimed: boolean;
  claimed_at: string | null;
};

function requireOnline(): void {
  if (!currentOnlineSession()) throw new Error('Für den Duo-Fortschritt musst du angemeldet sein.');
}

async function rpcRows<T>(name: string, body: Record<string, unknown> = {}): Promise<T[]> {
  requireOnline();
  return authenticatedSupabaseRest<T[]>(`rpc/${name}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function createCoopCheckpoint(engine: GameEngine): SaveData {
  const state = engine.state;
  const player = state.player;
  return {
    saveVersion: 4,
    saveReason: 'duo-checkpoint',
    playerName: player.playerName,
    playerClass: 'archer',
    floor: state.floor,
    chapter: state.chapter,
    runSkills: { ...state.runSkills },
    level: player.level,
    xp: 0,
    hp: Math.max(0, player.hp),
    maxHp: player.maxHp,
    attack: player.attack,
    defense: player.defense,
    speed: player.speed,
    attackRange: player.attackRange,
    skillRange: player.skillRange,
    killCount: state.killCount,
    worldX: player.x,
    worldY: player.y,
    dungeonEntranceX: 0,
    dungeonEntranceY: 0,
    playerX: player.x,
    playerY: player.y,
    inDungeon: false,
    overworldMap: state.map,
    savedAt: Date.now(),
  };
}

export async function saveMyCoopRunCheckpoint(
  lobbyId: string,
  runSeed: number,
  engine: GameEngine,
  roomClear = engine.state.roomClearReady,
): Promise<CoopCheckpointReceipt> {
  const rows = await rpcRows<CoopCheckpointReceipt>('save_my_coop_run_checkpoint', {
    p_lobby_id: lobbyId,
    p_run_seed: runSeed,
    p_chapter: engine.state.chapter,
    p_room: engine.state.floor,
    p_room_clear: Boolean(roomClear),
    p_snapshot: createCoopCheckpoint(engine),
  });
  if (!rows[0]) throw new Error('Duo-Zwischenstand konnte nicht gespeichert werden.');
  return rows[0];
}

export async function getMyCoopRunCheckpoint(
  lobbyId: string,
  runSeed: number,
): Promise<CoopCheckpointRecord | null> {
  const rows = await rpcRows<CoopCheckpointRecord>('get_my_coop_run_checkpoint', {
    p_lobby_id: lobbyId,
    p_run_seed: runSeed,
  });
  return rows[0] ?? null;
}

export async function prepareCoopRoomRewards(
  lobbyId: string,
  runSeed: number,
  chapter: number,
  room: number,
): Promise<number> {
  const result = await authenticatedSupabaseRest<number>('rpc/prepare_coop_room_rewards', {
    method: 'POST',
    body: JSON.stringify({
      p_lobby_id: lobbyId,
      p_run_seed: runSeed,
      p_chapter: chapter,
      p_room: room,
    }),
  });
  return Math.max(0, Math.floor(Number(result) || 0));
}

export async function listMyPendingCoopRoomRewards(
  lobbyId: string,
  runSeed: number,
): Promise<CoopRoomRewardEntitlement[]> {
  return rpcRows<CoopRoomRewardEntitlement>('list_my_pending_coop_room_rewards', {
    p_lobby_id: lobbyId,
    p_run_seed: runSeed,
  });
}

export async function getMyCoopRoomRewardState(
  lobbyId: string,
  runSeed: number,
  chapter: number,
  room: number,
): Promise<CoopRoomRewardState | null> {
  const rows = await rpcRows<CoopRoomRewardState>('get_my_coop_room_reward_state', {
    p_lobby_id: lobbyId,
    p_run_seed: runSeed,
    p_chapter: chapter,
    p_room: room,
  });
  return rows[0] ?? null;
}

export async function acknowledgeCoopRoomReward(entitlementId: string): Promise<boolean> {
  return authenticatedSupabaseRest<boolean>('rpc/ack_coop_room_reward', {
    method: 'POST',
    body: JSON.stringify({ p_entitlement_id: entitlementId }),
  });
}

export async function restartCoopRunAttempt(): Promise<number> {
  const result = await authenticatedSupabaseRest<number>('rpc/restart_coop_run_attempt', {
    method: 'POST',
    body: '{}',
  });
  const attempt = Math.floor(Number(result) || 0);
  if (attempt < 2) throw new Error('Duo-Neustart konnte nicht vorbereitet werden.');
  return attempt;
}

export function dispatchCoopRoomClear(chapter: number, room: number): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<CoopRoomClearDetail>(COOP_ROOM_CLEAR_EVENT, {
    detail: {
      chapter: Math.max(1, Math.floor(Number(chapter) || 1)),
      room: Math.max(1, Math.min(50, Math.floor(Number(room) || 1))),
    },
  }));
}
