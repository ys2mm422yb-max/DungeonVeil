import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtimePath = 'artifacts/dungeon-rpg/src/components/CompanionRuntimeBridge.tsx';
const journeyPath = 'artifacts/dungeon-rpg/tests/companion-runtime.spec.mjs';
const workflowPath = '.github/workflows/product-autopilot-qa.yml';

const [runtime, journey, workflow] = await Promise.all([
  readFile(runtimePath, 'utf8'),
  readFile(journeyPath, 'utf8'),
  readFile(workflowPath, 'utf8'),
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
  'portrait-mobile feedback needs a deterministic readable hit target footprint');
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
assert.match(journey, /const observedFeedback = await waitForCorrelatedCompanionFeedback\(page, 'shield'\);/,
  'the shield journey must wait for the exact visible authoritative hit under review');
assert.match(journey, /getByTestId\('companion-damage-feedback-layer'\)/,
  'the focused browser journey must inspect the real feedback layer');
assert.match(journey, /getByTestId\(observedFeedback\.feedbackId\)/,
  'the rendered value locator must use the exact node correlated in the browser');
assert.match(journey, /toHaveAttribute\('data-companion-role', 'shield'\)/);
assert.match(journey, /toHaveAttribute\('data-target-id', observedFeedback\.targetId\)/);
assert.match(journey, /toContainText\(\/◆\\s\*-\\d\+\//);
assert.match(journey, /damageMetrics\.fontSize\)\.toBeGreaterThanOrEqual\(21\)/,
  'the browser journey must enforce the actual computed mobile font size');
assert.match(journey, /companion-damage-feedback-\$\{testInfo\.project\.name\}\.png/,
  'the browser journey must produce criterion-specific evidence');
assert.doesNotMatch(journey,
  /data-basic-attack-count[\s\S]{0,500}toBeGreaterThan\(0\);[\s\S]{0,250}getByTestId\('companion-damage-feedback-layer'\)/,
  'a monotonic attack-counter wait must not precede observation of a short-lived feedback node');

assert.match(workflow, /tests\/companion-runtime\.spec\.mjs/,
  'Product Autopilot must run the focused feedback journey on all four portrait projects');
assert.match(workflow, /companion-damage-feedback-\$\{\{ matrix\.project \}\}\.png/,
  'Product Autopilot must upload the dedicated feedback screenshot');

console.log('Companion damage feedback contract passed.');
