import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtimePath = 'artifacts/dungeon-rpg/src/components/CompanionRuntimeBridge.tsx';
const journeyPath = 'artifacts/dungeon-rpg/tests/companion-runtime.spec.mjs';
const workflowPath = '.github/workflows/product-autopilot-qa.yml';
const readabilityPath = 'artifacts/dungeon-rpg/src/components/companionDamageFeedback.css';
const appPath = 'artifacts/dungeon-rpg/src/App.tsx';
const manifestGeneratorPath = 'artifacts/dungeon-rpg/scripts/create-product-evidence-file-manifest.mjs';

const [runtime, journey, workflow, readability, app, manifestGenerator] = await Promise.all([
  readFile(runtimePath, 'utf8'), readFile(journeyPath, 'utf8'), readFile(workflowPath, 'utf8'),
  readFile(readabilityPath, 'utf8'), readFile(appPath, 'utf8'), readFile(manifestGeneratorPath, 'utf8'),
]);

assert.match(runtime, /const COMPANION_DAMAGE_FEEDBACK_MS = 1_050;/);
assert.match(runtime, /function projectCompanionDamage\(state: GameState, feedback: CompanionDamageFeedback\)/);
assert.match(runtime, /publishDamageFeedback\(activeRole, target, damage\.damage, definition\.accent, false, now\)/);
assert.match(runtime, /publishDamageFeedback\(activeRole, target, damage\.damage, definition\.accent, true, now\)/);
assert.match(runtime, /if \(canWriteEnemies && damage\.damage > 0\)/);
assert.equal((runtime.match(/state\.damageNumbers\.push\(/g) ?? []).length, 1);
assert.match(runtime, /data-testid="companion-damage-feedback-layer"/);
assert.match(runtime, /data-testid=\{`companion-damage-number-\$\{damageFeedback\.id\}`\}/);
assert.match(runtime, /data-companion-role=\{damageFeedback\.role\}/);
assert.match(runtime, /data-target-id=\{damageFeedback\.targetId\}/);
assert.match(runtime, /data-critical=\{damageFeedback\.critical \? 'true' : 'false'\}/);
assert.match(runtime, /pointer-events-none fixed inset-0 z-\[34\]/);
assert.match(runtime, /min-h-\[38px\] min-w-\[82px\]/);
assert.match(readability, /\[data-testid\^="companion-damage-number-"\]\s*\{[\s\S]*min-width:\s*88px\s*!important;/);
assert.match(readability, /\[data-testid\^="companion-damage-number-"\]\s*\{[\s\S]*min-height:\s*41px\s*!important;/);
assert.match(app, /import '\.\/components\/companionDamageFeedback\.css';/);
assert.match(runtime, /fontSize: 'clamp\(21px, 5\.4vw, 29px\)'/);
assert.match(runtime, /@media \(prefers-reduced-motion: reduce\)/);

assert.match(journey, /const COMPANION_ACTION_EVENT = 'dungeon-veil-companion-action-v4';/);
assert.match(journey, /const COMPANION_ACTION_SNAPSHOTS = '__dungeonVeilCompanionActionSnapshots';/);
assert.match(journey, /async function armCompanionActionObservation\(page\)/);
assert.match(journey, /await armCompanionActionObservation\(page\);\s*await startFreshRun\(page\);/);
assert.doesNotMatch(journey, /page\.waitForTimeout\(10_000\)/);
assert.match(journey, /const captureRenderedFeedback = \(\) => \{/);
assert.match(journey, /new MutationObserver\(\(\) => \{[\s\S]*captureRenderedFeedback\(\);[\s\S]*scheduleRenderedFeedbackCapture\(\);[\s\S]*\}\)\.observe\(document\.documentElement,/);
assert.match(journey, /snapshots\.push\(Object\.freeze\(\{/);
assert.match(journey, /feedbackId,[\s\S]*feedbackRole: node\.dataset\.companionRole[\s\S]*feedbackTargetId: node\.dataset\.targetId[\s\S]*critical: node\.dataset\.critical/);
assert.match(journey, /width: rect\.width,[\s\S]*height: rect\.height,[\s\S]*fontSize: Number\.parseFloat\(style\.fontSize\),[\s\S]*pointerEvents: style\.pointerEvents/);
assert.match(journey, /visibleCount: layer\?\.getAttribute\('data-visible-count'\) \|\| ''/);
assert.match(journey, /queueMicrotask\(\(\) => \{[\s\S]*captureRenderedFeedback\(\);[\s\S]*scheduleRenderedFeedbackCapture\(\);[\s\S]*\}\);/);
assert.match(journey, /async function waitForCorrelatedCompanionFeedback\(page, role, expectedCritical = false, notBefore = 0\)/);
assert.match(journey, /const snapshots = window\[snapshotKey\] \|\| \[\];/);
assert.match(journey, /for \(let index = snapshots\.length - 1; index >= 0; index -= 1\)/);
assert.match(journey, /snapshot\.at >= minimumAt[\s\S]*snapshot\.feedbackRole === expectedRole[\s\S]*snapshot\.feedbackTargetId === snapshot\.targetId[\s\S]*snapshot\.critical === String\(critical\)/);
assert.doesNotMatch(journey, /waitForFunction[\s\S]{0,1200}document\.querySelectorAll\('\[data-testid\^="companion-damage-number-"\]'\)/);
assert.match(journey, /function assertReadableFeedback\(observedFeedback, \{ role, critical, marker \}\)/);
assert.match(journey, /expect\(observedFeedback\.feedbackTargetId\)\.toBe\(observedFeedback\.targetId\);/);
assert.match(journey, /expect\(observedFeedback\.width\)\.toBeGreaterThanOrEqual\(82\);/);
assert.match(journey, /expect\(observedFeedback\.height\)\.toBeGreaterThanOrEqual\(38\);/);
assert.match(journey, /expect\(observedFeedback\.fontSize\)\.toBeGreaterThanOrEqual\(21\);/);
assert.match(journey, /expect\(observedFeedback\.pointerEvents\)\.toBe\('none'\);/);

assert.match(journey, /async function readTransientRoomTitleState\(page\)/);
assert.match(journey, /async function waitForStableRoom\(page\)/);
assert.match(journey, /owners\.length > 1 \|\| visibleOwners\.length > 1/);
assert.match(journey, /Date\.now\(\) - hiddenSince >= 1_200 \? 'stable' : 'settling'/);
assert.match(journey, /timeout: 120_000,[\s\S]*intervals: \[100, 250, 500\]/);
assert.match(journey, /await waitForStableRoom\(page\);\s*const basicEvidenceEpoch = await page\.evaluate\(\(\) => performance\.now\(\)\);/,
  'basic evidence must begin only after the authoritative room-title transition is continuously hidden');
assert.match(journey, /async function captureCorrelatedCompanionFeedbackEvidence\(page, observedFeedback, path\)/);
assert.match(journey, /const feedback = page\.getByTestId\(observedFeedback\.feedbackId\);[\s\S]*await expect\(feedback\)\.toBeVisible\(\);/,
  'evidence capture must bind to the exact currently visible feedback node returned by correlation');
assert.match(journey, /toHaveAttribute\('data-companion-role', observedFeedback\.feedbackRole\)[\s\S]*toHaveAttribute\('data-target-id', observedFeedback\.targetId\)[\s\S]*toHaveAttribute\('data-critical', observedFeedback\.critical\)/,
  'the live evidence locator must retain the same role, target and critical identity');
assert.match(journey, /await page\.screenshot\(\{ path, fullPage: false \}\);/,
  'the screenshot must be written inside the locator-bound capture helper');
assert.doesNotMatch(journey, /assertReadableFeedback\(observed(?:Feedback|Critical)[\s\S]{0,300}await page\.screenshot/,
  'historical snapshot validation must never be followed by an unbound standalone screenshot');

assert.match(journey, /waitForCorrelatedCompanionFeedback\(page, 'shield', false, basicEvidenceEpoch\)/);
assert.match(journey, /assertReadableFeedback\(observedFeedback, \{ role: 'shield', critical: false, marker: \/◆\\s\*-\\d\+\/ \}\)/);
assert.match(journey, /captureCorrelatedCompanionFeedbackEvidence\(page, observedFeedback, `test-results\/companion-damage-feedback-\$\{testInfo\.project\.name\}\.png`\)/);
assert.match(journey, /test\('critical-support proc renders one readable value on its actual target'/);
assert.match(journey, /activeId: 'critical-support',[\s\S]*'critical-support': \{ level: 2, unlockedAt: 1 \}/);
const playerAttackTrigger = journey.match(/async function triggerConfirmedPlayerAttack\(page\) \{[\s\S]*?\n\}/)?.[0] ?? '';
assert.match(playerAttackTrigger, /const attackIssuedAt = await page\.evaluate\(\(\) => performance\.now\(\)\);[\s\S]*const inputBurst = 6;[\s\S]*page\.keyboard\.press\('Space'\)[\s\S]*page\.waitForTimeout\(240\)[\s\S]*return attackIssuedAt;/);
assert.doesNotMatch(playerAttackTrigger, /data-basic-attack-count|expect\.poll/);
assert.doesNotMatch(playerAttackTrigger, /const inputBurst = (?:[7-9]|\d{2,});/);
assert.doesNotMatch(playerAttackTrigger, /page\.waitForTimeout\((?:[3-9]\d{2}|\d{4,})\)/);
assert.doesNotMatch(journey, /data-hit-flash/);
assert.match(journey, /await startFreshRun\(page\);\s*const runtime = page\.getByTestId\('companion-runtime-bridge'\);\s*await expect\(runtime\)\.toHaveAttribute\('data-role', 'critical-support'\);\s*const attackIssuedAt = await triggerConfirmedPlayerAttack\(page\);/);
assert.match(journey, /const attackIssuedAt = await triggerConfirmedPlayerAttack\(page\);[\s\S]*const observedCritical = await waitForCorrelatedCompanionFeedback\(page, 'critical-support', true, attackIssuedAt\);/);
assert.doesNotMatch(journey, /data-companion-level', '2'\);\s*const attackIssuedAt = await triggerConfirmedPlayerAttack/);
assert.match(journey, /assertReadableFeedback\(observedCritical, \{ role: 'critical-support', critical: true, marker: \/✦\\s\*-\\d\+\/ \}\)/);
assert.match(journey, /captureCorrelatedCompanionFeedbackEvidence\(page, observedCritical, `test-results\/companion-damage-feedback-critical-\$\{testInfo\.project\.name\}\.png`\)/);
assert.doesNotMatch(journey, /data-basic-attack-count[\s\S]{0,500}toBeGreaterThan\(0\);[\s\S]{0,250}(?:getByTestId|querySelector)\([^\n]*companion-damage-feedback-layer/);

assert.match(workflow, /tests\/companion-runtime\.spec\.mjs/);
assert.match(workflow, /companion-damage-feedback-\$\{\{ matrix\.project \}\}\.png/);
assert.match(workflow, /companion-damage-feedback-critical-\$\{\{ matrix\.project \}\}\.png/);
assert.match(manifestGenerator, /'companion-damage-feedback-',/);
assert.match(manifestGenerator, /await fs\.writeFile\(path\.join\(root, 'companion-damage-feedback-device\.png'\), png\);/);
assert.match(manifestGenerator, /const companionEntry = manifest\.files\.find\(\(entry\) => entry\.path === 'companion-damage-feedback-device\.png'\);/);

console.log('Companion damage feedback contract passed.');
