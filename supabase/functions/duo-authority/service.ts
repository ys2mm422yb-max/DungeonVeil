import {
  createRoomBoundCanonicalEncounterState,
  type CanonicalDuoActorIdentity,
} from "../_shared/duo_authority_factory.ts";
import {
  reduceAuthorityIntent,
  type AuthorityIntent,
  type CanonicalEncounterState,
} from "../_shared/duo_authority_kernel.ts";

type RpcResult = { data: unknown; error: { message: string } | null };

export type DuoAuthorityService = {
  auth: { getUser(token: string): Promise<{ data: { user: { id: string } | null }; error: unknown }> };
  rpc(name: string, args: Record<string, unknown>): Promise<RpcResult>;
};

type AuthorityActorRow = {
  user_id: string;
  class_key: CanonicalDuoActorIdentity["classKey"];
  last_intent_sequence: number;
};

type AuthorityStateRow = {
  lobby_id: string;
  run_attempt: number;
  run_seed: number;
  chapter: number;
  room: number;
  encounter_id: string;
  state_version: number;
  authority_version: string;
  status: string;
  canonical_snapshot: CanonicalEncounterState | null;
  canonical_snapshot_digest: string | null;
  actors: AuthorityActorRow[];
};

type IntentBody = {
  action: "intent";
  lobbyId: string;
  runAttempt: number;
  encounterId: string;
  intentId: string;
  expectedStateVersion: number;
  actorSequence: number;
  intent: { kind: "move"; directionX: number; directionY: number }
    | { kind: "basic-hit"; targetEnemyId: string };
};

type StateBody = { action: "state"; lobbyId: string; runAttempt: number };
type AdvanceBody = { action: "advance"; lobbyId: string; runAttempt: number; encounterId: string };
export type DuoAuthorityBody = IntentBody | StateBody | AdvanceBody;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(stableJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function rows<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : value == null ? [] : [value as T];
}

function exactPositiveInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) throw new Error(`invalid_${label}`);
  return Number(value);
}

function assertRequest(body: DuoAuthorityBody): void {
  if (!UUID.test(body.lobbyId)) throw new Error("invalid_lobby");
  exactPositiveInteger(body.runAttempt, "run_attempt");
  if (body.action === "state") return;
  if (body.action === "advance") {
    if (!UUID.test(body.encounterId)) throw new Error("invalid_encounter_id");
    return;
  }
  if (!UUID.test(body.encounterId)) throw new Error("invalid_encounter_id");
  if (!UUID.test(body.intentId)) throw new Error("invalid_intent_id");
  if (!Number.isSafeInteger(body.expectedStateVersion) || body.expectedStateVersion < 0) throw new Error("invalid_state_version");
  exactPositiveInteger(body.actorSequence, "actor_sequence");
  if (!body.intent || (body.intent.kind !== "move" && body.intent.kind !== "basic-hit")) throw new Error("invalid_intent");
  if (body.intent.kind === "move" && (!Number.isFinite(body.intent.directionX) || !Number.isFinite(body.intent.directionY))) {
    throw new Error("invalid_move");
  }
  if (body.intent.kind === "basic-hit" && typeof body.intent.targetEnemyId !== "string") throw new Error("invalid_target");
}

function bindSnapshot(row: AuthorityStateRow, authorityNowMs: number): CanonicalEncounterState {
  if (row.canonical_snapshot) return row.canonical_snapshot;
  const actors = row.actors.map(actor => ({ actorId: actor.user_id, classKey: actor.class_key, active: true }));
  const created = createRoomBoundCanonicalEncounterState({
    runId: row.lobby_id,
    runAttempt: row.run_attempt,
    chapter: row.chapter,
    room: row.room,
    seed: row.run_seed,
    authorityStartedAtMs: authorityNowMs,
    actors,
  });
  return Object.freeze({
    ...created,
    encounterId: row.encounter_id,
    lastClientSeqByActor: Object.freeze(Object.fromEntries(
      row.actors.map(actor => [actor.user_id, Number(actor.last_intent_sequence)]),
    )),
  });
}

function assertStoredBinding(row: AuthorityStateRow, state: CanonicalEncounterState): void {
  if (state.runId !== row.lobby_id || state.runAttempt !== row.run_attempt || state.seed !== row.run_seed
      || state.chapter !== row.chapter || state.room !== row.room || state.encounterId !== row.encounter_id
      || state.version !== row.state_version) throw new Error("authority_snapshot_binding_conflict");
}

export async function executeDuoAuthority(
  service: DuoAuthorityService,
  token: string,
  body: DuoAuthorityBody,
  authorityNowMs = Date.now(),
): Promise<Record<string, unknown>> {
  assertRequest(body);
  const { data: authData, error: authError } = await service.auth.getUser(token);
  if (authError || !authData.user) throw new Error("invalid_token");

  const read = await service.rpc("read_coop_authority_state", {
    p_lobby_id: body.lobbyId,
    p_run_attempt: body.runAttempt,
  });
  if (read.error) throw new Error("authority_state_unavailable");
  const row = rows<AuthorityStateRow>(read.data)[0];
  if (!row || row.status === "invalidated") throw new Error("authority_state_not_found");
  const actor = row.actors.find(candidate => candidate.user_id === authData.user!.id);
  if (!actor) throw new Error("active_actor_required");

  if (body.action === "state") {
    return { stateVersion: row.state_version, state: row.canonical_snapshot, actors: row.actors, reconnect: true };
  }
  if (body.action === "advance") {
    if (body.encounterId !== row.encounter_id) throw new Error("authority_encounter_conflict");
    const advanced = await service.rpc("advance_coop_authority_encounter", {
      p_lobby_id: row.lobby_id,
      p_run_attempt: row.run_attempt,
      p_completed_encounter_id: body.encounterId,
      p_actor_user_id: authData.user.id,
    });
    if (advanced.error) throw new Error(`authority_advance_rejected:${advanced.error.message}`);
    const next = rows<Record<string, unknown>>(advanced.data)[0];
    return { ...next, advanced: true };
  }
  const intent: AuthorityIntent = body.intent.kind === "move"
    ? { kind: "move", actorId: authData.user.id, clientSeq: body.actorSequence,
        directionX: body.intent.directionX, directionY: body.intent.directionY }
    : { kind: "basic-hit", actorId: authData.user.id, clientSeq: body.actorSequence,
        targetEnemyId: body.intent.targetEnemyId };
  const intentDigest = await sha256(intent);
  const persist = async (snapshot: CanonicalEncounterState, snapshotDigest: string) => {
    const result = await service.rpc("persist_coop_authority_transition_and_record", {
      p_lobby_id: row.lobby_id,
      p_run_attempt: row.run_attempt,
      p_encounter_id: body.encounterId,
      p_actor_user_id: authData.user!.id,
      p_intent_id: body.intentId,
      p_actor_sequence: body.actorSequence,
      p_expected_state_version: body.expectedStateVersion,
      p_intent_digest: intentDigest,
      p_next_snapshot: snapshot,
      p_next_snapshot_digest: snapshotDigest,
    });
    if (result.error) throw new Error(`authority_transition_rejected:${result.error.message}`);
    return rows<Record<string, unknown>>(result.data)[0];
  };

  // A response may be lost after PostgreSQL commits. Let the receipt-aware RPC resolve
  // an exact replay before attempting to reduce against the newer reconnect snapshot.
  if (body.encounterId !== row.encounter_id
      || body.expectedStateVersion !== row.state_version
      || body.actorSequence !== Number(actor.last_intent_sequence) + 1) {
    if (!row.canonical_snapshot || !row.canonical_snapshot_digest) throw new Error("authority_replay_unavailable");
    const receipt = await persist(row.canonical_snapshot, row.canonical_snapshot_digest);
    const replayState = receipt?.canonical_snapshot as CanonicalEncounterState | undefined;
    return {
      stateVersion: receipt?.state_version,
      state: replayState,
      replayed: Boolean(receipt?.replayed),
      completed: Boolean(replayState?.completed),
    };
  }

  const current = bindSnapshot(row, authorityNowMs);
  assertStoredBinding(row, current);
  const reduced = reduceAuthorityIntent(current, intent, authorityNowMs);
  const snapshotDigest = await sha256(reduced.state);
  const receipt = await persist(reduced.state, snapshotDigest);
  const persistedState = receipt?.canonical_snapshot as CanonicalEncounterState | undefined;
  return {
    stateVersion: receipt?.state_version ?? reduced.state.version,
    state: persistedState ?? reduced.state,
    replayed: Boolean(receipt?.replayed),
    completed: Boolean((persistedState ?? reduced.state).completed),
  };
}
