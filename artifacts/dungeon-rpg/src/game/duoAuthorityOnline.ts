import type { CanonicalEncounterState } from './duoEncounterAuthorityKernel';
import { CHAPTER_ROOMS } from './chapterRun';
import { authenticatedSupabaseFunction, authenticatedSupabaseRest } from './supabaseOnline';

export type DuoAuthorityBinding = Readonly<{
  lobbyId: string;
  runAttempt: number;
  runSeed: number;
}>;

export type DuoAuthorityState = Readonly<{
  binding: DuoAuthorityBinding;
  encounterId: string;
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
  encounterId?: string;
  stateVersion?: number;
  state?: CanonicalEncounterState | null;
  bootstrapRequired?: boolean;
};

export type DuoAuthorityIntent =
  | Readonly<{ kind: 'move'; directionX: number; directionY: number }>
  | Readonly<{ kind: 'basic-hit'; targetEnemyId: string }>
  | Readonly<{ kind: 'dodge'; directionX: number; directionY: number }>
  | Readonly<{ kind: 'sync' }>
  | Readonly<{ kind: 'start-ack' }>
  | Readonly<{ kind: 'revive-hold'; targetActorId: string }>;

export type DuoAuthorityTransition = Readonly<{
  stateVersion: number;
  state: CanonicalEncounterState;
  replayed: boolean;
  completed: boolean;
}>;

function uuid(): string {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  throw new Error('Sicherer Duo-Request-Identifier ist nicht verfügbar.');
}

function exactState(
  binding: DuoAuthorityBinding,
  stateVersionValue: unknown,
  stateValue: unknown,
): { stateVersion: number; state: CanonicalEncounterState } {
  const stateVersion = nonNegativeSafeInteger(stateVersionValue, 'state_version');
  const state = stateValue as CanonicalEncounterState | null | undefined;
  if (!state || state.runId !== binding.lobbyId || state.runAttempt !== binding.runAttempt
      || state.seed !== binding.runSeed || state.version !== stateVersion || !state.encounterId) {
    throw new Error('Duo-Autoritätsantwort ist nicht exakt an diesen Lauf gebunden.');
  }
  return { stateVersion, state };
}

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
  const encounterId = String(response.encounterId ?? state?.encounterId ?? '');
  if (!encounterId) throw new Error('Duo-Autoritätsbegegnung fehlt.');
  if (state && (state.runId !== lobbyId || state.runAttempt !== binding.runAttempt || state.seed !== binding.runSeed
      || state.version !== stateVersion || state.encounterId !== encounterId)) {
    throw new Error('Duo-Autoritätszustand ist nicht exakt an diesen Lauf gebunden.');
  }
  return Object.freeze({ binding, encounterId, stateVersion, state, bootstrapRequired: Boolean(response.bootstrapRequired) });
}

export async function submitDuoAuthorityIntent(
  binding: DuoAuthorityBinding,
  encounterId: string,
  expectedStateVersion: number,
  actorSequence: number,
  intent: DuoAuthorityIntent,
  intentId = uuid(),
): Promise<DuoAuthorityTransition> {
  const response = await authenticatedSupabaseFunction<Record<string, unknown>>('duo-authority', {
    method: 'POST',
    body: JSON.stringify({
      action: 'intent',
      lobbyId: binding.lobbyId,
      runAttempt: binding.runAttempt,
      encounterId,
      intentId,
      expectedStateVersion: nonNegativeSafeInteger(expectedStateVersion, 'expected_state_version'),
      actorSequence: positiveInteger(actorSequence, 'actor_sequence'),
      intent,
    }),
  });
  const exact = exactState(binding, response.stateVersion, response.state);
  return Object.freeze({
    ...exact,
    replayed: Boolean(response.replayed),
    completed: Boolean(response.completed),
  });
}

export async function advanceDuoAuthorityEncounter(
  binding: DuoAuthorityBinding,
  encounterId: string,
): Promise<void> {
  await authenticatedSupabaseFunction('duo-authority', {
    method: 'POST',
    body: JSON.stringify({ action: 'advance', lobbyId: binding.lobbyId, runAttempt: binding.runAttempt, encounterId }),
  });
}

export async function restartDuoAuthorityAttempt(binding: DuoAuthorityBinding, requestId = uuid()): Promise<void> {
  await authenticatedSupabaseFunction('duo-authority', {
    method: 'POST',
    body: JSON.stringify({ action: 'restart', lobbyId: binding.lobbyId, runAttempt: binding.runAttempt, requestId }),
  });
}

export async function exitDuoAuthorityAttempt(binding: DuoAuthorityBinding, requestId = uuid()): Promise<void> {
  await authenticatedSupabaseFunction('duo-authority', {
    method: 'POST',
    body: JSON.stringify({ action: 'exit', lobbyId: binding.lobbyId, runAttempt: binding.runAttempt, requestId }),
  });
}

export async function exitMyDuoAuthorityAttempt(lobbyId: string, expectedRunSeed: number): Promise<void> {
  const binding = await getMyDuoAuthorityBinding(lobbyId);
  if (binding.runSeed !== expectedRunSeed) throw new Error('Duo-Autoritätslauf stimmt nicht mit der Lobby überein.');
  await exitDuoAuthorityAttempt(binding);
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
  if (!state.encounterId || state.chapter < 1 || state.room < 1 || state.room > CHAPTER_ROOMS) {
    throw new Error('Ungültiger bestätigter Duo-Raumabschluss.');
  }
  return state;
}
