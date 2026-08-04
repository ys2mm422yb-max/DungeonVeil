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

assert.match(companionJourney, /let pendingCaptureFrames = 0;/,
  'the transient feedback observer must use a bounded rendered-frame capture budget');
assert.match(companionJourney, /pendingCaptureFrames = 12;\s*queueMicrotask\(captureRenderedFeedback\);/,
  'each authoritative companion attack must arm the bounded frame capture before the adjacent microtask');
assert.match(companionJourney, /if \(pendingCaptureFrames > 0\) \{\s*pendingCaptureFrames -= 1;\s*requestAnimationFrame\(captureRenderedFeedback\);\s*\}/,
  'the observer must sample real rendered frames while the fixed animation becomes visible');
assert.doesNotMatch(companionJourney, /pendingCaptureFrames = (?:[2-9]\d|\d{3,})/,
  'the rendered-frame budget must stay small and bounded');
assert.match(companionJourney, /Number\(style\.opacity\) <= 0/,
  'the observer must still reject an inserted but not-yet-visible frame');
assert.match(companionJourney, /snapshot\.feedbackTargetId === snapshot\.targetId[\s\S]*snapshot\.critical === String\(critical\)/,
  'frame sampling must not weaken role, target or critical correlation');

console.log('Product QA anti-stall fixture contracts passed.');
