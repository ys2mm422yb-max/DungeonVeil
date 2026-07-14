create or replace function public.start_world_boss_attempt(p_event_id uuid)
returns table (
  attempt_id uuid,
  started_at timestamptz,
  fight_expires_at timestamptz,
  next_available_at timestamptz,
  server_now timestamptz,
  resumed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_event public.world_boss_events%rowtype;
  v_latest public.world_boss_attempts%rowtype;
  v_attempt public.world_boss_attempts%rowtype;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  if p_event_id is null then raise exception 'world boss event missing'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  select * into v_event from public.world_boss_events where id = p_event_id for update;
  if not found then raise exception 'world boss event not found'; end if;
  if v_event.status <> 'active' or v_now < v_event.starts_at or v_now >= v_event.ends_at or v_event.current_hp <= 0 then
    raise exception 'world boss event is not active';
  end if;

  select * into v_latest from public.world_boss_attempts where user_id = v_user_id order by started_at desc limit 1;
  if v_latest.id is not null and v_latest.event_id = p_event_id and v_latest.submitted_at is null and v_latest.fight_expires_at > v_now then
    return query select v_latest.id, v_latest.started_at, v_latest.fight_expires_at, v_latest.next_available_at, v_now, true;
    return;
  end if;
  if v_latest.id is not null and v_latest.next_available_at > v_now then
    raise exception 'world boss cooldown active until %', v_latest.next_available_at;
  end if;

  insert into public.world_boss_attempts (event_id, user_id, started_at, fight_expires_at, next_available_at)
  values (p_event_id, v_user_id, v_now, v_now + interval '5 minutes', v_now + interval '24 hours')
  returning * into v_attempt;

  return query select v_attempt.id, v_attempt.started_at, v_attempt.fight_expires_at, v_attempt.next_available_at, v_now, false;
end;
$$;

revoke all on function public.start_world_boss_attempt(uuid) from public, anon;
grant execute on function public.start_world_boss_attempt(uuid) to authenticated;
