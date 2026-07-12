import {
  currentOnlineSession,
  getMyGuildMembership,
} from './supabaseOnline';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? 'https://hfndwqfghyomwapqsked.supabase.co').replace(/\/$/, '');
const SUPABASE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_VwgnYfa8ucXKkJWnz6ObYg_cNCdMYDa');

function payloadMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const value = payload as Record<string, unknown>;
  for (const key of ['message', 'error_description', 'msg', 'error']) {
    if (typeof value[key] === 'string' && value[key]) return String(value[key]);
  }
  return fallback;
}

async function parsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { message: text }; }
}

async function guildRpc<T>(name: string, body: Record<string, unknown> = {}): Promise<T> {
  // This call also refreshes an expiring Supabase session through the shared online layer.
  await getMyGuildMembership();
  const session = currentOnlineSession();
  if (!session) throw new Error('Nicht angemeldet');

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${session.access_token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await parsePayload(response);
  if (!response.ok) throw new Error(payloadMessage(payload, `Gildenaktion fehlgeschlagen (${response.status})`));
  return payload as T;
}

export type LeaveGuildResult = {
  guild_id: string;
  disbanded: boolean;
};

export async function leaveGuildOnline(): Promise<LeaveGuildResult> {
  return guildRpc<LeaveGuildResult>('leave_guild');
}

export async function transferGuildOwnershipOnline(guildId: string, newOwnerId: string): Promise<void> {
  await guildRpc<null>('transfer_guild_ownership', {
    p_guild_id: guildId,
    p_new_owner_id: newOwnerId,
  });
}
