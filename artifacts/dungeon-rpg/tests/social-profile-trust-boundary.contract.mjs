import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(
  new URL('../../../supabase/migrations/20261025132500_harden_social_profile_trust_boundary.sql', import.meta.url),
  'utf8',
);

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
