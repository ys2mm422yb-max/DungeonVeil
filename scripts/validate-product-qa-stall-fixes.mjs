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

assert.match(companionJourney, /let captureUntil = 0;\s*let captureFrameScheduled = false;/,
  'the transient feedback observer must own one serialized time-bounded frame loop');
assert.match(companionJourney, /const scheduleRenderedFeedbackCapture = \(\) => \{[\s\S]*if \(captureFrameScheduled \|\| performance\.now\(\) >= captureUntil\) return;[\s\S]*captureFrameScheduled = true;[\s\S]*requestAnimationFrame\(\(\) => \{[\s\S]*captureFrameScheduled = false;[\s\S]*captureRenderedFeedback\(\);[\s\S]*scheduleRenderedFeedbackCapture\(\);/,
  'the observer must serialize requestAnimationFrame work instead of consuming a shared budget through parallel chains');
assert.match(companionJourney, /captureUntil = Math\.max\(captureUntil, performance\.now\(\) \+ 1_200\);/,
  'each authoritative companion attack must keep rendered-frame observation active across the complete 1050ms feedback lifetime plus a small scheduling margin');
assert.doesNotMatch(companionJourney, /captureUntil = Math\.max\(captureUntil, performance\.now\(\) \+ (?:[2-9]_?\d{3}|\d{5,})\);/,
  'the rendered-frame observation window must remain tightly bounded and must not become a hidden long wait');
assert.match(companionJourney, /new MutationObserver\(\(\) => \{\s*captureRenderedFeedback\(\);\s*scheduleRenderedFeedbackCapture\(\);\s*\}\)\.observe/,
  'React commit mutations must both capture immediately and join the single bounded frame loop');
assert.match(companionJourney, /queueMicrotask\(\(\) => \{\s*captureRenderedFeedback\(\);\s*scheduleRenderedFeedbackCapture\(\);\s*\}\);/,
  'the authoritative event-adjacent microtask must join the same serialized frame loop');
assert.doesNotMatch(companionJourney, /pendingCaptureFrames|requestAnimationFrame\(captureRenderedFeedback\)/,
  'parallel frame-budget chains must not return');
assert.match(companionJourney, /Number\(style\.opacity\) <= 0/,
  'the observer must still reject an inserted but not-yet-visible frame');
assert.match(companionJourney, /snapshot\.feedbackTargetId === snapshot\.targetId[\s\S]*snapshot\.critical === String\(critical\)/,
  'frame sampling must not weaken role, target or critical correlation');

console.log('Product QA anti-stall fixture contracts passed.');
