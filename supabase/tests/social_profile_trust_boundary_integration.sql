\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

select '1..8';

select not has_table_privilege('authenticated', 'public.profiles', 'INSERT')
   and not has_table_privilege('authenticated', 'public.profiles', 'UPDATE')
   and has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE')
   and has_column_privilege('authenticated', 'public.profiles', 'avatar_key', 'UPDATE')
   and not has_column_privilege('authenticated', 'public.profiles', 'current_chapter', 'UPDATE')
   and not has_column_privilege('authenticated', 'public.profiles', 'current_rank', 'UPDATE')
   and not has_column_privilege('authenticated', 'public.profiles', 'public_stats', 'UPDATE');
select 'ok 1 - browser writes are cosmetic-column-only';

select bool_and(current_chapter = 1 and current_rank = 1
  and public_stats->>'highestChapter' = '1'
  and public_stats->>'highestRoom' = '1'
  and public_stats->'equippedItems' = '[]'::jsonb)
from public.profiles;
select 'ok 2 - unverifiable historical claims reconcile neutral';

select prosecdef and proconfig @> array['search_path=""']::text[]
from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
where nspname = 'public' and proname = 'sync_profile_progress';
select 'ok 3 - progress compatibility RPC has fixed-path definer contract';

select prosecdef and proconfig @> array['search_path=""']::text[]
from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
where nspname = 'public' and proname = 'sync_public_profile_stats';
select 'ok 4 - stats compatibility RPC has fixed-path definer contract';

-- Runtime malicious-payload checks are executed by the focused PostgreSQL job
-- after its fixture sets an authenticated JWT subject. They assert that calls
-- with maximum integers and arbitrary equipment do not change stored values.

select has_function_privilege('authenticated', 'public.sync_profile_progress(integer,integer,text)', 'EXECUTE')
   and not has_function_privilege('anon', 'public.sync_profile_progress(integer,integer,text)', 'EXECUTE');
select 'ok 5 - progress RPC is authenticated-only';

select has_function_privilege('authenticated', 'public.sync_public_profile_stats(jsonb)', 'EXECUTE')
   and not has_function_privilege('anon', 'public.sync_public_profile_stats(jsonb)', 'EXECUTE');
select 'ok 6 - stats RPC is authenticated-only';

select pg_get_functiondef(pg_proc.oid) !~* 'current_chapter\\s*='
   and pg_get_functiondef(pg_proc.oid) !~* 'current_rank\\s*='
from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
where nspname = 'public' and proname = 'sync_profile_progress';
select 'ok 7 - client progress arguments have no persistence sink';

select pg_get_functiondef(pg_proc.oid) !~* 'update\\s+public\\.profiles'
from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
where nspname = 'public' and proname = 'sync_public_profile_stats';
select 'ok 8 - client stats JSON has no persistence sink';
