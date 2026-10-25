\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

select '1..9';

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
\endif

select prosecdef and proconfig @> array['search_path=""']::text[]
from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
where nspname = 'public' and proname = 'sync_profile_progress' \gset
select 'ok 3 - progress compatibility RPC has fixed-path definer contract';

select prosecdef and proconfig @> array['search_path=""']::text[]
from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
where nspname = 'public' and proname = 'sync_public_profile_stats' \gset
select 'ok 4 - stats compatibility RPC has fixed-path definer contract';

set role authenticated;
select set_config('request.jwt.claim.sub', '46000000-0000-4000-8000-000000000001', false);
select count(*) = 1 as ok from public.sync_profile_progress(999, 9999, 'mage') \gset
\if :ok
select 'ok 5 - compatibility progress call remains functional';
\else
select 'not ok 5 - compatibility progress call failed';
\endif

select public.sync_public_profile_stats(
  '{"highestChapter":999,"highestRoom":50,"roomsCleared":999999,"equippedItems":[{"id":"forged"}]}'::jsonb
)->>'highestChapter' = '1' as ok \gset
\if :ok
select 'ok 6 - malicious stat payload is ignored';
\else
select 'not ok 6 - malicious stat payload changed the projection';
\endif

\set ON_ERROR_STOP off
update public.profiles set current_chapter = 999, public_stats = '{"highestChapter":999}' where id = auth.uid();
\if :ERROR
select 'ok 7 - direct protected-column update fails closed';
\else
select 'not ok 7 - direct protected-column update succeeded';
\endif
\set ON_ERROR_STOP on

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
\endif

select has_function_privilege('authenticated', 'public.sync_profile_progress(integer,integer,text)', 'EXECUTE')
   and not has_function_privilege('anon', 'public.sync_profile_progress(integer,integer,text)', 'EXECUTE')
   and has_function_privilege('authenticated', 'public.sync_public_profile_stats(jsonb)', 'EXECUTE')
   and not has_function_privilege('anon', 'public.sync_public_profile_stats(jsonb)', 'EXECUTE') as ok \gset
\if :ok
select 'ok 9 - compatibility RPCs are authenticated-only';
\else
select 'not ok 9 - RPC execute grants are broader than intended';
\endif
