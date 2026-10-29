import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';

const root = process.cwd();
const workflowRoot = join(root, '.github', 'workflows');
const appRoot = join(root, 'artifacts', 'dungeon-rpg');
const execFileAsync = promisify(execFile);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function read(path) {
  return readFile(path, 'utf8');
}

function uploadStepBlocks(workflow) {
  return workflow
    .split(/\n(?=      - (?:name:|uses:))/g)
    .filter(block => block.includes('uses: actions/upload-artifact@'));
}

function conditionFor(block) {
  return block.match(/^\s+if:\s*(.+)$/m)?.[1]?.trim() ?? '';
}

function hasFailureOrManualGuard(condition) {
  return /failure|outcome\s*==\s*['"]failure['"]|workflow_dispatch/.test(condition);
}

const workflowNames = (await readdir(workflowRoot))
  .filter(name => /\.ya?ml$/i.test(name))
  .sort();
const workflows = new Map();
for (const name of workflowNames) {
  workflows.set(name, await read(join(workflowRoot, name)));
}

const clearRawDiagnosticPatterns = [
  /test-results\/\*\*/,
  /playwright-report\/\*\*/,
  /playwright-complete-runtime-report/,
  /trace\.zip/,
];

for (const [name, workflow] of workflows) {
  for (const block of uploadStepBlocks(workflow)) {
    const isRawDiagnosticUpload = clearRawDiagnosticPatterns.some(pattern => pattern.test(block));
    if (!isRawDiagnosticUpload) continue;
    const condition = conditionFor(block);
    assert(
      hasFailureOrManualGuard(condition),
      `${name}: raw Playwright diagnostics must be guarded by failure or workflow_dispatch, found condition: ${condition || '<none>'}`,
    );
  }
}

const configNames = (await readdir(appRoot))
  .filter(name => /^playwright.*\.config\.mjs$/i.test(name))
  .sort();
for (const name of configNames) {
  const config = await read(join(appRoot, name));
  const retryMatches = [...config.matchAll(/retries\s*:\s*([^,\n}]+)/g)];
  for (const match of retryMatches) {
    assert(match[1].trim() === '0', `${name}: Playwright retries must remain 0, found ${match[1].trim()}.`);
  }
}

const regressionConfig = await read(join(appRoot, 'playwright.regression.config.mjs'));
assert(regressionConfig.includes("trace: 'retain-on-failure'"), 'Regression config must retain traces only on failure.');
assert(regressionConfig.includes("video: 'retain-on-failure'"), 'Regression config must retain videos only on failure.');
assert(regressionConfig.includes('retries: 0'), 'Regression config must keep retries at 0.');

const completeConfig = await read(join(appRoot, 'playwright.complete-runtime.config.mjs'));
assert(completeConfig.includes('retries: 0'), 'Complete runtime config must keep retries at 0.');
assert(!completeConfig.includes("['html'"), 'Complete runtime must not generate an HTML report in normal PR evidence.');
assert(completeConfig.includes("size: { width: 360, height: 640 }"), 'Complete runtime review video size must remain 360x640.');

const playerDeathSpec = await read(join(appRoot, 'tests', 'player-death-state.spec.mjs'));

const completeWorkflow = workflows.get('complete-runtime-evidence-qa.yml') ?? '';
assert(completeWorkflow.includes('prepare-complete-runtime-review-media.mjs'), 'Complete runtime workflow must prepare compact review media.');
assert(completeWorkflow.includes('complete-runtime-review-screenshots-${{ matrix.project }}'), 'Complete runtime screenshots must remain separate.');
assert(completeWorkflow.includes('complete-runtime-review-videos-${{ matrix.project }}'), 'Complete runtime videos must remain separate.');
assert(completeWorkflow.includes("steps.runtime-tests.outcome == 'failure' || github.event_name == 'workflow_dispatch'"), 'Complete runtime raw diagnostics must remain failure/manual only.');

const fullGameWorkflow = workflows.get('full-game-regression.yml') ?? '';
assert(fullGameWorkflow.includes('dungeon-veil-pages-build-${{ github.sha }}'), 'Full Game Regression must reuse one exact-head production build.');
assert(fullGameWorkflow.includes("if: steps.browser-tests.outcome == 'failure'"), 'Full Game Regression traces must remain failure-only.');
assert(!fullGameWorkflow.includes('artifacts/dungeon-rpg/test-results/**\n'), 'Full Game Regression must not upload the whole test-results tree.');
assert(fullGameWorkflow.includes('prepare-player-death-success-evidence.mjs'), 'Full Game Regression must prepare focused successful player-death evidence.');
assert(fullGameWorkflow.includes('assert-artifact-budget.mjs'), 'Focused successful player-death evidence must enforce a fail-closed artifact budget.');
assert(fullGameWorkflow.includes('player-death-success-video-${{ github.event.pull_request.head.sha }}-${{ matrix.project }}'), 'Player-death success video must be a separate exact-head/project artifact.');
assert(fullGameWorkflow.includes('player-death-success-proof-${{ github.event.pull_request.head.sha }}-${{ matrix.project }}'), 'Player-death screenshot and trace must be a separate exact-head/project artifact.');
assert(fullGameWorkflow.includes('if-no-files-found: error'), 'Focused successful player-death evidence must fail when files are missing.');
assert(fullGameWorkflow.includes('retention-days: 14'), 'Focused successful player-death evidence must remain available for independent review.');

const productWorkflow = workflows.get('product-autopilot-qa.yml') ?? '';
assert(productWorkflow.includes('assert-artifact-budget.mjs'), 'Product Autopilot QA must enforce artifact budgets before upload.');
assert(productWorkflow.includes('--manifest artifacts/dungeon-rpg/test-results/product-artifact-budget-manifest-${{ matrix.project }}.json'), 'Product Autopilot QA must persist the exact post-compaction budget inventory before failing closed.');
assert(productWorkflow.includes('--file-manifest artifacts/dungeon-rpg/test-results/product-evidence-file-manifest-${{ matrix.project }}.json'), 'Product success budget must consume the canonical curated evidence manifest.');
assert(productWorkflow.includes(`--label "product-success-\${{ matrix.project }}"
          artifacts/dungeon-rpg/test-results/product-evidence-file-manifest-\${{ matrix.project }}.json`), 'Product success budget must include the curated manifest that is uploaded with the evidence.');
assert(productWorkflow.includes('Upload product evidence composition manifests'), 'Product Autopilot QA must publish its small evidence-composition diagnostics.');
assert(productWorkflow.includes("if: always() && steps.product-tests.outcome == 'success'"), 'Product evidence-composition diagnostics must remain available after a success-evidence budget failure.');
assert(productWorkflow.includes('product-autopilot-evidence-composition-${{ matrix.project }}'), 'Product evidence-composition diagnostics must be device-specific.');
assert(productWorkflow.includes('product-evidence-file-manifest-${{ matrix.project }}.json') && productWorkflow.includes('product-artifact-budget-manifest-${{ matrix.project }}.json'), 'Product evidence-composition artifact must contain both curated-media and complete-budget inventories.');
assert(productWorkflow.includes("if: steps.product-tests.outcome == 'success'"), 'Product success evidence must upload only after success.');
assert(productWorkflow.includes("if: steps.product-tests.outcome == 'failure'"), 'Product diagnostics must upload only after failure.');
assert(productWorkflow.includes('-c:v png -compression_level 9 -pred mixed'), 'Product success PNG evidence must use the deterministic lossless mixed predictor.');
assert(productWorkflow.includes('recompress-png-idat.mjs "$tmp" "$filtered_tmp"'), 'Product success PNG evidence must try dependency-free filtered IDAT recompression after the mixed predictor.');
assert(productWorkflow.includes('(( filtered_size < mixed_size ))'), 'Product success PNG compaction must retain filtered IDAT output only when it is smaller.');
assert(productWorkflow.includes('if [[ "$before_pixels" != "$after_pixels" ]]'), 'Product success PNG compaction must verify decoded RGBA pixel identity.');
assert(productWorkflow.includes('if (( after_size < before_size )); then'), 'Product success PNG compaction must keep only smaller lossless output.');
assert(productWorkflow.includes('outputRootReal = fs.realpathSync(outputRoot)') && productWorkflow.includes("path.resolve('artifacts/dungeon-rpg', attachmentPath)"), 'Product player-death evidence must resolve package-relative video attachments inside the real results root.');
assert(playerDeathSpec.includes('mounted authority bridge proves held revive -> second-death Fallen -> Team Defeat (${language})'), 'Player-death spec is missing the mounted localized authority title contract.');
for (const language of ['de', 'en']) {
  const mountedTitle = `mounted authority bridge proves held revive -> second-death Fallen -> Team Defeat (${language})`;
  assert(productWorkflow.includes(mountedTitle.toLowerCase()), `Product player-death collector classifier drifted from the mounted ${language.toUpperCase()} authority title.`);
}
assert(!productWorkflow.includes('artifacts/dungeon-rpg/test-results/**\n'), 'Product QA must not upload the entire test-results tree.');
assert(!productWorkflow.includes('artifacts/dungeon-rpg/playwright-report/**'), 'Product QA must not upload the full HTML report.');

const pngRecompressor = join(appRoot, 'scripts', 'recompress-png-idat.mjs');
const pngRecompressorResult = await execFileAsync(process.execPath, [pngRecompressor, '--self-test']);
assert(pngRecompressorResult.stdout.includes('PNG IDAT recompression self-test passed'), 'Dependency-free PNG IDAT recompression self-test did not pass.');

const budgetScript = join(appRoot, 'scripts', 'assert-artifact-budget.mjs');
const budgetFixture = await mkdtemp(join(root, '.product-budget-contract-'));
try {
  const curatedBytes = Buffer.from('curated-success-evidence');
  const traceBytes = Buffer.from('{"state":"defeat"}');
  const curatedPath = join(budgetFixture, 'autopilot-curated-device.webm');
  const tracePath = join(budgetFixture, 'player-death-solo-device.trace.json');
  const uncuratedPath = join(budgetFixture, 'companion-run-device.png');
  const fileManifestPath = join(budgetFixture, 'product-evidence-file-manifest-device.json');
  const budgetManifestPath = join(budgetFixture, 'budget-diagnostic.json');
  await writeFile(curatedPath, curatedBytes);
  await writeFile(tracePath, traceBytes);
  await writeFile(uncuratedPath, Buffer.alloc(2 * 1024 * 1024, 1));
  const fileManifest = {
    version: 1,
    files: [
      {
        path: basename(curatedPath),
        bytes: curatedBytes.length,
        sha256: createHash('sha256').update(curatedBytes).digest('hex'),
      },
      {
        path: basename(tracePath),
        bytes: traceBytes.length,
        sha256: createHash('sha256').update(traceBytes).digest('hex'),
      },
    ],
  };
  await writeFile(fileManifestPath, `${JSON.stringify(fileManifest)}\n`);
  await execFileAsync(process.execPath, [
    budgetScript,
    '--file-manifest', fileManifestPath,
    '--manifest', budgetManifestPath,
    '--max-mb', '1',
    '--label', 'curated-success-contract',
    fileManifestPath,
  ]);
  const diagnostic = JSON.parse(await readFile(budgetManifestPath, 'utf8'));
  assert(diagnostic.validatedFileManifest === fileManifestPath, 'Budget diagnostic must identify the validated curated manifest.');
  assert(diagnostic.files.some((entry) => entry.path.endsWith('/autopilot-curated-device.webm')), 'Curated evidence file was not budgeted.');
  assert(diagnostic.files.some((entry) => entry.path.endsWith('/player-death-solo-device.trace.json')), 'Uploaded trace evidence was not budgeted.');
  assert(diagnostic.files.some((entry) => entry.path.endsWith('/product-evidence-file-manifest-device.json')), 'Uploaded evidence manifest was not budgeted.');
  assert(!diagnostic.files.some((entry) => entry.path.endsWith('/companion-run-device.png')), 'Uncurated file outside the success upload set affected its budget.');

  fileManifest.files[0].bytes += 1;
  await writeFile(fileManifestPath, `${JSON.stringify(fileManifest)}\n`);
  let driftRejected = false;
  try {
    await execFileAsync(process.execPath, [budgetScript, '--file-manifest', fileManifestPath, '--max-mb', '1']);
  } catch (error) {
    driftRejected = String(error.stderr).includes('byte count drifted');
  }
  assert(driftRejected, 'Curated manifest/file byte drift must fail closed.');
} finally {
  await rm(budgetFixture, { recursive: true, force: true });
}

const menuWorkflow = workflows.get('main-menu-visual-regression.yml') ?? '';
assert(menuWorkflow.includes('assert-artifact-budget.mjs'), 'Main-menu evidence must enforce artifact budgets before upload.');
assert(menuWorkflow.includes("if: steps.menu-tests.outcome == 'success'"), 'Main-menu visual evidence must upload only after success.');
assert(menuWorkflow.includes("if: steps.menu-tests.outcome == 'failure'"), 'Main-menu diagnostics must upload only after failure.');
assert(!menuWorkflow.includes('artifacts/dungeon-rpg/playwright-report/**'), 'Main-menu QA must not upload the full HTML report.');

const gateWorkflow = workflows.get('evidence-budget-contracts.yml') ?? '';
assert(gateWorkflow.includes('validate-evidence-budget-contracts.mjs'), 'The dedicated Evidence Budget Contracts workflow is missing its validator call.');
assert(gateWorkflow.includes('timeout-minutes: 5'), 'Evidence Budget Contracts must remain a fast five-minute gate.');

console.log(`Evidence budget contracts passed for ${workflowNames.length} workflows and ${configNames.length} Playwright configs.`);
const criticalWorkflowNames = ['complete-runtime-evidence-qa.yml', 'full-game-regression.yml', 'product-autopilot-qa.yml', 'main-menu-visual-regression.yml'];
console.log(`Critical workflows: ${criticalWorkflowNames.map(name => basename(name)).join(', ')}`);
