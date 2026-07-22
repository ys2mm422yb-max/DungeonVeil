import { readFile } from 'node:fs/promises';

const [config, smoke, worldBossSmoke, visualAudit, roomAudit, visualReadiness, mainMenuReference, mainEntry, transientAudit, reducedMotionAudit, equipmentResponsive, packageJson, fullGameWorkflow, checkWorkflow, ciWorkflow] = await Promise.all([
  readFile(new URL('../playwright.regression.config.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../tests/full-game-smoke.spec.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../tests/worldboss-block1.spec.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../tests/visual-audit.spec.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../tests/visual-room-chunks.spec.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../tests/visual-render-readiness.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../tests/main-menu-reference.spec.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../src/main.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../tests/transient-ui-visual-audit.spec.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../tests/reduced-motion-menu.spec.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../tests/equipment-responsive.spec.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../package.json', import.meta.url), 'utf8'),
  readFile(new URL('../../../.github/workflows/full-game-regression.yml', import.meta.url), 'utf8'),
  readFile(new URL('../../../.github/workflows/dungeon-rpg-check.yml', import.meta.url), 'utf8'),
  readFile(new URL('../../../.github/workflows/dungeon-rpg-ci.yml', import.meta.url), 'utf8'),
]);

const supportedProjects = ['iphone-webkit', 'android-chromium', 'ipad-portrait-webkit', 'android-tablet-chromium'];
const smokeProjects = ['iphone-webkit', 'android-chromium'];
const unsupportedProjectPattern = /desktop-chromium|ipad-landscape-webkit/;

const requiredFlows = [
  'main-menu-profile-badge',
  'Höchstes Kapitel',
  'Höchster Raum',
  'Inventar',
  'Nachrichten aus dem Schleier',
  'permission denied',
  'Gefährten im Schleier',
  'Gilde gründen',
  'Das nächste Weltereignis',
  'Aufträge',
  'Kodex',
  'hobbyloser Typ',
  'run-hud',
  'run-joystick',
  'run-dash-control',
];
const requiredVisualMarkers = [
  'visual-main-menu-',
  'visual-main-menu-no-companion-',
  'visual-main-menu-companion-',
  'visual-profile-',
  'visual-equipment-bow-',
  'visual-equipment-quiver-',
  'visual-equipment-armor-',
  'visual-equipment-relic-',
  'visual-equipment-companion-',
  'visual-codex-',
  'visual-quests-',
  'visual-mailbox-',
  'visual-friends-',
  'visual-guild-',
  'visual-online-cloud-',
  'visual-coop-lobby-',
  'visual-worldboss-',
  'visual-settings-',
  'visual-credits-',
];
const requiredRoomMarkers = [
  'FULL_ROOM_CHUNKS',
  '[1, 10]',
  '[11, 20]',
  '[21, 30]',
  '[31, 40]',
  '[41, 50]',
  '[1, 5, 9, 10, 11, 19, 20, 21, 29, 30, 31, 39, 40, 41, 49, 50]',
  "['iphone-webkit', 'android-chromium']",
  "['ipad-portrait-webkit', 'android-tablet-chromium']",
  'fresh WebGL context',
  'visual-room-',
  'getByText(`RAUM ${room}/50`',
];
const requiredPaintedEvidenceMarkers = [
  'canvasFrameEvidence',
  'MIN_LIT_COVERAGE',
  'MIN_SAMPLE_PNG_BYTES',
  'createImageBitmap(element)',
  "sample.toBlob(blob => resolve(blob?.size || 0), 'image/png')",
  'frameHash',
  'WebGL canvas remained blank or insufficiently painted',
  'waitForPaintedCanvas',
  'waitForLiveMenuPaint',
];
const requiredTransientMarkers = [
  "qa: 'states'",
  "['pause'",
  "['levelup'",
  "['gameover'",
  "['new-run'",
  "['unlock'",
  "qa: 'tutorial'",
  "qa: 'profiles'",
  "profile, capture: '1'",
  'visual-profile-${profile}-qa-',
  'waitForFiniteAnimations',
  'getAnimations({ subtree: true })',
  'Promise.allSettled(animations.map(animation => animation.finished))',
  'expectActuallyPainted',
  'Number(style.opacity) < 0.95',
  'Transient surface existed in the DOM but was not visually painted',
  'WÄHLE DEINE GABE',
  'RUN BEENDET',
  "toHaveText('NEUER RUN')",
];
const requiredReducedMotionMarkers = [
  "emulateMedia({ reducedMotion: 'reduce' })",
  'main-menu-reduced-motion-fallback',
  'visual-main-menu-reduced-motion-',
  'static-ranger-and-portal-fallback',
];
const requiredEquipmentMarkers = [
  'equipment-category-tabs',
  'data-equipment-preview-kind="bow"',
  'shellWidth',
  'previewWidth',
  'toBeGreaterThanOrEqual(700)',
  'equipment-responsive-',
];
const requiredOptimizedWorkflowMarkers = [
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
  "github.event.pull_request.draft == false",
  "github.ref_name == 'fix/mobile-telegraphs-room-21-50-balance'",
  "GREP_INVERT='rooms 1-50 produce stable visual evidence across the full run|full room visual evidence'",
  'Test complete non-room regression on current portrait mobile device',
  'full-game-regression-results-${{ matrix.project }}',
  'retention-days: 1',
  'retention-days: 3',
  'retention-days: 5',
  'compression-level: 9',
];

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

for (const project of supportedProjects) {
  if (!config.includes(project)) failures.push(`missing browser project: ${project}`);
}
for (const flow of requiredFlows) {
  if (!smoke.includes(flow)) failures.push(`missing smoke flow marker: ${flow}`);
}
requireMarkers(worldBossSmoke, 'world-boss smoke', [
  'worldboss-visual-qa',
  'worldboss-dragon-load-error',
  'run-joystick',
  'run-dash-button',
  'Dragon.fbx',
]);
requireMarkers(visualAudit, 'visual audit', requiredVisualMarkers);
requireMarkers(roomAudit, 'chunked room audit', requiredRoomMarkers);
requireMarkers(visualReadiness, 'painted WebGL evidence', requiredPaintedEvidenceMarkers);
requireMarkers(transientAudit, 'painted German transient audit', requiredTransientMarkers);
requireMarkers(reducedMotionAudit, 'reduced-motion audit', requiredReducedMotionMarkers);
requireMarkers(equipmentResponsive, 'responsive equipment', requiredEquipmentMarkers);
requireMarkers(fullGameWorkflow, 'optimized portrait workflow', requiredOptimizedWorkflowMarkers);

const smokeMatrix = extractProjects(jobSection(fullGameWorkflow, 'browser-smoke'));
const fullMatrix = extractProjects(jobSection(fullGameWorkflow, 'browser-regression'));
if (!sameProjects(smokeMatrix, smokeProjects)) failures.push(`draft smoke matrix differs from the supported phone pair: ${smokeMatrix.join(', ')}`);
if (!sameProjects(fullMatrix, supportedProjects)) failures.push(`full regression matrix differs from the supported portrait matrix: ${fullMatrix.join(', ')}`);
if (unsupportedProjectPattern.test(config)) failures.push('regression config still includes unsupported desktop or playable landscape projects');
if (unsupportedProjectPattern.test(fullGameWorkflow)) failures.push('full-game workflow still executes unsupported desktop or playable landscape jobs');
if (fullGameWorkflow.includes('desktop-room-regression:')) failures.push('full-game regression still duplicates dedicated room evidence');
if (/Build current branch for browser regression|Build current branch for desktop room evidence/.test(fullGameWorkflow)) failures.push('browser jobs still rebuild production output instead of reusing the shared build');
if (!fullGameWorkflow.includes("if: steps.browser-cache.outputs.cache-hit != 'true'")) failures.push('browser engine cache misses are not handled deterministically');
if (!fullGameWorkflow.includes("github.event_name == 'workflow_dispatch' && inputs.full_evidence == true")) failures.push('manual full-evidence execution is missing');
if (!fullGameWorkflow.includes("github.event_name == 'pull_request' && github.event.pull_request.draft == true")) failures.push('draft pull requests do not select the compact phone smoke path');
if (fullGameWorkflow.includes('continue-on-error: true\n        run: node artifacts/dungeon-rpg/scripts/validate-full-game-regression-scope.mjs')) failures.push('regression scope validator is allowed to fail silently');

if (!visualAudit.includes("from './visual-render-readiness.mjs'") || !visualAudit.includes('waitForLiveMenuPaint(page)') || !visualAudit.includes('waitForPaintedCanvas(page)')) failures.push('visual audit does not enforce painted WebGL evidence');
if (!visualAudit.includes('getByText(`RAUM ${room}/50`')) failures.push('visual audit does not validate the literal visible room HUD label');
if (!roomAudit.includes("from './visual-render-readiness.mjs'") || !roomAudit.includes('waitForPaintedCanvas(page)')) failures.push('chunked room audit does not reject blank WebGL frames');
if (!mainMenuReference.includes("from './visual-render-readiness.mjs'") || !mainMenuReference.includes('waitForLiveMenuPaint(page')) failures.push('main-menu reference does not require a painted live Ranger frame');
if (!mainEntry.includes("if (qaMode === 'states') localStorage.setItem('dungeon-veil-language', 'de')")) failures.push('transient QA language is not seeded before the LanguageProvider renders');
if (!transientAudit.includes('await waitForFiniteAnimations(root)') || !transientAudit.includes('await ready();\n    await capture')) failures.push('transient evidence does not wait for completed animations and painted ancestors before capture');
if (visualAudit.includes("getByTestId('live-hybrid-main-menu-frame').screenshot")) failures.push('menu animation evidence reverted to clipped element screenshots');
if (visualReadiness.includes('canvas.screenshot()')) failures.push('painted WebGL readiness reverted to an element screenshot that waits for an animated canvas to become stable');
if (visualAudit.includes('new RegExp(`RAUM') || roomAudit.includes('new RegExp(`RAUM')) failures.push('room HUD validation reverted to an escape-sensitive dynamic regular expression');
if (!config.includes('visual-audit')) failures.push('visual audit is not part of the browser regression matrix');
if (!config.includes('visual-room-chunks')) failures.push('chunked room visual regression is not part of the browser matrix');
if (!config.includes('transient-ui-visual-audit')) failures.push('transient UI visual regression is not part of the browser matrix');
if (!config.includes('equipment-responsive')) failures.push('responsive equipment regression is not part of the browser matrix');
if (!config.includes('reduced-motion-menu')) failures.push('reduced-motion menu regression is not part of the browser matrix');
for (const command of ['audit:assets', 'audit:social', 'audit:rooms', 'typecheck', 'build']) {
  if (!packageJson.includes(`"${command}"`)) failures.push(`missing package command: ${command}`);
}
if (!checkWorkflow.includes('Room and collision audit')) failures.push('standard room/collision check is missing');
if (!ciWorkflow.includes('audit:assets') && !ciWorkflow.includes('Asset')) failures.push('standard CI asset validation is missing');
if (!smoke.includes('pageerror') || !smoke.includes('response.status() >= 400')) failures.push('runtime crash or HTTP failure monitoring is missing');
if (!smoke.includes('scrollWidth') || !smoke.includes('horizontal overflow')) failures.push('responsive overflow validation is missing');
if (!visualAudit.includes('pageerror') || !visualAudit.includes('WebGL.*lost')) failures.push('visual audit runtime monitoring is missing');
if (!roomAudit.includes('pageerror') || !roomAudit.includes('WebGL.*lost')) failures.push('chunked room audit runtime monitoring is missing');
if (!transientAudit.includes('pageerror') || !transientAudit.includes('response.status() >= 400')) failures.push('transient audit runtime monitoring is missing');

if (failures.length) {
  console.error(`Full-game regression scope audit failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Full-game regression scope audit passed: draft commits reuse one Pages build for compact iPhone and Android phone smoke checks, while ready PRs, manual full-evidence runs and the fixed target branch retain the four supported portrait mobile projects; complete runtime evidence remains responsible for exhaustive room media without desktop gameplay.');
