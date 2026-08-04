import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtimePath = 'artifacts/dungeon-rpg/src/components/CompanionRuntimeBridge.tsx';
const journeyPath = 'artifacts/dungeon-rpg/tests/companion-runtime.spec.mjs';
const workflowPath = '.github/workflows/product-autopilot-qa.yml';
const readabilityPath = 'artifacts/dungeon-rpg/src/components/companionDamageFeedback.css';
const appPath = 'artifacts/dungeon-rpg/src/App.tsx';
const manifestGeneratorPath = 'artifacts/dungeon-rpg/scripts/create-product-evidence-file-manifest.mjs';

const [runtime, journey, workflow, readability, app, manifestGenerator] = await Promise.all([
  readFile(runtimePath, 'utf8'),
  readFile(journeyPath, 'utf8'),
  readFile(workflowPath, 'utf8'),
  readFile(readabilityPath, 'utf8'),
  readFile(appPath, 'utf8'),
  readFile(manifestGeneratorPath, 'utf8'),
]);

assert.match(runtime, /const COMPANION_DAMAGE_FEEDBACK_MS = 1_050;/,
  'companion hit feedback must remain visible long enough for portrait-mobile readability');
assert.match(runtime, /function projectCompanionDamage\(state: GameState, feedback: CompanionDamageFeedback\)/,
  'companion values must project from the struck enemy world position');
assert.match(runtime, /publishDamageFeedback\(activeRole, target, damage\.damage, definition\.accent, false, now\)/,
  'authoritative basic hits must publish readable companion feedback');
assert.match(runtime, /publishDamageFeedback\(activeRole, target, damage\.damage, definition\.accent, true, now\)/,
  'critical-support hits must publish a distinct critical companion value');
assert.match(runtime, /if \(canWriteEnemies && damage\.damage > 0\)/,
  'non-authoritative guests must not invent companion damage feedback');
assert.equal((runtime.match(/state\.damageNumbers\.push\(/g) ?? []).length, 1,
  'basic and critical companion damage must not duplicate the dedicated feedback in the legacy sprite layer');
assert.match(runtime, /data-testid="companion-damage-feedback-layer"/);
assert.match(runtime, /data-testid=\{`companion-damage-number-\$\{damageFeedback\.id\}`\}/);
assert.match(runtime, /data-companion-role=\{damageFeedback\.role\}/);
assert.match(runtime, /data-target-id=\{damageFeedback\.targetId\}/);
assert.match(runtime, /data-critical=\{damageFeedback\.critical \? 'true' : 'false'\}/);
assert.match(runtime, /pointer-events-none fixed inset-0 z-\[34\]/,
  'combat feedback must never intercept movement or attack controls');
assert.match(runtime, /min-h-\[38px\] min-w-\[82px\]/,
  'the component must retain its semantic minimum footprint');
assert.match(readability, /\[data-testid\^="companion-damage-number-"\]\s*\{[\s\S]*min-width:\s*88px\s*!important;/,
  'the untransformed width must compensate for the 0.94 exit scale and keep the rendered box at or above 82px');
assert.match(app, /import '\.\/components\/companionDamageFeedback\.css';/,
  'the transformed-width contract must be loaded in every app mode');
assert.match(runtime, /fontSize: 'clamp\(21px, 5\.4vw, 29px\)'/,
  'companion values need a mobile-readable font floor');
assert.match(runtime, /@media \(prefers-reduced-motion: reduce\)/,
  'damage feedback must retain a static fade fallback for Reduced Motion');

assert.match(journey, /const COMPANION_ACTION_EVENT = 'dungeon-veil-companion-action-v4';/,
  'the focused browser journey must subscribe to the authoritative companion action event');
assert.match(journey, /async function armCompanionActionObservation\(page\)/,
  'the focused browser journey must arm observation before combat begins');
assert.match(journey, /await armCompanionActionObservation\(page\);\s*await startFreshRun\(page\);/,
  'the observer must be active before the run can emit the first companion hit');
assert.doesNotMatch(journey, /page\.waitForTimeout\(10_000\)/,
  'a fixed post-entry delay must not consume the room before transient hit feedback is observed');
assert.match(journey, /async function waitForCorrelatedCompanionFeedback\(page, role\)/,
  'the focused browser journey must correlate an authoritative hit with a simultaneously visible node');
assert.match(journey, /for \(let index = log\.length - 1; index >= 0; index -= 1\)/,
  'correlation must inspect the newest captured companion attacks first');
assert.match(journey, /element\.dataset\.companionRole === expectedRole && element\.dataset\.targetId === entry\.targetId/,
  'the live node must match both the companion role and struck enemy');
assert.match(journey, /rect\.width <= 0 \|\| rect\.height <= 0/,
  'the correlated node must have a real rendered footprint');
assert.match(journey, /const layer = document\.querySelector\('\[data-testid="companion-damage-feedback-layer"\]'\);/,
  'the same-tick browser snapshot must inspect the real feedback layer');
assert.match(journey, /feedbackId: node\.getAttribute\('data-testid'\),/,
  'the atomic snapshot must retain the exact rendered feedback identity');
assert.match(journey, /feedbackRole: node\.dataset\.companionRole \|\| '',/);
assert.match(journey, /feedbackTargetId: node\.dataset\.targetId \|\| '',/);
assert.match(journey, /text: node\.textContent \|\| '',/);
assert.match(journey, /width: rect\.width,/);
assert.match(journey, /fontSize: Number\.parseFloat\(style\.fontSize\),/);
assert.match(journey, /visibleCount: layer\?\.getAttribute\('data-visible-count'\) \|\| '',/,
  'layer visibility and node geometry must be captured in the same browser tick');
assert.match(journey, /const observedFeedback = await waitForCorrelatedCompanionFeedback\(page, 'shield'\);/,
  'the shield journey must wait for the exact visible authoritative hit under review');
assert.match(journey, /expect\(observedFeedback\.feedbackId\)\.toMatch\(\/\^companion-damage-number-\/\);/);
assert.match(journey, /expect\(observedFeedback\.feedbackRole\)\.toBe\('shield'\);/);
assert.match(journey, /expect\(observedFeedback\.feedbackTargetId\)\.toBe\(observedFeedback\.targetId\);/);
assert.match(journey, /expect\(observedFeedback\.critical\)\.toBe\('false'\);/);
assert.match(journey, /expect\(observedFeedback\.text\)\.toMatch\(\/◆\\s\*-\\d\+\/\);/);
assert.match(journey, /expect\(observedFeedback\.visibleCount\)\.toBe\('1'\);/);
assert.match(journey, /expect\(observedFeedback\.width\)\.toBeGreaterThanOrEqual\(82\);/,
  'the atomic browser snapshot must enforce the actual transformed mobile width');
assert.match(journey, /expect\(observedFeedback\.height\)\.toBeGreaterThanOrEqual\(38\);/);
assert.match(journey, /expect\(observedFeedback\.fontSize\)\.toBeGreaterThanOrEqual\(21\);/,
  'the atomic browser snapshot must enforce the actual computed mobile font size');
assert.match(journey, /expect\(observedFeedback\.pointerEvents\)\.toBe\('none'\);/);
assert.doesNotMatch(journey, /getByTestId\(observedFeedback\.feedbackId\)/,
  'a short-lived feedback node must not be reacquired after the atomic snapshot');
assert.doesNotMatch(journey, /const damageNumber = page\.getByTestId/,
  'the transient node must not be queried again after its lifecycle can expire');
assert.match(journey, /companion-damage-feedback-\$\{testInfo\.project\.name\}\.png/,
  'the browser journey must produce criterion-specific evidence');
assert.doesNotMatch(journey,
  /data-basic-attack-count[\s\S]{0,500}toBeGreaterThan\(0\);[\s\S]{0,250}(?:getByTestId|querySelector)\([^\n]*companion-damage-feedback-layer/,
  'a monotonic attack-counter wait must not precede observation of short-lived feedback');

assert.match(workflow, /tests\/companion-runtime\.spec\.mjs/,
  'Product Autopilot must run the focused feedback journey on all four portrait projects');
assert.match(workflow, /companion-damage-feedback-\$\{\{ matrix\.project \}\}\.png/,
  'Product Autopilot must upload the dedicated feedback screenshot');
assert.match(manifestGenerator, /'companion-damage-feedback-',/,
  'the dedicated feedback screenshot must be included in every SHA-256 product evidence manifest');
assert.match(manifestGenerator, /await fs\.writeFile\(path\.join\(root, 'companion-damage-feedback-device\.png'\), png\);/,
  'the manifest generator self-test must exercise the dedicated feedback prefix');
assert.match(manifestGenerator, /const companionEntry = manifest\.files\.find\(\(entry\) => entry\.path === 'companion-damage-feedback-device\.png'\);/,
  'the self-test must prove companion feedback receives dimensions and a SHA-256 entry');

console.log('Companion damage feedback contract passed.');
