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
assert.match(companionJourney, /const handle = await page\.waitForFunction\(\(\{ logKey, expectedRole, expectedCritical, minimumAt, maxActionAgeMs \}\) => \{/,
  'one browser-side waiter must own discovery, validation and freshness of the transient feedback node');
assert.match(companionJourney, /const nodes = \[\.\.\.document\.querySelectorAll\('\[data-testid\^="companion-damage-number-"\]'\)\];/,
  'the browser-side waiter must inspect the currently rendered damage nodes without locator round trips');
assert.match(companionJourney, /node\.dataset\.companionRole !== expectedRole \|\| node\.dataset\.critical !== String\(expectedCritical\)/,
  'role and critical identity must be filtered inside the same browser frame');
assert.match(companionJourney, /entry\.role === expectedRole[\s\S]*entry\.targetId === targetId[\s\S]*entry\.at > minimumAt/,
  'the live node must remain correlated with a strictly newer authoritative attack after the requested boundary');
assert.match(companionJourney, /const captureNow = performance\.now\(\);\s*const actionAgeMs = captureNow - Number\(action\.at\);\s*if \(!Number\.isFinite\(actionAgeMs\) \|\| actionAgeMs < 0 \|\| actionAgeMs > maxActionAgeMs\) continue;/,
  'the browser-side waiter must reject feedback that is already too late in the fixed visual lifetime for reliable stored evidence');
assert.match(companionJourney, /maxActionAgeMs: COMPANION_FEEDBACK_CAPTURE_MAX_AGE_MS/,
  'the fixed freshness reserve must be supplied to the browser-side criterion');
assert.match(companionJourney, /expect\(observedFeedback\.actionAgeMs\)\.toBeGreaterThanOrEqual\(0\);[\s\S]*toBeLessThanOrEqual\(COMPANION_FEEDBACK_CAPTURE_MAX_AGE_MS\)/,
  'accepted metadata must prove the screenshot candidate came from the strict freshness window');
assert.match(companionJourney, /opacity < 0\.9/,
  'capture must reject inserted or fading frames that are not clearly painted');
assert.match(companionJourney, /timeout: 20_000,[\s\S]*polling: 16/,
  'the unchanged 20 second criterion must sample the 1050ms feedback window at the accepted deterministic 16ms observer cadence');
assert.doesNotMatch(companionJourney, /feedback\.count\(\)|feedback\.evaluate\(/,
  'separate locator count and evaluate round trips must not return');
assert.match(companionJourney, /const viewport = page\.viewportSize\(\);\s*expect\(viewport\)\.toBeTruthy\(\);\s*const screenshot = await page\.screenshot\(\{ path, fullPage: false, scale: 'css' \}\);\s*observedFeedback = await handle\.jsonValue\(\);\s*assertReadableFeedback\(observedFeedback,[\s\S]*assertFullViewportPng\(screenshot, viewport\);/,
  'CSS-pixel screenshot capture must begin directly after the qualifying browser frame, before object transfer and assertions can consume the transient visual window');
assert.doesNotMatch(companionJourney, /handle\.jsonValue\(\)[\s\S]{0,300}page\.screenshot/,
  'cross-process object transfer must not occur before the full-context evidence capture starts');
assert.match(companionJourney, /function assertFullViewportPng\(screenshot, viewport\) \{[\s\S]*screenshot\.subarray\(0, 8\)[\s\S]*screenshot\.length\)\.toBeGreaterThan\(10_000\)[\s\S]*readUInt32BE\(16\)[\s\S]*readUInt32BE\(20\)/,
  'the artifact itself must be validated instead of asking an expired transient node to remain alive after encoding');
assert.doesNotMatch(companionJourney, /visibleAfterCapture|exactFeedback\.evaluate/,
  'post-screenshot DOM liveness checks must not reintroduce the 1050ms race');
assert.match(companionJourney, /await armCompanionActionObservation\(page\);\s*const basicEvidenceEpoch = await page\.evaluate\(\(\) => performance\.now\(\)\);\s*await startFreshRun\(page\);[\s\S]*await waitForStableRoom\(page\);\s*await captureLiveCompanionFeedbackEvidence/,
  'the empty action log and basic feedback epoch must be armed before combat starts, while capture still waits for the room-title transition to settle');
assert.doesNotMatch(companionJourney, /PLAYER_HIT_LOG|PLAYER_HIT_OBSERVER|armPlayerHitObservation|data-hit-flash/,
  'the critical path must not depend on a non-authoritative visual hit signal');

assert.match(runtimeEvidence, /playerLastAttackTime: state\.player\.lastAttackTime/,
  'localhost-only telemetry must expose the exact authoritative player timestamp consumed by the proc');
assert.match(runtimeEvidence, /livingEnemyPositions: livingEnemies\.map/,
  'localhost-only telemetry must expose read-only target positions for supported input navigation');
assert.match(companionJourney, /sessionStorage\.setItem\(runtimeEvidenceMarker, '1'\)/,
  'authoritative telemetry must be enabled before the runtime bridge installs');
assert.match(companionJourney, /async function triggerConfirmedPlayerAttack\(page, attackBoundary\)/,
  'the critical path must independently prove a real player attack strictly after the authoritative boundary');
assert.match(companionJourney, /const inputBurst = 6;[\s\S]*readRuntimeCombatSnapshot\(page\)[\s\S]*livingEnemyPositions[\s\S]*moveWithKeyboard\(page, keys, durationMs\)[\s\S]*page\.keyboard\.press\('Space'\)[\s\S]*confirmedAt > attackBoundary/,
  'the bounded search must use real keyboard movement and finish only after authoritative attack time advances strictly beyond the captured boundary');
assert.match(companionJourney, /const phase = attempt % 3;[\s\S]*\{ x: dx, y: dy \}[\s\S]*\{ x: -dy, y: dx \}[\s\S]*\{ x: dy, y: -dx \}/,
  'the search must try the target line and both lateral paths instead of one device-specific guess');
assert.doesNotMatch(companionJourney, /__dungeonVeilRuntimeEvidence\?\.(?:loadRoom|killLivingEnemies|moveToExit|chooseFirstGift|setMode|setPlayerStats|setLivingEnemyFamilies)/,
  'the companion journey may read the localhost snapshot but must not mutate combat through QA controls');
assert.match(companionJourney, /const attackBoundary = Number\(\(await readRuntimeCombatSnapshot\(page\)\)\?\.playerLastAttackTime \|\| 0\);[\s\S]*const capturePromise = captureLiveCompanionFeedbackEvidence\(page, \{[\s\S]*role: 'critical-support'[\s\S]*notBefore: attackBoundary[\s\S]*const \[confirmedPlayerAttackAt, observedCritical\] = await Promise\.all\(\[[\s\S]*triggerConfirmedPlayerAttack\(page, attackBoundary\),[\s\S]*capturePromise[\s\S]*expect\(confirmedPlayerAttackAt\)\.toBeGreaterThan\(attackBoundary\)[\s\S]*expect\(observedCritical\.at\)\.toBeGreaterThan\(attackBoundary\)/,
  'critical evidence must bind to the last authoritative player-attack boundary and prove both causal actions are strictly newer');
assert.match(companionJourney, /runtimeEvidence: window\.__dungeonVeilRuntimeEvidence\?\.snapshot\(\) \?\? null/,
  'device failures must include the authoritative player and target snapshot');
assert.match(companionJourney, /observedAt: performance\.now\(\)/,
  'device failures must retain the browser event timestamp');
assert.match(companionJourney, /Companion feedback diagnostics: \$\{JSON\.stringify\(diagnostics, null, 2\)\}/,
  'a failed live capture must emit bounded runtime, action and node diagnostics');
assert.doesNotMatch(companionJourney, /waitForCorrelatedCompanionFeedback|captureCorrelatedCompanionFeedbackEvidence/,
  'the expired-ID historical-snapshot sequence must not return');

assert.match(visualReadiness, /function isNavigationTransitionError\(error\) \{[\s\S]*document\\\.\(\?:body\|documentElement\)\\\.scrollWidth/,
  'visual capture must classify WebKit body attachment as a navigation transition, not as a product overflow failure');
assert.match(visualReadiness, /async function waitForDocumentBody\(page, timeout\) \{[\s\S]*waitForLoadState\('domcontentloaded'[\s\S]*locator\('body'\)\.waitFor\(\{ state: 'attached', timeout \}\)/,
  'the replacement document must prove both DOMContentLoaded and body attachment before capture resumes');
assert.match(visualReadiness, /if \(!isNavigationTransitionError\(error\)\) throw error;[\s\S]*await waitForDocumentBody\(page, timeout\);[\s\S]*return originalEvaluate\(\.\.\.args\);/,
  'only known navigation-transition errors may repeat the identical evaluation once');
assert.doesNotMatch(visualReadiness, /catch \(error\) \{\s*await waitForDocumentBody/,
  'the navigation guard must not swallow arbitrary page evaluation failures');

assert.match(recoveryBaseline, /const RETAINED_NOOP_UPDATE_LIMIT = 1;/,
  'renderer recovery must retain a mutation baseline across exactly one intervening no-op update');
assert.match(recoveryBaseline, /afterHp !== beforeHp[\s\S]*retainedPreMutationHp = beforeHp;[\s\S]*retainedNoopUpdates = RETAINED_NOOP_UPDATE_LIMIT;/,
  'an HP-mutating update must retain its pre-mutation baseline for the recovery boundary');
assert.match(recoveryBaseline, /else if \(retainedPreMutationHp !== null\) \{[\s\S]*if \(retainedNoopUpdates > 0\) retainedNoopUpdates -= 1;[\s\S]*else retainedPreMutationHp = null;/,
  'one no-op update must preserve the pending recovery baseline and the following no-op must expire it');
assert.match(recoveryBaseline, /if \(retainedPreMutationHp !== null\) \{[\s\S]*liveHp !== retainedPreMutationHp[\s\S]*activeEngine\.state\.player\.hp = retainedPreMutationHp;[\s\S]*else if \(Number\.isFinite\(liveHp\) && liveHp !== preUpdateHp\)[\s\S]*activeEngine\.state\.player\.hp = preUpdateHp;/,
  'recovery must prefer the retained pre-mutation baseline while preserving the original single-frame fallback');

console.log('Product QA anti-stall fixture contracts passed.');