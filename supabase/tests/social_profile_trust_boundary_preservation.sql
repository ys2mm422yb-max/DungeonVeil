\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

do $$ declare original record; begin
  select * into strict original from dungeon_veil_social_private.original_profile_claims
  where profile_id = '46000000-0000-4000-8000-000000000001';
  if original.current_chapter <> 999 or original.current_rank <> 9999
     or original.public_stats <> '{"highestChapter":999,"highestRoom":50,"roomsCleared":999999,"equippedItems":[{"id":"forged"}]}'::jsonb then
    raise exception 'original claims were lost or overwritten on reapply';
  end if;
  select * into strict original from dungeon_veil_social_private.original_profile_claims
  where profile_id = '46000000-0000-4000-8000-000000000005';
  if original.current_chapter <> 3 or original.current_rank <> 7
     or original.public_stats <> '{"highestChapter":3,"highestRoom":8,"roomsCleared":12,"equippedItems":[{"id":"honest-history"}],"unknownFutureKey":"preserve-me"}'::jsonb then
    raise exception 'plausibly legitimate history or unknown JSON fields were lost';
  end if;
end $$;
select 'preservation ok 1 - original claims retained exactly, including unknown JSON fields';

do $$ begin
  if not exists (select 1 from public.profiles
      where id = '46000000-0000-4000-8000-000000000001'
        and current_chapter = 3 and current_rank = 7
        and display_name = 'Cosmetic Update'
        and public_stats = '{"highestChapter":3,"highestRoom":8,"roomsCleared":12,"equippedItems":[{"id":"server-owned"}]}'::jsonb) then
    raise exception 'reapply erased later trusted projection or cosmetics';
  end if;
end $$;
select 'preservation ok 2 - reapply preserves later trusted state and cosmetic identity';

do $$ declare role_name text; begin
  foreach role_name in array array['anon', 'authenticated', 'service_role'] loop
    if has_schema_privilege(role_name, 'dungeon_veil_social_private', 'USAGE')
       or has_schema_privilege(role_name, 'dungeon_veil_social_private', 'CREATE')
       or has_table_privilege(role_name, 'dungeon_veil_social_private.original_profile_claims', 'SELECT,INSERT,UPDATE,DELETE') then
      raise exception 'archive privilege exposed to %', role_name;
    end if;
  end loop;
  if not (select relrowsecurity from pg_class
    where oid = 'dungeon_veil_social_private.original_profile_claims'::regclass)
    or exists (select 1 from pg_policy
      where polrelid = 'dungeon_veil_social_private.original_profile_claims'::regclass) then
    raise exception 'archive RLS is absent or has a client policy';
  end if;
end $$;
select 'preservation ok 3 - archive schema and table deny API roles, RLS enabled without policies';

set role authenticated;
do $$ begin
  perform public_stats from dungeon_veil_social_private.original_profile_claims;
  raise exception 'authenticated archive read unexpectedly succeeded';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  update dungeon_veil_social_private.original_profile_claims set current_chapter = 9999;
  raise exception 'authenticated archive write unexpectedly succeeded';
exception when insufficient_privilege then null;
end $$;
reset role;
set role anon;
do $$ begin
  perform public_stats from dungeon_veil_social_private.original_profile_claims;
  raise exception 'anonymous archive read unexpectedly succeeded';
exception when insufficient_privilege then null;
end $$;
reset role;
set role service_role;
do $$ begin
  perform public_stats from dungeon_veil_social_private.original_profile_claims;
  raise exception 'service-role archive read unexpectedly succeeded';
exception when insufficient_privilege then null;
end $$;
reset role;
select 'preservation ok 4 - real archive access denied even to BYPASSRLS service role';

begin;
delete from public.profiles where id = '46000000-0000-4000-8000-000000000001';
delete from auth.users where id = '46000000-0000-4000-8000-000000000001';
do $$ begin
  if exists (select 1 from dungeon_veil_social_private.original_profile_claims
    where profile_id = '46000000-0000-4000-8000-000000000001') then
    raise exception 'deleted auth user retained archived claims';
  end if;
end $$;
rollback;
select 'preservation ok 5 - account deletion removes archived claims';
