\set ON_ERROR_STOP on
-- The preceding single-transaction migration deliberately failed at UPDATE.
-- Its earlier CREATE/INSERT/REVOKE operations must all have rolled back.
do $$ begin
  if to_regnamespace('dungeon_veil_social_private') is not null then
    raise exception 'failed reconciliation retained archive schema';
  end if;
  if not has_table_privilege('authenticated', 'public.profiles', 'INSERT')
     or not has_table_privilege('authenticated', 'public.profiles', 'UPDATE') then
    raise exception 'failed reconciliation retained privilege changes';
  end if;
  if not exists (select 1 from public.profiles
    where id = '46000000-0000-4000-8000-000000000001'
      and current_chapter = 999 and current_rank = 9999
      and public_stats->'equippedItems' = '[{"id":"forged"}]'::jsonb) then
    raise exception 'failed reconciliation changed original data';
  end if;
end $$;
drop trigger social_trust_rollback_probe on public.profiles;
drop function public.social_trust_rollback_probe();
select 'rollback ok 1 - failed reconciliation atomically restores original data, privileges and schema';
