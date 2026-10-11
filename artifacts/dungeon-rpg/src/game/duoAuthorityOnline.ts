import type { CanonicalEncounterState } from './duoEncounterAuthorityKernel';
import { authenticatedSupabaseFunction, authenticatedSupabaseRest } from './supabaseOnline';

export type DuoAuthorityBinding = Readonly<{
  lobbyId: string;
  runAttempt: number;
  runSeed: number;
}>;

export type DuoAuthorityState = Readonly<{
  binding: DuoAuthorityBinding;
  stateVersion: number;
  state: CanonicalEncounterState | null;
  bootstrapRequired: boolean;
}>;

type BindingRow = {
  lobby_id: string;
  run_attempt: number;
  run_seed: number;
};

type StateResponse = {
  stateVersion?: number;
  state?: CanonicalEncounterState | null;
  bootstrapRequired?: boolean;
};

function nonNegativeSafeInteger(value: unknown, label: string): number {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 0) throw new Error(`Ungültige Duo-Autorität: ${label}`);
  return normalized;
}
function positiveInteger(value: unknown, label: string): number {
  const normalized = nonNegativeSafeInteger(value, label);
  if (normalized < 1) throw new Error(`Ungültige Duo-Autorität: ${label}`);
  return normalized;
}

export async function getMyDuoAuthorityBinding(lobbyId: string): Promise<DuoAuthorityBinding> {
  const rows = await authenticatedSupabaseRest<BindingRow[]>('rpc/get_my_coop_authority_binding', {
    method: 'POST',
    body: JSON.stringify({ p_lobby_id: lobbyId }),
  });
  const row = rows[0];
  if (!row || row.lobby_id !== lobbyId) throw new Error('Aktiver Duo-Autoritätslauf nicht gefunden.');
  return Object.freeze({
    lobbyId: row.lobby_id,
    runAttempt: positiveInteger(row.run_attempt, 'run_attempt'),
    runSeed: nonNegativeSafeInteger(row.run_seed, 'run_seed'),
  });
}

export async function readMyDuoAuthorityState(lobbyId: string, expectedRunSeed: number): Promise<DuoAuthorityState> {
  const binding = await getMyDuoAuthorityBinding(lobbyId);
  if (binding.runSeed !== expectedRunSeed) throw new Error('Duo-Autoritätslauf stimmt nicht mit der Lobby überein.');
  const response = await authenticatedSupabaseFunction<StateResponse>('duo-authority', {
    method: 'POST',
    body: JSON.stringify({ action: 'state', lobbyId, runAttempt: binding.runAttempt }),
  });
  const stateVersion = Math.max(0, Math.floor(Number(response.stateVersion) || 0));
  const state = response.state ?? null;
  if (state && (state.runId !== lobbyId || state.runAttempt !== binding.runAttempt || state.seed !== binding.runSeed
      || state.version !== stateVersion)) {
    throw new Error('Duo-Autoritätszustand ist nicht exakt an diesen Lauf gebunden.');
  }
  return Object.freeze({ binding, stateVersion, state, bootstrapRequired: Boolean(response.bootstrapRequired) });
}

export async function readCompletedDuoAuthorityEncounter(
  lobbyId: string,
  expectedRunSeed: number,
): Promise<CanonicalEncounterState> {
  const authority = await readMyDuoAuthorityState(lobbyId, expectedRunSeed);
  const state = authority.state;
  if (!state || !state.completed || state.lifecycle !== 'completed' || state.enemies.some(enemy => enemy.hp > 0)) {
    throw new Error('Raumabschluss wurde vom Duo-Server noch nicht bestätigt.');
  }
  if (!state.encounterId || state.chapter < 1 || state.room < 1 || state.room > 50) {
    throw new Error('Ungültiger bestätigter Duo-Raumabschluss.');
  }
  return state;
}
