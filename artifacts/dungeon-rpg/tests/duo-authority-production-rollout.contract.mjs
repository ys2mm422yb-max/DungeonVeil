import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const workflow = fs.readFileSync(
  ".github/workflows/duo-authority-production-rollout.yml",
  "utf8",
);
const verifier = fs.readFileSync(
  "scripts/verify-duo-authority-production-plan.mjs",
  "utf8",
);
const smoke = fs.readFileSync(
  "scripts/duo-authority-production-smoke.mjs",
  "utf8",
);
const firstMigration = fs.readFileSync(
  "supabase/migrations/20260911133000_trust_duo_encounter_completion.sql",
  "utf8",
);
const config = fs.readFileSync("supabase/config.toml", "utf8");
const history = JSON.parse(
  fs.readFileSync("scripts/duo-authority-production-history.json", "utf8"),
);
const expectedMigrations = [
  "20260911133000_trust_duo_encounter_completion.sql",
  "20260911160500_lock_down_trusted_coop_completion.sql",
  "20261003052000_add_duo_authority_bootstrap.sql",
  "20261003142500_connect_duo_authority_completion.sql",
  "20261004154000_add_duo_authority_build_profiles.sql",
  "20261004230000_bind_duo_authority_build_snapshot.sql",
  "20261008001000_complete_duo_authority_lifecycle.sql",
  "20261011211500_expose_my_duo_authority_binding.sql",
];
const expectedVersions = expectedMigrations.map((name) => name.slice(0, 14));

test("first migration is fail-closed without relying on its successor", () => {
  assert.match(
    firstMigration,
    /revoke all on table public\.coop_trusted_encounter_completions from service_role/i,
  );
  assert.doesNotMatch(
    firstMigration,
    /grant\s+(?:select|insert|update|delete|all)[^;]*coop_trusted_encounter_completions[^;]*service_role/i,
  );
  assert.match(
    firstMigration,
    /from public, anon, authenticated, service_role/i,
  );
  assert.doesNotMatch(
    firstMigration,
    /grant execute on function private\.require_trusted_coop_completion[^;]+to service_role/i,
  );
});

test("rollout is a permanent manual exact-head target-only workflow", () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\n\s+(?:push|pull_request):/);
  assert.match(
    workflow,
    /refs\/heads\/fix\/mobile-telegraphs-room-21-50-balance/,
  );
  assert.match(workflow, /git rev-parse HEAD/);
  assert.match(workflow, /github\.event\.inputs\.expected_sha/);
  assert.match(workflow, /DUNGEON_VEIL_PRODUCTION_ROLLOUT_ENABLED/);
  assert.match(workflow, /environment:\s*dungeon-veil-production/);
});

test("rollout preserves versions and cannot broaden the migration set", () => {
  assert.match(workflow, /migration fetch --linked --yes/);
  assert.match(workflow, /--workdir "\$\{ROLLOUT_WORKDIR\}"/);
  assert.match(workflow, /--assert-repository-list-blocked/);
  assert.match(workflow, /db push --linked --dry-run --skip-vault/);
  assert.match(workflow, /db push --linked --skip-vault/);
  assert.doesNotMatch(
    workflow,
    /--include-all|migration repair|schema_migrations/i,
  );
  for (const migration of expectedMigrations) {
    assert.match(workflow, new RegExp(migration.replaceAll(".", "\\.")));
    assert.match(verifier, new RegExp(migration.replaceAll(".", "\\.")));
  }
  assert.equal(
    (workflow.match(/cp "supabase\/migrations\/\$\{migration\}"/g) ?? [])
      .length,
    1,
  );
  assert.match(
    verifier,
    /production migration history is not a subset of repository migrations/,
  );
});

test("history validator fails closed on the real zero-overlap root and accepts only the isolated exact sequence", () => {
  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), "duo-rollout-contract-"),
  );
  const write = (name, value) => {
    const target = path.join(temporary, name);
    fs.writeFileSync(target, value);
    return target;
  };
  const pair = (local, remote) => `${local ?? ""} | ${remote ?? ""}`;
  const remote = history.migrations.map(({ version }) => version);
  const local = fs
    .readdirSync("supabase/migrations")
    .filter((name) => /^20\d{12}_.+\.sql$/.test(name))
    .map((name) => name.slice(0, 14))
    .sort();
  const run = (...args) =>
    spawnSync(
      process.execPath,
      ["scripts/verify-duo-authority-production-plan.mjs", ...args],
      {
        encoding: "utf8",
      },
    );

  try {
    const rootList = write(
      "root.txt",
      [
        ...local.map((version) => pair(version, "")),
        ...remote.map((version) => pair("", version)),
      ].join("\n"),
    );
    const rootFailure = run("--repository-list", rootList);
    assert.notEqual(rootFailure.status, 0);
    assert.match(rootFailure.stderr, /unsafe root db push blocked/);
    assert.equal(run("--assert-repository-list-blocked", rootList).status, 0);

    const fetchedList = write(
      "fetched.txt",
      remote.map((version) => pair(version, version)).join("\n"),
    );
    assert.equal(run("--fetched-list", fetchedList).status, 0);

    const preList = write(
      "pre.txt",
      [
        ...remote.map((version) => pair(version, version)),
        ...expectedVersions.map((version) => pair(version, "")),
      ].join("\n"),
    );
    assert.equal(run("--pre-list", preList).status, 0);

    const dryRun = write(
      "dry.txt",
      expectedVersions
        .map((version) => `Applying migration ${version}`)
        .join("\n"),
    );
    assert.equal(run("--dry-run", dryRun).status, 0);

    const post = [...remote, ...expectedVersions].sort();
    const postList = write(
      "post.txt",
      post.map((version) => pair(version, version)).join("\n"),
    );
    assert.equal(run("--post-list", postList).status, 0);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});

test("deploy keeps JWT verification and runs redacted adversarial smoke", () => {
  assert.match(config, /\[functions\.duo-authority\][\s\S]*verify_jwt = true/);
  assert.match(workflow, /supabase functions deploy duo-authority/);
  for (const identity of ["HOST", "GUEST", "OUTSIDER"]) {
    assert.match(workflow, new RegExp(`DUNGEON_VEIL_SMOKE_${identity}_EMAIL`));
    assert.match(
      workflow,
      new RegExp(`DUNGEON_VEIL_SMOKE_${identity}_PASSWORD`),
    );
  }
  for (const proof of [
    "unauthenticated_rejected",
    "nonmember_rejected",
    "exact_replay_idempotent",
    "stale_state_rejected",
    "future_state_rejected",
    "actor_sequence_gap_rejected",
    "future_attempt_rejected",
    "stale_attempt_rejected",
    "binding_cleanup_confirmed",
    "legitimate_two_member_intents",
    "exit_replay_idempotent",
  ])
    assert.match(smoke, new RegExp(proof));
  for (const error of [
    "missing_authorization",
    "active_actor_required",
    "authority_transition_rejected:authority state version conflict",
    "authority_transition_rejected:authority actor sequence gap",
    "authority_state_not_found",
  ])
    assert.match(smoke, new RegExp(error));
  assert.doesNotMatch(smoke, /access_token\s*:/);
});
