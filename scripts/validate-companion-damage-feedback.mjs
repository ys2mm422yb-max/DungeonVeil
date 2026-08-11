import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtimePath = 'artifacts/dungeon-rpg/src/components/CompanionRuntimeBridge.tsx';
const runtimeEvidencePath = 'artifacts/dungeon-rpg/src/game/runtimeEvidenceBridge.ts';
const journeyPath = 'artifacts/dungeon-rpg/tests/companion-runtime.spec.mjs';
const workflowPath = '.github/workflows/product-autopilot-qa.yml';
const readabilityPath = 'artifacts/dungeon-rpg/src/components/companionDamageFeedback.css';
const appPath = 'artifacts/dungeon-rpg/src/App.tsx';
const manifestGeneratorPath = 'artifacts/dungeon-rpg/scripts/create-product-evidence-file-manifest.mjs';

const [runtime, runtimeEvidence, journey, workflow, readability, app, manifestGenerator] = await Promise.all([
  readFile(runtimePath, 'utf8'),
  readFile(runtimeEvidencePath, 'utf8'),
  readFile(journeyPath, 'utf8'),
  readFile(workflowPath, 'utf8'),
  readFile(readabilityPath, 'utf8'),
  readFile(appPath, 'utf8'),
  readFile(manifestGeneratorPath, 'utf8'),
]);

assert.match(runtime, /const COMPANION_DAMAGE_FEEDBACK_MS = 1_050;/,
  'portrait feedback lifetime must remain the fixed product contract');
assert.match(runtime, /const RECENT_COMBAT_TARGET_MS = 1_200;/,
  'critical support must retain only a short bounded target memory for a same-frame killing blow');
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
assert.match(runtime, /publishDamageFeedback\(activeRole, criticalTarget, damage\.damage, definition\.accent, true, now\)/);
assert.match(runtime, /if \(canWriteEnemies && damage\.damage > 0\)/);
assert.match(runtime, /const recentCombatTargetRef = useRef<RecentCombatTarget \| null>\(null\);[\s\S]*recentCombatTargetRef\.current = null;/,
  'recent target memory must be explicit and reset with companion lifecycle changes');
assert.match(runtime, /const previousCombatTarget = recentCombatTargetRef\.current;[\s\S]*const recentTarget = previousCombatTarget && now - previousCombatTarget\.observedAt <= RECENT_COMBAT_TARGET_MS[\s\S]*const criticalTarget = recentTarget \?\? target;/,
  'critical support must prefer the immediately preceding real combat target while the bounded window is valid');
assert.match(runtime, /const playerAttack = state\.player\.lastAttackTime;[\s\S]*playerAttack > lastPlayerAttackRef\.current[\s\S]*publishDamageFeedback\(activeRole, criticalTarget, damage\.damage, definition\.accent, true, now\)/,
  'critical-support feedback must remain causally gated by a monotonic authoritative player attack');
assert.match(runtime, /if \(!criticalTarget\.isDead && criticalTarget\.hp > 0\)[\s\S]*publishDamageFeedback\(activeRole, criticalTarget, damage\.damage, definition\.accent, true, now\)/,
  'a killing blow may retain readable feedback without applying duplicate damage to an already defeated target');
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

assert.match(runtimeEvidence, /const MARKER = 'dungeon-veil-runtime-evidence-v1';/);
assert.match(runtimeEvidence, /const local = window\.location\.hostname === '127\.0\.0\.1' \|\| window\.location\.hostname === 'localhost';/,
  'authoritative combat telemetry must remain localhost-only');
assert.match(runtimeEvidence, /playerLastAttackTime: state\.player\.lastAttackTime/,
  'the test bridge must expose the same authoritative timestamp consumed by the critical companion proc');
assert.match(runtimeEvidence, /playerAttackCooldown: state\.player\.attackCooldown/);
assert.match(runtimeEvidence, /livingEnemyPositions: livingEnemies\.map\(enemy => \(\{[\s\S]*id: enemy\.id,[\s\S]*x: enemy\.x \+ enemy\.width \/ 2,[\s\S]*y: enemy\.y \+ enemy\.height \/ 2/,
  'localhost evidence must expose target positions without mutating the room');

assert.match(journey, /const COMPANION_ACTION_EVENT = 'dungeon-veil-companion-action-v4';/);
assert.match(journey, /const COMPANION_ACTION_LOG = '__dungeonVeilCompanionActionLog';/);
assert.match(journey, /const RUNTIME_EVIDENCE_MARKER = 'dungeon-veil-runtime-evidence-v1';/);
assert.match(journey, /sessionStorage\.setItem\(runtimeEvidenceMarker, '1'\)/,
  'the localhost-only authoritative snapshot must be enabled before the application installs its bridge');
assert.doesNotMatch(journey, /PLAYER_HIT_LOG|PLAYER_HIT_OBSERVER|armPlayerHitObservation|data-hit-flash/,
  'evidence must not invent a separate player-hit signal that is unrelated to the authoritative critical proc');
assert.doesNotMatch(journey, /COMPANION_ACTION_SNAPSHOTS|waitForCorrelatedCompanionFeedback|captureCorrelatedCompanionFeedbackEvidence/,
  'evidence must not return to historical snapshots followed by DOM reacquisition');
assert.match(journey, /async function armCompanionActionObservation\(page\)/);
assert.match(journey, /await armCompanionActionObservation\(page\);\s*await startFreshRun\(page\);/,
  'the authoritative event log must be armed before critical combat starts');
assert.match(journey, /observedAt: performance\.now\(\)/,
  'failure diagnostics must retain the browser observation timestamp');
assert.match(journey, /if \(log\.length > 24\) log\.splice\(0, log\.length - 24\);/,
  'the diagnostic attack log must remain bounded');

assert.match(journey, /async function readRuntimeCombatSnapshot\(page\) \{[\s\S]*window\.__dungeonVeilRuntimeEvidence\?\.snapshot\(\) \?\? null/);
assert.match(journey, /async function prepareLivePlayerAttackLine\(page\)/);
assert.match(journey, /getByTestId\('run-enemy-status'\)[\s\S]*not\.toHaveText\(\/RAUM FREI\|ROOM CLEAR\/i\)[\s\S]*readRuntimeCombatSnapshot\(page\)[\s\S]*toBeGreaterThan\(0\)/,
  'critical setup must prove a living target through the localhost-only authoritative snapshot');
assert.match(journey, /function keysForVector\(dx, dy\)/);
assert.match(journey, /async function moveWithKeyboard\(page, keys, durationMs\)/);

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
assert.match(journey, /const viewport = page\.viewportSize\(\);\s*expect\(viewport\)\.toBeTruthy\(\);\s*const screenshot = await page\.screenshot\(\{ path, fullPage: false, scale: 'css' \}\);\s*observedFeedback = await handle\.jsonValue\(\);\s*assertReadableFeedback\(observedFeedback, \{ role, critical, marker \}\);\s*assertFullViewportPng\(screenshot, viewport\);/,
  'full-context CSS-pixel capture must start immediately after the qualifying browser frame, before any cross-process object transfer or assertion work');
assert.doesNotMatch(journey, /handle\.jsonValue\(\)[\s\S]{0,300}page\.screenshot/,
  'object transfer and assertions must not consume the 1050ms visual window before screenshot capture begins');
assert.match(journey, /function assertFullViewportPng\(screenshot, viewport\) \{[\s\S]*screenshot\.subarray\(0, 8\)[\s\S]*screenshot\.length\)\.toBeGreaterThan\(10_000\)[\s\S]*readUInt32BE\(16\)[\s\S]*readUInt32BE\(20\)[\s\S]*toBeGreaterThanOrEqual\(viewport\.width\)[\s\S]*toBeGreaterThanOrEqual\(viewport\.height\)/,
  'saved evidence must be a non-empty PNG covering the complete configured portrait viewport');
assert.doesNotMatch(journey, /visibleAfterCapture|exactFeedback\.evaluate/,
  'the test must not require a deliberately transient 1050ms node to survive screenshot encoding');
assert.match(journey, /expect\(observedFeedback\.width\)\.toBeGreaterThanOrEqual\(24\);/);
assert.match(journey, /expect\(observedFeedback\.width\)\.toBeLessThanOrEqual\(72\);/);
assert.match(journey, /expect\(observedFeedback\.height\)\.toBeGreaterThanOrEqual\(15\);/);
assert.match(journey, /expect\(observedFeedback\.height\)\.toBeLessThanOrEqual\(32\);/);
assert.match(journey, /expect\(observedFeedback\.fontSize\)\.toBeGreaterThanOrEqual\(critical \? 17 : 15\);/);
assert.match(journey, /expect\(observedFeedback\.fontSize\)\.toBeLessThanOrEqual\(critical \? 20\.5 : 18\);/);
assert.match(journey, /expect\(observedFeedback\.backgroundColor\)\.toMatch\(\/rgba\\\(0, 0, 0, 0\\\)\|transparent\/i\);/);
assert.match(journey, /expect\(observedFeedback\.borderTopWidth\)\.toBe\('0px'\);/);
assert.match(journey, /expect\(observedFeedback\.boxShadow\)\.toBe\('none'\);/);
assert.match(journey, /expect\(observedFeedback\.pointerEvents\)\.toBe\('none'\);/);
assert.match(journey, /expect\(observedFeedback\.opacity\)\.toBeGreaterThanOrEqual\(0\.9\);/);

assert.match(journey, /async function readCompanionFeedbackDiagnostics\(page, \{ role, critical, notBefore \}\)/);
assert.match(journey, /now: performance\.now\(\),[\s\S]*minimumAt,[\s\S]*runtime:[\s\S]*runtimeEvidence: window\.__dungeonVeilRuntimeEvidence\?\.snapshot\(\) \?\? null,[\s\S]*actions:[\s\S]*liveFeedback:/,
  'a failed device must report input epoch, component state, authoritative player state, event timestamps and current nodes');
assert.match(journey, /Companion feedback diagnostics: \$\{JSON\.stringify\(diagnostics, null, 2\)\}/);

assert.match(journey, /async function waitForStableRoom\(page\)/);
assert.match(journey, /Date\.now\(\) - hiddenSince >= 1_200 \? 'stable' : 'settling'/);
assert.match(journey, /timeout: 120_000,[\s\S]*intervals: \[100, 250, 500\]/);
assert.match(journey, /await armCompanionActionObservation\(page\);\s*const basicEvidenceEpoch = await page\.evaluate\(\(\) => performance\.now\(\)\);\s*await startFreshRun\(page\);[\s\S]*await waitForStableRoom\(page\);\s*await captureLiveCompanionFeedbackEvidence\(page, \{[\s\S]*role: 'shield',[\s\S]*critical: false,[\s\S]*notBefore: basicEvidenceEpoch,[\s\S]*marker: \/◆\\s\*-\\d\+\/[\s\S]*companion-damage-feedback-\$\{testInfo\.project\.name\}\.png/,
  'normal-hit evidence must arm an empty event log and its epoch before combat starts, while still waiting for the room-title transition before capture');

const playerAttackTrigger = journey.match(/async function triggerConfirmedPlayerAttack\(page, attackIssuedAt\) \{[\s\S]*?\n\}/)?.[0] ?? '';
assert.match(playerAttackTrigger, /const inputBurst = 6;[\s\S]*readRuntimeCombatSnapshot\(page\)[\s\S]*playerLastAttackTime[\s\S]*livingEnemyPositions[\s\S]*moveWithKeyboard\(page, keys, durationMs\)[\s\S]*page\.keyboard\.press\('Space'\)[\s\S]*confirmedAt >= attackIssuedAt[\s\S]*No authoritative player attack occurred/,
  'the bounded input search must finish only after the same authoritative player timestamp consumed by the product advances');
assert.match(playerAttackTrigger, /const phase = attempt % 3;[\s\S]*phase === 0 \? \{ x: dx, y: dy \}[\s\S]*phase === 1 \? \{ x: -dy, y: dx \}[\s\S]*\{ x: dy, y: -dx \}/,
  'the device-independent search must alternate target approach and both lateral paths rather than guessing one fixed direction');
assert.doesNotMatch(playerAttackTrigger, /PLAYER_HIT_LOG|data-hit-flash|window\.__dungeonVeilRuntimeEvidence\.[a-zA-Z]+\([^)]/,
  'the test may read authoritative state but must not mutate combat through the QA bridge');
assert.doesNotMatch(playerAttackTrigger, /const inputBurst = (?:[7-9]|\d{2,})|durationMs = (?:[7-9]\d{2}|\d{4,})|waitForTimeout\((?:[3-9]\d{2}|\d{4,})\)/,
  'the adaptive search must remain short and bounded');
assert.match(journey, /await prepareLivePlayerAttackLine\(page\);\s*const attackIssuedAt = await page\.evaluate\(\(\) => performance\.now\(\)\);\s*const capturePromise = captureLiveCompanionFeedbackEvidence\(page, \{[\s\S]*role: 'critical-support',[\s\S]*critical: true,[\s\S]*notBefore: attackIssuedAt,[\s\S]*marker: \/✦\\s\*-\\d\+\/[\s\S]*companion-damage-feedback-critical-\$\{testInfo\.project\.name\}\.png[\s\S]*const \[confirmedPlayerAttackAt, observedCritical\] = await Promise\.all\(\[[\s\S]*triggerConfirmedPlayerAttack\(page, attackIssuedAt\),[\s\S]*capturePromise/,
  'critical capture must be armed before the adaptive supported-input search');
assert.match(journey, /expect\(confirmedPlayerAttackAt\)\.toBeGreaterThanOrEqual\(attackIssuedAt\);/,
  'the test must independently prove the authoritative player attack that causes the proc');
assert.match(journey, /expect\(observedCritical\.at\)\.toBeGreaterThanOrEqual\(attackIssuedAt\);/,
  'the accepted critical value must be an authoritative post-epoch companion action');

assert.match(workflow, /tests\/companion-runtime\.spec\.mjs/);
assert.match(workflow, /companion-damage-feedback-\$\{\{ matrix\.project \}\}\.png/);
assert.match(workflow, /companion-damage-feedback-critical-\$\{\{ matrix\.project \}\}\.png/);
assert.match(manifestGenerator, /'companion-damage-feedback-',/);
assert.match(manifestGenerator, /await fs\.writeFile\(path\.join\(root, 'companion-damage-feedback-device\.png'\), png\);/);
assert.match(manifestGenerator, /const companionEntry = manifest\.files\.find\(\(entry\) => entry\.path === 'companion-damage-feedback-device\.png'\);/);

console.log('Companion damage feedback contract passed.');