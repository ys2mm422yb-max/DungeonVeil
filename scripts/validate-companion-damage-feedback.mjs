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

assert.match(journey, /getByTestId\('companion-damage-feedback-layer'\)/,
  'the focused browser journey must inspect the real feedback layer');
assert.match(journey, /locator\('\[data-testid\^="companion-damage-number-"\]'\)/,
  'the focused browser journey must inspect the rendered companion value');
assert.match(journey, /toHaveAttribute\('data-companion-role', 'shield'\)/);
assert.match(journey, /toHaveAttribute\('data-target-id', \/\.\+\//);
assert.match(journey, /toContainText\(\/◆\\s\*-\\d\+\//);
assert.match(journey, /damageMetrics\.fontSize\)\.toBeGreaterThanOrEqual\(21\)/,
  'the browser journey must enforce the actual computed mobile font size');
assert.match(journey, /companion-damage-feedback-\$\{testInfo\.project\.name\}\.png/,
  'the browser journey must produce criterion-specific evidence');

assert.match(workflow, /tests\/companion-runtime\.spec\.mjs/,
  'Product Autopilot must run the focused feedback journey on all four portrait projects');
assert.match(workflow, /companion-damage-feedback-\$\{\{ matrix\.project \}\}\.png/,
  'Product Autopilot must upload the dedicated feedback screenshot');

console.log('Companion damage feedback contract passed.');
