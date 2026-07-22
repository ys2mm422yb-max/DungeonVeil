import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const supportedProjects = [
  'iphone-webkit',
  'android-chromium',
  'ipad-portrait-webkit',
  'android-tablet-chromium',
];
const unsupportedProjectPattern = /desktop-chromium|ipad-landscape-webkit/;

const [
  regressionConfig,
  completeRuntimeConfig,
  smoke,
  regressionWorkflow,
  completeRuntimeWorkflow,
  pagesWorkflow,
] = await Promise.all([
  read('../playwright.regression.config.mjs'),
  read('../playwright.complete-runtime.config.mjs'),
  read('../tests/full-game-smoke.spec.mjs'),
  read('../../../.github/workflows/full-game-regression.yml'),
  read('../../../.github/workflows/complete-runtime-evidence-qa.yml'),
  read('../../../.github/workflows/dungeon-veil-pages.yml'),
]);

const extractConfigProjects = source => {
  const projectsSection = source.split('projects: [')[1]?.split(/\n\s*\],?\s*\}\);/)[0] ?? '';
  return [...projectsSection.matchAll(/name:\s*'([^']+)'/g)].map(match => match[1]);
};

const extractWorkflowProjects = source =>
  [...source.matchAll(/- project:\s*([^\s]+)/g)].map(match => match[1]);

const sameProjects = projects =>
  projects.length === supportedProjects.length
  && projects.every((project, index) => project === supportedProjects[index]);

const regressionProjects = extractConfigProjects(regressionConfig);
const completeRuntimeProjects = extractConfigProjects(completeRuntimeConfig);
const regressionWorkflowProjects = extractWorkflowProjects(regressionWorkflow);
const completeRuntimeWorkflowProjects = extractWorkflowProjects(completeRuntimeWorkflow);

const checks = [
  [sameProjects(regressionProjects), `regression config projects differ from the supported portrait matrix: ${regressionProjects.join(', ')}`],
  [sameProjects(completeRuntimeProjects), `complete-runtime config projects differ from the supported portrait matrix: ${completeRuntimeProjects.join(', ')}`],
  [sameProjects(regressionWorkflowProjects), `full-game workflow projects differ from the supported portrait matrix: ${regressionWorkflowProjects.join(', ')}`],
  [sameProjects(completeRuntimeWorkflowProjects), `complete-runtime workflow projects differ from the supported portrait matrix: ${completeRuntimeWorkflowProjects.join(', ')}`],
  [!unsupportedProjectPattern.test(regressionConfig) && !unsupportedProjectPattern.test(completeRuntimeConfig), 'browser configs still contain unsupported desktop or playable landscape projects'],
  [!unsupportedProjectPattern.test(regressionWorkflow) && !unsupportedProjectPattern.test(completeRuntimeWorkflow), 'browser workflows still contain unsupported desktop or playable landscape jobs'],
  [regressionConfig.includes('retries: 0') && completeRuntimeConfig.includes('retries: 0'), 'final browser evidence must fail on the first attempt without Playwright retries'],
  [regressionConfig.includes("screenshot: 'only-on-failure'") && regressionConfig.includes("trace: 'retain-on-failure'") && regressionConfig.includes("video: 'retain-on-failure'"), 'final regression failure evidence is incomplete'],
  [completeRuntimeConfig.includes("video: { mode: 'on'") && completeRuntimeConfig.includes("trace: 'retain-on-failure'") && completeRuntimeConfig.includes("screenshot: 'only-on-failure'"), 'complete runtime evidence does not retain successful video plus failure screenshots and traces'],
  [regressionConfig.includes('fullyParallel: false') && regressionConfig.includes('workers: process.env.CI ? 1 : undefined') && completeRuntimeConfig.includes('fullyParallel: false') && completeRuntimeConfig.includes('workers: 1'), 'final mobile device projects are not serialized to one WebGL-safe worker'],
  [smoke.includes('settings persist contrast, storage and joystick with standard UI size') && smoke.includes('profile-storage-settings') && smoke.includes('contrast-mode-high') && smoke.includes('joystick-mode-floating') && smoke.includes("textSize: 'standard'") && smoke.includes("getByTestId('text-size-large')).toHaveCount(0)"), 'final fixed-size settings and persistence flow is missing'],
  [smoke.includes('structured quest board') && smoke.includes('quest-board-toggle') && smoke.includes('quest-board-content') && smoke.includes('Aktive Aufträge|Active Quests') && smoke.includes('Erledigte Aufträge|Completed Quests'), 'final quest-board flow is missing'],
  [smoke.includes('responsive combat controls') && smoke.includes('run-health-panel') && smoke.includes('run-dash-state') && smoke.includes('run-joystick-floating-zone'), 'final mobile combat flow is missing'],
  [smoke.includes('assertNoHorizontalOverflow') && smoke.includes('runtime-issues.json'), 'final device flow does not check overflow or runtime errors'],
  [regressionWorkflow.includes('Build current branch for browser regression')
    && regressionWorkflow.includes('BASE_PATH=/DungeonVeil/ pnpm --dir artifacts/dungeon-rpg exec vite preview')
    && regressionWorkflow.includes('http://127.0.0.1:4173/DungeonVeil/')
    && regressionWorkflow.includes('visual-evidence-iphone-webkit')
    && regressionWorkflow.includes('visual-evidence-android-chromium')
    && regressionWorkflow.includes('visual-evidence-ipad-portrait-webkit')
    && regressionWorkflow.includes('visual-evidence-android-tablet-chromium')
    && regressionWorkflow.includes('full-game-regression-results-${{ matrix.project }}'), 'final regression does not serve the current Pages build and preserve split evidence for all four portrait mobile projects'],
  [completeRuntimeWorkflow.includes('Build current branch')
    && completeRuntimeWorkflow.includes('http://127.0.0.1:4173/DungeonVeil/')
    && completeRuntimeWorkflow.includes('complete-runtime-manifest-${{ matrix.project }}')
    && completeRuntimeWorkflow.includes('complete-runtime-evidence-${{ matrix.project }}')
    && completeRuntimeWorkflow.includes('tests/post-clear-player-hazards.spec.mjs')
    && completeRuntimeWorkflow.includes('tests/atomic-room-readiness.spec.mjs')
    && completeRuntimeWorkflow.includes('tests/worldboss-block1.spec.mjs'), 'complete runtime workflow no longer preserves per-device evidence for the required combat, recovery and orientation checks'],
  [pagesWorkflow.includes("- 'work/block-*'") && pagesWorkflow.includes('Write deployment marker') && pagesWorkflow.includes('Deploy Dungeon Veil Test Site'), 'final block branches are not deployed with a recorded commit'],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error(`Final device gate failed with ${failures.length} error(s):`);
  failures.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
}

console.log('Final device gate passed: iPhone, Android phone, iPad and Android tablet are covered in portrait with matching zero-retry configs and workflows, serialized WebGL execution, per-device evidence, fixed-size settings, storage, quests and responsive combat; desktop and playable landscape remain excluded.');
