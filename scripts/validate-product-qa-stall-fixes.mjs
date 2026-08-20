import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [guildRaidJourney, companionJourney, runtimeEvidence, visualReadiness, recoveryBaseline] = await Promise.all([
  readFile('artifacts/dungeon-rpg/tests/guild-raid-lobby-mobile.spec.mjs', 'utf8'),
  readFile('artifacts/dungeon-rpg/tests/companion-runtime.spec.mjs', 'utf8'),
  readFile('artifacts/dungeon-rpg/src/game/runtimeEvidenceBridge.ts', 'utf8'),
  readFile('artifacts/dungeon-rpg/tests/visual-render-readiness.mjs', 'utf8'),
  readFile('artifacts/dungeon-rpg/src/game/rendererRecoveryStableBaseline.ts', 'utf8'),
]);

assert.match(guildRaidJourney, /const corsHeaders = \{/,
  'the cross-origin Supabase fixture must define one maintained CORS response contract');
assert.match(guildRaidJourney, /'access-control-allow-origin': new URL\(APP_URL\)\.origin/,
  'the fixture must allow the exact preview origin rather than bypass browser access control');
assert.match(guildRaidJourney, /'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS'/,
  'the fixture must advertise every method used by the guild raid journey');
assert.match(guildRaidJourney, /if \(request\.method\(\) === 'OPTIONS'\) \{[\s\S]*status: 204[\s\S]*headers: corsHeaders/,
  'WebKit preflight requests must receive a deterministic successful CORS response');
assert.match(guildRaidJourney, /route\.fulfill\(\{ status: 200, headers: corsHeaders, contentType: 'application\/json'/,
  'actual mocked Supabase responses must retain the same CORS contract');
assert.doesNotMatch(guildRaidJourney, /access control checks[\s\S]*ignore|issues\.filter/,
  'the journey must fix cross-origin behavior rather than suppress the resulting runtime error');

assert.doesNotMatch(companionJourney,
  /COMPANION_ACTION_SNAPSHOTS|captureRenderedFeedback|scheduleRenderedFeedbackCapture|captureUntil|captureFrameScheduled/,
  'the evidence path must not reintroduce a historical frame buffer that can outlive the real feedback node');
assert.match(companionJourney, /const COMPANION_FEEDBACK_CAPTURE_MAX_AGE_MS = 250;/,
  'stored companion evidence must reserve at least 800ms of the unchanged 1050ms lifetime for full-context capture');
assert.match(companionJourney, /async function captureLiveCompanionFeedbackEvidence\(page, \{ role, critical, notBefore, marker, path \}\)/,
  'the focused journey must own one direct live-node capture helper');
assert.match(companionJourney, /await page\.exposeBinding\(bindingName, async \(\{ page: boundPage \}, payload\) => \{/,
  'the qualifying observation must trigger the Playwright screenshot binding directly');
assert.match(companionJourney, /const screenshot = await boundPage\.screenshot\(\{ path, fullPage: false, scale: 'css' \}\);[\s\S]*resolveScreenshot\(\{ screenshot, viewport, payload \}\)/,
  'full-context screenshot capture must begin inside the binding before assertion round trips');
assert.match(companionJourney, /await page\.evaluate\(\(\{ eventName, logKey, expectedRole, expectedCritical, minimumAt, maxActionAgeMs, binding, observation, observer, armed \}\) => \{/,
  'one browser-side observer installation must own discovery, event correlation, validation, freshness and explicit armed state');
assert.match(companionJourney, /scope\[armed\] = false;[\s\S]*window\.addEventListener\(eventName, actionListener\);[\s\S]*mutationObserver\.observe\(document\.documentElement,[\s\S]*inspect\(\);\s*scope\[armed\] = true;/,
  'the critical capture may be triggered only after the action listener, DOM observer and initial inspection are all armed');
assert.match(companionJourney, /const inspect = \(\) => \{[\s\S]*const nodes = \[\.\.\.document\.querySelectorAll\('\[data-testid\^="companion-damage-number-"\]'\)\];/,
  'the atomic browser observer must inspect currently rendered damage nodes without locator round trips');
assert.match(companionJourney, /node\.dataset\.companionRole !== expectedRole \|\| node\.dataset\.critical !== String\(expectedCritical\)/,
  'role and critical identity must be filtered inside the same browser frame');
assert.match(companionJourney, /entry\.role === expectedRole[\s\S]*entry\.targetId === targetId[\s\S]*entry\.at > minimumAt/,
  'the live node must remain correlated with a strictly newer authoritative attack after the requested boundary');
assert.match(companionJourney, /const captureNow = performance\.now\(\);\s*const actionAgeMs = captureNow - Number\(action\.at\);\s*if \(!Number\.isFinite\(actionAgeMs\) \|\| actionAgeMs < 0 \|\| actionAgeMs > maxActionAgeMs\) continue;/,
  'the atomic observer must reject feedback already too late in the fixed visual lifetime for reliable stored evidence');
assert.match(companionJourney, /const cleanup = \(\) => \{[\s\S]*mutationObserver\?\.disconnect\(\);[\s\S]*window\.removeEventListener\(eventName, actionListener\);[\s\S]*cancelAnimationFrame\(paintReinspectionFrame\);[\s\S]*scope\[observer\] = \{ disconnect: cleanup \};/,
  'observer cleanup must jointly release the DOM observer, companion-action listener and paint reinspection frame');
assert.match(companionJourney, /actionListener = event => \{[\s\S]*detail\.role !== expectedRole \|\| Number\(detail\.at\) <= minimumAt[\s\S]*inspect\(\);[\s\S]*window\.addEventListener\(eventName, actionListener\);/,
  'a qualifying COMPANION_ACTION_EVENT must re-inspect any still-connected pending feedback node');
assert.match(companionJourney, /scope\[observation\] = payload;[\s\S]*scope\[observer\]\?\.disconnect\?\.\(\);[\s\S]*void scope\[binding\]\(payload\);/,
  'the accepted payload must be frozen and handed to the screenshot binding in the same observer turn');
assert.match(companionJourney, /mutationObserver = new MutationObserver\(\(\) => inspect\(\)\);[\s\S]*mutationObserver\.observe\(document\.documentElement, \{[\s\S]*childList: true,[\s\S]*subtree: true,[\s\S]*attributes: true/,
  'transient feedback discovery must use one atomic MutationObserver');
assert.match(companionJourney, /maxActionAgeMs: COMPANION_FEEDBACK_CAPTURE_MAX_AGE_MS/,
  'the fixed freshness reserve must be supplied to the browser-side criterion');
assert.match(companionJourney, /expect\(observedFeedback\.actionAgeMs\)\.toBeGreaterThanOrEqual\(0\);[\s\S]*toBeLessThanOrEqual\(COMPANION_FEEDBACK_CAPTURE_MAX_AGE_MS\)/,
  'accepted metadata must prove the screenshot candidate came from the strict freshness window');
assert.match(companionJourney, /opacity < 0\.9/,
  'capture must reject inserted or fading frames that are not clearly painted');
assert.match(companionJourney, /const handle = await page\.waitForFunction\(\(\{ observation \}\) => window\[observation\] \|\| false,[\s\S]*timeout: 20_000,[\s\S]*polling: 16/,
  'the unchanged 20 second wait and 16ms cadence must remain while awaiting the atomically frozen observation');
assert.doesNotMatch(companionJourney, /page\.waitForFunction\(\(\{ logKey, expectedRole, expectedCritical, minimumAt, maxActionAgeMs \}\)/,
  'the stale polling callback must not own transient discovery after atomic capture is installed');
assert.doesNotMatch(companionJourney, /feedback\.count\(\)|feedback\.evaluate\(/,
  'separate locator count and evaluate round trips must not return');
assert.match(companionJourney, /const \{ screenshot, viewport, payload \} = await screenshotPromise;\s*observedFeedback = await handle\.jsonValue\(\);\s*expect\(payload\.feedbackId\)\.toBe\(observedFeedback\.feedbackId\);\s*expect\(payload\.capturedAt\)\.toBe\(observedFeedback\.capturedAt\);\s*assertReadableFeedback\(observedFeedback,[\s\S]*assertFullViewportPng\(screenshot, viewport\);/,
  'the completed atomic screenshot must be validated against the same frozen observation payload');
assert.match(companionJourney, /function assertFullViewportPng\(screenshot, viewport\) \{[\s\S]*screenshot\.subarray\(0, 8\)[\s\S]*screenshot\.length\)\.toBeGreaterThan\(10_000\)[\s\S]*readUInt32BE\(16\)[\s\S]*readUInt32BE\(20\)/,
  'the artifact itself must be validated instead of asking an expired transient node to remain alive after encoding');
assert.doesNotMatch(companionJourney, /visibleAfterCapture|exactFeedback\.evaluate/,
  'post-screenshot DOM liveness checks must not reintroduce the 1050ms race');
assert.match(companionJourney, /await armCompanionActionObservation\(page\);\s*await startFreshRun\(page\);[\s\S]*await waitForStableRoom\(page\);[\s\S]*const basicEvidenceBoundary = await page\.evaluate\(\(\) => performance\.now\(\)\);[\s\S]*const basicCapturePromise = captureLiveCompanionFeedbackEvidence\(page, \{[\s\S]*role: 'shield'[\s\S]*notBefore: basicEvidenceBoundary[\s\S]*__dungeonVeilBasicCompanionFeedbackObservationArmed[\s\S]*const basicPostArmBoundary = await page\.evaluate\(logKey => \{[\s\S]*Math\.max\(performance\.now\(\), \.\.\.log\.map[\s\S]*__dungeonVeilBasicCompanionFeedbackObservationSetMinimumAt[\s\S]*const observedBasic = await basicCapturePromise;[\s\S]*expect\(observedBasic\.at\)\.toBeGreaterThan\(basicPostArmBoundary\)/,
  'basic Shield evidence must arm the browser observer first, then close over a post-arm high-water boundary and accept only a strictly newer action');
assert.doesNotMatch(companionJourney, /PLAYER_HIT_LOG|PLAYER_HIT_OBSERVER|armPlayerHitObservation|data-hit-flash/,
  'the critical path must not depend on a non-authoritative visual hit signal');

assert.match(runtimeEvidence, /playerLastAttackTime: state\.player\.lastAttackTime/,
  'localhost-only telemetry must expose the exact authoritative player timestamp consumed by the proc');
assert.match(runtimeEvidence, /livingEnemyPositions: livingEnemies\.map/,
  'localhost-only telemetry must expose read-only target positions for supported input navigation');
assert.match(runtimeEvidence, /loadRoom:[\s\S]*attack: 1,[\s\S]*defense: 5_000/,
  'localhost-only room reload must keep player damage low and targets durable for causal feedback evidence');
assert.match(companionJourney, /sessionStorage\.setItem\(runtimeEvidenceMarker, '1'\)/,
  'authoritative telemetry must be enabled before the runtime bridge installs');
assert.match(companionJourney, /async function triggerConfirmedPlayerAttack\(page, attackBoundary\)/,
  'the critical path must independently prove a real player attack strictly after the authoritative boundary');
assert.match(companionJourney, /const inputBurst = 6;[\s\S]*readRuntimeCombatSnapshot\(page\)[\s\S]*livingEnemyPositions[\s\S]*moveWithKeyboard\(page, keys, durationMs\)[\s\S]*page\.keyboard\.press\('Space'\)[\s\S]*confirmedAt > attackBoundary/,
  'the bounded search must use real keyboard movement and finish only after authoritative attack time advances strictly beyond the captured boundary');
assert.match(companionJourney, /const phase = attempt % 3;[\s\S]*\{ x: dx, y: dy \}[\s\S]*\{ x: -dy, y: dx \}[\s\S]*\{ x: dy, y: -dx \}/,
  'the search must try the target line and both lateral paths instead of one device-specific guess');
assert.match(companionJourney, /const durableCriticalRoom = await page\.evaluate\(\(\) => window\.__dungeonVeilRuntimeEvidence\?\.loadRoom\(1, 'solo'\) \?\? null\);[\s\S]*expect\(Number\(durableCriticalRoom\?\.livingEnemies \|\| 0\)\)\.toBeGreaterThan\(0\);/,
  'critical evidence may use only the localhost room reload to preserve a living target before the strict causal capture');
assert.doesNotMatch(companionJourney, /__dungeonVeilRuntimeEvidence\?\.(?:killLivingEnemies|moveToExit|chooseFirstGift|setMode|setPlayerStats|setLivingEnemyFamilies)/,
  'the companion journey must not mutate combat through any other QA control');
assert.match(companionJourney, /const attackBoundary = Number\(\(await readRuntimeCombatSnapshot\(page\)\)\?\.playerLastAttackTime \|\| 0\);[\s\S]*const capturePromise = captureLiveCompanionFeedbackEvidence\(page, \{[\s\S]*role: 'critical-support'[\s\S]*notBefore: attackBoundary[\s\S]*__dungeonVeilCriticalCompanionFeedbackObservationArmed[\s\S]*const atomicReadyBoundaryHandle = await page\.waitForFunction\(\(\{ setter \}\) => \{[\s\S]*data-critical-special-ready[\s\S]*const evidenceBoundary = performance\.now\(\);[\s\S]*window\[setter\]\?\.\(evidenceBoundary\) !== true[\s\S]*playerLastAttackTime[\s\S]*return \{ evidenceBoundary, playerLastAttackTime \};[\s\S]*__dungeonVeilCriticalCompanionFeedbackObservationSetMinimumAt[\s\S]*timeout: 20_000,[\s\S]*polling: 16[\s\S]*const readyAttackBoundary = Number\(atomicReadyBoundary\.playerLastAttackTime \|\| 0\);[\s\S]*const confirmedPlayerAttackAt = await triggerConfirmedPlayerAttack\(page, readyAttackBoundary\);[\s\S]*window\[setter\]\?\.\(confirmedAt\) === true[\s\S]*const observedCritical = await capturePromise;[\s\S]*expect\(confirmedPlayerAttackAt\)\.toBeGreaterThan\(readyAttackBoundary\)[\s\S]*expect\(observedCritical\.at\)\.toBeGreaterThan\(confirmedPlayerAttackAt\)/,
  'critical evidence must atomically close the accepted browser boundary in the same turn as the real 2600ms readiness before triggering and correlating a strictly newer authoritative player attack');
assert.match(companionJourney, /runtimeEvidence: window\.__dungeonVeilRuntimeEvidence\?\.snapshot\(\) \?\? null/,
  'device failures must include the authoritative player and target snapshot');
assert.match(companionJourney, /observedAt: performance\.now\(\)/,
  'device failures must retain the browser event timestamp');
assert.match(companionJourney, /Companion feedback diagnostics: \$\{JSON\.stringify\(diagnostics, null, 2\)\}/,
  'a failed live capture must emit bounded runtime, action and node diagnostics');
assert.doesNotMatch(companionJourney, /waitForCorrelatedCompanionFeedback|captureCorrelatedCompanionFeedbackEvidence/,
  'the expired-ID historical-snapshot sequence must not return');

assert.match(companionJourney, /const COMPANION_FEEDBACK_REJECTION_LOG = '__dungeonVeilCompanionFeedbackRejectionLog';/,
  'Product QA must retain an exact-head browser rejection log for the transient companion capture');
assert.match(companionJourney, /const recordRejection = \(reason, node, extra = \{\}\) => \{[\s\S]*if \(log\.length > 32\) log\.splice\(0, log\.length - 32\);/,
  'rejection telemetry must stay bounded during longer browser runs');
assert.match(companionJourney, /'identity-mismatch'|'disconnected'|'no-correlated-action'|'action-age'|'not-visible-geometry'|'opacity-below-threshold'/,
  'Product QA must distinguish the exact capture rejection predicate before changing acceptance behavior');
assert.match(companionJourney, /rejections: \(window\[rejectionLogKey\] \|\| \[\]\)\.slice\(-32\)/,
  'failure diagnostics must expose the bounded rejection history');

assert.match(visualReadiness, /const restoredState = await readReadinessState\(page\);[\s\S]*const expectedRecoveredHp = beforeRecoveryHp;[\s\S]*toBe\(expectedRecoveredHp\)/,
  'renderer recovery must require the exact pre-recovery HP baseline instead of accepting either of two values');
assert.doesNotMatch(visualReadiness, /\[beforeRecoveryHp, mutatedHp\]\.includes/,
  'renderer recovery acceptance must not weaken into a multi-value allowance');
assert.match(visualReadiness, /expectedPlayerHp: expectedRecoveredHp/,
  'renderer recovery artifact metadata must record the single expected HP baseline');
assert.match(recoveryBaseline, /const RENDERER_RECOVERY_BASELINE_TTL_MS = 2_000;/,
  'recovery baseline retention must stay short and bounded');
assert.match(recoveryBaseline, /export function retainRendererRecoveryHpBeforePotentialMutation\(/,
  'the stable baseline helper must accept the trusted pre-mutation HP before the renderer mutation can fire');
assert.match(recoveryBaseline, /const retainedPreMutationHp = getRetainedRendererRecoveryHp\(instanceId\);[\s\S]*const preUpdateHp = activeEngine\.state\.player\.hp;[\s\S]*const liveHp = getLivePlayerHp\(\);[\s\S]*engine\.update\(0\);/,
  'the no-op recovery update must capture both retained and live baselines before ticking the engine');
assert.match(recoveryBaseline, /rendererBaselineFinalizePassRef\.current = 0;[\s\S]*rendererBaselineFinalizePendingRef\.current = true;/,
  'retained recovery finalization must enter one explicit bounded pending state after the recovery apply');
assert.match(recoveryBaseline, /if \(rendererBaselineFinalizePendingRef\.current\) \{[\s\S]*const finalizePass = rendererBaselineFinalizePassRef\.current;[\s\S]*if \(finalizePass === 0\) \{[\s\S]*rendererBaselineFinalizePassRef\.current = 1;[\s\S]*\} else \{[\s\S]*clearRetainedRendererRecoveryHp\(props\.instanceId\);[\s\S]*rendererBaselineFinalizePendingRef\.current = false;[\s\S]*rendererBaselineFinalizePassRef\.current = 0;/,
  'one no-op update must preserve the pending recovery baseline and the following no-op must expire it');
assert.match(recoveryBaseline, /if \(retainedPreMutationHp !== null\) \{[\s\S]*liveHp !== retainedPreMutationHp[\s\S]*activeEngine\.state\.player\.hp = retainedPreMutationHp;[\s\S]*else if \(Number\.isFinite\(liveHp\) && liveHp !== preUpdateHp\)[\s\S]*activeEngine\.state\.player\.hp = preUpdateHp;/,
  'recovery must prefer the retained pre-mutation baseline while preserving the original single-frame fallback');

console.log('Product QA anti-stall fixture contracts passed.');