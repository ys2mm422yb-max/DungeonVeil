import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const workflow = fs.readFileSync(
  ".github/workflows/duo-authority-production-rollout.yml",
  "utf8",
);

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
  assert.match(
    pushJobs,
    /credentialed rollout requires a trusted target push/,
  );
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
  assert.match(
    pushJobs,
    /workflow_run_attempt === String\(runAttempt\)/,
  );
  assert.match(pushJobs, /runAttempt !== 2/);
  assert.match(pushJobs, /production_authorization === 'approved'/);
  assert.match(pushJobs, /APPLY_ISSUE_461_TO_/);
  assert.match(pushJobs, /if: env\.OPERATION == 'apply-and-verify'/);
  assert.doesNotMatch(pushJobs, /github\.event\.inputs/);
});

test("receipt reports checked-out head and causal result", () => {
  assert.match(
    workflow,
    /execFileSync\('git', \['rev-parse', 'HEAD'\]/,
  );
  assert.match(workflow, /actual_sha: actualSha/);
  assert.doesNotMatch(workflow, /actual_sha: process\.env\.GITHUB_SHA/);
  assert.match(workflow, /result,/);
  assert.match(
    workflow,
    /failure_stage: result === 'pass' \? null : stage/,
  );
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
