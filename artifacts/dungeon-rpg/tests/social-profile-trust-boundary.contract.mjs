import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../../supabase/migrations/20261025132500_harden_social_profile_trust_boundary.sql',
  import.meta.url,
);
const migration = await readFile(migrationUrl, 'utf8');
const productionHistory = JSON.parse(
  await readFile(new URL('../../../scripts/social-profile-production-history.json', import.meta.url), 'utf8'),
);
const socialJourney = await readFile(new URL('./guild-mail-equipment-visual.spec.mjs', import.meta.url), 'utf8');
const focusedSocialJourney = socialJourney.match(
  /test\('neutral server social projection is visible for self, friend and guild peer'[\s\S]*?\n\}\);/,
)?.[0];

assert.ok(focusedSocialJourney, 'focused social journey must remain registered');


test('production history mapping binds the reviewed SQL without mutating remote history', () => {
  const expectedPath = 'supabase/migrations/20261025132500_harden_social_profile_trust_boundary.sql';
  const sqlSha256 = createHash('sha256').update(migration).digest('hex');

  assert.equal(productionHistory.schema_version, 1);
  assert.equal(productionHistory.project_ref, 'hfndwqfghyomwapqsked');
  assert.deepEqual(productionHistory.repository, {
    path: expectedPath,
    version: '20261025132500',
    name: 'harden_social_profile_trust_boundary',
    merge_commit: '37410dcf101414fb14cc00622523e9348cd1649b',
    sql_sha256: sqlSha256,
  });
  assert.deepEqual(productionHistory.production, {
    version: '20261026113943',
    name: productionHistory.repository.name,
    observed_at: '2026-10-26T11:43:00Z',
  });
  assert.equal(productionHistory.apply_transport, 'supabase_mcp_apply_migration');
  assert.equal(productionHistory.reconciliation, 'reviewed_repo_mapping');
  assert.equal(productionHistory.remote_history_mutated, false);
  assert.match(migrationUrl.pathname, /20261025132500_harden_social_profile_trust_boundary\.sql$/);
});

test('browser table writes are reduced to cosmetic columns', () => {
  assert.match(migration, /revoke insert, update on table public\.profiles from authenticated/i);
  assert.match(migration, /grant update \(display_name, avatar_key\).*to authenticated/is);
  assert.doesNotMatch(migration, /grant update \([^)]*(?:current_chapter|current_rank|public_stats)/is);
});

test('unverifiable historical social claims reconcile fail-closed', () => {
  assert.match(migration, /set current_chapter = 1,\s*current_rank = 1,/is);
  assert.match(migration, /'highestChapter', 1/is);
  assert.match(migration, /'equippedItems', '\[\]'::jsonb/is);
});

test('historical claims are preserved privately before public reconciliation', () => {
  assert.match(migration, /create schema if not exists dungeon_veil_social_private/i);
  assert.match(migration, /original_profile_claims[\s\S]*references auth\.users\(id\) on delete cascade/i);
  assert.match(migration, /original_profile_claims enable row level security/i);
  assert.match(migration, /revoke all on schema dungeon_veil_social_private from public, anon, authenticated, service_role/i);
  assert.match(migration, /revoke all on table dungeon_veil_social_private\.original_profile_claims\s+from public, anon, authenticated, service_role/i);
  assert.match(migration, /on conflict \(profile_id\) do nothing\s+returning profile_id/i);
  assert.match(migration, /where id in \(select profile_id from preserved\)/i);
});

test('compatibility RPCs ignore raw progression and stat payloads', () => {
  const progressBody = migration.match(/create or replace function public\.sync_profile_progress[\s\S]*?\$\$;/i)?.[0] ?? '';
  const statsBody = migration.match(/create or replace function public\.sync_public_profile_stats[\s\S]*?\$\$;/i)?.[0] ?? '';
  assert.ok(progressBody);
  assert.ok(statsBody);
  assert.doesNotMatch(progressBody, /set[\s\S]*current_chapter\s*=/i);
  assert.doesNotMatch(progressBody, /set[\s\S]*current_rank\s*=/i);
  assert.doesNotMatch(statsBody, /update\s+public\.profiles/i);
  assert.doesNotMatch(statsBody, /safe_stats|jsonb_array_elements\s*\(\s*p_stats/i);
});

test('SECURITY DEFINER functions are fixed-path and least privilege', () => {
  assert.equal((migration.match(/security definer/gi) ?? []).length, 2);
  assert.equal((migration.match(/set search_path = ''/gi) ?? []).length, 2);
  assert.match(migration, /revoke all on function public\.sync_profile_progress[\s\S]*from public, anon/is);
  assert.match(migration, /revoke all on function public\.sync_public_profile_stats[\s\S]*from public, anon/is);
});

test('focused social fixture is cross-origin complete for WebKit', () => {
  assert.match(socialJourney, /Access-Control-Allow-Origin[\s\S]*Access-Control-Allow-Credentials/is);
  assert.match(socialJourney, /Access-Control-Allow-Headers[\s\S]*authorization[\s\S]*apikey[\s\S]*content-type[\s\S]*prefer/is);
  assert.match(socialJourney, /Access-Control-Allow-Methods[\s\S]*GET[\s\S]*POST[\s\S]*PATCH[\s\S]*DELETE[\s\S]*OPTIONS/is);
  assert.match(socialJourney, /request\.method\(\) === 'OPTIONS'[\s\S]*status: 204[\s\S]*headers: corsHeaders/is);
});

test('focused social fixture models background write responses exactly', () => {
  assert.match(socialJourney, /resource === 'upsert_guarded_game_save'[\s\S]*accepted: true, payload: null/is);
  assert.match(socialJourney, /resource === 'profiles'[\s\S]*request\.method\(\) === 'PATCH'[\s\S]*return=minimal/is);
  assert.match(socialJourney, /return=minimal[\s\S]*status = 204[\s\S]*body = null/is);
  assert.doesNotMatch(socialJourney, /resource\.startsWith\(['"]rpc/is);
});

test('focused social journey stays in one document between friends and guild', () => {
  assert.equal((focusedSocialJourney.match(/page\.goto\(/g) ?? []).length, 0);
  assert.match(
    focusedSocialJourney,
    /public-player-profile-close[\s\S]*SCHLIESSEN\|CLOSE[\s\S]*friends-panel[\s\S]*toHaveCount\(0[\s\S]*npc-guildmaster/is,
  );
});
