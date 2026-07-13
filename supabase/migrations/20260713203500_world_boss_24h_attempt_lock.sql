create table if not exists public.world_boss_attempts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.world_boss_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default clock_timestamp(),
  fight_expires_at timestamptz not null,
  next_available_at timestamptz not null,
  submitted_at timestamptz,
  hit_token text,
  accepted_damage integer,
  remaining_hp bigint,
  defeated boolean,
  constraint world_boss_attempts_time_order check (
    fight_expires_at > started_at and next_available_at > started_at
  )
);

create index if not exists world_boss_attempts_user_started_idx
  on public.world_boss_attempts (user_id, started_at desc);
create index if not exists world_boss_attempts_event_user_idx
  on public.world_boss_attempts (event_id, user_id, started_at desc);
create unique index if not exists world_boss_attempts_hit_token_uidx
  on public.world_boss_attempts (hit_token)
  where hit_token is not null;

alter table public.world_boss_attempts enable row level security;

drop policy if exists world_boss_attempts_read_self on public.world_boss_attempts;
create policy world_boss_attempts_read_self
  on public.world_boss_attempts
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on table public.world_boss_attempts from anon, authenticated;
grant select on table public.world_boss_attempts to authenticated;

create or replace function public.get_world_boss_attempt_status(p_event_id uuid)
returns table (
  can_attack boolean,
  can_resume boolean,
  active_attempt_id uuid,
  fight_expires_at timestamptz,
  next_available_at timestamptz,
  server_now timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_latest public.world_boss_attempts%rowtype;
  v_resume boolean := false;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  if p_event_id is null then
    raise exception 'world boss event missing';
  end if;

  select * into v_latest
  from public.world_boss_attempts
  where user_id = v_user_id
  order by started_at desc
  limit 1;

  if v_latest.id is not null then
    v_resume := v_latest.event_id = p_event_id
      and v_latest.submitted_at is null
      and v_latest.fight_expires_at > v_now;
  end if;

  return query select
    case
      when v_latest.id is null then true
      when v_resume then false
      else v_latest.next_available_at <= v_now
    end,
    v_resume,
    case when v_resume then v_latest.id else null end,
    case when v_resume then v_latest.fight_expires_at else null end,
    v_latest.next_available_at,
    v_now;
end;
$$;

revoke all on function public.get_world_boss_attempt_status(uuid) from public, anon;
grant execute on function public.get_world_boss_attempt_status(uuid) to authenticated;

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
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  if p_event_id is null then
    raise exception 'world boss event missing';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select * into v_event
  from public.world_boss_events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'world boss event not found';
  end if;
  if v_event.status <> 'active'
    or v_now < v_event.starts_at
    or v_now >= v_event.ends_at
    or v_event.current_hp <= 0 then
    raise exception 'world boss event is not active';
  end if;

  select * into v_latest
  from public.world_boss_attempts
  where user_id = v_user_id
  order by started_at desc
  limit 1;

  if v_latest.id is not null
    and v_latest.event_id = p_event_id
    and v_latest.submitted_at is null
    and v_latest.fight_expires_at > v_now then
    return query select
      v_latest.id,
      v_latest.started_at,
      v_latest.fight_expires_at,
      v_latest.next_available_at,
      v_now,
      true;
    return;
  end if;

  if v_latest.id is not null and v_latest.next_available_at > v_now then
    raise exception 'world boss cooldown active until %', v_latest.next_available_at;
  end if;

  insert into public.world_boss_attempts (
    event_id,
    user_id,
    started_at,
    fight_expires_at,
    next_available_at
  ) values (
    p_event_id,
    v_user_id,
    v_now,
    v_now + interval '10 minutes',
    v_now + interval '24 hours'
  )
  returning * into v_attempt;

  return query select
    v_attempt.id,
    v_attempt.started_at,
    v_attempt.fight_expires_at,
    v_attempt.next_available_at,
    v_now,
    false;
end;
$$;

revoke all on function public.start_world_boss_attempt(uuid) from public, anon;
grant execute on function public.start_world_boss_attempt(uuid) to authenticated;

create or replace function public.record_world_boss_hit(
  p_user_id uuid,
  p_event_id uuid,
  p_hit_token text,
  p_damage integer
)
returns table(remaining_hp bigint, accepted_damage integer, defeated boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.world_boss_events%rowtype;
  v_attempt public.world_boss_attempts%rowtype;
  v_inserted integer;
  v_accepted integer;
  v_remaining bigint;
  v_recent_hits integer;
  v_now timestamptz := clock_timestamp();
begin
  if p_user_id is null or p_event_id is null then
    raise exception 'missing identity or event';
  end if;
  if p_damage is null or p_damage <= 0 or p_damage > 50000 then
    raise exception 'invalid damage';
  end if;
  if p_hit_token is null or char_length(p_hit_token) < 16 or char_length(p_hit_token) > 128 then
    raise exception 'invalid hit token';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select * into v_attempt
  from public.world_boss_attempts
  where user_id = p_user_id
    and event_id = p_event_id
  order by started_at desc
  limit 1
  for update;

  if not found then
    raise exception 'world boss attempt required';
  end if;

  if v_attempt.submitted_at is not null then
    if v_attempt.hit_token = p_hit_token then
      return query select
        v_attempt.remaining_hp,
        coalesce(v_attempt.accepted_damage, 0),
        coalesce(v_attempt.defeated, false);
      return;
    end if;
    raise exception 'world boss attempt already submitted';
  end if;

  if v_attempt.fight_expires_at <= v_now then
    raise exception 'world boss attempt expired';
  end if;

  select * into v_event
  from public.world_boss_events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'world boss event not found';
  end if;
  if v_event.status <> 'active'
    or v_now < v_event.starts_at
    or v_now >= v_event.ends_at
    or v_event.current_hp <= 0 then
    raise exception 'world boss event is not active';
  end if;

  select count(*) into v_recent_hits
  from public.world_boss_hits
  where event_id = p_event_id
    and user_id = p_user_id
    and created_at > v_now - interval '1 second';

  if v_recent_hits >= 20 then
    raise exception 'hit rate limit exceeded';
  end if;

  insert into public.world_boss_hits (hit_token, event_id, user_id, damage)
  values (p_hit_token, p_event_id, p_user_id, p_damage)
  on conflict (hit_token) do nothing
  returning 1 into v_inserted;

  if v_inserted is null then
    raise exception 'duplicate world boss hit token';
  end if;

  v_accepted := least(p_damage, v_event.current_hp::integer);

  update public.world_boss_events
  set current_hp = greatest(0, current_hp - v_accepted),
      status = case when current_hp - v_accepted <= 0 then 'defeated' else status end
  where id = p_event_id
  returning current_hp into v_remaining;

  insert into public.world_boss_contributions (event_id, user_id, damage, hits)
  values (p_event_id, p_user_id, v_accepted, 1)
  on conflict (event_id, user_id)
  do update set
    damage = public.world_boss_contributions.damage + excluded.damage,
    hits = public.world_boss_contributions.hits + 1,
    updated_at = v_now;

  update public.world_boss_attempts
  set submitted_at = v_now,
      hit_token = p_hit_token,
      accepted_damage = v_accepted,
      remaining_hp = v_remaining,
      defeated = (v_remaining = 0)
  where id = v_attempt.id;

  return query select v_remaining, v_accepted, (v_remaining = 0);
end;
$$;

revoke all on function public.record_world_boss_hit(uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.record_world_boss_hit(uuid, uuid, text, integer) to service_role;
