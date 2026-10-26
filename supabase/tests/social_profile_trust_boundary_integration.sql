\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

select '1..13';

select not has_table_privilege('authenticated', 'public.profiles', 'INSERT')
   and not has_table_privilege('authenticated', 'public.profiles', 'UPDATE')
   and has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE')
   and has_column_privilege('authenticated', 'public.profiles', 'avatar_key', 'UPDATE')
   and not has_column_privilege('authenticated', 'public.profiles', 'current_chapter', 'UPDATE')
   and not has_column_privilege('authenticated', 'public.profiles', 'current_rank', 'UPDATE')
   and not has_column_privilege('authenticated', 'public.profiles', 'public_stats', 'UPDATE') as ok \gset
\if :ok
select 'ok 1 - browser writes are cosmetic-column-only';
\else
select 'not ok 1 - browser retained a protected-column write path';
do $$ begin raise exception 'social trust assertion failed'; end $$;
\endif

select bool_and(current_chapter = 1 and current_rank = 1
  and public_stats->>'highestChapter' = '1'
  and public_stats->>'highestRoom' = '1'
  and public_stats->'equippedItems' = '[]'::jsonb)
from public.profiles \gset
\if :bool_and
select 'ok 2 - unverifiable historical claims reconcile neutral';
\else
select 'not ok 2 - historical client claims survived reconciliation';
do $$ begin raise exception 'social trust assertion failed'; end $$;
\endif

select prosecdef and proconfig @> array['search_path=""']::text[] as ok
from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
where nspname = 'public' and proname = 'sync_profile_progress' \gset
\if :ok
select 'ok 3 - progress compatibility RPC has fixed-path definer contract';
\else
select 'not ok 3 - progress RPC definer/search-path contract failed';
do $$ begin raise exception 'social trust assertion failed'; end $$;
\endif

select prosecdef and proconfig @> array['search_path=""']::text[] as ok
from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
where nspname = 'public' and proname = 'sync_public_profile_stats' \gset
\if :ok
select 'ok 4 - stats compatibility RPC has fixed-path definer contract';
\else
select 'not ok 4 - stats RPC definer/search-path contract failed';
do $$ begin raise exception 'social trust assertion failed'; end $$;
\endif

set role authenticated;
select set_config('request.jwt.claim.sub', '46000000-0000-4000-8000-000000000001', false);
select count(*) = 1 as ok from public.sync_profile_progress(999, 9999, 'mage') \gset
\if :ok
select 'ok 5 - compatibility progress call remains functional';
\else
select 'not ok 5 - compatibility progress call failed';
do $$ begin raise exception 'social trust assertion failed'; end $$;
\endif

select public.sync_public_profile_stats(
  '{"highestChapter":999,"highestRoom":50,"roomsCleared":999999,"enemiesDefeated":999999,"bossesDefeated":999999,"questsCompleted":999999,"playTimeMs":999999999999999999999999999999,"totalDamage":999999999999999999999999999999,"itemsFound":999999,"equippedItems":[{"id":"forged"}],"unknownFutureKey":"forged"}'::jsonb
) = '{"highestChapter":1,"highestRoom":1,"roomsCleared":0,"enemiesDefeated":0,"bossesDefeated":0,"questsCompleted":0,"playTimeMs":0,"totalDamage":0,"itemsFound":0,"equippedItems":[]}'::jsonb as ok \gset
\if :ok
select 'ok 6 - malicious stat payload is ignored';
\else
select 'not ok 6 - malicious stat payload changed the projection';
do $$ begin raise exception 'social trust assertion failed'; end $$;
\endif

-- Accept only the expected authorization error; any other error is fatal.
do $$ begin
  update public.profiles set current_chapter = 999, public_stats = '{"highestChapter":999}' where id = auth.uid();
  raise exception 'protected update unexpectedly succeeded';
exception when insufficient_privilege then null;
end $$;
select 'ok 7 - direct protected-column update fails closed';

update public.profiles set display_name = 'Cosmetic Update' where id = auth.uid();
reset role;

select display_name = 'Cosmetic Update'
   and current_chapter = 1 and current_rank = 1
   and public_stats->>'highestChapter' = '1'
   and public_stats->'equippedItems' = '[]'::jsonb as ok
from public.profiles where id = '46000000-0000-4000-8000-000000000001' \gset
\if :ok
select 'ok 8 - cosmetics survive while earned claims remain neutral';
\else
select 'not ok 8 - post-attack projection or cosmetic contract is wrong';
do $$ begin raise exception 'social trust assertion failed'; end $$;
\endif

select has_function_privilege('authenticated', 'public.sync_profile_progress(integer,integer,text)', 'EXECUTE')
   and not has_function_privilege('anon', 'public.sync_profile_progress(integer,integer,text)', 'EXECUTE')
   and has_function_privilege('authenticated', 'public.sync_public_profile_stats(jsonb)', 'EXECUTE')
   and not has_function_privilege('anon', 'public.sync_public_profile_stats(jsonb)', 'EXECUTE') as ok \gset
\if :ok
select 'ok 9 - compatibility RPCs are authenticated-only';
\else
select 'not ok 9 - RPC execute grants are broader than intended';
do $$ begin raise exception 'social trust assertion failed'; end $$;
\endif

set role authenticated;
do $$ begin
  insert into public.profiles (id, display_name, friend_code, current_chapter)
  values (auth.uid(), 'Forged Insert', 'FORGED', 999);
  raise exception 'protected insert unexpectedly succeeded';
exception when insufficient_privilege then null;
end $$;
select 'ok 10 - direct profile insertion is denied';

select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  perform public.sync_profile_progress(999, 9999, 'mage');
  raise exception 'missing identity unexpectedly accepted';
exception when raise_exception then
  if sqlerrm <> 'authentication required' then raise; end if;
end $$;
do $$ begin
  perform public.sync_public_profile_stats('{"highestChapter":999}');
  raise exception 'missing identity unexpectedly accepted';
exception when raise_exception then
  if sqlerrm <> 'authentication required' then raise; end if;
end $$;
select 'ok 11 - both compatibility RPCs require an actor identity';
reset role;

-- A trusted producer can populate the projection; browser calls cannot erase it.
update public.profiles set current_chapter = 3, current_rank = 7,
  public_stats = '{"highestChapter":3,"highestRoom":8,"roomsCleared":12,"equippedItems":[{"id":"server-owned"}]}'::jsonb;
set role authenticated;
select set_config('request.jwt.claim.sub', '46000000-0000-4000-8000-000000000001', false);
select public.sync_public_profile_stats('{"highestChapter":999}') =
  '{"highestChapter":3,"highestRoom":8,"roomsCleared":12,"equippedItems":[{"id":"server-owned"}]}'::jsonb as ok \gset
\if :ok
select 'ok 12 - trusted projection remains readable and unmodified';
\else
select 'not ok 12 - compatibility RPC lost trusted projection';
do $$ begin raise exception 'social trust assertion failed'; end $$;
\endif
select current_chapter = 3 and current_rank = 7 as ok
from public.sync_profile_progress(999, 9999, 'mage') \gset
\if :ok
select 'ok 13 - progress RPC retains server-derived chapter and rank';
\else
select 'not ok 13 - progress RPC changed trusted chapter or rank';
do $$ begin raise exception 'social trust assertion failed'; end $$;
\endif
