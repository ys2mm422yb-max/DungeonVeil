import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const PROJECT_REF = "hfndwqfghyomwapqsked";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`missing required environment: ${name}`);
  return value;
}

const anonKey = required("SUPABASE_ANON_KEY");
const receiptPath =
  process.env.DUO_AUTHORITY_SMOKE_RECEIPT ||
  "duo-authority-production-receipt/smoke.json";

async function request(path, { token, body, expected = [200] } = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {}
  assert.ok(
    expected.includes(response.status),
    `${path} returned ${response.status}: ${payload?.error ?? "unknown_error"}`,
  );
  return { status: response.status, payload };
}

async function signIn(prefix) {
  const email = required(`${prefix}_EMAIL`);
  const password = required(`${prefix}_PASSWORD`);
  const result = await request("/auth/v1/token?grant_type=password", {
    body: { email, password },
  });
  assert.ok(
    result.payload?.access_token && result.payload?.user?.id,
    `${prefix} sign-in failed`,
  );
  return { token: result.payload.access_token, id: result.payload.user.id };
}

const rpc = (token, name, body = {}, expected = [200]) =>
  request(`/rest/v1/rpc/${name}`, { token, body, expected });
const edge = (token, body, expected = [200]) =>
  request("/functions/v1/duo-authority", { token, body, expected });
const first = (result, label) => {
  const value = Array.isArray(result.payload)
    ? result.payload[0]
    : result.payload;
  assert.ok(value, `${label} returned no row`);
  return value;
};

const checks = [];
const record = (name) => checks.push(name);
let host;
let lobby;

try {
  const [hostUser, guest, outsider] = await Promise.all([
    signIn("DUNGEON_VEIL_SMOKE_HOST"),
    signIn("DUNGEON_VEIL_SMOKE_GUEST"),
    signIn("DUNGEON_VEIL_SMOKE_OUTSIDER"),
  ]);
  host = hostUser;
  assert.equal(
    new Set([host.id, guest.id, outsider.id]).size,
    3,
    "smoke identities must be distinct",
  );

  await Promise.all([
    rpc(host.token, "leave_coop_lobby", {}, [200, 400]),
    rpc(guest.token, "leave_coop_lobby", {}, [200, 400]),
  ]);

  lobby = first(await rpc(host.token, "create_coop_lobby"), "create lobby");
  assert.match(lobby.invite_code, /^[A-Z0-9]{6}$/);
  await rpc(guest.token, "join_coop_lobby", {
    p_invite_code: lobby.invite_code,
  });
  await Promise.all([
    rpc(host.token, "set_my_coop_authority_class", { p_class_key: "warrior" }),
    rpc(guest.token, "set_my_coop_authority_class", { p_class_key: "mage" }),
  ]);
  await Promise.all([
    rpc(host.token, "set_coop_lobby_ready", { p_ready: true }),
    rpc(guest.token, "set_coop_lobby_ready", { p_ready: true }),
  ]);
  const started = first(
    await rpc(host.token, "start_coop_lobby"),
    "start lobby",
  );
  record("legitimate_two_member_start");

  const bindingHost = first(
    await rpc(host.token, "get_my_coop_authority_binding", {
      p_lobby_id: lobby.lobby_id,
    }),
    "host binding",
  );
  const bindingGuest = first(
    await rpc(guest.token, "get_my_coop_authority_binding", {
      p_lobby_id: lobby.lobby_id,
    }),
    "guest binding",
  );
  assert.equal(bindingHost.run_attempt, bindingGuest.run_attempt);
  assert.equal(String(bindingHost.run_seed), String(started.run_seed));
  record("exact_member_binding");

  await edge(
    "",
    {
      action: "state",
      lobbyId: lobby.lobby_id,
      runAttempt: bindingHost.run_attempt,
    },
    [401],
  );
  record("unauthenticated_rejected");
  const nonmember = await edge(
    outsider.token,
    {
      action: "state",
      lobbyId: lobby.lobby_id,
      runAttempt: bindingHost.run_attempt,
    },
    [400],
  );
  assert.equal(nonmember.payload?.error, "active_actor_required");
  record("nonmember_rejected");

  const bootstrap = await edge(host.token, {
    action: "state",
    lobbyId: lobby.lobby_id,
    runAttempt: bindingHost.run_attempt,
  });
  assert.equal(bootstrap.payload?.bootstrapRequired, true);
  const encounterId = bootstrap.payload?.encounterId;
  assert.match(encounterId, /^[0-9a-f-]{36}$/i);

  const hostIntentId = crypto.randomUUID();
  const hostSyncBody = {
    action: "intent",
    lobbyId: lobby.lobby_id,
    runAttempt: bindingHost.run_attempt,
    encounterId,
    intentId: hostIntentId,
    expectedStateVersion: 0,
    actorSequence: 1,
    intent: { kind: "sync" },
  };
  const hostSync = await edge(host.token, hostSyncBody);
  assert.equal(hostSync.payload?.stateVersion, 1);
  const replay = await edge(host.token, hostSyncBody);
  assert.equal(replay.payload?.stateVersion, 1);
  record("exact_replay_idempotent");

  const guestSync = await edge(guest.token, {
    action: "intent",
    lobbyId: lobby.lobby_id,
    runAttempt: bindingHost.run_attempt,
    encounterId,
    intentId: crypto.randomUUID(),
    expectedStateVersion: 1,
    actorSequence: 1,
    intent: { kind: "sync" },
  });
  assert.equal(guestSync.payload?.stateVersion, 2);
  record("legitimate_two_member_intents");

  await edge(
    host.token,
    {
      action: "intent",
      lobbyId: lobby.lobby_id,
      runAttempt: bindingHost.run_attempt,
      encounterId,
      intentId: crypto.randomUUID(),
      expectedStateVersion: 0,
      actorSequence: 2,
      intent: { kind: "sync" },
    },
    [409],
  );
  record("stale_state_rejected");
  await edge(
    host.token,
    {
      action: "intent",
      lobbyId: lobby.lobby_id,
      runAttempt: bindingHost.run_attempt,
      encounterId,
      intentId: crypto.randomUUID(),
      expectedStateVersion: 999999,
      actorSequence: 2,
      intent: { kind: "sync" },
    },
    [409],
  );
  record("future_state_rejected");
  await edge(
    guest.token,
    {
      action: "intent",
      lobbyId: lobby.lobby_id,
      runAttempt: bindingHost.run_attempt,
      encounterId,
      intentId: crypto.randomUUID(),
      expectedStateVersion: 2,
      actorSequence: 3,
      intent: { kind: "sync" },
    },
    [409],
  );
  record("actor_sequence_gap_rejected");
  await edge(
    host.token,
    {
      action: "state",
      lobbyId: lobby.lobby_id,
      runAttempt: bindingHost.run_attempt + 1,
    },
    [400, 404],
  );
  record("stale_attempt_rejected");

  const exitBody = {
    action: "exit",
    lobbyId: lobby.lobby_id,
    runAttempt: bindingHost.run_attempt,
    requestId: crypto.randomUUID(),
  };
  const exited = await edge(host.token, exitBody);
  assert.equal(exited.payload?.status, "closed");
  const exitReplay = await edge(host.token, exitBody);
  assert.equal(exitReplay.payload?.replayed, true);
  record("exit_replay_idempotent");

  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  fs.writeFileSync(
    receiptPath,
    `${JSON.stringify(
      {
        result: "pass",
        project_ref: PROJECT_REF,
        source_head: process.env.GITHUB_SHA || "local",
        run_id: process.env.GITHUB_RUN_ID || "local",
        run_attempt: process.env.GITHUB_RUN_ATTEMPT || "1",
        checks,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `Duo authority production smoke passed (${checks.length} checks).`,
  );
} finally {
  if (host?.token && lobby?.lobby_id) {
    try {
      await rpc(host.token, "leave_coop_lobby", {}, [200, 400]);
    } catch {}
  }
}
