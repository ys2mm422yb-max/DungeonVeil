import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [guildRaidJourney, companionJourney, visualReadiness] = await Promise.all([
  readFile('artifacts/dungeon-rpg/tests/guild-raid-lobby-mobile.spec.mjs', 'utf8'),
  readFile('artifacts/dungeon-rpg/tests/companion-runtime.spec.mjs', 'utf8'),
  readFile('artifacts/dungeon-rpg/tests/visual-render-readiness.mjs', 'utf8'),
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
assert.match(companionJourney, /async function captureLiveCompanionFeedbackEvidence\(page, \{ role, critical, notBefore, marker, path \}\)/,
  'the focused journey must own one direct live-node capture helper');
assert.match(companionJourney, /const handle = await page\.waitForFunction\(\(\{ logKey, expectedRole, expectedCritical, minimumAt \}\) => \{/,
  'one browser-side waiter must own discovery and validation of the transient feedback node');
assert.match(companionJourney, /const nodes = \[\.\.\.document\.querySelectorAll\('\[data-testid\^="companion-damage-number-"\]'\)\];/,
  'the browser-side waiter must inspect the currently rendered damage nodes without locator round trips');
assert.match(companionJourney, /node\.dataset\.companionRole !== expectedRole \|\| node\.dataset\.critical !== String\(expectedCritical\)/,
  'role and critical identity must be filtered inside the same browser frame');
assert.match(companionJourney, /entry\.role === expectedRole[\s\S]*entry\.targetId === targetId[\s\S]*entry\.at >= minimumAt/,
  'the live node must remain correlated with the authoritative attack after the requested epoch');
assert.match(companionJourney, /opacity < 0\.9/,
  'capture must reject inserted or fading frames that are not clearly painted');
assert.match(companionJourney, /timeout: 20_000,[\s\S]*polling: 'raf'/,
  'the unchanged 20 second criterion must sample the 1050ms feedback window within the browser animation loop');
assert.doesNotMatch(companionJourney, /feedback\.count\(\)|feedback\.evaluate\(/,
  'separate locator count and evaluate round trips must not return');
assert.match(companionJourney, /const viewport = page\.viewportSize\(\);\s*expect\(viewport\)\.toBeTruthy\(\);\s*const screenshot = await page\.screenshot\(\{ path, fullPage: false \}\);\s*observedFeedback = await handle\.jsonValue\(\);\s*assertReadableFeedback\(observedFeedback,[\s\S]*assertFullViewportPng\(screenshot, viewport\);/,
  'screenshot capture must begin directly after the qualifying browser frame, before object transfer and assertions can consume the transient visual window');
assert.doesNotMatch(companionJourney, /handle\.jsonValue\(\)[\s\S]{0,300}page\.screenshot/,
  'cross-process object transfer must not occur before the full-context evidence capture starts');
assert.match(companionJourney, /function assertFullViewportPng\(screenshot, viewport\) \{[\s\S]*screenshot\.subarray\(0, 8\)[\s\S]*screenshot\.length\)\.toBeGreaterThan\(10_000\)[\s\S]*readUInt32BE\(16\)[\s\S]*readUInt32BE\(20\)/,
  'the artifact itself must be validated instead of asking an expired transient node to remain alive after encoding');
assert.doesNotMatch(companionJourney, /visibleAfterCapture|exactFeedback\.evaluate/,
  'post-screenshot DOM liveness checks must not reintroduce the 1050ms race');
assert.match(companionJourney, /const capturePromise = captureLiveCompanionFeedbackEvidence\(page, \{[\s\S]*role: 'critical-support'[\s\S]*const \[, observedCritical\] = await Promise\.all\(\[[\s\S]*triggerConfirmedPlayerAttack\(page, attackIssuedAt\),[\s\S]*capturePromise/,
  'critical evidence capture must be armed before the real input burst');
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

console.log('Product QA anti-stall fixture contracts passed.');
