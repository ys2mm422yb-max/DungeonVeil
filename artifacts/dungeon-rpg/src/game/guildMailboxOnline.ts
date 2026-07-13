import {
  authenticatedSupabaseRest,
  currentOnlineSession,
  getMyGuildMembership,
  type OnlineSession,
} from './supabaseOnline';

export const PENDING_GUILD_INVITE_KEY = 'dungeon-veil-pending-guild-invite-v1';
export const MAILBOX_EVENT = 'dungeon-veil-mailbox-changed';

export type GuildInviteLinkResult = { token: string; expires_at: string };
export type ClaimedGuildInvite = {
  invite_id: string;
  guild_id: string;
  guild_name: string;
  guild_tag: string;
  expires_at: string;
};
export type MailboxMessage = {
  id: string;
  kind: 'guild_invite' | 'system' | 'notice' | 'reward';
  title: string;
  body: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  actioned_at: string | null;
  created_at: string;
  expires_at: string | null;
};

function emitMailboxChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(MAILBOX_EVENT));
}

async function refreshSessionIfNeeded(): Promise<OnlineSession> {
  let session = currentOnlineSession();
  if (!session) throw new Error('Nicht angemeldet');
  if (session.expires_at * 1000 <= Date.now() + 60_000) {
    await getMyGuildMembership();
    session = currentOnlineSession();
  }
  if (!session) throw new Error('Sitzung abgelaufen');
  return session;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  await refreshSessionIfNeeded();
  return authenticatedSupabaseRest<T>(path, init);
}

export function captureGuildInviteTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const token = url.searchParams.get('guildInvite')?.trim() ?? '';
  if (!token) return null;
  try { localStorage.setItem(PENDING_GUILD_INVITE_KEY, token); } catch {}
  url.searchParams.delete('guildInvite');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  emitMailboxChanged();
  return token;
}

export function hasPendingGuildInviteToken(): boolean {
  try { return Boolean(localStorage.getItem(PENDING_GUILD_INVITE_KEY)); }
  catch { return false; }
}

export function makeGuildInviteUrl(token: string): string {
  const url = new URL(typeof window !== 'undefined' ? window.location.href : 'https://ys2mm422yb-max.github.io/DungeonVeil/');
  url.search = '';
  url.hash = '';
  url.searchParams.set('guildInvite', token);
  return url.toString();
}

export async function createGuildInviteLinkOnline(guildId: string): Promise<GuildInviteLinkResult> {
  const rows = await request<GuildInviteLinkResult[]>('rpc/create_guild_invite_link', {
    method: 'POST',
    body: JSON.stringify({ p_guild_id: guildId, p_expires_hours: 168, p_max_uses: 25 }),
  });
  if (!rows[0]?.token) throw new Error('Einladungslink konnte nicht erstellt werden');
  return rows[0];
}

export async function claimPendingGuildInviteLink(): Promise<ClaimedGuildInvite | null> {
  let token = '';
  try { token = localStorage.getItem(PENDING_GUILD_INVITE_KEY)?.trim() ?? ''; } catch {}
  if (!token || !currentOnlineSession()) return null;
  const rows = await request<ClaimedGuildInvite[]>('rpc/claim_guild_invite_link', {
    method: 'POST',
    body: JSON.stringify({ p_token: token }),
  });
  try { localStorage.removeItem(PENDING_GUILD_INVITE_KEY); } catch {}
  emitMailboxChanged();
  return rows[0] ?? null;
}

export async function listMailboxMessages(): Promise<MailboxMessage[]> {
  if (!currentOnlineSession()) return [];
  return request<MailboxMessage[]>(
    'player_mailbox?select=id,kind,title,body,payload,read_at,actioned_at,created_at,expires_at&or=(expires_at.is.null,expires_at.gt.now())&order=created_at.desc&limit=60',
  );
}

export async function markMailboxRead(ids?: string[]): Promise<void> {
  if (!currentOnlineSession()) return;
  await request<number>('rpc/mark_mailbox_read', {
    method: 'POST',
    body: JSON.stringify({ p_ids: ids?.length ? ids : null }),
  });
  emitMailboxChanged();
}

export async function markMailboxActioned(mailId: string): Promise<void> {
  await request<null>('rpc/mark_mailbox_actioned', {
    method: 'POST',
    body: JSON.stringify({ p_mail_id: mailId }),
  });
  emitMailboxChanged();
}

export async function mailboxUnreadCount(): Promise<number> {
  if (!currentOnlineSession()) return hasPendingGuildInviteToken() ? 1 : 0;
  const messages = await listMailboxMessages();
  return messages.filter(message => !message.read_at).length + (hasPendingGuildInviteToken() ? 1 : 0);
}
