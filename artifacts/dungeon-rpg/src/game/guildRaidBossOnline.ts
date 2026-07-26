import { currentOnlineSession } from './supabaseOnline';
import type { GuildRaidBossAction } from './guildRaidBoss';
import type { GuildRaidRunSnapshot } from './guildRaidRunOnline';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? 'https://hfndwqfghyomwapqsked.supabase.co').replace(/\/$/, '');
const SUPABASE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_VwgnYfa8ucXKkJWnz6ObYg_cNCdMYDa');

export type GuildRaidRewardClaim = {
  raidRunId: string;
  eligible: boolean;
  reason: string | null;
  gold: number;
  dust: number;
  rankXp: number;
  claimedAt: string;
};

function idempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
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
  const text = await response.text();
  let payload: unknown = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { message: text }; }
  if (!response.ok) {
    const row = payload && typeof payload === 'object' ? payload as Record<string, unknown> : null;
    throw new Error(typeof row?.message === 'string' ? row.message : `Raid-Boss-Anfrage fehlgeschlagen (${response.status})`);
  }
  return payload as T;
}

export async function submitAuthoritativeGuildRaidBossAction(
  snapshot: GuildRaidRunSnapshot,
  action: GuildRaidBossAction,
  key = idempotencyKey(),
): Promise<GuildRaidRunSnapshot> {
  return rpc<GuildRaidRunSnapshot>('guild_raid_boss_action', {
    p_raid_run_id: snapshot.raidRunId,
    p_expected_state_version: Math.trunc(snapshot.stateVersion),
    p_idempotency_key: key,
    p_action: action,
  });
}

export async function claimGuildRaidReward(raidRunId: string): Promise<GuildRaidRewardClaim> {
  const value = await rpc<Record<string, unknown>>('claim_my_guild_raid_reward', { p_raid_run_id: raidRunId });
  return {
    raidRunId: String(value.raidRunId ?? value.raid_run_id ?? raidRunId),
    eligible: value.eligible === true,
    reason: typeof value.reason === 'string' ? value.reason : null,
    gold: Math.max(0, Number(value.gold) || 0),
    dust: Math.max(0, Number(value.dust) || 0),
    rankXp: Math.max(0, Number(value.rankXp ?? value.rank_xp) || 0),
    claimedAt: String(value.claimedAt ?? value.claimed_at ?? ''),
  };
}
