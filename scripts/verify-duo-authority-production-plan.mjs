import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

export const PROJECT_REF = "hfndwqfghyomwapqsked";
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
const manifestPath = path.join(
  root,
  "scripts/duo-authority-production-history.json",
);

function stripAnsi(value) {
  return value.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "");
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function migrationVersionsIn(directory) {
  return fs
    .readdirSync(directory)
    .filter((name) => /^20\d{12}_.+\.sql$/.test(name))
    .map((name) => name.slice(0, 14))
    .sort();
}

function migrationSets(value) {
  const local = [];
  const remote = [];
  for (const line of stripAnsi(value).split(/\r?\n/)) {
    const columns = line.split("|").map((column) => column.trim());
    if (/^20\d{12}$/.test(columns[0] ?? "")) local.push(columns[0]);
    if (/^20\d{12}$/.test(columns[1] ?? "")) remote.push(columns[1]);
  }
  return { local: sortedUnique(local), remote: sortedUnique(remote) };
}

function readManifest() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.project_ref, PROJECT_REF);
  assert.ok(Array.isArray(manifest.migrations));
  const versions = manifest.migrations.map(({ version }) => version);
  assert.ok(versions.every((version) => /^20\d{12}$/.test(version)));
  assert.deepEqual(
    versions,
    sortedUnique(versions),
    "production history manifest must be sorted and unique",
  );
  assert.equal(
    versions.length,
    70,
    "production history manifest count drifted",
  );
  assert.equal(
    versions.at(-1),
    "20260906214205",
    "production history tail drifted",
  );
  return versions;
}

const REMOTE_BASELINE_VERSIONS = readManifest();
const POST_APPLY_VERSIONS = [
  ...REMOTE_BASELINE_VERSIONS,
  ...EXPECTED_VERSIONS,
].sort();

function validateRepositoryInventory() {
  const migrationDirectory = path.join(root, "supabase/migrations");
  const names = fs
    .readdirSync(migrationDirectory)
    .filter((name) => /^20\d{12}_.+\.sql$/.test(name))
    .sort();
  const postBaseline = names.filter(
    (name) => name.slice(0, 14) > REMOTE_BASELINE_VERSIONS.at(-1),
  );
  assert.deepEqual(
    postBaseline,
    EXPECTED_MIGRATIONS,
    "local post-baseline migration inventory drifted",
  );

  const repositoryVersions = migrationVersionsIn(migrationDirectory);
  const baselineIntersection = repositoryVersions.filter((version) =>
    REMOTE_BASELINE_VERSIONS.includes(version),
  );
  assert.deepEqual(
    baselineIntersection,
    [],
    "repository history unexpectedly changed; re-audit the isolated fetch plan",
  );
  return repositoryVersions;
}

const REPOSITORY_VERSIONS = validateRepositoryInventory();

function readList(file) {
  return migrationSets(fs.readFileSync(file, "utf8"));
}

function assertRemoteBaseline(remote, label) {
  assert.deepEqual(
    remote,
    REMOTE_BASELINE_VERSIONS,
    `${label} remote history must exactly match the reviewed production baseline`,
  );
}

function validateRepositoryList(file) {
  const { local, remote } = readList(file);
  assert.deepEqual(
    local,
    REPOSITORY_VERSIONS,
    "repository migration list local side drifted",
  );
  assertRemoteBaseline(remote, "repository migration list");
  const overlap = local.filter((version) => remote.includes(version));
  assert.deepEqual(
    overlap,
    [],
    "repository/live history is no longer the reviewed zero-overlap blocker",
  );
  throw new Error(
    "unsafe root db push blocked: production migration history is not a subset of repository migrations",
  );
}

function assertRepositoryListBlocked(file) {
  try {
    validateRepositoryList(file);
  } catch (error) {
    assert.match(String(error), /unsafe root db push blocked/);
    return;
  }
  assert.fail("repository migration list must fail closed");
}

function validateFetchedList(file) {
  const { local, remote } = readList(file);
  assertRemoteBaseline(remote, "fetched migration list");
  assert.deepEqual(
    local,
    REMOTE_BASELINE_VERSIONS,
    "migration fetch must materialize every reviewed remote version locally",
  );
}

function validatePreList(file) {
  const { local, remote } = readList(file);
  assertRemoteBaseline(remote, "isolated rollout pre-list");
  assert.deepEqual(
    local,
    POST_APPLY_VERSIONS,
    "isolated rollout workspace must contain the fetched baseline plus exactly eight new versions",
  );
}

function validateDryRun(file) {
  const versions = sortedUnique(
    [...stripAnsi(fs.readFileSync(file, "utf8")).matchAll(/\b20\d{12}\b/g)].map(
      (match) => match[0],
    ),
  );
  assert.deepEqual(
    versions,
    EXPECTED_VERSIONS,
    "db push dry-run must name exactly the eight reviewed migrations",
  );
}

function validatePostList(file) {
  const { local, remote } = readList(file);
  assert.deepEqual(
    local,
    POST_APPLY_VERSIONS,
    "post-apply local history drifted",
  );
  assert.deepEqual(
    remote,
    POST_APPLY_VERSIONS,
    "post-apply remote history did not preserve exact versions",
  );
}

const validators = new Map([
  ["--repository-list", validateRepositoryList],
  ["--assert-repository-list-blocked", assertRepositoryListBlocked],
  ["--fetched-list", validateFetchedList],
  ["--pre-list", validatePreList],
  ["--dry-run", validateDryRun],
  ["--post-list", validatePostList],
]);

const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 2) {
  const flag = args[index];
  const file = args[index + 1];
  assert.ok(file, `${flag} requires a file path`);
  const validate = validators.get(flag);
  assert.ok(validate, `unknown argument: ${flag}`);
  validate(file);
}

console.log(
  `Duo authority production plan validated for ${PROJECT_REF}: root history blocked, ${REMOTE_BASELINE_VERSIONS.length} fetched baseline versions, ${EXPECTED_VERSIONS.length} pending versions.`,
);
