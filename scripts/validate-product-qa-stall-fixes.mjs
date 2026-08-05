import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [guildRaidJourney, companionJourney] = await Promise.all([
  readFile('artifacts/dungeon-rpg/tests/guild-raid-lobby-mobile.spec.mjs', 'utf8'),
  readFile('artifacts/dungeon-rpg/tests/companion-runtime.spec.mjs', 'utf8'),
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
assert.match(companionJourney, /const feedback = page\.locator\(selector\)\.last\(\);[\s\S]*await expect\.poll\(async \(\) => \{/,
  'the waiter must be armed on the live locator before the qualifying hit arrives');
assert.match(companionJourney, /feedback\.evaluate\(\(node, \{ logKey, expectedRole, expectedCritical, minimumAt \}\) => \{/,
  'role, target, critical identity and event time must be checked in the browser while the node is connected');
assert.match(companionJourney, /entry\.role === expectedRole[\s\S]*entry\.targetId === targetId[\s\S]*entry\.at >= minimumAt/,
  'the live node must remain correlated with the authoritative attack after the requested epoch');
assert.match(companionJourney, /opacity < 0\.9/,
  'capture must reject inserted or fading frames that are not clearly painted');
assert.match(companionJourney, /intervals: \[16, 32, 64, 100\]/,
  'the short 1050ms feedback window must be sampled promptly without increasing the 20 second outer criterion');
assert.match(companionJourney, /const exactFeedback = page\.getByTestId\(observedFeedback\.feedbackId\);[\s\S]*visibleBeforeCapture[\s\S]*await page\.screenshot\(\{ path, fullPage: false \}\);[\s\S]*visibleAfterCapture/,
  'the exact correlated node must bracket the full-context screenshot');
assert.match(companionJourney, /const capturePromise = captureLiveCompanionFeedbackEvidence\(page, \{[\s\S]*role: 'critical-support'[\s\S]*const \[, observedCritical\] = await Promise\.all\(\[[\s\S]*triggerConfirmedPlayerAttack\(page, attackIssuedAt\),[\s\S]*capturePromise/,
  'critical evidence capture must be armed before the real input burst');
assert.match(companionJourney, /observedAt: performance\.now\(\)/,
  'device failures must retain the browser event timestamp');
assert.match(companionJourney, /Companion feedback diagnostics: \$\{JSON\.stringify\(diagnostics, null, 2\)\}/,
  'a failed live capture must emit bounded runtime, action and node diagnostics');
assert.doesNotMatch(companionJourney, /waitForCorrelatedCompanionFeedback|captureCorrelatedCompanionFeedbackEvidence/,
  'the expired-ID historical-snapshot sequence must not return');

console.log('Product QA anti-stall fixture contracts passed.');
