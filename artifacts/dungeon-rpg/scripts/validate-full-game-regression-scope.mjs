import { readFile } from 'node:fs/promises';

const [config, smoke, worldBossSmoke, roomAudit, packageJson, fullGameWorkflow, completeRuntimeWorkflow] = await Promise.all([
  readFile(new URL('../playwright.regression.config.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../tests/full-game-smoke.spec.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../tests/worldboss-block1.spec.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../tests/visual-room-chunks.spec.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../package.json', import.meta.url), 'utf8'),
  readFile(new URL('../../../.github/workflows/full-game-regression.yml', import.meta.url), 'utf8'),
  readFile(new URL('../../../.github/workflows/complete-runtime-evidence-qa.yml', import.meta.url), 'utf8'),
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
  'dungeon-veil-pages-build-${{ github.sha }}',
  'browser-smoke:',
  'max-parallel: 2',
  'tests/full-game-smoke.spec.mjs',
  'tests/worldboss-block1.spec.mjs',
  'new run renders responsive combat controls and stays stable|world boss',
  'Restore browser engine cache',
  'actions/download-artifact@v4',
  'browser-regression:',
  "github.event.pull_request.draft == true",
  "github.event.pull_request.draft == false",
  "github.ref_name == 'fix/mobile-telegraphs-room-21-50-balance'",
  "GREP_INVERT='rooms 1-50 produce stable visual evidence across the full run|full room visual evidence'",
  'Test complete non-room regression on current portrait mobile device',
  'full-game-regression-results-${{ matrix.project }}',
  'retention-days: 1',
  'retention-days: 3',
  'retention-days: 5',
  'compression-level: 9',
]);
requireMarkers(completeRuntimeWorkflow, 'complete runtime delegation', [
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
if (fullGameWorkflow.includes('desktop-room-regression:')) failures.push('full-game regression still duplicates exhaustive room evidence');
if (/Build current branch for browser regression|Build current branch for desktop room evidence/.test(fullGameWorkflow)) failures.push('browser jobs still rebuild production output instead of reusing the shared build');
if (!fullGameWorkflow.includes("if: steps.browser-cache.outputs.cache-hit != 'true'")) failures.push('browser engine cache misses are not handled deterministically');
if (!fullGameWorkflow.includes("github.event_name == 'workflow_dispatch' && inputs.full_evidence == true")) failures.push('manual full-evidence execution is missing');

for (const command of ['audit:assets', 'audit:social', 'audit:rooms', 'typecheck', 'build']) {
  if (!packageJson.includes(`"${command}"`)) failures.push(`missing package command: ${command}`);
}

if (failures.length) {
  console.error(`Full-game regression contract failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Full-game regression contract passed: draft commits reuse one Pages build for compact iPhone and Android phone smoke checks; ready PRs, manual full-evidence runs and the fixed target branch retain the four supported portrait mobile projects; exhaustive room media remains delegated to complete runtime evidence without desktop gameplay.');
