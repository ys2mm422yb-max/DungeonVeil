import { authenticatedSupabaseRest } from './supabaseOnline';

export type WorldBossAttemptStatus = {
  canAttack: boolean;
  canResume: boolean;
  activeAttemptId: string | null;
  fightExpiresAt: string | null;
  nextAvailableAt: string | null;
  serverNow: string;
};

export type WorldBossAttemptStart = {
  attemptId: string;
  startedAt: string;
  fightExpiresAt: string;
  nextAvailableAt: string;
  serverNow: string;
  resumed: boolean;
};

type AttemptStatusRow = {
  can_attack: boolean;
  can_resume: boolean;
  active_attempt_id: string | null;
  fight_expires_at: string | null;
  next_available_at: string | null;
  server_now: string;
};

type AttemptStartRow = {
  attempt_id: string;
  started_at: string;
  fight_expires_at: string;
  next_available_at: string;
  server_now: string;
  resumed: boolean;
};

function firstRow<T>(payload: T | T[]): T {
  const row = Array.isArray(payload) ? payload[0] : payload;
  if (!row) throw new Error('Keine Weltboss-Versuchsdaten erhalten');
  return row;
}

export async function getWorldBossAttemptStatus(eventId: string): Promise<WorldBossAttemptStatus> {
  const payload = await authenticatedSupabaseRest<AttemptStatusRow | AttemptStatusRow[]>('rpc/get_world_boss_attempt_status', {
    method: 'POST',
    body: JSON.stringify({ p_event_id: eventId }),
  });
  const row = firstRow(payload);
  return {
    canAttack: Boolean(row.can_attack),
    canResume: Boolean(row.can_resume),
    activeAttemptId: row.active_attempt_id ?? null,
    fightExpiresAt: row.fight_expires_at ?? null,
    nextAvailableAt: row.next_available_at ?? null,
    serverNow: row.server_now,
  };
}

export async function startWorldBossAttempt(eventId: string): Promise<WorldBossAttemptStart> {
  const payload = await authenticatedSupabaseRest<AttemptStartRow | AttemptStartRow[]>('rpc/start_world_boss_attempt', {
    method: 'POST',
    body: JSON.stringify({ p_event_id: eventId }),
  });
  const row = firstRow(payload);
  return {
    attemptId: row.attempt_id,
    startedAt: row.started_at,
    fightExpiresAt: row.fight_expires_at,
    nextAvailableAt: row.next_available_at,
    serverNow: row.server_now,
    resumed: Boolean(row.resumed),
  };
}
