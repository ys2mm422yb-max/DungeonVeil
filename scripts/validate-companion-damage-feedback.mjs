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
  'portrait feedback lifetime must remain the fixed product contract');
assert.match(runtime, /function projectCompanionDamage\(state: GameState, feedback: CompanionDamageFeedback\)/);
assert.match(runtime, /if \(depth <= 0\.1\) return null;/,
  'only a point behind the camera may be rejected');
assert.doesNotMatch(runtime, /if \(ndcX[^\n]*return null|if \(ndcY[^\n]*return null/,
  'positive-depth companion damage must not disappear merely because raw projection is outside the theoretical viewport');
assert.match(runtime, /const rawLeft = \(ndcX \* 0\.5 \+ 0\.5\) \* 100;[\s\S]*const rawTop = \(-ndcY \* 0\.5 \+ 0\.5\) \* 100;/,
  'projection must preserve the raw enemy position before applying portrait safety bounds');
assert.match(runtime, /left: clamp\(rawLeft, 8, 92\),[\s\S]*top: clamp\(rawTop, 13, 86\),[\s\S]*clamped: rawLeft < 8 \|\| rawLeft > 92 \|\| rawTop < 13 \|\| rawTop > 86/,
  'positive-depth feedback must remain visible inside the safe portrait viewport and disclose edge clamping');
assert.match(runtime, /worldY: target\.enemyType === 'boss' \? 1\.35 : 0\.82/,
  'companion values must use the established enemy marker projection heights');
assert.match(runtime, /data-feedback-active=\{damageFeedback \? 'true' : 'false'\}/);
assert.match(runtime, /data-feedback-projected=\{projectedFeedback \? 'true' : 'false'\}/);
assert.match(runtime, /data-feedback-target=\{damageFeedback\?\.targetId \?\? ''\}/);
assert.match(runtime, /data-projection-clamped=\{projectedFeedback\.clamped \? 'true' : 'false'\}/);
assert.match(runtime, /publishDamageFeedback\(activeRole, target, damage\.damage, definition\.accent, false, now\)/);
assert.match(runtime, /publishDamageFeedback\(activeRole, target, damage\.damage, definition\.accent, true, now\)/);
assert.match(runtime, /if \(canWriteEnemies && damage\.damage > 0\)/);
assert.equal((runtime.match(/state\.damageNumbers\.push\(/g) ?? []).length, 1,
  'dedicated companion values must not be duplicated in the legacy number layer');
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
assert.match(journey, /const COMPANION_ACTION_LOG = '__dungeonVeilCompanionActionLog';/);
assert.doesNotMatch(journey, /COMPANION_ACTION_SNAPSHOTS|waitForCorrelatedCompanionFeedback|captureCorrelatedCompanionFeedbackEvidence/,
  'evidence must not return to historical snapshots followed by DOM reacquisition');
assert.match(journey, /async function armCompanionActionObservation\(page\)/);
assert.match(journey, /await armCompanionActionObservation\(page\);\s*await startFreshRun\(page\);/,
  'the authoritative event log must be armed before combat starts');
assert.match(journey, /observedAt: performance\.now\(\)/,
  'failure diagnostics must retain the browser observation timestamp');
assert.match(journey, /if \(log\.length > 24\) log\.splice\(0, log\.length - 24\);/,
  'the diagnostic attack log must remain bounded');

assert.match(journey, /async function captureLiveCompanionFeedbackEvidence\(page, \{ role, critical, notBefore, marker, path \}\)/,
  'one helper must own live correlation, readability validation and screenshot capture');
assert.match(journey, /const handle = await page\.waitForFunction\(\(\{ logKey, expectedRole, expectedCritical, minimumAt \}\) => \{/,
  'the criterion must execute as one browser-side wait rather than separate locator calls');
assert.match(journey, /const nodes = \[\.\.\.document\.querySelectorAll\('\[data-testid\^="companion-damage-number-"\]'\)\];/,
  'the browser-side wait must inspect only currently rendered feedback nodes');
assert.match(journey, /node\.dataset\.companionRole !== expectedRole \|\| node\.dataset\.critical !== String\(expectedCritical\)/,
  'role and critical identity must be filtered in the same browser frame');
assert.match(journey, /entry\.role === expectedRole[\s\S]*entry\.kind === 'attack'[\s\S]*entry\.targetId === targetId[\s\S]*entry\.at >= minimumAt/,
  'the live node must correlate to the authoritative role, target and input epoch');
assert.match(journey, /opacity < 0\.9/,
  'capture must wait for a clearly painted animation frame');
assert.match(journey, /timeout: 20_000,[\s\S]*polling: 'raf'/,
  'the unchanged 20 second criterion must sample the short live window inside requestAnimationFrame');
assert.doesNotMatch(journey, /feedback\.count\(\)|feedback\.evaluate\(/,
  'slow cross-process count/evaluate sequencing must not return');
assert.match(journey, /observedFeedback = await handle\.jsonValue\(\);[\s\S]*assertReadableFeedback\(observedFeedback, \{ role, critical, marker \}\);[\s\S]*await page\.screenshot\(\{ path, fullPage: false \}\);/,
  'the same browser-frame result must be validated and immediately photographed');
assert.match(journey, /const exactFeedback = page\.getByTestId\(observedFeedback\.feedbackId\);[\s\S]*const visibleAfterCapture = await exactFeedback\.evaluate[\s\S]*expect\(visibleAfterCapture\)\.toBe\(true\);/,
  'the exact correlated node must still be connected after the full-context screenshot');
assert.match(journey, /expect\(observedFeedback\.width\)\.toBeGreaterThanOrEqual\(82\);/);
assert.match(journey, /expect\(observedFeedback\.height\)\.toBeGreaterThanOrEqual\(38\);/);
assert.match(journey, /expect\(observedFeedback\.fontSize\)\.toBeGreaterThanOrEqual\(21\);/);
assert.match(journey, /expect\(observedFeedback\.pointerEvents\)\.toBe\('none'\);/);
assert.match(journey, /expect\(observedFeedback\.opacity\)\.toBeGreaterThanOrEqual\(0\.9\);/);

assert.match(journey, /async function readCompanionFeedbackDiagnostics\(page, \{ role, critical, notBefore \}\)/);
assert.match(journey, /now: performance\.now\(\),[\s\S]*minimumAt,[\s\S]*runtime:[\s\S]*actions:[\s\S]*liveFeedback:/,
  'a failed device must report input epoch, runtime state, event timestamps and current nodes');
assert.match(journey, /Companion feedback diagnostics: \$\{JSON\.stringify\(diagnostics, null, 2\)\}/);

assert.match(journey, /async function waitForStableRoom\(page\)/);
assert.match(journey, /Date\.now\(\) - hiddenSince >= 1_200 \? 'stable' : 'settling'/);
assert.match(journey, /timeout: 120_000,[\s\S]*intervals: \[100, 250, 500\]/);
assert.match(journey, /await waitForStableRoom\(page\);\s*const basicEvidenceEpoch = await page\.evaluate\(\(\) => performance\.now\(\)\);\s*await captureLiveCompanionFeedbackEvidence\(page, \{[\s\S]*role: 'shield',[\s\S]*critical: false,[\s\S]*notBefore: basicEvidenceEpoch,[\s\S]*marker: \/◆\\s\*-\\d\+\/[\s\S]*companion-damage-feedback-\$\{testInfo\.project\.name\}\.png/,
  'normal-hit evidence must arm a fresh live capture after the room-title transition');

const playerAttackTrigger = journey.match(/async function triggerConfirmedPlayerAttack\(page, attackIssuedAt\) \{[\s\S]*?\n\}/)?.[0] ?? '';
assert.match(playerAttackTrigger, /const inputBurst = 6;[\s\S]*page\.keyboard\.press\('Space'\)[\s\S]*page\.waitForTimeout\(240\)[\s\S]*return attackIssuedAt;/,
  'the supported real-input burst and cadence must remain unchanged');
assert.doesNotMatch(playerAttackTrigger, /const inputBurst = (?:[7-9]|\d{2,})|page\.waitForTimeout\((?:[3-9]\d{2}|\d{4,})\)/);
assert.doesNotMatch(journey, /data-hit-flash|data-basic-attack-count[\s\S]{0,400}triggerConfirmedPlayerAttack/);
assert.match(journey, /const attackIssuedAt = await page\.evaluate\(\(\) => performance\.now\(\)\);\s*const capturePromise = captureLiveCompanionFeedbackEvidence\(page, \{[\s\S]*role: 'critical-support',[\s\S]*critical: true,[\s\S]*notBefore: attackIssuedAt,[\s\S]*marker: \/✦\\s\*-\\d\+\/[\s\S]*companion-damage-feedback-critical-\$\{testInfo\.project\.name\}\.png[\s\S]*const \[, observedCritical\] = await Promise\.all\(\[[\s\S]*triggerConfirmedPlayerAttack\(page, attackIssuedAt\),[\s\S]*capturePromise/,
  'critical evidence capture must be armed before the first real player input');
assert.match(journey, /expect\(observedCritical\.at\)\.toBeGreaterThanOrEqual\(attackIssuedAt\);/);

assert.match(workflow, /tests\/companion-runtime\.spec\.mjs/);
assert.match(workflow, /companion-damage-feedback-\$\{\{ matrix\.project \}\}\.png/);
assert.match(workflow, /companion-damage-feedback-critical-\$\{\{ matrix\.project \}\}\.png/);
assert.match(manifestGenerator, /'companion-damage-feedback-',/);
assert.match(manifestGenerator, /await fs\.writeFile\(path\.join\(root, 'companion-damage-feedback-device\.png'\), png\);/);
assert.match(manifestGenerator, /const companionEntry = manifest\.files\.find\(\(entry\) => entry\.path === 'companion-damage-feedback-device\.png'\);/);

console.log('Companion damage feedback contract passed.');