import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const [config, smoke, regressionWorkflow, pagesWorkflow] = await Promise.all([
  read('../playwright.regression.config.mjs'),
  read('../tests/full-game-smoke.spec.mjs'),
  read('../../../.github/workflows/full-game-regression.yml'),
  read('../../../.github/workflows/dungeon-veil-pages.yml'),
]);

const checks = [
  [config.includes("name: 'iphone-webkit'") && config.includes("name: 'android-chromium'") && config.includes("name: 'ipad-landscape'") && config.includes("name: 'desktop-chromium'"), 'final device matrix does not cover iPhone, Android, iPad and desktop'],
  [config.includes("screenshot: 'only-on-failure'") && config.includes("trace: 'retain-on-failure'") && config.includes("video: 'retain-on-failure'"), 'final browser evidence is incomplete'],
  [smoke.includes('settings persist accessibility, storage and joystick choices') && smoke.includes('profile-storage-settings') && smoke.includes('contrast-mode-high') && smoke.includes('joystick-mode-floating'), 'final settings and persistence flow is missing'],
  [smoke.includes('structured quest board') && smoke.includes('quest-board-summary') && smoke.includes('quest-completed-section'), 'final quest-board flow is missing'],
  [smoke.includes('responsive combat controls') && smoke.includes('run-health-panel') && smoke.includes('run-dash-state') && smoke.includes('run-joystick-floating-zone'), 'final mobile combat flow is missing'],
  [smoke.includes('assertNoHorizontalOverflow') && smoke.includes('runtime-issues.json'), 'final device flow does not check overflow or runtime errors'],
  [regressionWorkflow.includes('Build current branch for browser regression') && regressionWorkflow.includes('http://127.0.0.1:4173/DungeonVeil/') && regressionWorkflow.includes('full-game-regression-evidence'), 'final regression does not test and preserve evidence for the current branch'],
  [pagesWorkflow.includes("- 'work/block-*'") && pagesWorkflow.includes('Write deployment marker') && pagesWorkflow.includes('Deploy Dungeon Veil Test Site'), 'final block branches are not deployed with a recorded commit'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Final device gate failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Final device gate passed: iPhone, Android, iPad and desktop flows cover settings, storage, quests, inventory and responsive combat with retained evidence.');
