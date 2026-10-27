import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const workflow = fs.readFileSync(
  ".github/workflows/duo-authority-production-rollout.yml",
  "utf8",
);
const planValidator = fs.readFileSync(
  "scripts/verify-duo-authority-production-plan.mjs",
  "utf8",
);
const productionHistory = JSON.parse(
  fs.readFileSync("scripts/duo-authority-production-history.json", "utf8"),
);
const duoMigrations = [
  "20260911133000_trust_duo_encounter_completion.sql",
  "20260911160500_lock_down_trusted_coop_completion.sql",
  "20261003052000_add_duo_authority_bootstrap.sql",
  "20261003142500_connect_duo_authority_completion.sql",
  "20261004154000_add_duo_authority_build_profiles.sql",
  "20261004230000_bind_duo_authority_build_snapshot.sql",
  "20261008001000_complete_duo_authority_lifecycle.sql",
  "20261011211500_expose_my_duo_authority_binding.sql",
];

function migrationList(localVersions, remoteVersions) {
  const local = new Set(localVersions);
  const remote = new Set(remoteVersions);
  return [...new Set([...local, ...remote])]
    .sort()
    .map((version) =>
      [
        local.has(version) ? version : "",
        remote.has(version) ? version : "",
      ].join(" | "),
    )
    .join("\n");
}

const prJob = workflow.slice(
  workflow.indexOf("  pr_contract:"),
  workflow.indexOf("  resolve_operation:"),
);
const pushJobs = workflow.slice(workflow.indexOf("  resolve_operation:"));
const pushTrigger = workflow.slice(
  workflow.indexOf("  push:"),
  workflow.indexOf("\npermissions:"),
);

test("pull requests execute only a secretless exact-head contract", () => {
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /push:/);
  assert.doesNotMatch(workflow, /workflow_dispatch:/);
  assert.match(prJob, /if: github\.event_name == 'pull_request'/);
  assert.match(
    prJob,
    /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/,
  );
  assert.match(prJob, /persist-credentials: false/);
  assert.match(prJob, /git rev-parse HEAD/);
  assert.match(
    prJob,
    /node --test artifacts\/dungeon-rpg\/tests\/duo-authority-production-rollout\.contract\.mjs/,
  );
  assert.doesNotMatch(
    prJob,
    /environment:|secrets\.|SUPABASE_|dungeon-veil-production/,
  );
  assert.match(pushJobs, /if: github\.event_name == 'push'/g);
  assert.match(pushJobs, /environment:\s*dungeon-veil-production/);
  assert.match(pushJobs, /credentialed rollout requires a trusted target push/);
});

test("bootstrap merge cannot mount the production environment", () => {
  for (const bootstrapOnly of [
    ".github/workflows/duo-authority-production-rollout.yml",
    "artifacts/dungeon-rpg/tests/duo-authority-production-rollout.contract.mjs",
    "docs/DUO_AUTHORITY_PRODUCTION_ROLLOUT.md",
  ]) {
    assert.doesNotMatch(
      pushTrigger,
      new RegExp(bootstrapOnly.replaceAll(".", "\\.")),
    );
  }
  assert.match(
    pushTrigger,
    /scripts\/verify-duo-authority-production-plan\.mjs/,
  );
  assert.ok(pushTrigger.includes("supabase/functions/duo-authority/**"));
  assert.match(
    pushTrigger,
    /20261011211500_expose_my_duo_authority_binding\.sql/,
  );
});

test("trusted target push retains one-use exact-head authorization", () => {
  assert.match(pushJobs, /context\.eventName !== 'push'/);
  assert.match(pushJobs, /context\.ref !== 'refs\/heads\/' \+ target/);
  assert.match(pushJobs, /const expectedSha = context\.sha/);
  assert.match(pushJobs, /issue_number:\s*481/);
  assert.match(pushJobs, /dungeon-veil-production-authorization/);
  assert.match(pushJobs, /worker === 'verifier'/);
  assert.match(pushJobs, /workflow_run_id === String\(context\.runId\)/);
  assert.match(pushJobs, /workflow_run_attempt === String\(runAttempt\)/);
  assert.match(pushJobs, /runAttempt !== 2/);
  assert.match(pushJobs, /production_authorization === 'approved'/);
  assert.match(pushJobs, /APPLY_ISSUE_461_TO_/);
  assert.match(pushJobs, /if: env\.OPERATION == 'apply-and-verify'/);
  assert.doesNotMatch(pushJobs, /github\.event\.inputs/);
});

test("receipt reports checked-out head and causal result", () => {
  assert.match(workflow, /execFileSync\('git', \['rev-parse', 'HEAD'\]/);
  assert.match(workflow, /actual_sha: actualSha/);
  assert.doesNotMatch(workflow, /actual_sha: process\.env\.GITHUB_SHA/);
  assert.match(workflow, /result,/);
  assert.match(workflow, /failure_stage: result === 'pass' \? null : stage/);
  assert.match(
    workflow,
    /echo guard > duo-authority-production-receipt\/stage\.txt/,
  );
  assert.match(
    workflow,
    /echo dry-run > duo-authority-production-receipt\/stage\.txt/,
  );
});

test("trusted rollout remains version-preserving and fail-closed", () => {
  assert.match(workflow, /hfndwqfghyomwapqsked/);
  assert.match(workflow, /migration fetch --linked --yes/);
  assert.match(workflow, /--assert-repository-list-blocked/);
  assert.match(workflow, /db push --linked --dry-run --skip-vault/);
  assert.match(workflow, /db push --linked --skip-vault/);
  assert.doesNotMatch(
    workflow,
    /--include-all|migration repair|schema_migrations/i,
  );
  assert.match(workflow, /supabase functions deploy duo-authority/);
  assert.match(workflow, /DUNGEON_VEIL_SMOKE_HOST_EMAIL/);
  assert.match(workflow, /DUNGEON_VEIL_SMOKE_GUEST_EMAIL/);
  assert.match(workflow, /DUNGEON_VEIL_SMOKE_OUTSIDER_EMAIL/);
});

test("production baseline and repository-source mapping are exact", () => {
  assert.equal(productionHistory.migrations.length, 71);
  assert.deepEqual(productionHistory.migrations.at(-1), {
    version: "20261026113943",
    name: "harden_social_profile_trust_boundary",
    repository_source: {
      path: "supabase/migrations/20261025132500_harden_social_profile_trust_boundary.sql",
      version: "20261025132500",
      sql_sha256: createHash("sha256")
        .update(
          fs.readFileSync(
            "supabase/migrations/20261025132500_harden_social_profile_trust_boundary.sql",
          ),
        )
        .digest("hex"),
    },
  });
});

test("pending inventory uses the reviewed exact set difference", () => {
  assert.doesNotMatch(planValidator, />\s*REMOTE_BASELINE_VERSIONS\.at\(-1\)/);
  assert.match(planValidator, /const rolloutScope = sortedUnique/);
  assert.match(planValidator, /const appliedRepositoryVersions = new Set/);
  assert.match(planValidator, /const pendingMigrations = presentScope\.filter/);
  assert.match(
    execFileSync(
      process.execPath,
      ["scripts/verify-duo-authority-production-plan.mjs"],
      { encoding: "utf8" },
    ),
    /71 fetched baseline versions, 8 pending versions/,
  );
});

test("all migration-state validators prove the 71 plus 8 rollout contract", () => {
  const baseline = productionHistory.migrations.map(({ version }) => version);
  const pending = duoMigrations.map((name) => name.slice(0, 14));
  const postApply = [...baseline, ...pending].sort();
  const repository = fs
    .readdirSync("supabase/migrations")
    .filter((name) => /^20\d{12}_.+\.sql$/.test(name))
    .map((name) => name.slice(0, 14))
    .sort();
  const fixtureDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "duo-rollout-contract-"),
  );
  const writeFixture = (name, value) => {
    const fixturePath = path.join(fixtureDirectory, name);
    fs.writeFileSync(fixturePath, value);
    return fixturePath;
  };

  try {
    const args = [
      "scripts/verify-duo-authority-production-plan.mjs",
      "--assert-repository-list-blocked",
      writeFixture("repository.txt", migrationList(repository, baseline)),
      "--fetched-list",
      writeFixture("fetched.txt", migrationList(baseline, baseline)),
      "--pre-list",
      writeFixture("pre.txt", migrationList(postApply, baseline)),
      "--dry-run",
      writeFixture("dry-run.txt", pending.join("\n")),
      "--post-list",
      writeFixture("post.txt", migrationList(postApply, postApply)),
    ];
    assert.match(
      execFileSync(process.execPath, args, { encoding: "utf8" }),
      /root history blocked, 71 fetched baseline versions, 8 pending versions/,
    );
  } finally {
    fs.rmSync(fixtureDirectory, { recursive: true, force: true });
  }
});
