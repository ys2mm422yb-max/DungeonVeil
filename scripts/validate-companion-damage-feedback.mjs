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
assert.match(runtime, /const CRITICAL_SUPPORT_SPECIAL_COOLDOWN_MS = 2_600;/,
  'critical-support readiness must derive from the unchanged real special cooldown');
assert.match(runtime, /markerRef\.current\.dataset\.criticalSpecialReady = String\([\s\S]*activeRole === 'critical-support'[\s\S]*now - lastSpecialActionRef\.current >= CRITICAL_SUPPORT_SPECIAL_COOLDOWN_MS[\s\S]*\);/,
  'the diagnostic readiness marker must expose the same real cooldown gate used by the critical proc');
const readinessPublishAt = runtime.indexOf('markerRef.current.dataset.criticalSpecialReady = String(');
const lastSpecialMutationAt = runtime.lastIndexOf('lastSpecialActionRef.current = now;');
assert.ok(readinessPublishAt > lastSpecialMutationAt,
  'critical-support readiness must be published after every tick branch that can consume the special cooldown');
assert.match(runtime, /markerRef\.current\.dataset\.lastObservedPlayerAttackAt = String\(lastPlayerAttackRef\.current\);/,
  'the runtime bridge must expose the last player attack consumed by its 10 Hz companion tick');
assert.match(runtime, /data-last-observed-player-attack-at=""/,
  'the runtime marker must initialize the consumed-player-attack synchronization contract');
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
assert.match(journey, /await page\.evaluate\(\(\{ eventName, logKey, expectedRole, expectedCritical, minimumAt, maxActionAgeMs, binding, observation, observer, armed \}\) => \{/,
  'the browser must install the correlation observer and explicit armed signal with the companion action event and bounded freshness reserve');
assert.match(journey, /const initialMinimumAt = minimumAt;\s*minimumAt = Number\.POSITIVE_INFINITY;/,
  'both Basic and Critical capture must start with a closed acceptance boundary until the browser observer is armed');
assert.match(journey, /scope\[armed\] = false;[\s\S]*window\.addEventListener\(eventName, actionListener\);[\s\S]*mutationObserver\.observe\(document\.documentElement,[\s\S]*inspect\(\);\s*scope\[armed\] = true;/,
  'the browser observer must publish armed only after action listener, MutationObserver and initial inspection are installed');
assert.match(journey, /const inspect = \(\) => \{[\s\S]*const nodes = \[\.\.\.document\.querySelectorAll\('\[data-testid\^="companion-damage-number-"\]'\)\];/,
  'the atomic observer must inspect only currently rendered feedback nodes');
assert.match(journey, /node\.dataset\.companionRole !== expectedRole \|\| node\.dataset\.critical !== String\(expectedCritical\)/,
  'role and critical identity must be filtered in the same browser frame');
assert.match(journey, /entry\.role === expectedRole[\s\S]*entry\.kind === 'attack'[\s\S]*entry\.targetId === targetId[\s\S]*entry\.at > minimumAt/,
  'the live node must correlate to a strictly newer authoritative role, target and attack boundary');
assert.match(journey, /const captureNow = performance\.now\(\);\s*const actionAgeMs = captureNow - Number\(action\.at\);\s*if \(!Number\.isFinite\(actionAgeMs\) \|\| actionAgeMs < 0 \|\| actionAgeMs > maxActionAgeMs\) continue;/,
  'the atomic browser observer must reject late-life feedback before screenshot handoff');
assert.match(journey, /const cleanup = \(\) => \{[\s\S]*mutationObserver\?\.disconnect\(\);[\s\S]*window\.removeEventListener\(eventName, actionListener\);[\s\S]*cancelAnimationFrame\(paintReinspectionFrame\);[\s\S]*scope\[observer\] = \{ disconnect: cleanup \};/,
  'capture cleanup must jointly release the mutation observer, companion action listener and paint reinspection frame');
assert.match(journey, /actionListener = event => \{[\s\S]*detail\.role !== expectedRole \|\| Number\(detail\.at\) <= minimumAt[\s\S]*queueMicrotask\(\(\) => inspect\(\)\);[\s\S]*window\.addEventListener\(eventName, actionListener\);/,
  'COMPANION_ACTION_EVENT must re-inspect a still-connected pending node after the authoritative action dispatch completes');
assert.match(journey, /scope\[observation\] = payload;[\s\S]*scope\[observer\]\?\.disconnect\?\.\(\);[\s\S]*void scope\[binding\]\(payload\);/,
  'the accepted payload must be frozen and handed to Playwright in the same observer turn');
assert.match(journey, /mutationObserver = new MutationObserver\(\(\) => inspect\(\)\);[\s\S]*mutationObserver\.observe\(document\.documentElement, \{[\s\S]*childList: true,[\s\S]*subtree: true,[\s\S]*attributes: true/,
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
assert.match(journey, /const titleStable = Date\.now\(\) - hiddenSince >= 1_200;/,
  'the original continuous 1200ms hidden-title threshold must remain unchanged');
assert.match(journey, /const rendererHost = document\.querySelector\('\[data-testid="run-three-host"\]'\);[\s\S]*data-room-paint-expected-key[\s\S]*data-room-paint-ready-key/,
  'room stability must read renderer-owned expected and paint-ready keys from the live run renderer host');
assert.match(journey, /!expectedPaintKey \|\| paintReadyKey !== expectedPaintKey[\s\S]*'renderer-pending'[\s\S]*return titleStable \? 'stable' : 'settling'/,
  'room stability must require a non-empty matching renderer paint key in addition to the unchanged 1200ms title contract');
assert.match(journey, /timeout: 120_000,[\s\S]*intervals: \[100, 250, 500\]/);
assert.match(journey, /await waitForStableRoom\(page\);\s*await prepareLivePlayerAttackLine\(page\);\s*const basicEvidenceBoundary = await page\.evaluate\(\(\) => performance\.now\(\)\);\s*const basicCapturePromise = captureLiveCompanionFeedbackEvidence\(page, \{[\s\S]*role: 'shield',[\s\S]*critical: false,[\s\S]*notBefore: basicEvidenceBoundary,[\s\S]*companion-damage-feedback-\$\{testInfo\.project\.name\}\.png[\s\S]*__dungeonVeilBasicCompanionFeedbackObservationArmed[\s\S]*timeout: 20_000, polling: 16[\s\S]*const basicPostArmBoundary = await page\.evaluate[\s\S]*__dungeonVeilBasicCompanionFeedbackObservationSetMinimumAt[\s\S]*expect\(basicBoundaryAdvanced\)\.toBe\(true\);[\s\S]*const observedBasic = await basicCapturePromise;[\s\S]*expect\(observedBasic\.at\)\.toBeGreaterThan\(basicPostArmBoundary\);/,
  'normal-hit evidence must arm the browser observer before opening a fresh post-arm action boundary and must accept only a strictly newer Shield action');

const atomicPlayerAttackReader = journey.match(/async function readConfirmedPlayerAttackAndArm\(page, attackBoundary, expectedPlayerAttackSetterKey\) \{[\s\S]*?\n\}/)?.[0] ?? '';
assert.match(atomicPlayerAttackReader, /page\.evaluate\(async \(\{ boundary, setterKey, maxMirrorWaitMs \}\) => \{[\s\S]*const readState = \(\) => \{[\s\S]*window\.__dungeonVeilRuntimeEvidence\?\.snapshot\(\) \?\? null[\s\S]*const confirmedAt = Number\(snapshot\?\.playerLastAttackTime \|\| 0\);[\s\S]*data-last-critical-special-player-attack-at[\s\S]*data-last-observed-player-attack-at[\s\S]*criticalSpecialAt > boundary[\s\S]*criticalSpecialAt === confirmedAt[\s\S]*observedPlayerAttackAt === criticalSpecialAt[\s\S]*while \(performance\.now\(\) - startedAt <= maxMirrorWaitMs\)[\s\S]*requestAnimationFrame\(resolve\)[\s\S]*if \(state\.confirmedAt <= boundary \|\| !state\.runtimeConfirmed\)[\s\S]*const armed = setterKey \? window\[setterKey\]\?\.\(state\.confirmedAt\) === true : true;[\s\S]*maxMirrorWaitMs: COMPANION_FEEDBACK_CAPTURE_MAX_AGE_MS/,
  'authoritative player-attack observation must wait only inside the existing 250ms freshness budget for exact runtime-source convergence, then arm the exact timestamp in-browser or fail closed');

const playerAttackTrigger = journey.match(/async function triggerConfirmedPlayerAttack\(page, attackBoundary, expectedPlayerAttackSetterKey = ''\) \{[\s\S]*?\n\}/)?.[0] ?? '';
assert.match(playerAttackTrigger, /const inputBurst = 6;[\s\S]*readConfirmedPlayerAttackAndArm\(page, attackBoundary, expectedPlayerAttackSetterKey\)[\s\S]*livingEnemyPositions[\s\S]*moveWithKeyboard\(page, keys, durationMs\)[\s\S]*page\.keyboard\.press\('Space'\)[\s\S]*confirmedAt > attackBoundary[\s\S]*No authoritative player attack occurred/,
  'the bounded input search must finish only after the same authoritative player timestamp consumed by the product advances strictly beyond the captured boundary and is atomically armed');
assert.match(playerAttackTrigger, /await moveWithKeyboard\(page, keys, durationMs\);[\s\S]*const movementState = await readConfirmedPlayerAttackAndArm\(page, attackBoundary, expectedPlayerAttackSetterKey\);[\s\S]*const movementAttackAt = Number\(movementState\.confirmedAt \|\| 0\);[\s\S]*if \(movementAttackAt > attackBoundary\) \{[\s\S]*if \(!movementState\.armed\) throw new Error\([\s\S]*return movementAttackAt;[\s\S]*\}[\s\S]*await page\.keyboard\.press\('Space'\);/,
  'the input search must atomically arm and return the first authoritative attack produced during target approach before issuing another attack input');
assert.match(playerAttackTrigger, /const phase = attempt % 3;[\s\S]*phase === 0 \? \{ x: dx, y: dy \}[\s\S]*phase === 1 \? \{ x: -dy, y: dx \}[\s\S]*\{ x: dy, y: -dx \}/,
  'the device-independent search must alternate target approach and both lateral paths rather than guessing one fixed direction');
assert.match(playerAttackTrigger, /could not be armed atomically/,
  'atomic source correlation must fail closed rather than accepting an unarmed authoritative attack');
assert.doesNotMatch(playerAttackTrigger, /PLAYER_HIT_LOG|data-hit-flash|window\.__dungeonVeilRuntimeEvidence\.[a-zA-Z]+\([^)]/,
  'the test may read authoritative state but must not mutate combat through the QA bridge');
assert.doesNotMatch(playerAttackTrigger, /const inputBurst = (?:[7-9]|\d{2,})|durationMs = (?:[7-9]\d{2}|\d{4,})|waitForTimeout\((?:[3-9]\d{2}|\d{4,})\)/,
  'the adaptive search must remain short and bounded');
assert.match(journey, /await prepareLivePlayerAttackLine\(page\);\s*const attackBoundary = Number\(\(await readRuntimeCombatSnapshot\(page\)\)\?\.playerLastAttackTime \|\| 0\);\s*const capturePromise = captureLiveCompanionFeedbackEvidence\(page, \{[\s\S]*role: 'critical-support',[\s\S]*critical: true,[\s\S]*notBefore: attackBoundary,[\s\S]*marker: \/✦\\s\*-\\d\+\/[\s\S]*companion-damage-feedback-critical-\$\{testInfo\.project\.name\}\.png[\s\S]*__dungeonVeilCriticalCompanionFeedbackObservationArmed[\s\S]*const atomicReadyBoundaryHandle = await page\.waitForFunction\(\(\{ setter \}\) => \{[\s\S]*data-critical-special-ready[\s\S]*const evidenceBoundary = performance\.now\(\);[\s\S]*window\[setter\]\?\.\(evidenceBoundary\) !== true[\s\S]*playerLastAttackTime[\s\S]*return \{ evidenceBoundary, playerLastAttackTime \};[\s\S]*const replenishedCriticalRoom = await page\.evaluate[\s\S]*const expectedPlayerAttackSetterKey = '__dungeonVeilCriticalCompanionFeedbackObservationSetExpectedPlayerAttackAt';[\s\S]*const confirmationWatcherKey = '__dungeonVeilCriticalSupportPlayerAttackConfirmationWatcher';[\s\S]*const confirmationStateKey = '__dungeonVeilCriticalSupportPlayerAttackConfirmedAt';[\s\S]*const confirmationObservationKey = '__dungeonVeilCriticalCompanionFeedbackObservation';[\s\S]*const captureBoundaryHandle = await page\.waitForFunction[\s\S]*data-last-observed-player-attack-at[\s\S]*playerLastAttackTime !== observedPlayerAttackAt[\s\S]*const confirmationBoundary = Math\.max\(readyAttackBoundary, captureBoundary, captureBoundaryState\.playerLastAttackTime\);/,
  'critical capture must retain the original durable-room and final-boundary setup before enabling exact source confirmation');
assert.match(journey, /const confirmationWatcherInstalled = await page\.evaluate\(\(\{ setterKey, watcherKey, stateKey, observationKey, boundary \}\) => \{[\s\S]*if \(scope\[observationKey\]\) return false;[\s\S]*window\.__dungeonVeilRuntimeEvidence\?\.snapshot\(\) \?\? null[\s\S]*const authoritativeAt = Number\(snapshot\?\.playerLastAttackTime \|\| 0\);[\s\S]*data-last-critical-special-player-attack-at[\s\S]*data-last-observed-player-attack-at[\s\S]*criticalSpecialAt > boundary[\s\S]*criticalSpecialAt > previousConfirmedAt[\s\S]*criticalSpecialAt === authoritativeAt[\s\S]*observedPlayerAttackAt === criticalSpecialAt[\s\S]*scope\[setterKey\]\?\.\(criticalSpecialAt\) !== true[\s\S]*scope\[stateKey\] = criticalSpecialAt;/,
  'latest-source tracking must advance only in-browser to a strictly newer special-producing attack that independently matches authoritative and consumed runtime timestamps');
assert.match(journey, /new MutationObserver\(\(\) => confirmRuntimeSource\(\)\)[\s\S]*attributeFilter: \['data-last-critical-special-player-attack-at', 'data-last-observed-player-attack-at'\][\s\S]*scope\[watcherKey\] = \{ disconnect: \(\) => observer\.disconnect\(\) \};[\s\S]*confirmRuntimeSource\(\);/,
  'latest-source tracking must be mutation-driven inside the browser and must observe only the two source-correlation attributes');
assert.match(journey, /expect\(confirmationWatcherInstalled\)\.toBe\(true\);[\s\S]*const initialConfirmedPlayerAttackAt = await triggerConfirmedPlayerAttack\([\s\S]*confirmationBoundary,[\s\S]*expectedPlayerAttackSetterKey,[\s\S]*\);[\s\S]*const observedCritical = await capturePromise;[\s\S]*const finalConfirmedPlayerAttackAt = await page\.evaluate\(stateKey => Number\(window\[stateKey\] \|\| 0\), confirmationStateKey\);/,
  'the bounded real-input search must establish an initial exact source and acceptance must then read the final independently confirmed source after capture');
assert.match(journey, /expect\(initialConfirmedPlayerAttackAt\)\.toBeGreaterThan\(readyAttackBoundary\);[\s\S]*toBeGreaterThan\(evidenceBoundary\);[\s\S]*toBeGreaterThan\(captureBoundary\);[\s\S]*expect\(finalConfirmedPlayerAttackAt\)\.toBeGreaterThanOrEqual\(initialConfirmedPlayerAttackAt\);[\s\S]*expect\(finalConfirmedPlayerAttackAt\)\.toBeGreaterThan\(captureBoundary\);[\s\S]*expect\(observedCritical\.criticalPlayerAttackAt\)\.toBe\(finalConfirmedPlayerAttackAt\);[\s\S]*expect\(observedCritical\.at\)\.toBeGreaterThan\(finalConfirmedPlayerAttackAt\);/,
  'accepted feedback must still prove strict boundaries and exact equality, while allowing only a newer independently confirmed special source to supersede the initial source');
assert.match(journey, /window\[watcherKey\]\?\.disconnect\?\.\(\);[\s\S]*delete window\[watcherKey\];[\s\S]*delete window\[stateKey\];/,
  'the source-confirmation watcher and state must be cleaned up deterministically');
assert.match(journey, /data-last-critical-special-player-attack-at[\s\S]*criticalPlayerAttackAt <= minimumAt[\s\S]*critical-player-attack-boundary[\s\S]*criticalPlayerAttackAt,/,
  'critical capture must reject feedback whose runtime source player attack predates the final boundary');
assert.match(journey, /expect\(evidenceBoundary\)\.toBeGreaterThan\(attackBoundary\);/,
  'the atomically installed readiness boundary must advance beyond the original authoritative player-attack boundary');
assert.match(journey, /expect\(readyAttackBoundary\)\.toBeGreaterThanOrEqual\(attackBoundary\);/,
  'the same browser turn must return the authoritative player-attack snapshot used to start the bounded input search');
const criticalReadyBoundaryAt = journey.indexOf('const atomicReadyBoundary = await atomicReadyBoundaryHandle.jsonValue();');
const criticalRoomReplenishAt = journey.indexOf('const replenishedCriticalRoom = await page.evaluate');
const criticalCaptureBoundaryAt = journey.indexOf('const captureBoundaryHandle = await page.waitForFunction');
const criticalWatcherAt = journey.indexOf('const confirmationWatcherInstalled = await page.evaluate');
const criticalInputAt = journey.indexOf('const initialConfirmedPlayerAttackAt = await triggerConfirmedPlayerAttack');
assert.ok(
  criticalReadyBoundaryAt >= 0
  && criticalRoomReplenishAt > criticalReadyBoundaryAt
  && criticalCaptureBoundaryAt > criticalRoomReplenishAt
  && criticalWatcherAt > criticalCaptureBoundaryAt
  && criticalInputAt > criticalWatcherAt,
  'target replenishment and re-stabilization must finish before the final strict pre-input boundary, in-browser confirmation watcher and bounded real input',
);
assert.match(workflow, /tests\/companion-runtime\.spec\.mjs/);
assert.match(workflow, /companion-damage-feedback-\$\{\{ matrix\.project \}\}\.png/);
assert.match(workflow, /companion-damage-feedback-critical-\$\{\{ matrix\.project \}\}\.png/);
assert.match(manifestGenerator, /'companion-damage-feedback-',/);
assert.match(manifestGenerator, /await fs\.writeFile\(path\.join\(root, 'companion-damage-feedback-device\.png'\), png\);/);
assert.match(manifestGenerator, /const companionEntry = manifest\.files\.find\(\(entry\) => entry\.path === 'companion-damage-feedback-device\.png'\);/);

assert.match(journey, /const COMPANION_FEEDBACK_REJECTION_LOG = '__dungeonVeilCompanionFeedbackRejectionLog';/,
  'the exact-head capture must keep a dedicated bounded rejection log for causal device diagnostics');
assert.match(journey, /const recordRejection = \(reason, node, extra = \{\}\) => \{[\s\S]*if \(log\.length > 32\) log\.splice\(0, log\.length - 32\);/,
  'rejection diagnostics must be bounded and must not grow with a long run');
assert.match(journey, /'identity-mismatch'|'disconnected'|'no-correlated-action'|'action-age'|'not-visible-geometry'|'opacity-below-threshold'/,
  'the capture must distinguish the first causal rejection boundary without changing acceptance');
assert.match(journey, /rejections: \(window\[rejectionLogKey\] \|\| \[\]\)\.slice\(-32\)/,
  'failure diagnostics must surface the bounded historical rejection trail');

console.log('Companion damage feedback contract passed.');
