import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

export const PROJECT_REF = "hfndwqfghyomwapqsked";
export const BASELINE_VERSION = "20260906214205";
export const EXPECTED_MIGRATIONS = Object.freeze([
  "20260911133000_trust_duo_encounter_completion.sql",
  "20260911160500_lock_down_trusted_coop_completion.sql",
  "20261003052000_add_duo_authority_bootstrap.sql",
  "20261003142500_connect_duo_authority_completion.sql",
  "20261004154000_add_duo_authority_build_profiles.sql",
  "20261004230000_bind_duo_authority_build_snapshot.sql",
  "20261008001000_complete_duo_authority_lifecycle.sql",
  "20261011211500_expose_my_duo_authority_binding.sql",
]);

const EXPECTED_VERSIONS = EXPECTED_MIGRATIONS.map((name) => name.slice(0, 14));
const root = path.resolve(import.meta.dirname, "..");

function stripAnsi(value) {
  return value.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "");
}

function migrationRows(value) {
  return stripAnsi(value)
    .split(/\r?\n/)
    .map((line) => {
      const columns = line.split("|").map((column) => column.trim());
      const versions = [...line.matchAll(/\b20\d{12}\b/g)].map(
        (match) => match[0],
      );
      return { line, columns, versions };
    });
}

function assertExactPostBaselineVersions(versions, label) {
  const observed = [
    ...new Set(versions.filter((version) => version > BASELINE_VERSION)),
  ].sort();
  assert.deepEqual(
    observed,
    EXPECTED_VERSIONS,
    `${label} must contain exactly the expected eight post-baseline versions`,
  );
}

function validateLocalInventory() {
  const names = fs
    .readdirSync(path.join(root, "supabase/migrations"))
    .filter(
      (name) =>
        /^20\d{12}_.+\.sql$/.test(name) && name.slice(0, 14) > BASELINE_VERSION,
    )
    .sort();
  assert.deepEqual(
    names,
    EXPECTED_MIGRATIONS,
    "local post-baseline migration inventory drifted",
  );
}

function validatePreList(file) {
  const rows = migrationRows(fs.readFileSync(file, "utf8"));
  for (const version of EXPECTED_VERSIONS) {
    const row = rows.find((candidate) => candidate.columns[0] === version);
    assert.ok(
      row,
      `preflight migration list is missing local version ${version}`,
    );
    assert.ok(
      !row.columns[1],
      `version ${version} is already recorded remotely; refuse a first rollout`,
    );
  }
  assertExactPostBaselineVersions(
    rows.flatMap((row) => row.versions),
    "preflight migration list",
  );
}

function validateDryRun(file) {
  const rows = migrationRows(fs.readFileSync(file, "utf8"));
  assertExactPostBaselineVersions(
    rows.flatMap((row) => row.versions),
    "db push dry-run",
  );
}

function validatePostList(file) {
  const rows = migrationRows(fs.readFileSync(file, "utf8"));
  for (const version of EXPECTED_VERSIONS) {
    const row = rows.find(
      (candidate) =>
        candidate.columns[0] === version && candidate.columns[1] === version,
    );
    assert.ok(row, `remote history does not preserve exact version ${version}`);
  }
  assertExactPostBaselineVersions(
    rows.flatMap((row) => row.versions),
    "post-apply migration list",
  );
}

validateLocalInventory();
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 2) {
  const flag = args[index];
  const file = args[index + 1];
  assert.ok(file, `${flag} requires a file path`);
  if (flag === "--pre-list") validatePreList(file);
  else if (flag === "--dry-run") validateDryRun(file);
  else if (flag === "--post-list") validatePostList(file);
  else throw new Error(`unknown argument: ${flag}`);
}

console.log(
  `Duo authority production plan validated for ${PROJECT_REF}: ${EXPECTED_VERSIONS.join(", ")}`,
);
