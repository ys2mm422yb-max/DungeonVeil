create or replace function public.prepare_recent_world_boss_rewards()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event record;
  v_reward jsonb;
  v_count integer := 0;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  for v_event in
    select e.id
    from public.world_boss_events e
    where e.status in ('defeated', 'expired') or e.ends_at <= now()
    order by e.ends_at desc
    limit 8
  loop
    v_reward := public.prepare_my_world_boss_reward(v_event.id);
    if v_reward is not null then v_count := v_count + 1; end if;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.prepare_recent_world_boss_rewards() from public, anon;
grant execute on function public.prepare_recent_world_boss_rewards() to authenticated;
select pg_notify('pgrst', 'reload schema');
