import { readFile } from 'node:fs/promises';

const [config, smoke, worldBossSmoke, roomAudit, packageJson, fullGameWorkflow, completeRuntimeWorkflow, fullGameSelector] = await Promise.all([
  readFile(new URL('../playwright.regression.config.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../tests/full-game-smoke.spec.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../tests/worldboss-block1.spec.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../tests/visual-room-chunks.spec.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../package.json', import.meta.url), 'utf8'),
  readFile(new URL('../../../.github/workflows/full-game-regression.yml', import.meta.url), 'utf8'),
  readFile(new URL('../../../.github/workflows/complete-runtime-evidence-qa.yml', import.meta.url), 'utf8'),
  readFile(new URL('../../../.github/scripts/select-full-game-regression-mode.mjs', import.meta.url), 'utf8'),
]);

const supportedProjects = ['iphone-webkit', 'android-chromium', 'ipad-portrait-webkit', 'android-tablet-chromium'];
const smokeProjects = ['iphone-webkit', 'android-chromium'];
const unsupportedProjectPattern = /desktop-chromium|ipad-landscape-webkit/;
const failures = [];

const requireMarkers = (source, label, markers) => {
  for (const marker of markers) {
    if (!source.includes(marker)) failures.push(`missing ${label} marker: ${marker}`);
  }
};
const jobSection = (source, jobName) => {
  const token = `\n  ${jobName}:\n`;
  const start = source.indexOf(token);
  if (start < 0) return '';
  const bodyStart = start + token.length;
  const rest = source.slice(bodyStart);
  const next = rest.search(/\n  [a-zA-Z0-9_-]+:\n/);
  return next < 0 ? source.slice(start) : source.slice(start, bodyStart + next);
};
const extractProjects = source => [...source.matchAll(/- project:\s*([^\s]+)/g)].map(match => match[1]);
const sameProjects = (actual, expected) => actual.length === expected.length && actual.every((project, index) => project === expected[index]);

requireMarkers(config, 'browser project', supportedProjects);
requireMarkers(config, 'regression suite', [
  'full-game-smoke',
  'worldboss-block1',
  'visual-audit',
  'visual-room-chunks',
  'transient-ui-visual-audit',
  'equipment-responsive',
  'reduced-motion-menu',
  'retries: 0',
]);
requireMarkers(smoke, 'combat smoke', [
  "test('new run renders responsive combat controls and stays stable'",
  'run-hud',
  'run-health-panel',
  'run-joystick',
  'run-dash-button',
  'run-dash-state',
  'run-joystick-floating-zone',
  'assertNoHorizontalOverflow',
  'runtime-issues.json',
  'pageerror',
  'response.status() >= 400',
]);
requireMarkers(worldBossSmoke, 'world-boss smoke', [
  "test('world boss loads the original FBX and accepts movement plus dash'",
  'worldboss-visual-qa',
  'worldboss-dragon-load-error',
  'run-joystick',
  'run-dash-button',
  'Dragon.fbx',
  'mobile landscape blocks gameplay and the same portrait fight resumes',
  'portrait-orientation-blocker',
]);
requireMarkers(roomAudit, 'room evidence source', [
  'FULL_ROOM_CHUNKS',
  '[1, 10]',
  '[11, 20]',
  '[21, 30]',
  '[31, 40]',
  '[41, 50]',
  "['iphone-webkit', 'android-chromium']",
  "['ipad-portrait-webkit', 'android-tablet-chromium']",
  'fresh WebGL context',
  'visual-room-',
]);
requireMarkers(fullGameWorkflow, 'optimized workflow', [
  'workflow_dispatch:',
  'ready_for_review',
  'cancel-in-progress: true',
  'Build GitHub Pages production output once',
  'fgr-plan:',
  'Resolve fail-closed exact-head regression mode',
  'git diff --name-only "$PR_BASE_SHA...$PR_HEAD_SHA"',
  'node scripts/validate-adaptive-test-plan.mjs',
  'full-game-regression-binding-history.txt',
  'full-game-regression-selection-${{ github.event.pull_request.head.sha || github.sha }}',
  "needs.fgr-plan.outputs.mode != 'omit'",
  "needs.fgr-plan.outputs.mode == 'smoke'",
  "needs.fgr-plan.outputs.mode == 'full'",
  'dungeon-veil-pages-build-${{ github.sha }}',
  'browser-smoke:',
  'max-parallel: 2',
  'tests/full-game-smoke.spec.mjs',
  'tests/worldboss-block1.spec.mjs',
  'new run renders responsive combat controls and stays stable|world boss',
  'Restore browser engine cache',
  'actions/download-artifact@v4',
  'browser-regression:',
  "GREP_INVERT='rooms 1-50 produce stable visual evidence across the full run|full room visual evidence'",
  'Test complete non-room regression on current portrait mobile device',
  'full-game-regression-results-${{ matrix.project }}',
  'prepare-player-death-success-evidence.mjs --self-test',
  'Prepare focused successful solo-death evidence',
  'steps.browser-tests.outcome == \'success\'',
  "matrix.project == 'android-chromium' || matrix.project == 'android-tablet-chromium'",
  'player-death-success-video-${{ github.event.pull_request.head.sha }}-${{ matrix.project }}',
  'player-death-success-proof-${{ github.event.pull_request.head.sha }}-${{ matrix.project }}',
  'assert-artifact-budget.mjs',
  '--max-mb 25',
  'if-no-files-found: error',
  'retention-days: 1',
  'retention-days: 3',
  'retention-days: 5',
  'compression-level: 9',
]);
requireMarkers(fullGameSelector, 'adaptive Full Game Regression selector', [
  'safe_contract_only_diff',
  'adaptive_plan_invalid_fail_closed',
  'binding_history_',
  'unsafe_changed_files_fail_closed',
  'non_pull_request_full',
  'changed_files_sha256',
  'Adaptive Full Game Regression selector self-test passed.',
]);
requireMarkers(completeRuntimeWorkflow, 'complete runtime delegation', [
  'types: [opened, synchronize, reopened, ready_for_review]',
  "if: github.event_name != 'pull_request' || github.event.pull_request.draft == false",
  'cancel-in-progress: true',
  'complete-runtime-manifest-${{ matrix.project }}',
  'complete-runtime-evidence-${{ matrix.project }}',
  'tests/complete-runtime-evidence.spec.mjs',
  'tests/post-clear-player-hazards.spec.mjs',
  'tests/atomic-room-readiness.spec.mjs',
  'tests/worldboss-block1.spec.mjs',
]);

const smokeMatrix = extractProjects(jobSection(fullGameWorkflow, 'browser-smoke'));
const fullMatrix = extractProjects(jobSection(fullGameWorkflow, 'browser-regression'));
if (!sameProjects(smokeMatrix, smokeProjects)) failures.push(`draft smoke matrix differs from the supported portrait phone pair: ${smokeMatrix.join(', ')}`);
if (!sameProjects(fullMatrix, supportedProjects)) failures.push(`full regression matrix differs from the supported portrait matrix: ${fullMatrix.join(', ')}`);
if (unsupportedProjectPattern.test(config)) failures.push('regression config still includes unsupported desktop or playable landscape projects');
if (unsupportedProjectPattern.test(fullGameWorkflow)) failures.push('full-game workflow still executes unsupported desktop or playable landscape jobs');
if (unsupportedProjectPattern.test(completeRuntimeWorkflow)) failures.push('complete-runtime workflow still executes unsupported desktop or playable landscape jobs');
if (fullGameWorkflow.includes('desktop-room-regression:')) failures.push('full-game regression still duplicates exhaustive room evidence');
if (/Build current branch for browser regression|Build current branch for desktop room evidence/.test(fullGameWorkflow)) failures.push('browser jobs still rebuild production output instead of reusing the shared build');
if (!fullGameWorkflow.includes("if: steps.browser-cache.outputs.cache-hit != 'true'")) failures.push('browser engine cache misses are not handled deterministically');
if (!fullGameSelector.includes("eventName: 'workflow_dispatch'")) failures.push('manual execution is not proven to retain full coverage');

const planJob = jobSection(fullGameWorkflow, 'fgr-plan');
const staticJob = jobSection(fullGameWorkflow, 'static-regression');
for (const expensiveMarker of ['pnpm install', 'pnpm/action-setup', 'actions/setup-node', 'playwright install', ' run build']) {
  if (planJob.includes(expensiveMarker)) failures.push(`FGR plan job performs expensive work before omit resolution: ${expensiveMarker}`);
}
if (!staticJob.includes("if: needs.fgr-plan.outputs.mode != 'omit'")) failures.push('static install/build work is not guarded by the resolved non-omit mode');
if (!fullGameWorkflow.includes('actions: read')) failures.push('binding-history lookup lacks explicit read permission');
if (!fullGameWorkflow.includes('persist-credentials: false')) failures.push('exact-head plan checkout still persists GitHub credentials');

for (const command of ['audit:assets', 'audit:social', 'audit:rooms', 'typecheck', 'build']) {
  if (!packageJson.includes(`"${command}"`)) failures.push(`missing package command: ${command}`);
}

if (failures.length) {
  console.error(`Full-game regression contract failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Full-game regression contract passed: exact-head planning can omit only allowlisted contract/docs PRs before install/build, unsafe Draft PRs retain the two-phone smoke, and unsafe Ready PRs plus manual/target runs retain all four portrait projects without desktop gameplay.');
