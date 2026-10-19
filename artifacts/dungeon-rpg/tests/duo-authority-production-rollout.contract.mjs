import assert from "node:assert/strict";
import fs from "node:fs";
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
  assert.match(workflow, /supabase migration list --linked/);
  assert.match(workflow, /supabase db push --linked --dry-run --skip-vault/);
  assert.match(workflow, /supabase db push --linked --skip-vault/);
  assert.doesNotMatch(
    workflow,
    /--include-all|migration repair|schema_migrations/i,
  );
  for (const version of [
    "20260911133000",
    "20260911160500",
    "20261003052000",
    "20261003142500",
    "20261004154000",
    "20261004230000",
    "20261008001000",
    "20261011211500",
  ])
    assert.match(verifier, new RegExp(version));
  assert.match(
    verifier,
    /columns\[0\] === version && candidate\.columns\[1\] === version/,
  );
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
    "stale_attempt_rejected",
    "legitimate_two_member_intents",
    "exit_replay_idempotent",
  ])
    assert.match(smoke, new RegExp(proof));
  assert.doesNotMatch(smoke, /access_token\s*:/);
});
