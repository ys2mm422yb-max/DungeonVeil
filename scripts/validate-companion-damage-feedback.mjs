import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtimePath = 'artifacts/dungeon-rpg/src/components/CompanionRuntimeBridge.tsx';
const runtimeEvidencePath = 'artifacts/dungeon-rpg/src/game/runtimeEvidenceBridge.ts';
const journeyPath = 'artifacts/dungeon-rpg/tests/companion-runtime.spec.mjs';
const workflowPath = '.github/workflows/product-autopilot-qa.yml';
const readabilityPath = 'artifacts/dungeon-rpg/src/companion-damage-feedback.css';
const componentReadabilityPath = 'artifacts/dungeon-rpg/src/components/companionDamageFeedback.css';
const combatStagePath = 'artifacts/dungeon-rpg/src/components/CombatStage.tsx';
const appPath = 'artifacts/dungeon-rpg/src/App.tsx';
const manifestGeneratorPath = 'artifacts/dungeon-rpg/scripts/create-product-evidence-file-manifest.mjs';

const [runtime, runtimeEvidence, journey, workflow, readability, componentReadability, combatStage, app, manifestGenerator] = await Promise.all([
  readFile(runtimePath, 'utf8'),
  readFile(runtimeEvidencePath, 'utf8'),
  readFile(journeyPath, 'utf8'),
  readFile(workflowPath, 'utf8'),
  readFile(readabilityPath, 'utf8'),
  readFile(componentReadabilityPath, 'utf8'),
  readFile(combatStagePath, 'utf8'),
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
assert.doesNotMatch(runtime, /min-h-\[38px\] min-w-\[82px\]/,
  'companion feedback must not restore the superseded large HUD-like minimum footprint');
assert.match(readability, /font-size:\s*clamp\(8px,\s*2\.2vw,\s*10\.5px\)\s*!important;/,
  'phone Basic feedback must stay deliberately secondary to ordinary player damage');
assert.match(readability, /data-critical="true"\][\s\S]*font-size:\s*clamp\(9\.5px,\s*2\.55vw,\s*12px\)\s*!important;/,
  'phone Critical feedback may be stronger than Basic but must remain bounded below the player hierarchy');
assert.match(readability, /@media \(min-width:\s*600px\) and \(orientation:\s*portrait\)[\s\S]*clamp\(11px,\s*1\.6vw,\s*13px\)[\s\S]*clamp\(13px,\s*1\.85vw,\s*16px\)/,
  'portrait tablets must retain a bounded stepped hierarchy instead of the historical 88x41 minimum');
assert.doesNotMatch(componentReadability, /min-width:\s*88px|min-height:\s*41px/,
  'the secondary component stylesheet must not resurrect the historical footprint');
assert.doesNotMatch(combatStage, /CompanionStatusChip|run-companion-chip/,
  'the live CombatStage must not render or reserve the deprecated companion status chip');
assert.match(app, /import '\.\/components\/companionDamageFeedback\.css';/);
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
assert.match(journey, /const COMPANION_FEEDBACK_CAPTURE_MAX_AGE_MS = 250;/,
  'stored full-context evidence must require a fresh action with at least 800ms of the fixed 1050ms visual lifetime reserved for capture');
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
assert.match(journey, /await page\.exposeBinding\(bindingName, async \(\{ page: boundPage \}, payload\) => \{/,
  'the qualifying browser observation must hand off directly to an exposed Playwright screenshot binding');
assert.match(journey, /const screenshot = await boundPage\.screenshot\(\{ path, fullPage: false, scale: 'css' \}\);[\s\S]*resolveScreenshot\(\{ screenshot, viewport, payload \}\)/,
  'the binding must start the full-context CSS-pixel screenshot before cross-process assertion work');
assert.match(journey, /await page\.evaluate\(\(\{ logKey, expectedRole, expectedCritical, minimumAt, maxActionAgeMs, binding, observation, observer \}\) => \{/,
  'the browser must install the correlation observer with the bounded freshness reserve');
assert.match(journey, /const inspect = \(\) => \{[\s\S]*const nodes = \[\.\.\.document\.querySelectorAll\('\[data-testid\^="companion-damage-number-"\]'\)\];/,
  'the atomic observer must inspect only currently rendered feedback nodes');
assert.match(journey, /node\.dataset\.companionRole !== expectedRole \|\| node\.dataset\.critical !== String\(expectedCritical\)/,
  'role and critical identity must be filtered in the same browser frame');
assert.match(journey, /entry\.role === expectedRole[\s\S]*entry\.kind === 'attack'[\s\S]*entry\.targetId === targetId[\s\S]*entry\.at > minimumAt/,
  'the live node must correlate to a strictly newer authoritative role, target and attack boundary');
assert.match(journey, /const captureNow = performance\.now\(\);\s*const actionAgeMs = captureNow - Number\(action\.at\);\s*if \(!Number\.isFinite\(actionAgeMs\) \|\| actionAgeMs < 0 \|\| actionAgeMs > maxActionAgeMs\) continue;/,
  'the atomic browser observer must reject late-life feedback before screenshot handoff');
assert.match(journey, /scope\[observation\] = payload;[\s\S]*scope\[observer\]\?\.disconnect\?\.\(\);[\s\S]*void scope\[binding\]\(payload\);/,
  'the accepted payload must be frozen and handed to Playwright in the same observer turn');
assert.match(journey, /const mutationObserver = new MutationObserver\(\(\) => inspect\(\)\);[\s\S]*mutationObserver\.observe\(document\.documentElement, \{[\s\S]*childList: true,[\s\S]*subtree: true,[\s\S]*attributes: true/,
  'transient feedback discovery must use one atomic MutationObserver instead of post-observation DOM reacquisition');
assert.match(journey, /maxActionAgeMs: COMPANION_FEEDBACK_CAPTURE_MAX_AGE_MS/,
  'the bounded 250ms action-age reserve must be passed into the atomic browser criterion');
assert.match(journey, /expect\(observedFeedback\.actionAgeMs\)\.toBeGreaterThanOrEqual\(0\);[\s\S]*toBeLessThanOrEqual\(COMPANION_FEEDBACK_CAPTURE_MAX_AGE_MS\)/,
  'accepted evidence metadata must prove it came from the strict freshness window');
assert.match(journey, /opacity < 0\.9/,
  'capture must wait for a clearly painted animation frame');
assert.match(journey, /const handle = await page\.waitForFunction\(\(\{ observation \}\) => window\[observation\] \|\| false,[\s\S]*timeout: 20_000,[\s\S]*polling: 16/,
  'the unchanged 20 second wait and 16ms cadence must remain while awaiting the atomically frozen observation');
assert.doesNotMatch(journey, /page\.waitForFunction\(\(\{ logKey, expectedRole, expectedCritical, minimumAt, maxActionAgeMs \}\)/,
  'the stale polling callback must not own transient discovery after atomic capture is installed');
assert.doesNotMatch(journey, /feedback\.count\(\)|feedback\.evaluate\(/,
  'slow cross-process count/evaluate sequencing must not return');
assert.match(journey, /const \{ screenshot, viewport, payload \} = await screenshotPromise;\s*observedFeedback = await handle\.jsonValue\(\);\s*expect\(payload\.feedbackId\)\.toBe\(observedFeedback\.feedbackId\);\s*expect\(payload\.capturedAt\)\.toBe\(observedFeedback\.capturedAt\);\s*assertReadableFeedback\(observedFeedback, \{ role, critical, marker \}\);\s*assertFullViewportPng\(screenshot, viewport\);/,
  'the completed atomic screenshot must be validated against the exact frozen observation payload');
assert.match(journey, /function assertFullViewportPng\(screenshot, viewport\) \{[\s\S]*screenshot\.subarray\(0, 8\)[\s\S]*screenshot\.length\)\.toBeGreaterThan\(10_000\)[\s\S]*readUInt32BE\(16\)[\s\S]*readUInt32BE\(20\)[\s\S]*toBeGreaterThanOrEqual\(viewport\.width\)[\s\S]*toBeGreaterThanOrEqual\(viewport\.height\)/,
  'saved evidence must be a non-empty PNG covering the complete configured portrait viewport');
assert.doesNotMatch(journey, /visibleAfterCapture|exactFeedback\.evaluate/,
  'the test must not require a deliberately transient 1050ms node to survive screenshot encoding');
assert.doesNotMatch(journey, /toBeGreaterThanOrEqual\(24\)|toBeLessThanOrEqual\(72\)|toBeGreaterThanOrEqual\(critical \? 17 : 15\)|toBeLessThanOrEqual\(critical \? 20\.5 : 18\)/,
  'the runtime journey must not restore the rejected oversized absolute companion footprint');
assert.match(journey, /expect\(observedFeedback\.backgroundColor\)\.toMatch\(\/rgba\\\(0, 0, 0, 0\\\)\|transparent\/i\);/);
assert.match(journey, /expect\(observedFeedback\.borderTopWidth\)\.toBe\('0px'\);/);
assert.match(journey, /expect\(observedFeedback\.boxShadow\)\.toBe\('none'\);/);
assert.match(journey, /expect\(observedFeedback\.pointerEvents\)\.toBe\('none'\);/);
assert.match(journey, /expect\(observedFeedback\.opacity\)\.toBeGreaterThanOrEqual\(0\.9\);/);
assert.match(journey, /getByTestId\('run-companion-chip'\)[\s\S]*toHaveCount\(0\)/,
  'the focused runtime journey must prove the deprecated run companion chip is absent');
assert.doesNotMatch(journey, /const chip\s*=\s*page\.getByTestId\('run-companion-chip'\)\s*;[\s\S]*?chip\.click\(/,
  'the journey must not click the removed run companion chip');
assert.doesNotMatch(journey, /expect\(chip\)\.toHaveAttribute\(/,
  'the journey must not assert attributes on a removed run companion chip locator');
assert.doesNotMatch(journey, /expect\(page\.getByTestId\('run-companion-chip'\)\)\.toHaveAttribute\(/,
  'the journey must not assert attributes on an inline removed run companion chip locator');
assert.match(journey, /async function readCompanionFeedbackDiagnostics\(page, \{ role, critical, notBefore \}\)/);
assert.match(journey, /now: performance\.now\(\),[\s\S]*minimumAt,[\s\S]*runtime:[\s\S]*runtimeEvidence: window\.__dungeonVeilRuntimeEvidence\?\.snapshot\(\) \?\? null,[\s\S]*actions:[\s\S]*liveFeedback:/,
  'a failed device must report input epoch, component state, authoritative player state, event timestamps and current nodes');
assert.match(journey, /Companion feedback diagnostics: \$\{JSON\.stringify\(diagnostics, null, 2\)\}/);
assert.match(journey, /async function waitForStableRoom\(page\)/);
assert.match(journey, /Date\.now\(\) - hiddenSince >= 1_200 \? 'stable' : 'settling'/);
assert.match(journey, /timeout: 120_000,[\s\S]*intervals: \[100, 250, 500\]/);
assert.match(journey, /await armCompanionActionObservation\(page\);\s*const basicEvidenceEpoch = await page\.evaluate\(\(\) => performance\.now\(\)\);\s*await startFreshRun\(page\);[\s\S]*await waitForStableRoom\(page\);\s*await captureLiveCompanionFeedbackEvidence\(page, \{[\s\S]*role: 'shield',[\s\S]*critical: false,[\s\S]*notBefore: basicEvidenceEpoch,[\s\S]*marker: \/◆\\s\*-\\d\+\/[\s\S]*companion-damage-feedback-\$\{testInfo\.project\.name\}\.png/,
  'normal-hit evidence must arm an empty event log and its epoch before combat starts, while still waiting for the room-title transition before capture');

const playerAttackTrigger = journey.match(/async function triggerConfirmedPlayerAttack\(page, attackBoundary\) \{[\s\S]*?\n\}/)?.[0] ?? '';
assert.match(playerAttackTrigger, /const inputBurst = 6;[\s\S]*readRuntimeCombatSnapshot\(page\)[\s\S]*playerLastAttackTime[\s\S]*livingEnemyPositions[\s\S]*moveWithKeyboard\(page, keys, durationMs\)[\s\S]*page\.keyboard\.press\('Space'\)[\s\S]*confirmedAt > attackBoundary[\s\S]*No authoritative player attack occurred/,
  'the bounded input search must finish only after the same authoritative player timestamp consumed by the product advances strictly beyond the captured boundary');
assert.match(playerAttackTrigger, /const phase = attempt % 3;[\s\S]*phase === 0 \? \{ x: dx, y: dy \}[\s\S]*phase === 1 \? \{ x: -dy, y: dx \}[\s\S]*\{ x: dy, y: -dx \}/,
  'the device-independent search must alternate target approach and both lateral paths rather than guessing one fixed direction');
assert.doesNotMatch(playerAttackTrigger, /PLAYER_HIT_LOG|data-hit-flash|window\.__dungeonVeilRuntimeEvidence\.[a-zA-Z]+\([^)]/,
  'the test may read authoritative state but must not mutate combat through the QA bridge');
assert.doesNotMatch(playerAttackTrigger, /const inputBurst = (?:[7-9]|\d{2,})|durationMs = (?:[7-9]\d{2}|\d{4,})|waitForTimeout\((?:[3-9]\d{2}|\d{4,})\)/,
  'the adaptive search must remain short and bounded');
assert.match(journey, /await prepareLivePlayerAttackLine\(page\);\s*const attackBoundary = Number\(\(await readRuntimeCombatSnapshot\(page\)\)\?\.playerLastAttackTime \|\| 0\);\s*const capturePromise = captureLiveCompanionFeedbackEvidence\(page, \{[\s\S]*role: 'critical-support',[\s\S]*critical: true,[\s\S]*notBefore: attackBoundary,[\s\S]*marker: \/✦\\s\*-\\d\+\/[\s\S]*companion-damage-feedback-critical-\$\{testInfo\.project\.name\}\.png[\s\S]*const \[confirmedPlayerAttackAt, observedCritical\] = await Promise\.all\(\[[\s\S]*triggerConfirmedPlayerAttack\(page, attackBoundary\),[\s\S]*capturePromise/,
  'critical capture must bind to the last authoritative player-attack boundary before the supported-input search');
assert.match(journey, /expect\(confirmedPlayerAttackAt\)\.toBeGreaterThan\(attackBoundary\);/,
  'the test must independently prove a strictly newer authoritative player attack that causes the proc');
assert.match(journey, /expect\(observedCritical\.at\)\.toBeGreaterThan\(attackBoundary\);/,
  'the accepted critical value must be a strictly newer authoritative companion action');
assert.match(workflow, /tests\/companion-runtime\.spec\.mjs/);
assert.match(workflow, /companion-damage-feedback-\$\{\{ matrix\.project \}\}\.png/);
assert.match(workflow, /companion-damage-feedback-critical-\$\{\{ matrix\.project \}\}\.png/);
assert.match(manifestGenerator, /'companion-damage-feedback-',/);
assert.match(manifestGenerator, /await fs\.writeFile\(path\.join\(root, 'companion-damage-feedback-device\.png'\), png\);/);
assert.match(manifestGenerator, /const companionEntry = manifest\.files\.find\(\(entry\) => entry\.path === 'companion-damage-feedback-device\.png'\);/);

console.log('Companion damage feedback contract passed.');
