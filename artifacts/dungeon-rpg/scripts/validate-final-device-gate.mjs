import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(relative, import.meta.url), 'utf8');
const supportedProjects = [
  'iphone-webkit',
  'android-chromium',
  'ipad-portrait-webkit',
  'android-tablet-chromium',
];
const smokeProjects = ['iphone-webkit', 'android-chromium'];
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
const jobSection = (source, jobName) => {
  const token = `\n  ${jobName}:\n`;
  const start = source.indexOf(token);
  if (start < 0) return '';
  const bodyStart = start + token.length;
  const rest = source.slice(bodyStart);
  const next = rest.search(/\n  [a-zA-Z0-9_-]+:\n/);
  return next < 0 ? source.slice(start) : source.slice(start, bodyStart + next);
};
const extractWorkflowProjects = source =>
  [...source.matchAll(/- project:\s*([^\s]+)/g)].map(match => match[1]);
const sameProjects = (projects, expected) =>
  projects.length === expected.length
  && projects.every((project, index) => project === expected[index]);

const regressionProjects = extractConfigProjects(regressionConfig);
const completeRuntimeProjects = extractConfigProjects(completeRuntimeConfig);
const smokeWorkflowProjects = extractWorkflowProjects(jobSection(regressionWorkflow, 'browser-smoke'));
const regressionWorkflowProjects = extractWorkflowProjects(jobSection(regressionWorkflow, 'browser-regression'));
const completeRuntimeWorkflowProjects = extractWorkflowProjects(jobSection(completeRuntimeWorkflow, 'complete-browser-evidence'));

const checks = [
  [sameProjects(regressionProjects, supportedProjects), `regression config projects differ from the supported portrait matrix: ${regressionProjects.join(', ')}`],
  [sameProjects(completeRuntimeProjects, supportedProjects), `complete-runtime config projects differ from the supported portrait matrix: ${completeRuntimeProjects.join(', ')}`],
  [sameProjects(smokeWorkflowProjects, smokeProjects), `compact smoke workflow projects differ from the supported portrait phone pair: ${smokeWorkflowProjects.join(', ')}`],
  [sameProjects(regressionWorkflowProjects, supportedProjects), `full-game workflow projects differ from the supported portrait matrix: ${regressionWorkflowProjects.join(', ')}`],
  [sameProjects(completeRuntimeWorkflowProjects, supportedProjects), `complete-runtime workflow projects differ from the supported portrait matrix: ${completeRuntimeWorkflowProjects.join(', ')}`],
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
  [regressionWorkflow.includes('Build GitHub Pages production output once')
    && regressionWorkflow.includes('dungeon-veil-pages-build-${{ github.sha }}')
    && regressionWorkflow.includes('actions/upload-artifact@v4')
    && regressionWorkflow.includes('actions/download-artifact@v4')
    && regressionWorkflow.includes('BASE_PATH=/DungeonVeil/ pnpm --dir artifacts/dungeon-rpg exec vite preview')
    && regressionWorkflow.includes('http://127.0.0.1:4173/DungeonVeil/')
    && regressionWorkflow.includes('browser-smoke:')
    && regressionWorkflow.includes('browser-regression:')
    && regressionWorkflow.includes("github.event.pull_request.draft == true")
    && regressionWorkflow.includes("github.event.pull_request.draft == false")
    && regressionWorkflow.includes("github.ref_name == 'fix/mobile-telegraphs-room-21-50-balance'")
    && regressionWorkflow.includes('full-game-regression-results-${{ matrix.project }}')
    && regressionWorkflow.includes("GREP_INVERT='rooms 1-50 produce stable visual evidence across the full run|full room visual evidence'")
    && !regressionWorkflow.includes('desktop-room-regression:')
    && !regressionWorkflow.includes('Build current branch for browser regression'), 'optimized regression does not reuse and serve the exact current Pages build while separating compact draft smoke from four-device final coverage'],
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

console.log('Final device gate passed: one exact Pages build feeds compact iPhone and Android phone draft smoke checks plus the retained four-device portrait mobile final regression; complete runtime evidence preserves exhaustive media, retries remain zero, WebGL execution stays serialized, and desktop or playable landscape remain excluded.');
