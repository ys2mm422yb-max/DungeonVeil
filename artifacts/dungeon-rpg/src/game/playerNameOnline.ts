import { authenticatedSupabaseRest } from './supabaseOnline';

export type PlayerNameStateOnline = Readonly<{
  user_id: string;
  display_name: string;
  confirmed: boolean;
  completed_changes: number;
  next_change_cost: number;
  confirmed_at: string | null;
}>;

export type PlayerNameChangeResultOnline = Readonly<{
  change_id: string;
  user_id: string;
  display_name: string;
  confirmed: boolean;
  initial_confirmation: boolean;
  completed_changes: number;
  next_change_cost: number;
  charged_gold: number;
  confirmed_at: string | null;
}>;

export type PlayerNameValidation = Readonly<{
  normalized: string;
  valid: boolean;
  error: 'length' | 'characters' | 'reserved' | null;
}>;

const RESERVED_PLAYER_NAMES = new Set([
  'admin', 'administrator', 'moderator', 'mod', 'support', 'system',
  'dungeon veil', 'dungeonveil', 'openai',
]);

export function validatePlayerNameDraft(value: string): PlayerNameValidation {
  const normalized = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (normalized.length < 3 || normalized.length > 20) return { normalized, valid: false, error: 'length' };
  if (!/^[A-Za-z0-9ÄÖÜäöüß][A-Za-z0-9ÄÖÜäöüß _-]*[A-Za-z0-9ÄÖÜäöüß]$/.test(normalized)) {
    return { normalized, valid: false, error: 'characters' };
  }
  if (RESERVED_PLAYER_NAMES.has(normalized.toLocaleLowerCase('de-DE'))) return { normalized, valid: false, error: 'reserved' };
  return { normalized, valid: true, error: null };
}

export async function getMyPlayerNameStateOnline(): Promise<PlayerNameStateOnline> {
  const rows = await authenticatedSupabaseRest<PlayerNameStateOnline[]>('rpc/get_my_player_name_state', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!rows[0]) throw new Error('Spielername-Status konnte nicht geladen werden');
  return rows[0];
}

export async function setMyPlayerNameOnline(
  displayName: string,
  changeId = crypto.randomUUID(),
): Promise<PlayerNameChangeResultOnline> {
  const validation = validatePlayerNameDraft(displayName);
  if (!validation.valid) throw new Error('Ungültiger Spielername');
  const rows = await authenticatedSupabaseRest<PlayerNameChangeResultOnline[]>('rpc/set_my_player_name', {
    method: 'POST',
    body: JSON.stringify({ p_display_name: validation.normalized, p_change_id: changeId }),
  });
  if (!rows[0]) throw new Error('Spielername konnte nicht gespeichert werden');
  return rows[0];
}
