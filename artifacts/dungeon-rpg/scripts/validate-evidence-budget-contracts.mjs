import { readFile, readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';

const root = process.cwd();
const workflowRoot = join(root, '.github', 'workflows');
const appRoot = join(root, 'artifacts', 'dungeon-rpg');

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

const completeWorkflow = workflows.get('complete-runtime-evidence-qa.yml') ?? '';
assert(completeWorkflow.includes('prepare-complete-runtime-review-media.mjs'), 'Complete runtime workflow must prepare compact review media.');
assert(completeWorkflow.includes('complete-runtime-review-screenshots-${{ matrix.project }}'), 'Complete runtime screenshots must remain separate.');
assert(completeWorkflow.includes('complete-runtime-review-videos-${{ matrix.project }}'), 'Complete runtime videos must remain separate.');
assert(completeWorkflow.includes("steps.runtime-tests.outcome == 'failure' || github.event_name == 'workflow_dispatch'"), 'Complete runtime raw diagnostics must remain failure/manual only.');

const fullGameWorkflow = workflows.get('full-game-regression.yml') ?? '';
assert(fullGameWorkflow.includes('dungeon-veil-pages-build-${{ github.sha }}'), 'Full Game Regression must reuse one exact-head production build.');
assert(fullGameWorkflow.includes("if: steps.browser-tests.outcome == 'failure'"), 'Full Game Regression traces must remain failure-only.');
assert(!fullGameWorkflow.includes('artifacts/dungeon-rpg/test-results/**\n'), 'Full Game Regression must not upload the whole test-results tree.');

const productWorkflow = workflows.get('product-autopilot-qa.yml') ?? '';
assert(productWorkflow.includes('assert-artifact-budget.mjs'), 'Product Autopilot QA must enforce artifact budgets before upload.');
assert(productWorkflow.includes("if: steps.product-tests.outcome == 'success'"), 'Product success evidence must upload only after success.');
assert(productWorkflow.includes("if: steps.product-tests.outcome == 'failure'"), 'Product diagnostics must upload only after failure.');
assert(!productWorkflow.includes('artifacts/dungeon-rpg/test-results/**\n'), 'Product QA must not upload the entire test-results tree.');
assert(!productWorkflow.includes('artifacts/dungeon-rpg/playwright-report/**'), 'Product QA must not upload the full HTML report.');

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
