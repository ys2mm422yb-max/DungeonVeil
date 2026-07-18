import { authenticatedSupabaseRest, currentOnlineSession } from './supabaseOnline';
import type { CoopLobbyStatus, CoopRole } from './coopRunMode';

export const COOP_LOBBY_EVENT = 'dungeon-veil-coop-lobby-changed';
export const COOP_LOBBY_OPEN_EVENT = 'dungeon-veil-open-coop-lobby';
export const PENDING_COOP_INVITE_KEY = 'dungeon-veil-pending-coop-invite-v1';

export type CoopLobbySnapshot = {
  lobby_id: string;
  invite_code: string;
  status: CoopLobbyStatus;
  run_seed: number;
  role: CoopRole;
  ready: boolean;
  host_user_id: string;
  created_at: string;
  expires_at: string;
  started_at: string | null;
  server_now: string;
};

export type CoopLobbyMember = {
  user_id: string;
  role: CoopRole;
  ready: boolean;
  display_name: string;
  avatar_key: string | null;
  joined_at: string;
  last_seen_at: string;
};

export type CoopInviteCandidate = {
  user_id: string;
  display_name: string;
  avatar_key: string | null;
  relation: 'friend' | 'guild' | 'friend_guild';
  activity_state: 'menu' | 'run' | 'paused';
  last_active_at: string;
};

function emitLobbyChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(COOP_LOBBY_EVENT));
}

export function openCoopLobbyPanel(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(COOP_LOBBY_OPEN_EVENT));
}

function requireOnline(): void {
  if (!currentOnlineSession()) throw new Error('Für den Duo-Run musst du angemeldet sein.');
}

async function rpcRows<T>(name: string, body: Record<string, unknown> = {}): Promise<T[]> {
  requireOnline();
  return authenticatedSupabaseRest<T[]>(`rpc/${name}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function firstRow<T>(rows: T[], fallback: string): T {
  if (!rows[0]) throw new Error(fallback);
  return rows[0];
}

export function normalizeCoopInviteCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export function captureCoopInviteCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const code = normalizeCoopInviteCode(url.searchParams.get('coopInvite') ?? '');
  if (code.length !== 6) return null;
  try { localStorage.setItem(PENDING_COOP_INVITE_KEY, code); } catch {}
  url.searchParams.delete('coopInvite');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  emitLobbyChanged();
  return code;
}

export function pendingCoopInviteCode(): string {
  try { return normalizeCoopInviteCode(localStorage.getItem(PENDING_COOP_INVITE_KEY) ?? ''); }
  catch { return ''; }
}

export function clearPendingCoopInviteCode(): void {
  try { localStorage.removeItem(PENDING_COOP_INVITE_KEY); } catch {}
}

export function makeCoopInviteUrl(code: string): string {
  const url = new URL(typeof window !== 'undefined' ? window.location.href : 'https://ys2mm422yb-max.github.io/DungeonVeil/');
  url.search = '';
  url.hash = '';
  url.searchParams.set('coopInvite', normalizeCoopInviteCode(code));
  return url.toString();
}

export async function getMyCoopLobby(): Promise<CoopLobbySnapshot | null> {
  if (!currentOnlineSession()) return null;
  const rows = await rpcRows<CoopLobbySnapshot>('get_my_coop_lobby');
  return rows[0] ?? null;
}

export async function createCoopLobby(): Promise<CoopLobbySnapshot> {
  const lobby = firstRow(await rpcRows<CoopLobbySnapshot>('create_coop_lobby'), 'Duo-Lobby konnte nicht erstellt werden.');
  emitLobbyChanged();
  return lobby;
}

export async function joinCoopLobby(code: string): Promise<CoopLobbySnapshot> {
  const normalized = normalizeCoopInviteCode(code);
  if (normalized.length !== 6) throw new Error('Der Gruppencode muss sechs Zeichen haben.');
  const lobby = firstRow(await rpcRows<CoopLobbySnapshot>('join_coop_lobby', { p_invite_code: normalized }), 'Duo-Lobby konnte nicht betreten werden.');
  clearPendingCoopInviteCode();
  emitLobbyChanged();
  return lobby;
}

export async function setCoopLobbyReady(ready: boolean): Promise<CoopLobbySnapshot> {
  const lobby = firstRow(await rpcRows<CoopLobbySnapshot>('set_coop_lobby_ready', { p_ready: ready }), 'Bereitschaft konnte nicht gespeichert werden.');
  emitLobbyChanged();
  return lobby;
}

export async function startCoopLobby(): Promise<CoopLobbySnapshot> {
  const lobby = firstRow(await rpcRows<CoopLobbySnapshot>('start_coop_lobby'), 'Duo-Lauf konnte nicht gestartet werden.');
  emitLobbyChanged();
  return lobby;
}

export async function leaveCoopLobby(): Promise<boolean> {
  const result = await authenticatedSupabaseRest<boolean>('rpc/leave_coop_lobby', { method: 'POST', body: '{}' });
  clearPendingCoopInviteCode();
  emitLobbyChanged();
  return result;
}

export async function heartbeatCoopLobby(): Promise<boolean> {
  if (!currentOnlineSession()) return false;
  return authenticatedSupabaseRest<boolean>('rpc/heartbeat_coop_lobby', { method: 'POST', body: '{}' });
}

export async function listMyCoopLobbyMembers(): Promise<CoopLobbyMember[]> {
  if (!currentOnlineSession()) return [];
  return rpcRows<CoopLobbyMember>('list_my_coop_lobby_members');
}

export async function listCoopInviteCandidates(): Promise<CoopInviteCandidate[]> {
  if (!currentOnlineSession()) return [];
  return rpcRows<CoopInviteCandidate>('list_coop_invite_candidates');
}

export async function sendCoopLobbyInvite(targetUserId: string): Promise<boolean> {
  requireOnline();
  return authenticatedSupabaseRest<boolean>('rpc/send_coop_lobby_invite', {
    method: 'POST',
    body: JSON.stringify({ p_target_user_id: targetUserId }),
  });
}
